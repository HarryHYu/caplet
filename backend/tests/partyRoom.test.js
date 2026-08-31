/**
 * Study Party room logic — the server-authoritative economy. No sockets,
 * no DB: partyRoom is a pure in-memory module, which is the whole point
 * (chat and progress must not outlive the party).
 */
const party = require('../realtime/partyRoom');

afterEach(() => {
  party.rooms.clear();
});

function twoPersonParty(goalWords = 0) {
  const room = party.createParty('u1', 'Harry', goalWords);
  party.joinParty(room.code, 'u2', 'Alex');
  return room;
}

describe('party rooms', () => {
  it('creates a joinable room with an unambiguous code and caps membership', () => {
    const room = party.createParty('u1', 'Harry', 200);
    expect(room.code).toMatch(/^[A-HJ-NP-Z2-9]{6}$/);
    expect(room.goalWords).toBe(200);
    for (let i = 2; i <= party.MAX_MEMBERS; i += 1) {
      expect(party.joinParty(room.code, `u${i}`, `P${i}`).member).toBeTruthy();
    }
    expect(party.joinParty(room.code, 'u99', 'Late').error).toMatch(/full/i);
    expect(party.joinParty('NOPE99', 'u1', 'Harry').error).toMatch(/No party/i);
    // Rejoining reconnects instead of duplicating.
    const again = party.joinParty(room.code, 'u2', 'P2');
    expect(again.rejoined).toBe(true);
    expect(room.members.size).toBe(party.MAX_MEMBERS);
  });

  it('pays $1 per landed word, scaled by the Word value upgrade', () => {
    const room = twoPersonParty();
    party.recordProgress(room, 'u1', { wordsDelta: 40, para: 1, paraCount: 4, accuracy: 92 });
    let me = room.members.get('u1');
    expect(me.words).toBe(40);
    expect(me.money).toBe(40);

    // First rate upgrade costs 40 — exactly affordable — and doubles pay.
    const buy = party.buyUpgrade(room, 'u1', 'rate');
    expect(buy.cost).toBe(40);
    me = room.members.get('u1');
    expect(me.money).toBe(0);
    party.recordProgress(room, 'u1', { wordsDelta: 10 });
    expect(room.members.get('u1').money).toBe(20); // $2/word now

    // Costs escalate; broke players are refused.
    expect(party.buyUpgrade(room, 'u1', 'rate').error).toMatch(/Need \$/);
    // Reported deltas are clamped so a devtools user can't print money.
    party.recordProgress(room, 'u2', { wordsDelta: 100000 });
    expect(room.members.get('u2').words).toBeLessThanOrEqual(60);
  });

  it('announces the goal exactly once per member', () => {
    const room = twoPersonParty(50);
    expect(party.recordProgress(room, 'u1', { wordsDelta: 49 }).goalJustHit).toBe(false);
    expect(party.recordProgress(room, 'u1', { wordsDelta: 1 }).goalJustHit).toBe(true);
    expect(party.recordProgress(room, 'u1', { wordsDelta: 10 }).goalJustHit).toBe(false);
  });

  it('sabotage costs money, respects cooldown, and shields eat hits', () => {
    const room = twoPersonParty();
    party.recordProgress(room, 'u1', { wordsDelta: 60 }); // $60
    party.recordProgress(room, 'u2', { wordsDelta: 30 }); // $30
    party.buyUpgrade(room, 'u2', 'shield');

    // Shield eats the first ink; attacker still pays.
    const first = party.sabotage(room, 'u1', 'u2', 'ink');
    expect(first.blocked).toBe(true);
    expect(room.members.get('u1').money).toBe(35);
    expect(room.members.get('u2').shields).toBe(0);

    // Cooldown blocks the immediate follow-up.
    expect(party.sabotage(room, 'u1', 'u2', 'ink').error).toMatch(/Reloading/);

    // After cooldown, the hit lands with its duration.
    room.members.get('u1').lastSabotageAt = 0;
    const second = party.sabotage(room, 'u1', 'u2', 'ink');
    expect(second.blocked).toBe(false);
    expect(second.durationMs).toBeGreaterThan(0);

    // No self-harm, no ghosts, no free weapons.
    room.members.get('u1').lastSabotageAt = 0;
    expect(party.sabotage(room, 'u1', 'u1', 'ink').error).toBeTruthy();
    expect(party.sabotage(room, 'u1', 'ghost', 'ink').error).toBeTruthy();
    expect(party.sabotage(room, 'u2', 'u1', 'bomb').error).toMatch(/Need \$/);
  });

  it('gifts move real money and refuse nonsense amounts', () => {
    const room = twoPersonParty();
    party.recordProgress(room, 'u1', { wordsDelta: 20 });
    expect(party.gift(room, 'u1', 'u2', 15).value).toBe(15);
    expect(room.members.get('u1').money).toBe(5);
    expect(room.members.get('u2').money).toBe(15);
    expect(party.gift(room, 'u1', 'u2', 50).error).toMatch(/Not enough/);
    expect(party.gift(room, 'u1', 'u2', 0).error).toBeTruthy();
    expect(party.gift(room, 'u1', 'u1', 5).error).toBeTruthy();
  });

  it('chat is sanitised, masked, capped — and lives only in the room object', () => {
    const room = twoPersonParty();
    const sent = party.addChat(room, 'u1', '  hello   there  ');
    expect(sent.message.text).toBe('hello there');
    expect(sent.message.from).toBe('Harry');
    expect(party.addChat(room, 'u1', 'well fuck').message.text).toBe('well ✿✿✿✿');
    expect(party.addChat(room, 'u1', '   ').error).toBeTruthy();
    for (let i = 0; i < 60; i += 1) party.addChat(room, 'u2', `msg ${i}`);
    expect(room.chat.length).toBeLessThanOrEqual(40);
    // Ephemerality: killing the room erases the chat with it.
    party.leaveParty(room, 'u1');
    party.leaveParty(room, 'u2');
    expect(party.getRoom(room.code)).toBeNull();
  });

  it('sweeps rooms whose members are all long gone', () => {
    const room = twoPersonParty();
    party.markDisconnected(room, 'u1');
    party.markDisconnected(room, 'u2');
    for (const m of room.members.values()) m.lastSeen = Date.now() - 10 * 60 * 1000;
    party.sweepRooms();
    expect(party.getRoom(room.code)).toBeNull();
  });

  it('snapshots rank members by words and expose the tycoon numbers', () => {
    const room = twoPersonParty(100);
    party.recordProgress(room, 'u2', { wordsDelta: 30, accuracy: 88 });
    const snap = party.snapshot(room);
    expect(snap.members[0].name).toBe('Alex');
    expect(snap.members[0].wordValue).toBe(1);
    expect(snap.members[0].accuracy).toBe(88);
    expect(snap.goalWords).toBe(100);
    expect(Array.isArray(snap.chat)).toBe(true);
  });
});
