/**
 * Spaced-repetition scheduler — the shared primitive behind every reviewable
 * item in Caplet (saved slides, essay paragraphs, quotes, …).
 *
 * The core transition is a PURE function (no database, no clock, no network)
 * so it is trivially unit-testable. The route layer (backend/routes/review.js)
 * is the only place that reads/writes ReviewItem rows.
 *
 * Ladder (fixed interval, by stage index):
 *   stage 0 -> 1 day
 *   stage 1 -> 3 days
 *   stage 2 -> 7 days
 *   stage 3 -> 14 days
 *
 * Transition rules:
 *   - First successful recall schedules the item at stage 0 (due in 1 day).
 *   - Each further success advances one rung, capped at stage 3.
 *   - Once at stage 3, successes HOLD the 14-day cadence. We intentionally do
 *     NOT mark items "learned"/retire them — durable retention is better served
 *     by keeping mature items resurfacing every 14 days. (Documented choice.)
 *   - Any failure resets to stage 0 (due in 1 day).
 *
 * This is deliberately simpler than SM-2: a fixed ladder with pass/fail, no
 * ease factors. The recall input is normalized to 'pass' | 'fail'.
 */

const STAGE_INTERVALS_DAYS = [1, 3, 7, 14];
const MAX_STAGE = STAGE_INTERVALS_DAYS.length - 1; // 3
const DAY_MS = 24 * 60 * 60 * 1000;

// Tokens that count as a successful recall. Accepts a boolean (true), or a
// small grade (>= 3 on a 0-5 scale), or one of these strings. Everything else
// — including 'fail', 'again', 0, false, undefined — is treated as a failure.
const PASS_TOKENS = new Set(['pass', 'good', 'easy', 'correct', 'true', 'yes']);
const PASS_GRADE_THRESHOLD = 3;

/**
 * Was this recall a success?
 * @param {boolean|number|string} recall
 * @returns {boolean}
 */
function isPass(recall) {
  if (typeof recall === 'boolean') return recall;
  if (typeof recall === 'number') return Number.isFinite(recall) && recall >= PASS_GRADE_THRESHOLD;
  return PASS_TOKENS.has(String(recall || '').trim().toLowerCase());
}

/**
 * Normalize any accepted recall input to the stored 'pass' | 'fail' label.
 * @param {boolean|number|string} recall
 * @returns {'pass'|'fail'}
 */
function normalizeRecall(recall) {
  return isPass(recall) ? 'pass' : 'fail';
}

/**
 * The interval (in days) for a given stage, clamped to the ladder bounds.
 * @param {number} stage
 * @returns {number}
 */
function intervalForStage(stage) {
  const s = Math.max(0, Math.min(Number.isInteger(stage) ? stage : 0, MAX_STAGE));
  return STAGE_INTERVALS_DAYS[s];
}

/**
 * Pure SRS transition.
 *
 * @param {number|null|undefined} currentStage  the item's persisted stage, or
 *        null/undefined if it has never been scheduled (first review).
 * @param {boolean|number|string} recall        the recall result.
 * @param {number} [now=Date.now()]             epoch ms used as "now".
 * @returns {{ stage: number, intervalDays: number, nextDueAt: Date, recall: 'pass'|'fail' }}
 */
function nextReview(currentStage, recall, now = Date.now()) {
  const passed = isPass(recall);

  let stage;
  if (!passed) {
    stage = 0; // reset on failure
  } else if (currentStage == null) {
    stage = 0; // first success lands on the first rung
  } else {
    stage = Math.min(currentStage + 1, MAX_STAGE); // advance, capped
  }

  const intervalDays = STAGE_INTERVALS_DAYS[stage];
  const nextDueAt = new Date(now + intervalDays * DAY_MS);

  return { stage, intervalDays, nextDueAt, recall: passed ? 'pass' : 'fail' };
}

module.exports = {
  STAGE_INTERVALS_DAYS,
  MAX_STAGE,
  DAY_MS,
  isPass,
  normalizeRecall,
  intervalForStage,
  nextReview,
};
