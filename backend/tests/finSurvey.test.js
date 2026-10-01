/**
 * Financial-literacy survey (temporary hidden pages): submissions double as
 * Caplet signup, one response per email, and the ungated results endpoint
 * must never leak a full address.
 */
const express = require('express');
const request = require('supertest');

const mockUser = { create: jest.fn() };
const mockResponse = { findOne: jest.fn(), create: jest.fn(), findAll: jest.fn() };
const mockFindByVariants = jest.fn();

jest.mock('../models', () => ({
  User: mockUser,
  FinSurveyResponse: mockResponse,
}));
jest.mock('../utils/emailIdentity', () => ({
  normalizeEmailInput: (e) => String(e).toLowerCase(),
  normalizeEmailForStorage: (e) => String(e).toLowerCase(),
  findUserByEmailVariants: mockFindByVariants,
}));
// requireAuth stands in for a signed-in student; routes that don't use it
// are unaffected. (Jest hoists mock factories, so the variable must be
// mock-prefixed to be referenced from one.)
let mockSignedIn = null;
jest.mock('../middleware/auth', () => ({
  requireAuth: (req, res, next) => {
    if (!mockSignedIn) return res.status(401).json({ message: 'Not signed in' });
    req.user = mockSignedIn;
    return next();
  },
}));

const finSurvey = require('../routes/finSurvey');

const app = express();
app.use(express.json());
app.use('/api/fin-survey', finSurvey);

const goodBody = {
  name: 'Pat Example',
  email: 'pat@example.com',
  password: 'longenough1',
  school: 'Testville High',
  answers: { yearLevel: '11', selfRating: 2, wouldTakeCapletCourse: 'yes' },
};

beforeEach(() => {
  jest.clearAllMocks();
  mockSignedIn = null;
  mockFindByVariants.mockResolvedValue(null);
  mockResponse.findOne.mockResolvedValue(null);
  mockResponse.create.mockResolvedValue({ id: 'r1' });
  mockUser.create.mockResolvedValue({ id: 'u1' });
});

describe('GET /api/fin-survey/mine', () => {
  it('tells a signed-in student whether they already answered', async () => {
    mockSignedIn = { id: 'u1', email: 'Pat@Example.com' };
    mockResponse.findOne.mockResolvedValue({ updatedAt: '2026-10-01T00:00:00Z', answers: { yearLevel: '11' }, school: 'Testville High' });
    const res = await request(app).get('/api/fin-survey/mine');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ responded: true, answers: { yearLevel: '11' }, school: 'Testville High' });
    expect(mockResponse.findOne).toHaveBeenCalledWith({ where: { email: 'pat@example.com' } });
    mockResponse.findOne.mockResolvedValue(null);
    expect((await request(app).get('/api/fin-survey/mine')).body).toEqual({ responded: false });
  });

  it('is signed-in only', async () => {
    expect((await request(app).get('/api/fin-survey/mine')).status).toBe(401);
  });
});

describe('POST /api/fin-survey', () => {
  it('records the response and creates a student Caplet account', async () => {
    const res = await request(app).post('/api/fin-survey').send(goodBody);
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ ok: true, accountCreated: true, accountExisted: false });
    expect(mockUser.create).toHaveBeenCalledWith(expect.objectContaining({
      email: 'pat@example.com',
      firstName: 'Pat',
      lastName: 'Example',
      role: 'student',
    }));
    expect(mockResponse.create).toHaveBeenCalledWith(expect.objectContaining({
      email: 'pat@example.com',
      school: 'Testville High',
      accountCreated: true,
    }));
  });

  it('keeps an existing account untouched and still records the answers', async () => {
    mockFindByVariants.mockResolvedValue({ id: 'u-existing' });
    const res = await request(app).post('/api/fin-survey').send(goodBody);
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ accountCreated: false, accountExisted: true });
    expect(mockUser.create).not.toHaveBeenCalled();
    expect(mockResponse.create).toHaveBeenCalled();
  });

  it('a resubmit replaces the earlier answers instead of stacking', async () => {
    const update = jest.fn();
    mockResponse.findOne.mockResolvedValue({ id: 'r1', update });
    const res = await request(app).post('/api/fin-survey').send(goodBody);
    expect(res.status).toBe(201);
    expect(res.body.updated).toBe(true);
    expect(update).toHaveBeenCalled();
    expect(mockResponse.create).not.toHaveBeenCalled();
  });

  it('rejects a new signup without a password, and junk input', async () => {
    const noPass = await request(app).post('/api/fin-survey').send({ ...goodBody, password: '' });
    expect(noPass.status).toBe(400);
    expect(noPass.body.message).toMatch(/password/i);
    const badEmail = await request(app).post('/api/fin-survey').send({ ...goodBody, email: 'not-an-email' });
    expect(badEmail.status).toBe(400);
    const shortPass = await request(app).post('/api/fin-survey').send({ ...goodBody, password: 'short' });
    expect(shortPass.status).toBe(400);
  });
});

describe('GET /api/fin-survey/results', () => {
  it('aggregates and masks every email', async () => {
    mockResponse.findAll.mockResolvedValue([
      { id: 'r1', name: 'Pat', email: 'pat@example.com', school: 'Testville High', answers: { selfRating: 2 }, accountCreated: true, createdAt: new Date() },
      { id: 'r2', name: 'Sam', email: 's@x.io', school: null, answers: {}, accountCreated: false, createdAt: new Date() },
    ]);
    const res = await request(app).get('/api/fin-survey/results');
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(2);
    expect(res.body.accountsCreated).toBe(1);
    expect(res.body.responses[0].email).toBe('pa*@example.com');
    expect(res.body.responses[1].email).toMatch(/\*@x\.io$/);
    expect(JSON.stringify(res.body)).not.toContain('pat@example.com');
  });
});
