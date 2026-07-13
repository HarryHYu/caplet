const express = require('express');
const { requireAdmin } = require('../middleware/auth');
const { createRateLimiter } = require('../middleware/rateLimit');
const {
  FeatureFlagError,
  archiveFeatureFlag,
  createFeatureFlag,
  featureFlagAudit,
  listAdminFlags,
  listPublicFlags,
  restoreFeatureFlag,
  updateFeatureFlag,
} = require('../services/featureFlagService');

const router = express.Router();
const publicLimiter = createRateLimiter({ scope: 'feature_flags_public', windowMs: 60000, max: 120 });
const adminLimiter = createRateLimiter({ scope: 'feature_flags_admin', windowMs: 60000, max: 60 });

const asyncRoute = (handler) => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);

function stableClientId(req) {
  const value = req.get('X-Caplet-Client-Id');
  return typeof value === 'string' && /^[A-Za-z0-9._:-]{8,128}$/.test(value) ? value : null;
}

function expectedVersion(req) {
  const raw = req.body?.expectedVersion ?? req.get('If-Match');
  if (raw === undefined || raw === null || raw === '') return undefined;
  const text = String(raw).replace(/^W\//, '').replaceAll('"', '').trim();
  const version = Number(text);
  if (!Number.isInteger(version) || version < 1) throw new FeatureFlagError('expectedVersion must be a positive integer');
  return version;
}

function writeContext(req) {
  return {
    actorUserId: req.user?.id || null,
    requestId: req.requestId || null,
    expectedVersion: expectedVersion(req),
  };
}

function writeBody(req) {
  const body = { ...(req.body || {}) };
  delete body.expectedVersion;
  return body;
}

router.get('/', publicLimiter, asyncRoute(async (req, res) => {
  const keys = typeof req.query.keys === 'string'
    ? req.query.keys.split(',').map((item) => item.trim()).filter(Boolean).slice(0, 100)
    : [];
  const flags = await listPublicFlags({ keys, stableId: stableClientId(req) });
  res.set('Cache-Control', 'public, max-age=30, stale-while-revalidate=60');
  res.set('Vary', 'X-Caplet-Client-Id');
  res.json({ flags, generatedAt: new Date().toISOString() });
}));

router.use('/admin', requireAdmin, adminLimiter, (req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});

router.get('/admin', asyncRoute(async (req, res) => {
  const includeArchived = req.query.includeArchived === 'true';
  res.json({ flags: await listAdminFlags({ includeArchived }) });
}));

router.post('/admin', asyncRoute(async (req, res) => {
  const flag = await createFeatureFlag(writeBody(req), writeContext(req));
  res.status(201).json({ flag });
}));

router.patch('/admin/:key', asyncRoute(async (req, res) => {
  const flag = await updateFeatureFlag(req.params.key, writeBody(req), writeContext(req));
  res.json({ flag });
}));

router.delete('/admin/:key', asyncRoute(async (req, res) => {
  const flag = await archiveFeatureFlag(req.params.key, writeContext(req));
  res.json({ flag });
}));

router.post('/admin/:key/restore', asyncRoute(async (req, res) => {
  const flag = await restoreFeatureFlag(req.params.key, writeContext(req));
  res.json({ flag });
}));

router.get('/admin/:key/audit', asyncRoute(async (req, res) => {
  const audit = await featureFlagAudit(req.params.key, { limit: req.query.limit });
  res.json({ audit });
}));

// eslint-disable-next-line no-unused-vars -- Express error middleware requires four arguments.
router.use((error, req, res, next) => {
  const status = error instanceof FeatureFlagError ? error.status : 500;
  if (status >= 500) console.error('Feature flag route error:', error);
  res.status(status).json({
    message: status >= 500 ? 'Unable to manage feature flags' : error.message,
    code: error.code || 'feature_flag_error',
    requestId: req.requestId || null,
  });
});

module.exports = router;
