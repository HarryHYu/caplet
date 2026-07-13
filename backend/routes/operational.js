const express = require('express');
const crypto = require('crypto');
const { requireAdmin } = require('../middleware/auth');
const { createRateLimiter } = require('../middleware/rateLimit');
const {
  BackupVerificationError,
  checkLatestBackup,
  listBackupVerifications,
  recordBackupVerification,
} = require('../services/backupVerificationService');
const { getOperationalHealth, publicHealth } = require('../services/operationalReadiness');
const {
  getOperationalAlertSummary,
  retryPendingOperationalAlerts,
} = require('../services/operationalAlerts');
const { runtimeSummary } = require('../services/runtimeMetrics');

const router = express.Router();
const publicLimiter = createRateLimiter({ scope: 'operational_public', windowMs: 60000, max: 60 });
const adminLimiter = createRateLimiter({ scope: 'operational_admin', windowMs: 60000, max: 60 });
const asyncRoute = (handler) => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);

function hasOpsServiceCredential(req) {
  const expected = String(process.env.OPS_SERVICE_TOKEN || '');
  const supplied = String(req.get('X-Caplet-Ops-Token') || '');
  if (expected.length < 32 || !supplied) return false;
  const expectedDigest = crypto.createHash('sha256').update(expected).digest();
  const suppliedDigest = crypto.createHash('sha256').update(supplied).digest();
  return crypto.timingSafeEqual(expectedDigest, suppliedDigest);
}

function requireOpsWriter(req, res, next) {
  if (hasOpsServiceCredential(req)) {
    req.opsService = true;
    return next();
  }
  return requireAdmin(req, res, next);
}

router.get('/live', publicLimiter, (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json({ status: 'alive', timestamp: new Date().toISOString(), uptimeSeconds: Math.floor(process.uptime()) });
});

router.get('/ready', publicLimiter, asyncRoute(async (req, res) => {
  const health = await getOperationalHealth();
  res.set('Cache-Control', 'no-store');
  res.status(health.ready ? 200 : 503).json(publicHealth(health));
}));

// The scheduled recovery drill has a write-only machine credential. It cannot
// read health, feature flags, users, or prior backup evidence.
router.post('/admin/backups/verifications', adminLimiter, requireOpsWriter, asyncRoute(async (req, res) => {
  res.set('Cache-Control', 'no-store');
  const result = await recordBackupVerification(req.body || {}, {
    actorUserId: req.opsService ? null : req.user?.id || null,
    requestId: req.requestId || null,
  });
  res.status(result.created ? 201 : 200).json(result);
}));

router.use('/admin', requireAdmin, adminLimiter, (req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});

router.get('/admin/health', asyncRoute(async (req, res) => {
  const health = await getOperationalHealth();
  res.status(health.ready ? 200 : 503).json(health);
}));

router.get('/admin/observability', asyncRoute(async (req, res) => {
  const alerts = await getOperationalAlertSummary({ limit: req.query.limit });
  res.json({
    generatedAt: new Date().toISOString(),
    runtime: runtimeSummary({ windowMinutes: req.query.windowMinutes }),
    alerts,
  });
}));

router.post('/admin/alerts/retry', asyncRoute(async (req, res) => {
  const result = await retryPendingOperationalAlerts();
  res.json(result);
}));

router.get('/admin/backups', asyncRoute(async (req, res) => {
  const verifications = await listBackupVerifications({
    environment: req.query.environment,
    limit: req.query.limit,
  });
  res.json({ verifications });
}));

router.get('/admin/backups/status', asyncRoute(async (req, res) => {
  const result = await checkLatestBackup({
    environment: req.query.environment,
    maxAgeHours: req.query.maxAgeHours,
  });
  res.status(result.ok ? 200 : 503).json(result);
}));

// eslint-disable-next-line no-unused-vars -- Express error middleware requires four arguments.
router.use((error, req, res, next) => {
  const status = error instanceof BackupVerificationError ? error.status : 500;
  if (status >= 500) console.error('Operational route error:', error);
  res.status(status).json({
    message: status >= 500 ? 'Unable to complete the operational check' : error.message,
    code: error.code || 'operational_error',
    requestId: req.requestId || null,
  });
});

module.exports = router;
