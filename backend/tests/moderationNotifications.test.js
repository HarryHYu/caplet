jest.mock('../models', () => ({
  CommentModerationRecord: { findAll: jest.fn() },
}));

const { CommentModerationRecord } = require('../models');
const {
  deliveryConfiguration,
  notifyModerationQueue,
  retryPendingModerationNotifications,
} = require('../services/moderationNotifications');

const NOW = new Date('2026-07-13T12:00:00.000Z');

function moderationRecord(overrides = {}) {
  return {
    id: 'report-1',
    classroomId: 'class-1',
    reviewQueue: 'admin',
    priority: 'high',
    reason: 'bullying',
    status: 'pending',
    notificationStatus: 'pending',
    notificationAttempts: 0,
    createdAt: new Date('2026-07-13T11:00:00.000Z'),
    async update(values) {
      Object.assign(this, values);
      return this;
    },
    ...overrides,
  };
}

function successResponse(id = 'provider-1') {
  return {
    ok: true,
    status: 202,
    json: jest.fn().mockResolvedValue({ id }),
    headers: { get: jest.fn().mockReturnValue(null) },
  };
}

describe('durable moderation notifications', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('delivers a PII-free webhook with a retry-safe idempotency key', async () => {
    const record = moderationRecord();
    const fetchImpl = jest.fn().mockResolvedValue(successResponse());

    const result = await notifyModerationQueue({
      record,
      reportId: record.id,
      classroomId: record.classroomId,
      reviewQueue: record.reviewQueue,
      priority: record.priority,
      reason: record.reason,
      occurredAt: NOW,
    }, {
      env: { NODE_ENV: 'production', MODERATION_NOTIFICATION_WEBHOOK_URL: 'https://safety.example.test/caplet' },
      fetchImpl,
      now: NOW,
    });

    expect(result.status).toBe('delivered');
    expect(fetchImpl).toHaveBeenCalledWith(
      'https://safety.example.test/caplet',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ 'Idempotency-Key': 'caplet-moderation-report-1' }),
      }),
    );
    const payload = JSON.parse(fetchImpl.mock.calls[0][1].body);
    expect(payload).toEqual(expect.objectContaining({
      reportId: 'report-1',
      classroomId: 'class-1',
      priority: 'high',
      reason: 'bullying',
    }));
    expect(payload).not.toHaveProperty('content');
    expect(payload).not.toHaveProperty('reporter');
    expect(record).toEqual(expect.objectContaining({
      notificationStatus: 'delivered',
      notificationAttempts: 1,
      notificationChannel: 'webhook',
      notificationProviderId: 'provider-1',
    }));
  });

  test('persists a failed attempt and schedules exponential retry without failing the report flow', async () => {
    const record = moderationRecord();
    const fetchImpl = jest.fn().mockResolvedValue({ ok: false, status: 503 });

    const result = await notifyModerationQueue({
      record,
      reportId: record.id,
      classroomId: record.classroomId,
      reviewQueue: record.reviewQueue,
      priority: record.priority,
      reason: record.reason,
      occurredAt: NOW,
    }, {
      env: {
        NODE_ENV: 'production',
        MODERATION_NOTIFICATION_WEBHOOK_URL: 'https://safety.example.test/caplet',
        MODERATION_NOTIFICATION_RETRY_BASE_MS: '1000',
      },
      fetchImpl,
      now: NOW,
    });

    expect(result.status).toBe('failed');
    expect(record.notificationStatus).toBe('failed');
    expect(record.notificationAttempts).toBe(1);
    expect(record.notificationNextAttemptAt).toEqual(new Date('2026-07-13T12:00:01.000Z'));
    expect(record.notificationLastError).toBe('Moderation webhook returned HTTP 503');
  });

  test('retries due persisted failures and leaves future attempts untouched', async () => {
    const due = moderationRecord({
      id: 'report-due',
      notificationStatus: 'failed',
      notificationAttempts: 1,
      notificationNextAttemptAt: new Date('2026-07-13T11:59:00.000Z'),
    });
    const future = moderationRecord({
      id: 'report-future',
      notificationStatus: 'failed',
      notificationAttempts: 1,
      notificationNextAttemptAt: new Date('2026-07-13T12:10:00.000Z'),
    });
    CommentModerationRecord.findAll.mockResolvedValue([due, future]);
    const fetchImpl = jest.fn().mockResolvedValue(successResponse('provider-retry'));

    const result = await retryPendingModerationNotifications({
      env: { NODE_ENV: 'production', MODERATION_NOTIFICATION_WEBHOOK_URL: 'https://safety.example.test/caplet' },
      fetchImpl,
      now: NOW,
    });

    expect(result).toEqual(expect.objectContaining({ attempted: 1, delivered: 1, failed: 0 }));
    expect(due.notificationStatus).toBe('delivered');
    expect(due.notificationAttempts).toBe(2);
    expect(future.notificationStatus).toBe('failed');
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  test('keeps an auditable pending record when no provider is configured', async () => {
    const record = moderationRecord();
    const result = await notifyModerationQueue({ record, reportId: record.id }, { env: { NODE_ENV: 'test' } });

    expect(result).toEqual({ configured: false, status: 'pending' });
    expect(record.notificationAttempts).toBe(0);
    expect(deliveryConfiguration({
      RESEND_API_KEY: 'key',
      MODERATION_NOTIFICATION_EMAIL: 'safety@example.test',
      MODERATION_NOTIFICATION_FROM_EMAIL: 'Caplet <safety@caplet.org>',
    })).toEqual(expect.objectContaining({ channel: 'email' }));
  });
});
