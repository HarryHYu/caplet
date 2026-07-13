/**
 * Segments a student's essay into its real structure for memorisation practice.
 *
 * CRITICAL CONTRACT: the model SEGMENTS and ANNOTATES only. It must never
 * rewrite, improve, paraphrase, or replace the student's words — every quote
 * and sentence is copied verbatim from the source. This service exists to help
 * a student memorise *their own* essay, not to generate a new one.
 *
 * Mirrors the lazy OpenAI client pattern used elsewhere so the server boots
 * without OPENAI_API_KEY and this endpoint degrades with a 503.
 */
const OpenAI = require('openai');

let _client = null;
function getClient() {
  if (_client) return _client;
  if (!process.env.OPENAI_API_KEY) return null;
  _client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, timeout: 30000, maxRetries: 1 });
  return _client;
}

const SYSTEM = `You segment a student's essay into its structure so the student can memorise it. You are a parser, NOT a writer.

ABSOLUTE RULES:
- NEVER rewrite, improve, paraphrase, correct, or replace any of the student's words. Copy text VERBATIM.
- Only segment the essay and annotate it. If something is unclear, leave it as-is.

Identify:
- thesis: the essay's central argument, copied verbatim (usually one sentence from the introduction).
- bodyParagraphs: each body paragraph in order. For each:
  - topicSentence: the paragraph's opening/topic sentence, verbatim.
  - text: the full paragraph, verbatim.
  - quotes: every quotation the paragraph cites (text inside quotation marks or clearly quoted evidence), each copied verbatim. For each quote set highLeverage = true if it is versatile enough to support multiple themes/questions, otherwise false. If the paragraph has no quotes, use an empty array.
  - techniques: literary/rhetorical techniques the paragraph explicitly names (e.g. "metaphor", "juxtaposition"). Empty array if none are named.
- conclusion: the concluding paragraph, verbatim. Empty string if there is no distinct conclusion.

Return ONLY a JSON object of this exact shape:
{"thesis":"...","bodyParagraphs":[{"topicSentence":"...","text":"...","quotes":[{"text":"...","highLeverage":false}],"techniques":["..."]}],"conclusion":"..."}`;

// ── Pure sanitizer ──────────────────────────────────────────────────────────
// Coerces whatever the model returned into the canonical structure with bounded
// sizes. No network/DB — exported so it can be unit-tested independently.
const str = (v) => (v == null ? '' : String(v));
const clamp = (v, n) => str(v).slice(0, n);

function sanitizeStructure(parsed) {
  const root = parsed && typeof parsed === 'object' ? parsed : {};
  const rawParas = Array.isArray(root.bodyParagraphs) ? root.bodyParagraphs : [];

  const bodyParagraphs = rawParas.slice(0, 30).map((p) => {
    const para = p && typeof p === 'object' ? p : {};
    const quotes = (Array.isArray(para.quotes) ? para.quotes : [])
      .slice(0, 20)
      .map((q) => {
        const obj = q && typeof q === 'object' ? q : { text: q };
        return { text: clamp(obj.text, 1000), highLeverage: obj.highLeverage === true };
      })
      .filter((q) => q.text.trim());
    const techniques = (Array.isArray(para.techniques) ? para.techniques : [])
      .slice(0, 20)
      .map((t) => clamp(t, 80))
      .filter((t) => t.trim());
    return {
      topicSentence: clamp(para.topicSentence, 1000),
      text: clamp(para.text, 6000),
      quotes,
      techniques,
    };
  }).filter((p) => p.text.trim() || p.topicSentence.trim());

  return {
    thesis: clamp(root.thesis, 2000),
    bodyParagraphs,
    conclusion: clamp(root.conclusion, 6000),
  };
}

/**
 * @param {string} essayText  the student's verbatim essay
 * @param {object} opts { model }
 * @returns {Promise<{thesis:string, bodyParagraphs:Array, conclusion:string}>}
 */
async function parseEssay(essayText, opts = {}) {
  const client = getClient();
  if (!client) {
    const err = new Error('AI is not configured on the server.');
    err.status = 503;
    throw err;
  }

  const text = str(essayText).trim();
  if (!text) {
    const err = new Error('The essay has no text to parse.');
    err.status = 400;
    throw err;
  }

  const chosenModel = opts.model || 'gpt-5.4-mini';
  const isReasoning = chosenModel.startsWith('o') || chosenModel === 'gpt-5';

  const completion = await client.chat.completions.create({
    model: chosenModel,
    response_format: { type: 'json_object' },
    ...(isReasoning ? {} : { temperature: 0.1 }),
    messages: [
      { role: 'system', content: SYSTEM },
      { role: 'user', content: `Segment and annotate this essay. Copy all text verbatim.\n\n${text}\n\nReturn ONLY the JSON object described.` },
    ],
  });

  const raw = completion.choices?.[0]?.message?.content || '{}';
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    const err = new Error('AI returned non-JSON output.');
    err.status = 502;
    throw err;
  }

  const structure = sanitizeStructure(parsed);
  if (!structure.thesis && structure.bodyParagraphs.length === 0) {
    const err = new Error('AI did not return a usable essay structure. Try again.');
    err.status = 502;
    throw err;
  }
  return structure;
}

module.exports = { parseEssay, sanitizeStructure };
