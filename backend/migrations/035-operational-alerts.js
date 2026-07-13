'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('operational_alerts', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      fingerprint: { type: Sequelize.STRING(160), allowNull: false },
      source: { type: Sequelize.STRING(24), allowNull: false },
      environment: { type: Sequelize.STRING(50), allowNull: false },
      severity: { type: Sequelize.STRING(24), allowNull: false },
      summary: { type: Sequelize.STRING(240), allowNull: false },
      status: { type: Sequelize.STRING(24), allowNull: false, defaultValue: 'open' },
      firstDetectedAt: { type: Sequelize.DATE, allowNull: false },
      lastDetectedAt: { type: Sequelize.DATE, allowNull: false },
      occurrenceCount: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 1 },
      resolvedAt: { type: Sequelize.DATE, allowNull: true },
      metadata: { type: Sequelize.JSONB, allowNull: false, defaultValue: {} },
      deliveryStatus: { type: Sequelize.STRING(24), allowNull: false, defaultValue: 'pending' },
      deliveryChannel: { type: Sequelize.STRING(24), allowNull: true },
      deliveryAttempts: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      deliveryLastAttemptAt: { type: Sequelize.DATE, allowNull: true },
      deliveryNextAttemptAt: { type: Sequelize.DATE, allowNull: true },
      deliveredAt: { type: Sequelize.DATE, allowNull: true },
      deliveryLastError: { type: Sequelize.TEXT, allowNull: true },
      deliveryProviderId: { type: Sequelize.STRING(255), allowNull: true },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });
    await queryInterface.addIndex('operational_alerts', ['fingerprint'], {
      name: 'operational_alerts_fingerprint_unique',
      unique: true,
    });
    await queryInterface.addIndex('operational_alerts', ['status', 'lastDetectedAt'], {
      name: 'operational_alerts_status_detected_idx',
    });
    await queryInterface.addIndex(
      'operational_alerts',
      ['status', 'deliveryStatus', 'deliveryNextAttemptAt'],
      { name: 'operational_alerts_delivery_retry_idx' },
    );
  },

  async down(queryInterface) {
    await queryInterface.dropTable('operational_alerts');
  },
};
