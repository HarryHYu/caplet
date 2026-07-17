const express = require('express');
const StudyPlan = require('../models/StudyPlan');
const MarkedAttempt = require('../models/MarkedAttempt');
const { requireAuth } = require('../middleware/auth');
const {
  publicOptions,
  normalizeConfig,
  validateConfig,
  markerSignal,
  recommendationSignal,
  generatePlan
} = require('../services/studyPlanService');
const { getNextRecommendation } = require('../services/recommendationEngine');
const { getStudyMomentum } = require('../services/studyMomentumService');

const router = express.Router();
router.use(requireAuth);

function serialize(plan) {
  if (!plan) return null;
  return {
    id: plan.id,
    yearLevel: plan.yearLevel,
    subjects: plan.subjects,
    goal: plan.goal,
    examDates: plan.examDates,
    availableDays: plan.availableDays,
    minutesPerDay: plan.minutesPerDay,
    diagnosticAnswers: plan.diagnosticAnswers,
    weakTopics: plan.weakTopics,
    tasks: plan.tasks,
    sourceFingerprint: plan.sourceFingerprint,
    signalSummary: plan.signalSummary,
    generatedAt: plan.generatedAt,
    updatedAt: plan.updatedAt
  };
}

function configFromPlan(plan) {
  return {
    yearLevel: plan.yearLevel,
    subjects: plan.subjects,
    goal: plan.goal,
    examDates: plan.examDates,
    availableDays: plan.availableDays,
    minutesPerDay: plan.minutesPerDay,
    diagnosticAnswers: plan.diagnosticAnswers
  };
}

async function latestMarkedAnswer(userId) {
  return MarkedAttempt.findOne({
    where: { userId },
    order: [['updatedAt', 'DESC']]
  });
}

async function currentRecommendation(userId, subjects) {
  if (!subjects.includes('economics')) return null;
  await require('../services/questionBankService').ensureEconomicsQuestionBank();
  return getNextRecommendation(userId, 'economics');
}

async function refreshFromLearningEvidence(plan) {
  if (!plan || !plan.subjects.includes('economics')) return plan;
  const [attempt, recommendation] = await Promise.all([
    latestMarkedAnswer(plan.userId),
    currentRecommendation(plan.userId, plan.subjects),
  ]);
  const fingerprints = [markerSignal(attempt)?.fingerprint, recommendationSignal(recommendation)?.fingerprint].filter(Boolean).join('|');
  if (!fingerprints || fingerprints === plan.sourceFingerprint) return plan;

  const generated = generatePlan(configFromPlan(plan), {
    marker: attempt,
    recommendation,
    existingTasks: plan.tasks
  });
  await plan.update({
    weakTopics: generated.weakTopics,
    tasks: generated.tasks,
    sourceFingerprint: generated.sourceFingerprint,
    signalSummary: generated.signalSummary,
    generatedAt: generated.generatedAt
  });
  return plan;
}

// GET /api/study-plan — current plan, refreshed from the newest marked answer.
router.get('/', async (req, res) => {
  try {
    let plan = await StudyPlan.findOne({ where: { userId: req.user.id } });
    plan = await refreshFromLearningEvidence(plan);
    res.json({ studyPlan: serialize(plan), options: publicOptions() });
  } catch (error) {
    console.error('Get study plan error:', error);
    res.status(500).json({ message: 'Could not load your study plan' });
  }
});

// POST /api/study-plan/generate — create or replace a user's weekly plan.
router.post('/generate', async (req, res) => {
  try {
    const config = normalizeConfig(req.body);
    const errors = validateConfig(config);
    if (errors.length) return res.status(400).json({ message: errors[0], errors });

    const existing = await StudyPlan.findOne({ where: { userId: req.user.id } });
    const [attempt, recommendation] = await Promise.all([
      config.subjects.includes('economics') ? latestMarkedAnswer(req.user.id) : null,
      currentRecommendation(req.user.id, config.subjects),
    ]);
    const generated = generatePlan(config, {
      marker: attempt,
      recommendation,
      existingTasks: existing?.tasks || []
    });
    const values = {
      userId: req.user.id,
      ...generated.config,
      weakTopics: generated.weakTopics,
      tasks: generated.tasks,
      sourceFingerprint: generated.sourceFingerprint,
      signalSummary: generated.signalSummary,
      generatedAt: generated.generatedAt
    };
    const plan = existing ? await existing.update(values) : await StudyPlan.create(values);
    res.status(existing ? 200 : 201).json({ studyPlan: serialize(plan), options: publicOptions() });
  } catch (error) {
    console.error('Generate study plan error:', error);
    res.status(500).json({ message: 'Could not generate your study plan' });
  }
});

// POST /api/study-plan/regenerate — keep settings and build the next seven days.
router.post('/regenerate', async (req, res) => {
  try {
    const plan = await StudyPlan.findOne({ where: { userId: req.user.id } });
    if (!plan) return res.status(404).json({ message: 'Create a study plan first' });
    const [attempt, recommendation] = await Promise.all([
      plan.subjects.includes('economics') ? latestMarkedAnswer(req.user.id) : null,
      currentRecommendation(req.user.id, plan.subjects),
    ]);
    const generated = generatePlan(configFromPlan(plan), {
      marker: attempt,
      recommendation,
      existingTasks: plan.tasks
    });
    await plan.update({
      weakTopics: generated.weakTopics,
      tasks: generated.tasks,
      sourceFingerprint: generated.sourceFingerprint,
      signalSummary: generated.signalSummary,
      generatedAt: generated.generatedAt
    });
    res.json({ studyPlan: serialize(plan), options: publicOptions() });
  } catch (error) {
    console.error('Regenerate study plan error:', error);
    res.status(500).json({ message: 'Could not refresh your study plan' });
  }
});

// PATCH /api/study-plan/tasks/:taskId — persist completion for progress review.
router.patch('/tasks/:taskId', async (req, res) => {
  try {
    const plan = await StudyPlan.findOne({ where: { userId: req.user.id } });
    if (!plan) return res.status(404).json({ message: 'Study plan not found' });
    const completed = req.body?.completed !== false;
    const tasks = plan.tasks.map((task) => task.id === req.params.taskId
      ? {
          ...task,
          completed,
          completedAt: completed ? (task.completedAt || new Date().toISOString()) : null
        }
      : task);
    if (!tasks.some((task) => task.id === req.params.taskId)) {
      return res.status(404).json({ message: 'Study task not found' });
    }
    await plan.update({ tasks });
    const momentum = await getStudyMomentum(req.user.id, {
      timezoneOffset: req.body?.timezoneOffset ?? 0,
    });
    res.json({ studyPlan: serialize(plan), momentum });
  } catch (error) {
    console.error('Update study task error:', error);
    if (error.status === 400) return res.status(400).json({ message: error.message });
    res.status(500).json({ message: 'Could not update the study task' });
  }
});

module.exports = router;
