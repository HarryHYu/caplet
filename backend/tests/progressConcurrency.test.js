/**
 * Lost-update regressions for routes/progress.js.
 *
 * quizScores and bookmarks are serialized columns updated by a
 * read-modify-write. Two in-flight requests (a learner answering two quiz
 * slides, or double-tapping bookmark) each merged from their own stale
 * snapshot, so the later write silently dropped the earlier one. A true
 * concurrency test is impractical against a mocked model layer, so these
 * assert the transactional SHAPE that makes the merge atomic — one
 * transaction, the row read with a FOR UPDATE lock, findOrCreate instead of
 * findOne-then-create — plus the observable merge result.
 */
process.env.JWT_SECRET = 'test-jwt-secret-for-progress-tests';

const TX = { id: 'transaction', LOCK: { UPDATE: 'UPDATE' } };

jest.mock('../models/UserProgress', () => ({
  findOne: jest.fn(),
  findAll: jest.fn(),
  create: jest.fn(),
  findOrCreate: jest.fn(),
}));
jest.mock('../models/Lesson', () => ({ findByPk: jest.fn(), findAll: jest.fn() }));
jest.mock('../models/Module', () => ({ findAll: jest.fn() }));
jest.mock('../models/Course', () => ({ findOne: jest.fn(), findAll: jest.fn() }));
jest.mock('../services/productEvents', () => ({ recordProductEvent: jest.fn() }));
jest.mock('../services/studyTaskCompletionService', () => ({ completeMatchingStudyTask: jest.fn() }));
jest.mock('../middleware/auth', () => ({
  requireAuth: (req, _res, next) => {
    req.user = { id: 'user-1' };
    next();
  },
}));

const request = require('supertest');
const express = require('express');
const UserProgress = require('../models/UserProgress');
const Lesson = require('../models/Lesson');
const { sequelize } = require('../config/database');
const progressRouter = require('../routes/progress');

const LESSON_ID = '11111111-1111-4111-8111-111111111111';
const COURSE_ID = '22222222-2222-4222-8222-222222222222';

const createTestApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/progress', progressRouter);
  return app;
};

// A progress row that records what it was updated with, the way the real
// instance would.
const progressRow = (overrides = {}) => {
  const row = {
    id: 'progress-1',
    userId: 'user-1',
    courseId: COURSE_ID,
    lessonId: LESSON_ID,
    status: 'in_progress',
    quizScores: {},
    bookmarks: [],
    timeSpent: 0,
    completedAt: null,
    ...overrides,
  };
  row.update = jest.fn(async function update(values, options) {
    Object.assign(this, values);
    this.lastUpdateOptions = options;
    return this;
  });
  return row;
};

describe('progress read-modify-write races', () => {
  let app;
  let txSpy;

  beforeEach(() => {
    app = createTestApp();
    jest.clearAllMocks();
    txSpy = jest.spyOn(sequelize, 'transaction')
      .mockImplementation(async (callback) => callback(TX));
    Lesson.findByPk.mockResolvedValue({
      id: LESSON_ID,
      moduleId: 'module-1',
      content: 'Some lesson body',
      module: { courseId: COURSE_ID },
    });
  });

  afterEach(() => {
    txSpy.mockRestore();
  });

  describe('PUT /api/progress/lesson/:lessonId', () => {
    it('merges quizScores inside one transaction with the row locked FOR UPDATE', async () => {
      const row = progressRow({ quizScores: { '0': 1 } });
      UserProgress.findOrCreate.mockResolvedValue([row, false]);

      const res = await request(app)
        .put(`/api/progress/lesson/${LESSON_ID}`)
        .send({ quizScores: { 1: 0.5 } });

      expect(res.status).toBe(200);
      expect(sequelize.transaction).toHaveBeenCalledTimes(1);
      // The stale-snapshot merge is only safe while the row is locked.
      expect(UserProgress.findOrCreate).toHaveBeenCalledWith(expect.objectContaining({
        transaction: TX,
        lock: 'UPDATE',
      }));
      // The write joins the same transaction, so no other request can slip a
      // merge in between the read and the update.
      expect(row.update).toHaveBeenCalledWith(
        expect.objectContaining({ quizScores: { 0: 1, 1: 0.5 } }),
        { transaction: TX },
      );
      // The earlier slide's score survives the merge.
      expect(res.body.progress.quizScores).toEqual({ 0: 1, 1: 0.5 });
    });

    it('uses findOrCreate so concurrent first requests cannot create duplicate rows', async () => {
      UserProgress.findOrCreate.mockResolvedValue([progressRow({ status: 'not_started' }), true]);

      const res = await request(app)
        .put(`/api/progress/lesson/${LESSON_ID}`)
        .send({ lastSlideIndex: 3 });

      expect(res.status).toBe(200);
      expect(UserProgress.findOrCreate).toHaveBeenCalledWith(expect.objectContaining({
        where: { userId: 'user-1', courseId: COURSE_ID, lessonId: LESSON_ID },
        defaults: expect.objectContaining({ status: 'not_started' }),
      }));
      // The unguarded findOne-then-create pair is gone.
      expect(UserProgress.findOne).not.toHaveBeenCalled();
      expect(UserProgress.create).not.toHaveBeenCalled();
    });

    it('404s a malformed lessonId before any query (UUID param guard)', async () => {
      const res = await request(app).put('/api/progress/lesson/not-a-uuid').send({});

      expect(res.status).toBe(404);
      expect(res.body.message).toBe('Lesson not found');
      expect(Lesson.findByPk).not.toHaveBeenCalled();
    });
  });

  describe('POST /api/progress/bookmark/:lessonId', () => {
    it('pushes the bookmark inside one locked transaction', async () => {
      const row = progressRow({ bookmarks: ['other-lesson'] });
      UserProgress.findOrCreate.mockResolvedValue([row, false]);

      const res = await request(app).post(`/api/progress/bookmark/${LESSON_ID}`);

      expect(res.status).toBe(200);
      expect(sequelize.transaction).toHaveBeenCalledTimes(1);
      expect(UserProgress.findOrCreate).toHaveBeenCalledWith(expect.objectContaining({
        transaction: TX,
        lock: 'UPDATE',
      }));
      expect(row.update).toHaveBeenCalledWith(
        { bookmarks: ['other-lesson', LESSON_ID] },
        { transaction: TX },
      );
    });

    it('does not write when the bookmark is already present', async () => {
      const row = progressRow({ bookmarks: [LESSON_ID] });
      UserProgress.findOrCreate.mockResolvedValue([row, false]);

      const res = await request(app).post(`/api/progress/bookmark/${LESSON_ID}`);

      expect(res.status).toBe(200);
      expect(row.update).not.toHaveBeenCalled();
    });
  });

  describe('POST /api/progress/:lessonId/score', () => {
    it('merges _score under the same lock so a per-slide write is not lost', async () => {
      const row = progressRow({ quizScores: { 0: 1 } });
      UserProgress.findOrCreate.mockResolvedValue([row, false]);

      const res = await request(app)
        .post(`/api/progress/${LESSON_ID}/score`)
        .send({ score: 80, answers: [{ correct: true }] });

      expect(res.status).toBe(200);
      expect(sequelize.transaction).toHaveBeenCalledTimes(1);
      expect(UserProgress.findOrCreate).toHaveBeenCalledWith(expect.objectContaining({
        transaction: TX,
        lock: 'UPDATE',
      }));
      const [values, options] = row.update.mock.calls[0];
      expect(options).toEqual({ transaction: TX });
      expect(values.quizScores[0]).toBe(1); // the earlier per-slide score survives
      expect(values.quizScores._score).toMatchObject({ score: 80 });
    });
  });
});
