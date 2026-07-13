const crypto = require('crypto');

async function recordProductEvent(input = {}) {
  try {
    const { ProductEvent, User } = require('../models');
    if (input.userId) {
      const user = await User.findByPk(input.userId, { attributes: ['id', 'dateOfBirth'] });
      const { canUseLearningAnalytics } = require('./privacyConsent');
      if (!user || !(await canUseLearningAnalytics(user))) return null;
    } else if (input.analyticsConsent !== true) {
      return null;
    }
    const idempotencyKey = String(input.idempotencyKey || crypto.randomUUID()).slice(0, 255);
    const [event] = await ProductEvent.findOrCreate({
      where: { idempotencyKey },
      defaults: {
        idempotencyKey,
        type: String(input.type || 'unknown').slice(0, 100),
        userId: input.userId || null,
        anonymousId: input.anonymousId || null,
        sessionId: input.sessionId || null,
        practiceSessionId: input.practiceSessionId || null,
        classroomId: input.classroomId || null,
        outcomeId: input.outcomeId || null,
        feature: input.feature ? String(input.feature).slice(0, 100) : null,
        entityType: input.entityType ? String(input.entityType).slice(0, 100) : null,
        entityId: input.entityId ? String(input.entityId).slice(0, 255) : null,
        schemaVersion: Math.max(1, Number(input.schemaVersion || 1)),
        metadata: input.metadata || {},
        occurredAt: input.occurredAt || new Date(),
        receivedAt: new Date(),
      },
    });
    return event;
  } catch (error) {
    if (process.env.NODE_ENV !== 'test') console.error('Product event persistence failed:', error.message);
    return null;
  }
}

module.exports = { recordProductEvent };
