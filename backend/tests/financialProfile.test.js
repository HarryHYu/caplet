process.env.JWT_SECRET = 'test-jwt-secret-for-financial-profile-tests';

jest.mock('../models/UserFinancialProfile');
// Bypass real JWT auth: inject a fixed user.
jest.mock('../middleware/auth', () => ({
  requireAuth: (req, _res, next) => {
    req.user = { id: 'test-user-1' };
    next();
  },
}));

const request = require('supertest');
const express = require('express');
const UserFinancialProfile = require('../models/UserFinancialProfile');
const financialRouter = require('../routes/financialProfile');

const createTestApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/financial-profile', financialRouter);
  return app;
};

describe('Financial Profile Routes', () => {
  let app;

  beforeEach(() => {
    app = createTestApp();
    jest.clearAllMocks();
  });

  describe('GET /api/financial-profile', () => {
    it('returns an empty default shape when the user has no profile', async () => {
      UserFinancialProfile.findOne = jest.fn().mockResolvedValue(null);

      const res = await request(app).get('/api/financial-profile');

      expect(res.status).toBe(200);
      expect(res.body.financialProfile).toMatchObject({
        annualIncome: null,
        savingsBalance: null,
        superBalance: null,
        monthlyExpenses: null,
        currency: 'AUD',
        debts: [],
        goals: [],
      });
    });

    it('returns the existing profile when present', async () => {
      UserFinancialProfile.findOne = jest.fn().mockResolvedValue({
        id: 'p1',
        annualIncome: 80000,
        savingsBalance: 1500,
        superBalance: 12000,
        monthlyExpenses: 2500,
        currency: 'AUD',
        debts: [{ label: 'Visa', balance: 3000, rate: 19.9 }],
        goals: [{ label: 'House', target: 50000 }],
        updatedAt: new Date('2026-01-01T00:00:00Z'),
      });

      const res = await request(app).get('/api/financial-profile');

      expect(res.status).toBe(200);
      expect(res.body.financialProfile.annualIncome).toBe(80000);
      expect(res.body.financialProfile.debts).toEqual([{ label: 'Visa', balance: 3000, rate: 19.9 }]);
      expect(res.body.financialProfile.goals).toEqual([{ label: 'House', target: 50000 }]);
    });
  });

  describe('PUT /api/financial-profile', () => {
    it('upserts and persists values, echoing the saved profile', async () => {
      const saved = {
        id: 'p1',
        annualIncome: null,
        savingsBalance: null,
        superBalance: null,
        monthlyExpenses: null,
        currency: 'AUD',
        debts: [],
        goals: [],
        updatedAt: new Date('2026-01-01T00:00:00Z'),
        update: jest.fn().mockImplementation(function (patch) {
          Object.assign(this, patch);
          return Promise.resolve(this);
        }),
      };
      UserFinancialProfile.findOrCreate = jest.fn().mockResolvedValue([saved, true]);

      const res = await request(app)
        .put('/api/financial-profile')
        .send({ annualIncome: 80000, savingsBalance: 1500, debts: [{ label: 'Visa', balance: 3000, rate: 19.9 }] });

      expect(res.status).toBe(200);
      expect(saved.update).toHaveBeenCalledWith(
        expect.objectContaining({
          annualIncome: 80000,
          savingsBalance: 1500,
          debts: [{ label: 'Visa', balance: 3000, rate: 19.9 }],
        }),
      );
      expect(res.body.financialProfile.annualIncome).toBe(80000);
    });

    it('rejects a negative income with 400 and does not write', async () => {
      UserFinancialProfile.findOrCreate = jest.fn();

      const res = await request(app)
        .put('/api/financial-profile')
        .send({ annualIncome: -5 });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('errors');
      expect(UserFinancialProfile.findOrCreate).not.toHaveBeenCalled();
    });

    it('rejects a value above the INT4 ceiling with 400 (Postgres safety)', async () => {
      UserFinancialProfile.findOrCreate = jest.fn();

      const res = await request(app)
        .put('/api/financial-profile')
        .send({ annualIncome: 9999999999 });

      expect(res.status).toBe(400);
      expect(UserFinancialProfile.findOrCreate).not.toHaveBeenCalled();
    });

    it('rejects non-numeric money types (boolean / array / decimal / text) with 400', async () => {
      UserFinancialProfile.findOrCreate = jest.fn();

      for (const bad of [true, [], 1.5, 'abc']) {
        const res = await request(app)
          .put('/api/financial-profile')
          .send({ savingsBalance: bad });
        expect(res.status).toBe(400);
      }
      expect(UserFinancialProfile.findOrCreate).not.toHaveBeenCalled();
    });

    it('treats a whitespace-only money string as "clear the field" (null)', async () => {
      const saved = {
        id: 'p1',
        update: jest.fn().mockImplementation(function (patch) {
          Object.assign(this, patch);
          return Promise.resolve(this);
        }),
      };
      UserFinancialProfile.findOrCreate = jest.fn().mockResolvedValue([saved, false]);

      const res = await request(app)
        .put('/api/financial-profile')
        .send({ savingsBalance: '   ' });

      expect(res.status).toBe(200);
      expect(saved.update).toHaveBeenCalledWith(expect.objectContaining({ savingsBalance: null }));
    });

    it('strips null/non-object entries from debts before storing', async () => {
      const saved = {
        id: 'p1',
        update: jest.fn().mockImplementation(function (patch) {
          Object.assign(this, patch);
          return Promise.resolve(this);
        }),
      };
      UserFinancialProfile.findOrCreate = jest.fn().mockResolvedValue([saved, false]);

      const res = await request(app)
        .put('/api/financial-profile')
        .send({ debts: [null, { label: 'Visa', balance: 3000, rate: 19.9 }] });

      expect(res.status).toBe(200);
      expect(saved.update).toHaveBeenCalledWith(
        expect.objectContaining({ debts: [{ label: 'Visa', balance: 3000, rate: 19.9 }] }),
      );
    });

    it('clears a field when sent null', async () => {
      const saved = {
        id: 'p1',
        update: jest.fn().mockImplementation(function (patch) {
          Object.assign(this, patch);
          return Promise.resolve(this);
        }),
      };
      UserFinancialProfile.findOrCreate = jest.fn().mockResolvedValue([saved, false]);

      const res = await request(app)
        .put('/api/financial-profile')
        .send({ savingsBalance: null });

      expect(res.status).toBe(200);
      expect(saved.update).toHaveBeenCalledWith(expect.objectContaining({ savingsBalance: null }));
    });
  });
});
