jest.mock('../models/StudyPlan');
jest.mock('../models/MarkedAttempt');
jest.mock('../middleware/auth', () => ({
  requireAuth: (req, _res, next) => {
    req.user = { id: 'student-1' };
    next();
  }
}));

const request = require('supertest');
const express = require('express');
const StudyPlan = require('../models/StudyPlan');
const MarkedAttempt = require('../models/MarkedAttempt');
const router = require('../routes/studyPlan');

const config = {
  yearLevel: '12',
  subjects: ['economics'],
  goal: 'Prepare for my trial exam',
  examDates: { economics: '2026-09-01' },
  availableDays: [1, 3, 5],
  minutesPerDay: 40,
  diagnosticAnswers: { economics: 2 }
};

function app() {
  const instance = express();
  instance.use(express.json());
  instance.use('/api/study-plan', router);
  return instance;
}

function row(values) {
  const plan = { id: 'plan-1', userId: 'student-1', ...values };
  plan.update = jest.fn(async (updates) => Object.assign(plan, updates));
  return plan;
}

describe('/api/study-plan', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    StudyPlan.findOne = jest.fn().mockResolvedValue(null);
    MarkedAttempt.findOne = jest.fn().mockResolvedValue(null);
  });

  test('returns onboarding options when no plan exists', async () => {
    const response = await request(app()).get('/api/study-plan');
    expect(response.status).toBe(200);
    expect(response.body.studyPlan).toBeNull();
    expect(response.body.options.subjects.length).toBeGreaterThan(0);
  });

  test('validates required onboarding fields', async () => {
    const response = await request(app()).post('/api/study-plan/generate').send({ yearLevel: '12' });
    expect(response.status).toBe(400);
    expect(response.body.errors.length).toBeGreaterThan(0);
  });

  test('creates a persisted weekly plan', async () => {
    StudyPlan.create = jest.fn(async (values) => row(values));
    const response = await request(app()).post('/api/study-plan/generate').send(config);
    expect(response.status).toBe(201);
    expect(response.body.studyPlan.tasks.length).toBeGreaterThan(0);
    expect(response.body.studyPlan.tasks.length).toBeLessThanOrEqual(7);
    expect(StudyPlan.create).toHaveBeenCalledWith(expect.objectContaining({ userId: 'student-1' }));
  });

  test('refreshes an Economics plan after a new marked answer', async () => {
    const plan = row({
      ...config,
      weakTopics: [],
      tasks: [],
      sourceFingerprint: 'diagnostic:old',
      signalSummary: '',
      generatedAt: new Date('2026-07-01')
    });
    StudyPlan.findOne.mockResolvedValue(plan);
    MarkedAttempt.findOne.mockResolvedValue({
      id: 'attempt-2',
      updatedAt: new Date('2026-07-10'),
      estimatedMark: 8,
      markValue: 20,
      focusArea: 'Monetary policy transmission',
      gaps: []
    });
    const response = await request(app()).get('/api/study-plan');
    expect(response.status).toBe(200);
    expect(response.body.studyPlan.weakTopics[0].topic).toBe('Monetary policy transmission');
    expect(plan.update).toHaveBeenCalled();
  });

  test('persists task completion', async () => {
    const plan = row({ ...config, tasks: [{ id: 'task-1', completed: false }] });
    StudyPlan.findOne.mockResolvedValue(plan);
    const response = await request(app())
      .patch('/api/study-plan/tasks/task-1')
      .send({ completed: true });
    expect(response.status).toBe(200);
    expect(response.body.studyPlan.tasks[0].completed).toBe(true);
  });
});
