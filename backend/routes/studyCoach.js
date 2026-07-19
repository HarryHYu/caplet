const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { getRecommendations } = require('../services/recommendations');
const { getSyllabusProgress } = require('../services/syllabusProgress');
const { ensureSyllabusSeeded } = require('../services/syllabusSeed');

const router = express.Router();
router.use(requireAuth);

/* ─── Lesson recommendations ─────────────────────────────────────────────────
   The ported engine ranks content-matched lessons and study actions against the
   learner's weakest syllabus points, habits, and upcoming assessments. */
router.get('/recommendations', async (req, res) => {
  try {
    await ensureSyllabusSeeded();
    const limit = Math.min(parseInt(req.query.limit, 10) || 6, 12);
    const recommendations = await getRecommendations(req.user.id, { limit });
    res.json({ recommendations });
  } catch (e) {
    console.error('[study-coach] recommendations:', e.message);
    res.status(500).json({ recommendations: [], error: e.message });
  }
});

/* ─── Recommendation feedback events ─────────────────────────────────────────
   Batch log of shown/clicked/done — the engine's training signal. */
router.post('/rec-events', async (req, res) => {
  try {
    const { RecommendationEvent } = require('../models');
    const events = Array.isArray(req.body?.events) ? req.body.events.slice(0, 50) : [];
    const valid = events
      .filter((e) => e && e.recId && e.recType && ['shown', 'clicked', 'done'].includes(e.action))
      .map((e) => ({
        userId: req.user.id,
        recId: String(e.recId).slice(0, 120),
        recType: String(e.recType).slice(0, 40),
        action: e.action,
        topic: e.topic ? String(e.topic).slice(0, 200) : null,
        subject: e.subject ? String(e.subject).slice(0, 100) : null,
      }));
    if (valid.length) await RecommendationEvent.bulkCreate(valid);
    res.json({ logged: valid.length });
  } catch (e) {
    console.error('[study-coach] rec-events:', e.message);
    res.status(500).json({ logged: 0, error: e.message });
  }
});

/* ─── HSC syllabus-point progress (per subject) ───────────────────────────── */
router.get('/syllabus', async (req, res) => {
  try {
    const subject = String(req.query.subject || 'Economics');
    const progress = await getSyllabusProgress(req.user.id, subject);
    res.json(progress);
  } catch (e) {
    console.error('[study-coach] syllabus:', e.message);
    res.status(500).json({ modules: [], overallHscReadiness: 0, error: e.message });
  }
});

module.exports = router;
