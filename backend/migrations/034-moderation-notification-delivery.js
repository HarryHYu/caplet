'use strict';

async function ensureColumn(queryInterface, columnName, definition) {
  const columns = await queryInterface.describeTable('comment_moderation_records');
  if (columns[columnName]) return;
  await queryInterface.addColumn('comment_moderation_records', columnName, definition);
}

async function ensureRetryIndex(queryInterface) {
  const indexes = await queryInterface.showIndex('comment_moderation_records');
  if (indexes.some((index) => index.name === 'comment_moderation_notification_retry_idx')) return;
  await queryInterface.addIndex(
    'comment_moderation_records',
    ['status', 'notificationStatus', 'notificationNextAttemptAt'],
    { name: 'comment_moderation_notification_retry_idx' },
  );
}

module.exports = {
  async up(queryInterface, Sequelize) {
    await ensureColumn(queryInterface, 'notificationStatus', {
      type: Sequelize.STRING(24),
      allowNull: false,
      defaultValue: 'pending',
    });
    await ensureColumn(queryInterface, 'notificationChannel', {
      type: Sequelize.STRING(24),
      allowNull: true,
    });
    await ensureColumn(queryInterface, 'notificationAttempts', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
    });
    await ensureColumn(queryInterface, 'notificationLastAttemptAt', {
      type: Sequelize.DATE,
      allowNull: true,
    });
    await ensureColumn(queryInterface, 'notificationNextAttemptAt', {
      type: Sequelize.DATE,
      allowNull: true,
    });
    await ensureColumn(queryInterface, 'notificationDeliveredAt', {
      type: Sequelize.DATE,
      allowNull: true,
    });
    await ensureColumn(queryInterface, 'notificationLastError', {
      type: Sequelize.TEXT,
      allowNull: true,
    });
    await ensureColumn(queryInterface, 'notificationProviderId', {
      type: Sequelize.STRING(255),
      allowNull: true,
    });
    await ensureRetryIndex(queryInterface);
  },

  async down(queryInterface) {
    await queryInterface.removeIndex(
      'comment_moderation_records',
      'comment_moderation_notification_retry_idx',
    );
    await queryInterface.removeColumn('comment_moderation_records', 'notificationProviderId');
    await queryInterface.removeColumn('comment_moderation_records', 'notificationLastError');
    await queryInterface.removeColumn('comment_moderation_records', 'notificationDeliveredAt');
    await queryInterface.removeColumn('comment_moderation_records', 'notificationNextAttemptAt');
    await queryInterface.removeColumn('comment_moderation_records', 'notificationLastAttemptAt');
    await queryInterface.removeColumn('comment_moderation_records', 'notificationAttempts');
    await queryInterface.removeColumn('comment_moderation_records', 'notificationChannel');
    await queryInterface.removeColumn('comment_moderation_records', 'notificationStatus');
  },
};
