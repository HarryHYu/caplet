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
const EssayContextDoc = require('../models/EssayContextDoc');
const EssayAnnotation = require('../models/EssayAnnotation');
const { requireAuth } = require('../middleware/auth');
const { parseEssay, fallbackStructure, segmentEssay } = require('../services/essayParser');
const { assistEssay, explainEssay } = require('../services/essayAssistant');
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

// ── Essay workspace limits (context docs, annotations, grounded chat) ───────
const MAX_CONTEXT_DOC = 150000; // chars per context document
const MAX_CONTEXT_DOCS = 12; // documents per essay
const MAX_CONTEXT_TOTAL = 500000; // chars across an essay's whole library
const MAX_NOTE = 2000; // chars per annotation note
const MAX_ANCHOR = 300; // chars per annotation anchor snippet
const MAX_ANNOTATIONS = 300; // annotations per essay
const MAX_CHAT_MESSAGES = 12; // history turns forwarded to the assistant
const MAX_CHAT_MESSAGE = 8000; // chars per forwarded turn
const essayChatQuota = reserveAIQuota({ scope: 'essay-chat', units: 4 });
const essayExplainQuota = reserveAIQuota({ scope: 'essay-structure', units: 6 });

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

// ═══════════════════════════ Essay workspace ════════════════════════════
// Per-essay context documents (the grounding library for the AI chat),
// paragraph annotations (student notes + AI explanations), a grounded chat,
// and one-shot AI paragraph explanations:
//
//   GET    /api/essays/:id/context              -> list docs (never content)
//   POST   /api/essays/:id/context              -> add { title, kind, content }
//   DELETE /api/essays/:id/context/:docId       -> remove a doc
//   GET    /api/essays/:id/annotations          -> full annotation rows
//   POST   /api/essays/:id/annotations          -> add a note (source 'user')
//   PUT    /api/essays/:id/annotations/:annId   -> edit { note?, anchor? }
//   DELETE /api/essays/:id/annotations/:annId   -> remove an annotation
//   POST   /api/essays/:id/chat                 -> grounded AI chat
//   POST   /api/essays/:id/explain              -> AI paragraph explanations
//
// Every route is owner-scoped: the essay is looked up by { id, userId } first
// and anything else 404s, so nothing here can touch another user's essay.

async function loadOwnedEssay(req, res, next) {
  try {
    const essay = await Essay.findOne({
      where: { id: req.params.id, userId: req.user.id },
    });
    if (!essay) return res.status(404).json({ message: 'Essay not found' });
    req.essay = essay;
    return next();
  } catch (e) {
    console.error('Load essay error:', e);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

// List shape for a context document — NEVER the full content (a document can
// be 150k chars; lists stay light and the chat reads content server-side).
const contextDocSummary = (doc) => ({
  id: doc.id,
  title: doc.title,
  kind: doc.kind,
  createdAt: doc.createdAt,
  chars: String(doc.content || '').length,
  preview: String(doc.content || '').slice(0, 200),
});

// GET /api/essays/:id/context — list the essay's context documents
router.get('/:id/context', loadOwnedEssay, async (req, res) => {
  try {
    const docs = await EssayContextDoc.findAll({
      where: { essayId: req.essay.id, userId: req.user.id },
      order: [['createdAt', 'ASC']],
    });
    res.json({ docs: docs.map(contextDocSummary) });
  } catch (e) {
    console.error('List context docs error:', e);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// POST /api/essays/:id/context — add a document to the context library
router.post('/:id/context', loadOwnedEssay, async (req, res) => {
  try {
    const title = String(req.body?.title ?? '').trim();
    if (!title) return res.status(400).json({ message: 'A title is required' });
    if (title.length > 160) return res.status(400).json({ message: 'Title is too long.' });
    const content = String(req.body?.content ?? '');
    if (!content.trim()) return res.status(400).json({ message: 'Document content is required' });
    if (content.length > MAX_CONTEXT_DOC) {
      return res.status(400).json({ message: 'Document is too large.' });
    }
    const kind = ['text', 'pdf'].includes(req.body?.kind) ? req.body.kind : 'text';

    const existing = await EssayContextDoc.findAll({
      where: { essayId: req.essay.id, userId: req.user.id },
      attributes: ['content'],
    });
    const existingChars = existing.reduce((sum, doc) => sum + String(doc.content || '').length, 0);
    if (existing.length >= MAX_CONTEXT_DOCS || existingChars + content.length > MAX_CONTEXT_TOTAL) {
      return res.status(400).json({ message: 'Context library is full.' });
    }

    const doc = await EssayContextDoc.create({
      essayId: req.essay.id,
      userId: req.user.id,
      title,
      kind,
      content,
    });
    res.status(201).json({ doc: contextDocSummary(doc) });
  } catch (e) {
    console.error('Create context doc error:', e);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// DELETE /api/essays/:id/context/:docId — remove a context document
router.delete('/:id/context/:docId', loadOwnedEssay, async (req, res) => {
  try {
    const deleted = await EssayContextDoc.destroy({
      where: { id: req.params.docId, essayId: req.essay.id, userId: req.user.id },
    });
    if (!deleted) return res.status(404).json({ message: 'Document not found' });
    res.status(204).end();
  } catch (e) {
    console.error('Delete context doc error:', e);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /api/essays/:id/annotations — full rows, in reading order
router.get('/:id/annotations', loadOwnedEssay, async (req, res) => {
  try {
    const annotations = await EssayAnnotation.findAll({
      where: { essayId: req.essay.id, userId: req.user.id },
      order: [['paragraphIndex', 'ASC'], ['createdAt', 'ASC']],
    });
    res.json({ annotations });
  } catch (e) {
    console.error('List annotations error:', e);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// POST /api/essays/:id/annotations — add an annotation. source is ALWAYS
// 'user': AI chat proposals are persisted through here by an explicit student
// action, never automatically (only /explain writes source 'ai' rows).
router.post('/:id/annotations', loadOwnedEssay, async (req, res) => {
  try {
    const paragraphIndex = req.body?.paragraphIndex;
    if (!Number.isInteger(paragraphIndex) || paragraphIndex < 0) {
      return res.status(400).json({ message: 'A valid paragraph is required' });
    }
    const note = String(req.body?.note ?? '').trim().slice(0, MAX_NOTE);
    if (!note) return res.status(400).json({ message: 'A note is required' });
    const anchor = String(req.body?.anchor ?? '').slice(0, MAX_ANCHOR);
    const kind = ['note', 'explanation'].includes(req.body?.kind) ? req.body.kind : 'note';

    const count = await EssayAnnotation.count({
      where: { essayId: req.essay.id, userId: req.user.id },
    });
    if (count >= MAX_ANNOTATIONS) {
      return res.status(400).json({ message: 'Annotation limit reached.' });
    }

    const annotation = await EssayAnnotation.create({
      essayId: req.essay.id,
      userId: req.user.id,
      paragraphIndex,
      anchor,
      note,
      kind,
      source: 'user',
    });
    res.status(201).json({ annotation });
  } catch (e) {
    console.error('Create annotation error:', e);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// PUT /api/essays/:id/annotations/:annId — edit note/anchor only (kind and
// source are fixed at creation)
router.put('/:id/annotations/:annId', loadOwnedEssay, async (req, res) => {
  try {
    const annotation = await EssayAnnotation.findOne({
      where: { id: req.params.annId, essayId: req.essay.id, userId: req.user.id },
    });
    if (!annotation) return res.status(404).json({ message: 'Annotation not found' });

    const updates = {};
    if (req.body?.note !== undefined) {
      const note = String(req.body.note).trim().slice(0, MAX_NOTE);
      if (!note) return res.status(400).json({ message: 'A note is required' });
      updates.note = note;
    }
    if (req.body?.anchor !== undefined) {
      updates.anchor = String(req.body.anchor).slice(0, MAX_ANCHOR);
    }
    if (Object.keys(updates).length) await annotation.update(updates);
    res.json({ annotation });
  } catch (e) {
    console.error('Update annotation error:', e);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// DELETE /api/essays/:id/annotations/:annId — remove an annotation
router.delete('/:id/annotations/:annId', loadOwnedEssay, async (req, res) => {
  try {
    const deleted = await EssayAnnotation.destroy({
      where: { id: req.params.annId, essayId: req.essay.id, userId: req.user.id },
    });
    if (!deleted) return res.status(404).json({ message: 'Annotation not found' });
    res.status(204).end();
  } catch (e) {
    console.error('Delete annotation error:', e);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Sanitizes the chat history BEFORE any AI quota is reserved: role whitelist
// (user/assistant only), last MAX_CHAT_MESSAGES turns, each clamped to
// MAX_CHAT_MESSAGE chars. An empty history 400s without consuming quota.
function prepareChatMessages(req, res, next) {
  const raw = Array.isArray(req.body?.messages) ? req.body.messages : [];
  const messages = raw
    .filter((m) => m && (m.role === 'user' || m.role === 'assistant')
      && typeof m.content === 'string' && m.content.trim())
    .slice(-MAX_CHAT_MESSAGES)
    .map((m) => ({ role: m.role, content: m.content.slice(0, MAX_CHAT_MESSAGE) }));
  if (!messages.length) return res.status(400).json({ message: 'A message is required' });
  req.chatMessages = messages;
  return next();
}

// POST /api/essays/:id/chat — grounded workspace chat. The reply may carry
// annotation PROPOSALS (validated by the service: in-bounds indices, anchors
// snapped to verbatim source slices); they are never persisted here — the
// client adds each one explicitly via POST /api/essays/:id/annotations.
router.post('/:id/chat', requireAIConsent, loadOwnedEssay, prepareChatMessages, essayChatQuota, async (req, res) => {
  try {
    const essay = req.essay;
    const model = ESSAY_MODELS.includes(req.body?.model) ? req.body.model : 'gpt-5.4-mini';
    const [contextDocs, annotations] = await Promise.all([
      EssayContextDoc.findAll({
        where: { essayId: essay.id, userId: req.user.id },
        order: [['createdAt', 'ASC']],
      }),
      EssayAnnotation.findAll({
        where: { essayId: essay.id, userId: req.user.id },
        order: [['paragraphIndex', 'ASC'], ['createdAt', 'ASC']],
      }),
    ]);
    const result = await assistEssay({
      essay,
      contextDocs,
      annotations,
      messages: req.chatMessages,
      model,
    });
    await recordAIInteractionSafely({
      userId: req.user.id,
      feature: 'essay_assistant',
      modelVersion: model,
      status: 'completed',
      inputSummary: `${essay.title} · ${req.chatMessages.length} message(s) · ${contextDocs.length} context doc(s)`,
      outputSummary: `${result.annotations.length} annotation proposal(s)`,
      metadata: { essayId: essay.id },
    });
    res.json({ reply: result.reply, annotations: result.annotations });
  } catch (e) {
    const error = publicAIError(e, 'The assistant could not reply. Try again shortly.');
    console.error(JSON.stringify({
      event: 'essay_chat_error',
      requestId: req.requestId || null,
      errorType: e?.name || 'Error',
      status: error.status,
    }));
    res.status(error.status).json({ message: error.message, requestId: req.requestId || null });
  }
});

// The 400 for an unparsed essay must be served BEFORE any AI quota is
// reserved — asking for explanations without a paragraph map costs nothing.
function requireParsedStructure(req, res, next) {
  if (!req.essay.parsedStructure) {
    return res.status(400).json({ message: 'Set up practice first.' });
  }
  return next();
}

// POST /api/essays/:id/explain — one AI call that summarises every body
// paragraph in plain English, persisted as kind='explanation', source='ai'
// annotations. Re-running replaces the previous explanation per paragraph.
router.post('/:id/explain', requireAIConsent, loadOwnedEssay, requireParsedStructure, essayExplainQuota, async (req, res) => {
  try {
    const essay = req.essay;
    const model = ESSAY_MODELS.includes(req.body?.model) ? req.body.model : 'gpt-5.4-mini';
    // Optional: explain a single paragraph instead of the whole essay.
    const paragraphIndex = Number.isInteger(req.body?.paragraphIndex) ? req.body.paragraphIndex : null;
    const explanations = await explainEssay({ essay, model, paragraphIndex });

    const created = [];
    for (const item of explanations) {
      await EssayAnnotation.destroy({
        where: {
          essayId: essay.id,
          userId: req.user.id,
          paragraphIndex: item.paragraphIndex,
          kind: 'explanation',
        },
      });
      created.push(await EssayAnnotation.create({
        essayId: essay.id,
        userId: req.user.id,
        paragraphIndex: item.paragraphIndex,
        anchor: '',
        note: item.note,
        kind: 'explanation',
        source: 'ai',
      }));
    }
    await recordAIInteractionSafely({
      userId: req.user.id,
      feature: 'essay_explain',
      modelVersion: model,
      status: 'completed',
      inputSummary: `${essay.title} · ${essay.parsedStructure?.bodyParagraphs?.length || 0} paragraphs`,
      outputSummary: `${created.length} paragraph explanation(s)`,
      metadata: { essayId: essay.id },
    });
    res.json({ annotations: created });
  } catch (e) {
    const error = publicAIError(e, 'The essay could not be explained. Try again shortly.');
    console.error(JSON.stringify({
      event: 'essay_explain_error',
      requestId: req.requestId || null,
      errorType: e?.name || 'Error',
      status: error.status,
    }));
    res.status(error.status).json({ message: error.message, requestId: req.requestId || null });
  }
});

module.exports = router;
