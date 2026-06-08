const express = require('express');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../middleware/auth');
const { generateLessonSlides, getClient } = require('../services/lessonAI');

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

// Conversational chat: interprets a natural-language message and either
// generates slides (action="generate") or answers the question (action="message").
router.post('/lesson-chat', requireEditor, throttle, async (req, res) => {
  const ALLOWED_MODELS = ['gpt-5.4-nano', 'gpt-5.4-mini', 'gpt-5.4', 'gpt-5.5'];
  const message        = (req.body?.message ?? '').toString().trim().slice(0, 2000);
  const lessonTitle    = (req.body?.lessonTitle ?? '').toString().slice(0, 200);
  const existingCount  = parseInt(req.body?.existingSlideCount, 10) || 0;
  const model          = ALLOWED_MODELS.includes(req.body?.model) ? req.body.model : 'gpt-5.4-mini';

  if (!message) return res.status(400).json({ message: 'Message is required.' });

  const client = getClient();
  if (!client) return res.status(503).json({ message: 'AI not available — OPENAI_API_KEY not set.' });

  try {
    // Intent classification always uses mini — it's a simple routing task.
    const intent = await client.chat.completions.create({
      model: 'gpt-5.4-mini',
      max_tokens: 400,
      messages: [
        {
          role: 'system',
          content: [
            `You are a lesson-building assistant. The teacher is editing "${lessonTitle || 'a lesson'}" (${existingCount} slides).`,
            'If the message asks to add, create, or generate educational content (slides, questions, exercises, etc.), respond with ONLY this JSON:',
            '{"action":"generate","notes":"<detailed content description suitable for slide generation>","slideCount":<number 1-15>}',
            'If the message is a question, request for advice, or anything else, respond with ONLY this JSON:',
            '{"action":"message","text":"<your concise helpful response, max 3 sentences>"}',
            'Respond with valid JSON only — no markdown, no backticks.',
          ].join('\n'),
        },
        { role: 'user', content: message },
      ],
    });

    let intent_parsed;
    try {
      intent_parsed = JSON.parse(intent.choices[0].message.content.trim());
    } catch {
      intent_parsed = { action: 'message', text: intent.choices[0].message.content.trim() };
    }

    if (intent_parsed.action === 'generate') {
      const notes = intent_parsed.notes || message;
      const slideCount = Math.min(Math.max(parseInt(intent_parsed.slideCount, 10) || 5, 1), 15);
      const out = await generateLessonSlides(notes, { title: lessonTitle, slideCount, model });
      return res.json({ action: 'generate', slides: out.slides, warnings: out.warnings || [] });
    }

    return res.json({ action: 'message', text: intent_parsed.text || '' });
  } catch (e) {
    const status = e.status || 502;
    console.error('AI lesson-chat error:', e.message);
    return res.status(status).json({ message: e.message || 'AI request failed' });
  }
});

module.exports = router;
