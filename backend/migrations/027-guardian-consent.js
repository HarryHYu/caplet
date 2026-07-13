'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('guardian_consent_requests', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      userId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onDelete: 'CASCADE',
      },
      guardianEmail: { type: Sequelize.STRING, allowNull: false },
      tokenHash: { type: Sequelize.STRING, allowNull: false, unique: true },
      status: { type: Sequelize.STRING, allowNull: false, defaultValue: 'pending' },
      policyVersion: { type: Sequelize.STRING, allowNull: false },
      expiresAt: { type: Sequelize.DATE, allowNull: false },
      actedAt: { type: Sequelize.DATE, allowNull: true },
      guardianName: { type: Sequelize.STRING, allowNull: true },
      metadata: { type: Sequelize.JSON, allowNull: false, defaultValue: {} },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });
    await queryInterface.addIndex('guardian_consent_requests', ['userId', 'createdAt'], {
      name: 'guardian_consent_requests_user_created',
    });
    await queryInterface.addIndex('guardian_consent_requests', ['status', 'expiresAt'], {
      name: 'guardian_consent_requests_status_expiry',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('guardian_consent_requests');
  },
};
