const SequelizePackage = require('sequelize');
const { Sequelize, DataTypes } = SequelizePackage;

const migration = require('../migrations/035-operational-alerts');
const {
  isAICircuitOpen,
  recordAIEvent,
  recordHttpRequest,
  resetRuntimeMetricsForTests,
  runtimeSummary,
} = require('../services/runtimeMetrics');
const {
  openOperationalAlert,
  reconcileOperationalHealth,
  resolveOperationalAlert,
  retryPendingOperationalAlerts,
} = require('../services/operationalAlerts');

function defineOperationalAlert(database) {
  return database.define('OperationalAlertForTest', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    fingerprint: { type: DataTypes.STRING(160), allowNull: false },
    source: { type: DataTypes.STRING(24), allowNull: false },
    environment: { type: DataTypes.STRING(50), allowNull: false },
    severity: { type: DataTypes.STRING(24), allowNull: false },
    summary: { type: DataTypes.STRING(240), allowNull: false },
    status: { type: DataTypes.STRING(24), allowNull: false, defaultValue: 'open' },
    firstDetectedAt: { type: DataTypes.DATE, allowNull: false },
    lastDetectedAt: { type: DataTypes.DATE, allowNull: false },
    occurrenceCount: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
    resolvedAt: { type: DataTypes.DATE, allowNull: true },
    metadata: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
    deliveryStatus: { type: DataTypes.STRING(24), allowNull: false, defaultValue: 'pending' },
    deliveryChannel: { type: DataTypes.STRING(24), allowNull: true },
    deliveryAttempts: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    deliveryLastAttemptAt: { type: DataTypes.DATE, allowNull: true },
    deliveryNextAttemptAt: { type: DataTypes.DATE, allowNull: true },
    deliveredAt: { type: DataTypes.DATE, allowNull: true },
    deliveryLastError: { type: DataTypes.TEXT, allowNull: true },
    deliveryProviderId: { type: DataTypes.STRING(255), allowNull: true },
  }, { tableName: 'operational_alerts', timestamps: true });
}

function health({ ready = true, backup = true, checkedAt = '2026-07-13T00:00:00.000Z' } = {}) {
  return {
    checkedAt,
    ready,
    checks: {
      database: { ok: ready, status: ready ? 'ok' : 'error' },
      migrations: { ok: ready, status: ready ? 'ok' : 'pending' },
      backups: {
        ok: backup,
        status: backup ? 'verified' : 'stale',
        ageHours: backup ? 1 : 30,
        maxAgeHours: 26,
      },
    },
  };
}

describe('bounded runtime metrics', () => {
  beforeEach(() => resetRuntimeMetricsForTests());

  test('summarises request latency and errors without retaining URL data', () => {
    const now = new Date('2026-07-13T01:00:00.000Z');
    recordHttpRequest({ route: '/api/users/:id?token=never-store', method: 'GET', status: 200, durationMs: 12 }, { now });
    recordHttpRequest({ route: '/api/users/:id', method: 'GET', status: 503, durationMs: 90 }, { now });
    const summary = runtimeSummary({ now, windowMinutes: 15 });

    expect(summary.http).toMatchObject({ requests: 2, errors: 1, errorRate: 0.5 });
    expect(summary.http.latencyMs).toMatchObject({ p50: 12, p95: 90, p99: 90 });
    expect(summary.http.routes[0].route).toBe('/api/users/:id');
    expect(JSON.stringify(summary)).not.toContain('never-store');
  });

  test('reports explicit AI estimates and opens a scoped circuit after repeated failures', () => {
    const now = new Date('2026-07-13T01:00:00.000Z');
    const env = {
      AI_ESTIMATED_COST_USD_PER_UNIT: '0.25',
      AI_MONTHLY_BUDGET_USD: '10',
      AI_CIRCUIT_MIN_REQUESTS: '3',
      AI_CIRCUIT_FAILURE_RATE: '0.66',
      AI_CIRCUIT_WINDOW_MS: '300000',
      AI_CIRCUIT_OPEN_MS: '60000',
    };
    recordAIEvent({ scope: 'lesson-planner', units: 4, outcome: 'reserved' }, { now, env });
    for (let index = 0; index < 3; index += 1) {
      recordAIEvent({ scope: 'lesson-planner', outcome: 'failed' }, { now, env });
    }

    const circuit = isAICircuitOpen('lesson-planner', { now });
    const summary = runtimeSummary({ now, windowMinutes: 15, env });
    expect(circuit).toMatchObject({ state: 'open' });
    expect(summary.ai).toMatchObject({ reservedUnits: 4, failed: 3 });
    expect(summary.ai.cost).toMatchObject({ estimatedUsd: 1, budgetUsedPercentage: 10 });
    expect(summary.ai.circuits).toHaveLength(1);
  });
});

describe('durable operational alerts', () => {
  let database;
  let queryInterface;
  let OperationalAlert;

  beforeAll(async () => {
    database = new Sequelize('sqlite::memory:', { logging: false });
    queryInterface = database.getQueryInterface();
    await migration.up(queryInterface, SequelizePackage);
    OperationalAlert = defineOperationalAlert(database);
  });

  beforeEach(async () => {
    await OperationalAlert.destroy({ where: {} });
  });

  afterAll(async () => {
    await migration.down(queryInterface);
    await database.close();
  });

  test('migration supplies the durable queue and its retry indexes', async () => {
    const columns = await queryInterface.describeTable('operational_alerts');
    expect(columns).toEqual(expect.objectContaining({
      fingerprint: expect.any(Object),
      deliveryStatus: expect.any(Object),
      deliveryNextAttemptAt: expect.any(Object),
    }));
    const indexes = await queryInterface.showIndex('operational_alerts');
    expect(indexes.find((index) => index.name === 'operational_alerts_fingerprint_unique')?.unique).toBe(true);
    expect(indexes.some((index) => index.name === 'operational_alerts_delivery_retry_idx')).toBe(true);
  });

  test('persists before webhook delivery, excludes metadata, and retries failures', async () => {
    const requests = [];
    let shouldFail = true;
    const fetchImpl = jest.fn(async (url, request) => {
      requests.push({ url, request });
      if (shouldFail) return { ok: false, status: 503, json: async () => ({}), headers: { get: () => null } };
      return { ok: true, status: 200, json: async () => ({ id: 'provider-1' }), headers: { get: () => null } };
    });
    const env = {
      NODE_ENV: 'production',
      OPS_ALERT_WEBHOOK_URL: 'https://alerts.example.test/caplet',
      OPS_ALERT_RETRY_BASE_MS: '100',
    };
    const now = new Date('2026-07-13T01:00:00.000Z');
    const opened = await openOperationalAlert({
      fingerprint: 'backup:production',
      source: 'backup',
      environment: 'production',
      severity: 'critical',
      summary: 'Backup verification needs attention',
      metadata: { backupStatus: 'failed', forbiddenPrompt: 'learner text' },
    }, { models: { OperationalAlert }, env, fetchImpl, now });

    expect(opened.delivery.status).toBe('failed');
    const stored = await OperationalAlert.findOne();
    expect(stored.deliveryStatus).toBe('failed');
    expect(stored.deliveryAttempts).toBe(1);
    expect(stored.metadata).toEqual({ backupStatus: 'failed' });
    const firstPayload = JSON.parse(requests[0].request.body);
    expect(firstPayload).toEqual(expect.objectContaining({ source: 'backup', fingerprint: 'backup:production' }));
    expect(firstPayload).not.toHaveProperty('metadata');
    expect(requests[0].request.headers['Idempotency-Key']).toBe('caplet-ops-backup:production');

    shouldFail = false;
    const retried = await retryPendingOperationalAlerts({
      models: { OperationalAlert },
      env,
      fetchImpl,
      now: new Date(now.getTime() + 200),
    });
    expect(retried).toMatchObject({ attempted: 1, delivered: 1, failed: 0 });
    await stored.reload();
    expect(stored).toMatchObject({ deliveryStatus: 'delivered', deliveryAttempts: 2 });
  });

  test('deduplicates active incidents and resolves them when health recovers', async () => {
    const options = { models: { OperationalAlert }, deliver: false, environment: 'production' };
    await reconcileOperationalHealth(health({ ready: false, backup: false }), options);
    await reconcileOperationalHealth(health({ ready: false, backup: false, checkedAt: '2026-07-13T00:01:00.000Z' }), options);
    expect(await OperationalAlert.count()).toBe(2);
    expect((await OperationalAlert.findOne({ where: { fingerprint: 'readiness:production' } })).occurrenceCount).toBe(2);

    await reconcileOperationalHealth(health({ ready: true, backup: true, checkedAt: '2026-07-13T00:02:00.000Z' }), options);
    expect(await OperationalAlert.count({ where: { status: 'resolved' } })).toBe(2);

    const alreadyResolved = await resolveOperationalAlert('readiness:production', options);
    expect(alreadyResolved.resolved).toBe(false);
  });
});
