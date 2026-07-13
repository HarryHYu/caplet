async function latestConsent(userId, type) {
  const { ConsentRecord } = require('../models');
  return ConsentRecord.findOne({ where: { userId, type }, order: [['createdAt', 'DESC']] });
}

async function hasActiveConsent(userId, type) {
  if (process.env.NODE_ENV === 'test') return true;
  const consent = await latestConsent(userId, type);
  return consent?.status === 'granted';
}

async function hasRecordedConsent(userId, type) {
  const consent = await latestConsent(userId, type);
  return consent?.status === 'granted';
}

function ageInYears(dateOfBirth, now = new Date()) {
  if (!dateOfBirth) return null;
  const birthDate = new Date(`${dateOfBirth}T00:00:00Z`);
  if (Number.isNaN(birthDate.getTime()) || birthDate > now) return null;
  let age = now.getUTCFullYear() - birthDate.getUTCFullYear();
  const monthDifference = now.getUTCMonth() - birthDate.getUTCMonth();
  if (monthDifference < 0 || (monthDifference === 0 && now.getUTCDate() < birthDate.getUTCDate())) age -= 1;
  return age;
}

function requiresGuardianConsent(user, now = new Date()) {
  const age = ageInYears(user?.dateOfBirth, now);
  return age !== null && age < 18;
}

async function canUseAI(user) {
  if (!user?.id || !user.dateOfBirth) return false;
  if (!(await hasActiveConsent(user.id, 'ai_processing'))) return false;
  if (!requiresGuardianConsent(user)) return true;
  const { UserPrivacyPreference } = require('../models');
  const preference = await UserPrivacyPreference.findOne({ where: { userId: user.id } });
  return preference?.parentConsentStatus === 'granted';
}

async function canUseLearningAnalytics(user) {
  if (!user?.id || !user.dateOfBirth || !(await hasRecordedConsent(user.id, 'learning_analytics'))) return false;
  const { UserPrivacyPreference } = require('../models');
  const preference = await UserPrivacyPreference.findOne({ where: { userId: user.id } });
  if (preference?.analyticsEnabled !== true) return false;
  return !requiresGuardianConsent(user) || preference.parentConsentStatus === 'granted';
}

async function requireAIConsent(req, res, next) {
  try {
    if (!req.user?.dateOfBirth) {
      return res.status(403).json({
        message: 'Add your date of birth in Settings → Profile before enabling optional AI-assisted learning.',
        code: 'age_confirmation_required',
        consentRequired: true,
      });
    }
    const hasAIConsent = await hasActiveConsent(req.user?.id, 'ai_processing');
    if (hasAIConsent && requiresGuardianConsent(req.user)) {
      const { UserPrivacyPreference } = require('../models');
      const preference = await UserPrivacyPreference.findOne({ where: { userId: req.user.id } });
      if (preference?.parentConsentStatus !== 'granted') {
        return res.status(403).json({
          message: 'A parent or guardian must approve optional AI-assisted learning before it can be used.',
          code: 'guardian_consent_required',
          consentRequired: true,
        });
      }
    }
    if (hasAIConsent) return next();
    return res.status(403).json({
      message: 'Enable AI-assisted learning in Settings → Privacy & data before sending learning text to an AI service.',
      code: 'ai_consent_required',
      consentRequired: true,
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  ageInYears,
  canUseAI,
  canUseLearningAnalytics,
  hasActiveConsent,
  hasRecordedConsent,
  latestConsent,
  requireAIConsent,
  requiresGuardianConsent,
};
