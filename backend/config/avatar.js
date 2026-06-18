/**
 * Avatar config validation + level helpers.
 *
 * Phase 1: avatar customization is free. We only sanitize the stored config so
 * a client can't stuff arbitrary/huge data into the column. The actual list of
 * selectable options lives on the frontend catalog; here we just enforce that
 * values are short strings under known keys.
 */

// Allowed avatar option keys (DiceBear "adventurer" style).
const ALLOWED_KEYS = [
  'seed',
  'backgroundColor',
  'skinColor',
  'hair',
  'hairColor',
  'eyes',
  'eyebrows',
  'mouth',
  'glasses',
];

const MAX_VALUE_LEN = 40;

/**
 * Returns a cleaned avatar config object, or null if the input isn't a usable
 * plain object. Drops unknown keys and non-string / oversized values.
 */
function sanitizeAvatarConfig(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null;
  const clean = {};
  for (const key of ALLOWED_KEYS) {
    const v = input[key];
    if (typeof v === 'string') {
      const trimmed = v.slice(0, MAX_VALUE_LEN);
      clean[key] = trimmed;
    }
  }
  // Require at least one recognised key so we don't store empty objects.
  return Object.keys(clean).length ? clean : null;
}

/**
 * Derives a simple level from the number of completed lessons.
 * Phase 1 only — real XP/currency comes with the gamification phase.
 * Level 1 to start; +1 every 3 completed lessons.
 */
const LESSONS_PER_LEVEL = 3;

function levelInfo(completedLessons = 0) {
  const c = Math.max(0, Number(completedLessons) || 0);
  const level = 1 + Math.floor(c / LESSONS_PER_LEVEL);
  const intoLevel = c % LESSONS_PER_LEVEL;
  const toNextLevel = LESSONS_PER_LEVEL - intoLevel;
  return { level, completedLessons: c, lessonsPerLevel: LESSONS_PER_LEVEL, toNextLevel };
}

module.exports = { ALLOWED_KEYS, sanitizeAvatarConfig, levelInfo };
