const fs = require('fs/promises');
const path = require('path');
const { checkLatestBackup } = require('./backupVerificationService');

function withTimeout(promise, timeoutMs, label) {
  let timer;
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error(`${label} timed out`)), timeoutMs);
      timer.unref?.();
    }),
  ]).finally(() => clearTimeout(timer));
}

async function checkDatabase(sequelize, options = {}) {
  const startedAt = Date.now();
  try {
    const [rows] = await withTimeout(
      sequelize.query('SELECT 1 AS ok'),
      Number(options.timeoutMs || 2500),
      'database check',
    );
    const result = Array.isArray(rows) ? rows[0] : rows;
    const ok = Number(result?.ok) === 1;
    return {
      ok,
      status: ok ? 'ok' : 'error',
      durationMs: Date.now() - startedAt,
      error: ok ? null : 'database returned an unexpected response',
    };
  } catch (error) {
    return { ok: false, status: 'error', durationMs: Date.now() - startedAt, error: error.message };
  }
}

async function expectedMigrationNames(migrationsDir) {
  return (await fs.readdir(migrationsDir))
    .filter((name) => /^\d{3}-.*\.js$/.test(name))
    .sort();
}

async function checkMigrations(sequelize, options = {}) {
  const startedAt = Date.now();
  try {
    const migrationsDir = options.migrationsDir || path.join(__dirname, '../migrations');
    const expected = options.expected || await expectedMigrationNames(migrationsDir);
    const [rows] = await withTimeout(
      sequelize.query('SELECT name FROM "SequelizeMeta" ORDER BY name'),
      Number(options.timeoutMs || 2500),
      'migration check',
    );
    const applied = rows.map((row) => row.name).sort();
    const appliedSet = new Set(applied);
    const pending = expected.filter((name) => !appliedSet.has(name));
    const ok = pending.length === 0;
    return {
      ok,
      status: ok ? 'ok' : 'pending',
      durationMs: Date.now() - startedAt,
      expectedCount: expected.length,
      appliedCount: applied.length,
      latestExpected: expected.at(-1) || null,
      latestApplied: applied.at(-1) || null,
      pending,
      error: null,
    };
  } catch (error) {
    return {
      ok: false,
      status: 'error',
      durationMs: Date.now() - startedAt,
      expectedCount: null,
      appliedCount: null,
      latestExpected: null,
      latestApplied: null,
      pending: [],
      error: error.message,
    };
  }
}

async function checkBackups(options = {}) {
  const startedAt = Date.now();
  try {
    const result = await withTimeout(
      checkLatestBackup(options),
      Number(options.timeoutMs || 2500),
      'backup check',
    );
    return { ...result, durationMs: Date.now() - startedAt, error: null };
  } catch (error) {
    return {
      ok: false,
      status: 'error',
      durationMs: Date.now() - startedAt,
      ageHours: null,
      latest: null,
      error: error.message,
    };
  }
}

async function getOperationalHealth(options = {}) {
  const sequelize = options.sequelize || require('../config/database').sequelize;
  const backupModels = options.BackupVerification
    ? { BackupVerification: options.BackupVerification }
    : options.models;
  const [database, migrations, backups] = await Promise.all([
    checkDatabase(sequelize, options),
    checkMigrations(sequelize, options),
    checkBackups({
      ...options,
      models: backupModels,
      environment: options.environment || process.env.NODE_ENV || 'development',
      maxAgeHours: options.maxAgeHours || process.env.BACKUP_MAX_AGE_HOURS || 26,
    }),
  ]);
  const ready = database.ok && migrations.ok;
  const status = !ready ? 'not_ready' : backups.ok ? 'ready' : 'degraded';
  return {
    status,
    ready,
    checkedAt: (options.now || new Date()).toISOString(),
    checks: { database, migrations, backups },
  };
}

function publicHealth(health) {
  return {
    status: health.status,
    ready: health.ready,
    checkedAt: health.checkedAt,
    checks: {
      database: { status: health.checks.database.status, durationMs: health.checks.database.durationMs },
      migrations: { status: health.checks.migrations.status, durationMs: health.checks.migrations.durationMs },
      backups: { status: health.checks.backups.status, durationMs: health.checks.backups.durationMs },
    },
  };
}

module.exports = {
  checkBackups,
  checkDatabase,
  checkMigrations,
  expectedMigrationNames,
  getOperationalHealth,
  publicHealth,
  withTimeout,
};
