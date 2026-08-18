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
const { requireUuidParam } = require('../middleware/validateUuid');
const { sequelize } = require('../config/database');
const {
  parseEssay, fallbackStructure, segmentEssay, firstSentence, extractQuotes,
} = require('../services/essayParser');
const { assistEssay, explainEssay, rewriteSelection } = require('../services/essayAssistant');
const { requireAIConsent } = require('../services/privacyConsent');
const { recordAIInteractionSafely } = require('../services/aiHistory');
const { reserveAIQuota } = require('../middleware/aiQuota');
const { publicAIError } = require('../utils/aiErrors');

const router = express.Router();
router.use(requireAuth);
// A malformed id would otherwise reach a UUID column and raise a Postgres
// 500; 404 is both correct and leaks nothing. Covers every :id route below.
router.param('id', requireUuidParam('id', 'Essay not found'));

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
const MAX_REWRITE_SELECTION = 1200; // chars in a select-and-fix span
const MAX_REWRITE_INSTRUCTION = 1000; // chars in the student's complaint
const MAX_REWRITE_REPLACEMENT = 5000; // chars in an applied replacement
const essayChatQuota = reserveAIQuota({ scope: 'essay-chat', units: 4 });
const essayExplainQuota = reserveAIQuota({ scope: 'essay-structure', units: 6 });
const essayRewriteQuota = reserveAIQuota({ scope: 'essay-chat', units: 4 });

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
//   POST   /api/essays/:id/rewrite              -> AI drop-in fix PROPOSAL
//   POST   /api/essays/:id/rewrite/apply        -> apply an accepted fix
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

    // Replace-in-place must be atomic. Outside a transaction two concurrent
    // explain calls interleave their destroy/create pairs and the essay is
    // left with duplicate kind:'explanation' rows for the same paragraph.
    const created = await sequelize.transaction(async (transaction) => {
      const rows = [];
      for (const item of explanations) {
        await EssayAnnotation.destroy({
          where: {
            essayId: essay.id,
            userId: req.user.id,
            paragraphIndex: item.paragraphIndex,
            kind: 'explanation',
          },
          transaction,
        });
        rows.push(await EssayAnnotation.create({
          essayId: essay.id,
          userId: req.user.id,
          paragraphIndex: item.paragraphIndex,
          anchor: '',
          note: item.note,
          kind: 'explanation',
          source: 'ai',
        }, { transaction }));
      }
      return rows;
    });
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

// ── Select-and-fix ───────────────────────────────────────────────────────────
// Two-step, mirroring the propose/accept split everywhere else in the
// workspace: /rewrite is the AI call and persists NOTHING; /rewrite/apply is
// the explicit Accept and involves NO AI — it splices the replacement into the
// text and patches the parsed structure in place, so a one-word fix never
// costs a full re-map.

const REWRITE_STALE_MESSAGE = 'The essay changed and that selection no longer matches. Reselect and try again.';

// Finds the selected span in the stored text, preferring the paragraph the
// student selected in (the same words can occur elsewhere in the essay).
// Returns { abs, pIdx, posInPara } or null when the span cannot be found.
function locateAnchor(essay, anchor, paragraphIndex) {
  const text = String(essay.originalText || '');
  const paragraphs = Array.isArray(essay.parsedStructure?.bodyParagraphs)
    ? essay.parsedStructure.bodyParagraphs
    : [];
  if (Number.isInteger(paragraphIndex) && paragraphIndex >= 0 && paragraphIndex < paragraphs.length) {
    const paraText = String(paragraphs[paragraphIndex]?.text || '');
    const posInPara = paraText.indexOf(anchor);
    if (posInPara !== -1) {
      const paraStart = text.indexOf(paraText);
      if (paraStart !== -1) return { abs: paraStart + posInPara, pIdx: paragraphIndex, posInPara };
    }
  }
  const abs = text.indexOf(anchor);
  return abs === -1 ? null : { abs, pIdx: null, posInPara: -1 };
}

// Patches the parsed structure after an applied rewrite. Returns the patched
// structure, or null (= the client rescans) when the edit cannot be
// attributed to a single mapped region.
function patchStructureAfterRewrite(structure, located, anchor, replacement) {
  if (!structure) return null;

  if (located.pIdx === null || located.posInPara < 0) {
    // Not inside a mapped body paragraph. Patch the introduction/conclusion
    // only when the attribution is unambiguous: exactly one of them holds the
    // span and no body paragraph does.
    const paragraphs = Array.isArray(structure.bodyParagraphs) ? structure.bodyParagraphs : [];
    if (paragraphs.some((p) => String(p?.text || '').includes(anchor))) return null;
    const intro = String(structure.introduction || '');
    const conclusion = String(structure.conclusion || '');
    const inIntro = intro.includes(anchor);
    const inConclusion = conclusion.includes(anchor);
    if (inIntro === inConclusion) return null; // in both or in neither
    const next = { ...structure };
    if (inIntro) {
      next.introduction = intro.replace(anchor, replacement);
      const thesis = String(structure.thesis || '');
      if (thesis.includes(anchor)) next.thesis = thesis.replace(anchor, replacement);
    } else {
      next.conclusion = conclusion.replace(anchor, replacement);
    }
    return next;
  }

  const paragraphs = structure.bodyParagraphs.map((p) => ({ ...p }));
  const para = paragraphs[located.pIdx];
  const oldText = String(para.text || '');
  const newParaText = oldText.slice(0, located.posInPara)
    + replacement
    + oldText.slice(located.posInPara + anchor.length);
  para.text = newParaText;

  // The topic sentence is a verbatim slice of the paragraph opening — if the
  // edit touched that region, re-derive it from the new text.
  const topic = String(para.topicSentence || '');
  if (topic && located.posInPara < topic.length) para.topicSentence = firstSentence(newParaText);

  // Quotes: keep the ones still present verbatim (anchored AI additions
  // included) and pick up any newly mark-paired quotes the fix introduced.
  const kept = (Array.isArray(para.quotes) ? para.quotes : [])
    .filter((q) => q?.text && newParaText.includes(q.text));
  const have = new Set(kept.map((q) => q.text));
  for (const content of extractQuotes(newParaText)) {
    if (!have.has(content)) {
      kept.push({ text: content, highLeverage: false });
      have.add(content);
    }
  }
  para.quotes = kept.slice(0, 20);

  return { ...structure, bodyParagraphs: paragraphs };
}

// Validates the rewrite request BEFORE any AI quota is reserved — a stale
// selection or an empty complaint costs nothing.
function prepareRewrite(req, res, next) {
  const anchor = String(req.body?.anchor ?? '');
  const instruction = String(req.body?.instruction ?? '').trim();
  if (!anchor.trim()) return res.status(400).json({ message: 'Select some essay text first.' });
  if (anchor.length > MAX_REWRITE_SELECTION) {
    return res.status(400).json({ message: 'Select a shorter span (a sentence or two at most).' });
  }
  if (!instruction) return res.status(400).json({ message: 'Say what you want changed about the selection.' });
  const paragraphIndex = Number.isInteger(req.body?.paragraphIndex) ? req.body.paragraphIndex : null;
  const located = locateAnchor(req.essay, anchor, paragraphIndex);
  if (!located) return res.status(409).json({ message: REWRITE_STALE_MESSAGE });
  req.rewrite = {
    anchor,
    instruction: instruction.slice(0, MAX_REWRITE_INSTRUCTION),
    paragraphIndex: located.pIdx,
  };
  return next();
}

// POST /api/essays/:id/rewrite — draft a drop-in fix for a selected span.
// The model reads the same everything-view as the chat (full essay + context
// library + annotations). Persists NOTHING — the proposal round-trips to the
// client for an explicit Accept.
router.post('/:id/rewrite', requireAIConsent, loadOwnedEssay, prepareRewrite, essayRewriteQuota, async (req, res) => {
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
    const result = await rewriteSelection({
      essay,
      contextDocs,
      annotations,
      anchor: req.rewrite.anchor,
      paragraphIndex: req.rewrite.paragraphIndex,
      instruction: req.rewrite.instruction,
      model,
    });
    await recordAIInteractionSafely({
      userId: req.user.id,
      feature: 'essay_rewrite',
      modelVersion: model,
      status: 'completed',
      inputSummary: `${essay.title} · ${req.rewrite.anchor.length}-char selection`,
      outputSummary: `${result.replacement.length}-char replacement proposed`,
      metadata: { essayId: essay.id },
    });
    res.json({
      anchor: req.rewrite.anchor,
      paragraphIndex: req.rewrite.paragraphIndex,
      replacement: result.replacement,
      rationale: result.rationale,
    });
  } catch (e) {
    const error = publicAIError(e, 'The fix could not be drafted. Try again shortly.');
    console.error(JSON.stringify({
      event: 'essay_rewrite_error',
      requestId: req.requestId || null,
      errorType: e?.name || 'Error',
      status: error.status,
    }));
    res.status(error.status).json({ message: error.message, requestId: req.requestId || null });
  }
});

// POST /api/essays/:id/rewrite/apply — the explicit Accept. No AI: splice the
// replacement into originalText at the located selection and patch the parsed
// structure in place. When the patch cannot be attributed (structure drifted),
// parsedStructure is cleared and the client rescans.
router.post('/:id/rewrite/apply', loadOwnedEssay, async (req, res) => {
  try {
    const essay = req.essay;
    const anchor = String(req.body?.anchor ?? '');
    // Mirror the proposal-side flattening so a hand-edited replacement can
    // never split a paragraph in two.
    const replacement = String(req.body?.replacement ?? '').replace(/\s*\n+\s*/g, ' ').trim();
    if (!anchor.trim()) return res.status(400).json({ message: 'Select some essay text first.' });
    if (anchor.length > MAX_REWRITE_SELECTION) {
      return res.status(400).json({ message: 'Select a shorter span (a sentence or two at most).' });
    }
    if (!replacement) return res.status(400).json({ message: 'A replacement is required.' });
    if (replacement.length > MAX_REWRITE_REPLACEMENT) {
      return res.status(400).json({ message: 'That replacement is too long.' });
    }

    const paragraphIndex = Number.isInteger(req.body?.paragraphIndex) ? req.body.paragraphIndex : null;
    const located = locateAnchor(essay, anchor, paragraphIndex);
    if (!located) return res.status(409).json({ message: REWRITE_STALE_MESSAGE });

    const text = String(essay.originalText || '');
    const newText = text.slice(0, located.abs) + replacement + text.slice(located.abs + anchor.length);
    if (newText.length > MAX_TEXT) return res.status(400).json({ message: 'Essay is too long.' });

    const structure = patchStructureAfterRewrite(essay.parsedStructure, located, anchor, replacement);
    await essay.update({ originalText: newText, parsedStructure: structure });
    res.json({ essay });
  } catch (e) {
    console.error('Apply rewrite error:', e);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;
