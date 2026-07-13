/**
 * Shared spaced-repetition endpoints. Thin layer over the pure scheduler in
 * backend/services/srsScheduler.js — every reviewable item kind (saved slides,
 * essay paragraphs, quotes) schedules through here.
 *
 *   GET  /api/review/due            -> items whose nextDueAt is at or before now
 *   POST /api/review/submit         -> record a recall result, advance the ladder
 *
 * All routes require a normal user JWT (req.user.id).
 */
const express = require('express');
const { Op } = require('sequelize');
const ReviewItem = require('../models/ReviewItem');
const { requireAuth } = require('../middleware/auth');
const { nextReview, normalizeRecall } = require('../services/srsScheduler');

const router = express.Router();
router.use(requireAuth);

// Kinds of reviewable items the scheduler currently accepts. Extending this set
// is the only change needed to schedule a new kind of item.
const ALLOWED_ITEM_TYPES = new Set(['savedSlide', 'essayParagraph', 'quote', 'outcome']);

// GET /api/review/due[?itemType=savedSlide]
// Returns the user's review items that are due now, soonest first.
router.get('/due', async (req, res) => {
  try {
    const where = {
      userId: req.user.id,
      nextDueAt: { [Op.lte]: new Date() },
    };
    const itemType = req.query.itemType;
    if (itemType) {
      if (!ALLOWED_ITEM_TYPES.has(itemType)) {
        return res.status(400).json({ message: `Unknown itemType "${itemType}"` });
      }
      where.itemType = itemType;
    }

    const items = await ReviewItem.findAll({
      where,
      order: [['nextDueAt', 'ASC']],
    });
    res.json({ items });
  } catch (e) {
    console.error('Get due review items error:', e);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// POST /api/review/submit  { itemType, itemId, recall }
// Creates or updates the ReviewItem for (user, itemType, itemId) by running the
// scheduler over its current stage. `recall` may be a boolean, a 'pass'/'fail'
// string, or a small grade — the scheduler normalizes it.
router.post('/submit', async (req, res) => {
  try {
    const { itemType, recall } = req.body || {};
    const itemId = req.body?.itemId != null ? String(req.body.itemId) : '';

    if (!itemType || !ALLOWED_ITEM_TYPES.has(itemType)) {
      return res.status(400).json({ message: 'A valid itemType is required' });
    }
    if (!itemId) {
      return res.status(400).json({ message: 'itemId is required' });
    }

    const now = new Date();
    const [item, created] = await ReviewItem.findOrCreate({
      where: { userId: req.user.id, itemType, itemId },
      defaults: { stage: 0, nextDueAt: now },
    });

    // A freshly created row has no prior history -> treat currentStage as null.
    const { stage, nextDueAt, recall: normalized } = nextReview(
      created ? null : item.stage,
      recall,
      now.getTime(),
    );

    await item.update({
      stage,
      nextDueAt,
      lastReviewedAt: now,
      lastRecall: normalizeRecall(normalized),
    });

    let mastery = null;
    if (itemType === 'outcome') {
      try {
        const { recordEvidenceForOutcomes } = require('../services/learningEvidenceService');
        const [result] = await recordEvidenceForOutcomes({
          idempotencyKey: `review:${item.id}:${now.toISOString()}`,
          userId: req.user.id,
          outcomeIds: [itemId],
          sourceType: 'spaced_review',
          sourceId: item.id,
          score: normalized === 'pass' ? 1 : 0,
          maxScore: 1,
          assessmentType: 'due-review',
          markingMethod: 'deterministic',
          occurredAt: now,
        });
        mastery = result?.mastery || null;
      } catch (evidenceError) {
        console.error('Review mastery evidence error:', evidenceError.message);
      }
    }

    res.status(created ? 201 : 200).json({ reviewItem: item, mastery });
  } catch (e) {
    console.error('Submit review error:', e);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;
