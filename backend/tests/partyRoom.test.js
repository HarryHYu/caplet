/**
 * Typewriter Tycoon economy — server-authoritative, pure in-memory module.
 * These tests pin the audited balance numbers and every anti-exploit clamp.
 */
const tycoon = require('../realtime/partyRoom');

afterEach(() => {
  tycoon.rooms.clear();
  tycoon.sessions.clear();
});

const player = (id, name, state) => tycoon.ensureSession(id, name, state);
const progress = (session, words, extra = {}) => tycoon.recordProgress(session, { wordsDelta: words, ...extra });

describe('earning', () => {
  it('pays b per word by tier, credits lifetime words, and marks dirty for saving', () => {
    const me = player('u1', 'Harry');
    const r = progress(me, 10);
    expect(r.earned).toBe(10); // stone: $1/word
    expect(me.state.money).toBe(10);
    expect(me.state.lifetimeWords).toBe(10);
    expect(me.dirty).toBe(true);

    const rich = player('u2', 'Rich', { tier: 7 }); // diamond
    expect(progress(rich, 10).earned).toBe(550); // $55/word
  });

  it('token-buckets credited words to 45/min — no devtools money printer', () => {
    const me = player('u1', 'Harry');
    const first = progress(me, 60);
    expect(first.words).toBe(45); // full bucket, then dry
    const second = progress(me, 30);
    expect(second.words).toBeLessThanOrEqual(1); // bucket refills at 45/min
  });

  it('the streak engine ramps with the meter and misses halve it', () => {
    const me = player('u1', 'Harry', { tier: 0, up: { streak: 5, ribbon: 0, paper: 0 } });
    progress(me, 20); // meter -> 20 (full)
    expect(me.meter).toBe(20);
    // At full meter with streak L5, each word pays round(1 * 1.5) = $2 (rounded).
    const wasMoney = me.state.money;
    const r = progress(me, 5);
    expect(r.earned).toBeGreaterThanOrEqual(9); // ~1.5x on $1 words, rounded up
    expect(me.state.money).toBe(wasMoney + r.earned);
    progress(me, 0, { missesDelta: 1 });
    expect(me.meter).toBe(10); // halved, not zeroed
  });

  it('paper feed pays the paragraph lump: 8b x level per pass', () => {
    const me = player('u1', 'Harry', { tier: 3, up: { streak: 0, ribbon: 0, paper: 2 } }); // iron b=7
    const r = progress(me, 0, { paragraphsDelta: 1 });
    expect(r.paperLump).toBe(8 * 7 * 2); // $112
    expect(me.state.money).toBe(112);
  });

  it('ribbon crits exist and stay bounded', () => {
    const me = player('u1', 'Harry', { tier: 7, up: { streak: 5, ribbon: 4, paper: 0 } });
    me.meter = 20;
    // 45 words at 5% crit — over several buckets, crits should appear; every
    // single word's pay stays under the b*10*1.5 hard bound.
    let crits = 0;
    for (let i = 0; i < 4; i += 1) {
      me.bucket = { tokens: 45, ts: Date.now() };
      const r = progress(me, 45);
      crits += r.crits;
      expect(r.earned).toBeLessThanOrEqual(45 * 55 * 15);
    }
    expect(crits).toBeGreaterThan(0);
  });
});

describe('the shop', () => {
  it('sells the tier ladder at the audited prices', () => {
    const me = player('u1', 'Harry');
    me.state.money = 70;
    expect(tycoon.buy(me, 'tier')).toMatchObject({ bought: 'tier', tier: 'wood', cost: 70 });
    expect(me.state.money).toBe(0);
    expect(tycoon.buy(me, 'tier').error).toMatch(/Need \$350/);
    me.state.tier = 7;
    expect(tycoon.buy(me, 'tier').error).toMatch(/Diamond is the top/);
  });

  it('sells secondaries level by level and stops at max', () => {
    const me = player('u1', 'Harry');
    me.state.money = 10000;
    expect(tycoon.buy(me, 'streak')).toMatchObject({ bought: 'streak', level: 1, cost: 30 });
    expect(tycoon.buy(me, 'ribbon')).toMatchObject({ level: 1, cost: 120 });
    expect(tycoon.buy(me, 'paper')).toMatchObject({ level: 1, cost: 110 });
    me.state.up.paper = 3;
    expect(tycoon.buy(me, 'paper').error).toMatch(/maxed/i);
  });

  it('prices defences and pets in the buyer own b', () => {
    const me = player('u1', 'Harry', { tier: 2 }); // copper b=4
    me.state.money = 1000;
    expect(tycoon.buy(me, 'shield')).toMatchObject({ cost: 80 });   // 20b
    expect(tycoon.buy(me, 'wipers')).toMatchObject({ cost: 300 });  // 75b
    expect(tycoon.buy(me, 'catPet')).toMatchObject({ cost: 360 }); // 90b
    expect(me.wipers).toBe(true);
    expect(me.state.pets).toContain('catPet');
    expect(tycoon.buy(me, 'catPet').error).toMatch(/already lives/);
    const shop = tycoon.shopFor(me);
    expect(shop.umbrella.cost).toBe(400); // 100b
    expect(shop.sabotages.find((s) => s.key === 'ink').cost).toBe(56); // 14b
  });
});

describe('parties and warfare', () => {
  const setUpDuel = () => {
    const a = player('u1', 'Harry');
    const b = player('u2', 'Alex');
    const room = tycoon.createParty(a, 80);
    tycoon.joinParty(room.code, b);
    return { a, b, room };
  };

  it('sabotage pays the attacker b-scaled price and lands with duration', () => {
    const { a, b, room } = setUpDuel();
    a.state.money = 1000;
    const r = tycoon.sabotage(room, 'u1', 'u2', 'ink');
    expect(r.hit).toBe(true);
    expect(r.cost).toBe(14); // 14 x stone b
    expect(r.durationMs).toBe(7000);
    expect(a.state.money).toBe(986);
    expect(b.lastHitAt).toBeGreaterThan(0);
  });

  it('richer attackers pay more for the same weapon', () => {
    const { a, room } = setUpDuel();
    a.state.tier = 7; // diamond b=55
    a.state.money = 10000;
    const r = tycoon.sabotage(room, 'u1', 'u2', 'ink');
    expect(r.cost).toBe(14 * 55);
  });

  it('cooldowns: 8s per attacker, 20s per victim', () => {
    const { a, b, room } = setUpDuel();
    const c = player('u3', 'Cam');
    tycoon.joinParty(room.code, c);
    a.state.money = 1000; c.state.money = 1000;
    tycoon.sabotage(room, 'u1', 'u2', 'confetti');
    expect(tycoon.sabotage(room, 'u1', 'u2', 'confetti').error).toMatch(/Reloading/);
    // A different attacker still can't chain the same victim.
    expect(tycoon.sabotage(room, 'u3', 'u2', 'confetti').error).toMatch(/recovering/);
    expect(b.shields).toBe(0);
  });

  it('shield, umbrella and wipers each do their one job', () => {
    const { a, b, room } = setUpDuel();
    a.state.money = 10000; b.state.money = 10000;
    tycoon.buy(b, 'shield');
    tycoon.buy(b, 'umbrella');
    tycoon.buy(b, 'wipers');
    // Shield eats the first hit of any size.
    expect(tycoon.sabotage(room, 'u1', 'u2', 'bomb').blocked).toBe('shield');
    a.lastSabotageAt = 0; b.lastHitAt = 0;
    // Umbrella auto-blocks cheap attacks (<= 18b)...
    expect(tycoon.sabotage(room, 'u1', 'u2', 'jelly').blocked).toBe('umbrella');
    a.lastSabotageAt = 0; b.lastHitAt = 0;
    // ...but is on cooldown right after, and never blocks the dear ones.
    const hit = tycoon.sabotage(room, 'u1', 'u2', 'fog');
    expect(hit.hit).toBe(true);
    expect(hit.durationMs).toBe(4000); // wipers halve 8s fog
  });

  it('watch mode absorbs the attack and pockets the spend', () => {
    const { a, b, room } = setUpDuel();
    a.state.money = 1000;
    tycoon.recordProgress(b, { watching: true });
    const r = tycoon.sabotage(room, 'u1', 'u2', 'bomb');
    expect(r.absorbed).toBe(true);
    expect(b.state.money).toBe(30); // the attacker's whole spend, as a bounty
    expect(a.state.money).toBe(970);
    expect(b.lastHitAt).toBe(0); // no hit ever landed
  });

  it('the word thief steals 8% capped, half burns, floor protected', () => {
    const { a, b, room } = setUpDuel();
    a.state.money = 1000;
    b.state.money = 500;
    const r = tycoon.sabotage(room, 'u1', 'u2', 'thief');
    expect(r.stolen).toBe(40); // 8% of 500, under cap 40x1
    expect(b.state.money).toBe(460);
    expect(a.state.money).toBe(1000 - 55 + 20); // paid 55b(=55), got half of 40
    // Floor: a broke victim can't be dragged below 15b.
    a.lastSabotageAt = 0; b.lastHitAt = 0;
    b.state.money = 16;
    const r2 = tycoon.sabotage(room, 'u1', 'u2', 'thief');
    expect(r2.stolen).toBe(1);
    expect(b.state.money).toBe(15);
  });

  it('host peace toggle turns warfare off for everyone but the host controls it', () => {
    const { a, room } = setUpDuel();
    a.state.money = 100;
    expect(tycoon.setPeace(room, 'u2', true).error).toMatch(/Only the host/);
    tycoon.setPeace(room, 'u1', true);
    expect(tycoon.sabotage(room, 'u1', 'u2', 'confetti').error).toMatch(/peace/i);
    tycoon.setPeace(room, 'u1', false);
    expect(tycoon.sabotage(room, 'u1', 'u2', 'confetti').hit).toBe(true);
  });

  it('gifts cash (receiver-capped) and shields', () => {
    const { a, b, room } = setUpDuel();
    a.state.tier = 7; // diamond sender
    a.state.money = 10000;
    a.shields = 1;
    const r = tycoon.gift(room, 'u1', 'u2', 'cash', 2); // 50b = $2750 face
    expect(r.value).toBe(60); // capped at 60 x receiver's stone b
    expect(b.state.money).toBe(60);
    expect(a.state.money).toBe(10000 - 2750);
    const s = tycoon.gift(room, 'u1', 'u2', 'shield');
    expect(s.kind).toBe('shield');
    expect(a.shields).toBe(0);
    expect(b.shields).toBe(1);
  });

  it('goal announces once; roster sorts by session words', () => {
    const { a, b, room } = setUpDuel();
    b.bucket = { tokens: 45, ts: Date.now() };
    expect(tycoon.recordProgress(b, { wordsDelta: 45 }).goalJustHit).toBe(false);
    b.bucket = { tokens: 45, ts: Date.now() };
    const hit = tycoon.recordProgress(b, { wordsDelta: 45 });
    expect(hit.goalJustHit).toBe(true); // 90 words >= the 80-word goal
    const snap = tycoon.roomSnapshot(room);
    expect(snap.members[0].id).toBe('u2');
    expect(snap.members[0].tier).toBe('stone');
    expect(snap.goalWords).toBe(80);
    void a;
  });

  it('persistence: state survives a reconnect, chat does not survive the room', () => {
    const me = player('u1', 'Harry');
    me.state.money = 999; me.state.tier = 3;
    const saved = JSON.parse(JSON.stringify(me.state));
    tycoon.sessions.clear();
    const back = player('u1', 'Harry', saved);
    expect(back.state.money).toBe(999);
    expect(back.state.tier).toBe(3);
    expect(back.shields).toBe(0); // per-run gear resets

    const room = tycoon.createParty(back, 0);
    tycoon.addChat(room, 'u1', 'ephemeral!');
    tycoon.leaveParty(back);
    expect(tycoon.getRoom(room.code)).toBeNull();
  });

  it('normalizeState refuses garbage', () => {
    const s = tycoon.normalizeState({ money: -50, tier: 99, up: { streak: 42 }, pets: ['nonsense', 'catPet'] });
    expect(s.money).toBe(0);
    expect(s.tier).toBe(7);
    expect(s.up.streak).toBe(5);
    expect(s.pets).toEqual(['catPet']);
  });
});

describe('chat and sweep', () => {
  it('chat is sanitised, masked, capped at 40', () => {
    const a = player('u1', 'Harry');
    const room = tycoon.createParty(a, 0);
    expect(tycoon.addChat(room, 'u1', '  hello   there ').message.text).toBe('hello there');
    expect(tycoon.addChat(room, 'u1', 'well fuck').message.text).toBe('well ✿✿✿✿');
    for (let i = 0; i < 60; i += 1) tycoon.addChat(room, 'u1', `m${i}`);
    expect(room.chat.length).toBeLessThanOrEqual(40);
  });

  it('sweep reaps abandoned rooms and clean idle sessions, keeps dirty ones', () => {
    const a = player('u1', 'Harry');
    const room = tycoon.createParty(a, 0);
    tycoon.markDisconnected('u1');
    a.lastSeen = Date.now() - 10 * 60 * 1000;
    a.dirty = true;
    tycoon.sweep();
    expect(tycoon.getRoom(room.code)).toBeNull();
    expect(tycoon.getSession('u1')).not.toBeNull(); // dirty = awaiting save
    a.dirty = false;
    a.roomCode = null;
    tycoon.sweep();
    expect(tycoon.getSession('u1')).toBeNull();
  });
});

describe('round 2: cooldown metadata, pet perks, admin', () => {
  const duel = () => {
    const a = player('u1', 'Harry');
    const b = player('u2', 'Alex');
    const room = tycoon.createParty(a, 0);
    tycoon.joinParty(room.code, b);
    a.state.money = 1000;
    return { a, b, room };
  };

  it('sabotage acks carry the cooldown windows; rejections carry retry info', () => {
    const { a, room } = duel();
    const hit = tycoon.sabotage(room, 'u1', 'u2', 'confetti');
    expect(hit.reloadMs).toBe(15000); // calm cadence: study first, mischief second
    expect(hit.targetCooldownMs).toBe(45000);
    const reloading = tycoon.sabotage(room, 'u1', 'u2', 'confetti');
    expect(reloading.scope).toBe('attacker');
    expect(reloading.retryInMs).toBeGreaterThan(0);
    expect(reloading.retryInMs).toBeLessThanOrEqual(15000);
    a.lastSabotageAt = 0; // reload done, but the victim is still recovering
    const recovering = tycoon.sabotage(room, 'u1', 'u2', 'confetti');
    expect(recovering.scope).toBe('target');
    expect(recovering.retryInMs).toBeGreaterThan(15000);
    expect(recovering.retryInMs).toBeLessThanOrEqual(45000);
  });

  it('the desk dragon pays +10% per word (visible above stone rounding)', () => {
    const plain = player('u1', 'Harry', { tier: 3 }); // iron b=7
    const lord = player('u2', 'Draco', { tier: 3, pets: ['dragonPet'] });
    expect(progress(plain, 10).earned).toBe(70);
    expect(progress(lord, 10).earned).toBe(80); // round(7 * 1.1) = 8 per word
  });

  it('the desk snail shortens incoming hit durations by 20%', () => {
    const { b, room } = duel();
    b.state.pets = ['snailPet'];
    const r = tycoon.sabotage(room, 'u1', 'u2', 'ink');
    expect(r.hit).toBe(true);
    expect(r.durationMs).toBe(7000 * 0.8);
  });

  it('the desk cat chases off Cat Deploys and halves the word thief', () => {
    const { a, b, room } = duel();
    b.state.pets = ['catPet'];
    b.state.money = 500;
    const chased = tycoon.sabotage(room, 'u1', 'u2', 'cat');
    expect(chased.blocked).toBe('pet');
    expect(b.lastHitAt).toBe(0); // never landed
    a.lastSabotageAt = 0;
    const theft = tycoon.sabotage(room, 'u1', 'u2', 'thief');
    expect(theft.stolen).toBe(20); // 8% of 500 = 40, cat halves it
    expect(b.state.money).toBe(480);
  });

  it('adminSetMoney sets and clamps; junk is rejected', () => {
    const me = player('u1', 'Harry');
    expect(tycoon.adminSetMoney(me, 5000)).toEqual({ ok: true, money: 5000 });
    expect(me.state.money).toBe(5000);
    expect(me.dirty).toBe(true);
    expect(tycoon.adminSetMoney(me, -5).error).toMatch(/between/);
    expect(tycoon.adminSetMoney(me, 999999999).error).toMatch(/between/);
    expect(tycoon.adminSetMoney(me, 'lol').error).toMatch(/between/);
    expect(me.state.money).toBe(5000); // junk never applied
  });
});

describe('arena: automonkeys, robo, hats', () => {
  it('ten automonkeys earn exactly half of honest 45wpm typing', () => {
    const me = player('u1', 'Harry', { tier: 0, autos: 10 });
    me.autoTs = Date.now() - 60 * 1000; // one banked minute
    const earned = tycoon.accrueAuto(me);
    expect(earned).toBe(22); // 10 x 2.25b = 22.5/min, floor; carry keeps the rest
    expect(me.autoCarry).toBeCloseTo(0.5, 5);
    expect(me.state.money).toBe(22);
    expect(me.dirty).toBe(true);
  });

  it('the robo monkey works like three automonkeys', () => {
    const me = player('u1', 'Harry', { tier: 0, robo: true });
    me.autoTs = Date.now() - 60 * 1000;
    expect(tycoon.accrueAuto(me)).toBe(6); // 3 x 2.25 = 6.75, floor 6
  });

  it('a sleeping laptop cannot cash the whole nap', () => {
    const me = player('u1', 'Harry', { tier: 0, autos: 10 });
    me.autoTs = Date.now() - 60 * 60 * 1000; // an hour away
    expect(tycoon.accrueAuto(me)).toBe(112); // capped at 5 banked minutes: 22.5 x 5
  });

  it('automonkeys cost 250b, cap at 10; the robo costs 1500b, once', () => {
    const me = player('u1', 'Harry', { tier: 1 }); // wood b=2
    me.state.money = 100000;
    expect(tycoon.buy(me, 'auto')).toMatchObject({ bought: 'auto', count: 1, cost: 500 });
    me.state.autos = 10;
    expect(tycoon.buy(me, 'auto').error).toMatch(/full of assistants/);
    expect(tycoon.buy(me, 'robo')).toMatchObject({ bought: 'robo', cost: 3000 });
    expect(tycoon.buy(me, 'robo').error).toMatch(/already whirring/);
  });

  it('the wardrobe upgrades slot by slot and the perks apply', () => {
    const me = player('u1', 'Harry', { tier: 7 }); // diamond b=55 makes +2% visible
    me.state.money = 1000000;
    expect(tycoon.buy(me, 'acc:head')).toMatchObject({ bought: 'acc:head', level: 1, label: 'Flat cap', cost: 60 * 55 });
    expect(progress(me, 10).earned).toBe(560); // round(55 x 1.02) = 56 per word
    tycoon.buy(me, 'acc:head'); tycoon.buy(me, 'acc:head'); // top hat, then crown
    expect(me.state.acc.head).toBe(3);
    expect(tycoon.buy(me, 'acc:head').error).toMatch(/as sophisticated as it gets/);
    // Eyes soften misses: gold monocle keeps 80% of the meter.
    const eyes = player('u2', 'Alex', { acc: { head: 0, eyes: 3, body: 0 } });
    eyes.meter = 20;
    tycoon.recordProgress(eyes, { missesDelta: 1 });
    expect(eyes.meter).toBe(16); // floor(20 x 0.8), not halved
    // Body fattens paragraph lumps: waistcoat is +25%.
    const suit = player('u3', 'Cam', { tier: 3, up: { streak: 0, ribbon: 0, paper: 2 }, acc: { head: 0, eyes: 0, body: 2 } });
    expect(tycoon.recordProgress(suit, { paragraphsDelta: 1 }).paperLump).toBe(140); // 8x7x2 x 1.25
  });

  it('the fully dressed monkey is Sophisticated: +5% on top, flagged for all', () => {
    const sir = player('u1', 'Sir Harry', { tier: 7, acc: { head: 3, eyes: 3, body: 3 } });
    expect(tycoon.publicMember(sir).sophisticated).toBe(true);
    // crown 1.10 x sophistication 1.05 on diamond: round(55 x 1.155) = 64.
    expect(progress(sir, 10).earned).toBe(640);
    const scruff = player('u2', 'Alex', { acc: { head: 3, eyes: 3, body: 2 } });
    expect(tycoon.publicMember(scruff).sophisticated).toBe(false);
  });

  it('roster rows carry autos, robo and the outfit for the classroom scene', () => {
    const me = player('u1', 'Harry', { autos: 3, robo: true, acc: { head: 2, eyes: 1, body: 0 } });
    const row = tycoon.publicMember(me);
    expect(row).toMatchObject({ autos: 3, robo: true, acc: { head: 2, eyes: 1, body: 0 }, sophisticated: false });
  });
});
