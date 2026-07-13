const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { EconomicsExamSession, MarkedAttempt } = require('../models');
const { markEconomicsAnswer } = require('../services/economicsMarker');
const { requireAIConsent } = require('../services/privacyConsent');
const { reserveAIQuota } = require('../middleware/aiQuota');

const router = express.Router();
router.use(requireAuth);
const MAX_EXAM_QUESTIONS = 8;
const examMarkingQuota = reserveAIQuota({
  scope: 'economics-exam-marking',
  units: (req) => Math.max(2, Math.min(MAX_EXAM_QUESTIONS * 2, Number(req.body?.questionCount) || MAX_EXAM_QUESTIONS * 2)),
});
const text = (value, limit) => String(value || '').trim().slice(0, limit);

function sanitizeQuestions(input) {
  if (!Array.isArray(input) || input.length < 1 || input.length > MAX_EXAM_QUESTIONS) return [];
  return input.map((question, index) => ({
    id: text(question?.id, 200) || `question-${index + 1}`,
    prompt: text(question?.prompt, 5000),
    markValue: Math.max(1, Math.min(25, Number(question?.markValue) || 1)),
    responseType: ['short_answer', 'stimulus_response', 'extended_response'].includes(question?.responseType) ? question.responseType : 'short_answer',
    focusArea: text(question?.focusArea, 200) || null,
    stimulus: text(question?.stimulus, 5000) || null,
  })).filter((question) => question.prompt.length >= 5);
}
function serialize(session) {
  return { id: session.id, packId: session.packId, packTitle: session.packTitle, durationMinutes: session.durationMinutes, status: session.status, startedAt: session.startedAt, expiresAt: session.expiresAt, submittedAt: session.submittedAt, questions: session.questions, answers: session.answers, results: session.results };
}

router.post('/', async (req, res) => {
  try {
    const questions = sanitizeQuestions(req.body?.questions);
    const durationMinutes = Math.max(10, Math.min(240, Number(req.body?.durationMinutes) || 45));
    const packId = text(req.body?.packId, 200); const packTitle = text(req.body?.packTitle, 300);
    if (!packId || !packTitle || !questions.length) return res.status(400).json({ message: 'A valid exam pack and at least one written question are required.' });
    const now = new Date();
    const session = await EconomicsExamSession.create({ userId: req.user.id, packId, packTitle, durationMinutes, status: 'in_progress', questions, answers: {}, results: [], startedAt: now, expiresAt: new Date(now.getTime() + durationMinutes * 60000) });
    res.status(201).json({ session: serialize(session) });
  } catch (error) { console.error('Create exam session error:', error); res.status(500).json({ message: 'Could not start this exam session.' }); }
});

// Recent sessions power the dashboard's resume/history card. Keep the full
// question and response snapshots private to the detail endpoint.
router.get('/', async (req, res) => {
  try {
    const sessions = await EconomicsExamSession.findAll({
      where: { userId: req.user.id },
      order: [['updatedAt', 'DESC']],
      limit: 12,
    });
    res.json({ sessions: sessions.map((session) => {
      const results = session.results || [];
      return {
        id: session.id,
        packId: session.packId,
        packTitle: session.packTitle,
        status: session.status,
        startedAt: session.startedAt,
        expiresAt: session.expiresAt,
        submittedAt: session.submittedAt,
        answeredCount: Object.values(session.answers || {}).filter((answer) => String(answer || '').trim().length > 0).length,
        questionCount: (session.questions || []).length,
        estimatedMark: results.reduce((sum, result) => sum + (Number(result.estimatedMark) || 0), 0),
        availableMarks: results.reduce((sum, result) => sum + (Number(result.markValue) || 0), 0),
      };
    }) });
  } catch (error) { console.error('List exam sessions error:', error); res.status(500).json({ message: 'Could not load exam sessions.' }); }
});

router.get('/:id', async (req, res) => {
  try { const session = await EconomicsExamSession.findOne({ where: { id: req.params.id, userId: req.user.id } }); if (!session) return res.status(404).json({ message: 'Exam session not found.' }); res.json({ session: serialize(session) }); } catch (error) { console.error('Get exam session error:', error); res.status(500).json({ message: 'Could not load this exam session.' }); }
});

router.patch('/:id', async (req, res) => {
  try {
    const session = await EconomicsExamSession.findOne({ where: { id: req.params.id, userId: req.user.id } });
    if (!session) return res.status(404).json({ message: 'Exam session not found.' });
    if (session.status !== 'in_progress') return res.status(409).json({ message: 'This exam session has already been submitted.' });
    const allowed = new Set(session.questions.map((question) => question.id));
    const answers = Object.fromEntries(Object.entries(req.body?.answers || {}).filter(([id, answer]) => allowed.has(id) && typeof answer === 'string').map(([id, answer]) => [id, text(answer, 8000)]));
    await session.update({ answers }); res.json({ session: serialize(session) });
  } catch (error) { console.error('Save exam session error:', error); res.status(500).json({ message: 'Could not save this exam session.' }); }
});

router.post('/:id/submit', requireAIConsent, examMarkingQuota, async (req, res) => {
  try {
    const session = await EconomicsExamSession.findOne({ where: { id: req.params.id, userId: req.user.id } });
    if (!session) return res.status(404).json({ message: 'Exam session not found.' });
    if (session.status !== 'in_progress') return res.status(409).json({ message: 'This exam session has already been submitted.' });
    const unanswered = session.questions.find((question) => String(session.answers?.[question.id] || '').trim().length < 15);
    if (unanswered) return res.status(400).json({ message: 'Finish every written response before submitting the session.' });
    const results = [];
    for (const question of session.questions) {
      const sourceResourceId = `exam-session:${session.id}:${question.id}`;
      let attempt = await MarkedAttempt.findOne({ where: { userId: req.user.id, sourceResourceId } });
      let feedback;
      if (attempt) {
        feedback = attempt.toJSON();
      } else {
        feedback = await markEconomicsAnswer({ question: question.prompt, markValue: question.markValue, responseType: question.responseType, studentAnswer: session.answers[question.id], focusArea: question.focusArea });
        attempt = await MarkedAttempt.create({ userId: req.user.id, ...feedback, sourceResourceId, sourcePromptId: question.id, sourceFocusId: null });
        try {
          const { recordMarkedAttemptEvidence } = require('../services/learningEvidenceService');
          await recordMarkedAttemptEvidence({
            attempt,
            sourceKey: `economics:${question.id}`,
            assessmentType: 'timed_exam',
            metadata: { examSessionId: session.id, packId: session.packId, transfer: true },
          });
          const { recordAIInteraction } = require('../services/aiHistory');
          await recordAIInteraction({
            userId: req.user.id,
            feature: 'economics_exam_marking',
            modelVersion: feedback.modelVersion,
            promptVersion: feedback.promptVersion,
            status: 'completed',
            confidence: feedback.markingConfidence,
            inputSummary: question.prompt,
            outputSummary: `${feedback.estimatedMark}/${feedback.markValue}: ${feedback.nextRecommendation || feedback.band}`,
            metadata: { attemptId: attempt.id, examSessionId: session.id, practiceOnly: true },
          });
        } catch (integrationError) {
          console.error('Exam learning-history integration error:', integrationError.message);
        }
      }
      results.push({ questionId: question.id, ...feedback });
    }
    await session.update({ status: 'submitted', results, submittedAt: new Date() });
    res.json({ session: serialize(session) });
  } catch (error) { const status = error.status || 500; if (status >= 500) console.error('Submit exam session error:', error.message); res.status(status).json({ message: error.message || 'Could not mark this exam session.' }); }
});

module.exports = router;
