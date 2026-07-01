/**
 * Pure builders that turn a parsed essay structure into the EXISTING canonical
 * slide types (cards / fillblank / order) so the essay memoriser renders
 * through the same SlideRenderer as lessons. No new renderer types.
 *
 * A parsed structure looks like:
 *   {
 *     thesis: string,
 *     bodyParagraphs: [{ topicSentence, text, quotes:[{text, highLeverage}], techniques:[] }],
 *     conclusion: string
 *   }
 *
 * Spaced-repetition item ids (composite keys stored in ReviewItem.itemId):
 *   paragraph: `${essayId}:${pIdx}`
 *   quote:     `${essayId}:q:${pIdx}:${qIdx}`
 */

// Small stop-word set so cloze blanks land on meaningful terms, not "the"/"and".
const STOPWORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'of', 'to', 'in', 'on', 'for', 'with',
  'as', 'is', 'are', 'was', 'were', 'that', 'this', 'it', 'its', 'by', 'at',
  'from', 'be', 'been', 'has', 'have', 'had', 'not', 'their', 'his', 'her',
  'they', 'which', 'who', 'whom', 'what', 'how', 'also', 'such', 'these',
  'those', 'than', 'then', 'into', 'through', 'between', 'about', 'can', 'will',
  'would', 'could', 'should', 'more', 'most', 'some', 'any', 'all', 'one',
  'when', 'while', 'where', 'because', 'however', 'there', 'here', 'both',
]);

export const paragraphItemId = (essayId, pIdx) => `${essayId}:${pIdx}`;
export const quoteItemId = (essayId, pIdx, qIdx) => `${essayId}:q:${pIdx}:${qIdx}`;

/** Last sentence of a paragraph — used as the cue for the next chunk. */
export function lastSentence(text) {
  const t = String(text || '').trim();
  if (!t) return '';
  const parts = t.split(/(?<=[.!?])\s+/).filter(Boolean);
  return parts.length ? parts[parts.length - 1] : t;
}

/**
 * Turn a sentence into a fill-in-the-blank cloze by blanking its longest
 * content words (deterministic — no NLP service). Returns null if the sentence
 * has no blankable words.
 * @returns {{template:string, blanks:Array<{answers:string[]}>}|null}
 */
export function makeCloze(sentence, maxBlanks = 2) {
  const s = String(sentence || '').trim();
  if (!s) return null;

  const wordRe = /[A-Za-z][A-Za-z'-]+/g;
  const candidates = [];
  let m;
  while ((m = wordRe.exec(s)) !== null) {
    const word = m[0];
    if (word.length >= 5 && !STOPWORDS.has(word.toLowerCase())) {
      candidates.push({ word, index: m.index });
    }
  }
  if (!candidates.length) return null;

  // Pick the longest words, then restore textual order for stable {{i}} numbering.
  const chosen = candidates
    .slice()
    .sort((a, b) => b.word.length - a.word.length)
    .slice(0, Math.max(1, maxBlanks))
    .sort((a, b) => a.index - b.index);

  let template = '';
  let last = 0;
  const blanks = [];
  chosen.forEach((c, i) => {
    template += s.slice(last, c.index) + `{{${i}}}`;
    blanks.push({ answers: [c.word] });
    last = c.index + c.word.length;
  });
  template += s.slice(last);

  return { template, blanks };
}

/** A fillblank slide for one paragraph's topic sentence, or null. */
export function buildTopicSentenceCloze(paragraph, pIdx) {
  const cloze = makeCloze(paragraph?.topicSentence || '', 2);
  if (!cloze) return null;
  return {
    type: 'fillblank',
    template: cloze.template,
    blanks: cloze.blanks,
    mode: 'textbox',
    explanation: `Topic sentence of body paragraph ${pIdx + 1}.`,
    caption: `Body paragraph ${pIdx + 1}`,
  };
}

/**
 * One carousel `cards` slide drilling every quote (front) against the
 * paragraph's named techniques (back). High-leverage quotes are starred.
 * Returns null if the essay has no quotes.
 */
export function buildQuoteCards(structure) {
  const paras = structure?.bodyParagraphs || [];
  const cards = [];
  paras.forEach((p, i) => {
    (p.quotes || []).forEach((q) => {
      const text = String(q?.text || '').trim();
      if (!text) return;
      const techniques = (p.techniques || []).filter(Boolean).join(', ');
      cards.push({
        front: q.highLeverage ? `${text}  ⭐` : text,
        back: techniques ? `Techniques: ${techniques}` : `Body paragraph ${i + 1}`,
      });
    });
  });
  if (!cards.length) return null;
  return { type: 'cards', mode: 'carousel', cards, caption: 'Quote & technique drill' };
}

/**
 * One `order` slide whose items are the paragraphs' topic sentences (in their
 * true order — SlideRenderer shuffles for the learner). Null if < 2 paragraphs.
 */
export function buildParagraphOrder(structure) {
  const paras = structure?.bodyParagraphs || [];
  const items = paras
    .map((p) => String(p?.topicSentence || p?.text || '').trim())
    .filter(Boolean)
    .map((t) => (t.length > 100 ? `${t.slice(0, 100).trim()}…` : t));
  if (items.length < 2) return null;
  return {
    type: 'order',
    prompt: 'Put your body paragraphs back in their original order.',
    items,
    caption: 'Paragraph sequencing',
  };
}

/** Convenience: all supplementary practice slides for an essay. */
export function buildPracticeSlides(structure) {
  return {
    quoteCards: buildQuoteCards(structure),
    paragraphOrder: buildParagraphOrder(structure),
  };
}

/**
 * Splits `text` into an ordered list of segments, highlighting each verbatim
 * `needle` supplied in `markers`. Pure and deterministic — used to render the
 * "Annotated" essay view (thesis / topic sentences / quotes highlighted in
 * different colours) without ever touching the student's actual words.
 *
 * Overlapping markers are resolved by first-match-wins (earlier start keeps
 * priority — in practice a paragraph's topicSentence sits at the very start
 * and never overlaps with quotes drawn from later in the paragraph).
 *
 * @param {string} text
 * @param {Array<{needle:string, type:string, meta?:object}>} markers
 * @returns {Array<{text:string, type:'plain'|string, meta?:object}>}
 */
export function highlightSpansInText(text, markers = []) {
  const t = String(text || '');
  if (!t) return [];

  const spans = [];
  markers.forEach((m) => {
    const needle = String(m?.needle || '').trim();
    if (!needle) return;
    const start = t.indexOf(needle);
    if (start === -1) return;
    spans.push({ start, end: start + needle.length, type: m.type, meta: m.meta });
  });
  spans.sort((a, b) => a.start - b.start);

  const clean = [];
  let lastEnd = -1;
  spans.forEach((s) => {
    if (s.start >= lastEnd) {
      clean.push(s);
      lastEnd = s.end;
    }
  });

  const segments = [];
  let cursor = 0;
  clean.forEach((s) => {
    if (s.start > cursor) segments.push({ text: t.slice(cursor, s.start), type: 'plain' });
    segments.push({ text: t.slice(s.start, s.end), type: s.type, meta: s.meta });
    cursor = s.end;
  });
  if (cursor < t.length) segments.push({ text: t.slice(cursor), type: 'plain' });
  return segments;
}

/**
 * Annotates one body paragraph: its topic sentence and every quote it cites
 * become highlighted segments (see highlightSpansInText). Used by the
 * "Annotated" essay view.
 * @returns {Array<{text:string, type:'plain'|'topic'|'quote', meta?:object}>}
 */
export function buildAnnotatedParagraph(paragraph) {
  const p = paragraph || {};
  const markers = [];
  if (p.topicSentence) markers.push({ needle: p.topicSentence, type: 'topic' });
  (p.quotes || []).forEach((q) => {
    if (q?.text) markers.push({ needle: q.text, type: 'quote', meta: { highLeverage: !!q.highLeverage } });
  });
  return highlightSpansInText(p.text, markers);
}
