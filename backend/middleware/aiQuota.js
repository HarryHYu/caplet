const crypto = require('crypto');
const { createRedisLimitStore } = require('../services/distributedLimitStore');

const WINDOW_MS = Number(process.env.AI_USER_QUOTA_WINDOW_MS || 15 * 60 * 1000);
const MAX_UNITS = Number(process.env.AI_USER_QUOTA_UNITS || 40);
const MAX_CONCURRENT = Number(process.env.AI_USER_MAX_CONCURRENT || 2);
const DAILY_MAX_UNITS = Number(process.env.AI_DAILY_UNIT_BUDGET || 10000);
const RESERVATION_LEASE_MS = Number(process.env.AI_RESERVATION_LEASE_MS || 10 * 60 * 1000);
const {
  isAICircuitOpen,
  recordAIEvent,
  resetRuntimeMetricsForTests,
} = require('../services/runtimeMetrics');

const usage = new Map();
let dailyUsage = { date: null, units: 0 };

function validPositiveInteger(value, fallback) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function quotaState(userId, now = Date.now()) {
  const current = usage.get(userId);
  if (!current || current.resetAt <= now) {
    const fresh = { units: 0, active: 0, resetAt: now + WINDOW_MS };
    usage.set(userId, fresh);
    return fresh;
  }
  return current;
}

function utcDate(now = Date.now()) {
  return new Date(now).toISOString().slice(0, 10);
}

function dailyState(now = Date.now()) {
  const date = utcDate(now);
  if (dailyUsage.date !== date) dailyUsage = { date, units: 0 };
  return dailyUsage;
}

function millisecondsUntilNextUtcDay(now = Date.now()) {
  const date = new Date(now);
  return Math.max(1000, Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate() + 1,
  ) - date.getTime());
}

function identityHash(identity) {
  const salt = process.env.RATE_LIMIT_KEY_SALT || 'caplet-rate-limit';
  return crypto.createHash('sha256').update(`${salt}|ai|${identity}`).digest('hex');
}

function identityForAIRequest(req) {
  if (req.user?.id) return `user:${req.user.id}`;
  if (req.workspaceId) return `workspace:${req.workspaceId}`;
  if (req.editorWorkspaceId) return `workspace:${req.editorWorkspaceId}`;
  return null;
}

function consumeAIUnits(identity, requestedUnits = 1, now = Date.now()) {
  if (!identity) return { ok: false, reason: 'identity', retryAfterSeconds: 0 };
  const state = quotaState(identity, now);
  const daily = dailyState(now);
  const units = Math.min(MAX_UNITS, validPositiveInteger(requestedUnits, 1));
  const retryAfterSeconds = Math.max(1, Math.ceil((state.resetAt - now) / 1000));
  if (state.units + units > MAX_UNITS) {
    return { ok: false, reason: 'quota', retryAfterSeconds, state, units };
  }
  if (daily.units + units > DAILY_MAX_UNITS) {
    return {
      ok: false,
      reason: 'daily',
      retryAfterSeconds: Math.ceil(millisecondsUntilNextUtcDay(now) / 1000),
      state,
      units,
    };
  }
  state.units += units;
  daily.units += units;
  return { ok: true, retryAfterSeconds, state, units, dailyUnitsUsed: daily.units };
}

async function consumeAIUnitsForRequest(identity, requestedUnits = 1, options = {}) {
  const env = options.env || process.env;
  const distributedStore = options.distributedStore === undefined
    ? createRedisLimitStore({ env })
    : options.distributedStore;
  if (!distributedStore) return consumeAIUnits(identity, requestedUnits, options.now || Date.now());
  if (!identity) return { ok: false, reason: 'identity', retryAfterSeconds: 0 };
  const units = Math.min(MAX_UNITS, validPositiveInteger(requestedUnits, 1));
  try {
    const reservation = await distributedStore.reserveAI({
      identityHash: identityHash(identity),
      units,
      windowMs: WINDOW_MS,
      maxUnits: MAX_UNITS,
      maxConcurrent: MAX_CONCURRENT,
      dailyMaxUnits: DAILY_MAX_UNITS,
      leaseMs: RESERVATION_LEASE_MS,
      now: new Date(options.now || Date.now()),
    });
    if (reservation.ok) await distributedStore.releaseAI({ identityHash: identityHash(identity) });
    return {
      ...reservation,
      retryAfterSeconds: Math.max(1, Math.ceil(reservation.retryAfterMs / 1000)),
      units,
    };
  } catch {
    return { ok: false, reason: 'unavailable', retryAfterSeconds: 5, units };
  }
}

/**
 * Reserve weighted AI capacity for an authenticated user. A unit is roughly
 * one small model call; larger, multi-call requests reserve more units.
 * This is deliberately shared by every route importing this module.
 */
function reserveAIQuota(options = {}) {
  const unitsForRequest = typeof options.units === 'function'
    ? options.units
    : () => options.units || 1;
  const scope = String(options.scope || 'ai');
  const env = options.env || process.env;
  const distributedStore = options.distributedStore === undefined
    ? createRedisLimitStore({ env })
    : options.distributedStore;
  const sharedCircuitFailureThreshold = validPositiveInteger(env.AI_SHARED_CIRCUIT_FAILURES, 10);
  const circuitCooldownMs = validPositiveInteger(env.AI_CIRCUIT_OPEN_MS, 60 * 1000);

  return async (req, res, next) => {
    const identity = identityForAIRequest(req);
    if (!identity) return res.status(401).json({ message: 'Authenticated user or editor workspace required' });

    const now = Date.now();
    const units = Math.min(MAX_UNITS, validPositiveInteger(unitsForRequest(req), 1));
    const state = distributedStore ? null : quotaState(identity, now);
    const retryAfter = state
      ? Math.max(1, Math.ceil((state.resetAt - now) / 1000))
      : Math.max(1, Math.ceil(WINDOW_MS / 1000));

    res.setHeader('RateLimit-Limit', String(MAX_UNITS));
    res.setHeader('RateLimit-Remaining', String(Math.max(0, MAX_UNITS - (state?.units || 0))));
    res.setHeader('RateLimit-Reset', String(retryAfter));

    const circuit = isAICircuitOpen(scope);
    if (circuit) {
      const circuitRetryAfter = Math.max(1, Math.ceil((circuit.openUntil - now) / 1000));
      recordAIEvent({ scope, units, outcome: 'rejected_circuit' });
      res.setHeader('Retry-After', String(circuitRetryAfter));
      return res.status(503).json({
        message: 'AI assistance is temporarily paused while the service recovers. Your work is safe; try again shortly.',
        retryAfterSeconds: circuitRetryAfter,
        scope,
      });
    }

    let reservation;
    try {
      reservation = distributedStore
        ? await distributedStore.reserveAI({
          identityHash: identityHash(identity),
          units,
          windowMs: WINDOW_MS,
          maxUnits: MAX_UNITS,
          maxConcurrent: MAX_CONCURRENT,
          dailyMaxUnits: DAILY_MAX_UNITS,
          leaseMs: RESERVATION_LEASE_MS,
          now: new Date(now),
        })
        : state.active >= MAX_CONCURRENT
          ? { ok: false, reason: 'concurrency', retryAfterMs: 5000 }
          : consumeAIUnits(identity, units, now);
    } catch (error) {
      recordAIEvent({ scope, units, outcome: 'rejected_quota' });
      console.error(JSON.stringify({
        event: 'ai_shared_quota_error',
        scope,
        errorType: error?.name || 'Error',
        message: 'Shared AI safety controls are unavailable',
      }));
      res.setHeader('Retry-After', '5');
      return res.status(503).json({
        message: 'AI safety controls are temporarily unavailable. Your work is safe; try again shortly.',
        retryAfterSeconds: 5,
        scope,
      });
    }

    const reservationRetryAfter = Math.max(
      1,
      Math.ceil(Number(reservation.retryAfterMs || reservation.retryAfterSeconds * 1000 || 5000) / 1000),
    );
    if (reservation.reason === 'concurrency') {
      recordAIEvent({ scope, units, outcome: 'rejected_concurrency' });
      res.setHeader('Retry-After', String(reservationRetryAfter));
      return res.status(429).json({
        message: 'You already have AI work in progress. Wait for it to finish, then try again.',
        retryAfterSeconds: reservationRetryAfter,
        scope,
      });
    }
    if (!reservation.ok) {
      const circuitRejected = reservation.reason === 'circuit';
      recordAIEvent({
        scope,
        units,
        outcome: circuitRejected ? 'rejected_circuit' : 'rejected_quota',
      });
      res.setHeader('Retry-After', String(reservationRetryAfter));
      return res.status(circuitRejected || reservation.reason === 'daily' ? 503 : 429).json({
        message: circuitRejected
          ? 'AI assistance is temporarily paused while the service recovers. Your work is safe; try again shortly.'
          : reservation.reason === 'daily'
            ? 'Caplet has reached its daily AI safety budget. Your work is safe; try again after the daily reset.'
            : 'You have reached the short-term AI usage limit. Your work is safe; try again after the reset.',
        retryAfterSeconds: reservationRetryAfter,
        scope,
      });
    }

    if (state) state.active += 1;
    recordAIEvent({ scope, units, outcome: 'reserved' });
    res.setHeader('RateLimit-Remaining', String(Math.max(
      0,
      MAX_UNITS - Number(reservation.unitsUsed ?? state?.units ?? 0),
    )));

    let released = false;
    const release = () => {
      if (released) return;
      released = true;
      if (state) state.active = Math.max(0, state.active - 1);
      const failed = Number(res.statusCode || 0) >= 500;
      if (distributedStore) {
        Promise.all([
          distributedStore.releaseAI({ identityHash: identityHash(identity) }),
          distributedStore.recordAIOutcome({
            failed,
            failureThreshold: sharedCircuitFailureThreshold,
            cooldownMs: circuitCooldownMs,
          }),
        ]).catch((error) => console.error(JSON.stringify({
          event: 'ai_shared_quota_release_error',
          scope,
          errorType: error?.name || 'Error',
          message: 'AI quota lease will expire automatically',
        })));
      }
      recordAIEvent({
        scope,
        units,
        outcome: failed ? 'failed' : 'completed',
      });
    };
    res.once('finish', release);
    res.once('close', release);
    return next();
  };
}

function resetAIQuotaForTests() {
  usage.clear();
  dailyUsage = { date: null, units: 0 };
  resetRuntimeMetricsForTests();
}

module.exports = {
  consumeAIUnits,
  consumeAIUnitsForRequest,
  identityForAIRequest,
  reserveAIQuota,
  resetAIQuotaForTests,
};
