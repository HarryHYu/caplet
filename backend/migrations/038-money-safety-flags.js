'use strict';

const crypto = require('crypto');

const FLAGS = [
  {
    key: 'money.private.persistence',
    description: 'Private Money profile and saved scenario persistence',
    config: { owner: 'trust', risk: 'student-finance-privacy', requiresGuardianReview: true },
  },
  {
    key: 'money.financial_twin.enabled',
    description: 'Financial Twin simulation and connection surfaces',
    config: { owner: 'trust', risk: 'external-data-and-personalised-projection', requiresConsentReview: true },
  },
];

module.exports = {
  async up(queryInterface) {
    const now = new Date();
    for (const definition of FLAGS) {
      const [rows] = await queryInterface.sequelize.query(
        'SELECT id FROM feature_flags WHERE key = :key',
        { replacements: { key: definition.key } },
      );
      if (rows.length) continue;
      const id = crypto.randomUUID();
      await queryInterface.bulkInsert('feature_flags', [{
        id,
        key: definition.key,
        description: definition.description,
        enabled: false,
        isPublic: true,
        rolloutPercentage: 0,
        publicValue: JSON.stringify({ enabled: false, reason: 'trust_review_required' }),
        internalConfig: JSON.stringify(definition.config),
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
        flagKey: definition.key,
        action: 'seeded',
        actorUserId: null,
        previousValue: null,
        nextValue: JSON.stringify({ key: definition.key, enabled: false, rolloutPercentage: 0, version: 1 }),
        requestId: null,
        createdAt: now,
      }]);
    }
  },

  async down(queryInterface) {
    for (const definition of FLAGS) {
      await queryInterface.bulkDelete('feature_flag_audits', { flagKey: definition.key, action: 'seeded' });
      await queryInterface.bulkDelete('feature_flags', { key: definition.key, description: definition.description });
    }
  },
};
