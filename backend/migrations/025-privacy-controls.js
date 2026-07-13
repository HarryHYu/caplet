'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('user_privacy_preferences', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      userId: { type: Sequelize.UUID, allowNull: false, unique: true, references: { model: 'users', key: 'id' }, onDelete: 'CASCADE' },
      aiHistoryEnabled: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      aiRetentionDays: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 90 },
      analyticsEnabled: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      ageNoticeAcknowledgedAt: { type: Sequelize.DATE, allowNull: true },
      parentConsentStatus: { type: Sequelize.STRING, allowNull: false, defaultValue: 'not_required' },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });
    await queryInterface.createTable('consent_records', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      userId: { type: Sequelize.UUID, allowNull: false, references: { model: 'users', key: 'id' }, onDelete: 'CASCADE' },
      type: { type: Sequelize.STRING, allowNull: false },
      status: { type: Sequelize.STRING, allowNull: false },
      policyVersion: { type: Sequelize.STRING, allowNull: false },
      grantedAt: { type: Sequelize.DATE, allowNull: true },
      withdrawnAt: { type: Sequelize.DATE, allowNull: true },
      metadata: { type: Sequelize.JSON, allowNull: false, defaultValue: {} },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });
    await queryInterface.addIndex('consent_records', ['userId', 'type', 'createdAt'], { name: 'consent_records_user_type_created' });
    await queryInterface.createTable('ai_interactions', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      userId: { type: Sequelize.UUID, allowNull: true, references: { model: 'users', key: 'id' }, onDelete: 'CASCADE' },
      workspaceId: { type: Sequelize.UUID, allowNull: true, references: { model: 'editor_workspaces', key: 'id' }, onDelete: 'CASCADE' },
      feature: { type: Sequelize.STRING, allowNull: false },
      modelVersion: { type: Sequelize.STRING, allowNull: true },
      promptVersion: { type: Sequelize.STRING, allowNull: true },
      status: { type: Sequelize.STRING, allowNull: false },
      confidence: { type: Sequelize.STRING, allowNull: true },
      inputSummary: { type: Sequelize.TEXT, allowNull: true },
      outputSummary: { type: Sequelize.TEXT, allowNull: true },
      metadata: { type: Sequelize.JSON, allowNull: false, defaultValue: {} },
      occurredAt: { type: Sequelize.DATE, allowNull: false },
      expiresAt: { type: Sequelize.DATE, allowNull: true },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });
    await queryInterface.addIndex('ai_interactions', ['userId', 'occurredAt'], { name: 'ai_interactions_user_occurred' });
    await queryInterface.addIndex('ai_interactions', ['expiresAt'], { name: 'ai_interactions_expiry' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('ai_interactions');
    await queryInterface.dropTable('consent_records');
    await queryInterface.dropTable('user_privacy_preferences');
  },
};
