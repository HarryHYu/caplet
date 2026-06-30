process.env.JWT_SECRET = 'test-jwt-secret-for-review-tests';

jest.mock('../models/ReviewItem');
// Bypass real JWT auth: inject a fixed user.
jest.mock('../middleware/auth', () => ({
  requireAuth: (req, _res, next) => {
    req.user = { id: 'test-user-1' };
    next();
  },
}));

const request = require('supertest');
const express = require('express');
const ReviewItem = require('../models/ReviewItem');
const reviewRouter = require('../routes/review');

const createTestApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/review', reviewRouter);
  return app;
};

describe('Review routes (shared spaced-repetition scheduler)', () => {
  let app;

  beforeEach(() => {
    app = createTestApp();
    jest.clearAllMocks();
  });

  describe('GET /api/review/due', () => {
    it('returns the user\'s due items', async () => {
      ReviewItem.findAll = jest.fn().mockResolvedValue([
        { id: 'r1', itemType: 'savedSlide', itemId: 's1' },
      ]);

      const res = await request(app).get('/api/review/due');

      expect(res.status).toBe(200);
      expect(res.body.items).toHaveLength(1);
      expect(ReviewItem.findAll).toHaveBeenCalled();
    });

    it('rejects an unknown itemType filter with 400', async () => {
      ReviewItem.findAll = jest.fn();
      const res = await request(app).get('/api/review/due?itemType=bogus');
      expect(res.status).toBe(400);
      expect(ReviewItem.findAll).not.toHaveBeenCalled();
    });
  });

  describe('POST /api/review/submit', () => {
    it('schedules a new item at stage 0 on first pass (201)', async () => {
      const item = { stage: 0, update: jest.fn().mockResolvedValue() };
      ReviewItem.findOrCreate = jest.fn().mockResolvedValue([item, true]); // created

      const res = await request(app)
        .post('/api/review/submit')
        .send({ itemType: 'savedSlide', itemId: 's1', recall: 'pass' });

      expect(res.status).toBe(201);
      expect(item.update).toHaveBeenCalledWith(
        expect.objectContaining({ stage: 0, lastRecall: 'pass' }),
      );
    });

    it('advances an existing stage-0 item to stage 1 on pass (200)', async () => {
      const item = { stage: 0, update: jest.fn().mockResolvedValue() };
      ReviewItem.findOrCreate = jest.fn().mockResolvedValue([item, false]); // existing

      const res = await request(app)
        .post('/api/review/submit')
        .send({ itemType: 'savedSlide', itemId: 's1', recall: 'pass' });

      expect(res.status).toBe(200);
      expect(item.update).toHaveBeenCalledWith(expect.objectContaining({ stage: 1 }));
    });

    it('resets a mature item to stage 0 on fail', async () => {
      const item = { stage: 3, update: jest.fn().mockResolvedValue() };
      ReviewItem.findOrCreate = jest.fn().mockResolvedValue([item, false]);

      const res = await request(app)
        .post('/api/review/submit')
        .send({ itemType: 'essayParagraph', itemId: 'essay-1:0', recall: 'fail' });

      expect(res.status).toBe(200);
      expect(item.update).toHaveBeenCalledWith(
        expect.objectContaining({ stage: 0, lastRecall: 'fail' }),
      );
    });

    it('400s when itemType or itemId is missing', async () => {
      ReviewItem.findOrCreate = jest.fn();

      const missingType = await request(app)
        .post('/api/review/submit')
        .send({ itemId: 's1', recall: 'pass' });
      expect(missingType.status).toBe(400);

      const missingId = await request(app)
        .post('/api/review/submit')
        .send({ itemType: 'savedSlide', recall: 'pass' });
      expect(missingId.status).toBe(400);

      expect(ReviewItem.findOrCreate).not.toHaveBeenCalled();
    });
  });
});
