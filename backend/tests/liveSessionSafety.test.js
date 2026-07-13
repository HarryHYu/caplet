const crypto = require('crypto');
const express = require('express');
const jwt = require('jsonwebtoken');
const request = require('supertest');

const { sequelize } = require('../config/database');
const { JWT_SECRET } = require('../middleware/auth');
const { LiveParticipant, LiveSession, User } = require('../models');
const liveRouter = require('../routes/live');
const { _liveSecurity } = liveRouter;
const { _liveSocketSecurity } = require('../realtime/liveSocket');

function appForLiveRoutes() {
  const app = express();
  app.use(express.json());
  app.use('/', liveRouter);
  return app;
}

async function invokeMiddleware(middleware, ip) {
  return new Promise((resolve, reject) => {
    const headers = {};
    const req = { ip };
    const res = {
      statusCode: 200,
      setHeader(name, value) { headers[name] = value; },
      status(code) { this.statusCode = code; return this; },
      json(body) { resolve({ status: this.statusCode, body, headers }); },
    };
    Promise.resolve(middleware(req, res, () => resolve({ status: 200, next: true, headers }))).catch(reject);
  });
}

describe('live-session public entry safety', () => {
  test('uses the cryptographic RNG for high-entropy unambiguous room codes', () => {
    const randomInt = jest.spyOn(crypto, 'randomInt').mockReturnValue(0);
    const code = _liveSecurity.randomRoomCode();
    expect(code).toBe('A'.repeat(_liveSecurity.ROOM_CODE_LENGTH));
    expect(randomInt).toHaveBeenCalledTimes(_liveSecurity.ROOM_CODE_LENGTH);
    expect(randomInt).toHaveBeenCalledWith(_liveSecurity.CODE_CHARS.length);
    randomInt.mockRestore();
  });

  test('normalizes legitimate Australian names and rejects unsafe or moderated nicknames', () => {
    expect(_liveSecurity.validateNickname("  Zoë   O'Connor  ")).toEqual({ nickname: "Zoë O'Connor" });
    expect(_liveSecurity.validateNickname('李 雷')).toEqual({ nickname: '李 雷' });
    expect(_liveSecurity.validateNickname('f.u.c.k')).toEqual({ error: 'Choose a different nickname' });
    expect(_liveSecurity.validateNickname('Safe\u202Ename')).toEqual({
      error: 'Choose a nickname using ordinary letters and numbers',
    });
    expect(_liveSecurity.validateNickname('A')).toEqual(expect.objectContaining({ error: expect.any(String) }));
    expect(_liveSecurity.validateNickname('Name😀')).toEqual(expect.objectContaining({ error: expect.any(String) }));
  });

  test('rate-limits each network independently', async () => {
    const { join, preview } = _liveSecurity.createLiveRateLimiters({
      windowMs: 1000,
      joinMax: 2,
      previewMax: 1,
    });
    await expect(invokeMiddleware(join, '203.0.113.10')).resolves.toMatchObject({ status: 200, next: true });
    await expect(invokeMiddleware(join, '203.0.113.10')).resolves.toMatchObject({ status: 200, next: true });
    await expect(invokeMiddleware(join, '203.0.113.10')).resolves.toMatchObject({
      status: 429,
      body: { message: 'Too many join attempts. Please wait before trying again.' },
    });
    await expect(invokeMiddleware(join, '203.0.113.11')).resolves.toMatchObject({ status: 200, next: true });
    await expect(invokeMiddleware(preview, '203.0.113.10')).resolves.toMatchObject({ status: 200, next: true });
    await expect(invokeMiddleware(preview, '203.0.113.10')).resolves.toMatchObject({ status: 429 });
  });
});

describe('live-session join abuse controls', () => {
  const app = appForLiveRoutes();
  let session;
  let participant;

  beforeEach(() => {
    session = {
      id: crypto.randomUUID(),
      code: 'ABCDEFGH',
      status: 'lobby',
      settings: { maxParticipants: 2 },
      update: jest.fn(async ({ settings }) => {
        session.settings = settings;
        return session;
      }),
    };
    participant = {
      id: crypto.randomUUID(),
      sessionId: session.id,
      userId: null,
      nickname: 'Alice',
    };
    jest.spyOn(sequelize, 'transaction').mockImplementation(async (callback) => callback({ LOCK: { UPDATE: 'UPDATE' } }));
    jest.spyOn(LiveSession, 'findOne').mockResolvedValue(session);
    jest.spyOn(LiveParticipant, 'findOne').mockResolvedValue(null);
    jest.spyOn(LiveParticipant, 'count').mockResolvedValue(0);
    jest.spyOn(LiveParticipant, 'create').mockResolvedValue(participant);
  });

  afterEach(() => jest.restoreAllMocks());

  test('rejects a duplicate nickname case-insensitively', async () => {
    LiveParticipant.findOne.mockResolvedValue({ id: crypto.randomUUID(), nickname: 'ALICE' });
    const response = await request(app).post('/join').send({ code: session.code, nickname: 'Alice' });
    expect(response.status).toBe(409);
    expect(response.body.message).toMatch(/nickname is already/i);
    expect(LiveParticipant.create).not.toHaveBeenCalled();
  });

  test('enforces the session participant cap before creating another identity', async () => {
    LiveParticipant.count.mockResolvedValue(2);
    const response = await request(app).post('/join').send({ code: session.code, nickname: 'Bob' });
    expect(response.status).toBe(409);
    expect(response.body.message).toMatch(/session is full/i);
    expect(LiveParticipant.create).not.toHaveBeenCalled();
  });

  test('refuses a blocked nickname and does not disclose private block data', async () => {
    session.settings.liveSecurity = { blockedNicknames: ['alice'] };
    const response = await request(app).post('/join').send({ code: session.code, nickname: 'Alice' });
    expect(response.status).toBe(403);
    expect(response.body).toEqual({ message: 'You cannot rejoin this live session' });
    expect(JSON.stringify(response.body)).not.toContain('liveSecurity');
    expect(LiveParticipant.create).not.toHaveBeenCalled();
  });

  test('stores only a salted join fingerprint and binds it into the participant token', async () => {
    const response = await request(app)
      .post('/join')
      .set('User-Agent', 'Caplet classroom browser')
      .send({ code: session.code, nickname: 'Alice' });
    expect(response.status).toBe(201);
    const decoded = jwt.verify(response.body.token, JWT_SECRET);
    expect(decoded.joinFingerprint).toMatch(/^[a-f0-9]{64}$/);
    expect(session.settings.liveSecurity.participantFingerprints[participant.id]).toBe(decoded.joinFingerprint);
    expect(JSON.stringify(session.settings)).not.toContain('Caplet classroom browser');
  });

  test('reuses one participant identity for an authenticated learner', async () => {
    const user = { id: crypto.randomUUID() };
    const existing = { ...participant, userId: user.id, nickname: 'Alice' };
    jest.spyOn(User, 'findByPk').mockResolvedValue(user);
    LiveParticipant.findOne.mockResolvedValue(existing);
    const userToken = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '1h' });

    const response = await request(app)
      .post('/join')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ code: session.code, nickname: 'Different name' });
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ resumed: true, participant: { id: existing.id, nickname: 'Alice' } });
    expect(LiveParticipant.create).not.toHaveBeenCalled();
  });
});

describe('host kick and durable session block', () => {
  afterEach(() => jest.restoreAllMocks());

  test('denies non-host actors, then kicks and blocks every known rejoin identity for a host', async () => {
    const sessionId = crypto.randomUUID();
    const participantId = crypto.randomUUID();
    const joinFingerprint = 'a'.repeat(64);
    const participant = {
      id: participantId,
      sessionId,
      userId: crypto.randomUUID(),
      nickname: 'Player One',
      update: jest.fn().mockResolvedValue(undefined),
    };
    const session = {
      settings: {
        maxParticipants: 100,
        liveSecurity: { participantFingerprints: { [participantId]: joinFingerprint } },
      },
      update: jest.fn(async ({ settings }) => { session.settings = settings; }),
    };
    const participantSocket = {
      data: { joinFingerprint },
      emit: jest.fn(),
      disconnect: jest.fn(),
    };
    const room = {
      participantSockets: new Map([[participantId, 'socket-1']]),
      blockedParticipantIds: new Set(),
      round: { responses: new Map([[participantId, { correct: true }]]) },
      streaks: new Map([[participantId, { current: 2, best: 2 }]]),
    };
    const live = { sockets: new Map([['socket-1', participantSocket]]) };
    jest.spyOn(LiveSession, 'findByPk').mockResolvedValue(session);
    jest.spyOn(LiveParticipant, 'findOne').mockResolvedValue(participant);

    await expect(_liveSocketSecurity.kickParticipantFromRoom({
      actorRole: 'participant', sessionId, participantId, room, live,
    })).resolves.toEqual({ ok: false, error: 'Host access required' });
    expect(LiveSession.findByPk).not.toHaveBeenCalled();

    await expect(_liveSocketSecurity.kickParticipantFromRoom({
      actorRole: 'host', sessionId, participantId, room, live,
    })).resolves.toEqual({ ok: true, participantId });
    expect(participant.update).toHaveBeenCalledWith({ connected: false });
    expect(participantSocket.emit).toHaveBeenCalledWith('session:kicked', expect.any(Object));
    expect(participantSocket.disconnect).toHaveBeenCalledWith(true);
    expect(room.participantSockets.has(participantId)).toBe(false);
    expect(room.blockedParticipantIds.has(participantId)).toBe(true);
    expect(room.round.responses.has(participantId)).toBe(false);
    expect(room.streaks.has(participantId)).toBe(false);

    expect(_liveSocketSecurity.isParticipantBlocked(session.settings, participant, joinFingerprint)).toBe(true);
    const security = _liveSecurity.normalizeLiveSecurity(session.settings);
    expect(_liveSecurity.isJoinBlocked(security, {
      fingerprint: joinFingerprint,
      nickname: 'A new nickname',
      userId: null,
    })).toBe(true);
    expect(JSON.stringify(session.settings)).not.toContain('203.0.113');
  });
});
