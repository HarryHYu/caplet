process.env.JWT_SECRET = 'test-jwt-secret-for-essay-tests';

jest.mock('../models/Essay');
jest.mock('../models/ReviewItem');
jest.mock('../services/essayParser');
// Bypass real JWT auth: inject a fixed user.
jest.mock('../middleware/auth', () => ({
  requireAuth: (req, _res, next) => {
    req.user = { id: 'test-user-1', dateOfBirth: '1990-01-01' };
    next();
  },
}));

const request = require('supertest');
const express = require('express');
const Essay = require('../models/Essay');
const { parseEssay } = require('../services/essayParser');
const essaysRouter = require('../routes/essays');

const createTestApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/essays', essaysRouter);
  return app;
};

describe('Essay routes', () => {
  let app;

  beforeEach(() => {
    app = createTestApp();
    jest.clearAllMocks();
  });

  describe('POST /api/essays', () => {
    it('creates an essay (no AI key required) and returns 201', async () => {
      Essay.create = jest.fn().mockResolvedValue({
        id: 'e1', title: 'Macbeth', originalText: 'Power corrupts.', parsedStructure: null,
      });

      const res = await request(app)
        .post('/api/essays')
        .send({ title: 'Macbeth', text: 'Power corrupts.' });

      expect(res.status).toBe(201);
      expect(res.body.essay.id).toBe('e1');
      expect(Essay.create).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'test-user-1', title: 'Macbeth', parsedStructure: null }),
      );
    });

    it('rejects a missing title or empty text with 400 and does not write', async () => {
      Essay.create = jest.fn();

      const noTitle = await request(app).post('/api/essays').send({ text: 'x' });
      expect(noTitle.status).toBe(400);

      const noText = await request(app).post('/api/essays').send({ title: 'T', text: '   ' });
      expect(noText.status).toBe(400);

      expect(Essay.create).not.toHaveBeenCalled();
    });
  });

  describe('GET /api/essays', () => {
    it('lists essays with a parsed flag and paragraph count', async () => {
      Essay.findAll = jest.fn().mockResolvedValue([
        {
          id: 'e1',
          title: 'Macbeth',
          parsedStructure: { bodyParagraphs: [{ topicSentence: 'a' }, { topicSentence: 'b' }] },
          createdAt: new Date('2026-01-01'),
          updatedAt: new Date('2026-01-02'),
        },
        { id: 'e2', title: 'Draft', parsedStructure: null, createdAt: new Date(), updatedAt: new Date() },
      ]);

      const res = await request(app).get('/api/essays');

      expect(res.status).toBe(200);
      expect(res.body.essays).toHaveLength(2);
      expect(res.body.essays[0]).toMatchObject({ parsed: true, paragraphCount: 2 });
      expect(res.body.essays[1]).toMatchObject({ parsed: false, paragraphCount: 0 });
    });
  });

  describe('POST /api/essays/:id/parse', () => {
    it('parses and stores the structure (AI mocked, no key)', async () => {
      const essay = {
        id: 'e1',
        originalText: 'Power corrupts. It always has.',
        update: jest.fn().mockResolvedValue(),
      };
      Essay.findOne = jest.fn().mockResolvedValue(essay);
      parseEssay.mockResolvedValue({
        thesis: 'Power corrupts.',
        bodyParagraphs: [{ topicSentence: 'x', text: 'x', quotes: [], techniques: [] }],
        conclusion: '',
      });

      const res = await request(app).post('/api/essays/e1/parse');

      expect(res.status).toBe(200);
      expect(parseEssay).toHaveBeenCalledWith('Power corrupts. It always has.');
      expect(essay.update).toHaveBeenCalledWith(
        expect.objectContaining({ parsedStructure: expect.objectContaining({ thesis: 'Power corrupts.' }) }),
      );
    });

    it('degrades gracefully with a 503 when AI is not configured', async () => {
      Essay.findOne = jest.fn().mockResolvedValue({ id: 'e1', originalText: 'x', update: jest.fn() });
      const err = new Error('AI is not configured on the server.');
      err.status = 503;
      parseEssay.mockRejectedValue(err);

      const res = await request(app).post('/api/essays/e1/parse');

      expect(res.status).toBe(503);
      expect(res.body.message).toMatch(/not configured/i);
    });

    it('404s when the essay does not belong to the user', async () => {
      Essay.findOne = jest.fn().mockResolvedValue(null);
      const res = await request(app).post('/api/essays/missing/parse');
      expect(res.status).toBe(404);
      expect(parseEssay).not.toHaveBeenCalled();
    });
  });
});
