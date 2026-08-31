/**
 * Study Party rooms — the shared-memorising lobby behind the /party socket
 * namespace. EVERYTHING here is in-memory on purpose: parties, progress,
 * money and chat live only as long as the party does. Nothing is written to
 * the database, so chat is genuinely ephemeral (a product requirement) and a
 * dead room simply evaporates.
 *
 * The economy is server-authoritative: clients only report landed words;
 * money, upgrade costs, sabotage charges and gifts are all computed here so
 * a devtools user can't print cash.
 */
const crypto = require('crypto');

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // matches Live/Classroom codes
const CODE_LENGTH = 6;
const MAX_MEMBERS = 12;
const MAX_CHAT_KEPT = 40;
const MAX_CHAT_LENGTH = 240;
const MAX_WORDS_PER_REPORT = 60;
const ROOM_IDLE_MS = 60 * 60 * 1000;       // an hour of silence kills the room
const ALL_GONE_MS = 2 * 60 * 1000;          // everyone disconnected 2 min -> gone
const SABOTAGE_COOLDOWN_MS = 8 * 1000;

// The tycoon knobs. Word value starts at $1/word; each Rate level adds $1.
const UPGRADES = {
  rate: { label: 'Word value', baseCost: 40, growth: 2.2, maxLevel: 6 },
  shield: { label: 'Shield', cost: 30, maxHeld: 3 },
};

const SABOTAGES = {
  ink: { cost: 25, durationMs: 7000, label: 'ink' },
  bomb: { cost: 45, durationMs: 6000, label: 'bomb' },
};

const GIFT_MAX = 500;

// Same light profanity mask the Live nicknames use — chat is between mates,
// but this ships publicly.
const BLOCKED_TERMS = [
  'fuck', 'shit', 'bitch', 'cunt', 'nigger', 'nigga', 'faggot', 'retard', 'porn',
];

const rooms = new Map(); // code -> room

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

function now() { return Date.now(); }

function makeMember(userId, name) {
  return {
    id: String(userId),
    name: String(name || 'Student').slice(0, 24),
    connected: true,
    lastSeen: now(),
    words: 0,
    para: 0,
    paraCount: 0,
    accuracy: 100,
    money: 0,
    rateLevel: 0,
    shields: 0,
    goalHit: false,
    lastSabotageAt: 0,
  };
}

function createParty(userId, name, goalWords) {
  const code = allocateCode();
  const goal = Number.isFinite(Number(goalWords)) ? Math.max(0, Math.min(5000, Math.round(Number(goalWords)))) : 0;
  const room = {
    code,
    hostId: String(userId),
    goalWords: goal,
    members: new Map([[String(userId), makeMember(userId, name)]]),
    chat: [],
    createdAt: now(),
    lastActivity: now(),
  };
  rooms.set(code, room);
  return room;
}

function getRoom(code) {
  return rooms.get(String(code || '').toUpperCase().trim()) || null;
}

function joinParty(code, userId, name) {
  const room = getRoom(code);
  if (!room) return { error: 'No party with that code — check it with your host.' };
  const id = String(userId);
  const existing = room.members.get(id);
  if (existing) {
    existing.connected = true;
    existing.lastSeen = now();
    existing.name = String(name || existing.name).slice(0, 24);
    room.lastActivity = now();
    return { room, member: existing, rejoined: true };
  }
  if (room.members.size >= MAX_MEMBERS) return { error: 'That party is full (12 people).' };
  const member = makeMember(id, name);
  room.members.set(id, member);
  room.lastActivity = now();
  return { room, member };
}

function leaveParty(room, userId) {
  room.members.delete(String(userId));
  room.lastActivity = now();
  if (room.members.size === 0) rooms.delete(room.code);
}

function markDisconnected(room, userId) {
  const member = room.members.get(String(userId));
  if (!member) return;
  member.connected = false;
  member.lastSeen = now();
}

function wordValue(member) {
  return 1 + member.rateLevel;
}

/** A landed word pays out; watched words never reach here by design. */
function recordProgress(room, userId, { wordsDelta, para, paraCount, accuracy } = {}) {
  const member = room.members.get(String(userId));
  if (!member) return { error: 'Not in this party.' };
  const delta = Math.max(0, Math.min(MAX_WORDS_PER_REPORT, Math.round(Number(wordsDelta) || 0)));
  member.words += delta;
  member.money += delta * wordValue(member);
  if (Number.isFinite(Number(para))) member.para = Math.max(0, Math.round(Number(para)));
  if (Number.isFinite(Number(paraCount))) member.paraCount = Math.max(0, Math.round(Number(paraCount)));
  if (Number.isFinite(Number(accuracy))) member.accuracy = Math.max(0, Math.min(100, Math.round(Number(accuracy))));
  member.lastSeen = now();
  room.lastActivity = now();
  let goalJustHit = false;
  if (room.goalWords > 0 && !member.goalHit && member.words >= room.goalWords) {
    member.goalHit = true;
    goalJustHit = true;
  }
  return { member, goalJustHit };
}

function upgradeCost(room, userId) {
  const member = room.members.get(String(userId));
  if (!member) return null;
  return Math.round(UPGRADES.rate.baseCost * (UPGRADES.rate.growth ** member.rateLevel));
}

function buyUpgrade(room, userId, item) {
  const member = room.members.get(String(userId));
  if (!member) return { error: 'Not in this party.' };
  room.lastActivity = now();
  if (item === 'rate') {
    if (member.rateLevel >= UPGRADES.rate.maxLevel) return { error: 'Word value is maxed out.' };
    const cost = upgradeCost(room, userId);
    if (member.money < cost) return { error: `Need $${cost} for that.` };
    member.money -= cost;
    member.rateLevel += 1;
    return { member, item, cost };
  }
  if (item === 'shield') {
    if (member.shields >= UPGRADES.shield.maxHeld) return { error: 'Shields are stacked to the max.' };
    if (member.money < UPGRADES.shield.cost) return { error: `Need $${UPGRADES.shield.cost} for a shield.` };
    member.money -= UPGRADES.shield.cost;
    member.shields += 1;
    return { member, item, cost: UPGRADES.shield.cost };
  }
  return { error: 'Unknown upgrade.' };
}

function sabotage(room, attackerId, targetId, kind) {
  const attacker = room.members.get(String(attackerId));
  const target = room.members.get(String(targetId));
  const weapon = SABOTAGES[kind];
  if (!attacker || !weapon) return { error: 'Unknown sabotage.' };
  if (!target) return { error: 'They already left.' };
  if (String(attackerId) === String(targetId)) return { error: 'Sabotaging yourself is a study technique we do not endorse.' };
  const sinceLast = now() - attacker.lastSabotageAt;
  if (sinceLast < SABOTAGE_COOLDOWN_MS) {
    return { error: `Reloading — ${Math.ceil((SABOTAGE_COOLDOWN_MS - sinceLast) / 1000)}s.` };
  }
  if (attacker.money < weapon.cost) return { error: `Need $${weapon.cost} for ${weapon.label}.` };
  attacker.money -= weapon.cost;
  attacker.lastSabotageAt = now();
  room.lastActivity = now();
  if (target.shields > 0) {
    target.shields -= 1;
    return { blocked: true, kind, attacker, target };
  }
  return { blocked: false, kind, durationMs: weapon.durationMs, attacker, target };
}

function gift(room, fromId, toId, amount) {
  const from = room.members.get(String(fromId));
  const to = room.members.get(String(toId));
  if (!from || !to) return { error: 'They already left.' };
  if (String(fromId) === String(toId)) return { error: 'That is just moving money between pockets.' };
  const value = Math.round(Number(amount) || 0);
  if (value < 1 || value > GIFT_MAX) return { error: `Gifts are $1–$${GIFT_MAX}.` };
  if (from.money < value) return { error: 'Not enough in the wallet.' };
  from.money -= value;
  to.money += value;
  room.lastActivity = now();
  return { from, to, value };
}

function maskProfanity(text) {
  let out = text;
  for (const term of BLOCKED_TERMS) {
    out = out.replace(new RegExp(term, 'gi'), '✿'.repeat(term.length));
  }
  return out;
}

/** Chat is relayed and briefly buffered for late joiners — never persisted. */
function addChat(room, userId, text, { system = false } = {}) {
  const member = system ? null : room.members.get(String(userId));
  if (!system && !member) return { error: 'Not in this party.' };
  const clean = maskProfanity(
    String(text || '')
      .replace(/[\p{Cc}\p{Cf}]/gu, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, MAX_CHAT_LENGTH),
  );
  if (!clean) return { error: 'Nothing to send.' };
  const message = {
    id: crypto.randomUUID(),
    from: system ? null : member.name,
    system,
    text: clean,
    at: now(),
  };
  room.chat.push(message);
  if (room.chat.length > MAX_CHAT_KEPT) room.chat.splice(0, room.chat.length - MAX_CHAT_KEPT);
  room.lastActivity = now();
  return { message };
}

/** The wire shape. Members sorted by words so the roster reads as a race. */
function snapshot(room) {
  return {
    code: room.code,
    hostId: room.hostId,
    goalWords: room.goalWords,
    members: [...room.members.values()]
      .sort((a, b) => b.words - a.words || a.name.localeCompare(b.name))
      .map((m) => ({
        id: m.id,
        name: m.name,
        connected: m.connected,
        words: m.words,
        para: m.para,
        paraCount: m.paraCount,
        accuracy: m.accuracy,
        money: m.money,
        rateLevel: m.rateLevel,
        wordValue: wordValue(m),
        shields: m.shields,
        goalHit: m.goalHit,
      })),
    chat: room.chat.slice(-MAX_CHAT_KEPT),
  };
}

/** Reaps rooms nobody is in any more. Called on an interval by the socket layer. */
function sweepRooms() {
  const t = now();
  for (const [code, room] of rooms) {
    const idle = t - room.lastActivity > ROOM_IDLE_MS;
    const allGone = [...room.members.values()].every((m) => !m.connected && t - m.lastSeen > ALL_GONE_MS);
    if (idle || room.members.size === 0 || allGone) rooms.delete(code);
  }
}

module.exports = {
  rooms,
  createParty,
  getRoom,
  joinParty,
  leaveParty,
  markDisconnected,
  recordProgress,
  upgradeCost,
  buyUpgrade,
  sabotage,
  gift,
  addChat,
  snapshot,
  sweepRooms,
  UPGRADES,
  SABOTAGES,
  SABOTAGE_COOLDOWN_MS,
  MAX_MEMBERS,
};
