const crypto = require('crypto');
const express = require('express');
const request = require('supertest');
const SequelizePackage = require('sequelize');
const { Sequelize, DataTypes } = SequelizePackage;

const migration = require('../migrations/026-operational-readiness');

const adminId = crypto.randomUUID();
let database;
let queryInterface;
let FeatureFlag;
let FeatureFlagAudit;
let BackupVerification;
let featureFlags;
let backups;
let readiness;
let featureFlagRouter;
let operationalRouter;

beforeAll(async () => {
  database = new Sequelize('sqlite::memory:', { logging: false });
  queryInterface = database.getQueryInterface();
  await queryInterface.createTable('users', {
    id: { type: DataTypes.UUID, primaryKey: true },
  });
  await queryInterface.bulkInsert('users', [{ id: adminId }]);
  await migration.up(queryInterface, SequelizePackage);

  jest.doMock('../config/database', () => ({ sequelize: database }));
  jest.doMock('../middleware/auth', () => ({
    requireAdmin(req, res, next) {
      req.user = { id: adminId, role: 'admin' };
      next();
    },
  }));

  FeatureFlag = require('../models/FeatureFlag');
  FeatureFlagAudit = require('../models/FeatureFlagAudit');
  BackupVerification = require('../models/BackupVerification');
  featureFlags = require('../services/featureFlagService');
  backups = require('../services/backupVerificationService');
  readiness = require('../services/operationalReadiness');
  featureFlagRouter = require('../routes/featureFlags');
  operationalRouter = require('../routes/operational');
});

beforeEach(async () => {
  await FeatureFlagAudit.destroy({ where: {} });
  await FeatureFlag.destroy({ where: {} });
  await BackupVerification.destroy({ where: {} });
});

afterAll(async () => {
  await migration.down(queryInterface);
  await database.close();
  jest.dontMock('../config/database');
  jest.dontMock('../middleware/auth');
});

describe('operational persistence', () => {
  test('migration and standalone models have matching columns and critical indexes', async () => {
    const pairs = [
      ['feature_flags', FeatureFlag],
      ['feature_flag_audits', FeatureFlagAudit],
      ['backup_verifications', BackupVerification],
    ];
    for (const [tableName, Model] of pairs) {
      const columns = await queryInterface.describeTable(tableName);
      const modelFields = Object.values(Model.rawAttributes).map((attribute) => attribute.field).sort();
      expect(Object.keys(columns).sort()).toEqual(modelFields);
    }

    const featureIndexes = await queryInterface.showIndex('feature_flags');
    expect(featureIndexes.find((index) => index.name === 'feature_flags_key_unique')?.unique).toBe(true);
    const backupIndexes = await queryInterface.showIndex('backup_verifications');
    expect(backupIndexes.find((index) => index.name === 'backup_verifications_key_unique')?.unique).toBe(true);
  });

  test('feature flags are audited, concurrency-safe, archivable, and publicly redacted', async () => {
    const context = { actorUserId: adminId, requestId: 'request-feature-001' };
    const created = await featureFlags.createFeatureFlag({
      key: 'learning.daily-practice',
      description: 'Daily practice workspace',
      enabled: true,
      isPublic: true,
      rolloutPercentage: 100,
      publicValue: { label: 'Daily practice' },
      internalConfig: { owner: 'learning-platform' },
    }, context);
    expect(created.version).toBe(1);

    const publicRows = await featureFlags.listPublicFlags({ stableId: 'student-device-001' });
    expect(publicRows).toEqual([expect.objectContaining({
      key: 'learning.daily-practice',
      enabled: true,
      value: { label: 'Daily practice' },
      version: 1,
    })]);
    expect(publicRows[0]).not.toHaveProperty('internalConfig');
    expect(publicRows[0]).not.toHaveProperty('rolloutPercentage');

    const updated = await featureFlags.updateFeatureFlag(
      created.key,
      { rolloutPercentage: 50 },
      { ...context, expectedVersion: 1 },
    );
    expect(updated.version).toBe(2);
    await expect(featureFlags.updateFeatureFlag(
      created.key,
      { enabled: false },
      { ...context, expectedVersion: 1 },
    )).rejects.toMatchObject({ status: 409, code: 'feature_flag_version_conflict' });

    const archived = await featureFlags.archiveFeatureFlag(created.key, {
      ...context,
      expectedVersion: 2,
    });
    expect(archived).toMatchObject({ enabled: false, version: 3 });
    expect(await featureFlags.listPublicFlags()).toEqual([]);

    const restored = await featureFlags.restoreFeatureFlag(created.key, {
      ...context,
      expectedVersion: 3,
    });
    expect(restored).toMatchObject({ version: 4, archivedAt: null });
    expect(await FeatureFlagAudit.count()).toBe(4);

    expect(() => featureFlags.sanitizeFlagInput({
      internalConfig: { apiKey: 'must-not-be-stored' },
    }, { partial: true })).toThrow(/secrets/i);
  });

  test('backup verification is immutable, idempotent, and detects newer failures', async () => {
    const input = {
      verificationKey: 'railway:production:backup-001:2026-07-13',
      backupId: 'backup-001',
      provider: 'railway',
      environment: 'production',
      status: 'verified',
      backupCreatedAt: '2026-07-13T00:00:00.000Z',
      verifiedAt: '2026-07-13T00:30:00.000Z',
      checksumVerified: true,
      sizeBytes: 2048,
      evidence: { job: 'nightly', algorithm: 'sha256' },
    };
    const first = await backups.recordBackupVerification(input, {
      actorUserId: adminId,
      requestId: 'request-backup-001',
      now: new Date('2026-07-13T00:31:00.000Z'),
    });
    expect(first.created).toBe(true);
    const duplicate = await backups.recordBackupVerification(input, {
      actorUserId: adminId,
      now: new Date('2026-07-13T00:31:00.000Z'),
    });
    expect(duplicate.created).toBe(false);
    await expect(backups.recordBackupVerification({
      ...input,
      evidence: { job: 'different-result' },
    }, { now: new Date('2026-07-13T00:31:00.000Z') })).rejects.toMatchObject({ status: 409 });

    const storedVerification = await BackupVerification.findByPk(first.verification.id);
    await expect(Promise.resolve().then(() => BackupVerification.runHooks(
      'beforeUpdate',
      storedVerification,
      {},
    ))).rejects.toThrow('append-only');

    const healthy = await backups.checkLatestBackup({
      environment: 'production',
      maxAgeHours: 26,
      now: new Date('2026-07-13T02:00:00.000Z'),
    });
    expect(healthy).toMatchObject({ ok: true, status: 'verified' });

    await backups.recordBackupVerification({
      verificationKey: 'railway:production:backup-002:2026-07-13',
      backupId: 'backup-002',
      provider: 'railway',
      environment: 'production',
      status: 'failed',
      backupCreatedAt: '2026-07-13T03:00:00.000Z',
      verifiedAt: '2026-07-13T03:10:00.000Z',
      checksumVerified: false,
      evidence: { job: 'nightly', result: 'restore-failed' },
    }, { now: new Date('2026-07-13T03:11:00.000Z') });
    const failed = await backups.checkLatestBackup({
      environment: 'production',
      now: new Date('2026-07-13T04:00:00.000Z'),
    });
    expect(failed).toMatchObject({ ok: false, status: 'failed' });
  });

  test('readiness requires database and migration health but treats backup freshness as degradation', async () => {
    await queryInterface.createTable('SequelizeMeta', {
      name: { type: DataTypes.STRING, primaryKey: true },
    });
    await queryInterface.bulkInsert('SequelizeMeta', [{ name: '026-operational-readiness.js' }]);
    await backups.recordBackupVerification({
      verificationKey: 'railway:production:readiness-001',
      backupId: 'readiness-001',
      provider: 'railway',
      environment: 'production',
      status: 'verified',
      backupCreatedAt: '2026-07-13T00:00:00.000Z',
      verifiedAt: '2026-07-13T00:10:00.000Z',
      checksumVerified: true,
    }, { now: new Date('2026-07-13T00:11:00.000Z') });

    const healthy = await readiness.getOperationalHealth({
      sequelize: database,
      BackupVerification,
      expected: ['026-operational-readiness.js'],
      environment: 'production',
      now: new Date('2026-07-13T01:00:00.000Z'),
    });
    expect(healthy).toMatchObject({ status: 'ready', ready: true });
    expect(readiness.publicHealth(healthy).checks.migrations).not.toHaveProperty('pending');

    const pending = await readiness.getOperationalHealth({
      sequelize: database,
      BackupVerification,
      expected: ['026-operational-readiness.js', '027-not-applied.js'],
      environment: 'production',
      now: new Date('2026-07-13T01:00:00.000Z'),
    });
    expect(pending).toMatchObject({ status: 'not_ready', ready: false });

    await queryInterface.bulkDelete('SequelizeMeta', {});
    await queryInterface.dropTable('SequelizeMeta');
  });
});

describe('operational middleware and public flag route', () => {
  test('risky feature flags fail closed when missing, archived, disabled, or at zero rollout', async () => {
    const missingModel = { findOne: jest.fn().mockResolvedValue(null) };
    await expect(featureFlags.isFeatureEnabled('practice.ai_feedback', {
      stableId: 'learner-1',
      fallback: false,
      models: { FeatureFlag: missingModel },
    })).resolves.toBe(false);
    expect(featureFlags.rolloutEnabled({ enabled: false, rolloutPercentage: 100 }, 'learner-1')).toBe(false);
    expect(featureFlags.rolloutEnabled({ enabled: true, archivedAt: new Date(), rolloutPercentage: 100 }, 'learner-1')).toBe(false);
    expect(featureFlags.rolloutEnabled({ enabled: true, rolloutPercentage: 0 }, 'learner-1')).toBe(false);
  });

  test('request context preserves safe IDs, emits timing headers, and logs a redacted route', async () => {
    const lines = [];
    const { createRequestContext } = require('../middleware/requestContext');
    const app = express();
    app.use(createRequestContext({ logger: (line) => lines.push(line) }));
    app.get('/users/:id', (req, res) => res.json({ ok: true }));

    const response = await request(app)
      .get(`/users/${crypto.randomUUID()}?token=never-log-this`)
      .set('X-Request-Id', 'client-request-123');
    expect(response.status).toBe(200);
    expect(response.headers['x-request-id']).toBe('client-request-123');
    expect(response.headers['server-timing']).toMatch(/^app;dur=/);
    const log = JSON.parse(lines[0]);
    expect(log).toMatchObject({
      event: 'http_request',
      requestId: 'client-request-123',
      route: '/users/:id',
      status: 200,
      outcome: 'completed',
    });
    expect(lines[0]).not.toContain('never-log-this');

    const replaced = await request(app).get('/users/42').set('X-Request-Id', 'short');
    expect(replaced.headers['x-request-id']).not.toBe('short');
    expect(replaced.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/);
  });

  test('rate limiter returns standard retry metadata and resets after its window', async () => {
    let timestamp = 0;
    const { createRateLimiter } = require('../middleware/rateLimit');
    const limiter = createRateLimiter({
      scope: 'test',
      windowMs: 1000,
      max: 2,
      maxEntries: 100,
      now: () => timestamp,
      keyGenerator: () => 'student-1',
    });
    const app = express();
    app.use(limiter);
    app.get('/', (req, res) => res.json({ ok: true }));

    expect((await request(app).get('/')).status).toBe(200);
    const second = await request(app).get('/');
    expect(second.headers['ratelimit-remaining']).toBe('0');
    const limited = await request(app).get('/');
    expect(limited.status).toBe(429);
    expect(limited.headers['retry-after']).toBe('1');
    timestamp = 1001;
    expect((await request(app).get('/')).status).toBe(200);
  });

  test('public feature flag route exposes no internal rollout or audit data', async () => {
    await featureFlags.createFeatureFlag({
      key: 'practice.workspace',
      enabled: true,
      isPublic: true,
      publicValue: { label: 'Practice' },
      internalConfig: { owner: 'platform' },
    }, { actorUserId: adminId });
    const { createRequestContext } = require('../middleware/requestContext');
    const app = express();
    app.use(createRequestContext({ logger: () => {} }));
    app.use(express.json());
    app.use('/api/feature-flags', featureFlagRouter);

    const response = await request(app).get('/api/feature-flags');
    expect(response.status).toBe(200);
    expect(response.body.flags).toEqual([expect.objectContaining({
      key: 'practice.workspace',
      enabled: true,
      value: { label: 'Practice' },
    })]);
    expect(response.body.flags[0]).not.toHaveProperty('internalConfig');
    expect(response.body.flags[0]).not.toHaveProperty('rolloutPercentage');
  });

  test('operational routes expose safe probes and accept audited admin backup evidence', async () => {
    const { createRequestContext } = require('../middleware/requestContext');
    const app = express();
    app.use(createRequestContext({ logger: () => {} }));
    app.use(express.json());
    app.use('/api/ops', operationalRouter);

    const live = await request(app).get('/api/ops/live');
    expect(live).toMatchObject({ status: 200 });
    expect(live.body).toEqual(expect.objectContaining({ status: 'alive' }));

    // A missing migration ledger is a safe 503 and never leaks its DB error.
    const notReady = await request(app).get('/api/ops/ready');
    expect(notReady.status).toBe(503);
    expect(notReady.body.checks.migrations).not.toHaveProperty('error');

    const verifiedAt = new Date(Date.now() - 60 * 1000);
    const backupCreatedAt = new Date(verifiedAt.getTime() - 60 * 60 * 1000);
    const recorded = await request(app)
      .post('/api/ops/admin/backups/verifications')
      .send({
        verificationKey: 'route:production:backup-verification-001',
        backupId: 'route-backup-001',
        provider: 'railway',
        environment: 'production',
        status: 'verified',
        backupCreatedAt: backupCreatedAt.toISOString(),
        verifiedAt: verifiedAt.toISOString(),
        checksumVerified: true,
        evidence: { job: 'nightly' },
      });
    expect(recorded.status).toBe(201);
    expect(recorded.body.verification).toEqual(expect.objectContaining({
      backupId: 'route-backup-001',
      status: 'verified',
    }));
    expect(await BackupVerification.count()).toBe(1);
  });
});
