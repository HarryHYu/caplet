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
{"introIndex": 0 or null, "conclusionIndex": 5 or null, "thesis": "the thesis sentence copied verbatim, or \\"\\"", "bodyParagraphs": [{"index": 1, "topicSentence": "the paragraph's topic sentence copied verbatim", "quotes": [{"text": "quoted evidence copied verbatim", "highLeverage": false}], "techniques": ["metaphor"], "annotationLines": []}]}

Rules:
- annotationLines: student documents often contain planning scaffold that is NOT exam prose — section labels ("Body 2", "BP1"), plan notes ("Intro (fixed · two slots)"), reminders. If a paragraph still contains such a FULL LINE, copy that whole line verbatim into annotationLines. Never list lines of actual essay prose. [] when the paragraph is pure prose.
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

// ── Annotation lines vs exam prose ──────────────────────────────────────────
// Essay documents often carry planning scaffold the student would never write
// in the exam: section labels ("Body 1", "BP2", "Cry"), plan notes ("Intro
// (fixed · two slots)"), standalone placeholders. Those lines are segmented
// out of the practice prose and kept as annotations — still verbatim, still
// visible, just not part of what gets memorised. Inline placeholders like
// "[MANDATED POEM]" mid-sentence are part of the writing skeleton and stay.

const ANNOTATION_KEYWORDS = /^(intro(duction)?\b|body\s*(paragraph)?\s*\d*\b|bp\s*\d+\b|para(graph)?\s*\d+\b|conclusion\b|thesis\b|notes?\b|plan\b|outline\b|topic\s+sentence\b|quote\s*bank\b|context\b|section\b|part\s+\d+\b)/i;

function isAnnotationLine(line) {
  const t = str(line).trim();
  if (!t || t.length > 120) return false;
  // A placeholder alone on its own line is a note; inline ones stay in prose.
  if (/^\[[^\]]{0,100}\]$/.test(t)) return true;
  // Lines that end like sentences, or look like quoted verse, are prose.
  if (ENDS_SENTENCE.test(t)) return false;
  if (/^["'“‘]/.test(t) || /["'”’]$/.test(t)) return false;
  const words = t.split(/\s+/).length;
  if (ANNOTATION_KEYWORDS.test(t) && words <= 12) return true;
  return words <= 6 && /^[A-Z0-9([]/.test(t);
}

/**
 * Splits an essay into practice segments: `{ heading, notes, text }` where
 * `text` is exam prose only and heading/notes are the verbatim annotation
 * lines that accompanied it. An annotation line inside a block also splits the
 * block — a mid-block section label starts a new paragraph.
 */
function segmentEssay(text) {
  const segments = [];
  let pendingAnnotations = [];
  for (const block of splitParagraphs(text)) {
    const lines = block.split('\n');
    let proseLines = [];
    const flush = () => {
      if (!proseLines.length) return;
      segments.push({
        heading: pendingAnnotations[0] || '',
        notes: pendingAnnotations.slice(1),
        text: proseLines.join('\n').trim(),
      });
      pendingAnnotations = [];
      proseLines = [];
    };
    for (const line of lines) {
      if (isAnnotationLine(line)) {
        flush();
        pendingAnnotations.push(line.trim());
      } else {
        proseLines.push(line);
      }
    }
    flush();
  }
  // Trailing annotations with no prose after them attach to the last segment.
  if (pendingAnnotations.length && segments.length) {
    segments[segments.length - 1].notes.push(...pendingAnnotations);
  } else if (pendingAnnotations.length) {
    // An "essay" that is annotations only — keep it practisable as prose.
    segments.push({ heading: '', notes: [], text: pendingAnnotations.join('\n') });
  }
  return segments;
}

const toSegment = (p) => (typeof p === 'string' ? { heading: '', notes: [], text: p } : {
  heading: str(p?.heading), notes: Array.isArray(p?.notes) ? p.notes : [], text: str(p?.text),
});

/**
 * Bounds a segment list at 30 WITHOUT dropping content: everything past the
 * 30th segment merges into it, annotations included.
 */
function capSegments(segments) {
  const list = (Array.isArray(segments) ? segments : []).map(toSegment);
  if (list.length <= 30) return list;
  const head = list.slice(0, 29);
  const tail = list.slice(29);
  head.push({
    heading: tail[0].heading,
    notes: tail.flatMap((s, i) => (i === 0 ? s.notes : [s.heading, ...s.notes])).filter(Boolean),
    text: tail.map((s) => s.text).filter(Boolean).join('\n\n'),
  });
  return head;
}

/** First sentence of a paragraph (whole paragraph when unterminated). */
function firstSentence(paragraph) {
  const t = str(paragraph).trim();
  const match = t.match(/^[\s\S]*?[.!?…](?=['")’”]?(?:\s|$))/);
  return (match ? match[0] : t).trim();
}

/**
 * Deterministic, mark-paired quote extraction — the AUTHORITATIVE source of
 * quotes. Walks balanced quotation-mark pairs and returns the content between
 * them (marks stripped), in source order. Straight single quotes are never
 * treated as quote marks: they are indistinguishable from possessive
 * apostrophes ("humanity's … Leopold II's") and a wrong split turns the
 * student's own prose into garbage "quotes". Curly single quotes are safe —
 * an opening ‘ is not an apostrophe.
 */
const QUOTE_PAIRS = [
  ['"', '"'],
  ['“', '”'],
  ['‘', '’'],
];

function extractQuotes(paragraph) {
  const text = str(paragraph);
  const found = [];
  for (const [open, close] of QUOTE_PAIRS) {
    let from = 0;
    for (;;) {
      const start = text.indexOf(open, from);
      if (start === -1) break;
      const end = text.indexOf(close, start + 1);
      if (end === -1) break;
      const content = text.slice(start + 1, end).trim();
      from = end + 1;
      if (content.length >= 12 && content.length <= 400) found.push({ content, start });
    }
  }
  return found
    .sort((a, b) => a.start - b.start)
    .map((f) => f.content)
    .slice(0, 20);
}

// An AI-supplied quote is only trusted when it sits against real quotation
// punctuation in the source — prose spans can never sneak in as "quotes".
const OPEN_MARKS = new Set(['"', '“', '‘']);
const CLOSE_MARKS = new Set(['"', '”']);

function isMarkAnchored(source, content) {
  const text = str(source);
  const needle = str(content);
  if (!needle) return false;
  let at = text.indexOf(needle);
  while (at !== -1) {
    const before = at > 0 ? text[at - 1] : '';
    const after = text[at + needle.length] || '';
    if (OPEN_MARKS.has(before) || CLOSE_MARKS.has(after)) return true;
    at = text.indexOf(needle, at + 1);
  }
  return false;
}

const stripQuoteMarks = (s) => str(s)
  .replace(/^["“‘\s]+/, '')
  .replace(/["”’\s]+$/, '')
  .trim();

const quoteKey = (s) => stripQuoteMarks(s).toLowerCase().replace(/\s+/g, ' ');

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
    const notes = (Array.isArray(para.notes) ? para.notes : [])
      .map((n) => clamp(n, 200))
      .filter((n) => n.trim())
      .slice(0, 10);
    return {
      heading: clamp(para.heading, 120),
      notes,
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
function assembleFromLabels(labels, rawSegments) {
  const segments = (Array.isArray(rawSegments) ? rawSegments : []).map(toSegment);
  const paragraphs = segments.map((s) => s.text);
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
    const segment = segments[i];
    const ai = byIndex.get(i) || {};

    // The AI may flag additional FULL LINES as planning annotations the
    // heuristic missed. Each must match a whole line of the prose exactly
    // (whitespace-insensitively) or it is ignored — prose is never cut on the
    // model's say-so alone.
    let proseLines = segment.text.split('\n');
    const extraNotes = [];
    for (const rawLine of (Array.isArray(ai.annotationLines) ? ai.annotationLines : []).slice(0, 10)) {
      const wanted = str(rawLine).trim();
      if (!wanted) continue;
      const at = proseLines.findIndex((l) => l.trim() === wanted);
      if (at < 0) continue;
      extraNotes.push(proseLines[at].trim());
      proseLines = [...proseLines.slice(0, at), ...proseLines.slice(at + 1)];
    }
    const source = proseLines.join('\n').trim() || segment.text;

    const matcher = buildMatcher(source);
    const topicSentence = (ai.topicSentence && matcher.find(ai.topicSentence)) || firstSentence(source);

    // Quotes: hardcoded mark-pairing FIRST (authoritative), then the AI's
    // labels — which may star a detected quote as high-leverage or add one
    // the pairing missed, but ONLY if it is anchored to real quotation
    // punctuation in this paragraph. The model alone can never mint a quote.
    const quotes = extractQuotes(source).map((text) => ({ text, highLeverage: false }));
    const byKey = new Map(quotes.map((q, idx) => [quoteKey(q.text), idx]));
    for (const q of (Array.isArray(ai.quotes) ? ai.quotes : []).slice(0, 20)) {
      const obj = q && typeof q === 'object' ? q : { text: q };
      const snapped = matcher.find(obj.text);
      if (!snapped) continue;
      const content = stripQuoteMarks(snapped);
      if (content.length < 4) continue;
      const key = quoteKey(content);
      let hit = byKey.get(key);
      if (hit === undefined) {
        const contained = [...byKey.entries()].find(([k]) => k.includes(key) || key.includes(k));
        if (contained) hit = contained[1];
      }
      if (hit !== undefined) {
        if (obj.highLeverage === true) quotes[hit].highLeverage = true;
        continue;
      }
      if (quotes.length >= 20 || !isMarkAnchored(source, content)) continue;
      quotes.push({ text: content, highLeverage: obj.highLeverage === true });
      byKey.set(key, quotes.length - 1);
    }
    bodyParagraphs.push({
      heading: segment.heading,
      notes: [...segment.notes, ...(source === segment.text ? [] : extraNotes)],
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

/** No-AI structure: every segment is a body paragraph, quotes via regex. */
function fallbackStructure(paragraphs) {
  return sanitizeStructure({
    thesis: '',
    introduction: '',
    bodyParagraphs: capSegments(paragraphs).map((segment) => ({
      heading: segment.heading,
      notes: segment.notes,
      topicSentence: firstSentence(segment.text),
      text: segment.text,
      quotes: extractQuotes(segment.text).map((text) => ({ text, highLeverage: false })),
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
  const segments = capSegments(segmentEssay(text));
  if (!segments.length) {
    const err = new Error('The essay has no text to parse.');
    err.status = 400;
    throw err;
  }

  const chosenModel = opts.model || 'gpt-5.4-mini';
  const isReasoning = chosenModel.startsWith('o') || chosenModel === 'gpt-5';
  const numbered = segments.map((s, i) => {
    const label = s.heading ? ` (heading: ${JSON.stringify(s.heading)})` : '';
    return `[P${i}]${label}\n${s.text}`;
  }).join('\n\n');

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
    const structure = assembleFromLabels(labels, segments);
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
    return fallbackStructure(segments);
  }
}

module.exports = {
  parseEssay,
  sanitizeStructure,
  splitParagraphs,
  segmentEssay,
  isAnnotationLine,
  capParagraphs,
  capSegments,
  firstSentence,
  extractQuotes,
  buildMatcher,
  assembleFromLabels,
  fallbackStructure,
};
