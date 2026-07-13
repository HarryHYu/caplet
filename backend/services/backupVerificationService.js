const crypto = require('crypto');
const { assertSafeObject } = require('./featureFlagService');

class BackupVerificationError extends Error {
  constructor(message, status = 400, code = 'invalid_backup_verification') {
    super(message);
    this.name = 'BackupVerificationError';
    this.status = status;
    this.code = code;
  }
}

function dependencies(overrides = {}) {
  return {
    BackupVerification: overrides.BackupVerification || require('../models/BackupVerification'),
  };
}

function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === 'object' && !(value instanceof Date)) {
    return Object.keys(value).sort().reduce((result, key) => {
      result[key] = stableValue(value[key]);
      return result;
    }, {});
  }
  return value instanceof Date ? value.toISOString() : value;
}

function stableStringify(value) {
  return JSON.stringify(stableValue(value));
}

function parseDate(value, field, required = false) {
  if ((value === undefined || value === null || value === '') && !required) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) throw new BackupVerificationError(`${field} must be a valid date`);
  return date;
}

function boundedString(value, field, maximum, required = false) {
  const text = String(value || '').trim();
  if (required && !text) throw new BackupVerificationError(`${field} is required`);
  if (text.length > maximum) throw new BackupVerificationError(`${field} is too long`);
  return text || null;
}

function normalizeBackupVerification(input, now = new Date()) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new BackupVerificationError('Backup verification input must be an object');
  }
  const provider = boundedString(input.provider, 'provider', 100, true);
  const environment = boundedString(
    input.environment || process.env.NODE_ENV || 'development',
    'environment',
    50,
    true,
  ).toLowerCase();
  if (!/^[a-z0-9._-]+$/.test(environment)) {
    throw new BackupVerificationError('environment contains unsupported characters');
  }
  const backupId = boundedString(input.backupId, 'backupId', 255, true);
  const status = String(input.status || '').trim().toLowerCase();
  if (!['verified', 'failed'].includes(status)) {
    throw new BackupVerificationError('status must be verified or failed');
  }
  const backupCreatedAt = parseDate(input.backupCreatedAt, 'backupCreatedAt', true);
  const verifiedAt = parseDate(input.verifiedAt, 'verifiedAt', true);
  const restoreTestedAt = parseDate(input.restoreTestedAt, 'restoreTestedAt');
  const recoveryPointAt = parseDate(input.recoveryPointAt, 'recoveryPointAt');
  const futureToleranceMs = 5 * 60 * 1000;
  if (backupCreatedAt > new Date(verifiedAt.getTime() + futureToleranceMs)) {
    throw new BackupVerificationError('backupCreatedAt cannot be after verifiedAt');
  }
  if (verifiedAt > new Date(now.getTime() + futureToleranceMs)) {
    throw new BackupVerificationError('verifiedAt cannot be in the future');
  }
  if (restoreTestedAt && restoreTestedAt > new Date(verifiedAt.getTime() + futureToleranceMs)) {
    throw new BackupVerificationError('restoreTestedAt cannot be after verifiedAt');
  }

  const checksumVerified = input.checksumVerified === true;
  if (status === 'verified' && !checksumVerified && !restoreTestedAt) {
    throw new BackupVerificationError('A verified backup requires a checksum or restore test');
  }
  const sizeBytes = input.sizeBytes === undefined || input.sizeBytes === null
    ? null
    : Number(input.sizeBytes);
  if (sizeBytes !== null && (!Number.isSafeInteger(sizeBytes) || sizeBytes < 0)) {
    throw new BackupVerificationError('sizeBytes must be a non-negative safe integer');
  }
  const recoveryTimeSeconds = input.recoveryTimeSeconds === undefined || input.recoveryTimeSeconds === null
    ? null
    : Number(input.recoveryTimeSeconds);
  if (recoveryTimeSeconds !== null && (!Number.isInteger(recoveryTimeSeconds) || recoveryTimeSeconds < 0)) {
    throw new BackupVerificationError('recoveryTimeSeconds must be a non-negative integer');
  }
  const evidence = input.evidence ?? {};
  if (!evidence || typeof evidence !== 'object' || Array.isArray(evidence)) {
    throw new BackupVerificationError('evidence must be an object');
  }
  assertSafeObject(evidence, 'evidence');
  if (Buffer.byteLength(stableStringify(evidence), 'utf8') > 32768) {
    throw new BackupVerificationError('evidence is too large');
  }
  const notes = boundedString(input.notes, 'notes', 4000);
  const verificationKey = boundedString(
    input.verificationKey || `${provider}:${environment}:${backupId}:${verifiedAt.toISOString()}`,
    'verificationKey',
    200,
    true,
  );
  if (!/^[A-Za-z0-9][A-Za-z0-9._:@+-]{7,199}$/.test(verificationKey)) {
    throw new BackupVerificationError('verificationKey contains unsupported characters');
  }

  const normalized = {
    verificationKey,
    backupId,
    provider,
    environment,
    status,
    backupCreatedAt,
    verifiedAt,
    restoreTestedAt,
    checksumVerified,
    sizeBytes,
    recoveryPointAt,
    recoveryTimeSeconds,
    evidence,
    notes,
  };
  normalized.evidenceDigest = crypto.createHash('sha256').update(stableStringify(normalized)).digest('hex');
  return normalized;
}

function plain(row) {
  return row?.toJSON ? row.toJSON() : { ...row };
}

function backupVerificationDto(row, { includeEvidence = true } = {}) {
  const item = plain(row);
  const dto = {
    id: item.id,
    verificationKey: item.verificationKey,
    backupId: item.backupId,
    provider: item.provider,
    environment: item.environment,
    status: item.status,
    backupCreatedAt: item.backupCreatedAt,
    verifiedAt: item.verifiedAt,
    restoreTestedAt: item.restoreTestedAt,
    checksumVerified: Boolean(item.checksumVerified),
    sizeBytes: item.sizeBytes === null || item.sizeBytes === undefined ? null : Number(item.sizeBytes),
    recoveryPointAt: item.recoveryPointAt,
    recoveryTimeSeconds: item.recoveryTimeSeconds,
    notes: item.notes,
    requestId: item.requestId,
    createdAt: item.createdAt,
  };
  if (includeEvidence) dto.evidence = item.evidence || {};
  return dto;
}

async function recordBackupVerification(input, context = {}, models = {}) {
  const { BackupVerification } = dependencies(models);
  const values = normalizeBackupVerification(input, context.now || new Date());
  const [row, created] = await BackupVerification.findOrCreate({
    where: { verificationKey: values.verificationKey },
    defaults: {
      ...values,
      recordedBy: context.actorUserId || null,
      requestId: context.requestId || null,
    },
  });
  if (!created && row.evidenceDigest !== values.evidenceDigest) {
    throw new BackupVerificationError(
      'verificationKey was already used for different evidence',
      409,
      'backup_verification_conflict',
    );
  }
  return { verification: backupVerificationDto(row), created };
}

async function listBackupVerifications({ environment, limit = 100, models = {} } = {}) {
  const { BackupVerification } = dependencies(models);
  const where = environment ? { environment: String(environment).toLowerCase() } : {};
  const rows = await BackupVerification.findAll({
    where,
    order: [['verifiedAt', 'DESC']],
    limit: Math.min(500, Math.max(1, Number(limit) || 100)),
  });
  return rows.map((row) => backupVerificationDto(row));
}

async function checkLatestBackup(options = {}) {
  const { BackupVerification } = dependencies(options.models || {});
  const now = options.now || new Date();
  const environment = String(options.environment || process.env.NODE_ENV || 'development').toLowerCase();
  const requestedMaxAge = Number(options.maxAgeHours ?? 26);
  const maxAgeHours = Number.isFinite(requestedMaxAge)
    ? Math.min(720, Math.max(1, requestedMaxAge))
    : 26;
  const [latestAttempt, latestVerified] = await Promise.all([
    BackupVerification.findOne({ where: { environment }, order: [['verifiedAt', 'DESC']] }),
    BackupVerification.findOne({ where: { environment, status: 'verified' }, order: [['backupCreatedAt', 'DESC']] }),
  ]);
  if (!latestAttempt) {
    return { ok: false, status: 'missing', environment, maxAgeHours, ageHours: null, latest: null };
  }
  const attempt = plain(latestAttempt);
  const verified = latestVerified ? plain(latestVerified) : null;
  if (attempt.status === 'failed' && (!verified || new Date(attempt.verifiedAt) >= new Date(verified.verifiedAt))) {
    return {
      ok: false,
      status: 'failed',
      environment,
      maxAgeHours,
      ageHours: verified ? Number(((now - new Date(verified.backupCreatedAt)) / 3600000).toFixed(2)) : null,
      latest: backupVerificationDto(attempt, { includeEvidence: false }),
    };
  }
  if (!verified) {
    return { ok: false, status: 'missing', environment, maxAgeHours, ageHours: null, latest: null };
  }
  const ageHours = Math.max(0, (now - new Date(verified.backupCreatedAt)) / 3600000);
  const integrityVerified = Boolean(verified.checksumVerified || verified.restoreTestedAt);
  const ok = ageHours <= maxAgeHours && integrityVerified;
  return {
    ok,
    status: !integrityVerified ? 'unverified' : ageHours > maxAgeHours ? 'stale' : 'verified',
    environment,
    maxAgeHours,
    ageHours: Number(ageHours.toFixed(2)),
    latest: backupVerificationDto(verified, { includeEvidence: false }),
  };
}

module.exports = {
  BackupVerificationError,
  backupVerificationDto,
  checkLatestBackup,
  listBackupVerifications,
  normalizeBackupVerification,
  recordBackupVerification,
  stableStringify,
};
