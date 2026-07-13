'use strict';

const crypto = require('crypto');

const KEY = 'money.mode.pilot';
const DESCRIPTION = 'Two-slice Money pilot shell (first job and inflation)';

module.exports = {
  async up(queryInterface) {
    const [rows] = await queryInterface.sequelize.query(
      'SELECT id FROM feature_flags WHERE key = :key',
      { replacements: { key: KEY } },
    );
    if (rows.length) return;
    const id = crypto.randomUUID();
    const now = new Date();
    await queryInterface.bulkInsert('feature_flags', [{
      id,
      key: KEY,
      description: DESCRIPTION,
      enabled: false,
      isPublic: true,
      rolloutPercentage: 0,
      publicValue: JSON.stringify({ navigationEnabled: true, contentVersion: 'money-pilot-v1' }),
      internalConfig: JSON.stringify({ owner: 'product', risk: 'student-finance-privacy', requiresSourceReview: true }),
      version: 1,
      archivedAt: null,
      createdBy: null,
      updatedBy: null,
      createdAt: now,
      updatedAt: now,
    }]);
    await queryInterface.bulkInsert('feature_flag_audits', [{
      id: crypto.randomUUID(),
      flagId: id,
      flagKey: KEY,
      action: 'seeded',
      actorUserId: null,
      previousValue: null,
      nextValue: JSON.stringify({ key: KEY, enabled: false, rolloutPercentage: 0, version: 1 }),
      requestId: null,
      createdAt: now,
    }]);
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('feature_flag_audits', { flagKey: KEY, action: 'seeded' });
    await queryInterface.bulkDelete('feature_flags', { key: KEY, description: DESCRIPTION });
  },
};
