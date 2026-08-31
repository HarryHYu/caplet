/**
 * Study Party — the /party Socket.IO namespace. Logged-in users only (a
 * party shares each member's own essay progress; there is no anonymous
 * role). All room state lives in partyRoom.js, in memory only.
 *
 * Wire protocol (client -> server, all with ack callbacks):
 *   party:create   {goalWords}            -> {ok, snapshot}
 *   party:join     {code}                 -> {ok, snapshot}
 *   party:leave    {}                     -> {ok}
 *   party:progress {wordsDelta, para, paraCount, accuracy}
 *   party:chat     {text}
 *   party:buy      {item}                 -> {ok|error}
 *   party:sabotage {target, kind}         -> {ok|error, blocked}
 *   party:gift     {target, amount}       -> {ok|error}
 * Server -> client:
 *   party:state    full snapshot (roster/money/goal)
 *   party:chat     one message
 *   party:hit      {kind, from, durationMs}   (you got inked/bombed)
 *   party:shielded {kind, from}               (your shield ate one)
 */
const jwt = require('jsonwebtoken');
const { User } = require('../models');
const { JWT_SECRET } = require('../middleware/auth');
const partyRoom = require('./partyRoom');

function displayName(user) {
  const first = String(user.firstName || '').trim();
  const last = String(user.lastName || '').trim();
  if (first && last) return `${first} ${last[0]}.`;
  return first || 'Student';
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
    party.to(room.code).emit('party:state', partyRoom.snapshot(room));
  };

  const systemChat = (room, text) => {
    const result = partyRoom.addChat(room, null, text, { system: true });
    if (result.message) party.to(room.code).emit('party:chat', result.message);
  };

  /** Emit to every open socket a member has (they may have two tabs). */
  const emitToMember = (room, memberId, event, payload) => {
    for (const s of party.sockets.values()) {
      if (s.data.userId === String(memberId) && s.data.partyCode === room.code) {
        s.emit(event, payload);
      }
    }
  };

  party.on('connection', (socket) => {
    const roomOf = () => (socket.data.partyCode ? partyRoom.getRoom(socket.data.partyCode) : null);

    socket.on('party:create', (payload, cb) => {
      try {
        const room = partyRoom.createParty(socket.data.userId, socket.data.name, payload?.goalWords);
        socket.data.partyCode = room.code;
        socket.join(room.code);
        systemChat(room, `${socket.data.name} opened the party`);
        cb?.({ ok: true, you: socket.data.userId, snapshot: partyRoom.snapshot(room) });
      } catch {
        cb?.({ error: 'Could not open a party right now.' });
      }
    });

    socket.on('party:join', (payload, cb) => {
      const result = partyRoom.joinParty(payload?.code, socket.data.userId, socket.data.name);
      if (result.error) return cb?.({ error: result.error });
      const { room, rejoined } = result;
      socket.data.partyCode = room.code;
      socket.join(room.code);
      if (!rejoined) systemChat(room, `${socket.data.name} joined`);
      broadcastState(room);
      return cb?.({ ok: true, you: socket.data.userId, snapshot: partyRoom.snapshot(room) });
    });

    socket.on('party:leave', (_payload, cb) => {
      const room = roomOf();
      if (room) {
        partyRoom.leaveParty(room, socket.data.userId);
        socket.leave(room.code);
        if (partyRoom.getRoom(room.code)) {
          systemChat(room, `${socket.data.name} left`);
          broadcastState(room);
        }
      }
      socket.data.partyCode = null;
      cb?.({ ok: true });
    });

    socket.on('party:progress', (payload) => {
      const room = roomOf();
      if (!room) return;
      const result = partyRoom.recordProgress(room, socket.data.userId, payload || {});
      if (result.error) return;
      if (result.goalJustHit) systemChat(room, `🏆 ${socket.data.name} hit the ${room.goalWords}-word goal!`);
      broadcastState(room);
    });

    socket.on('party:chat', (payload, cb) => {
      const room = roomOf();
      if (!room) return cb?.({ error: 'Not in a party.' });
      const result = partyRoom.addChat(room, socket.data.userId, payload?.text);
      if (result.error) return cb?.({ error: result.error });
      party.to(room.code).emit('party:chat', result.message);
      return cb?.({ ok: true });
    });

    socket.on('party:buy', (payload, cb) => {
      const room = roomOf();
      if (!room) return cb?.({ error: 'Not in a party.' });
      const result = partyRoom.buyUpgrade(room, socket.data.userId, payload?.item);
      if (result.error) return cb?.({ error: result.error });
      broadcastState(room);
      return cb?.({ ok: true });
    });

    socket.on('party:sabotage', (payload, cb) => {
      const room = roomOf();
      if (!room) return cb?.({ error: 'Not in a party.' });
      const result = partyRoom.sabotage(room, socket.data.userId, payload?.target, payload?.kind);
      if (result.error) return cb?.({ error: result.error });
      if (result.blocked) {
        emitToMember(room, result.target.id, 'party:shielded', { kind: result.kind, from: socket.data.name });
        systemChat(room, `🛡️ ${result.target.name} blocked ${socket.data.name}'s ${result.kind}`);
      } else {
        emitToMember(room, result.target.id, 'party:hit', {
          kind: result.kind,
          from: socket.data.name,
          durationMs: result.durationMs,
        });
        systemChat(room, `${result.kind === 'ink' ? '🦑' : '💣'} ${socket.data.name} ${result.kind === 'ink' ? 'inked' : 'bombed'} ${result.target.name}`);
      }
      broadcastState(room);
      return cb?.({ ok: true, blocked: !!result.blocked });
    });

    socket.on('party:gift', (payload, cb) => {
      const room = roomOf();
      if (!room) return cb?.({ error: 'Not in a party.' });
      const result = partyRoom.gift(room, socket.data.userId, payload?.target, payload?.amount);
      if (result.error) return cb?.({ error: result.error });
      systemChat(room, `💸 ${result.from.name} sent ${result.to.name} $${result.value}`);
      broadcastState(room);
      return cb?.({ ok: true });
    });

    socket.on('disconnect', () => {
      const room = roomOf();
      if (!room) return;
      partyRoom.markDisconnected(room, socket.data.userId);
      broadcastState(room);
    });
  });

  // Reap dead rooms once a minute; unref so tests exit cleanly.
  const sweeper = setInterval(() => partyRoom.sweepRooms(), 60 * 1000);
  if (typeof sweeper.unref === 'function') sweeper.unref();

  return party;
}

module.exports = { attachPartySocket };
