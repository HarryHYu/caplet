process.env.JWT_SECRET = 'test-jwt-secret-for-essay-tests';

jest.mock('../models/Essay');
jest.mock('../models/ReviewItem');
jest.mock('../services/essayParser');
jest.mock('../services/aiHistory', () => ({
  recordAIInteractionSafely: jest.fn().mockResolvedValue(null),
}));
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
const { parseEssay, fallbackStructure, segmentEssay } = require('../services/essayParser');
const { recordAIInteractionSafely } = require('../services/aiHistory');
const { resetAIQuotaForTests } = require('../middleware/aiQuota');
const essaysRouter = require('../routes/essays');

const createTestApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/essays', essaysRouter);
  return app;
};

describe('Essay routes', () => {
  describe('malformed :id', () => {
    it('404s a non-UUID id instead of letting Postgres raise a 500', async () => {
      Essay.findOne = jest.fn();
      const res = await request(app).get('/api/essays/not-a-uuid');
      expect(res.status).toBe(404);
      expect(res.body.message).toBe('Essay not found');
      // The guard short-circuits before any query is attempted.
      expect(Essay.findOne).not.toHaveBeenCalled();
    });
  });

  let app;

  beforeEach(() => {
    app = createTestApp();
    jest.clearAllMocks();
    // The parse route reserves shared in-memory AI quota units per request;
    // reset between tests so later parse tests never hit the window limit.
    resetAIQuotaForTests();
  });

  describe('POST /api/essays', () => {
    it('creates an essay (no AI key required) and returns 201', async () => {
      Essay.create = jest.fn().mockResolvedValue({
        id: '11111111-1111-4111-8111-111111111111', title: 'Macbeth', originalText: 'Power corrupts.', parsedStructure: null,
      });

      const res = await request(app)
        .post('/api/essays')
        .send({ title: 'Macbeth', text: 'Power corrupts.' });

      expect(res.status).toBe(201);
      expect(res.body.essay.id).toBe('11111111-1111-4111-8111-111111111111');
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
          id: '11111111-1111-4111-8111-111111111111',
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

    it('includes a wordCount and a 180-character excerpt for each essay', async () => {
      const longText = `  ${'word '.repeat(60)}end.  `;
      Essay.findAll = jest.fn().mockResolvedValue([
        {
          id: '11111111-1111-4111-8111-111111111111',
          title: 'Long essay',
          originalText: longText,
          parsedStructure: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        { id: 'e2', title: 'No text', originalText: '', parsedStructure: null, createdAt: new Date(), updatedAt: new Date() },
      ]);

      const res = await request(app).get('/api/essays');

      expect(res.status).toBe(200);
      expect(res.body.essays[0].wordCount).toBe(61);
      expect(res.body.essays[0].excerpt).toBe(longText.trim().slice(0, 180));
      expect(res.body.essays[0].excerpt).toHaveLength(180);
      expect(res.body.essays[1]).toMatchObject({ wordCount: 0, excerpt: '' });
    });
  });

  describe('PUT /api/essays/:id', () => {
    const makeEssay = (overrides = {}) => ({
      id: '11111111-1111-4111-8111-111111111111',
      title: 'Old title',
      originalText: 'Original essay text.',
      parsedStructure: { bodyParagraphs: [{ topicSentence: 'a' }] },
      update: jest.fn().mockResolvedValue(),
      ...overrides,
    });

    it('updates the title only and leaves parsedStructure untouched', async () => {
      const essay = makeEssay();
      Essay.findOne = jest.fn().mockResolvedValue(essay);

      const res = await request(app).put('/api/essays/11111111-1111-4111-8111-111111111111').send({ title: '  New title  ' });

      expect(res.status).toBe(200);
      // Exact-args match: no originalText and no parsedStructure key in the update.
      expect(essay.update).toHaveBeenCalledWith({ title: 'New title' });
    });

    it('replaces the text and clears parsedStructure when the text changes', async () => {
      const essay = makeEssay();
      Essay.findOne = jest.fn().mockResolvedValue(essay);

      const res = await request(app).put('/api/essays/11111111-1111-4111-8111-111111111111').send({ text: 'Rewritten essay text.' });

      expect(res.status).toBe(200);
      expect(essay.update).toHaveBeenCalledWith({
        originalText: 'Rewritten essay text.',
        parsedStructure: null,
      });
    });

    it('does NOT clear parsedStructure when the same text is sent back', async () => {
      const essay = makeEssay();
      Essay.findOne = jest.fn().mockResolvedValue(essay);

      const res = await request(app)
        .put('/api/essays/11111111-1111-4111-8111-111111111111')
        .send({ text: 'Original essay text.' });

      expect(res.status).toBe(200);
      expect(essay.update).not.toHaveBeenCalled();

      // Same text alongside a title change: only the title is written.
      const res2 = await request(app)
        .put('/api/essays/11111111-1111-4111-8111-111111111111')
        .send({ title: 'Renamed', text: 'Original essay text.' });
      expect(res2.status).toBe(200);
      expect(essay.update).toHaveBeenCalledWith({ title: 'Renamed' });
    });

    it('rejects empty title, empty text, and oversized text with 400', async () => {
      const essay = makeEssay();
      Essay.findOne = jest.fn().mockResolvedValue(essay);

      const emptyTitle = await request(app).put('/api/essays/11111111-1111-4111-8111-111111111111').send({ title: '   ' });
      expect(emptyTitle.status).toBe(400);

      const emptyText = await request(app).put('/api/essays/11111111-1111-4111-8111-111111111111').send({ text: '   ' });
      expect(emptyText.status).toBe(400);

      const oversized = await request(app)
        .put('/api/essays/11111111-1111-4111-8111-111111111111')
        .send({ text: 'x'.repeat(100001) });
      expect(oversized.status).toBe(400);
      expect(oversized.body.message).toMatch(/too long/i);

      expect(essay.update).not.toHaveBeenCalled();
    });

    it("404s for another user's essay (owner-scoped lookup)", async () => {
      Essay.findOne = jest.fn().mockResolvedValue(null);

      const res = await request(app).put('/api/essays/33333333-3333-4333-8333-333333333333').send({ title: 'Steal' });

      expect(res.status).toBe(404);
      expect(Essay.findOne).toHaveBeenCalledWith({
        where: { id: '33333333-3333-4333-8333-333333333333', userId: 'test-user-1' },
      });
    });
  });

  describe('POST /api/essays/:id/parse', () => {
    it('parses and stores the structure via a text-conditional update (AI mocked, no key)', async () => {
      const essay = { id: '11111111-1111-4111-8111-111111111111', title: 'Macbeth', originalText: 'Power corrupts. It always has.' };
      Essay.findOne = jest.fn().mockResolvedValue(essay);
      Essay.update = jest.fn().mockResolvedValue([1]);
      parseEssay.mockResolvedValue({
        thesis: 'Power corrupts.',
        bodyParagraphs: [{ topicSentence: 'x', text: 'x', quotes: [], techniques: [] }],
        conclusion: '',
      });

      const res = await request(app).post('/api/essays/11111111-1111-4111-8111-111111111111/parse');

      expect(res.status).toBe(200);
      expect(parseEssay).toHaveBeenCalledWith(
        'Power corrupts. It always has.',
        { model: 'gpt-5.4-mini', onDegrade: expect.any(Function) },
      );
      // The write only lands when the text is still the text that was parsed.
      expect(Essay.update).toHaveBeenCalledWith(
        { parsedStructure: expect.objectContaining({ thesis: 'Power corrupts.' }) },
        { where: { id: '11111111-1111-4111-8111-111111111111', userId: 'test-user-1', originalText: 'Power corrupts. It always has.' } },
      );
      // On success the essay is reloaded and returned.
      expect(res.body.essay).toMatchObject({ id: '11111111-1111-4111-8111-111111111111' });
      expect(recordAIInteractionSafely).toHaveBeenCalledWith(
        expect.objectContaining({ modelVersion: 'gpt-5.4-mini' }),
      );
    });

    it('degrades gracefully with a 503 when AI is not configured', async () => {
      Essay.findOne = jest.fn().mockResolvedValue({ id: '11111111-1111-4111-8111-111111111111', originalText: 'x' });
      Essay.update = jest.fn();
      const err = new Error('AI is not configured on the server.');
      err.status = 503;
      parseEssay.mockRejectedValue(err);

      const res = await request(app).post('/api/essays/11111111-1111-4111-8111-111111111111/parse');

      expect(res.status).toBe(503);
      expect(res.body.message).toMatch(/not configured/i);
      expect(Essay.update).not.toHaveBeenCalled();
    });

    it('404s when the essay does not belong to the user', async () => {
      Essay.findOne = jest.fn().mockResolvedValue(null);
      const res = await request(app).post('/api/essays/22222222-2222-4222-8222-222222222222/parse');
      expect(res.status).toBe(404);
      expect(parseEssay).not.toHaveBeenCalled();
    });

    it('passes an allowed model choice through to parseEssay', async () => {
      const essay = { id: '11111111-1111-4111-8111-111111111111', title: 'T', originalText: 'Some essay text.' };
      Essay.findOne = jest.fn().mockResolvedValue(essay);
      Essay.update = jest.fn().mockResolvedValue([1]);
      parseEssay.mockResolvedValue({ thesis: '', bodyParagraphs: [], conclusion: '' });

      const res = await request(app).post('/api/essays/11111111-1111-4111-8111-111111111111/parse').send({ model: 'gpt-5.5' });

      expect(res.status).toBe(200);
      expect(parseEssay).toHaveBeenCalledWith(
        'Some essay text.',
        { model: 'gpt-5.5', onDegrade: expect.any(Function) },
      );
    });

    it('falls back to gpt-5.4-mini when the requested model is not in the allowlist', async () => {
      const essay = { id: '11111111-1111-4111-8111-111111111111', title: 'T', originalText: 'Some essay text.' };
      Essay.findOne = jest.fn().mockResolvedValue(essay);
      Essay.update = jest.fn().mockResolvedValue([1]);
      parseEssay.mockResolvedValue({ thesis: '', bodyParagraphs: [], conclusion: '' });

      const res = await request(app)
        .post('/api/essays/11111111-1111-4111-8111-111111111111/parse')
        .send({ model: 'gpt-4-totally-bogus' });

      expect(res.status).toBe(200);
      expect(parseEssay).toHaveBeenCalledWith(
        'Some essay text.',
        { model: 'gpt-5.4-mini', onDegrade: expect.any(Function) },
      );
    });

    it('returns the cached structure without calling parseEssay when already parsed', async () => {
      const essay = {
        id: '11111111-1111-4111-8111-111111111111',
        originalText: 'Some essay text.',
        parsedStructure: { thesis: 'Cached thesis', bodyParagraphs: [] },
      };
      Essay.findOne = jest.fn().mockResolvedValue(essay);
      Essay.update = jest.fn();

      const res = await request(app).post('/api/essays/11111111-1111-4111-8111-111111111111/parse').send({});

      expect(res.status).toBe(200);
      expect(res.body.cached).toBe(true);
      expect(res.body.essay.parsedStructure.thesis).toBe('Cached thesis');
      expect(parseEssay).not.toHaveBeenCalled();
      expect(Essay.update).not.toHaveBeenCalled();
    });

    it('serves the cached fast-path without consuming AI quota (never 429s)', async () => {
      const essay = {
        id: '11111111-1111-4111-8111-111111111111',
        originalText: 'Some essay text.',
        parsedStructure: { thesis: 'Cached thesis', bodyParagraphs: [] },
      };
      Essay.findOne = jest.fn().mockResolvedValue(essay);

      // 6 units per parse against a 40-unit window: the 7th reservation would
      // 429 if the cached path went through the quota middleware.
      for (let i = 0; i < 10; i += 1) {
        const res = await request(app).post('/api/essays/11111111-1111-4111-8111-111111111111/parse').send({});
        expect(res.status).toBe(200);
        expect(res.body.cached).toBe(true);
      }
      expect(parseEssay).not.toHaveBeenCalled();
    });

    it('re-parses an already-parsed essay when force is true', async () => {
      const essay = {
        id: '11111111-1111-4111-8111-111111111111',
        title: 'T',
        originalText: 'Some essay text.',
        parsedStructure: { thesis: 'Stale thesis', bodyParagraphs: [] },
      };
      Essay.findOne = jest.fn().mockResolvedValue(essay);
      Essay.update = jest.fn().mockResolvedValue([1]);
      parseEssay.mockResolvedValue({ thesis: 'Fresh thesis', bodyParagraphs: [], conclusion: '' });

      const res = await request(app)
        .post('/api/essays/11111111-1111-4111-8111-111111111111/parse')
        .send({ force: true, model: 'gpt-5.4' });

      expect(res.status).toBe(200);
      expect(res.body.cached).toBeUndefined();
      expect(parseEssay).toHaveBeenCalledWith(
        'Some essay text.',
        { model: 'gpt-5.4', onDegrade: expect.any(Function) },
      );
      expect(Essay.update).toHaveBeenCalledWith(
        { parsedStructure: expect.objectContaining({ thesis: 'Fresh thesis' }) },
        { where: { id: '11111111-1111-4111-8111-111111111111', userId: 'test-user-1', originalText: 'Some essay text.' } },
      );
    });

    it('structures oversize essays deterministically without an AI call', async () => {
      const longText = 'x'.repeat(24001);
      const essay = { id: '11111111-1111-4111-8111-111111111111', title: 'Long essay', originalText: longText };
      Essay.findOne = jest.fn().mockResolvedValue(essay);
      Essay.update = jest.fn().mockResolvedValue([1]);
      const deterministic = {
        thesis: '',
        introduction: '',
        bodyParagraphs: [{ topicSentence: 'p1', text: 'p1', quotes: [], techniques: [] }],
        conclusion: '',
      };
      segmentEssay.mockReturnValue([{ heading: '', notes: [], text: 'p1' }, { heading: '', notes: [], text: 'p2' }]);
      fallbackStructure.mockReturnValue(deterministic);

      const res = await request(app).post('/api/essays/11111111-1111-4111-8111-111111111111/parse');

      expect(res.status).toBe(200);
      expect(res.body.essay).toMatchObject({ id: '11111111-1111-4111-8111-111111111111' });
      expect(parseEssay).not.toHaveBeenCalled();
      expect(segmentEssay).toHaveBeenCalledWith(longText);
      expect(fallbackStructure).toHaveBeenCalledWith([{ heading: '', notes: [], text: 'p1' }, { heading: '', notes: [], text: 'p2' }]);
      expect(Essay.update).toHaveBeenCalledWith(
        { parsedStructure: deterministic },
        { where: { id: '11111111-1111-4111-8111-111111111111', userId: 'test-user-1', originalText: longText } },
      );
      expect(recordAIInteractionSafely).toHaveBeenCalledWith(
        expect.objectContaining({ modelVersion: 'deterministic-fallback' }),
      );
    });

    it('responds 409 when the text changed while it was being parsed (conditional update misses)', async () => {
      const essay = { id: '11111111-1111-4111-8111-111111111111', title: 'T', originalText: 'Original text at parse time.' };
      Essay.findOne = jest.fn().mockResolvedValue(essay);
      Essay.update = jest.fn().mockResolvedValue([0]);
      parseEssay.mockResolvedValue({ thesis: '', bodyParagraphs: [], conclusion: '' });

      const res = await request(app).post('/api/essays/11111111-1111-4111-8111-111111111111/parse');

      expect(res.status).toBe(409);
      expect(res.body.message).toBe('The essay changed while it was being mapped. Rescan to update.');
      expect(recordAIInteractionSafely).not.toHaveBeenCalled();
    });

    it("records the model as '<model> (fallback)' when parseEssay degrades", async () => {
      const essay = { id: '11111111-1111-4111-8111-111111111111', title: 'T', originalText: 'Some essay text.' };
      Essay.findOne = jest.fn().mockResolvedValue(essay);
      Essay.update = jest.fn().mockResolvedValue([1]);
      parseEssay.mockImplementation(async (_text, opts) => {
        opts.onDegrade(new Error('ai output unusable'));
        return {
          thesis: '',
          bodyParagraphs: [{ topicSentence: 't', text: 't', quotes: [], techniques: [] }],
          conclusion: '',
        };
      });

      const res = await request(app).post('/api/essays/11111111-1111-4111-8111-111111111111/parse').send({ model: 'gpt-5.5' });

      expect(res.status).toBe(200);
      expect(recordAIInteractionSafely).toHaveBeenCalledWith(
        expect.objectContaining({ modelVersion: 'gpt-5.5 (fallback)' }),
      );
    });
  });
});
