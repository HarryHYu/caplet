const crypto = require('crypto');
const { Op } = require('sequelize');

const FLAG_KEY = /^[a-z][a-z0-9._-]{1,99}$/;
const SENSITIVE_KEY = /(password|passwd|secret|token|credential|private[_-]?key|api[_-]?key)/i;
const FORBIDDEN_OBJECT_KEYS = new Set(['__proto__', 'prototype', 'constructor']);
const WRITABLE_FIELDS = new Set([
  'description',
  'enabled',
  'isPublic',
  'rolloutPercentage',
  'publicValue',
  'internalConfig',
]);

class FeatureFlagError extends Error {
  constructor(message, status = 400, code = 'invalid_feature_flag') {
    super(message);
    this.name = 'FeatureFlagError';
    this.status = status;
    this.code = code;
  }
}

function dependencies(overrides = {}) {
  return {
    FeatureFlag: overrides.FeatureFlag || require('../models/FeatureFlag'),
    FeatureFlagAudit: overrides.FeatureFlagAudit || require('../models/FeatureFlagAudit'),
    sequelize: overrides.sequelize || require('../config/database').sequelize,
  };
}

function normalizeFlagKey(value) {
  const key = String(value || '').trim().toLowerCase();
  if (!FLAG_KEY.test(key)) {
    throw new FeatureFlagError('Feature flag key must use lowercase letters, numbers, dots, dashes, or underscores');
  }
  return key;
}

function assertSafeObject(value, path = 'value') {
  if (value === null || typeof value !== 'object') return;
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertSafeObject(item, `${path}[${index}]`));
    return;
  }
  for (const [key, nested] of Object.entries(value)) {
    if (FORBIDDEN_OBJECT_KEYS.has(key) || SENSITIVE_KEY.test(key)) {
      throw new FeatureFlagError(`${path} cannot contain secrets or unsafe key names`);
    }
    assertSafeObject(nested, `${path}.${key}`);
  }
}

function boundedJson(value, field, maximumBytes) {
  let serialized;
  try {
    serialized = JSON.stringify(value);
  } catch {
    throw new FeatureFlagError(`${field} must be JSON serializable`);
  }
  if (serialized === undefined || Buffer.byteLength(serialized, 'utf8') > maximumBytes) {
    throw new FeatureFlagError(`${field} is too large`);
  }
  assertSafeObject(value, field);
  return value;
}

function sanitizeFlagInput(input, { partial = false } = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new FeatureFlagError('Feature flag input must be an object');
  }
  const values = {};
  for (const key of Object.keys(input)) {
    if (key === 'key' && !partial) continue;
    if (!WRITABLE_FIELDS.has(key)) throw new FeatureFlagError(`Unsupported feature flag field: ${key}`);
  }

  if (Object.prototype.hasOwnProperty.call(input, 'description')) {
    if (input.description !== null && typeof input.description !== 'string') {
      throw new FeatureFlagError('description must be a string or null');
    }
    const description = input.description === null ? null : input.description.trim();
    if (description && description.length > 500) throw new FeatureFlagError('description is too long');
    values.description = description || null;
  }
  for (const field of ['enabled', 'isPublic']) {
    if (Object.prototype.hasOwnProperty.call(input, field)) {
      if (typeof input[field] !== 'boolean') throw new FeatureFlagError(`${field} must be a boolean`);
      values[field] = input[field];
    }
  }
  if (Object.prototype.hasOwnProperty.call(input, 'rolloutPercentage')) {
    const rollout = Number(input.rolloutPercentage);
    if (!Number.isInteger(rollout) || rollout < 0 || rollout > 100) {
      throw new FeatureFlagError('rolloutPercentage must be an integer from 0 to 100');
    }
    values.rolloutPercentage = rollout;
  }
  if (Object.prototype.hasOwnProperty.call(input, 'publicValue')) {
    values.publicValue = boundedJson(input.publicValue, 'publicValue', 4096);
  }
  if (Object.prototype.hasOwnProperty.call(input, 'internalConfig')) {
    if (!input.internalConfig || typeof input.internalConfig !== 'object' || Array.isArray(input.internalConfig)) {
      throw new FeatureFlagError('internalConfig must be an object');
    }
    values.internalConfig = boundedJson(input.internalConfig, 'internalConfig', 16384);
  }
  if (partial && !Object.keys(values).length) throw new FeatureFlagError('No feature flag changes were provided');
  return values;
}

function plain(row) {
  return row?.toJSON ? row.toJSON() : { ...row };
}

function flagSnapshot(row) {
  if (!row) return null;
  const item = plain(row);
  return {
    id: item.id,
    key: item.key,
    description: item.description || null,
    enabled: Boolean(item.enabled),
    isPublic: Boolean(item.isPublic),
    rolloutPercentage: Number(item.rolloutPercentage),
    publicValue: item.publicValue ?? null,
    internalConfig: item.internalConfig || {},
    version: Number(item.version),
    archivedAt: item.archivedAt || null,
    createdBy: item.createdBy || null,
    updatedBy: item.updatedBy || null,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

function rolloutEnabled(flag, stableId) {
  const item = plain(flag);
  if (!item.enabled || item.archivedAt) return false;
  const percentage = Number(item.rolloutPercentage ?? 100);
  if (percentage >= 100) return true;
  if (percentage <= 0 || !stableId) return false;
  const digest = crypto.createHash('sha256').update(`${item.key}:${stableId}`).digest();
  return digest.readUInt32BE(0) % 100 < percentage;
}

function publicFlag(flag, stableId) {
  const item = plain(flag);
  return {
    key: item.key,
    enabled: rolloutEnabled(item, stableId),
    value: item.publicValue ?? null,
    version: Number(item.version),
    updatedAt: item.updatedAt,
  };
}

async function listPublicFlags({ keys = [], stableId = null, models = {} } = {}) {
  const { FeatureFlag } = dependencies(models);
  const where = { isPublic: true, archivedAt: null };
  const normalizedKeys = [...new Set(keys.map(normalizeFlagKey))].slice(0, 100);
  if (normalizedKeys.length) where.key = { [Op.in]: normalizedKeys };
  const rows = await FeatureFlag.findAll({ where, order: [['key', 'ASC']], limit: 500 });
  return rows.map((row) => publicFlag(row, stableId));
}

async function listAdminFlags({ includeArchived = false, models = {} } = {}) {
  const { FeatureFlag } = dependencies(models);
  const rows = await FeatureFlag.findAll({
    where: includeArchived ? {} : { archivedAt: null },
    order: [['key', 'ASC']],
    limit: 1000,
  });
  return rows.map(flagSnapshot);
}

async function createFeatureFlag(input, context = {}, models = {}) {
  const { FeatureFlag, FeatureFlagAudit, sequelize } = dependencies(models);
  const key = normalizeFlagKey(input?.key);
  const values = sanitizeFlagInput(input);
  try {
    return await sequelize.transaction(async (transaction) => {
      const existing = await FeatureFlag.findOne({ where: { key }, transaction });
      if (existing) throw new FeatureFlagError('Feature flag already exists', 409, 'feature_flag_exists');
      const flag = await FeatureFlag.create({
        key,
        ...values,
        createdBy: context.actorUserId || null,
        updatedBy: context.actorUserId || null,
      }, { transaction });
      await FeatureFlagAudit.create({
        flagId: flag.id,
        flagKey: key,
        action: 'created',
        actorUserId: context.actorUserId || null,
        previousValue: null,
        nextValue: flagSnapshot(flag),
        requestId: context.requestId || null,
      }, { transaction });
      return flagSnapshot(flag);
    });
  } catch (error) {
    if (error?.name === 'SequelizeUniqueConstraintError') {
      throw new FeatureFlagError('Feature flag already exists', 409, 'feature_flag_exists');
    }
    throw error;
  }
}

async function mutateFlag(keyInput, changes, context, action, models = {}) {
  const { FeatureFlag, FeatureFlagAudit, sequelize } = dependencies(models);
  const key = normalizeFlagKey(keyInput);
  return sequelize.transaction(async (transaction) => {
    const flag = await FeatureFlag.findOne({
      where: { key },
      transaction,
      lock: transaction.LOCK?.UPDATE,
    });
    if (!flag) throw new FeatureFlagError('Feature flag not found', 404, 'feature_flag_not_found');
    if (context.expectedVersion !== undefined && Number(context.expectedVersion) !== Number(flag.version)) {
      throw new FeatureFlagError('Feature flag changed since it was loaded', 409, 'feature_flag_version_conflict');
    }
    const previousValue = flagSnapshot(flag);
    const currentVersion = Number(flag.version);
    const [affected] = await FeatureFlag.update({
      ...changes,
      version: currentVersion + 1,
      updatedBy: context.actorUserId || null,
    }, {
      where: { id: flag.id, version: currentVersion },
      transaction,
    });
    if (affected !== 1) {
      throw new FeatureFlagError('Feature flag changed during the update', 409, 'feature_flag_version_conflict');
    }
    const updatedFlag = await FeatureFlag.findByPk(flag.id, { transaction });
    const nextValue = flagSnapshot(updatedFlag);
    await FeatureFlagAudit.create({
      flagId: flag.id,
      flagKey: key,
      action,
      actorUserId: context.actorUserId || null,
      previousValue,
      nextValue,
      requestId: context.requestId || null,
    }, { transaction });
    return nextValue;
  });
}

async function updateFeatureFlag(key, input, context = {}, models = {}) {
  return mutateFlag(key, sanitizeFlagInput(input, { partial: true }), context, 'updated', models);
}

async function archiveFeatureFlag(key, context = {}, models = {}) {
  return mutateFlag(key, { archivedAt: new Date(), enabled: false }, context, 'archived', models);
}

async function restoreFeatureFlag(key, context = {}, models = {}) {
  return mutateFlag(key, { archivedAt: null }, context, 'restored', models);
}

async function featureFlagAudit(keyInput, { limit = 100, models = {} } = {}) {
  const { FeatureFlag, FeatureFlagAudit } = dependencies(models);
  const key = normalizeFlagKey(keyInput);
  const flag = await FeatureFlag.findOne({ where: { key } });
  if (!flag) throw new FeatureFlagError('Feature flag not found', 404, 'feature_flag_not_found');
  const rows = await FeatureFlagAudit.findAll({
    where: { flagId: flag.id },
    order: [['createdAt', 'DESC']],
    limit: Math.min(500, Math.max(1, Number(limit) || 100)),
  });
  return rows.map(plain);
}

/** Feature flags are product controls and must never replace authorization. */
async function isFeatureEnabled(keyInput, { stableId = null, fallback = false, models = {} } = {}) {
  const { FeatureFlag } = dependencies(models);
  const key = normalizeFlagKey(keyInput);
  const flag = await FeatureFlag.findOne({ where: { key, archivedAt: null } });
  return flag ? rolloutEnabled(flag, stableId) : Boolean(fallback);
}

module.exports = {
  FLAG_KEY,
  FeatureFlagError,
  archiveFeatureFlag,
  assertSafeObject,
  createFeatureFlag,
  featureFlagAudit,
  flagSnapshot,
  isFeatureEnabled,
  listAdminFlags,
  listPublicFlags,
  normalizeFlagKey,
  publicFlag,
  restoreFeatureFlag,
  rolloutEnabled,
  sanitizeFlagInput,
  updateFeatureFlag,
};
