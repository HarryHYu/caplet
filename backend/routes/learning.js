const express = require('express');
const { Op } = require('sequelize');
const { requireAuth } = require('../middleware/auth');
const { getNextRecommendation } = require('../services/recommendationEngine');
const {
  acknowledgePracticeFeedback,
  answerPracticeQuestion,
  completePracticeSession,
  createPracticeSession,
  savePracticeDraft,
  serialiseSession,
} = require('../services/practiceEngine');

const router = express.Router();
router.use(requireAuth);

router.get('/learning/today', async (req, res) => {
  try {
    const today = await require('../services/learningTodayService').getLearningToday(req.user.id);
    res.json(today);
  } catch (error) {
    console.error('Get learning today error:', error);
    res.status(500).json({ message: 'Could not choose today’s learning actions.' });
  }
});

router.get('/mastery', async (req, res) => {
  try {
    const { CurriculumOutcome, MasteryState } = require('../models');
    const subject = String(req.query.subject || 'economics').toLowerCase();
    if (subject === 'economics') await require('../services/questionBankService').ensureEconomicsQuestionBank();
    const syllabusVersion = subject === 'economics'
      ? String(req.query.syllabusVersion || 'NSW-2025')
      : null;
    const where = { subject, isActive: true };
    if (syllabusVersion) where.syllabusVersion = syllabusVersion;
    const outcomes = await CurriculumOutcome.findAll({ where, order: [['sortOrder', 'ASC'], ['code', 'ASC']] });
    const states = outcomes.length
      ? await MasteryState.findAll({ where: { userId: req.user.id, outcomeId: { [Op.in]: outcomes.map((outcome) => outcome.id) } } })
      : [];
    const statesByOutcome = new Map(states.map((state) => [String(state.outcomeId), state.toJSON ? state.toJSON() : state]));
    const now = new Date();
    const rows = outcomes.map((outcome) => {
      const plain = outcome.toJSON ? outcome.toJSON() : outcome;
      const state = statesByOutcome.get(String(outcome.id)) || {};
      return {
        id: plain.id,
        code: plain.code,
        title: plain.title,
        description: plain.description,
        parentId: plain.parentId,
        probability: Number(state.probability || 0.2),
        confidence: state.confidence || 'low',
        evidenceCount: Number(state.evidenceCount || 0),
        lastDemonstratedAt: state.lastDemonstratedAt || null,
        retentionStrength: Number(state.retentionStrength || 0),
        nextReviewAt: state.nextReviewAt || now,
        misconceptions: state.misconceptions || [],
        mastered: Boolean(state.metadata?.mastered),
      };
    });
    const mastered = rows.filter((row) => row.mastered).length;
    const dueForReview = rows.filter((row) => row.evidenceCount && new Date(row.nextReviewAt) <= now).length;
    const averageProbability = rows.length ? rows.reduce((sum, row) => sum + row.probability, 0) / rows.length : 0;
    res.json({
      subject,
      syllabusVersion,
      summary: { totalOutcomes: rows.length, mastered, dueForReview, averageProbability: Number(averageProbability.toFixed(4)) },
      outcomes: rows,
      generatedAt: now.toISOString(),
    });
  } catch (error) {
    console.error('Get mastery error:', error);
    res.status(500).json({ message: 'Could not load mastery.' });
  }
});

router.get('/recommendations/next', async (req, res) => {
  try {
    const subject = String(req.query.subject || 'economics').toLowerCase();
    if (subject === 'economics') await require('../services/questionBankService').ensureEconomicsQuestionBank();
    const recommendation = await getNextRecommendation(req.user.id, subject);
    const { recordProductEvent } = require('../services/productEvents');
    await recordProductEvent({
      idempotencyKey: `recommendation-displayed:${req.user.id}:${recommendation?.outcome?.id || recommendation?.mode || 'none'}:${new Date().toISOString().slice(0, 13)}`,
      type: 'recommendation_displayed',
      userId: req.user.id,
      outcomeId: recommendation?.outcome?.id || null,
      feature: 'next_best_action',
      entityType: recommendation?.type || 'recommendation',
      entityId: recommendation?.outcome?.id || recommendation?.mode || null,
      metadata: { reasonCode: recommendation?.reasonCode, mode: recommendation?.mode, score: recommendation?.score },
    });
    res.json({ recommendation });
  } catch (error) {
    console.error('Get recommendation error:', error);
    res.status(500).json({ message: 'Could not choose the next learning action.' });
  }
});

router.post('/practice/sessions', async (req, res) => {
  try {
    const session = await createPracticeSession(req.user.id, req.body || {});
    res.status(201).json({ session });
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message || 'Could not start practice.' });
  }
});

router.get('/practice/sessions/:id', async (req, res) => {
  try {
    const { PracticeSession } = require('../models');
    const session = await PracticeSession.findOne({ where: { id: req.params.id, userId: req.user.id } });
    if (!session) return res.status(404).json({ message: 'Practice session not found.' });
    res.json({ session: await serialiseSession(session) });
  } catch {
    res.status(500).json({ message: 'Could not load practice.' });
  }
});

router.patch('/practice/sessions/:id/draft', async (req, res) => {
  try {
    const session = await savePracticeDraft(req.user.id, req.params.id, req.body || {});
    res.json({ session });
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message || 'Could not save this draft.' });
  }
});

router.patch('/practice/sessions/:id/feedback', async (req, res) => {
  try {
    const session = await acknowledgePracticeFeedback(req.user.id, req.params.id);
    res.json({ session });
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message || 'Could not continue this session.' });
  }
});

router.post('/practice/sessions/:id/answers', async (req, res) => {
  try {
    const { canUseAI } = require('../services/privacyConsent');
    const { isFeatureEnabled } = require('../services/featureFlagService');
    const [consentAllowsAI, featureAllowsAI] = await Promise.all([
      canUseAI(req.user),
      isFeatureEnabled('practice.ai_feedback', { stableId: req.user.id, fallback: false }),
    ]);
    const globalBudget = consentAllowsAI && featureAllowsAI
      ? await require('../middleware/aiQuota').consumeAIUnitsForRequest(`user:${req.user.id}`, 1)
      : { ok: false };
    const result = await answerPracticeQuestion(req.user.id, req.params.id, req.body || {}, {
      allowAI: consentAllowsAI && featureAllowsAI && globalBudget.ok,
    });
    res.json(result);
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message || 'Could not record that answer.' });
  }
});

router.post('/practice/sessions/:id/complete', async (req, res) => {
  try {
    res.json(await completePracticeSession(req.user.id, req.params.id));
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message || 'Could not complete practice.' });
  }
});

module.exports = router;
