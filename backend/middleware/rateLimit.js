const crypto = require('crypto');
const { createRedisLimitStore } = require('../services/distributedLimitStore');

function identityForRequest(req) {
  if (req.user?.id) return `user:${req.user.id}`;
  return `network:${req.ip || req.socket?.remoteAddress || 'unknown'}`;
}

function fingerprintIdentity(scope, identity, salt = process.env.RATE_LIMIT_KEY_SALT || 'caplet-rate-limit') {
  return crypto.createHash('sha256').update(`${salt}|${scope}|${identity}`).digest('hex');
}

function createRateLimiter(options = {}) {
  const windowMs = Number(options.windowMs || 60000);
  const max = Number(options.max || 60);
  const scope = String(options.scope || 'global');
  const maxEntries = Number(options.maxEntries || 10000);
  const keyGenerator = options.keyGenerator || identityForRequest;
  const skip = options.skip || (() => false);
  const now = options.now || (() => Date.now());
  const logger = options.logger || ((line) => console.warn(line));
  const env = options.env || process.env;
  const distributedStore = options.distributedStore === undefined
    ? createRedisLimitStore({ env })
    : options.distributedStore;
  const failClosed = options.failClosed === undefined
    ? distributedStore && env.RATE_LIMIT_FAIL_CLOSED === 'true'
    : Boolean(options.failClosed);
  const store = new Map();
  let lastSweep = 0;

  if (!Number.isFinite(windowMs) || windowMs < 1000) throw new Error('rate-limit windowMs must be at least 1000');
  if (!Number.isInteger(max) || max < 1) throw new Error('rate-limit max must be a positive integer');
  if (!Number.isInteger(maxEntries) || maxEntries < 100) throw new Error('rate-limit maxEntries must be at least 100');

  const sweep = (timestamp, force = false) => {
    if (!force && timestamp - lastSweep < Math.min(windowMs, 60000)) return;
    lastSweep = timestamp;
    for (const [key, entry] of store) {
      if (entry.resetAt <= timestamp) store.delete(key);
    }
    while (store.size >= maxEntries) store.delete(store.keys().next().value);
  };

  const middleware = async (req, res, next) => {
    try {
      if (await skip(req)) return next();
      const timestamp = now();
      const identity = await keyGenerator(req);
      const key = fingerprintIdentity(scope, String(identity || 'anonymous'), options.salt);
      let count;
      let resetMs;

      if (distributedStore) {
        const result = await distributedStore.incrementFixedWindow({
          scope,
          identityHash: key,
          windowMs,
        });
        count = Number(result.count || 0);
        resetMs = Number(result.resetMs || windowMs);
      } else {
        sweep(timestamp);
        let entry = store.get(key);
        if (!entry || entry.resetAt <= timestamp) {
          if (!entry && store.size >= maxEntries) sweep(timestamp, true);
          entry = { count: 0, resetAt: timestamp + windowMs };
        } else {
          // Refresh insertion order so bounded pruning removes the stalest key.
          store.delete(key);
        }
        entry.count += 1;
        store.set(key, entry);
        count = entry.count;
        resetMs = entry.resetAt - timestamp;
      }

      const remaining = Math.max(0, max - count);
      const resetSeconds = Math.max(1, Math.ceil(resetMs / 1000));
      res.setHeader('RateLimit-Limit', String(max));
      res.setHeader('RateLimit-Remaining', String(remaining));
      res.setHeader('RateLimit-Reset', String(resetSeconds));

      if (count > max) {
        res.setHeader('Retry-After', String(resetSeconds));
        return res.status(429).json({
          message: options.message || 'Too many requests. Please try again shortly.',
          requestId: req.requestId || null,
        });
      }
      return next();
    } catch (error) {
      try {
        logger(JSON.stringify({
          event: 'rate_limit_error',
          scope,
          errorType: error?.name || 'Error',
          message: failClosed ? 'Shared rate limiter failed closed' : 'Rate limiter failed open',
        }));
      } catch { /* non-fatal */ }
      if (failClosed) {
        res.setHeader('Retry-After', '5');
        return res.status(503).json({
          message: 'Request safety controls are temporarily unavailable. Please retry shortly.',
          requestId: req.requestId || null,
        });
      }
      return next();
    }
  };

  middleware.reset = () => store.clear();
  middleware.size = () => store.size;
  return middleware;
}

module.exports = {
  createRateLimiter,
  fingerprintIdentity,
  identityForRequest,
};
