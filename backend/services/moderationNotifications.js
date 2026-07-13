const { Op } = require('sequelize');
const { CommentModerationRecord } = require('../models');

const DEFAULT_RETRY_BASE_MS = 60 * 1000;
const MAX_RETRY_MS = 60 * 60 * 1000;
const DELIVERY_TIMEOUT_MS = 10 * 1000;
const STALE_DELIVERY_MS = 10 * 60 * 1000;

function positiveNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function moderationNotification(input = {}) {
  return Object.freeze({
    type: 'comment_report_created',
    reportId: input.reportId || null,
    classroomId: input.classroomId || null,
    reviewQueue: input.reviewQueue || 'class_owner',
    priority: input.priority || 'standard',
    reason: input.reason || 'other',
    occurredAt: input.occurredAt
      ? new Date(input.occurredAt).toISOString()
      : new Date().toISOString(),
  });
}

function deliveryConfiguration(env = process.env) {
  const webhookUrl = String(env.MODERATION_NOTIFICATION_WEBHOOK_URL || '').trim();
  if (webhookUrl) return { channel: 'webhook', webhookUrl };

  const to = String(env.MODERATION_NOTIFICATION_EMAIL || '').trim();
  const from = String(env.MODERATION_NOTIFICATION_FROM_EMAIL || '').trim();
  const apiKey = String(env.RESEND_API_KEY || '').trim();
  if (to && from && apiKey) return { channel: 'email', to, from, apiKey };
  return null;
}

function timeoutSignal(timeoutMs) {
  if (typeof AbortSignal === 'undefined' || typeof AbortSignal.timeout !== 'function') return undefined;
  return AbortSignal.timeout(timeoutMs);
}

function safeError(error) {
  const message = error instanceof Error ? error.message : String(error || 'Notification delivery failed');
  return message.replace(/[\r\n]+/g, ' ').slice(0, 500);
}

async function providerId(response) {
  const data = typeof response.json === 'function'
    ? await response.json().catch(() => ({}))
    : {};
  return data.id || response.headers?.get?.('x-request-id') || null;
}

async function sendNotification(notification, config, options = {}) {
  const fetchImpl = options.fetchImpl || globalThis.fetch;
  if (typeof fetchImpl !== 'function') throw new Error('Notification delivery is unavailable');
  const signal = timeoutSignal(positiveNumber(options.timeoutMs, DELIVERY_TIMEOUT_MS));
  const idempotencyKey = `caplet-moderation-${notification.reportId}`;

  let url;
  let request;
  if (config.channel === 'webhook') {
    const parsed = new URL(config.webhookUrl);
    if ((options.env || process.env).NODE_ENV === 'production' && parsed.protocol !== 'https:') {
      throw new Error('Production moderation webhooks must use HTTPS');
    }
    url = parsed.toString();
    request = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify(notification),
      ...(signal ? { signal } : {}),
    };
  } else {
    url = 'https://api.resend.com/emails';
    const operationsUrl = `${String((options.env || process.env).FRONTEND_URL || 'https://caplet.org').replace(/\/$/, '')}/operations`;
    request = {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify({
        from: config.from,
        to: [config.to],
        subject: `${notification.priority === 'high' ? 'Urgent: ' : ''}Caplet moderation report awaiting review`,
        text: `A ${notification.priority} priority ${notification.reason} report is waiting in the ${notification.reviewQueue} queue. Report ${notification.reportId}; classroom ${notification.classroomId}. Review it at ${operationsUrl}. No learner identity or comment text is included in this email.`,
      }),
      ...(signal ? { signal } : {}),
    };
  }

  const response = await fetchImpl(url, request);
  if (!response.ok) throw new Error(`Moderation ${config.channel} returned HTTP ${response.status}`);
  return { channel: config.channel, providerMessageId: await providerId(response) };
}

async function deliverModerationNotification(record, notification, options = {}) {
  const env = options.env || process.env;
  const config = options.config || deliveryConfiguration(env);
  if (!config) return { configured: false, status: record?.notificationStatus || 'pending' };
  if (!record || typeof record.update !== 'function') {
    throw new Error('A persisted moderation record is required for notification delivery');
  }
  if (record.notificationStatus === 'delivered') {
    return { configured: true, status: 'delivered', skipped: true };
  }

  const now = options.now ? new Date(options.now) : new Date();
  const attempts = Number(record.notificationAttempts || 0) + 1;
  await record.update({
    notificationStatus: 'delivering',
    notificationChannel: config.channel,
    notificationAttempts: attempts,
    notificationLastAttemptAt: now,
    notificationNextAttemptAt: null,
    notificationLastError: null,
  });

  try {
    const result = await sendNotification(notification, config, { ...options, env });
    await record.update({
      notificationStatus: 'delivered',
      notificationChannel: result.channel,
      notificationDeliveredAt: now,
      notificationNextAttemptAt: null,
      notificationLastError: null,
      notificationProviderId: result.providerMessageId,
    });
    return { configured: true, status: 'delivered', attempts, ...result };
  } catch (error) {
    const retryBaseMs = positiveNumber(env.MODERATION_NOTIFICATION_RETRY_BASE_MS, DEFAULT_RETRY_BASE_MS);
    const retryDelay = Math.min(MAX_RETRY_MS, retryBaseMs * (2 ** Math.max(0, attempts - 1)));
    const nextAttemptAt = new Date(now.getTime() + retryDelay);
    const lastError = safeError(error);
    await record.update({
      notificationStatus: 'failed',
      notificationChannel: config.channel,
      notificationAttempts: attempts,
      notificationLastAttemptAt: now,
      notificationNextAttemptAt: nextAttemptAt,
      notificationLastError: lastError,
    });
    return { configured: true, status: 'failed', attempts, nextAttemptAt, error: lastError };
  }
}

async function notifyModerationQueue(input = {}, options = {}) {
  const notification = moderationNotification(input);
  // This remains as a local observability hook; durable state on the moderation
  // record and the retry worker are the delivery source of truth.
  process.emit('caplet:moderation-report', notification);
  return deliverModerationNotification(input.record, notification, options);
}

function isDue(record, now) {
  if (record.notificationStatus === 'delivered') return false;
  if (record.notificationStatus === 'delivering') {
    const lastAttempt = new Date(record.notificationLastAttemptAt || 0).getTime();
    return !Number.isFinite(lastAttempt) || lastAttempt <= now.getTime() - STALE_DELIVERY_MS;
  }
  const nextAttempt = record.notificationNextAttemptAt
    ? new Date(record.notificationNextAttemptAt).getTime()
    : 0;
  return !nextAttempt || nextAttempt <= now.getTime();
}

async function retryPendingModerationNotifications(options = {}) {
  const env = options.env || process.env;
  const config = options.config || deliveryConfiguration(env);
  if (!config) return { configured: false, examined: 0, attempted: 0, delivered: 0, failed: 0 };
  const model = options.model || CommentModerationRecord;
  const now = options.now ? new Date(options.now) : new Date();
  const records = await model.findAll({
    where: {
      status: 'pending',
      notificationStatus: { [Op.in]: ['pending', 'failed', 'delivering'] },
    },
    order: [['notificationNextAttemptAt', 'ASC'], ['createdAt', 'ASC']],
    limit: Math.max(1, Math.min(100, Number(options.limit) || 25)),
  });

  let attempted = 0;
  let delivered = 0;
  let failed = 0;
  for (const record of records) {
    if (!isDue(record, now)) continue;
    attempted += 1;
    const result = await deliverModerationNotification(
      record,
      moderationNotification({
        reportId: record.id,
        classroomId: record.classroomId,
        reviewQueue: record.reviewQueue,
        priority: record.priority,
        reason: record.reason,
        occurredAt: record.createdAt,
      }),
      { ...options, env, config, now },
    );
    if (result.status === 'delivered') delivered += 1;
    if (result.status === 'failed') failed += 1;
  }
  return { configured: true, examined: records.length, attempted, delivered, failed };
}

module.exports = {
  deliverModerationNotification,
  deliveryConfiguration,
  moderationNotification,
  notifyModerationQueue,
  retryPendingModerationNotifications,
};
