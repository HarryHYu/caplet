/**
 * Pure logic for the Speed run typing drill (MonkeyType over your own essay):
 * keyboard-typeable normalisation of the target text, word/character grading
 * under the forgiveness toggles, section + preset scope building, the word
 * stream, and MonkeyType-style stats.
 */

// Curly quotes, long dashes and non-breaking spaces can't be typed on a
// normal keyboard — map the TARGET onto typeable equivalents up front so the
// drill never marks someone wrong for lacking a “ key.
const SMART_TYPE_MAP = {
  '‘': "'", '’': "'", '‚': "'", '‛': "'",
  '“': '"', '”': '"', '„': '"',
  '–': '-', '—': '-', '−': '-',
  '…': '...',
  ' ': ' ',
};
export const typeable = (s) => String(s || '').replace(
  /[‘’‚‛“”„–—−… ]/g,
  (c) => SMART_TYPE_MAP[c] || c,
);

const stripPunct = (w) => String(w || '').replace(/[^\p{L}\p{N}']/gu, '');

/** Word verdict under the current forgiveness toggles. */
export function compareWord(target, typed, opts = {}) {
  let a = String(target || '');
  let b = String(typed || '');
  if (opts.ignoreCase) { a = a.toLowerCase(); b = b.toLowerCase(); }
  if (opts.ignorePunct) { a = stripPunct(a); b = stripPunct(b); }
  return a === b;
}

/**
 * Per-character statuses for live colouring of the current word. A mistyped
 * character keeps showing the TARGET letter (tinted red) so the passage stays
 * readable; extra characters beyond the word's end surface as typed.
 */
export function charStatuses(target, typed, opts = {}) {
  const t = String(target || '');
  const v = String(typed || '');
  const eq = (x, y) => (opts.ignoreCase ? x.toLowerCase() === y.toLowerCase() : x === y);
  const out = [];
  for (let i = 0; i < Math.max(t.length, v.length); i += 1) {
    if (i >= v.length) out.push({ ch: t[i], status: 'pending' });
    else if (i >= t.length) out.push({ ch: v[i], status: 'extra' });
    else out.push({ ch: t[i], status: eq(t[i], v[i]) ? 'ok' : 'bad' });
  }
  return out;
}

export function splitSentences(text) {
  return String(text || '').trim().split(/(?<=[.!?])\s+/).filter(Boolean);
}

/** The typeable sections of a parsed essay, in reading order. */
export function buildSpeedSections(essay) {
  const s = essay?.parsedStructure || {};
  const out = [];
  if (String(s.introduction || '').trim()) out.push({ id: 'intro', label: 'Introduction', text: s.introduction });
  (Array.isArray(s.bodyParagraphs) ? s.bodyParagraphs : []).forEach((p, i) => {
    if (String(p?.text || '').trim()) out.push({ id: `bp${i}`, label: `Body ¶${i + 1}`, text: p.text });
  });
  if (String(s.conclusion || '').trim()) out.push({ id: 'conclusion', label: 'Conclusion', text: s.conclusion });
  return out;
}

/** Quick-picks over the section list; only offered when their parts exist. */
export function presetIds(kind, sections) {
  const bodies = sections.filter((x) => x.id.startsWith('bp'));
  switch (kind) {
    case 'all': return sections.map((x) => x.id);
    case 'intro': return sections.filter((x) => x.id === 'intro').map((x) => x.id);
    case 'bodies': return bodies.map((x) => x.id);
    case 'conclusion': return sections.filter((x) => x.id === 'conclusion').map((x) => x.id);
    case 'lastBpConclusion':
      return [
        ...(bodies.length ? [bodies[bodies.length - 1].id] : []),
        ...sections.filter((x) => x.id === 'conclusion').map((x) => x.id),
      ];
    default: return sections.map((x) => x.id);
  }
}

/** Flattens a passage into the word stream, tagged with sentence numbers. */
export function buildRun(text) {
  const sentences = splitSentences(typeable(text));
  const words = [];
  sentences.forEach((s, si) => {
    s.trim().split(/\s+/).filter(Boolean).forEach((w) => words.push({ w, si }));
  });
  return { words, sentenceCount: sentences.length };
}

/**
 * MonkeyType-style numbers: WPM counts only the words you got right
 * ((correct chars + their spaces) / 5 per minute); raw WPM counts everything
 * you typed; accuracy is word-level.
 */
export function computeStats(records, elapsedMs) {
  const total = records.length;
  const correct = records.filter((r) => r.correct).length;
  const minutes = Math.max(elapsedMs, 1000) / 60000;
  const correctChars = records.filter((r) => r.correct).reduce((n, r) => n + r.target.length + 1, 0);
  const typedChars = records.reduce((n, r) => n + r.typed.length + 1, 0);
  return {
    wpm: Math.round((correctChars / 5) / minutes),
    rawWpm: Math.round((typedChars / 5) / minutes),
    accuracy: total ? Math.round((correct / total) * 100) : 0,
    errors: total - correct,
    total,
    seconds: Math.max(1, Math.round(elapsedMs / 1000)),
  };
}
