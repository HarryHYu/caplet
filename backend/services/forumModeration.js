/**
 * Forum moderation helpers.
 *
 * Every thread and post already requires human approval before it's public
 * (see routes/forum.js), so this module isn't a publish gate — it's triage:
 * it flags likely-urgent submissions so moderators see the risky stuff first,
 * and it enforces active mutes/bans at the point of posting.
 */
const { ForumSanction } = require('../models');

// Deliberately coarse, keyword-level heuristics — not a content classifier.
// False positives just mean a human looks at it slightly sooner; false
// negatives still get caught because nothing is public without review anyway.
const SEVERE_TERMS = [
  /\bkill (myself|yourself|urself)\b/i,
  /\b(suicide|self[\s-]?harm)\b/i,
  /\b(hate|kys)\b/i,
];
const BULLYING_TERMS = [
  /\b(ugly|loser|stupid|idiot|retard(ed)?)\b.{0,20}\byou\b/i,
  /\byou('re| are)\b.{0,20}\b(ugly|worthless|pathetic|loser|stupid)\b/i,
];
const ACADEMIC_INTEGRITY_TERMS = [
  /\b(exam|test|assessment) (answers?|solutions?)\b/i,
  /\bcan (someone|anyone) (send|share|post) (the|this year'?s)? ?(exam|test|paper)\b/i,
];
const PERSONAL_INFO_PATTERNS = [
  /\b\d{3,4}[\s.-]?\d{3}[\s.-]?\d{3,4}\b/, // phone-number-shaped digit runs
  /\b[\w.+-]+@[\w-]+\.[a-z]{2,}\b/i, // email address
  /\b(snap(chat)?|insta(gram)?|discord)\s*[:@]\s*\S+/i, // socials handle sharing
];

function computeAutoFlag(text) {
  const reasons = [];
  const value = String(text || '');
  if (SEVERE_TERMS.some((re) => re.test(value))) reasons.push('self_harm_or_severe');
  if (BULLYING_TERMS.some((re) => re.test(value))) reasons.push('possible_bullying');
  if (ACADEMIC_INTEGRITY_TERMS.some((re) => re.test(value))) reasons.push('academic_integrity');
  if (PERSONAL_INFO_PATTERNS.some((re) => re.test(value))) reasons.push('personal_info_shared');
  return { flagged: reasons.length > 0, reasons };
}

/**
 * Looks up the user's currently-active sanction, lazily expiring mutes whose
 * expiresAt has passed. Returns null when the user may post freely.
 */
async function getActiveSanction(userId) {
  if (!userId) return null;
  const sanction = await ForumSanction.findOne({
    where: { userId, active: true },
    order: [['createdAt', 'DESC']],
  });
  if (!sanction) return null;
  if (sanction.expiresAt && new Date(sanction.expiresAt).getTime() <= Date.now()) {
    sanction.active = false;
    sanction.liftedAt = new Date();
    await sanction.save();
    return null;
  }
  return sanction;
}

/**
 * Throws a 403-shaped error if the user can't post right now (banned, or
 * muted). Reading/browsing the forum is never blocked by a sanction.
 */
async function assertCanPost(userId) {
  const sanction = await getActiveSanction(userId);
  if (!sanction) return;
  const error = new Error(
    sanction.type === 'ban'
      ? 'Your forum account has been banned. Contact a moderator if you believe this is a mistake.'
      : `You are temporarily muted from posting${sanction.expiresAt ? ` until ${new Date(sanction.expiresAt).toLocaleString()}` : ''}.`
  );
  error.status = 403;
  error.code = sanction.type === 'ban' ? 'forum_banned' : 'forum_muted';
  throw error;
}

module.exports = {
  computeAutoFlag,
  getActiveSanction,
  assertCanPost,
  REPORT_REASON_TO_QUEUE: {
    bullying: 'admin',
    harassment: 'admin',
    academic_integrity: 'moderator',
    inappropriate: 'moderator',
    spam: 'moderator',
    other: 'moderator',
  },
};
