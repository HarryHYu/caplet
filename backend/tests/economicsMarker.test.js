process.env.JWT_SECRET = 'test-jwt-secret-for-economics-marker-tests';

jest.mock('../models/MarkedAttempt');
jest.mock('../services/economicsMarker', () => {
  const actual = jest.requireActual('../services/economicsMarker');
  return { ...actual, markEconomicsAnswer: jest.fn() };
});
// Bypass real JWT auth: inject a fixed user.
// Test user id is overridable via header so the rate-limit test can use an
// isolated bucket without leaking hits from earlier tests in this file (the
// route's throttle Map persists for the lifetime of the module).
jest.mock('../middleware/auth', () => ({
  requireAuth: (req, _res, next) => {
    req.user = { id: req.header('X-Test-User') || 'test-user-1' };
    next();
  },
}));

const request = require('supertest');
const express = require('express');
const MarkedAttempt = require('../models/MarkedAttempt');
const { markEconomicsAnswer } = require('../services/economicsMarker');
const economicsMarkerRouter = require('../routes/economicsMarker');

const createTestApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/economics-marker', economicsMarkerRouter);
  return app;
};

const SAMPLE_RESULT = {
  subject: 'economics',
  responseType: 'short_answer',
  question: 'Explain the effect of a cash rate rise on aggregate demand.',
  markValue: 6,
  focusArea: 'Monetary policy',
  studentAnswer: 'A cash rate rise increases borrowing costs, reducing consumption and investment.',
  estimatedMark: 4,
  band: 'Band 3 (4/6) - Sound',
  strengths: ['Correctly links cash rate to borrowing costs'],
  gaps: ['Missing discussion of the transmission mechanism'],
  terminology: ['transmission mechanism'],
  modelAnswer: 'A full model answer would explain...',
  nextRecommendation: 'Practice explaining monetary policy transmission.',
};

describe('Economics marker routes', () => {
  let app;

  beforeEach(() => {
    app = createTestApp();
    jest.clearAllMocks();
    MarkedAttempt.findOne = jest.fn().mockResolvedValue(null);
  });

  describe('POST /api/economics-marker', () => {
    it('marks an answer and persists the attempt', async () => {
      markEconomicsAnswer.mockResolvedValue(SAMPLE_RESULT);
      MarkedAttempt.create = jest.fn().mockResolvedValue({ id: 'a1', userId: 'test-user-1', ...SAMPLE_RESULT });

      const res = await request(app)
        .post('/api/economics-marker')
        .send({
          question: SAMPLE_RESULT.question,
          markValue: 6,
          responseType: 'short_answer',
          studentAnswer: SAMPLE_RESULT.studentAnswer,
          focusArea: 'Monetary policy',
        });

      expect(res.status).toBe(201);
      expect(res.body.attempt.id).toBe('a1');
      expect(markEconomicsAnswer).toHaveBeenCalledWith(
        expect.objectContaining({ question: SAMPLE_RESULT.question, markValue: 6 }),
      );
      expect(MarkedAttempt.create).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'test-user-1', estimatedMark: 4 }),
      );
    });

    it('keeps library source context and compares a retry to the prior attempt', async () => {
      markEconomicsAnswer.mockResolvedValue(SAMPLE_RESULT);
      MarkedAttempt.findOne = jest.fn().mockResolvedValue({ estimatedMark: 2 });
      MarkedAttempt.create = jest.fn().mockResolvedValue({ id: 'a2', estimatedMark: 4, ...SAMPLE_RESULT });

      const res = await request(app).post('/api/economics-marker').send({
        question: SAMPLE_RESULT.question,
        markValue: 6,
        responseType: 'short_answer',
        studentAnswer: SAMPLE_RESULT.studentAnswer,
        sourceResourceId: 'eco12-policy-sa-1',
        sourcePromptId: 'eco12-policy-sa-1',
        sourceFocusId: 'year-12-economic-management',
      });

      expect(res.status).toBe(201);
      expect(MarkedAttempt.create).toHaveBeenCalledWith(expect.objectContaining({
        sourceResourceId: 'eco12-policy-sa-1',
        sourceFocusId: 'year-12-economic-management',
      }));
      expect(res.body.improvement).toMatchObject({ previousMark: 2, change: 2 });
    });

    it('degrades gracefully with a 503 when AI is not configured', async () => {
      const err = new Error('AI is not configured on the server.');
      err.status = 503;
      markEconomicsAnswer.mockRejectedValue(err);
      MarkedAttempt.create = jest.fn();

      const res = await request(app)
        .post('/api/economics-marker')
        .send({ question: 'Q', markValue: 6, responseType: 'short_answer', studentAnswer: 'A real attempt answer here.' });

      expect(res.status).toBe(503);
      expect(res.body.message).toMatch(/not configured/i);
      expect(MarkedAttempt.create).not.toHaveBeenCalled();
    });

    it('returns the service validation error (e.g. too-short answer) without persisting', async () => {
      const err = new Error('Your answer looks too short to mark — write at least a couple of sentences.');
      err.status = 400;
      markEconomicsAnswer.mockRejectedValue(err);
      MarkedAttempt.create = jest.fn();

      const res = await request(app)
        .post('/api/economics-marker')
        .send({ question: 'Q', markValue: 6, responseType: 'short_answer', studentAnswer: 'short' });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/too short/i);
      expect(MarkedAttempt.create).not.toHaveBeenCalled();
    });

    it('rate-limits after 15 submissions in the window', async () => {
      markEconomicsAnswer.mockResolvedValue(SAMPLE_RESULT);
      MarkedAttempt.create = jest.fn().mockResolvedValue({ id: 'a1', ...SAMPLE_RESULT });

      for (let i = 0; i < 15; i++) {
        const ok = await request(app).post('/api/economics-marker').set('X-Test-User', 'rate-limit-user').send({
          question: 'Q', markValue: 6, responseType: 'short_answer', studentAnswer: 'A real attempt answer here.',
        });
        expect(ok.status).toBe(201);
      }

      const blocked = await request(app).post('/api/economics-marker').set('X-Test-User', 'rate-limit-user').send({
        question: 'Q', markValue: 6, responseType: 'short_answer', studentAnswer: 'A real attempt answer here.',
      });
      expect(blocked.status).toBe(429);
    });
  });

  describe('GET /api/economics-marker', () => {
    it('lists attempts for the current user', async () => {
      MarkedAttempt.findAll = jest.fn().mockResolvedValue([
        { id: 'a1', question: 'Q1', markValue: 6, estimatedMark: 4, band: 'Band 3', responseType: 'short_answer', focusArea: null, createdAt: new Date() },
      ]);

      const res = await request(app).get('/api/economics-marker');

      expect(res.status).toBe(200);
      expect(res.body.attempts).toHaveLength(1);
      expect(MarkedAttempt.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: 'test-user-1' } }),
      );
    });
  });

  describe('GET /api/economics-marker/:id', () => {
    it('404s when the attempt does not belong to the user', async () => {
      MarkedAttempt.findOne = jest.fn().mockResolvedValue(null);
      const res = await request(app).get('/api/economics-marker/missing');
      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /api/economics-marker/:id', () => {
    it('deletes an owned attempt', async () => {
      MarkedAttempt.destroy = jest.fn().mockResolvedValue(1);
      const res = await request(app).delete('/api/economics-marker/a1');
      expect(res.status).toBe(204);
      expect(MarkedAttempt.destroy).toHaveBeenCalledWith({ where: { id: 'a1', userId: 'test-user-1' } });
    });

    it('404s deleting an attempt that does not belong to the user', async () => {
      MarkedAttempt.destroy = jest.fn().mockResolvedValue(0);
      const res = await request(app).delete('/api/economics-marker/a1');
      expect(res.status).toBe(404);
    });
  });
});
