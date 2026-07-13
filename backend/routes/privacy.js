const express = require('express');
const crypto = require('crypto');
const { requireAuth } = require('../middleware/auth');
const { createRateLimiter } = require('../middleware/rateLimit');
const { requiresGuardianConsent } = require('../services/privacyConsent');
const { sendGuardianConsentEmail } = require('../services/guardianConsentDelivery');
const { eraseAccountData, exportedAccountData } = require('../services/accountDataService');

const router = express.Router();

const CONSENT_TYPES = new Set(['ai_processing', 'learning_analytics', 'financial_twin', 'classroom_data']);
const tokenHash = (token) => crypto.createHash('sha256').update(String(token || '')).digest('hex');
const normalizeEmail = (value) => String(value || '').trim().toLowerCase();
const GUARDIAN_PURPOSES = ['ai_processing', 'learning_analytics', 'classroom_data'];
const guardianDecisionLimiter = createRateLimiter({ scope: 'guardian_consent_decision', windowMs: 15 * 60 * 1000, max: 30 });
const guardianRequestLimiter = createRateLimiter({
  scope: 'guardian_consent_request',
  windowMs: 24 * 60 * 60 * 1000,
  max: 5,
  keyGenerator: (req) => `user:${req.user?.id || 'unknown'}`,
});

function guardianURL(token) {
  const frontendURL = String(process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
  return `${frontendURL}/guardian-consent/${encodeURIComponent(token)}`;
}

async function guardianRequestForToken(token) {
  if (!/^[A-Za-z0-9_-]{40,200}$/.test(String(token || ''))) return null;
  const { GuardianConsentRequest } = require('../models');
  return GuardianConsentRequest.findOne({ where: { tokenHash: tokenHash(token) } });
}

// This route is intentionally public: the guardian follows a high-entropy,
// single-use link without needing a Caplet account. It exposes no learner PII.
router.get('/guardian-consent/:token', guardianDecisionLimiter, async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  try {
    const request = await guardianRequestForToken(req.params.token);
    if (!request) return res.status(404).json({ message: 'This consent request could not be found.' });
    const expired = new Date(request.expiresAt).getTime() <= Date.now();
    res.json({
      request: {
        status: expired && request.status === 'pending' ? 'expired' : request.status,
        policyVersion: request.policyVersion,
        expiresAt: request.expiresAt,
        actedAt: request.actedAt,
        purposes: request.metadata?.purposes || GUARDIAN_PURPOSES,
      },
    });
  } catch (error) {
    console.error('Guardian consent lookup error:', error);
    res.status(500).json({ message: 'Could not load this guardian consent request.' });
  }
});

router.post('/guardian-consent/:token', guardianDecisionLimiter, async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  try {
    const { ConsentRecord, GuardianConsentRequest, UserPrivacyPreference, sequelize } = require('../models');
    const decision = String(req.body?.decision || '');
    const guardianName = String(req.body?.guardianName || '').trim().slice(0, 120);
    if (!['granted', 'declined'].includes(decision)) return res.status(400).json({ message: 'Choose approve or decline.' });
    if (guardianName.length < 2) return res.status(400).json({ message: 'Enter your full name.' });
    if (req.body?.guardianAffirmation !== true) {
      return res.status(400).json({ message: 'Confirm that you are the learner’s parent or legal guardian.' });
    }
    const request = await guardianRequestForToken(req.params.token);
    if (!request) return res.status(404).json({ message: 'This consent request could not be found.' });
    if (request.status !== 'pending') return res.status(409).json({ message: 'This consent request has already been completed.' });
    if (new Date(request.expiresAt).getTime() <= Date.now()) return res.status(410).json({ message: 'This consent request has expired.' });

    await sequelize.transaction(async (transaction) => {
      const [updated] = await GuardianConsentRequest.update({
        status: decision,
        guardianName,
        actedAt: new Date(),
      }, { where: { id: request.id, status: 'pending' }, transaction });
      if (updated !== 1) {
        const error = new Error('This consent request has already been completed.');
        error.status = 409;
        throw error;
      }
      const [preference] = await UserPrivacyPreference.findOrCreate({
        where: { userId: request.userId },
        defaults: { parentConsentStatus: decision },
        transaction,
      });
      if (preference.parentConsentStatus !== decision) {
        await preference.update({ parentConsentStatus: decision }, { transaction });
      }
      await ConsentRecord.create({
        userId: request.userId,
        type: 'parental',
        status: decision,
        policyVersion: request.policyVersion,
        grantedAt: decision === 'granted' ? new Date() : null,
        withdrawnAt: decision === 'declined' ? new Date() : null,
        metadata: { source: 'guardian_link', guardianRequestId: request.id, purposes: request.metadata?.purposes || GUARDIAN_PURPOSES },
      }, { transaction });
    });
    res.json({ status: decision });
  } catch (error) {
    if ((error.status || 500) >= 500) console.error('Guardian consent response error:', error);
    res.status(error.status || 500).json({ message: error.status ? error.message : 'Could not record the guardian decision.' });
  }
});

router.use(requireAuth);

async function preferenceFor(user) {
  const { UserPrivacyPreference } = require('../models');
  const guardianRequired = requiresGuardianConsent(user);
  const [preference] = await UserPrivacyPreference.findOrCreate({
    where: { userId: user.id },
    defaults: { parentConsentStatus: guardianRequired ? 'pending' : 'not_required' },
  });
  if (guardianRequired && preference.parentConsentStatus === 'not_required') {
    await preference.update({ parentConsentStatus: 'pending' });
  } else if (!guardianRequired && preference.parentConsentStatus !== 'not_required') {
    await preference.update({ parentConsentStatus: 'not_required' });
  }
  const analyticsConsent = await require('../services/privacyConsent').hasRecordedConsent(user.id, 'learning_analytics');
  const analyticsAllowed = analyticsConsent && (!guardianRequired || preference.parentConsentStatus === 'granted');
  if (preference.analyticsEnabled !== analyticsAllowed) {
    await preference.update({ analyticsEnabled: analyticsAllowed });
  }
  return preference;
}

router.get('/preferences', async (req, res) => {
  try {
    const { ConsentRecord } = require('../models');
    const [preference, consents] = await Promise.all([
      preferenceFor(req.user),
      ConsentRecord.findAll({ where: { userId: req.user.id }, order: [['createdAt', 'DESC']] }),
    ]);
    res.json({ preference, consents, ageVerificationRequired: !req.user.dateOfBirth });
  } catch {
    res.status(500).json({ message: 'Could not load privacy controls.' });
  }
});

router.put('/preferences', async (req, res) => {
  try {
    if (Object.prototype.hasOwnProperty.call(req.body || {}, 'analyticsEnabled')) {
      return res.status(400).json({ message: 'Use the learning analytics consent control to change optional analytics.' });
    }
    const preference = await preferenceFor(req.user);
    const patch = {};
    if (typeof req.body?.aiHistoryEnabled === 'boolean') patch.aiHistoryEnabled = req.body.aiHistoryEnabled;
    if (req.body?.aiRetentionDays !== undefined) patch.aiRetentionDays = Math.max(1, Math.min(3650, Number(req.body.aiRetentionDays) || 365));
    if (req.body?.ageNoticeAcknowledged === true) patch.ageNoticeAcknowledgedAt = new Date();
    await preference.update(patch);
    res.json({ preference });
  } catch {
    res.status(500).json({ message: 'Could not update privacy controls.' });
  }
});

router.post('/guardian-consent-requests', guardianRequestLimiter, async (req, res) => {
  try {
    if (!requiresGuardianConsent(req.user)) {
      return res.status(400).json({ message: 'Guardian approval is only required for accounts identified as under 18.' });
    }
    const { GuardianConsentRequest } = require('../models');
    const guardianEmail = normalizeEmail(req.body?.guardianEmail);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guardianEmail) || guardianEmail.length > 254) {
      return res.status(400).json({ message: 'Enter a valid parent or guardian email address.' });
    }
    if (guardianEmail === normalizeEmail(req.user.email)) {
      return res.status(400).json({ message: 'Use your parent or guardian’s email address, not your own.' });
    }
    await GuardianConsentRequest.update(
      { status: 'superseded', actedAt: new Date() },
      { where: { userId: req.user.id, status: 'pending' } },
    );
    const token = crypto.randomBytes(32).toString('base64url');
    const request = await GuardianConsentRequest.create({
      userId: req.user.id,
      guardianEmail,
      tokenHash: tokenHash(token),
      status: 'pending',
      policyVersion: String(req.body?.policyVersion || 'privacy-controls-v2').slice(0, 100),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      metadata: { delivery: 'pending', purposes: GUARDIAN_PURPOSES },
    });
    let delivery;
    try {
      delivery = await sendGuardianConsentEmail({
        to: guardianEmail,
        url: guardianURL(token),
        expiresAt: request.expiresAt,
      });
      await request.update({
        metadata: {
          delivery: delivery.delivery,
          providerMessageId: delivery.providerMessageId,
          deliveredAt: new Date().toISOString(),
          purposes: GUARDIAN_PURPOSES,
        },
      });
    } catch (deliveryError) {
      await request.update({ status: 'delivery_failed', actedAt: new Date(), metadata: { delivery: 'failed' } });
      deliveryError.status = deliveryError.status || 503;
      throw deliveryError;
    }
    const preference = await preferenceFor(req.user);
    if (preference.parentConsentStatus !== 'pending') await preference.update({ parentConsentStatus: 'pending' });
    res.status(201).json({
      request: { id: request.id, status: request.status, guardianEmail, expiresAt: request.expiresAt },
      ...(delivery.shareUrl ? { shareUrl: delivery.shareUrl } : {}),
      delivery: delivery.delivery,
    });
  } catch (error) {
    console.error('Guardian consent request error:', error);
    res.status(error.status || 500).json({ message: error.status ? error.message : 'Could not create the guardian consent request.' });
  }
});

router.post('/consents', async (req, res) => {
  try {
    const { ConsentRecord, sequelize } = require('../models');
    const type = String(req.body?.type || '');
    if (!CONSENT_TYPES.has(type)) return res.status(400).json({ message: 'A valid consent type is required.' });
    if (['ai_processing', 'learning_analytics', 'classroom_data'].includes(type) && !req.user.dateOfBirth) {
      return res.status(409).json({ message: 'Add your date of birth in Settings → Profile before enabling age-sensitive optional features.' });
    }
    if (['ai_processing', 'learning_analytics', 'classroom_data'].includes(type) && requiresGuardianConsent(req.user)) {
      const preference = await preferenceFor(req.user);
      if (preference.parentConsentStatus !== 'granted') {
        return res.status(403).json({ message: 'A parent or guardian must approve optional AI and analytics first.' });
      }
    }
    const policyVersion = String(req.body?.policyVersion || '').trim();
    if (!policyVersion) return res.status(400).json({ message: 'policyVersion is required.' });
    const analyticsPreference = type === 'learning_analytics' ? await preferenceFor(req.user) : null;
    const consent = await sequelize.transaction(async (transaction) => {
      const created = await ConsentRecord.create({
        userId: req.user.id,
        type,
        status: 'granted',
        policyVersion,
        grantedAt: new Date(),
        withdrawnAt: null,
        metadata: { source: 'self_service', ...(req.body?.metadata || {}) },
      }, { transaction });
      if (analyticsPreference) await analyticsPreference.update({ analyticsEnabled: true }, { transaction });
      return created;
    });
    res.status(201).json({ consent });
  } catch {
    res.status(500).json({ message: 'Could not record consent.' });
  }
});

router.delete('/consents/:type', async (req, res) => {
  try {
    const { ConsentRecord, sequelize } = require('../models');
    const type = String(req.params.type || '');
    if (!CONSENT_TYPES.has(type)) return res.status(400).json({ message: 'A valid consent type is required.' });
    const previous = await ConsentRecord.findOne({ where: { userId: req.user.id, type, status: 'granted' }, order: [['createdAt', 'DESC']] });
    const analyticsPreference = type === 'learning_analytics' ? await preferenceFor(req.user) : null;
    const consent = await sequelize.transaction(async (transaction) => {
      const created = await ConsentRecord.create({
        userId: req.user.id,
        type,
        status: 'withdrawn',
        policyVersion: previous?.policyVersion || 'current',
        grantedAt: previous?.grantedAt || null,
        withdrawnAt: new Date(),
        metadata: { source: 'self_service', previousConsentId: previous?.id || null },
      }, { transaction });
      if (analyticsPreference) await analyticsPreference.update({ analyticsEnabled: false }, { transaction });
      return created;
    });
    res.json({ consent });
  } catch {
    res.status(500).json({ message: 'Could not withdraw consent.' });
  }
});

router.get('/ai-history', async (req, res) => {
  try {
    const { AIInteraction } = require('../models');
    const limit = Math.max(1, Math.min(200, Number(req.query.limit) || 50));
    const interactions = await AIInteraction.findAll({ where: { userId: req.user.id }, order: [['occurredAt', 'DESC']], limit });
    res.json({ interactions });
  } catch {
    res.status(500).json({ message: 'Could not load AI history.' });
  }
});

router.delete('/ai-history', async (req, res) => {
  try {
    const { AIInteraction } = require('../models');
    const deleted = await AIInteraction.destroy({ where: { userId: req.user.id } });
    res.json({ deleted });
  } catch {
    res.status(500).json({ message: 'Could not clear AI history.' });
  }
});

router.get('/processors', (_req, res) => {
  res.json({
    processors: [
      { name: 'OpenAI', purpose: 'Optional AI lesson generation, tutoring and practice feedback', categories: ['submitted learning text', 'generated feedback'], optional: true },
      { name: 'Google', purpose: 'Optional Google account sign-in', categories: ['email', 'name', 'profile image'], optional: true },
      { name: 'AWS S3-compatible storage', purpose: 'User-requested lesson and course media uploads', categories: ['uploaded files'], optional: true },
      { name: 'Railway', purpose: 'Backend and database hosting', categories: ['account and product data'], optional: false },
      { name: 'Vercel', purpose: 'Frontend hosting', categories: ['technical request data'], optional: false },
    ],
    note: 'Availability and processing locations depend on the configured production services. School administrators should confirm the current deployment configuration before procurement.',
  });
});

router.get('/export', async (req, res) => {
  try {
    const document = await exportedAccountData(req.user);
    res.setHeader('Content-Disposition', `attachment; filename="caplet-data-${new Date().toISOString().slice(0, 10)}.json"`);
    res.json(document);
  } catch (error) {
    console.error('Account export error:', error);
    res.status(500).json({ message: 'Could not export account data.' });
  }
});

router.delete('/account', async (req, res) => {
  if (req.body?.confirmation !== 'DELETE MY ACCOUNT') {
    return res.status(400).json({ message: 'Type DELETE MY ACCOUNT to confirm permanent deletion.' });
  }
  try {
    await eraseAccountData(req.user.id);
    res.status(204).end();
  } catch (error) {
    console.error('Account deletion error:', error);
    res.status(500).json({ message: 'Could not delete the account.' });
  }
});

module.exports = router;
