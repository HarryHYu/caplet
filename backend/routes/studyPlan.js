const express = require('express');
const StudyPlan = require('../models/StudyPlan');
const MarkedAttempt = require('../models/MarkedAttempt');
const { requireAuth } = require('../middleware/auth');
const {
  publicOptions,
  normalizeConfig,
  validateConfig,
  markerSignal,
  generatePlan
} = require('../services/studyPlanService');

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

async function refreshFromMarkedAnswer(plan) {
  if (!plan || !plan.subjects.includes('economics')) return plan;
  const attempt = await latestMarkedAnswer(plan.userId);
  const signal = markerSignal(attempt);
  if (!signal || signal.fingerprint === plan.sourceFingerprint) return plan;

  const generated = generatePlan(configFromPlan(plan), {
    marker: attempt,
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
    plan = await refreshFromMarkedAnswer(plan);
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
    const attempt = config.subjects.includes('economics') ? await latestMarkedAnswer(req.user.id) : null;
    const generated = generatePlan(config, {
      marker: attempt,
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
    const attempt = plan.subjects.includes('economics') ? await latestMarkedAnswer(req.user.id) : null;
    const generated = generatePlan(configFromPlan(plan), {
      marker: attempt,
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
    const tasks = plan.tasks.map((task) => task.id === req.params.taskId
      ? {
          ...task,
          completed: req.body?.completed !== false,
          completedAt: req.body?.completed === false ? null : new Date().toISOString()
        }
      : task);
    if (!tasks.some((task) => task.id === req.params.taskId)) {
      return res.status(404).json({ message: 'Study task not found' });
    }
    await plan.update({ tasks });
    res.json({ studyPlan: serialize(plan) });
  } catch (error) {
    console.error('Update study task error:', error);
    res.status(500).json({ message: 'Could not update the study task' });
  }
});

module.exports = router;
