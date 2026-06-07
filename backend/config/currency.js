/**
 * Caplet currency rules. Caplet Coins are awarded when a user completes a
 * lesson for the first time, scaled by the course's difficulty level.
 * (Spending / Caplet Gems purchase flows are intentionally not implemented yet.)
 */

const COIN_REWARD_BY_LEVEL = {
  beginner: 10,
  intermediate: 20,
  advanced: 30,
};

const DEFAULT_REWARD = 10;

function coinsForLevel(level) {
  return COIN_REWARD_BY_LEVEL[level] || DEFAULT_REWARD;
}

module.exports = { COIN_REWARD_BY_LEVEL, DEFAULT_REWARD, coinsForLevel };
