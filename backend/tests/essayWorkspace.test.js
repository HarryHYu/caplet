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
const { assistEssay, explainEssay } = require('../services/essayAssistant');
const { recordAIInteractionSafely } = require('../services/aiHistory');
const { resetAIQuotaForTests } = require('../middleware/aiQuota');
const essaysRouter = require('../routes/essays');

const createTestApp = () => {
  const app = express();
  // Same body limit as server.js so 150k context documents reach the route.
  app.use(express.json({ limit: '1mb' }));
  app.use('/api/essays', essaysRouter);
  return app;
};

const ownedEssay = (overrides = {}) => ({
  id: 'e1',
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
    Essay.findOne = jest.fn().mockResolvedValue(ownedEssay());
  });

  describe('GET /api/essays/:id/context', () => {
    it("404s for another user's essay (owner-scoped lookup)", async () => {
      Essay.findOne = jest.fn().mockResolvedValue(null);
      EssayContextDoc.findAll = jest.fn();

      const res = await request(app).get('/api/essays/someone-elses/context');

      expect(res.status).toBe(404);
      expect(Essay.findOne).toHaveBeenCalledWith({
        where: { id: 'someone-elses', userId: 'test-user-1' },
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

      const res = await request(app).get('/api/essays/e1/context');

      expect(res.status).toBe(200);
      expect(res.body.docs).toHaveLength(1);
      expect(res.body.docs[0]).toMatchObject({
        id: 'd1', title: 'Historical context', kind: 'pdf', chars: 500,
      });
      expect(res.body.docs[0].preview).toBe('c'.repeat(200));
      expect(res.body.docs[0].content).toBeUndefined();
      expect(EssayContextDoc.findAll).toHaveBeenCalledWith({
        where: { essayId: 'e1', userId: 'test-user-1' },
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
        .post('/api/essays/e1/context')
        .send({ title: '  Sources  ', kind: 'pdf', content: 'The historical record of the play.' });

      expect(res.status).toBe(201);
      expect(EssayContextDoc.create).toHaveBeenCalledWith({
        essayId: 'e1',
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
        .post('/api/essays/e1/context')
        .send({ title: 'Notes', kind: 'docx', content: 'Some notes.' });

      expect(res.status).toBe(201);
      expect(EssayContextDoc.create).toHaveBeenCalledWith(
        expect.objectContaining({ kind: 'text' }),
      );
    });

    it('rejects an empty or oversize (>160) title with 400', async () => {
      const empty = await request(app)
        .post('/api/essays/e1/context')
        .send({ title: '   ', content: 'x' });
      expect(empty.status).toBe(400);

      const oversize = await request(app)
        .post('/api/essays/e1/context')
        .send({ title: 't'.repeat(161), content: 'x' });
      expect(oversize.status).toBe(400);

      expect(EssayContextDoc.create).not.toHaveBeenCalled();
    });

    it('rejects empty content and content over 150k chars with 400', async () => {
      const empty = await request(app)
        .post('/api/essays/e1/context')
        .send({ title: 'T', content: '   ' });
      expect(empty.status).toBe(400);

      const oversize = await request(app)
        .post('/api/essays/e1/context')
        .send({ title: 'T', content: 'x'.repeat(150001) });
      expect(oversize.status).toBe(400);

      expect(EssayContextDoc.create).not.toHaveBeenCalled();
    });

    it("rejects with 'Context library is full.' once 12 docs exist", async () => {
      EssayContextDoc.findAll = jest.fn().mockResolvedValue(
        Array.from({ length: 12 }, () => ({ content: 'x' })),
      );

      const res = await request(app)
        .post('/api/essays/e1/context')
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
        .post('/api/essays/e1/context')
        .send({ title: 'Over budget', content: 'y'.repeat(90000) });
      expect(over.status).toBe(400);
      expect(over.body.message).toBe('Context library is full.');
      expect(EssayContextDoc.create).not.toHaveBeenCalled();

      // 420k existing + 70k new = 490k <= 500k: accepted.
      const within = await request(app)
        .post('/api/essays/e1/context')
        .send({ title: 'Within budget', content: 'y'.repeat(70000) });
      expect(within.status).toBe(201);
      expect(EssayContextDoc.create).toHaveBeenCalledTimes(1);
    });

    it("404s for another user's essay without writing", async () => {
      Essay.findOne = jest.fn().mockResolvedValue(null);

      const res = await request(app)
        .post('/api/essays/e1/context')
        .send({ title: 'T', content: 'x' });

      expect(res.status).toBe(404);
      expect(EssayContextDoc.create).not.toHaveBeenCalled();
    });
  });

  describe('DELETE /api/essays/:id/context/:docId', () => {
    it('deletes an owned doc and returns 204', async () => {
      EssayContextDoc.destroy = jest.fn().mockResolvedValue(1);

      const res = await request(app).delete('/api/essays/e1/context/d1');

      expect(res.status).toBe(204);
      expect(EssayContextDoc.destroy).toHaveBeenCalledWith({
        where: { id: 'd1', essayId: 'e1', userId: 'test-user-1' },
      });
    });

    it('404s when the doc does not exist or is not owned', async () => {
      EssayContextDoc.destroy = jest.fn().mockResolvedValue(0);
      const res = await request(app).delete('/api/essays/e1/context/missing');
      expect(res.status).toBe(404);
    });

    it('404s when the essay is not owned', async () => {
      Essay.findOne = jest.fn().mockResolvedValue(null);
      EssayContextDoc.destroy = jest.fn();
      const res = await request(app).delete('/api/essays/e1/context/d1');
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

      const res = await request(app).get('/api/essays/e1/annotations');

      expect(res.status).toBe(200);
      expect(res.body.annotations).toHaveLength(2);
      expect(res.body.annotations[1]).toMatchObject({ id: 'a2', anchor: 'snippet', source: 'ai' });
      expect(EssayAnnotation.findAll).toHaveBeenCalledWith({
        where: { essayId: 'e1', userId: 'test-user-1' },
        order: [['paragraphIndex', 'ASC'], ['createdAt', 'ASC']],
      });
    });

    it('404s when the essay is not owned', async () => {
      Essay.findOne = jest.fn().mockResolvedValue(null);
      const res = await request(app).get('/api/essays/e1/annotations');
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
        .post('/api/essays/e1/annotations')
        .send({ paragraphIndex: 2, anchor: 'no spur', note: '  Doubt before the murder.  ', kind: 'note' });

      expect(res.status).toBe(201);
      expect(EssayAnnotation.create).toHaveBeenCalledWith({
        essayId: 'e1',
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
        .post('/api/essays/e1/annotations')
        .send({ paragraphIndex: 0, note: 'n', source: 'ai' });

      expect(res.status).toBe(201);
      expect(EssayAnnotation.create).toHaveBeenCalledWith(
        expect.objectContaining({ source: 'user' }),
      );
    });

    it("accepts kind 'explanation' and defaults anything else to 'note'", async () => {
      await request(app)
        .post('/api/essays/e1/annotations')
        .send({ paragraphIndex: 0, note: 'n', kind: 'explanation' });
      expect(EssayAnnotation.create).toHaveBeenLastCalledWith(
        expect.objectContaining({ kind: 'explanation' }),
      );

      await request(app)
        .post('/api/essays/e1/annotations')
        .send({ paragraphIndex: 0, note: 'n', kind: 'shouty' });
      expect(EssayAnnotation.create).toHaveBeenLastCalledWith(
        expect.objectContaining({ kind: 'note' }),
      );
    });

    it('rejects a missing, negative, or non-integer paragraphIndex with 400', async () => {
      for (const paragraphIndex of [undefined, -1, 1.5, 'two']) {
        const res = await request(app)
          .post('/api/essays/e1/annotations')
          .send({ paragraphIndex, note: 'n' });
        expect(res.status).toBe(400);
      }
      expect(EssayAnnotation.create).not.toHaveBeenCalled();
    });

    it('rejects an empty note with 400', async () => {
      const res = await request(app)
        .post('/api/essays/e1/annotations')
        .send({ paragraphIndex: 0, note: '   ' });
      expect(res.status).toBe(400);
      expect(EssayAnnotation.create).not.toHaveBeenCalled();
    });

    it('clamps the note to 2000 chars and the anchor to 300 chars', async () => {
      const res = await request(app)
        .post('/api/essays/e1/annotations')
        .send({ paragraphIndex: 0, note: 'n'.repeat(2500), anchor: 'a'.repeat(400) });

      expect(res.status).toBe(201);
      const values = EssayAnnotation.create.mock.calls[0][0];
      expect(values.note).toHaveLength(2000);
      expect(values.anchor).toHaveLength(300);
    });

    it('rejects when the essay already has 300 annotations', async () => {
      EssayAnnotation.count = jest.fn().mockResolvedValue(300);

      const res = await request(app)
        .post('/api/essays/e1/annotations')
        .send({ paragraphIndex: 0, note: 'n' });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Annotation limit reached.');
      expect(EssayAnnotation.create).not.toHaveBeenCalled();
    });

    it('404s when the essay is not owned', async () => {
      Essay.findOne = jest.fn().mockResolvedValue(null);
      const res = await request(app)
        .post('/api/essays/e1/annotations')
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
        .put('/api/essays/e1/annotations/a1')
        .send({ note: `  fresh note ${'x'.repeat(2500)}`, anchor: 'b'.repeat(400) });

      expect(res.status).toBe(200);
      expect(EssayAnnotation.findOne).toHaveBeenCalledWith({
        where: { id: 'a1', essayId: 'e1', userId: 'test-user-1' },
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
        .put('/api/essays/e1/annotations/a1')
        .send({ note: '   ' });

      expect(res.status).toBe(400);
      expect(annotation.update).not.toHaveBeenCalled();
    });

    it('404s for a missing or unowned annotation', async () => {
      EssayAnnotation.findOne = jest.fn().mockResolvedValue(null);
      const res = await request(app)
        .put('/api/essays/e1/annotations/missing')
        .send({ note: 'n' });
      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /api/essays/:id/annotations/:annId', () => {
    it('deletes an owned annotation and returns 204', async () => {
      EssayAnnotation.destroy = jest.fn().mockResolvedValue(1);

      const res = await request(app).delete('/api/essays/e1/annotations/a1');

      expect(res.status).toBe(204);
      expect(EssayAnnotation.destroy).toHaveBeenCalledWith({
        where: { id: 'a1', essayId: 'e1', userId: 'test-user-1' },
      });
    });

    it('404s when nothing was deleted', async () => {
      EssayAnnotation.destroy = jest.fn().mockResolvedValue(0);
      const res = await request(app).delete('/api/essays/e1/annotations/missing');
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
        .post('/api/essays/e1/chat')
        .send({ messages: [{ role: 'user', content: 'Annotate paragraph one.' }] });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ reply: 'Annotated.', annotations: proposals });
      // Proposals are NOT persisted by the chat route.
      expect(EssayAnnotation.create).not.toHaveBeenCalled();
      expect(assistEssay).toHaveBeenCalledWith({
        essay: expect.objectContaining({ id: 'e1' }),
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
        .post('/api/essays/e1/chat')
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

      const res = await request(app).post('/api/essays/e1/chat').send({ messages: history });

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
      const empty = await request(app).post('/api/essays/e1/chat').send({});
      expect(empty.status).toBe(400);

      const invalidOnly = await request(app)
        .post('/api/essays/e1/chat')
        .send({ messages: [{ role: 'system', content: 'x' }, { role: 'user', content: '   ' }] });
      expect(invalidOnly.status).toBe(400);

      expect(assistEssay).not.toHaveBeenCalled();
    });

    it('allowlists the model and falls back to gpt-5.4-mini otherwise', async () => {
      await request(app)
        .post('/api/essays/e1/chat')
        .send({ messages: [{ role: 'user', content: 'Hi' }], model: 'gpt-5.5' });
      expect(assistEssay).toHaveBeenLastCalledWith(expect.objectContaining({ model: 'gpt-5.5' }));

      await request(app)
        .post('/api/essays/e1/chat')
        .send({ messages: [{ role: 'user', content: 'Hi' }], model: 'gpt-4-totally-bogus' });
      expect(assistEssay).toHaveBeenLastCalledWith(expect.objectContaining({ model: 'gpt-5.4-mini' }));
    });

    it("404s for another user's essay without calling the service", async () => {
      Essay.findOne = jest.fn().mockResolvedValue(null);

      const res = await request(app)
        .post('/api/essays/e1/chat')
        .send({ messages: [{ role: 'user', content: 'Hi' }] });

      expect(res.status).toBe(404);
      expect(assistEssay).not.toHaveBeenCalled();
    });

    it('degrades with a 503 when AI is not configured', async () => {
      const err = new Error('AI is not configured on the server.');
      err.status = 503;
      assistEssay.mockRejectedValue(err);

      const res = await request(app)
        .post('/api/essays/e1/chat')
        .send({ messages: [{ role: 'user', content: 'Hi' }] });

      expect(res.status).toBe(503);
      expect(res.body.message).toMatch(/not configured/i);
    });

    it('maps opaque service failures to a 502 with the public fallback message', async () => {
      assistEssay.mockRejectedValue(new Error('upstream exploded: secret detail'));

      const res = await request(app)
        .post('/api/essays/e1/chat')
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

      const res = await request(app).post('/api/essays/e1/explain');

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Set up practice first.');
      expect(explainEssay).not.toHaveBeenCalled();
    });

    it('forwards a single paragraphIndex so one paragraph can be explained alone', async () => {
    explainEssay.mockResolvedValue([{ paragraphIndex: 1, note: 'Just this paragraph.' }]);
    const res = await request(app)
      .post('/api/essays/e1/explain')
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

      const res = await request(app).post('/api/essays/e1/explain').send({ model: 'gpt-5.5' });

      expect(res.status).toBe(200);
      expect(explainEssay).toHaveBeenCalledWith({
        essay: expect.objectContaining({ id: 'e1' }),
        model: 'gpt-5.5',
        paragraphIndex: null, // whole-essay explain
      });
      // Old explanation for each returned paragraph is deleted first.
      expect(EssayAnnotation.destroy).toHaveBeenCalledTimes(2);
      expect(EssayAnnotation.destroy).toHaveBeenNthCalledWith(1, {
        where: { essayId: 'e1', userId: 'test-user-1', paragraphIndex: 0, kind: 'explanation' },
      });
      expect(EssayAnnotation.destroy).toHaveBeenNthCalledWith(2, {
        where: { essayId: 'e1', userId: 'test-user-1', paragraphIndex: 1, kind: 'explanation' },
      });
      expect(EssayAnnotation.create).toHaveBeenCalledTimes(2);
      expect(EssayAnnotation.create).toHaveBeenNthCalledWith(1, {
        essayId: 'e1',
        userId: 'test-user-1',
        paragraphIndex: 0,
        anchor: '',
        note: 'Argues ambition drives the fall.',
        kind: 'explanation',
        source: 'ai',
      });
      expect(res.body.annotations).toHaveLength(2);
      expect(res.body.annotations[1]).toMatchObject({
        id: 'a-1', paragraphIndex: 1, kind: 'explanation', source: 'ai',
      });
      expect(recordAIInteractionSafely).toHaveBeenCalledWith(
        expect.objectContaining({ feature: 'essay_explain', modelVersion: 'gpt-5.5' }),
      );
    });

    it("404s for another user's essay without calling the service", async () => {
      Essay.findOne = jest.fn().mockResolvedValue(null);
      const res = await request(app).post('/api/essays/e1/explain');
      expect(res.status).toBe(404);
      expect(explainEssay).not.toHaveBeenCalled();
    });

    it('maps opaque service failures to a 502 without persisting anything', async () => {
      explainEssay.mockRejectedValue(new Error('provider timeout'));

      const res = await request(app).post('/api/essays/e1/explain');

      expect(res.status).toBe(502);
      expect(res.body.message).toBe('The essay could not be explained. Try again shortly.');
      expect(EssayAnnotation.create).not.toHaveBeenCalled();
    });
  });
});
