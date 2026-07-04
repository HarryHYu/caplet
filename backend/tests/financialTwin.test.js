/**
 * Route tests for /api/financial-twin — the full pipeline over supertest with
 * the DB models and auth mocked (same pattern as debtSequencing.test.js).
 * The CDR provider, categorizer and projection engine run for real, so these
 * are integration tests of everything except persistence.
 */

process.env.JWT_SECRET = 'test-jwt-secret-for-financial-twin-tests';

jest.mock('../models/UserFinancialProfile');
jest.mock('../models/CdrConnection');
jest.mock('../models/CdrTransaction');
jest.mock('../middleware/auth', () => ({
  requireAuth: (req, _res, next) => {
    req.user = { id: 'test-user-1' };
    next();
  },
}));

const request = require('supertest');
const express = require('express');
const UserFinancialProfile = require('../models/UserFinancialProfile');
const CdrConnection = require('../models/CdrConnection');
const CdrTransaction = require('../models/CdrTransaction');
const provider = require('../services/cdr/mockCdrProvider');
const financialTwinRouter = require('../routes/financialTwin');

const createTestApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/financial-twin', financialTwinRouter);
  return app;
};

/** A mock CdrConnection row whose update() merges like Sequelize's. */
function makeConnection(fields = {}) {
  const row = {
    id: 'conn-1',
    userId: 'test-user-1',
    status: 'pending',
    consentId: null,
    cdrArrangementId: null,
    persona: null,
    scopes: [],
    accountsSnapshot: null,
    consentedAt: null,
    revokedAt: null,
    expiresAt: null,
    ...fields,
  };
  row.update = jest.fn(async (patch) => Object.assign(row, patch));
  return row;
}

describe('/api/financial-twin', () => {
  let app;
  beforeEach(() => {
    app = createTestApp();
    jest.clearAllMocks();
    provider._reset();
    UserFinancialProfile.findOne = jest.fn().mockResolvedValue(null);
    CdrConnection.findOne = jest.fn().mockResolvedValue(null);
    CdrConnection.create = jest.fn(async () => makeConnection());
    CdrTransaction.destroy = jest.fn().mockResolvedValue(0);
    CdrTransaction.bulkCreate = jest.fn(async (rows) => rows);
    CdrTransaction.findAll = jest.fn().mockResolvedValue([]);
  });

  describe('POST /connect', () => {
    it('runs consent → ingest → categorize → persist, and returns the summary', async () => {
      const res = await request(app).post('/api/financial-twin/connect').send({ persona: 'grad-hecs-bnpl' });

      expect(res.status).toBe(200);
      expect(res.body.connection.status).toBe('active');
      expect(res.body.partial).toBe(false);
      expect(res.body.summary.transactionCount).toBeGreaterThan(50);
      expect(res.body.summary.totalsByCategory).toHaveProperty('hecs');

      // Persistence actually happened.
      expect(CdrTransaction.bulkCreate).toHaveBeenCalledTimes(1);
      const rows = CdrTransaction.bulkCreate.mock.calls[0][0];
      expect(rows.length).toBe(res.body.summary.transactionCount);
      for (const row of rows) {
        expect(row.connectionId).toBe('conn-1');
        expect(Number.isInteger(row.amount)).toBe(true);
        expect(typeof row.category).toBe('string');
      }
      // Minimized snapshot: no display names, brands or masked numbers.
      const snapshot = res.body.connection.accountsSnapshot;
      expect(snapshot.length).toBeGreaterThan(0);
      for (const acc of snapshot) {
        expect(Object.keys(acc).sort()).toEqual(['accountId', 'balance', 'productCategory']);
      }
    });

    it('rejects an unknown persona with 400', async () => {
      const res = await request(app).post('/api/financial-twin/connect').send({ persona: 'evil' });
      expect(res.status).toBe(400);
      expect(res.body.errors).toBeDefined();
      expect(CdrTransaction.bulkCreate).not.toHaveBeenCalled();
    });

    it('replaces a previous connection: purges superseded transactions first', async () => {
      const existing = makeConnection({ status: 'active' });
      CdrConnection.findOne = jest.fn().mockResolvedValue(existing);

      const res = await request(app).post('/api/financial-twin/connect').send({ persona: 'grad-hecs-bnpl' });
      expect(res.status).toBe(200);
      expect(CdrTransaction.destroy).toHaveBeenCalledWith({ where: { connectionId: 'conn-1' } });
      expect(CdrConnection.create).not.toHaveBeenCalled();
    });

    it('survives partial data: syncs what it can and says so', async () => {
      const res = await request(app).post('/api/financial-twin/connect').send({ persona: 'partial-data' });
      expect(res.status).toBe(200);
      expect(res.body.partial).toBe(true);
      expect(res.body.partialAccountIds).toEqual(['partial-data-loan']);
      expect(res.body.summary.transactionCount).toBeGreaterThan(0);
    });

    it('handles consent revoked mid-sync: 409 + purge, nothing half-ingested survives', async () => {
      const res = await request(app).post('/api/financial-twin/connect').send({ persona: 'revokes-mid-session' });
      expect(res.status).toBe(409);
      expect(res.body.message).toMatch(/revoked/i);
      // Whatever the connection held was destroyed, and nothing was inserted.
      expect(CdrTransaction.destroy).toHaveBeenCalled();
      expect(CdrTransaction.bulkCreate).not.toHaveBeenCalled();
    });

    it('never logs transaction descriptions, amounts or merchant text (PII rule)', async () => {
      const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      try {
        await request(app).post('/api/financial-twin/connect').send({ persona: 'messy-merchants' });
        const allLogged = [...logSpy.mock.calls, ...errSpy.mock.calls].flat().map(String).join(' ');
        for (const leak of ['ESPRESSO', 'HECSTATIC', 'QUOLL', 'ZIPLINE', 'SUPA CHEAP', 'CASUAL WAGES']) {
          expect(allLogged).not.toContain(leak);
        }
      } finally {
        logSpy.mockRestore();
        errSpy.mockRestore();
      }
    });
  });

  describe('GET /connection and POST /connection/revoke', () => {
    it('reports no connection cleanly', async () => {
      const res = await request(app).get('/api/financial-twin/connection');
      expect(res.status).toBe(200);
      expect(res.body.connection).toBeNull();
    });

    it('revoke purges stored transactions, nulls the snapshot and marks the row revoked', async () => {
      const existing = makeConnection({
        status: 'active',
        cdrArrangementId: 'mock-arrangement-x',
        accountsSnapshot: [{ accountId: 'a', productCategory: 'TRANS_AND_SAVINGS_ACCOUNTS', balance: 100 }],
      });
      CdrConnection.findOne = jest.fn().mockResolvedValue(existing);
      CdrTransaction.destroy = jest.fn().mockResolvedValue(54);

      const res = await request(app).post('/api/financial-twin/connection/revoke');
      expect(res.status).toBe(200);
      expect(res.body.purged).toBe(54);
      expect(res.body.connection.status).toBe('revoked');
      expect(res.body.connection.accountsSnapshot).toBeNull();
      expect(CdrTransaction.destroy).toHaveBeenCalledWith({ where: { connectionId: 'conn-1' } });
    });

    it('revoking with no connection is a 404, not a crash', async () => {
      const res = await request(app).post('/api/financial-twin/connection/revoke');
      expect(res.status).toBe(404);
    });
  });

  describe('GET /categorized', () => {
    it('returns connected:false when there is no active connection', async () => {
      const res = await request(app).get('/api/financial-twin/categorized');
      expect(res.status).toBe(200);
      expect(res.body.connected).toBe(false);
    });

    it('summarizes stored rows and surfaces only the uncertain ones for review', async () => {
      CdrConnection.findOne = jest.fn().mockResolvedValue(makeConnection({ status: 'active' }));
      CdrTransaction.findAll = jest.fn().mockResolvedValue([
        { id: '1', amount: 2500, category: 'income', uncertain: false, confidence: 0.85, description: 'SALARY', postedAt: new Date('2026-06-01') },
        { id: '2', amount: -150, category: 'uncertain', uncertain: true, confidence: 0.4, description: 'ATO PAYMENT PLAN', postedAt: new Date('2026-05-20') },
      ]);

      const res = await request(app).get('/api/financial-twin/categorized');
      expect(res.status).toBe(200);
      expect(res.body.summary.transactionCount).toBe(2);
      expect(res.body.uncertain).toHaveLength(1);
      expect(res.body.uncertain[0].description).toBe('ATO PAYMENT PLAN');
    });
  });

  describe('GET /projection', () => {
    it('projects from the saved profile with clamped params and echoes the seed', async () => {
      UserFinancialProfile.findOne = jest.fn().mockResolvedValue({
        annualIncome: 85000,
        hecsBalance: 32000,
        savingsBalance: 5000,
        superBalance: 12000,
      });

      const res = await request(app).get('/api/financial-twin/projection?seed=42&trials=100&years=10');
      expect(res.status).toBe(200);
      const { projection } = res.body;
      expect(projection.seed).toBe(42);
      expect(projection.trials).toBe(100);
      expect(projection.horizonYears).toBe(10);
      expect(projection.series.hecsBalance).toHaveLength(10);
      expect(projection.disclaimer).toMatch(/not personal advice/i);
      for (const a of projection.assumptions) {
        expect(a.effectiveDate).toBeDefined();
        expect(a.source).toBeDefined();
      }
    });

    it('is reproducible over HTTP: same seed, same body', async () => {
      UserFinancialProfile.findOne = jest.fn().mockResolvedValue({ annualIncome: 60000, hecsBalance: 20000 });
      const a = await request(app).get('/api/financial-twin/projection?seed=7&trials=100&years=10');
      const b = await request(app).get('/api/financial-twin/projection?seed=7&trials=100&years=10');
      expect(a.body).toEqual(b.body);
    });

    it('clamps garbage params instead of failing', async () => {
      const res = await request(app).get('/api/financial-twin/projection?seed=banana&trials=-5&years=collapse');
      expect(res.status).toBe(200);
      expect(res.body.projection.seed).toBe(1);
      expect(res.body.projection.trials).toBe(100);
      expect(res.body.projection.horizonYears).toBe(20);
    });

    it('works with no profile at all (empty start state, still a valid range result)', async () => {
      const res = await request(app).get('/api/financial-twin/projection');
      expect(res.status).toBe(200);
      expect(res.body.projection.series.netPosition).toHaveLength(20);
    });

    it('feeds observed CDR flow into the projection when an active connection has rows', async () => {
      CdrConnection.findOne = jest.fn().mockResolvedValue(makeConnection({ status: 'active' }));
      CdrTransaction.findAll = jest.fn().mockResolvedValue([
        { amount: 5000, category: 'income', uncertain: false, postedAt: new Date('2026-01-01') },
        { amount: -2000, category: 'spending', uncertain: false, postedAt: new Date('2026-06-01') },
      ]);
      const res = await request(app).get('/api/financial-twin/projection');
      expect(res.status).toBe(200);
      expect(res.body.projection.generatedFor.usedCdrData).toBe(true);
    });
  });
});
