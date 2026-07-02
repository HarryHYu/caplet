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
const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');
const { LiveSession, LiveParticipant, Lesson, User } = require('../models');
const { requireAuth, JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

const MAX_NICKNAME = 40;
const MIN_NICKNAME = 1;
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no ambiguous I/O/0/1, matches Classroom codes

async function generateSessionCode() {
  for (let attempt = 0; attempt < 10; attempt++) {
    let code = '';
    for (let i = 0; i < 6; i++) code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
    const existing = await LiveSession.findOne({ where: { code } });
    if (!existing) return code;
  }
  return `LV${Date.now().toString(36).toUpperCase()}`;
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

function sanitizeNickname(raw) {
  const trimmed = String(raw || '').trim().slice(0, MAX_NICKNAME);
  return trimmed;
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
    const { lessonId, classroomId, questionSeconds } = req.body || {};
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
      settings: { questionSeconds: seconds },
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
router.get('/code/:code', async (req, res) => {
  try {
    const code = String(req.params.code || '').trim().toUpperCase();
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
router.post('/join', async (req, res) => {
  try {
    const code = String(req.body?.code || '').trim().toUpperCase();
    const nickname = sanitizeNickname(req.body?.nickname);

    if (!code) return res.status(400).json({ message: 'code is required' });
    if (nickname.length < MIN_NICKNAME) return res.status(400).json({ message: 'Enter a nickname' });

    const session = await LiveSession.findOne({ where: { code } });
    if (!session) return res.status(404).json({ message: 'No live session with that code right now' });
    if (session.status === 'finished') return res.status(400).json({ message: 'This session has already ended' });

    const user = await tryOptionalUser(req);

    const participant = await LiveParticipant.create({
      sessionId: session.id,
      userId: user?.id || null,
      nickname,
      totalScore: 0,
      connected: false, // flips to true once the socket actually connects
    });

    const token = jwt.sign(
      { typ: 'liveParticipant', sessionId: session.id, participantId: participant.id },
      JWT_SECRET,
      { expiresIn: '6h' },
    );

    res.status(201).json({
      token,
      participant: { id: participant.id, nickname: participant.nickname },
      session: { id: session.id, code: session.code, status: session.status },
    });
  } catch (e) {
    console.error('Join live session error:', e);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;
