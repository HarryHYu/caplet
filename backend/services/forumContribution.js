/**
 * "Contribution" — study-citizenship reputation. A thin, transparent scoring
 * function recomputed from a small set of counters every time one changes
 * (mark/unmark best answer, approve, helpful reaction, delete/restore) —
 * no batch job, no hidden inputs.
 */
const { ForumUserStats } = require('../models');

async function getOrCreateStats(userId) {
  const [stats] = await ForumUserStats.findOrCreate({ where: { userId }, defaults: { userId } });
  return stats;
}

function computeScore(stats) {
  return (stats.bestAnswerCount * 10)
    + (stats.helpfulReactionsReceived * 3)
    + stats.approvedPostCount
    + stats.approvedThreadCount;
}

function computeBadgeKeys(stats) {
  const earned = [];
  if (stats.bestAnswerCount >= 1) earned.push('first_answer');
  if (stats.bestAnswerCount >= 5) earned.push('helper');
  if (stats.helpfulReactionsReceived >= 10) earned.push('community_favorite');
  if (stats.approvedPostCount + stats.approvedThreadCount >= 20) earned.push('prolific_contributor');
  return earned;
}

/** Applies integer deltas (may be negative) to one or more counters, floored at 0, then recomputes score + badges. */
async function adjustStats(userId, deltas) {
  if (!userId) return null;
  const stats = await getOrCreateStats(userId);
  Object.entries(deltas).forEach(([field, delta]) => {
    stats[field] = Math.max(0, Number(stats[field] || 0) + Number(delta || 0));
  });
  stats.contributionScore = computeScore(stats);
  stats.badges = computeBadgeKeys(stats);
  await stats.save();
  return stats;
}

module.exports = { getOrCreateStats, adjustStats, computeScore, computeBadgeKeys };
