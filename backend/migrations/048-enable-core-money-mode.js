'use strict';

const KEY = 'money.mode.pilot';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.bulkUpdate('feature_flags', {
      enabled: true,
      rolloutPercentage: 100,
      publicValue: JSON.stringify({
        navigationEnabled: true,
        contentVersion: 'money-core-v1',
        scope: 'public-learning-and-calculators',
      }),
      version: Sequelize.literal('"version" + 1'),
      updatedAt: Sequelize.literal('CURRENT_TIMESTAMP'),
    }, { key: KEY, archivedAt: null });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkUpdate('feature_flags', {
      enabled: false,
      rolloutPercentage: 0,
      publicValue: JSON.stringify({
        navigationEnabled: true,
        contentVersion: 'money-pilot-v1',
      }),
      version: Sequelize.literal('"version" + 1'),
      updatedAt: Sequelize.literal('CURRENT_TIMESTAMP'),
    }, { key: KEY, archivedAt: null });
  },
};
