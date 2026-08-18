process.env.GOOGLE_CLIENT_ID = 'test-google-client-id';
process.env.JWT_SECRET = 'test-jwt-secret-for-auth-tests';

const mockPasswordResetToken = {
  update: jest.fn(),
  create: jest.fn(),
  findOne: jest.fn(),
};
const mockSequelize = {
  transaction: jest.fn(async (callback) => callback({ id: 'transaction' })),
};

jest.mock('../models/User');
jest.mock('../models', () => ({
  PasswordResetToken: mockPasswordResetToken,
  sequelize: mockSequelize,
}));
jest.mock('../services/passwordResetDelivery', () => ({
  sendPasswordResetEmail: jest.fn().mockResolvedValue({ delivery: 'development_capture' }),
}));
jest.mock('google-auth-library', () => ({
  OAuth2Client: jest.fn().mockImplementation(() => ({
    verifyIdToken: jest.fn().mockResolvedValue({
      getPayload: () => ({
        email: 'oauth@gmail.com',
        email_verified: true,
        given_name: 'OAuth',
        family_name: 'User',
        name: 'OAuth User',
        picture: null,
      }),
    }),
  })),
}));

const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { sendPasswordResetEmail } = require('../services/passwordResetDelivery');
const authRouter = require('../routes/auth');

const createTestApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/auth', authRouter);
  return app;
};

describe('Auth Routes', () => {
  let app;

  beforeEach(() => {
    app = createTestApp();
    jest.clearAllMocks();
    mockPasswordResetToken.update.mockResolvedValue([1]);
    mockPasswordResetToken.create.mockResolvedValue({ id: 'reset-1' });
    mockSequelize.transaction.mockImplementation(async (callback) => callback({ id: 'transaction' }));
    sendPasswordResetEmail.mockResolvedValue({ delivery: 'development_capture' });
  });

  describe('POST /api/auth/register', () => {
    it('should return 201 when data is valid', async () => {
      const mockUser = {
        id: 'id-1',
        email: 'new@example.com',
        firstName: 'A',
        lastName: 'B',
        toJSON() {
          return { id: this.id, email: this.email, firstName: this.firstName, lastName: this.lastName };
        },
      };
      User.findOne = jest.fn().mockResolvedValue(null);
      User.create = jest.fn().mockResolvedValue(mockUser);

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'new@example.com',
          password: 'secret123',
          firstName: 'A',
          lastName: 'B',
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('token');
      expect(User.create).toHaveBeenCalled();
    });

    it('should return 400 when email already exists', async () => {
      User.findOne = jest.fn().mockResolvedValue({ id: 'x', email: 'exists@example.com' });

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'exists@example.com',
          password: 'secret123',
          firstName: 'A',
          lastName: 'B',
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toMatch(/already exists/i);
    });

    // Regression: the existence check and the insert are not atomic, so two
    // concurrent signups for the same address both pass the check and one
    // loses the unique index. It used to fall through to the generic catch and
    // answer 500 "Internal server error".
    it('returns the same 400 when a concurrent signup wins the unique index', async () => {
      User.findOne = jest.fn().mockResolvedValue(null);
      const uniqueError = new Error('Validation error');
      uniqueError.name = 'SequelizeUniqueConstraintError';
      User.create = jest.fn().mockRejectedValue(uniqueError);

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'race@example.com',
          password: 'secret123',
          firstName: 'A',
          lastName: 'B',
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('User already exists with this email');
    });

    it('still returns 500 for an unrelated create failure', async () => {
      User.findOne = jest.fn().mockResolvedValue(null);
      User.create = jest.fn().mockRejectedValue(new Error('connection reset'));

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'boom@example.com',
          password: 'secret123',
          firstName: 'A',
          lastName: 'B',
        });

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('Internal server error');
    });
  });

  describe('POST /api/auth/login', () => {
    it('should return 200 when credentials are valid', async () => {
      const mockUser = {
        id: 'id-1',
        email: 'user@example.com',
        validatePassword: jest.fn().mockResolvedValue(true),
        toJSON() {
          return { id: this.id, email: this.email };
        },
      };
      User.findOne = jest.fn().mockResolvedValue(mockUser);

      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'user@example.com', password: 'correct' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
      expect(response.headers['set-cookie'][0]).toMatch(/caplet_refresh=.*HttpOnly/i);
      expect(mockUser.validatePassword).toHaveBeenCalledWith('correct');
    });

    it('refreshes a short-lived access token through the HttpOnly cookie', async () => {
      const mockUser = {
        id: 'id-refresh',
        email: 'refresh@example.com',
        validatePassword: jest.fn().mockResolvedValue(true),
        toJSON() { return { id: this.id, email: this.email }; },
      };
      User.findOne = jest.fn().mockResolvedValue(mockUser);
      User.findByPk = jest.fn().mockResolvedValue(mockUser);
      const agent = request.agent(app);

      const login = await agent
        .post('/api/auth/login')
        .send({ email: 'refresh@example.com', password: 'correct' });
      expect(login.status).toBe(200);

      const refresh = await agent
        .post('/api/auth/refresh')
        .set('X-Caplet-Client', 'web');
      expect(refresh.status).toBe(200);
      expect(refresh.body).toHaveProperty('token');
      expect(User.findByPk).toHaveBeenCalledWith('id-refresh');

      const csrfAttempt = await agent.post('/api/auth/refresh');
      expect(csrfAttempt.status).toBe(403);
    });

    it('should return 401 when user not found', async () => {
      User.findOne = jest.fn().mockResolvedValue(null);

      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'nope@example.com', password: 'x' });

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/auth/google', () => {
    it('should return 400 when idToken is missing', async () => {
      const response = await request(app)
        .post('/api/auth/google')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('errors');
    });

    it('should return 200 and create user when token is valid and user is new', async () => {
      const mockUser = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        email: 'oauth@gmail.com',
        firstName: 'OAuth',
        lastName: 'User',
        toJSON() {
          return {
            id: this.id,
            email: this.email,
            firstName: this.firstName,
            lastName: this.lastName,
          };
        },
      };

      User.findOne = jest.fn().mockResolvedValue(null);
      User.findAll = jest.fn().mockResolvedValue([]);
      User.create = jest.fn().mockResolvedValue(mockUser);

      const response = await request(app)
        .post('/api/auth/google')
        .send({ idToken: 'fake-id-token' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('message', 'Google login successful');
      expect(response.body).toHaveProperty('user');
      expect(User.create).toHaveBeenCalled();
    });

    it('should return 200 for existing user without creating', async () => {
      const existing = {
        id: '550e8400-e29b-41d4-a716-446655440001',
        email: 'oauth@gmail.com',
        isEmailVerified: false,
        profilePicture: null,
        update: jest.fn().mockResolvedValue(undefined),
        toJSON() {
          return { id: this.id, email: this.email };
        },
      };

      User.findOne = jest.fn().mockResolvedValue(existing);
      User.create = jest.fn();

      const response = await request(app)
        .post('/api/auth/google')
        .send({ idToken: 'fake-id-token' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
      expect(User.create).not.toHaveBeenCalled();
    });
  });

  describe('GET /api/auth/me', () => {
    it('should return 401 when no token is provided', async () => {
      const response = await request(app)
        .get('/api/auth/me');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('message', 'No token provided');
    });

    it('should return 401 with invalid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer not-a-real-jwt');

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should return 200 logout successful message', async () => {
      const response = await request(app)
        .post('/api/auth/logout');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message', 'Logout successful');
    });
  });

  describe('password security', () => {
    const authHeader = (tokenVersion = 0) => ({
      Authorization: `Bearer ${jwt.sign({ userId: 'id-1', tokenVersion }, process.env.JWT_SECRET)}`,
    });

    it('requires and verifies the current password before changing it', async () => {
      const user = {
        id: 'id-1',
        tokenVersion: 2,
        passwordLoginEnabled: true,
        validatePassword: jest.fn().mockResolvedValue(false),
        update: jest.fn(),
      };
      User.findByPk = jest.fn().mockResolvedValue(user);

      const response = await request(app)
        .post('/api/auth/change-password')
        .set(authHeader(2))
        .send({ currentPassword: 'wrong password', newPassword: 'new-password-1', confirmPassword: 'new-password-1' });

      expect(response.status).toBe(400);
      expect(response.body.validation.currentPassword).toMatch(/incorrect/i);
      expect(user.update).not.toHaveBeenCalled();
    });

    it('changes a verified password and revokes existing sessions', async () => {
      const user = {
        id: 'id-1',
        tokenVersion: 2,
        passwordLoginEnabled: true,
        validatePassword: jest.fn().mockResolvedValue(true),
        update: jest.fn().mockResolvedValue(undefined),
      };
      User.findByPk = jest.fn().mockResolvedValue(user);

      const response = await request(app)
        .post('/api/auth/change-password')
        .set(authHeader(2))
        .send({ currentPassword: 'old-password', newPassword: 'new-password-1', confirmPassword: 'new-password-1' });

      expect(response.status).toBe(200);
      expect(response.body.token).toEqual(expect.any(String));
      expect(user.update).toHaveBeenCalledWith(expect.objectContaining({ password: 'new-password-1', tokenVersion: 3 }));
      expect(mockPasswordResetToken.update).toHaveBeenCalled();
    });

    it('returns the same reset-request response for known and unknown emails', async () => {
      const known = { id: 'id-1', email: 'known@example.com' };
      User.findOne = jest.fn()
        .mockResolvedValueOnce(known)
        .mockResolvedValueOnce(null);

      const knownResponse = await request(app).post('/api/auth/forgot-password').send({ email: 'known@example.com' });
      const unknownResponse = await request(app).post('/api/auth/forgot-password').send({ email: 'unknown@example.com' });

      expect(knownResponse.status).toBe(202);
      expect(unknownResponse.status).toBe(202);
      expect(unknownResponse.body).toEqual(knownResponse.body);
      expect(mockPasswordResetToken.create).toHaveBeenCalledTimes(1);
      expect(sendPasswordResetEmail).toHaveBeenCalledTimes(1);
    });

    it('accepts a valid single-use reset token and enables password login', async () => {
      const user = {
        id: 'id-1',
        tokenVersion: 4,
        update: jest.fn().mockResolvedValue(undefined),
      };
      mockPasswordResetToken.findOne.mockResolvedValue({ id: 'reset-1', userId: 'id-1' });
      mockPasswordResetToken.update
        .mockResolvedValueOnce([1])
        .mockResolvedValueOnce([1]);
      User.findByPk = jest.fn().mockResolvedValue(user);

      const response = await request(app).post('/api/auth/reset-password').send({
        token: 'a'.repeat(43),
        newPassword: 'new-password-2',
        confirmPassword: 'new-password-2',
      });

      expect(response.status).toBe(200);
      expect(user.update).toHaveBeenCalledWith(
        expect.objectContaining({ password: 'new-password-2', passwordLoginEnabled: true, tokenVersion: 5 }),
        expect.objectContaining({ transaction: expect.anything() }),
      );
    });

    it.each([
      ['malformed', 'short'],
      ['expired', 'b'.repeat(43)],
      ['already used', 'c'.repeat(43)],
    ])('rejects a %s reset token without revealing why', async (_label, token) => {
      mockPasswordResetToken.findOne.mockResolvedValue(null);

      const response = await request(app).post('/api/auth/reset-password').send({
        token,
        newPassword: 'new-password-3',
        confirmPassword: 'new-password-3',
      });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('This reset link is invalid or expired.');
    });
  });
});
