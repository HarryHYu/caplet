/**
 * CapletMark endpoints — HSC Economics answer marker (CAP-12 MVP).
 * All routes are private to the submitting student (every query scoped by
 * req.user.id), matching the essays.js convention.
 *
 *   POST   /api/economics-marker        -> mark one submitted answer, persist it
 *   GET    /api/economics-marker        -> list this user's past attempts (lightweight)
 *   GET    /api/economics-marker/:id    -> one full attempt
 *   DELETE /api/economics-marker/:id    -> delete an attempt
 */
const express = require('express');
const { requireAuth } = require('../middleware/auth');
const MarkedAttempt = require('../models/MarkedAttempt');
const { markEconomicsAnswer } = require('../services/economicsMarker');
const { requireAIConsent } = require('../services/privacyConsent');
const { reserveAIQuota } = require('../middleware/aiQuota');

const router = express.Router();
router.use(requireAuth);
const markingQuota = reserveAIQuota({ scope: 'economics-marker', units: 2 });

const sourceText = (value, limit = 200) => String(value || '').trim().slice(0, limit) || null;

// 15 markings per user per 15 minutes — generous for real practice, cheap to abuse-proof.
const recent = new Map();
const WINDOW_MS = 15 * 60 * 1000;
const LIMIT = 15;

function throttle(req, res, next) {
  const uid = req.user?.id;
  const now = Date.now();
  const hits = (recent.get(uid) || []).filter((t) => now - t < WINDOW_MS);
  if (hits.length >= LIMIT) {
    return res.status(429).json({
      message: `Too many markings — you can submit up to ${LIMIT} every 15 minutes. Take a moment and try again.`,
    });
  }
  hits.push(now);
  recent.set(uid, hits);
  next();
}

// POST /api/economics-marker — mark and persist one attempt
router.post('/', requireAIConsent, throttle, markingQuota, async (req, res) => {
  try {
    const sourceResourceId = sourceText(req.body?.sourceResourceId);
    const sourcePromptId = sourceText(req.body?.sourcePromptId);
    const sourceFocusId = sourceText(req.body?.sourceFocusId);
    const previous = sourceResourceId
      ? await MarkedAttempt.findOne({
          where: { userId: req.user.id, sourceResourceId },
          order: [['createdAt', 'DESC']],
        })
      : null;
    const result = await markEconomicsAnswer({
      question: req.body?.question,
      markValue: req.body?.markValue,
      responseType: req.body?.responseType,
      studentAnswer: req.body?.studentAnswer,
      focusArea: req.body?.focusArea,
    });

    const attempt = await MarkedAttempt.create({
      userId: req.user.id,
      ...result,
      sourceResourceId,
      sourcePromptId,
      sourceFocusId,
    });
    try {
      const { recordAIInteraction } = require('../services/aiHistory');
      await recordAIInteraction({
        userId: req.user.id,
        feature: 'economics_marker',
        modelVersion: result.modelVersion,
        promptVersion: result.promptVersion,
        status: 'completed',
        confidence: result.markingConfidence,
        inputSummary: result.question,
        outputSummary: `${result.estimatedMark}/${result.markValue}: ${result.nextRecommendation || result.band}`,
        metadata: { attemptId: attempt.id, practiceOnly: true, humanReviewRequired: result.markingConfidence === 'low' },
      });
    } catch (historyError) {
      console.error('AI history record error:', historyError.message);
    }

    try {
      const { recordMarkedAttemptEvidence } = require('../services/learningEvidenceService');
      const sourceId = sourcePromptId || sourceResourceId;
      const key = sourceId ? `economics:${sourceId.replace(/^exam:/, '')}` : null;
      if (key) await recordMarkedAttemptEvidence({ attempt, sourceKey: key });
    } catch (evidenceError) {
      console.error('Marked attempt evidence error:', evidenceError.message);
    }

    const previousMark = Number(previous?.estimatedMark);
    const currentMark = Number(attempt?.estimatedMark ?? result.estimatedMark);
    const improvement = Number.isFinite(previousMark) && Number.isFinite(currentMark)
      ? {
          previousMark,
          markValue: result.markValue,
          change: currentMark - previousMark,
          message: currentMark > previousMark
            ? `Improved by ${currentMark - previousMark} mark${currentMark - previousMark === 1 ? '' : 's'} from your last try.`
            : currentMark < previousMark
              ? `This is ${previousMark - currentMark} mark${previousMark - currentMark === 1 ? '' : 's'} below your last try — use the gaps below to rebuild it.`
              : 'You matched your previous mark. Focus on one missing idea to move it higher.',
        }
      : null;
    res.status(201).json({ attempt, improvement });
  } catch (e) {
    const status = e.status || 502;
    if (status >= 500) console.error('Economics marker error:', e.message);
    res.status(status).json({ message: e.message || 'Marking failed' });
  }
});

// GET /api/economics-marker — list (omit the heavy text fields)
router.get('/', async (req, res) => {
  try {
    const attempts = await MarkedAttempt.findAll({
      where: { userId: req.user.id },
      attributes: ['id', 'question', 'markValue', 'estimatedMark', 'band', 'responseType', 'focusArea', 'markingConfidence', 'createdAt'],
      order: [['createdAt', 'DESC']],
      limit: 100,
    });
    res.json({ attempts });
  } catch (e) {
    console.error('List marked attempts error:', e);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /api/economics-marker/:id — full attempt
router.get('/:id', async (req, res) => {
  try {
    const attempt = await MarkedAttempt.findOne({
      where: { id: req.params.id, userId: req.user.id },
    });
    if (!attempt) return res.status(404).json({ message: 'Attempt not found' });
    res.json({ attempt });
  } catch (e) {
    console.error('Get marked attempt error:', e);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// DELETE /api/economics-marker/:id
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await MarkedAttempt.destroy({
      where: { id: req.params.id, userId: req.user.id },
    });
    if (!deleted) return res.status(404).json({ message: 'Attempt not found' });
    res.status(204).end();
  } catch (e) {
    console.error('Delete marked attempt error:', e);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;
