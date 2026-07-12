jest.mock('../models', () => ({
  EconomicsExamSession: { create: jest.fn(), findOne: jest.fn(), findAll: jest.fn() },
  MarkedAttempt: { create: jest.fn() },
}));
jest.mock('../services/economicsMarker', () => ({ markEconomicsAnswer: jest.fn() }));
jest.mock('../middleware/auth', () => ({ requireAuth: (req, _res, next) => { req.user = { id: 'student-1' }; next(); } }));

const request = require('supertest');
const express = require('express');
const { EconomicsExamSession } = require('../models');
const examsRouter = require('../routes/economicsExams');

const app = express();
app.use(express.json());
app.use('/api/economics-exams', examsRouter);

const question = { id: 'pack:1', prompt: 'Explain how a cash rate rise affects aggregate demand.', markValue: 4, responseType: 'short_answer', focusArea: 'Monetary policy' };

describe('Economics exam sessions', () => {
  beforeEach(() => jest.clearAllMocks());

  it('starts a private timed session with a sanitized question snapshot', async () => {
    EconomicsExamSession.create.mockImplementation(async (value) => ({ id: 'session-1', ...value, questions: value.questions, answers: {}, results: [] }));
    const res = await request(app).post('/api/economics-exams').send({ packId: 'pack', packTitle: 'Practice pack', durationMinutes: 45, questions: [question] });
    expect(res.status).toBe(201);
    expect(res.body.session).toMatchObject({ id: 'session-1', status: 'in_progress', packId: 'pack' });
    expect(EconomicsExamSession.create).toHaveBeenCalledWith(expect.objectContaining({ userId: 'student-1', questions: [expect.objectContaining({ id: 'pack:1' })] }));
  });

  it('autosaves only answers that belong to the session', async () => {
    const session = { status: 'in_progress', questions: [question], answers: {}, update: jest.fn().mockResolvedValue() };
    EconomicsExamSession.findOne.mockResolvedValue(session);
    const res = await request(app).patch('/api/economics-exams/session-1').send({ answers: { 'pack:1': 'A cash rate rise raises borrowing costs and lowers spending.', unknown: 'ignore me' } });
    expect(res.status).toBe(200);
    expect(session.update).toHaveBeenCalledWith({ answers: { 'pack:1': 'A cash rate rise raises borrowing costs and lowers spending.' } });
  });

  it('lists concise session history for the current student', async () => {
    EconomicsExamSession.findAll.mockResolvedValue([{
      id: 'session-1', packId: 'pack', packTitle: 'Practice pack', status: 'submitted', startedAt: new Date(), expiresAt: new Date(), submittedAt: new Date(),
      questions: [question], answers: { 'pack:1': 'A completed response.' }, results: [{ estimatedMark: 3, markValue: 4 }],
    }]);
    const res = await request(app).get('/api/economics-exams');
    expect(res.status).toBe(200);
    expect(res.body.sessions[0]).toMatchObject({ id: 'session-1', answeredCount: 1, questionCount: 1, estimatedMark: 3, availableMarks: 4 });
  });
});
