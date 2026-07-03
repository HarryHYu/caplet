process.env.JWT_SECRET = 'test-jwt-secret-for-debt-sequencing-tests';

jest.mock('../models/UserFinancialProfile');
jest.mock('../middleware/auth', () => ({
  requireAuth: (req, _res, next) => {
    req.user = { id: 'test-user-1' };
    next();
  },
}));

const request = require('supertest');
const express = require('express');
const UserFinancialProfile = require('../models/UserFinancialProfile');
const debtSequencingRouter = require('../routes/debtSequencing');

const createTestApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/debt-sequencing', debtSequencingRouter);
  return app;
};

describe('GET /api/debt-sequencing', () => {
  let app;
  beforeEach(() => {
    app = createTestApp();
    jest.clearAllMocks();
  });

  it('returns an empty-but-valid sequence when the user has no profile', async () => {
    UserFinancialProfile.findOne = jest.fn().mockResolvedValue(null);
    const res = await request(app).get('/api/debt-sequencing');
    expect(res.status).toBe(200);
    expect(res.body.sequence.order).toEqual([]);
    expect(res.body.sequence.hecs).toBeNull();
    expect(res.body.sequence.disclaimer).toMatch(/not financial advice/i);
  });

  it('ranks debts and reports HECS separately from the saved profile', async () => {
    UserFinancialProfile.findOne = jest.fn().mockResolvedValue({
      debts: [
        { label: 'Visa', balance: 3000, rate: 19.9, type: 'credit_card' },
        { label: 'Store card', balance: 1000, rate: 24, type: 'credit_card' },
      ],
      hecsBalance: 25000,
      annualIncome: 85000,
    });

    const res = await request(app).get('/api/debt-sequencing?indexationRate=3.2&extraMonthlyAmount=400');
    expect(res.status).toBe(200);
    const { sequence } = res.body;
    // Avalanche: 24% before 19.9%.
    expect(sequence.standardRanking.map((d) => d.label)).toEqual(['Store card', 'Visa']);
    expect(sequence.hecs).not.toBeNull();
    expect(sequence.hecs.compulsoryRepayment).toBe(2700); // 15% of (85k - 67k)
    expect(sequence.extraMonthlyAmount).toBe(400);
  });

  it('omits HECS entirely when the saved balance is zero/absent', async () => {
    UserFinancialProfile.findOne = jest.fn().mockResolvedValue({
      debts: [{ label: 'Visa', balance: 3000, rate: 19.9 }],
      hecsBalance: null,
      annualIncome: 60000,
    });
    const res = await request(app).get('/api/debt-sequencing');
    expect(res.status).toBe(200);
    expect(res.body.sequence.hecs).toBeNull();
  });

  it('uses a transient ?repaymentIncome override without touching the saved income', async () => {
    const findOne = jest.fn().mockResolvedValue({
      debts: [],
      hecsBalance: 20000,
      annualIncome: 60000, // below the threshold → would be $0 compulsory
    });
    UserFinancialProfile.findOne = findOne;

    const res = await request(app).get('/api/debt-sequencing?repaymentIncome=100000');
    expect(res.status).toBe(200);
    // Override income $100k → 15% of (100k - 67k) = $4,950, not $0 from the saved 60k.
    expect(res.body.sequence.hecs.compulsoryRepayment).toBe(4950);
    // The route only reads the profile; it never writes it back.
    expect(findOne).toHaveBeenCalledTimes(1);
  });

  it('falls back to safe defaults for a garbage indexationRate query param', async () => {
    UserFinancialProfile.findOne = jest.fn().mockResolvedValue({
      debts: [],
      hecsBalance: 10000,
      annualIncome: 90000,
    });
    const res = await request(app).get('/api/debt-sequencing?indexationRate=notanumber');
    expect(res.status).toBe(200);
    // Default 3.2% is used rather than NaN propagating into the projection.
    expect(res.body.sequence.hecs.indexationPct).toBe(3.2);
  });
});
