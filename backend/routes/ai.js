const express = require('express');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../middleware/auth');
const { generateLessonSlides } = require('../services/lessonAI');

const router = express.Router();

/**
 * The AI endpoints reuse the editor JWT — only people who entered an
 * editor access code can call them. Regular site users never see this.
 */
function requireEditor(req, res, next) {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ message: 'No token provided' });
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.typ !== 'editor' || !decoded.wid) {
      return res.status(401).json({ message: 'Invalid editor token' });
    }
    req.workspaceId = decoded.wid;
    next();
  } catch {
    return res.status(401).json({ message: 'Invalid token' });
  }
}

// 20 AI generations per workspace per 15 minutes.
const recent = new Map();
const WINDOW_MS = 15 * 60 * 1000;
const LIMIT = 20;

function throttle(req, res, next) {
  const ws = req.workspaceId;
  const now = Date.now();
  const hits = (recent.get(ws) || []).filter((t) => now - t < WINDOW_MS);
  if (hits.length >= LIMIT) {
    return res.status(429).json({
      message: `Too many AI generations. You can run up to ${LIMIT} per 15 minutes — wait a moment and try again.`,
    });
  }
  hits.push(now);
  recent.set(ws, hits);
  next();
}

router.post('/generate-lesson', requireEditor, throttle, async (req, res) => {
  const ALLOWED_MODELS = ['gpt-5.4-nano', 'gpt-5.4-mini', 'gpt-5.4', 'gpt-5.5'];

  const notes             = (req.body?.notes ?? '').toString();
  const title             = (req.body?.title ?? '').toString().slice(0, 200);
  const curriculum        = (req.body?.curriculum ?? '').toString().slice(0, 200);
  const audience          = (req.body?.audience ?? '').toString().slice(0, 100);
  const outputDescription = (req.body?.outputDescription ?? '').toString().slice(0, 2000);
  const slideCount        = Math.min(Math.max(parseInt(req.body?.slideCount, 10) || 15, 3), 50);
  const model             = ALLOWED_MODELS.includes(req.body?.model) ? req.body.model : 'gpt-5.4-mini';

  if (!notes.trim() || notes.trim().length < 20) {
    return res.status(400).json({
      message: 'Add some notes or a topic description (at least 20 characters).',
    });
  }
  if (notes.length > 30000) {
    return res.status(400).json({ message: 'Notes are too long (max 30,000 characters).' });
  }

  try {
    const out = await generateLessonSlides(notes, {
      title,
      curriculum,
      audience,
      outputDescription,
      slideCount,
      model,
    });
    res.json(out);
  } catch (e) {
    const status = e.status || 502;
    console.error('AI generate-lesson error:', e.message, e.details || '');
    res.status(status).json({
      message: e.message || 'AI generation failed',
      details: e.details,
    });
  }
});

module.exports = router;
