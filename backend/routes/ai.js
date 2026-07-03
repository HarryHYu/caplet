const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { resolveEditorWorkspaceId } = require('../middleware/editorAuth');
const { generateLessonSlides, getClient } = require('../services/lessonAI');

const router = express.Router();

/**
 * The AI endpoints reuse the editor workspace concept purely for rate
 * limiting — /editor itself is public, so this no longer requires a code,
 * just resolves everyone to the shared default workspace bucket.
 */
async function requireEditor(req, res, next) {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    req.workspaceId = await resolveEditorWorkspaceId(token);
    next();
  } catch (e) {
    console.error('Editor workspace resolution failed:', e);
    res.status(500).json({ message: 'Internal server error' });
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
  const ALLOWED_MODELS    = ['gpt-5.4-nano', 'gpt-5.4-mini', 'gpt-5.4', 'gpt-5.5'];
  const FORMATTER_MODELS  = ['gpt-5.4-nano', 'gpt-5.4-mini'];

  const notes             = (req.body?.notes ?? '').toString();
  const title             = (req.body?.title ?? '').toString().slice(0, 200);
  const curriculum        = (req.body?.curriculum ?? '').toString().slice(0, 200);
  const audience          = (req.body?.audience ?? '').toString().slice(0, 100);
  const outputDescription = (req.body?.outputDescription ?? '').toString().slice(0, 2000);
  const slideCount        = Math.min(Math.max(parseInt(req.body?.slideCount, 10) || 15, 1), 50);
  const model             = ALLOWED_MODELS.includes(req.body?.model) ? req.body.model : 'gpt-5.4-mini';
  const formatterModel    = FORMATTER_MODELS.includes(req.body?.formatterModel) ? req.body.formatterModel : 'gpt-5.4-mini';

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
      formatterModel,
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
  const ALLOWED_MODELS   = ['gpt-5.4-nano', 'gpt-5.4-mini', 'gpt-5.4', 'gpt-5.5'];
  const FORMATTER_MODELS = ['gpt-5.4-nano', 'gpt-5.4-mini'];
  const message          = (req.body?.message ?? '').toString().trim().slice(0, 2000);
  const notes            = (req.body?.notes ?? '').toString().slice(0, 30000); // attachment / pasted content
  const lessonTitle      = (req.body?.lessonTitle ?? '').toString().slice(0, 200);
  const existingCount    = parseInt(req.body?.existingSlideCount, 10) || 0;
  const model            = ALLOWED_MODELS.includes(req.body?.model) ? req.body.model : 'gpt-5.4-mini';
  const formatterModel   = FORMATTER_MODELS.includes(req.body?.formatterModel) ? req.body.formatterModel : 'gpt-5.4-mini';
  const slideCount       = req.body?.slideCount ? Math.min(Math.max(parseInt(req.body.slideCount, 10) || 10, 1), 40) : null;

  if (!message) return res.status(400).json({ message: 'Message is required.' });
  if (notes.length + message.length > 30000) {
    return res.status(400).json({ message: 'Content too long — max 30,000 characters total.' });
  }

  const client = getClient();
  if (!client) return res.status(503).json({ message: 'AI not available — OPENAI_API_KEY not set.' });

  try {
    // Intent classification always uses mini — it's a simple routing task.
    const intent = await client.chat.completions.create({
      model: 'gpt-5.4-mini',
      max_completion_tokens: 400,
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
      // Use the user's explicit slide count from the slider; fall back to AI-extracted suggestion.
      const resolvedSlideCount = slideCount || Math.min(Math.max(parseInt(intent_parsed.slideCount, 10) || 5, 1), 40);
      // Prepend a hard count override so the planner respects the slider, not any quantity
      // words in the user's message (e.g. "give me a single slide" when slider is at 10).
      const countLine = `Required slide count: ${resolvedSlideCount} (this overrides any quantity mentioned below).`;
      const generationContent = [countLine, notes, intent_parsed.notes || message].filter(Boolean).join('\n\n');
      const out = await generateLessonSlides(generationContent, { title: lessonTitle, slideCount: resolvedSlideCount, model, formatterModel });
      return res.json({ action: 'generate', slides: out.slides, warnings: out.warnings || [] });
    }

    return res.json({ action: 'message', text: intent_parsed.text || '' });
  } catch (e) {
    const status = e.status || 502;
    console.error('AI lesson-chat error:', e.message);
    return res.status(status).json({ message: e.message || 'AI request failed' });
  }
});

// ---------------------------------------------------------------------------
// Tutor endpoint — per-user rate limit (not per-workspace like the editor).
// Auth: regular user JWT so lesson players can call it without editor access.
// ---------------------------------------------------------------------------
const tutorRecent = new Map();
const TUTOR_WINDOW_MS = 60 * 1000; // 1-minute window
const TUTOR_LIMIT = 10;             // 10 questions per user per minute

function throttleTutor(req, res, next) {
  const uid = req.user?.id;
  if (!uid) return next(); // edge: unauthenticated request already rejected by requireAuth
  const now = Date.now();
  const hits = (tutorRecent.get(uid) || []).filter((t) => now - t < TUTOR_WINDOW_MS);
  if (hits.length >= TUTOR_LIMIT) {
    return res.status(429).json({ message: 'Too many tutor questions — wait a moment and try again.' });
  }
  hits.push(now);
  tutorRecent.set(uid, hits);
  next();
}

// POST /api/ai/tutor  { lessonId, slide, question }
// Returns { answer } — a concise, educational AI explanation scoped to the slide.
router.post('/tutor', requireAuth, throttleTutor, async (req, res) => {
  const question = (req.body?.question ?? '').toString().trim().slice(0, 600);
  const slide = req.body?.slide; // slide object for context

  if (!question) return res.status(400).json({ message: 'question is required' });

  const client = getClient();
  if (!client) return res.status(503).json({ message: 'Tutor unavailable — AI not configured.' });

  // Build a compact slide summary so the AI can answer in context.
  let slideContext = '';
  if (slide && typeof slide === 'object') {
    const type = slide.type || 'unknown';
    const title = slide.title || slide.question || slide.heading || '';
    const body = slide.content || slide.explanation || '';
    slideContext = `Slide type: ${type}${title ? `. Title: ${title}` : ''}${body ? `. Content: ${String(body).slice(0, 600)}` : ''}`;
  }

  try {
    const completion = await client.chat.completions.create({
      model: 'gpt-5.4-mini',
      max_completion_tokens: 400,
      messages: [
        {
          role: 'system',
          content: [
            'You are a friendly, concise educational tutor helping a student understand lesson content.',
            'Answer the student\'s question clearly and simply in 2-4 sentences. Use plain English.',
            'If the question is unrelated to learning, politely redirect back to the lesson material.',
            slideContext ? `Context — ${slideContext}` : '',
          ].filter(Boolean).join('\n'),
        },
        { role: 'user', content: question },
      ],
    });

    const answer = completion.choices[0]?.message?.content?.trim() || '';
    res.json({ answer });
  } catch (e) {
    const status = e.status || 502;
    console.error('AI tutor error:', e.message);
    res.status(status).json({ message: e.message || 'Tutor request failed' });
  }
});

module.exports = router;
