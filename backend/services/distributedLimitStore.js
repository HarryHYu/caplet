const { createClient } = require('redis');

const RATE_LIMIT_SCRIPT = `
local count = redis.call('INCR', KEYS[1])
if count == 1 then redis.call('PEXPIRE', KEYS[1], ARGV[1]) end
local ttl = redis.call('PTTL', KEYS[1])
return { count, ttl }
`;

const AI_RESERVE_SCRIPT = `
if redis.call('EXISTS', KEYS[4]) == 1 then
  return { 0, 4, 0, 0, 0, redis.call('PTTL', KEYS[4]) }
end

local used = tonumber(redis.call('GET', KEYS[1]) or '0')
local active = tonumber(redis.call('GET', KEYS[2]) or '0')
local daily = tonumber(redis.call('GET', KEYS[3]) or '0')
local units = tonumber(ARGV[2])

if active >= tonumber(ARGV[4]) then
  return { 0, 1, used, active, daily, redis.call('PTTL', KEYS[2]) }
end
if used + units > tonumber(ARGV[3]) then
  return { 0, 2, used, active, daily, redis.call('PTTL', KEYS[1]) }
end
if daily + units > tonumber(ARGV[5]) then
  return { 0, 3, used, active, daily, tonumber(ARGV[7]) }
end

local newUsed = redis.call('INCRBY', KEYS[1], units)
if newUsed == units then redis.call('PEXPIRE', KEYS[1], ARGV[1]) end
local newActive = redis.call('INCR', KEYS[2])
redis.call('PEXPIRE', KEYS[2], ARGV[6])
local newDaily = redis.call('INCRBY', KEYS[3], units)
if newDaily == units then redis.call('PEXPIRE', KEYS[3], ARGV[7]) end
return { 1, 0, newUsed, newActive, newDaily, redis.call('PTTL', KEYS[1]) }
`;

const AI_RELEASE_SCRIPT = `
local active = tonumber(redis.call('GET', KEYS[1]) or '0')
if active <= 1 then
  redis.call('DEL', KEYS[1])
  return 0
end
return redis.call('DECR', KEYS[1])
`;

const AI_OUTCOME_SCRIPT = `
if ARGV[1] == '0' then
  redis.call('DEL', KEYS[1])
  return { 0, 0 }
end
local failures = redis.call('INCR', KEYS[1])
redis.call('PEXPIRE', KEYS[1], ARGV[3])
if failures >= tonumber(ARGV[2]) then
  redis.call('SET', KEYS[2], '1', 'PX', ARGV[3])
  redis.call('DEL', KEYS[1])
  return { failures, 1 }
end
return { failures, 0 }
`;

let clientPromise = null;

function positiveInteger(value, fallback) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function safeSegment(value) {
  return String(value || 'global').replace(/[^a-zA-Z0-9_.-]/g, '_').slice(0, 100);
}

function prefix(env = process.env) {
  return safeSegment(env.LIMITER_REDIS_PREFIX || `caplet-${env.NODE_ENV || 'development'}`);
}

function redisConfiguration(env = process.env) {
  const url = String(env.REDIS_URL || '').trim();
  if (!url) return null;
  return {
    url,
    connectTimeout: positiveInteger(env.REDIS_CONNECT_TIMEOUT_MS, 1500),
  };
}

async function connectRedis(env = process.env) {
  const configuration = redisConfiguration(env);
  if (!configuration) return null;
  if (!clientPromise) {
    clientPromise = (async () => {
      const client = createClient({
        url: configuration.url,
        disableOfflineQueue: true,
        socket: {
          connectTimeout: configuration.connectTimeout,
          reconnectStrategy: false,
        },
      });
      client.on('error', (error) => {
        console.error(JSON.stringify({
          event: 'redis_limit_store_error',
          errorType: error?.name || 'Error',
          message: 'Shared limiter storage is unavailable',
        }));
      });
      client.on('end', () => { clientPromise = null; });
      await client.connect();
      return client;
    })().catch((error) => {
      clientPromise = null;
      throw error;
    });
  }
  return clientPromise;
}

function asNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function millisecondsUntilNextUtcDay(now = new Date()) {
  const next = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1);
  return Math.max(1000, next - now.getTime());
}

function createRedisLimitStore({ env = process.env, clientProvider = () => connectRedis(env) } = {}) {
  if (!redisConfiguration(env)) return null;
  const namespace = prefix(env);
  const evaluate = async (script, keys, args) => {
    const client = await clientProvider();
    if (!client) throw new Error('Shared limiter storage is not configured');
    return client.eval(script, {
      keys,
      arguments: args.map((value) => String(value)),
    });
  };

  return {
    kind: 'redis',

    async incrementFixedWindow({ scope, identityHash, windowMs }) {
      const key = `${namespace}:rate:${safeSegment(scope)}:${identityHash}`;
      const result = await evaluate(RATE_LIMIT_SCRIPT, [key], [windowMs]);
      return {
        count: asNumber(result?.[0]),
        resetMs: Math.max(1, asNumber(result?.[1], windowMs)),
      };
    },

    async reserveAI({
      identityHash,
      units,
      windowMs,
      maxUnits,
      maxConcurrent,
      dailyMaxUnits,
      leaseMs,
      now = new Date(),
    }) {
      const day = now.toISOString().slice(0, 10);
      const keys = [
        `${namespace}:ai:user:${identityHash}:units`,
        `${namespace}:ai:user:${identityHash}:active`,
        `${namespace}:ai:daily:${day}`,
        `${namespace}:ai:circuit`,
      ];
      const dailyTtlMs = millisecondsUntilNextUtcDay(now);
      const result = await evaluate(AI_RESERVE_SCRIPT, keys, [
        windowMs,
        units,
        maxUnits,
        maxConcurrent,
        dailyMaxUnits,
        leaseMs,
        dailyTtlMs,
      ]);
      const reason = { 1: 'concurrency', 2: 'quota', 3: 'daily', 4: 'circuit' }[asNumber(result?.[1])] || null;
      return {
        ok: asNumber(result?.[0]) === 1,
        reason,
        unitsUsed: asNumber(result?.[2]),
        active: asNumber(result?.[3]),
        dailyUnitsUsed: asNumber(result?.[4]),
        retryAfterMs: Math.max(1000, asNumber(result?.[5], windowMs)),
      };
    },

    async releaseAI({ identityHash }) {
      const key = `${namespace}:ai:user:${identityHash}:active`;
      return asNumber(await evaluate(AI_RELEASE_SCRIPT, [key], []));
    },

    async recordAIOutcome({ failed, failureThreshold, cooldownMs }) {
      const result = await evaluate(AI_OUTCOME_SCRIPT, [
        `${namespace}:ai:failures`,
        `${namespace}:ai:circuit`,
      ], [failed ? 1 : 0, failureThreshold, cooldownMs]);
      return {
        consecutiveFailures: asNumber(result?.[0]),
        circuitOpened: asNumber(result?.[1]) === 1,
      };
    },
  };
}

function assertSharedLimiterConfiguration(env = process.env) {
  const replicas = positiveInteger(env.CAPLET_BACKEND_REPLICA_COUNT, 1);
  if (replicas > 1 && !redisConfiguration(env)) {
    throw new Error('REDIS_URL is required when CAPLET_BACKEND_REPLICA_COUNT is greater than 1');
  }
}

async function closeRedisForTests() {
  if (!clientPromise) return;
  const client = await clientPromise.catch(() => null);
  clientPromise = null;
  if (client?.isOpen) await client.quit();
}

module.exports = {
  assertSharedLimiterConfiguration,
  closeRedisForTests,
  createRedisLimitStore,
  millisecondsUntilNextUtcDay,
  redisConfiguration,
};
