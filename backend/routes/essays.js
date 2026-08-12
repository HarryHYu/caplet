/**
 * Essay memoriser endpoints. Essays are private to their owner (every query is
 * scoped by req.user.id).
 *
 *   GET    /api/essays            -> list the user's essays (lightweight)
 *   GET    /api/essays/:id        -> one essay (full text + parsed structure)
 *   POST   /api/essays            -> create from { title, text }
 *   PUT    /api/essays/:id        -> edit in place { title?, text? }; changing
 *                                    the text clears parsedStructure (stale)
 *   POST   /api/essays/:id/parse  -> AI structure labelling; accepts { model,
 *                                    force } — model from ESSAY_MODELS,
 *                                    force re-labels an already-parsed essay.
 *                                    Essays over MAX_AI_TEXT are structured
 *                                    deterministically (no AI call) instead of
 *                                    being rejected
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
const { parseEssay, fallbackStructure, segmentEssay } = require('../services/essayParser');
const { requireAIConsent } = require('../services/privacyConsent');
const { recordAIInteractionSafely } = require('../services/aiHistory');
const { reserveAIQuota } = require('../middleware/aiQuota');
const { publicAIError } = require('../utils/aiErrors');

const router = express.Router();
router.use(requireAuth);

const MAX_TITLE = 200;
const MAX_TEXT = 100000; // generous cap for a long essay
const MAX_AI_TEXT = 24000;
// Same selectable set as the AI lesson generator (routes/ai.js ALLOWED_MODELS).
const ESSAY_MODELS = ['gpt-5.4-nano', 'gpt-5.4-mini', 'gpt-5.4', 'gpt-5.5'];
const essayParseQuota = reserveAIQuota({
  scope: 'essay-structure',
  units: 6,
});

// GET /api/essays — list (omit the heavy originalText; flag whether parsed)
router.get('/', async (req, res) => {
  try {
    const essays = await Essay.findAll({
      where: { userId: req.user.id },
      attributes: ['id', 'title', 'originalText', 'parsedStructure', 'createdAt', 'updatedAt'],
      order: [['updatedAt', 'DESC']],
    });
    const list = essays.map((e) => ({
      id: e.id,
      title: e.title,
      parsed: !!e.parsedStructure,
      paragraphCount: e.parsedStructure?.bodyParagraphs?.length || 0,
      wordCount: String(e.originalText || '').trim().split(/\s+/).filter(Boolean).length,
      excerpt: String(e.originalText || '').trim().slice(0, 180),
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

// PUT /api/essays/:id — edit in place. Changing the text invalidates the
// parsed structure so the client re-labels it (the review schedule is kept:
// items whose paragraph survives keep their timing; orphans hydrate to null).
router.put('/:id', async (req, res) => {
  try {
    const essay = await Essay.findOne({
      where: { id: req.params.id, userId: req.user.id },
    });
    if (!essay) return res.status(404).json({ message: 'Essay not found' });

    const updates = {};
    if (req.body?.title !== undefined) {
      const title = String(req.body.title).trim().slice(0, MAX_TITLE);
      if (!title) return res.status(400).json({ message: 'A title is required' });
      updates.title = title;
    }
    if (req.body?.text !== undefined) {
      const text = String(req.body.text);
      if (!text.trim()) return res.status(400).json({ message: 'Essay text is required' });
      if (text.length > MAX_TEXT) {
        return res.status(400).json({ message: 'Essay is too long.' });
      }
      if (text !== essay.originalText) {
        updates.originalText = text;
        updates.parsedStructure = null;
      }
    }
    if (Object.keys(updates).length) await essay.update(updates);
    res.json({ essay });
  } catch (e) {
    console.error('Update essay error:', e);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Loads the essay and serves the cached fast-path BEFORE any AI quota is
// reserved: returning an already-parsed structure must never consume quota.
async function loadEssayForParse(req, res, next) {
  try {
    const essay = await Essay.findOne({
      where: { id: req.params.id, userId: req.user.id },
    });
    if (!essay) return res.status(404).json({ message: 'Essay not found' });
    if (essay.parsedStructure && req.body?.force !== true) {
      return res.json({ essay, cached: true });
    }
    req.essayForParse = essay;
    return next();
  } catch (e) {
    console.error('Load essay for parse error:', e);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

// Race guard: the structure was built from a snapshot of the text, so it is
// only stored while the text is still identical — a concurrent PUT clears
// parsedStructure and must never be overwritten with stale labels. Returns the
// reloaded essay, or null when the conditional update matched nothing.
async function storeParsedStructure(req, essay, textAtParse, structure) {
  const [affectedCount] = await Essay.update(
    { parsedStructure: structure },
    { where: { id: essay.id, userId: req.user.id, originalText: textAtParse } },
  );
  if (!affectedCount) return null;
  return Essay.findOne({ where: { id: essay.id, userId: req.user.id } });
}

const PARSE_CONFLICT_MESSAGE = 'The essay changed while it was being mapped. Rescan to update.';

// POST /api/essays/:id/parse — AI structure labelling (never alters the text)
router.post('/:id/parse', requireAIConsent, loadEssayForParse, essayParseQuota, async (req, res) => {
  try {
    const essay = req.essayForParse;
    const textAtParse = String(essay.originalText || '');
    const model = ESSAY_MODELS.includes(req.body?.model) ? req.body.model : 'gpt-5.4-mini';

    // Oversize essays skip the AI entirely: the deterministic splitter still
    // yields a fully practisable structure, so nothing is rejected or dropped.
    if (textAtParse.length > MAX_AI_TEXT) {
      const structure = fallbackStructure(segmentEssay(textAtParse));
      const stored = await storeParsedStructure(req, essay, textAtParse, structure);
      if (!stored) return res.status(409).json({ message: PARSE_CONFLICT_MESSAGE });
      await recordAIInteractionSafely({
        userId: req.user.id,
        feature: 'essay_structure',
        modelVersion: 'deterministic-fallback',
        status: 'completed',
        inputSummary: `${essay.title} · ${textAtParse.length} characters`,
        outputSummary: `${structure?.bodyParagraphs?.length || 0} body paragraphs structured`,
        metadata: { essayId: essay.id },
      });
      return res.json({ essay: stored });
    }

    let degraded = false;
    const structure = await parseEssay(textAtParse, {
      model,
      onDegrade: () => { degraded = true; },
    });
    const stored = await storeParsedStructure(req, essay, textAtParse, structure);
    if (!stored) return res.status(409).json({ message: PARSE_CONFLICT_MESSAGE });
    await recordAIInteractionSafely({
      userId: req.user.id,
      feature: 'essay_structure',
      modelVersion: degraded ? `${model} (fallback)` : model,
      status: 'completed',
      inputSummary: `${essay.title} · ${textAtParse.length} characters`,
      outputSummary: `${structure?.bodyParagraphs?.length || 0} body paragraphs structured`,
      metadata: { essayId: essay.id },
    });
    res.json({ essay: stored });
  } catch (e) {
    const error = publicAIError(e, 'Failed to parse essay. Try again shortly.');
    console.error(JSON.stringify({
      event: 'essay_parse_error',
      requestId: req.requestId || null,
      errorType: e?.name || 'Error',
      status: error.status,
    }));
    res.status(error.status).json({ message: error.message, requestId: req.requestId || null });
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
