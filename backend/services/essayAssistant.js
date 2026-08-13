/**
 * Grounded AI assistance inside a student's essay workspace.
 *
 * Two entry points, both single-call and JSON-contracted:
 *
 *   assistEssay()  — the workspace chat. The model sees the essay verbatim,
 *     the parsed paragraph map, the student's existing annotations, and the
 *     student's own CONTEXT LIBRARY, and must ground its answers in those
 *     sources first. It may PROPOSE annotations (only when the student asked
 *     for analysis/annotations); proposals are validated server-side —
 *     paragraph indices bounds-checked and anchors snapped to VERBATIM source
 *     slices via essayParser's buildMatcher (or blanked to '' when they cannot
 *     be located) — and are never persisted here: the client adds each one
 *     explicitly via POST /api/essays/:id/annotations.
 *
 *   explainEssay() — one AI call that summarises every body paragraph in
 *     plain English; the route persists the results as kind='explanation'
 *     annotations.
 *
 * Mirrors the lazy OpenAI client pattern used elsewhere (essayParser) so the
 * server boots without OPENAI_API_KEY and these endpoints degrade with a 503.
 */
const OpenAI = require('openai');
const { buildMatcher } = require('./essayParser');
const { samplingParams } = require('../utils/modelParams');

let _client = null;
function getClient() {
  if (_client) return _client;
  if (!process.env.OPENAI_API_KEY) return null;
  _client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, timeout: 45000, maxRetries: 1 });
  return _client;
}

const str = (v) => (v == null ? '' : String(v));
const clamp = (v, n) => str(v).slice(0, n);

// Matches routes/essays.js MAX_AI_TEXT: any essay the parse route sends to AI
// also fits the chat's verbatim grounding block untruncated.
const MAX_ESSAY_CHARS = 24000;
// Whole-library character budget for the CONTEXT LIBRARY prompt block.
const CONTEXT_BUDGET = 60000;
const MAX_NOTE = 2000;
const MAX_ANCHOR = 300;
const MAX_PROPOSALS = 8;
const MAX_EXPLAIN_PARAGRAPH = 8000;


function requireClient(opts) {
  const client = opts.client || getClient();
  if (!client) {
    const err = new Error('AI is not configured on the server.');
    err.status = 503;
    throw err;
  }
  return client;
}

const bodyParagraphsOf = (essay) => (Array.isArray(essay?.parsedStructure?.bodyParagraphs)
  ? essay.parsedStructure.bodyParagraphs
  : []);

/**
 * Fits the context library into `budget` total characters. Docs that fit stay
 * whole; when the library is over budget the LONGEST docs are truncated down
 * to a shared per-doc cap (water-fill) so every document keeps proportional
 * representation and short docs are never cut to make room for long ones.
 * Exported for unit tests.
 */
function fitContextDocs(docs, budget = CONTEXT_BUDGET) {
  const list = (Array.isArray(docs) ? docs : [])
    .map((doc) => ({ title: str(doc?.title).trim() || 'Untitled document', content: str(doc?.content) }))
    .filter((doc) => doc.content);
  const total = list.reduce((sum, doc) => sum + doc.content.length, 0);
  if (total <= budget) return list.map((doc) => ({ ...doc, truncated: false }));

  // Water-fill: walk lengths ascending, granting each doc an equal share of
  // what remains; once a doc exceeds its share, that share is the cap for
  // every doc at least as long.
  const lengths = list.map((doc) => doc.content.length).sort((a, b) => a - b);
  let remaining = budget;
  let cap = 0;
  for (let i = 0; i < lengths.length; i += 1) {
    const share = Math.floor(remaining / (lengths.length - i));
    if (lengths[i] <= share) {
      remaining -= lengths[i];
      continue;
    }
    cap = share;
    break;
  }
  return list.map((doc) => (doc.content.length <= cap
    ? { ...doc, truncated: false }
    : { title: doc.title, content: doc.content.slice(0, cap), truncated: true }));
}

const ASSIST_RULES = `You are a study partner inside a student's essay workspace. You help the student understand, interrogate, and strengthen their essay.

Ground rules:
- Ground your answers PRIMARILY in the student's CONTEXT LIBRARY and the essay below.
- When the context library and the essay do not cover something, say so explicitly before answering from general knowledge.
- Fact-check as you go: if something in the context library or the essay looks factually wrong, flag it politely.
- NEVER rewrite the student's essay text. Quote it or refer to it — do not produce replacement prose.
- Keep answers concise and specific.

Return ONLY a JSON object of this exact shape:
{"reply": "your answer to the student (markdown allowed)", "annotations": [{"paragraphIndex": 0, "anchor": "a snippet copied verbatim from that paragraph, or \\"\\"", "note": "the annotation text"}]}

- annotations: propose annotations ONLY when the student asked for analysis or annotations to be added to their essay; otherwise return [].
- paragraphIndex is 0-based into the body paragraph list (¶1 is paragraphIndex 0).
- anchor must be copied character-for-character from that paragraph, or "" to annotate the whole paragraph.`;

function buildAssistSystemPrompt({ essay, contextDocs, annotations }) {
  const title = str(essay?.title).trim() || 'Untitled essay';
  const essayText = clamp(str(essay?.originalText), MAX_ESSAY_CHARS);
  const bodyParagraphs = bodyParagraphsOf(essay);

  const paragraphLines = bodyParagraphs.length
    ? bodyParagraphs
      .map((p, i) => `¶${i + 1}: ${clamp(str(p?.topicSentence).trim() || str(p?.text).trim(), 300)}`)
      .join('\n')
    : '(the essay has not been parsed into paragraphs yet)';

  const annotationList = Array.isArray(annotations) ? annotations : [];
  const annotationLines = annotationList.length
    ? annotationList
      .map((a) => `¶${Number(a?.paragraphIndex) + 1} [${str(a?.kind) || 'note'}/${str(a?.source) || 'user'}]: ${clamp(str(a?.note).replace(/\s+/g, ' ').trim(), 300)}`)
      .join('\n')
    : '(none yet)';

  const docs = fitContextDocs(contextDocs);
  const contextBlock = docs.length
    ? docs
      .map((doc) => `--- ${doc.title}${doc.truncated ? ' [truncated]' : ''} ---\n${doc.content}`)
      .join('\n\n')
    : '(the student has not added any context documents yet)';

  return `${ASSIST_RULES}

ESSAY TITLE: ${title}

ORIGINAL ESSAY (verbatim):
${essayText}

BODY PARAGRAPHS (topic sentences only, for reference):
${paragraphLines}

EXISTING ANNOTATIONS:
${annotationLines}

CONTEXT LIBRARY:
${contextBlock}`;
}

/**
 * Bounds-checks and source-snaps AI annotation proposals. paragraphIndex must
 * land inside the parsed body paragraphs (dropped otherwise); a non-empty
 * anchor is snapped to the EXACT source slice of that paragraph via
 * buildMatcher (case/whitespace/smart-quote tolerant) or blanked to '' so a
 * hallucinated anchor degrades to a paragraph-level note; notes are clamped.
 * At most MAX_PROPOSALS survive. Exported for unit tests.
 */
function validateProposals(raw, bodyParagraphs) {
  const paragraphs = (Array.isArray(bodyParagraphs) ? bodyParagraphs : []).map((p) => str(p?.text));
  const matchers = new Map();
  const proposals = [];
  for (const entry of Array.isArray(raw) ? raw : []) {
    if (proposals.length >= MAX_PROPOSALS) break;
    const item = entry && typeof entry === 'object' ? entry : {};
    const index = item.paragraphIndex;
    if (!Number.isInteger(index) || index < 0 || index >= paragraphs.length) continue;
    const note = clamp(str(item.note).trim(), MAX_NOTE);
    if (!note) continue;
    let anchor = '';
    const wanted = str(item.anchor).trim();
    if (wanted) {
      if (!matchers.has(index)) matchers.set(index, buildMatcher(paragraphs[index]));
      anchor = matchers.get(index).find(wanted) || '';
    }
    proposals.push({ paragraphIndex: index, anchor: clamp(anchor, MAX_ANCHOR), note });
  }
  return proposals;
}

/**
 * Workspace chat: one grounded completion over the essay + context library.
 *
 * @param {object} opts { essay, contextDocs, annotations, messages, model,
 *   client } — client is injectable for tests; messages is the sanitized
 *   user/assistant history (newest last).
 * @returns {Promise<{reply: string, annotations: Array}>} annotations are
 *   validated PROPOSALS only — nothing is persisted here.
 */
async function assistEssay(opts = {}) {
  const client = requireClient(opts);

  const messages = Array.isArray(opts.messages) ? opts.messages : [];
  if (!messages.length) {
    const err = new Error('A message is required.');
    err.status = 400;
    throw err;
  }

  const essay = opts.essay || {};
  const model = opts.model || 'gpt-5.4-mini';
  const system = buildAssistSystemPrompt({
    essay,
    contextDocs: opts.contextDocs,
    annotations: opts.annotations,
  });

  const completion = await client.chat.completions.create({
    model,
    response_format: { type: 'json_object' },
    max_completion_tokens: 2500,
    ...samplingParams(model, 0.4),
    messages: [
      { role: 'system', content: system },
      ...messages,
    ],
  });
  const choice = completion.choices?.[0];
  if (choice?.finish_reason === 'length') throw new Error('AI output truncated');
  let parsed;
  try {
    parsed = JSON.parse(choice?.message?.content || '');
  } catch {
    throw new Error('AI returned unparseable output');
  }
  const reply = str(parsed?.reply).trim();
  if (!reply) throw new Error('AI returned an empty reply');
  return { reply, annotations: validateProposals(parsed?.annotations, bodyParagraphsOf(essay)) };
}

const EXPLAIN_SYSTEM = `You explain the structure of a student's essay back to them in plain English. You are an explainer, NOT a writer or an editor.

The essay's body paragraphs are given as [P0], [P1], ... Refer to paragraphs ONLY by their number.

For EVERY paragraph, write a 2-3 sentence plain-English summary of what the paragraph argues and how it argues it (its evidence, quotes, techniques, or reasoning). Address the student directly ("This paragraph argues...").

Return ONLY a JSON object of this exact shape:
{"explanations": [{"paragraphIndex": 0, "note": "2-3 sentence plain-English summary of what the paragraph argues and how"}]}

Never rewrite, correct, or improve the essay — only explain it.`;

/**
 * One AI call that summarises every body paragraph in plain English.
 *
 * @param {object} opts { essay, model, client } — client injectable for tests.
 * @returns {Promise<Array<{paragraphIndex: number, note: string}>>} validated
 *   items only: in-bounds unique indices, notes clamped. The route persists
 *   them as kind='explanation' annotations.
 */
async function explainEssay(opts = {}) {
  const client = requireClient(opts);

  const bodyParagraphs = bodyParagraphsOf(opts.essay);
  if (!bodyParagraphs.length) {
    const err = new Error('Set up practice first.');
    err.status = 400;
    throw err;
  }

  const model = opts.model || 'gpt-5.4-mini';
  // An optional single-paragraph target: the paragraph keeps its REAL index in
  // the prompt so the returned explanation lands on the right annotation.
  const only = Number.isInteger(opts.paragraphIndex)
    && opts.paragraphIndex >= 0
    && opts.paragraphIndex < bodyParagraphs.length
    ? opts.paragraphIndex
    : null;
  const numbered = bodyParagraphs
    .map((p, i) => ({ i, text: clamp(str(p?.text), MAX_EXPLAIN_PARAGRAPH) }))
    .filter(({ i }) => only === null || i === only)
    .map(({ i, text }) => `[P${i}]\n${text}`)
    .join('\n\n');

  const completion = await client.chat.completions.create({
    model,
    response_format: { type: 'json_object' },
    max_completion_tokens: 4000,
    ...samplingParams(model, 0.4),
    messages: [
      { role: 'system', content: EXPLAIN_SYSTEM },
      { role: 'user', content: `Explain each body paragraph of this essay.\n\n${numbered}\n\nReturn ONLY the JSON object described.` },
    ],
  });
  const choice = completion.choices?.[0];
  if (choice?.finish_reason === 'length') throw new Error('AI output truncated');
  let parsed;
  try {
    parsed = JSON.parse(choice?.message?.content || '');
  } catch {
    throw new Error('AI returned unparseable output');
  }

  const explanations = [];
  const seen = new Set();
  for (const entry of Array.isArray(parsed?.explanations) ? parsed.explanations : []) {
    const item = entry && typeof entry === 'object' ? entry : {};
    const index = item.paragraphIndex;
    if (!Number.isInteger(index) || index < 0 || index >= bodyParagraphs.length || seen.has(index)) continue;
    const note = clamp(str(item.note).trim(), MAX_NOTE);
    if (!note) continue;
    seen.add(index);
    explanations.push({ paragraphIndex: index, note });
  }
  if (!explanations.length) throw new Error('AI returned no usable explanations');
  return explanations;
}

module.exports = {
  assistEssay,
  explainEssay,
  buildAssistSystemPrompt,
  fitContextDocs,
  validateProposals,
};
