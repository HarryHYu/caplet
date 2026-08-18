/**
 * PUT /api/users/profile used an exact-match uniqueness check for email
 * changes, bypassing the Gmail canonicalisation /api/auth/register applies.
 * A user could claim a.b@gmail.com while ab@gmail.com already existed, leaving
 * two accounts that a later login or password reset cannot tell apart.
 */
process.env.JWT_SECRET = 'test-jwt-secret-for-user-email-tests';

jest.mock('../models/User', () => ({ findOne: jest.fn(), findAll: jest.fn(), findByPk: jest.fn() }));
jest.mock('../models/UserProgress', () => ({ findAll: jest.fn() }));
jest.mock('../models/Course', () => ({ findAll: jest.fn() }));
jest.mock('../models/ClassMembership', () => ({ findAll: jest.fn() }));

let mockCurrentUser;
jest.mock('../middleware/auth', () => ({
  requireAuth: (req, _res, next) => {
    req.user = mockCurrentUser;
    next();
  },
}));

const request = require('supertest');
const express = require('express');
const User = require('../models/User');
const usersRouter = require('../routes/users');

const createTestApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/users', usersRouter);
  return app;
};

const signedInUser = (overrides = {}) => {
  const user = {
    id: 'user-1',
    email: 'existing@example.com',
    firstName: 'A',
    lastName: 'B',
    bio: '',
    preferences: {},
    dateOfBirth: null,
    role: 'student',
    ...overrides,
  };
  user.update = jest.fn(async function update(values) { Object.assign(this, values); return this; });
  user.toJSON = function toJSON() { return { id: this.id, email: this.email }; };
  return user;
};

describe('PUT /api/users/profile email identity', () => {
  let app;

  beforeEach(() => {
    app = createTestApp();
    jest.clearAllMocks();
    mockCurrentUser = signedInUser();
    User.findOne.mockResolvedValue(null);
    User.findAll.mockResolvedValue([]);
  });

  it('rejects a canonically-duplicate Gmail address held by another account', async () => {
    // Exact lookup misses (nobody stored "a.b@gmail.com"), but the canonical
    // gmail sweep finds the existing ab@gmail.com account.
    User.findAll.mockResolvedValue([{ id: 'user-2', email: 'ab@gmail.com' }]);

    const res = await request(app)
      .put('/api/users/profile')
      .send({ email: 'a.b@gmail.com' });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('That email is already in use');
    expect(mockCurrentUser.update).not.toHaveBeenCalled();
    // The canonicalising lookup ran, not a raw { where: { email } } match.
    expect(User.findAll).toHaveBeenCalled();
  });

  it('stores the canonical form so the account cannot diverge from register', async () => {
    const res = await request(app)
      .put('/api/users/profile')
      .send({ email: 'A.B+school@googlemail.com' });

    expect(res.status).toBe(200);
    expect(mockCurrentUser.update).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'ab@gmail.com' }),
    );
  });

  it('lets the owner re-submit their own address unchanged', async () => {
    User.findAll.mockResolvedValue([]);
    User.findOne.mockResolvedValue({ id: 'user-1', email: 'existing@example.com' });

    const res = await request(app)
      .put('/api/users/profile')
      .send({ email: 'existing@example.com', firstName: 'A2' });

    expect(res.status).toBe(200);
    expect(mockCurrentUser.update).toHaveBeenCalled();
  });

  it('maps a lost unique-index race to 400, not 500', async () => {
    const uniqueError = new Error('Validation error');
    uniqueError.name = 'SequelizeUniqueConstraintError';
    mockCurrentUser.update = jest.fn().mockRejectedValue(uniqueError);

    const res = await request(app)
      .put('/api/users/profile')
      .send({ email: 'taken@example.com' });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('That email is already in use');
  });

  it('still returns 500 for an unrelated update failure', async () => {
    mockCurrentUser.update = jest.fn().mockRejectedValue(new Error('connection reset'));

    const res = await request(app)
      .put('/api/users/profile')
      .send({ firstName: 'New' });

    expect(res.status).toBe(500);
    expect(res.body.message).toBe('Internal server error');
  });
});

describe('GET /api/users/:userId UUID guard', () => {
  let app;

  beforeEach(() => {
    app = createTestApp();
    jest.clearAllMocks();
    mockCurrentUser = signedInUser();
  });

  it('404s a malformed userId before touching the database', async () => {
    const res = await request(app).get('/api/users/not-a-uuid');

    expect(res.status).toBe(404);
    expect(res.body.message).toBe('User not found');
    expect(User.findByPk).not.toHaveBeenCalled();
  });
});
