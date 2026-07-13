const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

module.exports = sequelize.define('UserPrivacyPreference', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  userId: { type: DataTypes.UUID, allowNull: false, unique: true },
  aiHistoryEnabled: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  aiRetentionDays: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 90 },
  analyticsEnabled: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  ageNoticeAcknowledgedAt: { type: DataTypes.DATE, allowNull: true },
  parentConsentStatus: { type: DataTypes.STRING, allowNull: false, defaultValue: 'not_required' },
}, { tableName: 'user_privacy_preferences', timestamps: true });
