/**
 * Typewriter Tycoon + Study Party — the /party Socket.IO namespace.
 * Logged-in users only. The economy lives in partyRoom.js (pure, in-memory);
 * this layer does auth, persistence (TycoonState — debounced saves of each
 * player's game state), and the wire protocol.
 *
 * Client -> server (ack callbacks throughout):
 *   tycoon:hello    {}                          -> {ok, self}          load my saved game
 *   tycoon:progress {wordsDelta, missesDelta, paragraphsDelta, para,
 *                    paraCount, accuracy, watching}
 *                                               -> {ok, earned, crits, jackpot, meter, self}
 *   tycoon:buy      {item}                      -> {ok, self} | {error}
 *   tycoon:admin    {password, money}           -> {ok, self} | {error}   dev cheat, TYCOON_ADMIN_PASSWORD (default "test")
 *   party:create    {goalWords}                 -> {ok, you, self, snapshot}
 *   party:join      {code}                      -> {ok, you, self, snapshot}
 *   party:leave     {}                          -> {ok}
 *   party:peace     {off}                       -> {ok} host only
 *   party:chat      {text}
 *   party:sabotage  {target, kind}              -> {ok, outcome}
 *   party:gift      {target, kind:'cash'|'shield', preset}
 * Server -> client:
 *   party:state     room snapshot     party:chat one message
 *   party:hit       {kind, from, durationMs}    (you got got)
 *   party:blocked   {kind, from, how:'shield'|'umbrella'|'absorbed', bounty?}
 */
const jwt = require('jsonwebtoken');
const { User, TycoonState } = require('../models');
const { JWT_SECRET } = require('../middleware/auth');
const partyRoom = require('./partyRoom');

const SAVE_INTERVAL_MS = 10 * 1000;

function displayName(user) {
  const first = String(user.firstName || '').trim();
  const last = String(user.lastName || '').trim();
  if (first && last) return `${first} ${last[0]}.`;
  return first || 'Student';
}

async function loadState(userId) {
  try {
    const row = await TycoonState.findByPk(userId);
    return row ? row.state : null;
  } catch {
    return null;
  }
}

async function saveSession(session) {
  if (!session.dirty) return;
  session.dirty = false;
  try {
    await TycoonState.upsert({ userId: session.id, state: session.state });
  } catch {
    session.dirty = true; // retry on the next sweep
  }
}

function attachPartySocket(io) {
  const party = io.of('/party');

  party.use(async (socket, next) => {
    try {
      const { token } = socket.handshake.auth || {};
      if (!token) return next(new Error('unauthorized'));
      const decoded = jwt.verify(token, JWT_SECRET);
      if (!decoded?.userId) return next(new Error('unauthorized'));
      const user = await User.findByPk(decoded.userId);
      if (!user) return next(new Error('unauthorized'));
      socket.data.userId = String(user.id);
      socket.data.name = displayName(user);
      return next();
    } catch {
      return next(new Error('unauthorized'));
    }
  });

  const broadcastState = (room) => {
    party.to(room.code).emit('party:state', partyRoom.roomSnapshot(room));
  };

  const systemChat = (room, text) => {
    const result = partyRoom.addChat(room, null, text, { system: true });
    if (result.message) party.to(room.code).emit('party:chat', result.message);
  };

  const emitToMember = (room, memberId, event, payload) => {
    for (const s of party.sockets.values()) {
      if (s.data.userId === String(memberId)) s.emit(event, payload);
    }
  };

  party.on('connection', (socket) => {
    const mySession = () => partyRoom.getSession(socket.data.userId);
    const myRoom = () => {
      const session = mySession();
      return session?.roomCode ? partyRoom.getRoom(session.roomCode) : null;
    };

    // Automonkeys earn while the tab is open: accrue every 15s and tell the
    // owner so their wallet ticks up on screen.
    const autoTimer = setInterval(() => {
      const session = mySession();
      if (!session || !session.connected) return;
      const earned = partyRoom.accrueAuto(session);
      if (earned > 0) {
        socket.emit('tycoon:auto', { earned, self: partyRoom.selfSnapshot(session) });
        const room = myRoom();
        if (room) broadcastState(room);
      }
    }, 15 * 1000);
    autoTimer.unref?.();

    socket.on('tycoon:hello', async (_payload, cb) => {
      try {
        const persisted = await loadState(socket.data.userId);
        const session = partyRoom.ensureSession(socket.data.userId, socket.data.name, persisted);
        session.autoTs = Date.now(); // idle time away never pays out
        let snapshot;
        if (session.roomCode) {
          socket.join(session.roomCode); // reconnect into my party
          const room = partyRoom.getRoom(session.roomCode);
          if (room) snapshot = partyRoom.roomSnapshot(room);
        }
        cb?.({ ok: true, self: partyRoom.selfSnapshot(session), snapshot });
      } catch {
        cb?.({ error: 'Could not load your game.' });
      }
    });

    socket.on('tycoon:progress', (payload, cb) => {
      const session = mySession();
      if (!session) return cb?.({ error: 'Say hello first.' });
      const result = partyRoom.recordProgress(session, payload || {});
      const room = myRoom();
      if (room) {
        if (result.goalJustHit) systemChat(room, `🏆 ${session.name} hit the ${room.goalWords}-word goal!`);
        broadcastState(room);
      }
      return cb?.({
        ok: true,
        earned: result.earned,
        crits: result.crits,
        jackpot: result.jackpot,
        paperLump: result.paperLump,
        meter: result.meter,
        self: partyRoom.selfSnapshot(session),
      });
    });

    socket.on('tycoon:buy', (payload, cb) => {
      const session = mySession();
      if (!session) return cb?.({ error: 'Say hello first.' });
      const result = partyRoom.buy(session, payload?.item);
      if (result.error) return cb?.({ error: result.error });
      const room = myRoom();
      if (room) {
        if (result.bought === 'tier') systemChat(room, `⌨️ ${session.name} upgraded to the ${result.label} typewriter!`);
        broadcastState(room);
      }
      return cb?.({ ok: true, bought: result.bought, self: partyRoom.selfSnapshot(session) });
    });

    // Dev/admin cheat console: password-gated wallet override. Override the
    // password with TYCOON_ADMIN_PASSWORD in the environment.
    socket.on('tycoon:admin', (payload, cb) => {
      const session = mySession();
      if (!session) return cb?.({ error: 'Say hello first.' });
      const expected = process.env.TYCOON_ADMIN_PASSWORD || 'test';
      if (String(payload?.password || '') !== expected) return cb?.({ error: 'Wrong password.' });
      const result = partyRoom.adminSetMoney(session, payload?.money);
      if (result.error) return cb?.({ error: result.error });
      const room = myRoom();
      if (room) broadcastState(room);
      return cb?.({ ok: true, self: partyRoom.selfSnapshot(session) });
    });

    socket.on('party:create', (payload, cb) => {
      const session = mySession();
      if (!session) return cb?.({ error: 'Say hello first.' });
      try {
        if (session.roomCode) { // leaving the old one implicitly
          socket.leave(session.roomCode);
          const old = partyRoom.leaveParty(session);
          if (old && partyRoom.getRoom(old.code)) broadcastState(old);
        }
        const room = partyRoom.createParty(session, payload?.goalWords);
        socket.join(room.code);
        systemChat(room, `${session.name} opened the party`);
        cb?.({ ok: true, you: session.id, self: partyRoom.selfSnapshot(session), snapshot: partyRoom.roomSnapshot(room) });
      } catch {
        cb?.({ error: 'Could not open a party right now.' });
      }
    });

    socket.on('party:join', (payload, cb) => {
      const session = mySession();
      if (!session) return cb?.({ error: 'Say hello first.' });
      const result = partyRoom.joinParty(payload?.code, session);
      if (result.error) return cb?.({ error: result.error });
      const { room, rejoined } = result;
      socket.join(room.code);
      if (!rejoined) systemChat(room, `${session.name} joined`);
      broadcastState(room);
      return cb?.({ ok: true, you: session.id, self: partyRoom.selfSnapshot(session), snapshot: partyRoom.roomSnapshot(room) });
    });

    socket.on('party:leave', (_payload, cb) => {
      const session = mySession();
      if (session) {
        const code = session.roomCode;
        const room = partyRoom.leaveParty(session);
        if (code) socket.leave(code);
        if (room && partyRoom.getRoom(room.code)) {
          systemChat(room, `${session.name} left`);
          broadcastState(room);
        }
      }
      cb?.({ ok: true });
    });

    socket.on('party:peace', (payload, cb) => {
      const session = mySession();
      const room = myRoom();
      if (!session || !room) return cb?.({ error: 'Not in a party.' });
      const result = partyRoom.setPeace(room, session.id, payload?.off);
      if (result.error) return cb?.({ error: result.error });
      systemChat(room, result.sabotagesOff ? '🕊️ The host declared peace — sabotages are off' : '⚔️ Sabotages are back on');
      broadcastState(room);
      return cb?.({ ok: true });
    });

    socket.on('party:chat', (payload, cb) => {
      const room = myRoom();
      if (!room) return cb?.({ error: 'Not in a party.' });
      const result = partyRoom.addChat(room, socket.data.userId, payload?.text);
      if (result.error) return cb?.({ error: result.error });
      party.to(room.code).emit('party:chat', result.message);
      return cb?.({ ok: true });
    });

    socket.on('party:sabotage', (payload, cb) => {
      const session = mySession();
      const room = myRoom();
      if (!session || !room) return cb?.({ error: 'Not in a party.' });
      const result = partyRoom.sabotage(room, session.id, payload?.target, payload?.kind);
      if (result.error) return cb?.({ error: result.error, retryInMs: result.retryInMs, scope: result.scope });
      const label = partyRoom.SABOTAGES[result.kind].label;
      const outcome = result.absorbed ? 'absorbed' : result.blocked || 'hit';
      // The whole room sees the throw — the classroom scene animates it.
      party.to(room.code).emit('party:fx', { kind: result.kind, from: session.id, to: result.target.id, outcome });
      if (result.absorbed) {
        emitToMember(room, result.target.id, 'party:blocked', { kind: result.kind, from: session.name, how: 'absorbed', bounty: result.cost });
        systemChat(room, `🧘 ${result.target.name} absorbed ${session.name}'s ${label} (+$${result.cost})`);
      } else if (result.blocked) {
        emitToMember(room, result.target.id, 'party:blocked', { kind: result.kind, from: session.name, how: result.blocked });
        systemChat(room, result.blocked === 'pet'
          ? `🐈 ${result.target.name}'s desk cat chased off ${session.name}'s ${label}`
          : `${result.blocked === 'shield' ? '🛡️' : '☂️'} ${result.target.name} blocked ${session.name}'s ${label}`);
      } else {
        emitToMember(room, result.target.id, 'party:hit', { kind: result.kind, from: session.name, durationMs: result.durationMs, stolen: result.stolen });
        const flair = { confetti: '🎉', snail: '🐌', ink: '🦑', jelly: '🍮', fog: '🌫️', bomb: '💣', cat: '🐈', thief: '🦹' }[result.kind] || '💥';
        systemChat(room, `${flair} ${session.name} hit ${result.target.name} with ${label}${result.stolen ? ` and stole $${result.stolen}` : ''}`);
      }
      broadcastState(room);
      return cb?.({
        ok: true,
        outcome: result.absorbed ? 'absorbed' : result.blocked || 'hit',
        reloadMs: result.reloadMs,
        targetCooldownMs: result.targetCooldownMs,
        self: partyRoom.selfSnapshot(session),
      });
    });

    socket.on('party:gift', (payload, cb) => {
      const session = mySession();
      const room = myRoom();
      if (!session || !room) return cb?.({ error: 'Not in a party.' });
      const result = partyRoom.gift(room, session.id, payload?.target, payload?.kind, payload?.preset);
      if (result.error) return cb?.({ error: result.error });
      systemChat(room, result.kind === 'shield'
        ? `🛡️ ${result.from.name} handed ${result.to.name} a shield`
        : `💸 ${result.from.name} sent ${result.to.name} $${result.value}`);
      broadcastState(room);
      return cb?.({ ok: true, self: partyRoom.selfSnapshot(session) });
    });

    socket.on('disconnect', async () => {
      clearInterval(autoTimer);
      const session = mySession();
      if (!session) return;
      partyRoom.markDisconnected(socket.data.userId);
      const room = myRoom();
      if (room) broadcastState(room);
      await saveSession(session);
    });
  });

  // Periodic save of dirty states + room/session sweep.
  const saver = setInterval(async () => {
    for (const session of partyRoom.sessions.values()) {
      if (session.dirty) await saveSession(session);
    }
    partyRoom.sweep();
  }, SAVE_INTERVAL_MS);
  if (typeof saver.unref === 'function') saver.unref();

  return party;
}

module.exports = { attachPartySocket };
