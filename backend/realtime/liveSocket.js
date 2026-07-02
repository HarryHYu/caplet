/**
 * Real-time transport for live hosted quiz sessions (Kahoot-style).
 *
 * Attaches Socket.IO to the same http.Server instance Express already
 * listens on (backend/server.js) under the `/live` namespace. REST routes
 * (backend/routes/live.js) own session/participant *creation* (both need a
 * durable row before anyone can connect); this module owns everything that
 * happens once people are actually in the room — pushing slides, timing
 * questions, grading answers, and broadcasting results/leaderboards.
 *
 * Per-session gameplay state (the active question's answer key, its timer,
 * which socket belongs to which participant) is kept in an in-memory Map,
 * not the database — it's ephemeral by nature and doesn't need to survive a
 * server restart. `LiveSession`/`LiveParticipant`/`LiveResponse` rows are the
 * durable record (final scores, who played, what they answered).
 */
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../middleware/auth');
const { LiveSession, LiveParticipant, LiveResponse, Lesson } = require('../models');
const { normalizeSlide } = require('../utils/slideSchema');
const { isGradable, prepareQuestion, gradeResponse, computePoints, computeStreakBonus } = require('../utils/liveGrading');

const DEFAULT_QUESTION_MS = 20000;
const MAX_RESPONSE_ARRAY_LEN = 64;
const MAX_RESPONSE_STRING_LEN = 300;

// JSONB is transparently stored as TEXT on the SQLite dev fallback (see
// backend/routes/savedSlides.js parseSlides for the same pattern) — Postgres
// returns a real array, so this is a no-op in production.
function parseLessonSlides(raw) {
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string') {
    try { return JSON.parse(raw); } catch { return []; }
  }
  return [];
}

// sessionId -> { hostSocketId, participantSockets: Map(participantId -> socketId),
//                slides: normalizedSlide[], round: activeRound | null,
//                streaks: Map(participantId -> { current, best }) }
const rooms = new Map();

function getRoom(sessionId) {
  let room = rooms.get(sessionId);
  if (!room) {
    room = { hostSocketId: null, participantSockets: new Map(), slides: null, round: null, streaks: new Map() };
    rooms.set(sessionId, room);
  }
  return room;
}

/** Cheap guard against oversized/garbage payloads from an unauthenticated-ish join flow. */
function sanitizeResponsePayload(response) {
  if (Array.isArray(response)) {
    return response.slice(0, MAX_RESPONSE_ARRAY_LEN).map((v) => {
      if (typeof v === 'string') return v.slice(0, MAX_RESPONSE_STRING_LEN);
      if (typeof v === 'number' && Number.isFinite(v)) return v;
      return null;
    });
  }
  if (typeof response === 'string') return response.slice(0, MAX_RESPONSE_STRING_LEN);
  if (typeof response === 'number' && Number.isFinite(response)) return response;
  return null;
}

function isSameOrigin(origin, allowedOrigins) {
  if (!origin) return true; // native app / server-to-server, mirrors server.js
  if (allowedOrigins.has(origin)) return true;
  if (/^https?:\/\/localhost:\d+$/.test(origin) || /^https?:\/\/127\.0\.0\.1:\d+$/.test(origin)) return true;
  if (/^https:\/\/caplet-.*\.vercel\.app$/.test(origin)) return true;
  return false;
}

function attachLiveSocket(httpServer) {
  const allowedOrigins = new Set([
    process.env.FRONTEND_URL || 'http://localhost:5173',
    'https://capletedu.org',
    'https://www.capletedu.org',
    'https://caplet.vercel.app',
  ]);

  const io = new Server(httpServer, {
    cors: {
      origin(origin, callback) {
        if (isSameOrigin(origin, allowedOrigins)) return callback(null, true);
        callback(new Error('Not allowed by CORS'));
      },
      credentials: true,
    },
    // Keep both well under Railway's ~60s proxy idle timeout so a quiet
    // lobby (nobody answering yet) doesn't get silently dropped.
    pingInterval: 20000,
    pingTimeout: 20000,
  });

  const live = io.of('/live');

  live.use(async (socket, next) => {
    try {
      const { token, sessionId } = socket.handshake.auth || {};
      if (!token) return next(new Error('unauthorized'));
      const decoded = jwt.verify(token, JWT_SECRET);

      if (decoded.typ === 'liveParticipant') {
        const participant = await LiveParticipant.findByPk(decoded.participantId);
        if (!participant || participant.sessionId !== decoded.sessionId) {
          return next(new Error('unauthorized'));
        }
        socket.data.role = 'participant';
        socket.data.sessionId = decoded.sessionId;
        socket.data.participantId = decoded.participantId;
        return next();
      }

      // Otherwise this must be a normal user JWT — only valid on this
      // namespace if that user actually hosts the session they're naming.
      if (!decoded.userId || !sessionId) return next(new Error('unauthorized'));
      const session = await LiveSession.findByPk(sessionId);
      if (!session || session.hostUserId !== decoded.userId) return next(new Error('unauthorized'));
      socket.data.role = 'host';
      socket.data.userId = decoded.userId;
      socket.data.sessionId = session.id;
      return next();
    } catch {
      next(new Error('unauthorized'));
    }
  });

  /** Loads + normalizes a session's lesson slides once, caching on the room. */
  async function ensureSlidesLoaded(sessionId, room) {
    if (room.slides) return room.slides;
    const session = await LiveSession.findByPk(sessionId);
    const lesson = session && (await Lesson.findByPk(session.lessonId));
    const raw = parseLessonSlides(lesson?.slides);
    room.slides = raw.map(normalizeSlide).filter(Boolean);
    return room.slides;
  }

  async function broadcastRoster(sessionId) {
    const participants = await LiveParticipant.findAll({
      where: { sessionId },
      order: [['createdAt', 'ASC']],
    });
    live.to(sessionId).emit('lobby:roster', {
      players: participants.map((p) => ({ id: p.id, nickname: p.nickname, connected: p.connected })),
    });
  }

  /** `room` is optional so external/offline callers can still get a plain leaderboard. */
  async function currentLeaderboard(sessionId, limit, room) {
    const participants = await LiveParticipant.findAll({
      where: { sessionId },
      order: [['totalScore', 'DESC']],
      ...(limit ? { limit } : {}),
    });
    return participants.map((p, i) => {
      const s = room?.streaks?.get(p.id);
      return {
        id: p.id,
        nickname: p.nickname,
        score: p.totalScore,
        rank: i + 1,
        streak: s?.current || 0,
        bestStreak: s?.best || 0,
      };
    });
  }

  /** Pushes slide `index` to everyone in the room; opens a timed round if it's gradable. */
  async function pushSlide(sessionId, index, room) {
    const session = await LiveSession.findByPk(sessionId);
    if (!session) return;
    const slide = room.slides[index];
    if (!slide) return;

    session.currentSlideIndex = index;

    if (isGradable(slide)) {
      const { publicSlide, answerKey } = prepareQuestion(slide);
      const windowMs = (session.settings?.questionSeconds || DEFAULT_QUESTION_MS / 1000) * 1000;
      const opensAt = Date.now();

      if (room.round?.timer) clearTimeout(room.round.timer);
      room.round = {
        slideIndex: index,
        answerKey,
        opensAt,
        windowMs,
        responses: new Map(),
        timer: setTimeout(() => revealRound(sessionId, room).catch((e) => console.error('Live auto-reveal failed:', e)), windowMs),
      };

      session.status = 'question_open';
      await session.save();

      live.to(sessionId).emit('state:update', {
        slideIndex: index,
        slideCount: room.slides.length,
        status: 'question_open',
        slide: publicSlide,
        opensAt,
        windowMs,
      });
    } else {
      room.round = null;
      session.status = 'active';
      await session.save();

      live.to(sessionId).emit('state:update', {
        slideIndex: index,
        slideCount: room.slides.length,
        status: 'active',
        slide,
        opensAt: null,
        windowMs: null,
      });
    }
  }

  /** Closes the active round (if any), grades no-shows as 0, and broadcasts results. */
  async function revealRound(sessionId, room) {
    // Clear synchronously (before any await) so a near-simultaneous auto-reveal
    // timer + manual host:reveal can't both pass this guard and double-process
    // the same round.
    const round = room.round;
    if (!round) return;
    room.round = null;
    if (round.timer) clearTimeout(round.timer);

    const session = await LiveSession.findByPk(sessionId);
    if (!session) return;

    // Anyone connected who never answered gets an explicit zero-point record.
    const allParticipants = await LiveParticipant.findAll({ where: { sessionId } });
    await Promise.all(
      allParticipants
        .filter((p) => !round.responses.has(p.id))
        .map((p) =>
          LiveResponse.create({
            sessionId,
            participantId: p.id,
            slideIndex: round.slideIndex,
            responseData: null,
            correct: false,
            pointsAwarded: 0,
            answeredAtMs: Date.now(),
          }).catch(() => { /* best-effort — a missing no-show row doesn't break the game */ }),
        ),
    );

    const correctCount = [...round.responses.values()].filter((r) => r.correct).length;
    session.status = 'reveal';
    await session.save();

    const leaderboard = await currentLeaderboard(sessionId, 10, room);

    live.to(sessionId).emit('results:reveal', {
      slideIndex: round.slideIndex,
      totalAnswered: round.responses.size,
      totalParticipants: allParticipants.length,
      correctCount,
      leaderboard,
    });

    // Private per-player result (their own correctness/points/rank/streak), not broadcast.
    const rankByParticipant = new Map(leaderboard.map((l) => [l.id, l.rank]));
    for (const [participantId, result] of round.responses.entries()) {
      const socketId = room.participantSockets.get(participantId);
      if (!socketId) continue;
      const participant = allParticipants.find((p) => p.id === participantId);
      live.to(socketId).emit('you:result', {
        slideIndex: round.slideIndex,
        correct: result.correct,
        pointsAwarded: result.points,
        basePoints: result.basePoints,
        streakBonus: result.streakBonus,
        streak: result.streak,
        totalScore: participant?.totalScore ?? null,
        rank: rankByParticipant.get(participantId) ?? null,
      });
    }
  }

  async function endSession(sessionId, room) {
    const session = await LiveSession.findByPk(sessionId);
    if (!session) return;
    if (room.round?.timer) clearTimeout(room.round.timer);
    room.round = null;
    session.status = 'finished';
    session.endedAt = new Date();
    await session.save();

    const leaderboard = await currentLeaderboard(sessionId, null, room);
    live.to(sessionId).emit('session:ended', { leaderboard });
    rooms.delete(sessionId);
  }

  live.on('connection', (socket) => {
    const { sessionId, role } = socket.data;
    socket.join(sessionId);
    const room = getRoom(sessionId);

    if (role === 'host') {
      room.hostSocketId = socket.id;
      broadcastRoster(sessionId).catch((e) => console.error('Live roster broadcast failed:', e));

      // Reconnect mid-game (e.g. the host refreshed the page): catch them up
      // on whatever's currently showing, same as a participant reconnect.
      (async () => {
        try {
          const session = await LiveSession.findByPk(sessionId);
          if (session?.status === 'question_open' && room.round) {
            const slide = room.slides?.[room.round.slideIndex];
            if (slide) {
              const { publicSlide } = prepareQuestion(slide);
              socket.emit('state:update', {
                slideIndex: room.round.slideIndex,
                slideCount: room.slides.length,
                status: 'question_open',
                slide: publicSlide,
                opensAt: room.round.opensAt,
                windowMs: room.round.windowMs,
              });
            }
          } else if (
            (session?.status === 'active' || session?.status === 'reveal') &&
            room.slides?.[session.currentSlideIndex]
          ) {
            socket.emit('state:update', {
              slideIndex: session.currentSlideIndex,
              slideCount: room.slides.length,
              status: session.status === 'reveal' ? 'reveal' : 'active',
              slide: room.slides[session.currentSlideIndex],
              opensAt: null,
              windowMs: null,
            });
          }
        } catch (e) {
          console.error('Live host reconnect catch-up failed:', e);
        }
      })();

      socket.on('host:start', async (_payload, ack) => {
        try {
          const session = await LiveSession.findByPk(sessionId);
          if (!session || session.status !== 'lobby') return ack?.({ ok: false, error: 'Session already started' });
          await ensureSlidesLoaded(sessionId, room);
          if (!room.slides.length) return ack?.({ ok: false, error: 'This lesson has no slides' });
          session.startedAt = new Date();
          await session.save();
          await pushSlide(sessionId, 0, room);
          ack?.({ ok: true });
        } catch (e) {
          console.error('Live host:start failed:', e);
          ack?.({ ok: false, error: 'Could not start the session' });
        }
      });

      socket.on('host:next', async (_payload, ack) => {
        try {
          const session = await LiveSession.findByPk(sessionId);
          if (!session) return ack?.({ ok: false, error: 'Session not found' });
          if (session.status === 'question_open') {
            return ack?.({ ok: false, error: 'Reveal the current question before moving on' });
          }
          await ensureSlidesLoaded(sessionId, room);
          const nextIndex = session.currentSlideIndex + 1;
          if (nextIndex >= room.slides.length) {
            await endSession(sessionId, room);
            return ack?.({ ok: true, ended: true });
          }
          await pushSlide(sessionId, nextIndex, room);
          ack?.({ ok: true });
        } catch (e) {
          console.error('Live host:next failed:', e);
          ack?.({ ok: false, error: 'Could not advance the session' });
        }
      });

      socket.on('host:reveal', async (_payload, ack) => {
        try {
          if (!room.round) return ack?.({ ok: false, error: 'No question is currently open' });
          await revealRound(sessionId, room);
          ack?.({ ok: true });
        } catch (e) {
          console.error('Live host:reveal failed:', e);
          ack?.({ ok: false, error: 'Could not reveal results' });
        }
      });

      socket.on('host:end', async (_payload, ack) => {
        try {
          await endSession(sessionId, room);
          ack?.({ ok: true });
        } catch (e) {
          console.error('Live host:end failed:', e);
          ack?.({ ok: false, error: 'Could not end the session' });
        }
      });

      socket.on('disconnect', () => {
        if (room.hostSocketId === socket.id) room.hostSocketId = null;
      });
    } else {
      const { participantId } = socket.data;
      room.participantSockets.set(participantId, socket.id);

      (async () => {
        try {
          const participant = await LiveParticipant.findByPk(participantId);
          if (participant) {
            participant.connected = true;
            await participant.save();
          }
          await broadcastRoster(sessionId);

          // Reconnect mid-game: catch them up on whatever's currently showing.
          const session = await LiveSession.findByPk(sessionId);
          if (session?.status === 'question_open' && room.round) {
            const slide = room.slides?.[room.round.slideIndex];
            if (slide) {
              const { publicSlide } = prepareQuestion(slide);
              socket.emit('state:update', {
                slideIndex: room.round.slideIndex,
                slideCount: room.slides.length,
                status: 'question_open',
                slide: publicSlide,
                opensAt: room.round.opensAt,
                windowMs: room.round.windowMs,
              });
            }
          } else if (session?.status === 'active' && room.slides?.[session.currentSlideIndex]) {
            socket.emit('state:update', {
              slideIndex: session.currentSlideIndex,
              slideCount: room.slides.length,
              status: 'active',
              slide: room.slides[session.currentSlideIndex],
              opensAt: null,
              windowMs: null,
            });
          }
        } catch (e) {
          console.error('Live participant connect handling failed:', e);
        }
      })();

      socket.on('participant:answer', async (payload, ack) => {
        try {
          const round = room.round;
          if (!round || payload?.slideIndex !== round.slideIndex) {
            return ack?.({ ok: false, error: 'This question is no longer open' });
          }
          if (round.responses.has(participantId)) {
            return ack?.({ ok: false, error: 'Already answered' });
          }

          const now = Date.now();
          const elapsedMs = now - round.opensAt;
          const response = sanitizeResponsePayload(payload.response);
          const correct = gradeResponse(round.answerKey, response);
          const basePoints = computePoints({ correct, elapsedMs, windowMs: round.windowMs });

          const streakInfo = room.streaks.get(participantId) || { current: 0, best: 0 };
          const nextStreak = correct ? streakInfo.current + 1 : 0;
          const streakBonus = computeStreakBonus(nextStreak);
          const points = basePoints + streakBonus;
          streakInfo.current = nextStreak;
          streakInfo.best = Math.max(streakInfo.best, nextStreak);
          room.streaks.set(participantId, streakInfo);

          round.responses.set(participantId, { correct, points, basePoints, streakBonus, streak: nextStreak, response });

          await LiveResponse.create({
            sessionId,
            participantId,
            slideIndex: round.slideIndex,
            responseData: response,
            correct,
            pointsAwarded: points,
            answeredAtMs: now,
          });
          const participant = await LiveParticipant.findByPk(participantId);
          if (participant) {
            await participant.increment('totalScore', { by: points });
          }

          if (room.hostSocketId) {
            // For choice slides, give the host the classic live per-option bar
            // chart — safe to compute here since the host already owns the
            // real (unsanitized) slide and this never reaches participants.
            const originalSlide = room.slides?.[round.slideIndex];
            let distribution;
            if (originalSlide?.type === 'choice') {
              distribution = new Array(originalSlide.options?.length || 0).fill(0);
              for (const r of round.responses.values()) {
                for (const optIdx of Array.isArray(r.response) ? r.response : []) {
                  if (Number.isInteger(optIdx) && distribution[optIdx] !== undefined) distribution[optIdx] += 1;
                }
              }
            }
            live.to(room.hostSocketId).emit('host:answerCount', {
              slideIndex: round.slideIndex,
              answered: round.responses.size,
              distribution,
            });
          }

          ack?.({ ok: true, correct, pointsAwarded: points, basePoints, streakBonus, streak: nextStreak });
        } catch (e) {
          console.error('Live participant:answer failed:', e);
          ack?.({ ok: false, error: 'Could not submit your answer' });
        }
      });

      socket.on('disconnect', async () => {
        try {
          if (room.participantSockets.get(participantId) === socket.id) {
            room.participantSockets.delete(participantId);
          }
          const participant = await LiveParticipant.findByPk(participantId);
          if (participant) {
            participant.connected = false;
            await participant.save();
          }
          await broadcastRoster(sessionId);
        } catch (e) {
          console.error('Live participant disconnect handling failed:', e);
        }
      });
    }
  });

  return io;
}

module.exports = { attachLiveSocket };
