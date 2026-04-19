process.env.GOOGLE_CLIENT_ID = 'test-google-client-id';
process.env.JWT_SECRET = 'test-jwt-secret-for-auth-tests';

jest.mock('../models/User');
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
const User = require('../models/User');
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
});
