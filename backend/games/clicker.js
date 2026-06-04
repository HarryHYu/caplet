/**
 * "Compound" — an original finance-themed incremental/clicker game.
 * Not a copy of any existing game; all names, numbers and copy are our own.
 *
 * A game module exposes: key, meta (title/description/icon), defaultState(),
 * sanitizeState(raw), and getServerMeta(userId). The registry wires it up so
 * adding a new game = adding another module like this one.
 */
const UserProgress = require('../models/UserProgress');

// lessonsCompleted -> stage. Stage = how many thresholds you've reached.
const STAGE_THRESHOLDS = [0, 3, 8, 15, 25, 40];
const MAX_STAGE = STAGE_THRESHOLDS.length;

const COST_GROWTH = 1.15;
const OFFLINE_CAP_SECONDS = 8 * 3600; // cap idle earnings to 8h

// Auto-investments (generators). Original values.
const GENERATORS = [
  { id: 'piggybank', name: 'Piggy Bank', icon: '🐷', baseCost: 15, baseCps: 0.1, requiredStage: 1 },
  { id: 'savings', name: 'Savings Account', icon: '🏦', baseCost: 120, baseCps: 1, requiredStage: 1 },
  { id: 'termdeposit', name: 'Term Deposit', icon: '📜', baseCost: 1300, baseCps: 8, requiredStage: 2 },
  { id: 'bonds', name: 'Government Bonds', icon: '🧾', baseCost: 14000, baseCps: 47, requiredStage: 3 },
  { id: 'stocks', name: 'Stock Portfolio', icon: '📈', baseCost: 200000, baseCps: 260, requiredStage: 4 },
  { id: 'property', name: 'Property', icon: '🏠', baseCost: 3300000, baseCps: 1400, requiredStage: 5 },
  { id: 'indexfund', name: 'Index Fund', icon: '🌐', baseCost: 51000000, baseCps: 7800, requiredStage: 6 },
];

// One-off upgrades (multipliers).
const UPGRADES = [
  { id: 'click1', name: 'Firmer Taps', icon: '👆', cost: 500, effect: { type: 'click_mult', value: 2 }, requiredStage: 1, desc: 'Clicks earn 2× coins' },
  { id: 'prod1', name: 'Diversification', icon: '🧺', cost: 30000, effect: { type: 'cps_mult', value: 1.5 }, requiredStage: 2, desc: 'All investments +50% output' },
  { id: 'click2', name: 'Power Fingers', icon: '✊', cost: 120000, effect: { type: 'click_mult', value: 3 }, requiredStage: 3, desc: 'Clicks earn 3× more' },
  { id: 'prod2', name: 'Compound Returns', icon: '📊', cost: 6000000, effect: { type: 'cps_mult', value: 2 }, requiredStage: 5, desc: 'All investments 2× output' },
];

const GEN_IDS = new Set(GENERATORS.map((g) => g.id));
const UPGRADE_IDS = new Set(UPGRADES.map((u) => u.id));

function stageFromLessons(n) {
  let stage = 1;
  for (let i = 0; i < STAGE_THRESHOLDS.length; i++) {
    if (n >= STAGE_THRESHOLDS[i]) stage = i + 1;
  }
  return stage;
}

function defaultState() {
  return { gameCoins: 0, generators: {}, upgrades: [], totalClicks: 0, lastSaved: Date.now() };
}

// Clamp/whitelist incoming state so a client can't store nonsense / cheat wildly.
function sanitizeState(raw) {
  const s = raw && typeof raw === 'object' ? raw : {};
  const num = (v, max) => {
    const n = Number(v);
    if (!Number.isFinite(n) || n < 0) return 0;
    return Math.min(n, max);
  };
  const generators = {};
  if (s.generators && typeof s.generators === 'object') {
    for (const id of GEN_IDS) {
      const count = Math.floor(num(s.generators[id], 1e6));
      if (count > 0) generators[id] = count;
    }
  }
  const upgrades = Array.isArray(s.upgrades)
    ? [...new Set(s.upgrades.filter((u) => UPGRADE_IDS.has(u)))]
    : [];
  return {
    gameCoins: num(s.gameCoins, 1e21),
    generators,
    upgrades,
    totalClicks: Math.floor(num(s.totalClicks, 1e15)),
    lastSaved: Math.min(num(s.lastSaved, Date.now()), Date.now()) || Date.now(),
  };
}

// Server-authoritative data the client needs (stage gate + catalog).
async function getServerMeta(userId) {
  const lessonsCompleted = await UserProgress.count({
    where: { userId, status: 'completed' },
  });
  const stage = stageFromLessons(lessonsCompleted);
  const nextStage = stage < MAX_STAGE
    ? { stage: stage + 1, at: STAGE_THRESHOLDS[stage], lessonsNeeded: Math.max(0, STAGE_THRESHOLDS[stage] - lessonsCompleted) }
    : null;
  return {
    stage,
    maxStage: MAX_STAGE,
    lessonsCompleted,
    nextStage,
    catalog: {
      generators: GENERATORS,
      upgrades: UPGRADES,
      costGrowth: COST_GROWTH,
      offlineCapSeconds: OFFLINE_CAP_SECONDS,
      stageThresholds: STAGE_THRESHOLDS,
    },
  };
}

module.exports = {
  key: 'clicker',
  meta: {
    title: 'Compound',
    description: 'Tap to earn, invest to grow. Complete lessons to unlock new stages.',
    icon: '🪙',
    path: '/games/clicker',
  },
  defaultState,
  sanitizeState,
  getServerMeta,
};
