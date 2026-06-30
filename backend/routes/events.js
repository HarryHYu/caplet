/**
 * Lightweight analytics event sink.
 *
 * POST /api/events  { type, entityType, entityId, metadata }
 *
 * Intentionally stateless for now — events are logged to stdout where Railway
 * captures them. A future migration can introduce a proper events table when
 * the analytics use-cases are better defined without a schema prematurely.
 *
 * Auth is optional (unauthenticated lesson views should still log events), so
 * we parse the JWT if present but don't require it.
 */
const express = require('express');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

const ALLOWED_TYPES = new Set([
  'slide_viewed',
  'lesson_started',
  'lesson_completed',
  'listing_clicked',
  'tool_used',
  'quiz_answered',
  'essay_opened',
  'revision_session',
]);

router.post('/', (req, res) => {
  const { type, entityType, entityId, metadata } = req.body || {};

  if (!type || typeof type !== 'string') {
    return res.status(400).json({ message: 'event type is required' });
  }

  // Resolve optional user from Authorization header (best-effort, never blocks).
  let userId = null;
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (token) {
      const decoded = jwt.verify(token, JWT_SECRET);
      userId = decoded?.id || null;
    }
  } catch {
    // unauthenticated — fine
  }

  // Log structured event to stdout. Railway and most log aggregators pick this up.
  console.log(
    JSON.stringify({
      event: type,
      entityType: entityType || null,
      entityId: entityId || null,
      userId,
      metadata: metadata && typeof metadata === 'object' ? metadata : {},
      ts: new Date().toISOString(),
    }),
  );

  res.json({ ok: true });
});

module.exports = router;
