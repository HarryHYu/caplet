/**
 * Typewriter Tycoon — the server-authoritative economy behind the /party
 * socket namespace, now UNIVERSAL: every player has one persistent game
 * state (money, typewriter tier, upgrades, pets — saved per account by the
 * socket layer), and parties are an in-memory social layer on top (roster,
 * chat, sabotage). Chat and party membership never touch the database.
 *
 * This module is deliberately pure (no DB, no sockets) so the whole economy
 * is unit-testable. Clients only ever report typed-word counts; every dollar,
 * price, crit and theft is computed here.
 *
 * The numbers are the balance-audited spec (see the tycoon design docs):
 * tier 2 ~3 minutes in, a tier per session mid-game, diamond a multi-session
 * flex; every secondary pays back in ~8-10 min at its intended tier; all
 * sink prices scale with the buyer's own $/word (b) so sabotage always costs
 * the same minutes-of-income at any wealth level.
 */
const crypto = require('crypto');

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 6;
const MAX_MEMBERS = 12;
const MAX_CHAT_KEPT = 40;
const MAX_CHAT_LENGTH = 240;
const ROOM_IDLE_MS = 60 * 60 * 1000;
const ALL_GONE_MS = 2 * 60 * 1000;
// Long on purpose: the point is studying with occasional mischief, not a
// clicker war. One attack roughly per drill paragraph, not per sentence.
const SABOTAGE_COOLDOWN_MS = 15 * 1000;  // per attacker
const TARGET_COOLDOWN_MS = 45 * 1000;    // per victim — no chain-blinding
const UMBRELLA_COOLDOWN_MS = 12 * 1000;

// ── The typewriter ladder — the primary upgrade ─────────────────────────────
const TIERS = [
  { key: 'stone', label: 'Stone', b: 1, cost: 0 },
  { key: 'wood', label: 'Wood', b: 2, cost: 70 },
  { key: 'copper', label: 'Copper', b: 4, cost: 350 },
  { key: 'iron', label: 'Iron', b: 7, cost: 1100 },
  { key: 'bronze', label: 'Bronze', b: 12, cost: 2600 },
  { key: 'gold', label: 'Gold', b: 20, cost: 7500 },
  { key: 'platinum', label: 'Platinum', b: 33, cost: 20000 },
  { key: 'diamond', label: 'Diamond', b: 55, cost: 60000 },
];

// ── Secondary upgrade lines (all paybacks tuned to ~8-10 min) ───────────────
const SECONDARIES = {
  // +10% income at FULL combo per level; the meter fills over 20 straight
  // correct words and a miss halves it.
  streak: { label: 'Streak Engine', costs: [30, 66, 145, 320, 700] },
  // Random words go gold and pay a multiple of b.
  ribbon: { label: 'Ribbon', costs: [120, 170, 650, 950] },
  // Finishing a paragraph pass pays a lump of 8b × level.
  paper: { label: 'Paper Feed', costs: [110, 260, 520] },
};
const RIBBON_LEVELS = [
  { p: 0, mult: 0 },
  { p: 0.03, mult: 5 },
  { p: 0.04, mult: 6 },
  { p: 0.05, mult: 8 },
  { p: 0.05, mult: 10 },
];
const STREAK_METER_FULL = 20;
const M_CAP = 3.2;
const CREDIT_WPM_CAP = 45; // token bucket: nobody "types" faster than this

// ── Sinks: everything priced in multiples of the buyer's b ──────────────────
const SABOTAGES = {
  confetti: { label: 'Confetti Cannon', bMult: 6, durationMs: 4000 },
  snail: { label: 'Snail-Mo', bMult: 8, durationMs: 8000 },
  ink: { label: 'Ink Splat', bMult: 14, durationMs: 7000 },
  jelly: { label: 'Jelly Text', bMult: 18, durationMs: 6000 },
  fog: { label: 'Fog on the Glass', bMult: 24, durationMs: 8000 },
  bomb: { label: 'Blur Bomb', bMult: 30, durationMs: 6000 },
  cat: { label: 'Cat Deploy', bMult: 40, durationMs: 10000 },
  thief: { label: 'Word Thief', bMult: 55, durationMs: 3000 },
};
const DEFENCES = {
  shield: { label: 'Shield', bMult: 20, max: 3 },
  wipers: { label: 'Wipers', bMult: 75 },
  umbrella: { label: 'Umbrella', bMult: 100, blocksUpTo: 18 },
};
// Pets are one-time companions with a small passive each.
const PETS = {
  snailPet: { label: 'Desk snail', bMult: 30, perk: 'incoming hits fade 20% faster' },
  catPet: { label: 'Desk cat', bMult: 90, perk: 'chases off Cat Deploys; thieves only grab half' },
  dragonPet: { label: 'Desk dragon', bMult: 250, perk: '+10% word earnings' },
};
const SNAIL_PET_DURATION_MULT = 0.8;
const DRAGON_PET_EARN_MULT = 1.1;

// Automonkeys: idle assistants. Ten of them together earn exactly half of
// honest typing at the 45wpm credit cap (45b/min), so each pays 2.25b/min.
// The robo monkey is three automonkeys in a trench coat.
const AUTO_MAX = 10;
const AUTO_RATE_B_PER_MIN = 2.25;
const AUTO_COST_B = 250;
const ROBO_UNITS = 3;
const ROBO_COST_B = 1500;
const AUTO_GAP_CAP_MIN = 5; // an idle tab can bank at most this many minutes at once

// The wardrobe: three accessory slots, each a tier ladder. Dress the monkey
// all the way up — crown, gold monocle, tuxedo — and it becomes properly
// Sophisticated (a further +5% on words, and everyone can tell).
const ACCESSORIES = {
  head: { label: 'Head', tiers: [
    { key: 'cap', label: 'Flat cap', bMult: 60, perk: '+2% word pay', earnMult: 1.02 },
    { key: 'tophat', label: 'Top hat', bMult: 250, perk: '+5% word pay', earnMult: 1.05 },
    { key: 'crown', label: 'Crown', bMult: 1200, perk: '+10% word pay', earnMult: 1.10 },
  ] },
  eyes: { label: 'Eyes', tiers: [
    { key: 'readers', label: 'Reading glasses', bMult: 80, perk: 'misses keep 60% of your streak', missKeep: 0.6 },
    { key: 'monocle', label: 'Monocle', bMult: 350, perk: 'misses keep 70% of your streak', missKeep: 0.7 },
    { key: 'goldMonocle', label: 'Gold monocle', bMult: 1500, perk: 'misses keep 80% of your streak', missKeep: 0.8 },
  ] },
  body: { label: 'Body', tiers: [
    { key: 'scarf', label: 'Scarf', bMult: 100, perk: 'paragraph bonuses +10%', paperMult: 1.10 },
    { key: 'waistcoat', label: 'Waistcoat', bMult: 400, perk: 'paragraph bonuses +25%', paperMult: 1.25 },
    { key: 'tuxedo', label: 'Tuxedo', bMult: 2000, perk: 'paragraph bonuses +50%', paperMult: 1.50 },
  ] },
};
const SOPHISTICATED_EARN_MULT = 1.05;

function accTier(state, slot) {
  const level = state.acc?.[slot] || 0;
  return level > 0 ? ACCESSORIES[slot].tiers[level - 1] : null;
}
function isSophisticated(state) {
  return Object.keys(ACCESSORIES).every((slot) => (state.acc?.[slot] || 0) >= ACCESSORIES[slot].tiers.length);
}
const GIFT_PRESETS = [10, 25, 50];       // × sender's b
const GIFT_RECEIVE_CAP_B = 60;           // × receiver's b — anti-funnelling
const THIEF_RATE = 0.08;
const THIEF_CAP_B = 40;                  // × victim's b
const THIEF_FLOOR_B = 15;                // victim never left below this

const BLOCKED_TERMS = [
  'fuck', 'shit', 'bitch', 'cunt', 'nigger', 'nigga', 'faggot', 'retard', 'porn',
];

// ── Stores ──────────────────────────────────────────────────────────────────
const sessions = new Map(); // userId -> live session (party OR solo)
const rooms = new Map();    // code -> party room

function now() { return Date.now(); }

/** The persistent slice — everything here survives across runs. */
function normalizeState(raw) {
  const s = raw && typeof raw === 'object' ? raw : {};
  const up = s.up && typeof s.up === 'object' ? s.up : {};
  return {
    money: Math.max(0, Math.round(Number(s.money) || 0)),
    tier: Math.max(0, Math.min(TIERS.length - 1, Math.round(Number(s.tier) || 0))),
    up: {
      streak: Math.max(0, Math.min(SECONDARIES.streak.costs.length, Math.round(Number(up.streak) || 0))),
      ribbon: Math.max(0, Math.min(SECONDARIES.ribbon.costs.length, Math.round(Number(up.ribbon) || 0))),
      paper: Math.max(0, Math.min(SECONDARIES.paper.costs.length, Math.round(Number(up.paper) || 0))),
    },
    pets: Array.isArray(s.pets) ? s.pets.filter((k) => PETS[k]).slice(0, 8) : [],
    autos: Math.max(0, Math.min(AUTO_MAX, Math.round(Number(s.autos) || 0))),
    robo: !!s.robo,
    acc: Object.fromEntries(Object.keys(ACCESSORIES).map((slot) => [
      slot,
      Math.max(0, Math.min(ACCESSORIES[slot].tiers.length, Math.round(Number(s.acc?.[slot]) || 0))),
    ])),
    lifetimeWords: Math.max(0, Math.round(Number(s.lifetimeWords) || 0)),
  };
}

function bOf(state) { return TIERS[state.tier].b; }

/** One live session per user, party or solo. `state` is the persistent bit. */
function ensureSession(userId, name, persistedState) {
  const id = String(userId);
  let session = sessions.get(id);
  if (!session) {
    session = {
      id,
      name: String(name || 'Student').slice(0, 24),
      state: normalizeState(persistedState),
      connected: true,
      lastSeen: now(),
      dirty: false,       // socket layer saves when set
      roomCode: null,
      // Per-run bits — reset every fresh session:
      words: 0,
      para: 0,
      paraCount: 0,
      accuracy: 100,
      watching: false,
      meter: 0,
      shields: 0,
      wipers: false,
      umbrella: false,
      umbrellaReadyAt: 0,
      lastSabotageAt: 0,
      lastHitAt: 0,
      goalHit: false,
      bucket: { tokens: CREDIT_WPM_CAP, ts: now() },
      autoTs: now(),
      autoCarry: 0,
    };
    sessions.set(id, session);
  } else {
    session.connected = true;
    session.lastSeen = now();
    session.name = String(name || session.name).slice(0, 24);
  }
  return session;
}

function getSession(userId) { return sessions.get(String(userId)) || null; }

// ── Earnings ────────────────────────────────────────────────────────────────

/** Token bucket: credited words can never exceed 45/min sustained. */
function creditWords(session, requested) {
  const b = session.bucket;
  const t = now();
  b.tokens = Math.min(CREDIT_WPM_CAP, b.tokens + ((t - b.ts) / 60000) * CREDIT_WPM_CAP);
  b.ts = t;
  const granted = Math.max(0, Math.min(Math.floor(b.tokens), Math.round(Number(requested) || 0), 60));
  b.tokens -= granted;
  return granted;
}

function streakMultiplier(session) {
  const lv = session.state.up.streak;
  return 1 + 0.10 * lv * (session.meter / STREAK_METER_FULL);
}

/** Idle income from automonkeys (and the robo). Lazy accrual with a carry so
 * fractional cents survive between ticks; the gap cap stops a laptop waking
 * from sleep from cashing the whole nap. */
function accrueAuto(session) {
  const t = now();
  const last = session.autoTs ?? t;
  session.autoTs = t;
  const units = (session.state.autos || 0) + (session.state.robo ? ROBO_UNITS : 0);
  if (units <= 0) { session.autoCarry = 0; return 0; }
  const minutes = Math.min(Math.max(0, (t - last) / 60000), AUTO_GAP_CAP_MIN);
  const raw = units * AUTO_RATE_B_PER_MIN * bOf(session.state) * minutes + (session.autoCarry || 0);
  const earned = Math.floor(raw);
  session.autoCarry = raw - earned;
  if (earned > 0) {
    session.state.money += earned;
    session.dirty = true;
  }
  return earned;
}

/**
 * Credit a progress report. Misses halve the streak meter (never zero — a
 * reset at recall pace feels brutal); each credited word fills it by one.
 * Ribbon crits are rolled per word server-side. Watched words never reach
 * this function — the client reports watching state, not watched words.
 */
function recordProgress(session, { wordsDelta, missesDelta, paragraphsDelta, para, paraCount, accuracy, watching } = {}) {
  session.lastSeen = now();
  session.watching = !!watching;
  if (Number.isFinite(Number(para))) session.para = Math.max(0, Math.round(Number(para)));
  if (Number.isFinite(Number(paraCount))) session.paraCount = Math.max(0, Math.round(Number(paraCount)));
  if (Number.isFinite(Number(accuracy))) session.accuracy = Math.max(0, Math.min(100, Math.round(Number(accuracy))));

  const misses = Math.max(0, Math.min(20, Math.round(Number(missesDelta) || 0)));
  const missKeep = accTier(session.state, 'eyes')?.missKeep ?? 0.5;
  for (let i = 0; i < misses; i += 1) session.meter = Math.floor(session.meter * missKeep);

  const words = creditWords(session, wordsDelta);
  const state = session.state;
  const b = bOf(state);
  const ribbon = RIBBON_LEVELS[state.up.ribbon];
  let earned = 0;
  let crits = 0;
  let jackpot = 0;
  for (let i = 0; i < words; i += 1) {
    session.meter = Math.min(STREAK_METER_FULL, session.meter + 1);
    const isCrit = ribbon.p > 0 && crypto.randomInt(10000) < ribbon.p * 10000;
    const dragon = state.pets.includes('dragonPet') ? DRAGON_PET_EARN_MULT : 1;
    const accEarn = (accTier(state, 'head')?.earnMult || 1) * (isSophisticated(state) ? SOPHISTICATED_EARN_MULT : 1);
    const perWord = Math.min(b * 10 * 1.5, Math.round((isCrit ? b * ribbon.mult : b) * dragon * accEarn * Math.min(M_CAP, streakMultiplier(session))));
    earned += perWord;
    if (isCrit) { crits += 1; jackpot += perWord; }
  }
  const paragraphs = Math.max(0, Math.min(4, Math.round(Number(paragraphsDelta) || 0)));
  const paperLump = Math.round(paragraphs * 8 * b * state.up.paper * (accTier(state, 'body')?.paperMult || 1));
  earned += paperLump;

  state.money += earned;
  state.lifetimeWords += words;
  session.words += words;
  session.dirty = earned > 0 || words > 0;

  let goalJustHit = false;
  const room = session.roomCode ? rooms.get(session.roomCode) : null;
  if (room) {
    room.lastActivity = now();
    if (room.goalWords > 0 && !session.goalHit && session.words >= room.goalWords) {
      session.goalHit = true;
      goalJustHit = true;
    }
  }
  return { earned, words, crits, jackpot, paperLump, meter: session.meter, goalJustHit };
}

// ── The shop ────────────────────────────────────────────────────────────────

/** Everything purchasable, with live prices for this player. */
function shopFor(session) {
  const state = session.state;
  const b = bOf(state);
  const nextTier = state.tier + 1 < TIERS.length ? TIERS[state.tier + 1] : null;
  const secondary = (key) => {
    const line = SECONDARIES[key];
    const lv = state.up[key];
    return { level: lv, max: line.costs.length, cost: lv < line.costs.length ? line.costs[lv] : null };
  };
  return {
    tier: nextTier ? { key: nextTier.key, label: nextTier.label, b: nextTier.b, cost: nextTier.cost } : null,
    streak: secondary('streak'),
    ribbon: secondary('ribbon'),
    paper: secondary('paper'),
    shield: { cost: DEFENCES.shield.bMult * b, held: session.shields, max: DEFENCES.shield.max },
    wipers: { cost: DEFENCES.wipers.bMult * b, owned: session.wipers },
    umbrella: { cost: DEFENCES.umbrella.bMult * b, owned: session.umbrella },
    pets: Object.entries(PETS).map(([key, pet]) => ({
      key, label: pet.label, perk: pet.perk, cost: pet.bMult * b, owned: state.pets.includes(key),
    })),
    sabotages: Object.entries(SABOTAGES).map(([key, sab]) => ({
      key, label: sab.label, cost: sab.bMult * b, durationMs: sab.durationMs,
    })),
    autos: { count: state.autos, max: AUTO_MAX, cost: AUTO_COST_B * b },
    robo: { owned: state.robo, cost: ROBO_COST_B * b },
    wardrobe: Object.entries(ACCESSORIES).map(([slot, line]) => {
      const level = state.acc[slot] || 0;
      const next = level < line.tiers.length ? line.tiers[level] : null;
      return {
        slot,
        label: line.label,
        level,
        max: line.tiers.length,
        current: level > 0 ? line.tiers[level - 1].label : null,
        next: next ? { label: next.label, perk: next.perk, cost: next.bMult * b } : null,
      };
    }),
    sophisticated: isSophisticated(state),
  };
}

function spend(session, cost) {
  if (session.state.money < cost) return false;
  session.state.money -= cost;
  session.dirty = true;
  return true;
}

function buy(session, item) {
  const state = session.state;
  const b = bOf(state);
  if (item === 'tier') {
    if (state.tier + 1 >= TIERS.length) return { error: 'Diamond is the top — there is nothing above it.' };
    const next = TIERS[state.tier + 1];
    if (!spend(session, next.cost)) return { error: `Need $${next.cost} for the ${next.label} typewriter.` };
    state.tier += 1;
    return { bought: 'tier', tier: next.key, label: next.label, cost: next.cost };
  }
  if (SECONDARIES[item]) {
    const line = SECONDARIES[item];
    const lv = state.up[item];
    if (lv >= line.costs.length) return { error: `${line.label} is maxed.` };
    const cost = line.costs[lv];
    if (!spend(session, cost)) return { error: `Need $${cost} for ${line.label}.` };
    state.up[item] += 1;
    return { bought: item, level: state.up[item], cost };
  }
  if (item === 'shield') {
    if (session.shields >= DEFENCES.shield.max) return { error: 'Shields are stacked to the max.' };
    const cost = DEFENCES.shield.bMult * b;
    if (!spend(session, cost)) return { error: `Need $${cost} for a shield.` };
    session.shields += 1;
    return { bought: 'shield', cost };
  }
  if (item === 'wipers' || item === 'umbrella') {
    if (session[item]) return { error: `You already have ${item}.` };
    const cost = DEFENCES[item].bMult * b;
    if (!spend(session, cost)) return { error: `Need $${cost} for ${DEFENCES[item].label}.` };
    session[item] = true;
    return { bought: item, cost };
  }
  if (PETS[item]) {
    if (state.pets.includes(item)) return { error: 'That pet already lives on your desk.' };
    const cost = PETS[item].bMult * b;
    if (!spend(session, cost)) return { error: `Need $${cost} for the ${PETS[item].label}.` };
    state.pets.push(item);
    return { bought: item, cost };
  }
  if (item === 'auto') {
    if (state.autos >= AUTO_MAX) return { error: 'The classroom is full of assistants.' };
    const cost = AUTO_COST_B * b;
    if (!spend(session, cost)) return { error: `Need $${cost} for an automonkey.` };
    state.autos += 1;
    return { bought: 'auto', count: state.autos, cost };
  }
  if (item === 'robo') {
    if (state.robo) return { error: 'Your robo monkey is already whirring away.' };
    const cost = ROBO_COST_B * b;
    if (!spend(session, cost)) return { error: `Need $${cost} for the robo monkey.` };
    state.robo = true;
    return { bought: 'robo', cost };
  }
  if (item?.startsWith?.('acc:')) {
    const slot = item.slice(4);
    const line = ACCESSORIES[slot];
    if (!line) return { error: 'Unknown accessory.' };
    const level = state.acc[slot] || 0;
    if (level >= line.tiers.length) return { error: `Your ${slot} is already as sophisticated as it gets.` };
    const next = line.tiers[level];
    const cost = next.bMult * b;
    if (!spend(session, cost)) return { error: `Need $${cost} for the ${next.label}.` };
    state.acc[slot] = level + 1;
    return { bought: item, level: state.acc[slot], label: next.label, cost, sophisticated: isSophisticated(state) };
  }
  return { error: 'Unknown item.' };
}

/** Dev/admin cheat: set a wallet outright. The password is checked by the
 * socket layer; this only validates and applies the amount. */
function adminSetMoney(session, amount) {
  const n = Math.round(Number(amount));
  if (!Number.isFinite(n) || n < 0 || n > 10_000_000) {
    return { error: 'Amount must be between 0 and 10,000,000.' };
  }
  session.state.money = n;
  session.dirty = true;
  return { ok: true, money: n };
}

// ── Parties ─────────────────────────────────────────────────────────────────

function randomCode() {
  let code = '';
  for (let i = 0; i < CODE_LENGTH; i += 1) code += CODE_CHARS[crypto.randomInt(CODE_CHARS.length)];
  return code;
}

function allocateCode() {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const code = randomCode();
    if (!rooms.has(code)) return code;
  }
  throw new Error('Could not allocate a party code');
}

function createParty(session, goalWords) {
  const code = allocateCode();
  const goal = Number.isFinite(Number(goalWords)) ? Math.max(0, Math.min(5000, Math.round(Number(goalWords)))) : 0;
  const room = {
    code,
    hostId: session.id,
    goalWords: goal,
    sabotagesOff: false,
    memberIds: new Set([session.id]),
    chat: [],
    createdAt: now(),
    lastActivity: now(),
  };
  rooms.set(code, room);
  session.roomCode = code;
  session.words = 0;
  session.goalHit = false;
  return room;
}

function getRoom(code) {
  return rooms.get(String(code || '').toUpperCase().trim()) || null;
}

function joinParty(code, session) {
  const room = getRoom(code);
  if (!room) return { error: 'No party with that code — check it with your host.' };
  if (room.memberIds.has(session.id)) {
    session.roomCode = room.code;
    room.lastActivity = now();
    return { room, rejoined: true };
  }
  if (room.memberIds.size >= MAX_MEMBERS) return { error: 'That party is full (12 people).' };
  room.memberIds.add(session.id);
  session.roomCode = room.code;
  session.words = 0;
  session.goalHit = false;
  room.lastActivity = now();
  return { room };
}

function leaveParty(session) {
  const room = session.roomCode ? rooms.get(session.roomCode) : null;
  session.roomCode = null;
  if (!room) return null;
  room.memberIds.delete(session.id);
  room.lastActivity = now();
  if (room.memberIds.size === 0) rooms.delete(room.code);
  return room;
}

function setPeace(room, userId, off) {
  if (room.hostId !== String(userId)) return { error: 'Only the host can toggle sabotages.' };
  room.sabotagesOff = !!off;
  return { sabotagesOff: room.sabotagesOff };
}

// ── Sabotage, absorb, theft ─────────────────────────────────────────────────

function sabotage(room, attackerId, targetId, kind) {
  const attacker = getSession(attackerId);
  const target = getSession(targetId);
  const weapon = SABOTAGES[kind];
  if (!attacker || !weapon) return { error: 'Unknown sabotage.' };
  if (!target || !room.memberIds.has(target.id)) return { error: 'They already left.' };
  if (attacker.id === target.id) return { error: 'Sabotaging yourself is a study technique we do not endorse.' };
  if (room.sabotagesOff) return { error: 'The host has declared peace.' };
  const sinceLast = now() - attacker.lastSabotageAt;
  if (sinceLast < SABOTAGE_COOLDOWN_MS) {
    const waitMs = SABOTAGE_COOLDOWN_MS - sinceLast;
    return { error: `Reloading — ${Math.ceil(waitMs / 1000)}s.`, retryInMs: waitMs, scope: 'attacker' };
  }
  const sinceHit = now() - target.lastHitAt;
  if (sinceHit < TARGET_COOLDOWN_MS) {
    const waitMs = TARGET_COOLDOWN_MS - sinceHit;
    return { error: `${target.name} is still recovering — ${Math.ceil(waitMs / 1000)}s.`, retryInMs: waitMs, scope: 'target' };
  }
  const cost = weapon.bMult * bOf(attacker.state);
  if (!spend(attacker, cost)) return { error: `Need $${cost} for ${weapon.label}.` };
  attacker.lastSabotageAt = now();
  room.lastActivity = now();

  // Zen absorb: a watcher can't be touched — and pockets the attacker's spend.
  if (target.watching) {
    target.state.money += cost;
    target.dirty = true;
    return { absorbed: true, kind, cost, attacker, target, reloadMs: SABOTAGE_COOLDOWN_MS };
  }
  if (target.shields > 0) {
    target.shields -= 1;
    return { blocked: 'shield', kind, cost, attacker, target, reloadMs: SABOTAGE_COOLDOWN_MS };
  }
  if (target.umbrella && weapon.bMult <= DEFENCES.umbrella.blocksUpTo && now() >= target.umbrellaReadyAt) {
    target.umbrellaReadyAt = now() + UMBRELLA_COOLDOWN_MS;
    return { blocked: 'umbrella', kind, cost, attacker, target, reloadMs: SABOTAGE_COOLDOWN_MS };
  }
  // A desk cat guards its territory: Cat Deploys get chased straight off.
  if (kind === 'cat' && target.state.pets.includes('catPet')) {
    return { blocked: 'pet', kind, cost, attacker, target, reloadMs: SABOTAGE_COOLDOWN_MS };
  }

  target.lastHitAt = now();
  const snailGuard = target.state.pets.includes('snailPet') ? SNAIL_PET_DURATION_MULT : 1;
  const durationMs = Math.round(weapon.durationMs * (target.wipers ? 0.5 : 1) * snailGuard);
  let stolen = 0;
  if (kind === 'thief') {
    const victimB = bOf(target.state);
    stolen = Math.min(
      Math.round(target.state.money * THIEF_RATE),
      THIEF_CAP_B * victimB,
      Math.max(0, target.state.money - THIEF_FLOOR_B * victimB),
    );
    if (target.state.pets.includes('catPet')) stolen = Math.floor(stolen / 2);
    if (stolen > 0) {
      target.state.money -= stolen;
      attacker.state.money += Math.floor(stolen / 2); // half burns
      target.dirty = true;
      attacker.dirty = true;
    }
  }
  return {
    hit: true, kind, cost, durationMs, stolen, attacker, target,
    reloadMs: SABOTAGE_COOLDOWN_MS, targetCooldownMs: TARGET_COOLDOWN_MS,
  };
}

function gift(room, fromId, toId, kind, presetIndex) {
  const from = getSession(fromId);
  const to = getSession(toId);
  if (!from || !to || !room.memberIds.has(to.id)) return { error: 'They already left.' };
  if (from.id === to.id) return { error: 'That is just moving money between pockets.' };
  if (kind === 'shield') {
    if (from.shields < 1) return { error: 'No shield to give.' };
    if (to.shields >= DEFENCES.shield.max) return { error: `${to.name}'s shields are already stacked.` };
    from.shields -= 1;
    to.shields += 1;
    room.lastActivity = now();
    return { from, to, kind: 'shield' };
  }
  const preset = GIFT_PRESETS[Math.max(0, Math.min(GIFT_PRESETS.length - 1, Math.round(Number(presetIndex) || 0)))];
  const cost = preset * bOf(from.state);
  if (!spend(from, cost)) return { error: 'Not enough in the wallet.' };
  const credited = Math.min(cost, GIFT_RECEIVE_CAP_B * bOf(to.state));
  to.state.money += credited;
  to.dirty = true;
  room.lastActivity = now();
  return { from, to, kind: 'cash', value: credited };
}

// ── Chat (relayed + briefly buffered, never persisted) ──────────────────────

function maskProfanity(text) {
  let out = text;
  for (const term of BLOCKED_TERMS) {
    out = out.replace(new RegExp(term, 'gi'), '✿'.repeat(term.length));
  }
  return out;
}

function addChat(room, userId, text, { system = false } = {}) {
  const session = system ? null : getSession(userId);
  if (!system && (!session || !room.memberIds.has(session.id))) return { error: 'Not in this party.' };
  const clean = maskProfanity(
    String(text || '')
      .replace(/[\p{Cc}\p{Cf}]/gu, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, MAX_CHAT_LENGTH),
  );
  if (!clean) return { error: 'Nothing to send.' };
  const message = { id: crypto.randomUUID(), from: system ? null : session.name, system, text: clean, at: now() };
  room.chat.push(message);
  if (room.chat.length > MAX_CHAT_KEPT) room.chat.splice(0, room.chat.length - MAX_CHAT_KEPT);
  room.lastActivity = now();
  return { message };
}

// ── Snapshots ───────────────────────────────────────────────────────────────

function publicMember(session) {
  return {
    id: session.id,
    name: session.name,
    connected: session.connected,
    watching: session.watching,
    words: session.words,
    para: session.para,
    paraCount: session.paraCount,
    accuracy: session.accuracy,
    money: session.state.money,
    tier: TIERS[session.state.tier].key,
    tierIndex: session.state.tier,
    b: bOf(session.state),
    shields: session.shields,
    wipers: session.wipers,
    umbrella: session.umbrella,
    pets: session.state.pets,
    autos: session.state.autos,
    robo: session.state.robo,
    acc: { ...session.state.acc },
    sophisticated: isSophisticated(session.state),
    goalHit: session.goalHit,
  };
}

/** The player's own full picture: state + shop with live prices. */
function selfSnapshot(session) {
  return {
    me: publicMember(session),
    up: { ...session.state.up },
    meter: session.meter,
    meterFull: STREAK_METER_FULL,
    lifetimeWords: session.state.lifetimeWords,
    shop: shopFor(session),
  };
}

function roomSnapshot(room) {
  return {
    code: room.code,
    hostId: room.hostId,
    goalWords: room.goalWords,
    sabotagesOff: room.sabotagesOff,
    members: [...room.memberIds]
      .map((id) => getSession(id))
      .filter(Boolean)
      .sort((a, b) => b.words - a.words || a.name.localeCompare(b.name))
      .map(publicMember),
    chat: room.chat.slice(-MAX_CHAT_KEPT),
  };
}

// ── Lifecycle ───────────────────────────────────────────────────────────────

function markDisconnected(userId) {
  const session = getSession(userId);
  if (!session) return;
  session.connected = false;
  session.lastSeen = now();
}

/** Reaps dead rooms and idle solo sessions. Sessions with dirty state are
 *  kept until the socket layer has saved them. */
function sweep() {
  const t = now();
  for (const [code, room] of rooms) {
    const idle = t - room.lastActivity > ROOM_IDLE_MS;
    const members = [...room.memberIds].map((id) => getSession(id)).filter(Boolean);
    const allGone = members.every((m) => !m.connected && t - m.lastSeen > ALL_GONE_MS);
    if (idle || members.length === 0 || allGone) {
      for (const m of members) m.roomCode = null;
      rooms.delete(code);
    }
  }
  for (const [id, session] of sessions) {
    if (!session.connected && !session.dirty && !session.roomCode && t - session.lastSeen > ALL_GONE_MS) {
      sessions.delete(id);
    }
  }
}

module.exports = {
  sessions,
  rooms,
  TIERS,
  SECONDARIES,
  SABOTAGES,
  DEFENCES,
  PETS,
  GIFT_PRESETS,
  MAX_MEMBERS,
  normalizeState,
  ensureSession,
  getSession,
  recordProgress,
  shopFor,
  buy,
  adminSetMoney,
  accrueAuto,
  ACCESSORIES,
  AUTO_MAX,
  createParty,
  getRoom,
  joinParty,
  leaveParty,
  setPeace,
  sabotage,
  gift,
  addChat,
  publicMember,
  selfSnapshot,
  roomSnapshot,
  markDisconnected,
  sweep,
};
