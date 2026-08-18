/**
 * router.param UUID guards.
 *
 * Postgres raises `invalid input syntax for type uuid` — a 500 — when a
 * malformed id reaches a UUID-typed column, while SQLite silently tolerates
 * it, so the bug only shows in production. Every router whose params key a
 * UUID column mounts requireUuidParam, so a malformed id becomes a plain 404
 * that leaks nothing.
 *
 * Params NOT guarded (they are not UUIDs) are covered by comments in the
 * routers themselves: essay review item ids are `${essayId}:${index}` strings
 * carried in request bodies, and routes/review.js has no path params at all.
 */
process.env.JWT_SECRET = 'test-jwt-secret-for-uuid-guard-tests';

jest.mock('../middleware/auth', () => ({
  requireAuth: (req, _res, next) => {
    req.user = { id: 'user-1', dateOfBirth: '1990-01-01' };
    next();
  },
}));

jest.mock('../models/SavedSlide', () => ({ findOne: jest.fn(), findAll: jest.fn(), destroy: jest.fn() }));
jest.mock('../models/Lesson', () => ({ findOne: jest.fn(), findByPk: jest.fn() }));
jest.mock('../models/Course', () => ({ findOne: jest.fn(), findByPk: jest.fn() }));
jest.mock('../models/ReviewItem', () => ({ destroy: jest.fn(), findAll: jest.fn() }));
jest.mock('../services/practiceEngine', () => ({
  acknowledgePracticeFeedback: jest.fn(),
  answerPracticeQuestion: jest.fn(),
  completePracticeSession: jest.fn(),
  createPracticeSession: jest.fn(),
  savePracticeDraft: jest.fn(),
  serialiseSession: jest.fn(),
}));

const request = require('supertest');
const express = require('express');
const SavedSlide = require('../models/SavedSlide');
const practiceEngine = require('../services/practiceEngine');

const mount = (mountPath, router) => {
  const app = express();
  app.use(express.json());
  app.use(mountPath, router);
  return app;
};

describe('UUID route-param guards', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('savedSlides :id (SavedSlide UUID pk) 404s before the query', async () => {
    const app = mount('/api/saved-slides', require('../routes/savedSlides'));

    const res = await request(app).delete('/api/saved-slides/not-a-uuid');

    expect(res.status).toBe(404);
    expect(res.body.message).toBe('Saved slide not found');
    expect(SavedSlide.destroy).not.toHaveBeenCalled();
  });

  it('learning :id (PracticeSession UUID pk) 404s before the service runs', async () => {
    const app = mount('/api', require('../routes/learning'));

    const res = await request(app).patch('/api/practice/sessions/not-a-uuid/draft').send({});

    expect(res.status).toBe(404);
    expect(res.body.message).toBe('Practice session not found.');
    expect(practiceEngine.savePracticeDraft).not.toHaveBeenCalled();
  });

  it('review routes take no path params, so nothing is guarded there', () => {
    const reviewRouter = require('../routes/review');
    const paramNames = reviewRouter.stack
      .filter((layer) => layer.route)
      .flatMap((layer) => layer.route.path.split('/'))
      .filter((segment) => segment.startsWith(':'));

    expect(paramNames).toEqual([]);
  });
});
