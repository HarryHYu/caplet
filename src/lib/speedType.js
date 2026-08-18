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
  '«': '"', '»': '"', '‹': "'", '›': "'",
  '–': '-', '—': '-', '−': '-',
  '…': '...',
  ' ': ' ',
};
export const typeable = (s) => String(s || '').replace(
  /[‘’‚‛“”„«»‹›–—−… ]/g,
  (c) => SMART_TYPE_MAP[c] || c,
);

export const stripPunct = (w) => String(w || '').replace(/[^\p{L}\p{N}']/gu, '');

// Accent folding: é/è/ê → e, ç → c, œ → oe… — what lets a plain keyboard
// type a French (or any accented) essay. Without it, "École" typed as
// "ecole" stays wrong even with Ignore capitals on, because case-folding É
// only reaches é: the diacritic itself has to be stripped too.
const LIGATURES = { 'œ': 'oe', 'Œ': 'OE', 'æ': 'ae', 'Æ': 'AE', 'ß': 'ss' };
export const foldAccents = (s) => String(s || '')
  .replace(/[œŒæÆß]/g, (c) => LIGATURES[c])
  .normalize('NFD')
  .replace(/\p{M}/gu, '');

// German typists transliterate umlauts as two letters (ü→ue, ö→oe, ä→ae) —
// a second canonical form so BOTH "fur" and "fuer" match "für".
const GERMAN_MAP = {
  'ä': 'ae', 'ö': 'oe', 'ü': 'ue', 'Ä': 'AE', 'Ö': 'OE', 'Ü': 'UE',
};
export const foldGerman = (s) => foldAccents(
  String(s || '').replace(/[äöüÄÖÜ]/g, (c) => GERMAN_MAP[c]),
);

const IDENTITY = (s) => String(s || '');

/**
 * Word verdict under the current forgiveness toggles. With ignoreAccents the
 * typed word matches if it equals the target under EITHER accent folding
 * (für→fur) or German transliteration (für→fuer).
 */
export function compareWord(target, typed, opts = {}) {
  const folds = opts.ignoreAccents ? [foldAccents, foldGerman] : [IDENTITY];
  return folds.some((fold) => {
    let a = fold(target);
    let b = fold(typed);
    if (opts.ignoreCase) { a = a.toLowerCase(); b = b.toLowerCase(); }
    if (opts.ignorePunct) { a = stripPunct(a); b = stripPunct(b); }
    return a === b;
  });
}

/**
 * Per-character statuses for live colouring of the current word. A mistyped
 * character keeps showing the TARGET letter (tinted red) so the passage stays
 * readable; extra characters beyond the word's end surface as typed.
 */
export function charStatuses(target, typed, opts = {}) {
  const t = String(target || '');
  const v = String(typed || '');
  // Per character both folds are tried too, so ü/u colours as correct. (The
  // two-letter German form can't align per character — the word verdict from
  // compareWord stays authoritative for that.)
  const folds = opts.ignoreAccents ? [foldAccents, foldGerman] : [IDENTITY];
  const eq = (x, y) => folds.some((fold) => {
    let a = fold(x);
    let b = fold(y);
    if (opts.ignoreCase) { a = a.toLowerCase(); b = b.toLowerCase(); }
    return a === b;
  });
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

/**
 * LCS-based word alignment for grading a typed attempt against a target.
 * Strictly positional diffing cascades: one dropped or extra word marks every
 * later word wrong even when the rest is perfect. Aligning on the longest
 * common subsequence of equal words keeps the attempt anchored:
 *   - matched words           → 'correct'
 *   - unmatched target words  → 'missed' (paired positionally with unmatched
 *     typed words where possible, surfaced as 'wrong' + what was typed)
 *   - leftover typed words    → extras, counted as errors
 *
 * @param {string[]} targetWords
 * @param {string[]} typedWords
 * @param {(a:string,b:string)=>boolean} equals word-equality predicate
 * @returns {{entries:Array<{word:string,status:'correct'|'wrong'|'missed',typed?:string}>, extras:number}}
 */
export function alignWords(targetWords, typedWords, equals) {
  const a = targetWords || [];
  const b = typedWords || [];
  const n = a.length;
  const m = b.length;
  // DP table of LCS lengths; small essays (a few hundred words) keep n*m cheap.
  const dp = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i -= 1) {
    for (let j = m - 1; j >= 0; j -= 1) {
      dp[i][j] = equals(a[i], b[j])
        ? dp[i + 1][j + 1] + 1
        : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const entries = [];
  let extras = 0;
  let i = 0;
  let j = 0;
  // Between matches, pair unmatched target/typed words positionally so a
  // substituted word still reports what was typed for it.
  let pendingTargets = [];
  let pendingTyped = [];
  const flush = () => {
    const paired = Math.min(pendingTargets.length, pendingTyped.length);
    for (let k = 0; k < pendingTargets.length; k += 1) {
      if (k < paired) entries.push({ word: pendingTargets[k], status: 'wrong', typed: pendingTyped[k] });
      else entries.push({ word: pendingTargets[k], status: 'missed' });
    }
    extras += Math.max(0, pendingTyped.length - paired);
    pendingTargets = [];
    pendingTyped = [];
  };
  while (i < n && j < m) {
    if (equals(a[i], b[j]) && dp[i][j] === dp[i + 1][j + 1] + 1) {
      flush();
      entries.push({ word: a[i], status: 'correct' });
      i += 1;
      j += 1;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      pendingTargets.push(a[i]);
      i += 1;
    } else {
      pendingTyped.push(b[j]);
      j += 1;
    }
  }
  while (i < n) { pendingTargets.push(a[i]); i += 1; }
  while (j < m) { pendingTyped.push(b[j]); j += 1; }
  flush();
  return { entries, extras };
}

/**
 * Signature of one speed-run configuration, so personal bests are kept per
 * scope + forgiveness combination: a forgiving 10-word sprint must never
 * claim the strict whole-essay best.
 */
export function runSignature({ sectionIds = [], customText = null, flow = 'full', ignoreCase = false, ignorePunct = false, ignoreAccents = false } = {}) {
  const scope = customText != null
    ? `custom:${hashString(String(customText))}`
    : [...sectionIds].sort().join('+');
  const flags = [flow, ignoreCase ? 'c' : '', ignorePunct ? 'p' : '', ignoreAccents ? 'a' : ''].filter(Boolean).join('.');
  return `${scope}|${flags}`;
}

function hashString(s) {
  let h = 5381;
  for (let i = 0; i < s.length; i += 1) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0; // djb2
  return h.toString(36);
}

/** localStorage key for one essay + run-configuration personal best. */
export const speedBestKey = (essayId, signature) => `caplet:speedbest:${essayId}:${signature}`;

/**
 * The one semantic verdict trio every essay drill colours with — design
 * tokens only, defined once so "correct" looks the same in every mode:
 *   correct → --mark-green ink (block-green fill), wrong → the error tokens,
 *   hint/pending → dim text.
 */
export const VERDICT_CLASS = {
  correct: 'text-[color:var(--mark-green)]',
  correctBg: 'block-green text-[color:var(--mark-green)]',
  correctFill: 'bg-[color:var(--mark-green)]',
  partial: 'text-text-warning',
  partialFill: 'bg-[color:var(--mark-amber)]',
  wrong: 'text-text-error',
  wrongBg: 'bg-surface-error text-text-error',
  wrongFill: 'bg-[color:var(--text-error)]',
  pending: 'text-text-dim',
};

/**
 * The shared pass/partial/fail read on an accuracy percentage. 75 is the same
 * threshold the review scheduler treats as a pass, so a green bar and a
 * scheduled "pass" always agree.
 */
export function accuracyVerdict(accuracy) {
  if (accuracy >= 75) return 'correct';
  if (accuracy >= 50) return 'partial';
  return 'wrong';
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
