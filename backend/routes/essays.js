/**
 * Essay memoriser endpoints. Essays are private to their owner (every query is
 * scoped by req.user.id).
 *
 *   GET    /api/essays            -> list the user's essays (lightweight)
 *   GET    /api/essays/:id        -> one essay (full text + parsed structure)
 *   POST   /api/essays            -> create from { title, text }
 *   POST   /api/essays/:id/parse  -> AI segmentation (segment/annotate only)
 *   DELETE /api/essays/:id        -> delete an essay (and its review schedule)
 *
 * Parsing is a SEPARATE step from create: create never depends on the AI key
 * (so it always works), and /parse is the AI endpoint that degrades with a 503
 * when OPENAI_API_KEY is unset.
 */
const express = require('express');
const { Op } = require('sequelize');
const Essay = require('../models/Essay');
const ReviewItem = require('../models/ReviewItem');
const { requireAuth } = require('../middleware/auth');
const { parseEssay } = require('../services/essayParser');
const { requireAIConsent } = require('../services/privacyConsent');
const { recordAIInteractionSafely } = require('../services/aiHistory');
const { reserveAIQuota } = require('../middleware/aiQuota');

const router = express.Router();
router.use(requireAuth);

const MAX_TITLE = 200;
const MAX_TEXT = 100000; // generous cap for a long essay
const MAX_AI_TEXT = 24000;
const essayParseQuota = reserveAIQuota({
  scope: 'essay-structure',
  units: 6,
});

// GET /api/essays — list (omit the heavy originalText; flag whether parsed)
router.get('/', async (req, res) => {
  try {
    const essays = await Essay.findAll({
      where: { userId: req.user.id },
      attributes: ['id', 'title', 'parsedStructure', 'createdAt', 'updatedAt'],
      order: [['updatedAt', 'DESC']],
    });
    const list = essays.map((e) => ({
      id: e.id,
      title: e.title,
      parsed: !!e.parsedStructure,
      paragraphCount: e.parsedStructure?.bodyParagraphs?.length || 0,
      createdAt: e.createdAt,
      updatedAt: e.updatedAt,
    }));
    res.json({ essays: list });
  } catch (e) {
    console.error('List essays error:', e);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /api/essays/:id — full essay
router.get('/:id', async (req, res) => {
  try {
    const essay = await Essay.findOne({
      where: { id: req.params.id, userId: req.user.id },
    });
    if (!essay) return res.status(404).json({ message: 'Essay not found' });
    res.json({ essay });
  } catch (e) {
    console.error('Get essay error:', e);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// POST /api/essays — create (no AI; always works)
router.post('/', async (req, res) => {
  try {
    const title = (req.body?.title ?? '').toString().trim().slice(0, MAX_TITLE);
    const text = (req.body?.text ?? '').toString();
    if (!title) return res.status(400).json({ message: 'A title is required' });
    if (!text.trim()) return res.status(400).json({ message: 'Essay text is required' });
    if (text.length > MAX_TEXT) {
      return res.status(400).json({ message: 'Essay is too long.' });
    }

    const essay = await Essay.create({
      userId: req.user.id,
      title,
      originalText: text,
      parsedStructure: null,
    });
    res.status(201).json({ essay });
  } catch (e) {
    console.error('Create essay error:', e);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// POST /api/essays/:id/parse — AI segmentation (segment & annotate only)
router.post('/:id/parse', requireAIConsent, essayParseQuota, async (req, res) => {
  try {
    const essay = await Essay.findOne({
      where: { id: req.params.id, userId: req.user.id },
    });
    if (!essay) return res.status(404).json({ message: 'Essay not found' });
    if (essay.parsedStructure) return res.json({ essay, cached: true });
    if (String(essay.originalText || '').length > MAX_AI_TEXT) {
      return res.status(413).json({
        message: `AI structuring supports essays up to ${MAX_AI_TEXT.toLocaleString()} characters. Shorten this copy before parsing.`,
      });
    }

    const structure = await parseEssay(essay.originalText);
    await essay.update({ parsedStructure: structure });
    await recordAIInteractionSafely({
      userId: req.user.id,
      feature: 'essay_structure',
      modelVersion: 'gpt-5.4-mini',
      status: 'completed',
      inputSummary: `${essay.title} · ${String(essay.originalText || '').length} characters`,
      outputSummary: `${structure?.bodyParagraphs?.length || 0} body paragraphs structured`,
      metadata: { essayId: essay.id },
    });
    res.json({ essay });
  } catch (e) {
    const status = e.status || 500;
    console.error('Parse essay error:', e.message || e);
    res.status(status).json({ message: e.message || 'Failed to parse essay' });
  }
});

// DELETE /api/essays/:id — remove the essay and its review schedule. Essay
// items live inside JSONB (composite itemId `${id}:...`) so they have no FK and
// must be cleared explicitly.
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await Essay.destroy({
      where: { id: req.params.id, userId: req.user.id },
    });
    if (!deleted) return res.status(404).json({ message: 'Essay not found' });
    await ReviewItem.destroy({
      where: {
        userId: req.user.id,
        itemType: { [Op.in]: ['essayParagraph', 'quote'] },
        itemId: { [Op.like]: `${req.params.id}:%` },
      },
    }).catch(() => {});
    res.status(204).end();
  } catch (e) {
    console.error('Delete essay error:', e);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;
