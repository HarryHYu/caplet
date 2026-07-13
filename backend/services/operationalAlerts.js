const { Op } = require('sequelize');

const DEFAULT_RETRY_BASE_MS = 60 * 1000;
const MAX_RETRY_MS = 60 * 60 * 1000;
const DELIVERY_TIMEOUT_MS = 10 * 1000;
const STALE_DELIVERY_MS = 10 * 60 * 1000;
const ALLOWED_SOURCES = new Set(['readiness', 'backup', 'moderation']);
const ALLOWED_SEVERITIES = new Set(['warning', 'high', 'critical']);
const SAFE_METADATA_KEYS = new Set([
  'databaseStatus',
  'migrationStatus',
  'backupStatus',
  'ageHours',
  'maxAgeHours',
  'reviewQueue',
  'priority',
]);

function positiveNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function dependencies(overrides = {}) {
  return {
    OperationalAlert: overrides.OperationalAlert || require('../models/OperationalAlert'),
    CommentModerationRecord: overrides.CommentModerationRecord
      || require('../models/CommentModerationRecord'),
  };
}

function boundedText(value, field, maximum, required = false) {
  const text = String(value || '').replace(/[\r\n]+/g, ' ').trim();
  if (required && !text) throw new Error(`${field} is required`);
  return text.slice(0, maximum) || null;
}

function safeError(error) {
  const message = error instanceof Error ? error.message : String(error || 'Alert delivery failed');
  return message
    .replace(/https?:\/\/\S+/gi, '[url]')
    .replace(/(authorization|token|api[-_ ]?key|secret)\s*[:=]\s*\S+/gi, '$1=[redacted]')
    .replace(/[\r\n]+/g, ' ')
    .slice(0, 500);
}

function safeMetadata(input = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return {};
  const result = {};
  for (const [key, value] of Object.entries(input).slice(0, 20)) {
    if (!SAFE_METADATA_KEYS.has(key)) continue;
    if (typeof value === 'boolean' || value === null) result[key] = value;
    if (typeof value === 'number' && Number.isFinite(value)) result[key] = value;
    if (typeof value === 'string') result[key] = boundedText(value, key, 120);
  }
  return result;
}

function normalizeAlert(input = {}, now = new Date()) {
  const source = boundedText(input.source, 'source', 24, true)?.toLowerCase();
  if (!ALLOWED_SOURCES.has(source)) throw new Error('Unsupported operational alert source');
  const severity = boundedText(input.severity, 'severity', 24, true)?.toLowerCase();
  if (!ALLOWED_SEVERITIES.has(severity)) throw new Error('Unsupported operational alert severity');
  const environment = boundedText(
    input.environment || process.env.NODE_ENV || 'development',
    'environment',
    50,
    true,
  )?.toLowerCase();
  if (!/^[a-z0-9._-]+$/.test(environment)) throw new Error('Unsupported environment');
  const fingerprint = boundedText(input.fingerprint, 'fingerprint', 160, true)?.toLowerCase();
  if (!/^[a-z0-9:._-]+$/.test(fingerprint)) throw new Error('Unsupported alert fingerprint');
  const detectedAt = input.detectedAt ? new Date(input.detectedAt) : new Date(now);
  if (Number.isNaN(detectedAt.getTime())) throw new Error('detectedAt must be a valid date');
  return {
    fingerprint,
    source,
    environment,
    severity,
    summary: boundedText(input.summary, 'summary', 240, true),
    metadata: safeMetadata(input.metadata),
    detectedAt,
  };
}

function alertDeliveryConfiguration(env = process.env) {
  const webhookUrl = String(env.OPS_ALERT_WEBHOOK_URL || '').trim();
  return webhookUrl ? { channel: 'webhook', webhookUrl } : null;
}

function timeoutSignal(timeoutMs) {
  if (typeof AbortSignal === 'undefined' || typeof AbortSignal.timeout !== 'function') return undefined;
  return AbortSignal.timeout(timeoutMs);
}

async function responseProviderId(response) {
  const data = await response.json().catch(() => ({}));
  return boundedText(data.id || response.headers?.get?.('x-request-id'), 'providerMessageId', 255);
}

function alertPayload(alert) {
  const row = typeof alert?.get === 'function' ? alert.get({ plain: true }) : alert;
  return Object.freeze({
    event: 'caplet.operational_alert',
    alertId: row.id || null,
    fingerprint: row.fingerprint,
    source: row.source,
    environment: row.environment,
    severity: row.severity,
    summary: row.summary,
    firstDetectedAt: new Date(row.firstDetectedAt || row.detectedAt || Date.now()).toISOString(),
    lastDetectedAt: new Date(row.lastDetectedAt || row.detectedAt || Date.now()).toISOString(),
    occurrenceCount: Number(row.occurrenceCount || 1),
  });
}

async function sendOperationalAlert(alert, config, options = {}) {
  const fetchImpl = options.fetchImpl || globalThis.fetch;
  if (typeof fetchImpl !== 'function') throw new Error('Operational alert delivery is unavailable');
  const parsed = new URL(config.webhookUrl);
  if ((options.env || process.env).NODE_ENV === 'production' && parsed.protocol !== 'https:') {
    throw new Error('Production operational alert webhooks must use HTTPS');
  }
  const signal = timeoutSignal(positiveNumber(options.timeoutMs, DELIVERY_TIMEOUT_MS));
  const response = await fetchImpl(parsed.toString(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Idempotency-Key': `caplet-ops-${alert.fingerprint}`,
    },
    body: JSON.stringify(alertPayload(alert)),
    ...(signal ? { signal } : {}),
  });
  if (!response.ok) throw new Error(`Operational alert webhook returned HTTP ${response.status}`);
  return { channel: 'webhook', providerMessageId: await responseProviderId(response) };
}

async function deliverOperationalAlert(record, options = {}) {
  const env = options.env || process.env;
  const config = options.config || alertDeliveryConfiguration(env);
  if (!record || typeof record.update !== 'function') {
    throw new Error('A persisted operational alert is required for durable delivery');
  }
  if (!config) {
    if (record.deliveryStatus !== 'unconfigured') await record.update({ deliveryStatus: 'unconfigured' });
    return { configured: false, status: 'unconfigured' };
  }
  if (record.deliveryStatus === 'delivered') {
    return { configured: true, status: 'delivered', skipped: true };
  }

  const now = options.now ? new Date(options.now) : new Date();
  const attempts = Number(record.deliveryAttempts || 0) + 1;
  await record.update({
    deliveryStatus: 'delivering',
    deliveryChannel: config.channel,
    deliveryAttempts: attempts,
    deliveryLastAttemptAt: now,
    deliveryNextAttemptAt: null,
    deliveryLastError: null,
  });

  try {
    const result = await sendOperationalAlert(record, config, { ...options, env });
    await record.update({
      deliveryStatus: 'delivered',
      deliveryChannel: result.channel,
      deliveredAt: now,
      deliveryNextAttemptAt: null,
      deliveryLastError: null,
      deliveryProviderId: result.providerMessageId,
    });
    return { configured: true, status: 'delivered', attempts, ...result };
  } catch (error) {
    const retryBaseMs = positiveNumber(env.OPS_ALERT_RETRY_BASE_MS, DEFAULT_RETRY_BASE_MS);
    const retryDelay = Math.min(MAX_RETRY_MS, retryBaseMs * (2 ** Math.max(0, attempts - 1)));
    const nextAttemptAt = new Date(now.getTime() + retryDelay);
    const lastError = safeError(error);
    await record.update({
      deliveryStatus: 'failed',
      deliveryChannel: config.channel,
      deliveryNextAttemptAt: nextAttemptAt,
      deliveryLastError: lastError,
    });
    return { configured: true, status: 'failed', attempts, nextAttemptAt, error: lastError };
  }
}

async function findOrCreateAlert(values, model) {
  let record = await model.findOne({ where: { fingerprint: values.fingerprint } });
  if (record) return { record, created: false };
  try {
    const { detectedAt, ...storedValues } = values;
    record = await model.create({
      ...storedValues,
      status: 'open',
      firstDetectedAt: detectedAt,
      lastDetectedAt: detectedAt,
      occurrenceCount: 1,
      deliveryStatus: 'pending',
    });
    return { record, created: true };
  } catch (error) {
    if (error.name !== 'SequelizeUniqueConstraintError') throw error;
    record = await model.findOne({ where: { fingerprint: values.fingerprint } });
    if (!record) throw error;
    return { record, created: false };
  }
}

async function openOperationalAlert(input, options = {}) {
  const { OperationalAlert } = dependencies(options.models || {});
  const values = normalizeAlert(input, options.now || new Date());
  const result = await findOrCreateAlert(values, OperationalAlert);
  const wasResolved = !result.created && result.record.status === 'resolved';
  if (!result.created) {
    await result.record.update({
      source: values.source,
      environment: values.environment,
      severity: values.severity,
      summary: values.summary,
      metadata: values.metadata,
      status: 'open',
      lastDetectedAt: values.detectedAt,
      occurrenceCount: Number(result.record.occurrenceCount || 0) + 1,
      resolvedAt: null,
      ...(wasResolved ? {
        firstDetectedAt: values.detectedAt,
        deliveryStatus: 'pending',
        deliveryAttempts: 0,
        deliveryLastAttemptAt: null,
        deliveryNextAttemptAt: null,
        deliveredAt: null,
        deliveryLastError: null,
        deliveryProviderId: null,
      } : {}),
    });
  }
  const delivery = options.deliver === false
    ? null
    : await deliverOperationalAlert(result.record, options);
  return { alert: operationalAlertDto(result.record), created: result.created, delivery };
}

async function resolveOperationalAlert(fingerprint, options = {}) {
  const { OperationalAlert } = dependencies(options.models || {});
  const record = await OperationalAlert.findOne({ where: { fingerprint } });
  if (!record || record.status === 'resolved') return { resolved: false, alert: record ? operationalAlertDto(record) : null };
  const resolvedAt = options.now ? new Date(options.now) : new Date();
  await record.update({ status: 'resolved', resolvedAt });
  return { resolved: true, alert: operationalAlertDto(record) };
}

function isDeliveryDue(record, now) {
  if (record.deliveryStatus === 'delivered') return false;
  if (record.deliveryStatus === 'delivering') {
    const lastAttempt = new Date(record.deliveryLastAttemptAt || 0).getTime();
    return !Number.isFinite(lastAttempt) || lastAttempt <= now.getTime() - STALE_DELIVERY_MS;
  }
  const nextAttempt = record.deliveryNextAttemptAt
    ? new Date(record.deliveryNextAttemptAt).getTime()
    : 0;
  return !nextAttempt || nextAttempt <= now.getTime();
}

async function retryPendingOperationalAlerts(options = {}) {
  const env = options.env || process.env;
  const config = options.config || alertDeliveryConfiguration(env);
  if (!config) return { configured: false, examined: 0, attempted: 0, delivered: 0, failed: 0 };
  const { OperationalAlert } = dependencies(options.models || {});
  const now = options.now ? new Date(options.now) : new Date();
  const records = await OperationalAlert.findAll({
    where: {
      status: 'open',
      deliveryStatus: { [Op.in]: ['pending', 'failed', 'delivering', 'unconfigured'] },
    },
    order: [['deliveryNextAttemptAt', 'ASC'], ['firstDetectedAt', 'ASC']],
    limit: Math.max(1, Math.min(100, Number(options.limit) || 25)),
  });
  let attempted = 0;
  let delivered = 0;
  let failed = 0;
  for (const record of records) {
    if (!isDeliveryDue(record, now)) continue;
    attempted += 1;
    const result = await deliverOperationalAlert(record, { ...options, env, config, now });
    if (result.status === 'delivered') delivered += 1;
    if (result.status === 'failed') failed += 1;
  }
  return { configured: true, examined: records.length, attempted, delivered, failed };
}

async function reconcileOperationalHealth(health, options = {}) {
  const environment = String(options.environment || process.env.NODE_ENV || 'development').toLowerCase();
  const readinessFingerprint = `readiness:${environment}`;
  const backupFingerprint = `backup:${environment}`;
  const outcomes = {};

  if (!health?.checks?.database?.ok || !health?.checks?.migrations?.ok) {
    outcomes.readiness = await openOperationalAlert({
      fingerprint: readinessFingerprint,
      source: 'readiness',
      environment,
      severity: 'critical',
      summary: 'Application readiness checks are failing',
      metadata: {
        databaseStatus: health?.checks?.database?.status || 'unknown',
        migrationStatus: health?.checks?.migrations?.status || 'unknown',
      },
      detectedAt: health?.checkedAt,
    }, options);
  } else {
    outcomes.readiness = await resolveOperationalAlert(readinessFingerprint, options);
  }

  if (!health?.checks?.backups?.ok) {
    outcomes.backup = await openOperationalAlert({
      fingerprint: backupFingerprint,
      source: 'backup',
      environment,
      severity: health?.checks?.backups?.status === 'failed' ? 'critical' : 'high',
      summary: 'Backup verification needs attention',
      metadata: {
        backupStatus: health?.checks?.backups?.status || 'unknown',
        ageHours: health?.checks?.backups?.ageHours ?? null,
        maxAgeHours: health?.checks?.backups?.maxAgeHours ?? null,
      },
      detectedAt: health?.checkedAt,
    }, options);
  } else {
    outcomes.backup = await resolveOperationalAlert(backupFingerprint, options);
  }
  return outcomes;
}

async function runOperationalMonitor(options = {}) {
  const getHealth = options.getHealth || require('./operationalReadiness').getOperationalHealth;
  const health = await getHealth(options.healthOptions || {});
  const alerts = await reconcileOperationalHealth(health, options);
  const retries = await retryPendingOperationalAlerts(options);
  return { health, alerts, retries };
}

function operationalAlertDto(record) {
  const row = typeof record?.get === 'function' ? record.get({ plain: true }) : record;
  if (!row) return null;
  return {
    id: row.id,
    fingerprint: row.fingerprint,
    source: row.source,
    environment: row.environment,
    severity: row.severity,
    summary: row.summary,
    status: row.status,
    firstDetectedAt: row.firstDetectedAt,
    lastDetectedAt: row.lastDetectedAt,
    occurrenceCount: Number(row.occurrenceCount || 0),
    resolvedAt: row.resolvedAt,
    metadata: safeMetadata(row.metadata),
    delivery: {
      status: row.deliveryStatus,
      channel: row.deliveryChannel,
      attempts: Number(row.deliveryAttempts || 0),
      lastAttemptAt: row.deliveryLastAttemptAt,
      nextAttemptAt: row.deliveryNextAttemptAt,
      deliveredAt: row.deliveredAt,
      lastError: row.deliveryLastError ? safeError(row.deliveryLastError) : null,
    },
  };
}

async function getOperationalAlertSummary(options = {}) {
  const env = options.env || process.env;
  const { OperationalAlert, CommentModerationRecord } = dependencies(options.models || {});
  const [alerts, openCount, failedDeliveryCount, moderationPending, moderationDeliveryFailed] = await Promise.all([
    OperationalAlert.findAll({
      order: [['status', 'ASC'], ['lastDetectedAt', 'DESC']],
      limit: Math.max(1, Math.min(100, Number(options.limit) || 25)),
    }),
    OperationalAlert.count({ where: { status: 'open' } }),
    OperationalAlert.count({ where: { status: 'open', deliveryStatus: 'failed' } }),
    CommentModerationRecord.count({ where: { status: 'pending' } }),
    CommentModerationRecord.count({ where: { status: 'pending', notificationStatus: 'failed' } }),
  ]);
  const moderationConfig = require('./moderationNotifications').deliveryConfiguration(env);
  return {
    counts: { open: openCount, failedDelivery: failedDeliveryCount },
    alerts: alerts.map(operationalAlertDto),
    delivery: {
      configured: Boolean(alertDeliveryConfiguration(env)),
      channel: alertDeliveryConfiguration(env)?.channel || null,
    },
    moderation: {
      pendingReports: moderationPending,
      failedDelivery: moderationDeliveryFailed,
      deliveryConfigured: Boolean(moderationConfig),
      channel: moderationConfig?.channel || null,
    },
  };
}

module.exports = {
  alertDeliveryConfiguration,
  alertPayload,
  deliverOperationalAlert,
  getOperationalAlertSummary,
  normalizeAlert,
  openOperationalAlert,
  operationalAlertDto,
  reconcileOperationalHealth,
  resolveOperationalAlert,
  retryPendingOperationalAlerts,
  runOperationalMonitor,
  safeError,
  sendOperationalAlert,
};
