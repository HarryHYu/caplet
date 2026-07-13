/**
 * Live hosted quiz session endpoints (Kahoot-style). REST here only covers
 * creation/joining — a durable row has to exist before anyone can connect a
 * socket. Everything that happens once people are in the room (pushing
 * slides, timing questions, grading, leaderboards) is handled entirely over
 * Socket.IO in backend/realtime/liveSocket.js.
 *
 *   POST /api/live/sessions      -> host creates a session for a lesson
 *   GET  /api/live/sessions/:id  -> host reloads their own session (resume after refresh)
 *   GET  /api/live/code/:code    -> public preview before joining (no auth)
 *   POST /api/live/join          -> public join by code + nickname, no account needed
 */
const express = require('express');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { Op, col, fn, where } = require('sequelize');
const { sequelize } = require('../config/database');
const { LiveSession, LiveParticipant, Lesson, User } = require('../models');
const { requireAuth, JWT_SECRET } = require('../middleware/auth');
const { createRateLimiter } = require('../middleware/rateLimit');

const router = express.Router();

const ROOM_CODE_LENGTH = 8;
const MAX_NICKNAME = 24;
const MIN_NICKNAME = 2;
const DEFAULT_PARTICIPANT_CAP = 100;
const MAX_PARTICIPANT_CAP = 200;
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no ambiguous I/O/0/1, matches Classroom codes
const CODE_RE = new RegExp(`^[${CODE_CHARS}]{4,16}$`);
const SAFE_NICKNAME_RE = /^[\p{L}\p{N}](?:[\p{L}\p{N} .'’\-]*[\p{L}\p{N}])?$/u;
const BLOCKED_NICKNAME_TERMS = [
  'fuck', 'shit', 'bitch', 'cunt', 'nigger', 'nigga', 'faggot', 'retard', 'porn',
];

function createLiveRateLimiters(options = {}) {
  return {
    preview: createRateLimiter({
      scope: 'live-session-preview',
      windowMs: options.windowMs || 5 * 60 * 1000,
      max: options.previewMax || 180,
      message: 'Too many session lookups. Please wait before trying again.',
    }),
    join: createRateLimiter({
      scope: 'live-session-join',
      windowMs: options.windowMs || 5 * 60 * 1000,
      max: options.joinMax || 120,
      message: 'Too many join attempts. Please wait before trying again.',
    }),
  };
}

const liveRateLimiters = createLiveRateLimiters();

function randomRoomCode() {
  let code = '';
  for (let index = 0; index < ROOM_CODE_LENGTH; index += 1) {
    code += CODE_CHARS[crypto.randomInt(CODE_CHARS.length)];
  }
  return code;
}

async function generateSessionCode() {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const code = randomRoomCode();
    const existing = await LiveSession.findOne({ where: { code } });
    if (!existing) return code;
  }
  throw new Error('Could not allocate a unique live session code');
}

/** Best-effort: if the joiner happens to already be logged in, attach their userId. Never required. */
async function tryOptionalUser(req) {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) return null;
    const decoded = jwt.verify(token, JWT_SECRET);
    if (!decoded?.userId) return null;
    const user = await User.findByPk(decoded.userId);
    return user || null;
  } catch {
    return null;
  }
}

function moderationKey(value) {
  return value
    .toLocaleLowerCase('en-AU')
    .replace(/[013457@$]/g, (character) => ({
      0: 'o', 1: 'i', 3: 'e', 4: 'a', 5: 's', 7: 't', '@': 'a', $: 's',
    })[character])
    .replace(/[^\p{L}\p{N}]/gu, '');
}

function validateNickname(raw) {
  const source = String(raw ?? '');
  if (/[\p{Cc}\p{Cf}]/u.test(source)) {
    return { error: 'Choose a nickname using ordinary letters and numbers' };
  }
  const nickname = source.normalize('NFKC').trim().replace(/\s+/gu, ' ');
  if (nickname.length < MIN_NICKNAME || nickname.length > MAX_NICKNAME) {
    return { error: `Nickname must be ${MIN_NICKNAME}–${MAX_NICKNAME} characters` };
  }
  if (!SAFE_NICKNAME_RE.test(nickname)) {
    return { error: 'Choose a nickname using letters, numbers, spaces, apostrophes or hyphens' };
  }
  const key = moderationKey(nickname);
  if (BLOCKED_NICKNAME_TERMS.some((term) => key.includes(term))) {
    return { error: 'Choose a different nickname' };
  }
  return { nickname };
}

function parseSettings(raw) {
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) return raw;
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch { return {}; }
  }
  return {};
}

function normalizeParticipantCap(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return DEFAULT_PARTICIPANT_CAP;
  return Math.min(MAX_PARTICIPANT_CAP, Math.max(2, Math.round(parsed)));
}

function normalizeLiveSecurity(settings) {
  const raw = settings?.liveSecurity;
  const source = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  const strings = (value) => (Array.isArray(value) ? value.filter((item) => typeof item === 'string').slice(-MAX_PARTICIPANT_CAP) : []);
  const fingerprints = source.participantFingerprints && typeof source.participantFingerprints === 'object'
    ? Object.fromEntries(Object.entries(source.participantFingerprints).filter(([id, value]) => typeof id === 'string' && typeof value === 'string').slice(-MAX_PARTICIPANT_CAP))
    : {};
  return {
    blockedParticipantIds: strings(source.blockedParticipantIds),
    blockedUserIds: strings(source.blockedUserIds),
    blockedFingerprints: strings(source.blockedFingerprints),
    blockedNicknames: strings(source.blockedNicknames).map((value) => value.toLocaleLowerCase('en-AU')),
    participantFingerprints: fingerprints,
  };
}

function joinFingerprint(req, sessionId, user) {
  const network = req.ip || req.socket?.remoteAddress || 'unknown';
  const userAgent = String(req.get?.('user-agent') || '').slice(0, 256);
  const identity = user?.id ? `user:${user.id}` : `network:${network}|agent:${userAgent}`;
  const secret = process.env.LIVE_JOIN_FINGERPRINT_SECRET || JWT_SECRET;
  return crypto.createHmac('sha256', secret).update(`${sessionId}|${identity}`).digest('hex');
}

function isJoinBlocked(security, { fingerprint, nickname, userId }) {
  return security.blockedFingerprints.includes(fingerprint)
    || (userId && security.blockedUserIds.includes(userId))
    || security.blockedNicknames.includes(nickname.toLocaleLowerCase('en-AU'));
}

function signParticipantToken(sessionId, participant, fingerprint) {
  return jwt.sign(
    {
      typ: 'liveParticipant',
      sessionId,
      participantId: participant.id,
      joinFingerprint: fingerprint,
    },
    JWT_SECRET,
    { expiresIn: '6h' },
  );
}

class LiveJoinError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

// JSONB is transparently stored as TEXT on the SQLite dev fallback (see
// backend/routes/savedSlides.js parseSlides for the same pattern) — Postgres
// returns a real array, so this is a no-op in production.
function parseSlides(raw) {
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string') {
    try { return JSON.parse(raw); } catch { return []; }
  }
  return [];
}

// POST /api/live/sessions — host creates a session for one of their lessons
router.post('/sessions', requireAuth, async (req, res) => {
  try {
    const { lessonId, classroomId, questionSeconds, maxParticipants } = req.body || {};
    if (!lessonId) return res.status(400).json({ message: 'lessonId is required' });

    const lesson = await Lesson.findByPk(lessonId);
    if (!lesson) return res.status(404).json({ message: 'Lesson not found' });
    const slides = parseSlides(lesson.slides);
    if (!slides.length) {
      return res.status(400).json({ message: 'This lesson has no slides to play live' });
    }

    const seconds = Number.isFinite(Number(questionSeconds))
      ? Math.min(120, Math.max(5, Math.round(Number(questionSeconds))))
      : 20;

    const code = await generateSessionCode();
    const session = await LiveSession.create({
      code,
      hostUserId: req.user.id,
      lessonId: lesson.id,
      classroomId: classroomId || null,
      status: 'lobby',
      currentSlideIndex: -1,
      settings: {
        questionSeconds: seconds,
        maxParticipants: normalizeParticipantCap(maxParticipants),
      },
    });

    res.status(201).json({
      session: {
        id: session.id,
        code: session.code,
        status: session.status,
        lessonId: session.lessonId,
        lessonTitle: lesson.title,
        slideCount: slides.length,
      },
    });
  } catch (e) {
    console.error('Create live session error:', e);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /api/live/sessions/:idOrCode — host reloads their own session (e.g. after a page
// refresh). Accepts either the session id (right after creation) or its short code
// (the shareable /live/host/:code URL), so the host never has to juggle two ids.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

router.get('/sessions/:idOrCode', requireAuth, async (req, res) => {
  try {
    const param = req.params.idOrCode;
    // `id` is a UUID column — comparing it to a non-UUID literal (e.g. a 6-char
    // code) throws at the DB level rather than just not matching, so only
    // include that clause when the param is actually shaped like a UUID.
    const idMatch = UUID_RE.test(param) ? [{ id: param }] : [];
    const session = await LiveSession.findOne({
      where: {
        hostUserId: req.user.id,
        [Op.or]: [...idMatch, { code: param.toUpperCase() }],
      },
      include: [{ model: Lesson, as: 'lesson', attributes: ['id', 'title', 'slides'] }],
    });
    if (!session) return res.status(404).json({ message: 'Session not found' });

    res.json({
      session: {
        id: session.id,
        code: session.code,
        status: session.status,
        currentSlideIndex: session.currentSlideIndex,
        lessonId: session.lessonId,
        lessonTitle: session.lesson?.title || null,
        slideCount: parseSlides(session.lesson?.slides).length,
      },
    });
  } catch (e) {
    console.error('Get live session error:', e);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /api/live/code/:code — public, minimal preview shown on the join screen before submitting a nickname
router.get('/code/:code', liveRateLimiters.preview, async (req, res) => {
  try {
    const code = String(req.params.code || '').trim().toUpperCase();
    if (!CODE_RE.test(code)) {
      return res.status(404).json({ message: 'No live session with that code right now' });
    }
    const session = await LiveSession.findOne({
      where: { code },
      include: [{ model: Lesson, as: 'lesson', attributes: ['id', 'title'] }],
    });
    if (!session || session.status === 'finished') {
      return res.status(404).json({ message: 'No live session with that code right now' });
    }
    res.json({
      session: {
        code: session.code,
        status: session.status,
        lessonTitle: session.lesson?.title || 'Live session',
      },
    });
  } catch (e) {
    console.error('Get live session by code error:', e);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// POST /api/live/join — public, code + nickname only. No account required.
router.post('/join', liveRateLimiters.join, async (req, res) => {
  try {
    const code = String(req.body?.code || '').trim().toUpperCase();
    const nicknameResult = validateNickname(req.body?.nickname);

    if (!code) return res.status(400).json({ message: 'code is required' });
    if (!CODE_RE.test(code)) return res.status(404).json({ message: 'No live session with that code right now' });
    if (nicknameResult.error) return res.status(400).json({ message: nicknameResult.error });
    const { nickname } = nicknameResult;

    const user = await tryOptionalUser(req);
    const result = await sequelize.transaction(async (transaction) => {
      const session = await LiveSession.findOne({
        where: { code },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!session) throw new LiveJoinError(404, 'No live session with that code right now');
      if (session.status === 'finished') throw new LiveJoinError(400, 'This session has already ended');

      const settings = parseSettings(session.settings);
      const security = normalizeLiveSecurity(settings);
      const fingerprint = joinFingerprint(req, session.id, user);
      if (isJoinBlocked(security, { fingerprint, nickname, userId: user?.id })) {
        throw new LiveJoinError(403, 'You cannot rejoin this live session');
      }

      // A signed-in learner gets one durable participant identity per room.
      // Reissuing its token supports refresh/device handoff without duplicating scores.
      if (user) {
        const existingUserParticipant = await LiveParticipant.findOne({
          where: { sessionId: session.id, userId: user.id },
          transaction,
        });
        if (existingUserParticipant) {
          security.participantFingerprints[existingUserParticipant.id] = fingerprint;
          await session.update({ settings: { ...settings, liveSecurity: security } }, { transaction });
          return { session, participant: existingUserParticipant, fingerprint, resumed: true };
        }
      }

      const duplicateNickname = await LiveParticipant.findOne({
        where: {
          sessionId: session.id,
          [Op.and]: where(fn('LOWER', col('nickname')), nickname.toLocaleLowerCase('en-AU')),
        },
        transaction,
      });
      if (duplicateNickname) throw new LiveJoinError(409, 'That nickname is already in this session');

      const eligibleWhere = { sessionId: session.id };
      if (security.blockedParticipantIds.length) eligibleWhere.id = { [Op.notIn]: security.blockedParticipantIds };
      const participantCount = await LiveParticipant.count({ where: eligibleWhere, transaction });
      const participantCap = normalizeParticipantCap(settings.maxParticipants);
      if (participantCount >= participantCap) {
        throw new LiveJoinError(409, 'This live session is full');
      }

      const participant = await LiveParticipant.create({
        sessionId: session.id,
        userId: user?.id || null,
        nickname,
        totalScore: 0,
        connected: false, // flips to true once the socket actually connects
      }, { transaction });
      security.participantFingerprints[participant.id] = fingerprint;
      await session.update({ settings: { ...settings, liveSecurity: security } }, { transaction });
      return { session, participant, fingerprint, resumed: false };
    });

    const token = signParticipantToken(result.session.id, result.participant, result.fingerprint);
    res.status(result.resumed ? 200 : 201).json({
      token,
      resumed: result.resumed,
      participant: { id: result.participant.id, nickname: result.participant.nickname },
      session: { id: result.session.id, code: result.session.code, status: result.session.status },
    });
  } catch (e) {
    if (e instanceof LiveJoinError) return res.status(e.status).json({ message: e.message });
    console.error('Join live session error:', e);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;
module.exports._liveSecurity = {
  BLOCKED_NICKNAME_TERMS,
  CODE_CHARS,
  ROOM_CODE_LENGTH,
  createLiveRateLimiters,
  generateSessionCode,
  isJoinBlocked,
  joinFingerprint,
  liveRateLimiters,
  moderationKey,
  normalizeLiveSecurity,
  normalizeParticipantCap,
  randomRoomCode,
  validateNickname,
};
