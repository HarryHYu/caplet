/**
 * Lightweight analytics event sink.
 *
 * POST /api/events  { type, entityType, entityId, metadata }
 *
 * Events are persisted for funnels, cohorts, learning-outcome analytics and
 * feature-quality monitoring. The endpoint remains best-effort: analytics must
 * never interrupt a learner's primary action.
 *
 * Authentication and recorded learning-analytics consent are required. Server
 * events use trusted timestamps; client events are constrained to allowlists.
 */
const express = require('express');
const crypto = require('crypto');
const { requireAuth } = require('../middleware/auth');
const { createRateLimiter } = require('../middleware/rateLimit');

const router = express.Router();
router.use(requireAuth, createRateLimiter({ scope: 'client_product_events', windowMs: 15 * 60 * 1000, max: 180 }));

const ALLOWED_TYPES = new Set([
  'slide_viewed',
  'lesson_started',
  'lesson_completed',
  'listing_clicked',
  'tool_used',
  'quiz_answered',
  'essay_opened',
  'revision_session',
  'session_started',
  'diagnostic_completed',
  'recommendation_displayed',
  'recommendation_accepted',
  'question_attempted',
  'feedback_viewed',
  'assignment_created',
  'teacher_intervention',
  'ai_failed',
  'ai_retried',
  'practice_started',
  'practice_completed',
  'account_exported',
  'account_deleted',
  'finance_tool_viewed',
  'finance_calculation_started',
  'finance_calculation_completed',
  'finance_calculation_error',
  'finance_source_opened',
  'money_slice_started',
  'money_step_completed',
  'money_slice_completed',
  'money_source_opened',
]);

const CLIENT_TYPES = new Set([
  'slide_viewed', 'lesson_started', 'lesson_completed', 'listing_clicked',
  'tool_used', 'recommendation_accepted', 'feedback_viewed',
  'finance_tool_viewed', 'finance_calculation_started', 'finance_calculation_completed',
  'finance_calculation_error', 'finance_source_opened', 'money_slice_started',
  'money_step_completed', 'money_slice_completed', 'money_source_opened',
]);
const METADATA_FIELDS = {
  slide_viewed: new Set(['slideIndex', 'slideType']),
  lesson_started: new Set(['courseId', 'moduleId']),
  lesson_completed: new Set(['courseId', 'moduleId', 'timeSpentSeconds']),
  listing_clicked: new Set(['listingType', 'source', 'price']),
  tool_used: new Set(['tool', 'source']),
  recommendation_accepted: new Set(['reasonCode', 'mode']),
  feedback_viewed: new Set(['mode', 'markingMethod']),
  finance_tool_viewed: new Set(['toolId', 'entryPoint', 'contentVersion']),
  finance_calculation_started: new Set(['toolId', 'calculationVersion', 'scenarioType']),
  finance_calculation_completed: new Set(['toolId', 'calculationVersion', 'scenarioType', 'sourceStatus', 'contentVersion']),
  finance_calculation_error: new Set(['toolId', 'calculationVersion', 'errorCode']),
  finance_source_opened: new Set(['toolId', 'sourceId']),
  money_slice_started: new Set(['sliceId', 'stepId', 'contentVersion']),
  money_step_completed: new Set(['sliceId', 'stepId', 'contentVersion', 'correct']),
  money_slice_completed: new Set(['sliceId', 'contentVersion']),
  money_source_opened: new Set(['sliceId', 'sourceId', 'contentVersion']),
};

function safeMetadata(type, value) {
  const allowed = METADATA_FIELDS[type] || new Set();
  const result = {};
  for (const [key, raw] of Object.entries(value || {})) {
    if (!allowed.has(key)) continue;
    if (typeof raw === 'number' && Number.isFinite(raw)) result[key] = raw;
    else if (typeof raw === 'boolean') result[key] = raw;
    else if (typeof raw === 'string') result[key] = raw.trim().slice(0, 120);
  }
  return result;
}

router.post('/', async (req, res) => {
  const { type, entityType, entityId, metadata } = req.body || {};

  if (!type || typeof type !== 'string') {
    return res.status(400).json({ message: 'event type is required' });
  }
  if (!ALLOWED_TYPES.has(type)) {
    return res.status(400).json({ message: `Unsupported event type "${type}"` });
  }
  if (!CLIENT_TYPES.has(type)) {
    return res.status(403).json({ message: 'This event is recorded only by Caplet’s trusted server workflow.' });
  }
  if (metadata != null && (typeof metadata !== 'object' || Array.isArray(metadata))) {
    return res.status(400).json({ message: 'metadata must be an object' });
  }
  if (JSON.stringify(metadata || {}).length > 20000) {
    return res.status(413).json({ message: 'event metadata is too large' });
  }

  const userId = req.user.id;
  const occurredAt = new Date();
  const clientKey = String(req.body?.idempotencyKey || req.body?.eventId || crypto.randomUUID()).slice(0, 160);
  const idempotencyKey = `client:${userId}:${clientKey}`.slice(0, 255);
  const cleanedMetadata = safeMetadata(type, metadata);
  let outcomeId = null;
  if (type === 'recommendation_accepted' && req.body?.outcomeId) {
    const { CurriculumOutcome } = require('../models');
    const outcome = await CurriculumOutcome.findOne({ where: { id: req.body.outcomeId, isActive: true }, attributes: ['id'] });
    if (!outcome) return res.status(400).json({ message: 'The curriculum outcome is invalid.' });
    outcomeId = outcome.id;
  }
  const values = {
    idempotencyKey,
    type,
    entityType: entityType ? String(entityType).slice(0, 80) : null,
    entityId: entityId ? String(entityId).slice(0, 255) : null,
    userId,
    anonymousId: null,
    sessionId: null,
    practiceSessionId: null,
    classroomId: null,
    outcomeId,
    feature: req.body?.feature ? String(req.body.feature).slice(0, 100) : null,
    schemaVersion: Math.max(1, Number(req.body?.schemaVersion || 1)),
    metadata: cleanedMetadata,
    occurredAt,
    receivedAt: new Date(),
  };

  try {
    const { ProductEvent, User } = require('../models');
    if (userId) {
      const user = await User.findByPk(userId, { attributes: ['id', 'dateOfBirth'] });
      const { canUseLearningAnalytics } = require('../services/privacyConsent');
      if (!user || !(await canUseLearningAnalytics(user))) return res.status(202).json({ ok: true, persisted: false, consent: 'not_enabled' });
    }
    const [event, created] = await ProductEvent.findOrCreate({ where: { idempotencyKey }, defaults: values });
    return res.status(created ? 201 : 200).json({ ok: true, persisted: true, duplicate: !created, eventId: event.id });
  } catch (error) {
    console.error(JSON.stringify({ event: 'analytics_persist_failed', type, userId, message: error.message }));
    return res.status(202).json({ ok: true, persisted: false });
  }
});

module.exports = router;
