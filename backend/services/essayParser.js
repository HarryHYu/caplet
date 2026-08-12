/**
 * Segments a student's essay into its real structure for memorisation practice.
 *
 * CRITICAL CONTRACT: the student's text is NEVER altered. The server splits the
 * essay into paragraphs deterministically; the AI only LABELS that structure
 * (which paragraph is the intro/conclusion, where the thesis sentence is, which
 * spans are quotes). Every string in the stored structure is a verbatim slice
 * of the original essay: AI-returned strings are snapped back to the source via
 * whitespace/smart-quote-tolerant matching, and anything that cannot be located
 * in the source is discarded, never stored. The previous design asked the model
 * to re-type the whole essay, which silently truncated and paraphrased it.
 *
 * Incomplete essays are first-class: introIndex/conclusionIndex may be null
 * (body-paragraphs-only is fine) and thesis may be empty. If the AI output is
 * unusable, a deterministic fallback labels every paragraph as a body
 * paragraph so parsing still succeeds.
 *
 * Mirrors the lazy OpenAI client pattern used elsewhere so the server boots
 * without OPENAI_API_KEY and this endpoint degrades with a 503.
 */
const OpenAI = require('openai');

let _client = null;
function getClient() {
  if (_client) return _client;
  if (!process.env.OPENAI_API_KEY) return null;
  _client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, timeout: 45000, maxRetries: 1 });
  return _client;
}

const SYSTEM = `You label the structure of a student's essay so the student can memorise it. You are a labeller, NOT a writer.

The essay is given as numbered paragraphs [P0], [P1], ... Refer to paragraphs ONLY by their number — never re-type a whole paragraph.

Essays may be incomplete or unconventional: there may be no introduction, no conclusion, and no stated thesis (for example, body paragraphs only). Use null / "" in those cases instead of forcing one.

Return ONLY a JSON object of this exact shape:
{"introIndex": 0 or null, "conclusionIndex": 5 or null, "thesis": "the thesis sentence copied verbatim, or \\"\\"", "bodyParagraphs": [{"index": 1, "topicSentence": "the paragraph's topic sentence copied verbatim", "quotes": [{"text": "quoted evidence copied verbatim", "highLeverage": false}], "techniques": ["metaphor"]}]}

Rules:
- introIndex: the paragraph number of the introduction, or null if there is no distinct introduction.
- conclusionIndex: the paragraph number of the conclusion, or null if there is no distinct conclusion.
- thesis: the essay's central argument copied verbatim character-for-character (usually one or two sentences inside the introduction). "" if none is stated.
- bodyParagraphs: one entry per remaining paragraph, in order. topicSentence is the paragraph's topic/opening sentence copied verbatim. quotes lists every quotation the paragraph cites (text inside quotation marks or clearly quoted evidence) copied verbatim, with highLeverage true only when the quote is versatile enough to support multiple themes/questions. techniques lists literary/rhetorical techniques the paragraph explicitly names; [] if none.
- Copy thesis/topicSentence/quote text EXACTLY as written by the student — same words, same spelling, same punctuation. Never correct or improve anything.`;

// ── Pure helpers (no network/DB — exported for unit tests) ──────────────────
const str = (v) => (v == null ? '' : String(v));
const clamp = (v, n) => str(v).slice(0, n);

const SMART_CHAR_MAP = {
  '‘': "'", '’': "'", '‚': "'", '‛': "'", '′': "'",
  '“': '"', '”': '"', '„': '"', '‟': '"', '″': '"',
  '‐': '-', '‑': '-', '‒': '-', '–': '-', '—': '-', '―': '-',
  ' ': ' ',
};
const normChar = (ch) => SMART_CHAR_MAP[ch] || ch;

// PDF-extracted text is often hard-wrapped: one short line per printed line.
// When the single-newline fallback yields an implausible number of
// "paragraphs", consecutive lines are merged into blocks so the essay is not
// shredded into hundreds of tiny fragments (which the 30-paragraph cap would
// then have to truncate). A block closes once it has accumulated at least
// MIN_MERGED_BLOCK characters AND the current line ends a sentence.
const MIN_MERGED_BLOCK = 400;
const ENDS_SENTENCE = /[.!?…]['"’”)\]}»›]*$/;

function mergeWrappedLines(lines) {
  const blocks = [];
  let current = [];
  let length = 0;
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    current.push(line);
    length += line.length;
    if (length >= MIN_MERGED_BLOCK && ENDS_SENTENCE.test(line)) {
      blocks.push(current.join('\n'));
      current = [];
      length = 0;
    }
  }
  if (current.length) blocks.push(current.join('\n'));
  return blocks;
}

/**
 * Splits an essay into paragraphs deterministically. Blank lines are paragraph
 * breaks; if there are none (common for PDF text), single newlines are used —
 * and when that produces more than 30 line-"paragraphs", consecutive lines are
 * merged into sentence-terminated blocks (joined with '\n') so every character
 * of content is preserved in a plausible paragraph count.
 */
function splitParagraphs(text) {
  const t = str(text).replace(/\r\n?/g, '\n').trim();
  if (!t) return [];
  let parts = t.split(/\n\s*\n+/);
  if (parts.length < 2 && t.includes('\n')) {
    parts = t.split(/\n+/);
    if (parts.length > 30) parts = mergeWrappedLines(parts);
  }
  return parts.map((p) => p.trim()).filter(Boolean);
}

/** First sentence of a paragraph (whole paragraph when unterminated). */
function firstSentence(paragraph) {
  const t = str(paragraph).trim();
  const match = t.match(/^[\s\S]*?[.!?…](?=['")’”]?(?:\s|$))/);
  return (match ? match[0] : t).trim();
}

/** Deterministic quote extraction — exact source slices including the marks. */
function extractQuotes(paragraph) {
  const out = [];
  const re = /["“]([^"“”]{12,400})["”]|['‘]([^'‘’]{20,400})['’]/g;
  let match;
  while ((match = re.exec(str(paragraph))) !== null && out.length < 20) {
    out.push(match[0]);
  }
  return out;
}

/**
 * Locates near-verbatim needles inside `source` tolerating whitespace runs,
 * smart quotes/dashes and case differences, and returns the EXACT original
 * slice — this is what guarantees the stored structure never alters the essay.
 */
function buildMatcher(source) {
  const src = str(source);
  let norm = '';
  const origIndex = [];
  let pendingSpace = false;
  for (let i = 0; i < src.length; i += 1) {
    const mapped = normChar(src[i]);
    if (/\s/.test(mapped)) {
      pendingSpace = norm.length > 0;
      continue;
    }
    if (pendingSpace) {
      norm += ' ';
      origIndex.push(-1);
      pendingSpace = false;
    }
    const low = mapped.toLowerCase();
    norm += low;
    // toLowerCase can expand one char into several (e.g. 'İ' U+0130 -> 'i' +
    // combining dot). The index map must gain one entry per NORMALIZED
    // character, or every mapping after the expansion is misaligned and the
    // returned "verbatim" slice is shifted.
    for (let k = 0; k < low.length; k += 1) origIndex.push(i);
  }
  const normalizeNeedle = (needle) => {
    let out = '';
    let pending = false;
    for (const ch of str(needle)) {
      const mapped = normChar(ch);
      if (/\s/.test(mapped)) {
        pending = out.length > 0;
        continue;
      }
      if (pending) {
        out += ' ';
        pending = false;
      }
      out += mapped.toLowerCase();
    }
    return out;
  };
  return {
    find(needle) {
      const n = normalizeNeedle(needle);
      if (!n || n.length < 3) return null;
      const at = norm.indexOf(n);
      if (at < 0) return null;
      let s = at;
      while (s < origIndex.length && origIndex[s] === -1) s += 1;
      let e = at + n.length - 1;
      while (e >= 0 && origIndex[e] === -1) e -= 1;
      if (s > e) return null;
      return src.slice(origIndex[s], origIndex[e] + 1);
    },
  };
}

// Matches the parse route's MAX_AI_TEXT so even a single-paragraph essay of
// maximum parseable length is never truncated by the sanitizer.
const MAX_PARAGRAPH_TEXT = 24000;

// Technique names are short human labels ("metaphor", "dramatic irony"). An
// AI-supplied entry that looks like anything else (digits, URLs, punctuation,
// prompt fragments) is discarded rather than stored.
const TECHNIQUE_NAME = /^[A-Za-z][A-Za-z\s'’-]{0,49}$/;

/**
 * Bounds a paragraph list at 30 WITHOUT dropping content: everything past the
 * 30th paragraph is merged into it (joined with '\n\n'), so sanitizeStructure's
 * slice(0, 30) can never discard part of the essay.
 */
function capParagraphs(paragraphs) {
  const list = Array.isArray(paragraphs) ? paragraphs : [];
  if (list.length <= 30) return list;
  return [...list.slice(0, 29), list.slice(29).join('\n\n')];
}

/** Coerces a structure into canonical shape with bounded sizes. */
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
      .map((t) => str(t).trim())
      .filter((t) => TECHNIQUE_NAME.test(t))
      .slice(0, 20);
    return {
      topicSentence: clamp(para.topicSentence, 1000),
      text: clamp(para.text, MAX_PARAGRAPH_TEXT),
      quotes,
      techniques,
    };
  }).filter((p) => p.text.trim() || p.topicSentence.trim());

  return {
    thesis: clamp(root.thesis, 2000),
    introduction: clamp(root.introduction, MAX_PARAGRAPH_TEXT),
    bodyParagraphs,
    conclusion: clamp(root.conclusion, MAX_PARAGRAPH_TEXT),
  };
}

/**
 * Rebuilds the canonical structure from AI labels + the source paragraphs.
 * Paragraph text always comes from the source; AI strings are snapped to
 * verbatim source slices or dropped. Unlabelled paragraphs still become body
 * paragraphs, so the essay is never silently shortened.
 */
function assembleFromLabels(labels, paragraphs) {
  const root = labels && typeof labels === 'object' ? labels : {};
  const total = paragraphs.length;
  const validIndex = (v) => (Number.isInteger(v) && v >= 0 && v < total ? v : null);

  let introIndex = validIndex(root.introIndex);
  let conclusionIndex = validIndex(root.conclusionIndex);
  // Ordering sanity: an introduction can only be one of the first two
  // paragraphs and a conclusion one of the last two, and a "conclusion" at or
  // before the intro is a mislabel — treat such labels as absent rather than
  // rendering the essay's structure reversed.
  if (introIndex !== null && introIndex > 1) introIndex = null;
  if (conclusionIndex !== null && conclusionIndex < total - 2) conclusionIndex = null;
  if (introIndex !== null && conclusionIndex !== null && conclusionIndex <= introIndex) {
    conclusionIndex = null;
  }
  // A one/two-paragraph essay must keep at least one body paragraph — an AI
  // that labels everything intro+conclusion would leave nothing to practise.
  if (introIndex !== null && conclusionIndex === introIndex) conclusionIndex = null;
  const claimedCount = (introIndex !== null ? 1 : 0) + (conclusionIndex !== null ? 1 : 0);
  if (claimedCount >= total) {
    conclusionIndex = null;
    if (introIndex !== null && total <= 1) introIndex = null;
  }

  const claimed = new Set([introIndex, conclusionIndex].filter((v) => v !== null));
  const rawBody = Array.isArray(root.bodyParagraphs) ? root.bodyParagraphs : [];
  const byIndex = new Map();
  for (const entry of rawBody) {
    const para = entry && typeof entry === 'object' ? entry : {};
    const i = validIndex(para.index);
    if (i === null || claimed.has(i) || byIndex.has(i)) continue;
    byIndex.set(i, para);
  }

  const bodyParagraphs = [];
  for (let i = 0; i < total; i += 1) {
    if (claimed.has(i)) continue;
    const source = paragraphs[i];
    const matcher = buildMatcher(source);
    const ai = byIndex.get(i) || {};
    const topicSentence = (ai.topicSentence && matcher.find(ai.topicSentence)) || firstSentence(source);
    const quotes = [];
    const seen = new Set();
    for (const q of (Array.isArray(ai.quotes) ? ai.quotes : []).slice(0, 20)) {
      const obj = q && typeof q === 'object' ? q : { text: q };
      // Quotes must live inside THIS paragraph, or annotation cannot place them.
      const snapped = matcher.find(obj.text);
      if (!snapped || seen.has(snapped)) continue;
      seen.add(snapped);
      quotes.push({ text: snapped, highLeverage: obj.highLeverage === true });
    }
    if (!quotes.length) {
      for (const q of extractQuotes(source)) {
        if (seen.has(q)) continue;
        seen.add(q);
        quotes.push({ text: q, highLeverage: false });
      }
    }
    bodyParagraphs.push({
      topicSentence,
      text: source,
      quotes,
      techniques: Array.isArray(ai.techniques) ? ai.techniques : [],
    });
  }

  const introduction = introIndex !== null ? paragraphs[introIndex] : '';
  const conclusion = conclusionIndex !== null ? paragraphs[conclusionIndex] : '';
  // The thesis is snapped against ONE paragraph at a time — never against a
  // paragraphs.join() blob, whose synthetic separator could end up embedded in
  // a "verbatim" thesis. A thesis that spans paragraphs stays ''.
  let thesis = '';
  if (root.thesis) {
    const scope = introduction ? buildMatcher(introduction) : null;
    thesis = (scope && scope.find(root.thesis)) || '';
    if (!thesis) {
      for (const paragraph of paragraphs) {
        const found = buildMatcher(paragraph).find(root.thesis);
        if (found) {
          thesis = found;
          break;
        }
      }
    }
  }

  return sanitizeStructure({ thesis, introduction, bodyParagraphs, conclusion });
}

/** No-AI structure: every paragraph is a body paragraph, quotes via regex. */
function fallbackStructure(paragraphs) {
  return sanitizeStructure({
    thesis: '',
    introduction: '',
    bodyParagraphs: capParagraphs(paragraphs).map((p) => ({
      topicSentence: firstSentence(p),
      text: p,
      quotes: extractQuotes(p).map((text) => ({ text, highLeverage: false })),
      techniques: [],
    })),
    conclusion: '',
  });
}

/**
 * @param {string} essayText  the student's verbatim essay
 * @param {object} opts { model, client, onDegrade } — client is injectable for
 *   tests; onDegrade (optional function) is invoked whenever the deterministic
 *   fallback path is taken instead of AI labels.
 * @returns {Promise<{thesis:string, introduction:string, bodyParagraphs:Array, conclusion:string}>}
 */
async function parseEssay(essayText, opts = {}) {
  const client = opts.client || getClient();
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
  // Cap BEFORE labelling so nothing the AI (or the fallback) sees can later be
  // discarded by sanitizeStructure's 30-paragraph bound.
  const paragraphs = capParagraphs(splitParagraphs(text));
  if (!paragraphs.length) {
    const err = new Error('The essay has no text to parse.');
    err.status = 400;
    throw err;
  }

  const chosenModel = opts.model || 'gpt-5.4-mini';
  const isReasoning = chosenModel.startsWith('o') || chosenModel === 'gpt-5';
  const numbered = paragraphs.map((p, i) => `[P${i}]\n${p}`).join('\n\n');

  try {
    const completion = await client.chat.completions.create({
      model: chosenModel,
      response_format: { type: 'json_object' },
      // Labels are small (indices + copied sentences), so a modest cap is
      // plenty and guards against runaway output. The old design re-emitted
      // the entire essay and could silently exceed the completion ceiling.
      max_completion_tokens: 8000,
      ...(isReasoning ? {} : { temperature: 0 }),
      messages: [
        { role: 'system', content: SYSTEM },
        { role: 'user', content: `Label the structure of this essay.\n\n${numbered}\n\nReturn ONLY the JSON object described.` },
      ],
    });
    const choice = completion.choices?.[0];
    if (choice?.finish_reason === 'length') throw new Error('AI output truncated');
    const labels = JSON.parse(choice?.message?.content || '{}');
    const structure = assembleFromLabels(labels, paragraphs);
    if (!structure.bodyParagraphs.length) throw new Error('AI labels produced no body paragraphs');
    return structure;
  } catch (error) {
    // The essay is still fully practisable without AI labels — degrade to the
    // deterministic structure instead of failing the student's setup.
    console.error(JSON.stringify({
      event: 'essay_parse_ai_fallback',
      errorType: error?.name || 'Error',
      status: error?.status || null,
    }));
    if (typeof opts.onDegrade === 'function') {
      try { opts.onDegrade(error); } catch { /* observers must never break parsing */ }
    }
    return fallbackStructure(paragraphs);
  }
}

module.exports = {
  parseEssay,
  sanitizeStructure,
  splitParagraphs,
  capParagraphs,
  firstSentence,
  extractQuotes,
  buildMatcher,
  assembleFromLabels,
  fallbackStructure,
};
