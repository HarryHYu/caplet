process.env.JWT_SECRET = 'test-jwt-secret-for-essay-workspace-tests';

jest.mock('../models/Essay');
jest.mock('../models/EssayContextDoc');
jest.mock('../models/EssayAnnotation');
jest.mock('../models/ReviewItem');
jest.mock('../services/essayParser');
jest.mock('../services/essayAssistant');
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
const EssayContextDoc = require('../models/EssayContextDoc');
const EssayAnnotation = require('../models/EssayAnnotation');
const { assistEssay, explainEssay, rewriteSelection } = require('../services/essayAssistant');
const { firstSentence, extractQuotes } = require('../services/essayParser');
const { recordAIInteractionSafely } = require('../services/aiHistory');
const { resetAIQuotaForTests } = require('../middleware/aiQuota');
const { sequelize } = require('../config/database');
const essaysRouter = require('../routes/essays');

const createTestApp = () => {
  const app = express();
  // Same body limit as server.js so 150k context documents reach the route.
  app.use(express.json({ limit: '1mb' }));
  app.use('/api/essays', essaysRouter);
  return app;
};

const ownedEssay = (overrides = {}) => ({
  id: '11111111-1111-4111-8111-111111111111',
  title: 'Macbeth',
  originalText: 'Power corrupts. It always has.',
  parsedStructure: null,
  ...overrides,
});

describe('Essay workspace routes', () => {
  let app;

  beforeEach(() => {
    app = createTestApp();
    jest.clearAllMocks();
    // AI routes reserve shared in-memory quota units per request; reset
    // between tests so later chat/explain tests never hit the window limit.
    resetAIQuotaForTests();
    // /explain replaces annotations inside one transaction; run the callback
    // inline against a stub so no test touches the real database.
    jest.spyOn(sequelize, 'transaction').mockImplementation(async (callback) => callback({ id: 'transaction' }));
    Essay.findOne = jest.fn().mockResolvedValue(ownedEssay());
  });

  describe('GET /api/essays/:id/context', () => {
    it("404s for another user's essay (owner-scoped lookup)", async () => {
      Essay.findOne = jest.fn().mockResolvedValue(null);
      EssayContextDoc.findAll = jest.fn();

      const res = await request(app).get('/api/essays/33333333-3333-4333-8333-333333333333/context');

      expect(res.status).toBe(404);
      expect(Essay.findOne).toHaveBeenCalledWith({
        where: { id: '33333333-3333-4333-8333-333333333333', userId: 'test-user-1' },
      });
      expect(EssayContextDoc.findAll).not.toHaveBeenCalled();
    });

    it('lists docs with chars + a 200-char preview and never the full content', async () => {
      EssayContextDoc.findAll = jest.fn().mockResolvedValue([
        {
          id: 'd1',
          title: 'Historical context',
          kind: 'pdf',
          createdAt: new Date('2026-01-01'),
          content: 'c'.repeat(500),
        },
      ]);

      const res = await request(app).get('/api/essays/11111111-1111-4111-8111-111111111111/context');

      expect(res.status).toBe(200);
      expect(res.body.docs).toHaveLength(1);
      expect(res.body.docs[0]).toMatchObject({
        id: 'd1', title: 'Historical context', kind: 'pdf', chars: 500,
      });
      expect(res.body.docs[0].preview).toBe('c'.repeat(200));
      expect(res.body.docs[0].content).toBeUndefined();
      expect(EssayContextDoc.findAll).toHaveBeenCalledWith({
        where: { essayId: '11111111-1111-4111-8111-111111111111', userId: 'test-user-1' },
        order: [['createdAt', 'ASC']],
      });
    });
  });

  describe('POST /api/essays/:id/context', () => {
    beforeEach(() => {
      EssayContextDoc.findAll = jest.fn().mockResolvedValue([]);
      EssayContextDoc.create = jest.fn().mockImplementation(async (values) => ({
        id: 'd-new', createdAt: new Date('2026-02-01'), ...values,
      }));
    });

    it('creates a doc and returns the list shape (no full content)', async () => {
      const res = await request(app)
        .post('/api/essays/11111111-1111-4111-8111-111111111111/context')
        .send({ title: '  Sources  ', kind: 'pdf', content: 'The historical record of the play.' });

      expect(res.status).toBe(201);
      expect(EssayContextDoc.create).toHaveBeenCalledWith({
        essayId: '11111111-1111-4111-8111-111111111111',
        userId: 'test-user-1',
        title: 'Sources',
        kind: 'pdf',
        content: 'The historical record of the play.',
      });
      expect(res.body.doc).toMatchObject({
        id: 'd-new', title: 'Sources', kind: 'pdf', chars: 34,
      });
      expect(res.body.doc.preview).toBe('The historical record of the play.');
      expect(res.body.doc.content).toBeUndefined();
    });

    it('defaults an unknown kind to text', async () => {
      const res = await request(app)
        .post('/api/essays/11111111-1111-4111-8111-111111111111/context')
        .send({ title: 'Notes', kind: 'docx', content: 'Some notes.' });

      expect(res.status).toBe(201);
      expect(EssayContextDoc.create).toHaveBeenCalledWith(
        expect.objectContaining({ kind: 'text' }),
      );
    });

    it('rejects an empty or oversize (>160) title with 400', async () => {
      const empty = await request(app)
        .post('/api/essays/11111111-1111-4111-8111-111111111111/context')
        .send({ title: '   ', content: 'x' });
      expect(empty.status).toBe(400);

      const oversize = await request(app)
        .post('/api/essays/11111111-1111-4111-8111-111111111111/context')
        .send({ title: 't'.repeat(161), content: 'x' });
      expect(oversize.status).toBe(400);

      expect(EssayContextDoc.create).not.toHaveBeenCalled();
    });

    it('rejects empty content and content over 150k chars with 400', async () => {
      const empty = await request(app)
        .post('/api/essays/11111111-1111-4111-8111-111111111111/context')
        .send({ title: 'T', content: '   ' });
      expect(empty.status).toBe(400);

      const oversize = await request(app)
        .post('/api/essays/11111111-1111-4111-8111-111111111111/context')
        .send({ title: 'T', content: 'x'.repeat(150001) });
      expect(oversize.status).toBe(400);

      expect(EssayContextDoc.create).not.toHaveBeenCalled();
    });

    it("rejects with 'Context library is full.' once 12 docs exist", async () => {
      EssayContextDoc.findAll = jest.fn().mockResolvedValue(
        Array.from({ length: 12 }, () => ({ content: 'x' })),
      );

      const res = await request(app)
        .post('/api/essays/11111111-1111-4111-8111-111111111111/context')
        .send({ title: 'One more', content: 'y' });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Context library is full.');
      expect(EssayContextDoc.create).not.toHaveBeenCalled();
    });

    it("rejects with 'Context library is full.' when the total would pass 500k chars", async () => {
      EssayContextDoc.findAll = jest.fn().mockResolvedValue(
        Array.from({ length: 3 }, () => ({ content: 'x'.repeat(140000) })),
      );

      // 420k existing + 90k new = 510k > 500k.
      const over = await request(app)
        .post('/api/essays/11111111-1111-4111-8111-111111111111/context')
        .send({ title: 'Over budget', content: 'y'.repeat(90000) });
      expect(over.status).toBe(400);
      expect(over.body.message).toBe('Context library is full.');
      expect(EssayContextDoc.create).not.toHaveBeenCalled();

      // 420k existing + 70k new = 490k <= 500k: accepted.
      const within = await request(app)
        .post('/api/essays/11111111-1111-4111-8111-111111111111/context')
        .send({ title: 'Within budget', content: 'y'.repeat(70000) });
      expect(within.status).toBe(201);
      expect(EssayContextDoc.create).toHaveBeenCalledTimes(1);
    });

    it("404s for another user's essay without writing", async () => {
      Essay.findOne = jest.fn().mockResolvedValue(null);

      const res = await request(app)
        .post('/api/essays/11111111-1111-4111-8111-111111111111/context')
        .send({ title: 'T', content: 'x' });

      expect(res.status).toBe(404);
      expect(EssayContextDoc.create).not.toHaveBeenCalled();
    });
  });

  describe('DELETE /api/essays/:id/context/:docId', () => {
    it('deletes an owned doc and returns 204', async () => {
      EssayContextDoc.destroy = jest.fn().mockResolvedValue(1);

      const res = await request(app).delete('/api/essays/11111111-1111-4111-8111-111111111111/context/d1');

      expect(res.status).toBe(204);
      expect(EssayContextDoc.destroy).toHaveBeenCalledWith({
        where: { id: 'd1', essayId: '11111111-1111-4111-8111-111111111111', userId: 'test-user-1' },
      });
    });

    it('404s when the doc does not exist or is not owned', async () => {
      EssayContextDoc.destroy = jest.fn().mockResolvedValue(0);
      const res = await request(app).delete('/api/essays/11111111-1111-4111-8111-111111111111/context/missing');
      expect(res.status).toBe(404);
    });

    it('404s when the essay is not owned', async () => {
      Essay.findOne = jest.fn().mockResolvedValue(null);
      EssayContextDoc.destroy = jest.fn();
      const res = await request(app).delete('/api/essays/11111111-1111-4111-8111-111111111111/context/d1');
      expect(res.status).toBe(404);
      expect(EssayContextDoc.destroy).not.toHaveBeenCalled();
    });
  });

  describe('GET /api/essays/:id/annotations', () => {
    it('returns full rows ordered by paragraphIndex then createdAt', async () => {
      const rows = [
        { id: 'a1', paragraphIndex: 0, anchor: '', note: 'First', kind: 'note', source: 'user' },
        { id: 'a2', paragraphIndex: 1, anchor: 'snippet', note: 'Second', kind: 'explanation', source: 'ai' },
      ];
      EssayAnnotation.findAll = jest.fn().mockResolvedValue(rows);

      const res = await request(app).get('/api/essays/11111111-1111-4111-8111-111111111111/annotations');

      expect(res.status).toBe(200);
      expect(res.body.annotations).toHaveLength(2);
      expect(res.body.annotations[1]).toMatchObject({ id: 'a2', anchor: 'snippet', source: 'ai' });
      expect(EssayAnnotation.findAll).toHaveBeenCalledWith({
        where: { essayId: '11111111-1111-4111-8111-111111111111', userId: 'test-user-1' },
        order: [['paragraphIndex', 'ASC'], ['createdAt', 'ASC']],
      });
    });

    it('404s when the essay is not owned', async () => {
      Essay.findOne = jest.fn().mockResolvedValue(null);
      const res = await request(app).get('/api/essays/11111111-1111-4111-8111-111111111111/annotations');
      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/essays/:id/annotations', () => {
    beforeEach(() => {
      EssayAnnotation.count = jest.fn().mockResolvedValue(0);
      EssayAnnotation.create = jest.fn().mockImplementation(async (values) => ({ id: 'a-new', ...values }));
    });

    it('creates a user-sourced annotation and returns it', async () => {
      const res = await request(app)
        .post('/api/essays/11111111-1111-4111-8111-111111111111/annotations')
        .send({ paragraphIndex: 2, anchor: 'no spur', note: '  Doubt before the murder.  ', kind: 'note' });

      expect(res.status).toBe(201);
      expect(EssayAnnotation.create).toHaveBeenCalledWith({
        essayId: '11111111-1111-4111-8111-111111111111',
        userId: 'test-user-1',
        paragraphIndex: 2,
        anchor: 'no spur',
        note: 'Doubt before the murder.',
        kind: 'note',
        source: 'user',
      });
      expect(res.body.annotation).toMatchObject({ id: 'a-new', paragraphIndex: 2 });
    });

    it("forces source to 'user' even when the body claims 'ai'", async () => {
      const res = await request(app)
        .post('/api/essays/11111111-1111-4111-8111-111111111111/annotations')
        .send({ paragraphIndex: 0, note: 'n', source: 'ai' });

      expect(res.status).toBe(201);
      expect(EssayAnnotation.create).toHaveBeenCalledWith(
        expect.objectContaining({ source: 'user' }),
      );
    });

    it("accepts kind 'explanation' and defaults anything else to 'note'", async () => {
      await request(app)
        .post('/api/essays/11111111-1111-4111-8111-111111111111/annotations')
        .send({ paragraphIndex: 0, note: 'n', kind: 'explanation' });
      expect(EssayAnnotation.create).toHaveBeenLastCalledWith(
        expect.objectContaining({ kind: 'explanation' }),
      );

      await request(app)
        .post('/api/essays/11111111-1111-4111-8111-111111111111/annotations')
        .send({ paragraphIndex: 0, note: 'n', kind: 'shouty' });
      expect(EssayAnnotation.create).toHaveBeenLastCalledWith(
        expect.objectContaining({ kind: 'note' }),
      );
    });

    it('rejects a missing, negative, or non-integer paragraphIndex with 400', async () => {
      for (const paragraphIndex of [undefined, -1, 1.5, 'two']) {
        const res = await request(app)
          .post('/api/essays/11111111-1111-4111-8111-111111111111/annotations')
          .send({ paragraphIndex, note: 'n' });
        expect(res.status).toBe(400);
      }
      expect(EssayAnnotation.create).not.toHaveBeenCalled();
    });

    it('rejects an empty note with 400', async () => {
      const res = await request(app)
        .post('/api/essays/11111111-1111-4111-8111-111111111111/annotations')
        .send({ paragraphIndex: 0, note: '   ' });
      expect(res.status).toBe(400);
      expect(EssayAnnotation.create).not.toHaveBeenCalled();
    });

    it('clamps the note to 2000 chars and the anchor to 300 chars', async () => {
      const res = await request(app)
        .post('/api/essays/11111111-1111-4111-8111-111111111111/annotations')
        .send({ paragraphIndex: 0, note: 'n'.repeat(2500), anchor: 'a'.repeat(400) });

      expect(res.status).toBe(201);
      const values = EssayAnnotation.create.mock.calls[0][0];
      expect(values.note).toHaveLength(2000);
      expect(values.anchor).toHaveLength(300);
    });

    it('rejects when the essay already has 300 annotations', async () => {
      EssayAnnotation.count = jest.fn().mockResolvedValue(300);

      const res = await request(app)
        .post('/api/essays/11111111-1111-4111-8111-111111111111/annotations')
        .send({ paragraphIndex: 0, note: 'n' });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Annotation limit reached.');
      expect(EssayAnnotation.create).not.toHaveBeenCalled();
    });

    it('404s when the essay is not owned', async () => {
      Essay.findOne = jest.fn().mockResolvedValue(null);
      const res = await request(app)
        .post('/api/essays/11111111-1111-4111-8111-111111111111/annotations')
        .send({ paragraphIndex: 0, note: 'n' });
      expect(res.status).toBe(404);
      expect(EssayAnnotation.create).not.toHaveBeenCalled();
    });
  });

  describe('PUT /api/essays/:id/annotations/:annId', () => {
    const makeAnnotation = () => ({
      id: 'a1',
      paragraphIndex: 0,
      anchor: 'old anchor',
      note: 'old note',
      kind: 'note',
      source: 'user',
      update: jest.fn().mockResolvedValue(),
    });

    it('updates note and anchor (clamped) on an owned annotation', async () => {
      const annotation = makeAnnotation();
      EssayAnnotation.findOne = jest.fn().mockResolvedValue(annotation);

      const res = await request(app)
        .put('/api/essays/11111111-1111-4111-8111-111111111111/annotations/a1')
        .send({ note: `  fresh note ${'x'.repeat(2500)}`, anchor: 'b'.repeat(400) });

      expect(res.status).toBe(200);
      expect(EssayAnnotation.findOne).toHaveBeenCalledWith({
        where: { id: 'a1', essayId: '11111111-1111-4111-8111-111111111111', userId: 'test-user-1' },
      });
      const updates = annotation.update.mock.calls[0][0];
      expect(updates.note).toHaveLength(2000);
      expect(updates.note.startsWith('fresh note')).toBe(true);
      expect(updates.anchor).toHaveLength(300);
      expect(res.body.annotation).toMatchObject({ id: 'a1' });
    });

    it('rejects an empty replacement note with 400', async () => {
      const annotation = makeAnnotation();
      EssayAnnotation.findOne = jest.fn().mockResolvedValue(annotation);

      const res = await request(app)
        .put('/api/essays/11111111-1111-4111-8111-111111111111/annotations/a1')
        .send({ note: '   ' });

      expect(res.status).toBe(400);
      expect(annotation.update).not.toHaveBeenCalled();
    });

    it('404s for a missing or unowned annotation', async () => {
      EssayAnnotation.findOne = jest.fn().mockResolvedValue(null);
      const res = await request(app)
        .put('/api/essays/11111111-1111-4111-8111-111111111111/annotations/missing')
        .send({ note: 'n' });
      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /api/essays/:id/annotations/:annId', () => {
    it('deletes an owned annotation and returns 204', async () => {
      EssayAnnotation.destroy = jest.fn().mockResolvedValue(1);

      const res = await request(app).delete('/api/essays/11111111-1111-4111-8111-111111111111/annotations/a1');

      expect(res.status).toBe(204);
      expect(EssayAnnotation.destroy).toHaveBeenCalledWith({
        where: { id: 'a1', essayId: '11111111-1111-4111-8111-111111111111', userId: 'test-user-1' },
      });
    });

    it('404s when nothing was deleted', async () => {
      EssayAnnotation.destroy = jest.fn().mockResolvedValue(0);
      const res = await request(app).delete('/api/essays/11111111-1111-4111-8111-111111111111/annotations/missing');
      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/essays/:id/chat', () => {
    beforeEach(() => {
      EssayContextDoc.findAll = jest.fn().mockResolvedValue([]);
      EssayAnnotation.findAll = jest.fn().mockResolvedValue([]);
      assistEssay.mockResolvedValue({ reply: 'Here is what the context says.', annotations: [] });
    });

    it('passes the service response through as { reply, annotations }', async () => {
      const proposals = [{ paragraphIndex: 0, anchor: 'no spur', note: 'Doubt here.' }];
      assistEssay.mockResolvedValue({ reply: 'Annotated.', annotations: proposals });

      const res = await request(app)
        .post('/api/essays/11111111-1111-4111-8111-111111111111/chat')
        .send({ messages: [{ role: 'user', content: 'Annotate paragraph one.' }] });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ reply: 'Annotated.', annotations: proposals });
      // Proposals are NOT persisted by the chat route.
      expect(EssayAnnotation.create).not.toHaveBeenCalled();
      expect(assistEssay).toHaveBeenCalledWith({
        essay: expect.objectContaining({ id: '11111111-1111-4111-8111-111111111111' }),
        contextDocs: [],
        annotations: [],
        messages: [{ role: 'user', content: 'Annotate paragraph one.' }],
        model: 'gpt-5.4-mini',
      });
      expect(recordAIInteractionSafely).toHaveBeenCalledWith(
        expect.objectContaining({ feature: 'essay_assistant', modelVersion: 'gpt-5.4-mini' }),
      );
    });

    it('feeds the loaded context docs and annotations to the service', async () => {
      const docs = [{ id: 'd1', title: 'Sources', content: 'History.' }];
      const notes = [{ id: 'a1', paragraphIndex: 0, note: 'n', kind: 'note', source: 'user' }];
      EssayContextDoc.findAll = jest.fn().mockResolvedValue(docs);
      EssayAnnotation.findAll = jest.fn().mockResolvedValue(notes);

      const res = await request(app)
        .post('/api/essays/11111111-1111-4111-8111-111111111111/chat')
        .send({ messages: [{ role: 'user', content: 'Hi' }] });

      expect(res.status).toBe(200);
      expect(assistEssay).toHaveBeenCalledWith(
        expect.objectContaining({ contextDocs: docs, annotations: notes }),
      );
    });

    it('keeps only the last 12 valid turns and clamps each to 8000 chars', async () => {
      const history = [
        { role: 'system', content: 'ignore me entirely' },
        ...Array.from({ length: 14 }, (_, i) => ({
          role: i % 2 ? 'assistant' : 'user',
          content: `turn ${i}`,
        })),
        { role: 'user', content: 'x'.repeat(9000) },
      ];

      const res = await request(app).post('/api/essays/11111111-1111-4111-8111-111111111111/chat').send({ messages: history });

      expect(res.status).toBe(200);
      const forwarded = assistEssay.mock.calls[0][0].messages;
      expect(forwarded).toHaveLength(12);
      expect(forwarded.every((m) => m.role === 'user' || m.role === 'assistant')).toBe(true);
      // 15 valid turns in: the oldest three are dropped, the system turn never
      // counts. Valid list = [turn 0..turn 13, long] -> last 12 begins at turn 3.
      expect(forwarded[0]).toEqual({ role: 'assistant', content: 'turn 3' });
      expect(forwarded[11].content).toHaveLength(8000);
    });

    it('400s when no valid message remains, without calling the service', async () => {
      const empty = await request(app).post('/api/essays/11111111-1111-4111-8111-111111111111/chat').send({});
      expect(empty.status).toBe(400);

      const invalidOnly = await request(app)
        .post('/api/essays/11111111-1111-4111-8111-111111111111/chat')
        .send({ messages: [{ role: 'system', content: 'x' }, { role: 'user', content: '   ' }] });
      expect(invalidOnly.status).toBe(400);

      expect(assistEssay).not.toHaveBeenCalled();
    });

    it('allowlists the model and falls back to gpt-5.4-mini otherwise', async () => {
      await request(app)
        .post('/api/essays/11111111-1111-4111-8111-111111111111/chat')
        .send({ messages: [{ role: 'user', content: 'Hi' }], model: 'gpt-5.5' });
      expect(assistEssay).toHaveBeenLastCalledWith(expect.objectContaining({ model: 'gpt-5.5' }));

      await request(app)
        .post('/api/essays/11111111-1111-4111-8111-111111111111/chat')
        .send({ messages: [{ role: 'user', content: 'Hi' }], model: 'gpt-4-totally-bogus' });
      expect(assistEssay).toHaveBeenLastCalledWith(expect.objectContaining({ model: 'gpt-5.4-mini' }));
    });

    it("404s for another user's essay without calling the service", async () => {
      Essay.findOne = jest.fn().mockResolvedValue(null);

      const res = await request(app)
        .post('/api/essays/11111111-1111-4111-8111-111111111111/chat')
        .send({ messages: [{ role: 'user', content: 'Hi' }] });

      expect(res.status).toBe(404);
      expect(assistEssay).not.toHaveBeenCalled();
    });

    it('degrades with a 503 when AI is not configured', async () => {
      const err = new Error('AI is not configured on the server.');
      err.status = 503;
      assistEssay.mockRejectedValue(err);

      const res = await request(app)
        .post('/api/essays/11111111-1111-4111-8111-111111111111/chat')
        .send({ messages: [{ role: 'user', content: 'Hi' }] });

      expect(res.status).toBe(503);
      expect(res.body.message).toMatch(/not configured/i);
    });

    it('maps opaque service failures to a 502 with the public fallback message', async () => {
      assistEssay.mockRejectedValue(new Error('upstream exploded: secret detail'));

      const res = await request(app)
        .post('/api/essays/11111111-1111-4111-8111-111111111111/chat')
        .send({ messages: [{ role: 'user', content: 'Hi' }] });

      expect(res.status).toBe(502);
      expect(res.body.message).toBe('The assistant could not reply. Try again shortly.');
    });
  });

  describe('POST /api/essays/:id/explain', () => {
    const parsedEssay = () => ownedEssay({
      parsedStructure: {
        thesis: '',
        introduction: '',
        bodyParagraphs: [
          { topicSentence: 'One.', text: 'One. More.' },
          { topicSentence: 'Two.', text: 'Two. More.' },
        ],
        conclusion: '',
      },
    });

    beforeEach(() => {
      Essay.findOne = jest.fn().mockResolvedValue(parsedEssay());
      EssayAnnotation.destroy = jest.fn().mockResolvedValue(0);
      EssayAnnotation.create = jest.fn().mockImplementation(async (values) => ({
        id: `a-${values.paragraphIndex}`, ...values,
      }));
    });

    it("400s with 'Set up practice first.' when the essay is unparsed", async () => {
      Essay.findOne = jest.fn().mockResolvedValue(ownedEssay({ parsedStructure: null }));

      const res = await request(app).post('/api/essays/11111111-1111-4111-8111-111111111111/explain');

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Set up practice first.');
      expect(explainEssay).not.toHaveBeenCalled();
    });

    it('forwards a single paragraphIndex so one paragraph can be explained alone', async () => {
    explainEssay.mockResolvedValue([{ paragraphIndex: 1, note: 'Just this paragraph.' }]);
    const res = await request(app)
      .post('/api/essays/11111111-1111-4111-8111-111111111111/explain')
      .send({ paragraphIndex: 1 });

    expect(res.status).toBe(200);
    expect(explainEssay).toHaveBeenCalledWith(expect.objectContaining({ paragraphIndex: 1 }));
    expect(EssayAnnotation.destroy).toHaveBeenCalledTimes(1);
  });

  it('persists explanation annotations, replacing any previous explanation per paragraph', async () => {
      explainEssay.mockResolvedValue([
        { paragraphIndex: 0, note: 'Argues ambition drives the fall.' },
        { paragraphIndex: 1, note: 'Traces the blood imagery.' },
      ]);

      const res = await request(app).post('/api/essays/11111111-1111-4111-8111-111111111111/explain').send({ model: 'gpt-5.5' });

      expect(res.status).toBe(200);
      expect(explainEssay).toHaveBeenCalledWith({
        essay: expect.objectContaining({ id: '11111111-1111-4111-8111-111111111111' }),
        model: 'gpt-5.5',
        paragraphIndex: null, // whole-essay explain
      });
      // Old explanation for each returned paragraph is deleted first.
      expect(EssayAnnotation.destroy).toHaveBeenCalledTimes(2);
      expect(EssayAnnotation.destroy).toHaveBeenNthCalledWith(1, {
        where: { essayId: '11111111-1111-4111-8111-111111111111', userId: 'test-user-1', paragraphIndex: 0, kind: 'explanation' },
        transaction: { id: 'transaction' },
      });
      expect(EssayAnnotation.destroy).toHaveBeenNthCalledWith(2, {
        where: { essayId: '11111111-1111-4111-8111-111111111111', userId: 'test-user-1', paragraphIndex: 1, kind: 'explanation' },
        transaction: { id: 'transaction' },
      });
      expect(EssayAnnotation.create).toHaveBeenCalledTimes(2);
      expect(EssayAnnotation.create).toHaveBeenNthCalledWith(1, {
        essayId: '11111111-1111-4111-8111-111111111111',
        userId: 'test-user-1',
        paragraphIndex: 0,
        anchor: '',
        note: 'Argues ambition drives the fall.',
        kind: 'explanation',
        source: 'ai',
      }, { transaction: { id: 'transaction' } });
      expect(res.body.annotations).toHaveLength(2);
      expect(res.body.annotations[1]).toMatchObject({
        id: 'a-1', paragraphIndex: 1, kind: 'explanation', source: 'ai',
      });
      expect(recordAIInteractionSafely).toHaveBeenCalledWith(
        expect.objectContaining({ feature: 'essay_explain', modelVersion: 'gpt-5.5' }),
      );
    });

    // Regression: the destroy-then-create replacement used to run outside any
    // transaction, so two concurrent explain calls interleaved their pairs and
    // left duplicate kind:'explanation' rows for the same paragraph.
    it('runs the whole replace loop inside ONE transaction', async () => {
      explainEssay.mockResolvedValue([
        { paragraphIndex: 0, note: 'One.' },
        { paragraphIndex: 1, note: 'Two.' },
      ]);
      const openDuring = [];
      let inTransaction = false;
      sequelize.transaction.mockImplementation(async (callback) => {
        inTransaction = true;
        try {
          return await callback({ id: 'transaction' });
        } finally {
          inTransaction = false;
        }
      });
      EssayAnnotation.destroy.mockImplementation(async () => { openDuring.push(inTransaction); return 0; });
      EssayAnnotation.create.mockImplementation(async (values) => {
        openDuring.push(inTransaction);
        return { id: `a-${values.paragraphIndex}`, ...values };
      });

      const res = await request(app).post('/api/essays/11111111-1111-4111-8111-111111111111/explain');

      expect(res.status).toBe(200);
      // One transaction for both paragraphs, not one per iteration.
      expect(sequelize.transaction).toHaveBeenCalledTimes(1);
      expect(openDuring).toEqual([true, true, true, true]);
    });

    it("404s for another user's essay without calling the service", async () => {
      Essay.findOne = jest.fn().mockResolvedValue(null);
      const res = await request(app).post('/api/essays/11111111-1111-4111-8111-111111111111/explain');
      expect(res.status).toBe(404);
      expect(explainEssay).not.toHaveBeenCalled();
    });

    it('maps opaque service failures to a 502 without persisting anything', async () => {
      explainEssay.mockRejectedValue(new Error('provider timeout'));

      const res = await request(app).post('/api/essays/11111111-1111-4111-8111-111111111111/explain');

      expect(res.status).toBe(502);
      expect(res.body.message).toBe('The essay could not be explained. Try again shortly.');
      expect(EssayAnnotation.create).not.toHaveBeenCalled();
    });
  });

  // ── Select-and-fix ─────────────────────────────────────────────────────────

  const INTRO = 'Empire writes its own alibi.';
  const PARA1 = 'Conrad frames empire as robbery. The record of empire is written by its agents, and he calls it "just robbery with violence" in the novella.';
  const PARA2 = 'Walcott answers with the sea. The record of empire dissolves where the drowned remain "soldered by coral to bone" for ever.';
  const CONCLUSION = 'Both writers refuse the alibi.';

  const rewriteEssay = (overrides = {}) => {
    const essay = {
      id: '11111111-1111-4111-8111-111111111111',
      title: 'Empire essays',
      originalText: `${INTRO}\n\n${PARA1}\n\n${PARA2}\n\n${CONCLUSION}`,
      parsedStructure: {
        thesis: INTRO,
        introduction: INTRO,
        bodyParagraphs: [
          {
            topicSentence: 'Conrad frames empire as robbery.',
            text: PARA1,
            quotes: [{ text: 'just robbery with violence', highLeverage: true }],
            techniques: [],
          },
          {
            topicSentence: 'Walcott answers with the sea.',
            text: PARA2,
            quotes: [{ text: 'soldered by coral to bone', highLeverage: false }],
            techniques: [],
          },
        ],
        conclusion: CONCLUSION,
      },
      ...overrides,
    };
    essay.update = jest.fn().mockImplementation(async (values) => Object.assign(essay, values));
    return essay;
  };

  describe('POST /api/essays/:id/rewrite', () => {
    beforeEach(() => {
      Essay.findOne = jest.fn().mockResolvedValue(rewriteEssay());
      EssayContextDoc.findAll = jest.fn().mockResolvedValue([]);
      EssayAnnotation.findAll = jest.fn().mockResolvedValue([]);
      rewriteSelection.mockResolvedValue({ replacement: 'a sharper phrase', rationale: 'Tighter.' });
    });

    it('400s without a selection or an instruction, before the service runs', async () => {
      const noAnchor = await request(app)
        .post('/api/essays/11111111-1111-4111-8111-111111111111/rewrite')
        .send({ anchor: '  ', instruction: 'fix it' });
      expect(noAnchor.status).toBe(400);

      const noInstruction = await request(app)
        .post('/api/essays/11111111-1111-4111-8111-111111111111/rewrite')
        .send({ anchor: 'for ever', instruction: '' });
      expect(noInstruction.status).toBe(400);

      expect(rewriteSelection).not.toHaveBeenCalled();
    });

    it('409s when the selection is no longer in the essay text', async () => {
      const res = await request(app)
        .post('/api/essays/11111111-1111-4111-8111-111111111111/rewrite')
        .send({ anchor: 'this phrase was edited away', instruction: 'fix it' });

      expect(res.status).toBe(409);
      expect(res.body.message).toMatch(/no longer matches/i);
      expect(rewriteSelection).not.toHaveBeenCalled();
    });

    it('drafts a fix grounded in the loaded context docs and annotations, persisting nothing', async () => {
      const docs = [{ id: 'd1', title: 'Sources', content: 'History.' }];
      const notes = [{ id: 'a1', paragraphIndex: 0, note: 'n', kind: 'note', source: 'user' }];
      EssayContextDoc.findAll = jest.fn().mockResolvedValue(docs);
      EssayAnnotation.findAll = jest.fn().mockResolvedValue(notes);

      const res = await request(app)
        .post('/api/essays/11111111-1111-4111-8111-111111111111/rewrite')
        .send({ anchor: 'for ever', paragraphIndex: 1, instruction: 'I hate "for ever" — modernise it.' });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        anchor: 'for ever',
        paragraphIndex: 1,
        replacement: 'a sharper phrase',
        rationale: 'Tighter.',
      });
      expect(rewriteSelection).toHaveBeenCalledWith({
        essay: expect.objectContaining({ id: '11111111-1111-4111-8111-111111111111' }),
        contextDocs: docs,
        annotations: notes,
        anchor: 'for ever',
        paragraphIndex: 1,
        instruction: 'I hate "for ever" — modernise it.',
        model: 'gpt-5.4-mini',
      });
      // The proposal round-trips to the client — nothing is written here.
      const essay = await Essay.findOne.mock.results[0].value;
      expect(essay.update).not.toHaveBeenCalled();
      expect(recordAIInteractionSafely).toHaveBeenCalledWith(
        expect.objectContaining({ feature: 'essay_rewrite' }),
      );
    });

    it('normalises an out-of-bounds paragraphIndex to null via the global match', async () => {
      const res = await request(app)
        .post('/api/essays/11111111-1111-4111-8111-111111111111/rewrite')
        .send({ anchor: 'for ever', paragraphIndex: 99, instruction: 'modernise it' });

      expect(res.status).toBe(200);
      expect(res.body.paragraphIndex).toBeNull();
      expect(rewriteSelection).toHaveBeenCalledWith(
        expect.objectContaining({ paragraphIndex: null }),
      );
    });

    it('maps opaque service failures to a 502 with the public fallback message', async () => {
      rewriteSelection.mockRejectedValue(new Error('provider exploded: secret'));

      const res = await request(app)
        .post('/api/essays/11111111-1111-4111-8111-111111111111/rewrite')
        .send({ anchor: 'for ever', paragraphIndex: 1, instruction: 'modernise it' });

      expect(res.status).toBe(502);
      expect(res.body.message).toBe('The fix could not be drafted. Try again shortly.');
    });
  });

  describe('POST /api/essays/:id/rewrite/apply', () => {
    let essay;

    beforeEach(() => {
      // The structure patch re-derives topic sentences and quotes with the
      // REAL deterministic helpers, not auto-mocks.
      const actualParser = jest.requireActual('../services/essayParser');
      firstSentence.mockImplementation(actualParser.firstSentence);
      extractQuotes.mockImplementation(actualParser.extractQuotes);
      essay = rewriteEssay();
      Essay.findOne = jest.fn().mockResolvedValue(essay);
    });

    it('400s on a missing anchor, missing replacement, or oversized replacement', async () => {
      expect((await request(app).post('/api/essays/11111111-1111-4111-8111-111111111111/rewrite/apply')
        .send({ anchor: '', replacement: 'x' })).status).toBe(400);
      expect((await request(app).post('/api/essays/11111111-1111-4111-8111-111111111111/rewrite/apply')
        .send({ anchor: 'for ever', replacement: '   ' })).status).toBe(400);
      expect((await request(app).post('/api/essays/11111111-1111-4111-8111-111111111111/rewrite/apply')
        .send({ anchor: 'for ever', replacement: 'x'.repeat(5001) })).status).toBe(400);
      expect(essay.update).not.toHaveBeenCalled();
    });

    it('409s when the selection is no longer in the essay text', async () => {
      const res = await request(app)
        .post('/api/essays/11111111-1111-4111-8111-111111111111/rewrite/apply')
        .send({ anchor: 'vanished words', replacement: 'anything' });

      expect(res.status).toBe(409);
      expect(essay.update).not.toHaveBeenCalled();
    });

    it('replaces the SCOPED occurrence when the same words appear in two paragraphs', async () => {
      // "The record of empire" opens a sentence in BOTH body paragraphs; with
      // paragraphIndex 1 only the second paragraph's occurrence may change.
      const res = await request(app)
        .post('/api/essays/11111111-1111-4111-8111-111111111111/rewrite/apply')
        .send({ anchor: 'The record of empire', replacement: 'The imperial archive', paragraphIndex: 1 });

      expect(res.status).toBe(200);
      expect(essay.originalText).toContain('The record of empire is written by its agents'); // ¶1 untouched
      expect(essay.originalText).toContain('The imperial archive dissolves'); // ¶2 replaced
      const patched = essay.parsedStructure.bodyParagraphs;
      expect(patched[0].text).toBe(PARA1);
      expect(patched[1].text).toContain('The imperial archive dissolves');
      // The edit sits past the topic sentence, which is therefore untouched.
      expect(patched[1].topicSentence).toBe('Walcott answers with the sea.');
      // The quote survives verbatim, flag intact.
      expect(patched[1].quotes).toEqual([{ text: 'soldered by coral to bone', highLeverage: false }]);
    });

    it('re-derives the topic sentence when the fix lands inside it', async () => {
      const res = await request(app)
        .post('/api/essays/11111111-1111-4111-8111-111111111111/rewrite/apply')
        .send({ anchor: 'Walcott answers with the sea', replacement: 'Walcott replies with the sea', paragraphIndex: 1 });

      expect(res.status).toBe(200);
      expect(essay.parsedStructure.bodyParagraphs[1].topicSentence).toBe('Walcott replies with the sea.');
    });

    it('rebuilds mark-paired quotes when the fix rewrites inside quotation marks', async () => {
      const res = await request(app)
        .post('/api/essays/11111111-1111-4111-8111-111111111111/rewrite/apply')
        .send({ anchor: 'soldered by coral to bone', replacement: 'the sea is History itself', paragraphIndex: 1 });

      expect(res.status).toBe(200);
      const quotes = essay.parsedStructure.bodyParagraphs[1].quotes;
      expect(quotes).toEqual([{ text: 'the sea is History itself', highLeverage: false }]);
    });

    it('patches the introduction (and thesis) when the fix is only there', async () => {
      const res = await request(app)
        .post('/api/essays/11111111-1111-4111-8111-111111111111/rewrite/apply')
        .send({ anchor: 'writes its own alibi', replacement: 'authors its own excuse' });

      expect(res.status).toBe(200);
      expect(essay.originalText.startsWith('Empire authors its own excuse.')).toBe(true);
      expect(essay.parsedStructure.introduction).toBe('Empire authors its own excuse.');
      expect(essay.parsedStructure.thesis).toBe('Empire authors its own excuse.');
      expect(essay.parsedStructure.bodyParagraphs[0].text).toBe(PARA1);
    });

    it('clears the structure (for a rescan) when the edit cannot be attributed', async () => {
      // The span exists in the text but the stored structure has drifted and
      // no mapped region contains it.
      essay = rewriteEssay({
        originalText: `A stray unmapped opening line.\n\n${PARA1}`,
      });
      Essay.findOne = jest.fn().mockResolvedValue(essay);

      const res = await request(app)
        .post('/api/essays/11111111-1111-4111-8111-111111111111/rewrite/apply')
        .send({ anchor: 'stray unmapped opening', replacement: 'orphaned preamble' });

      expect(res.status).toBe(200);
      expect(essay.originalText).toContain('A orphaned preamble line.');
      expect(essay.parsedStructure).toBeNull();
    });

    it('applies to an unparsed essay and flattens replacement line breaks', async () => {
      essay = rewriteEssay({ parsedStructure: null });
      Essay.findOne = jest.fn().mockResolvedValue(essay);

      const res = await request(app)
        .post('/api/essays/11111111-1111-4111-8111-111111111111/rewrite/apply')
        .send({ anchor: 'for ever', replacement: 'for\n\never more' });

      expect(res.status).toBe(200);
      expect(essay.originalText).toContain('for ever more');
      expect(essay.parsedStructure).toBeNull();
    });

    it("404s for another user's essay", async () => {
      Essay.findOne = jest.fn().mockResolvedValue(null);
      const res = await request(app)
        .post('/api/essays/11111111-1111-4111-8111-111111111111/rewrite/apply')
        .send({ anchor: 'for ever', replacement: 'forever' });
      expect(res.status).toBe(404);
    });
  });
});
