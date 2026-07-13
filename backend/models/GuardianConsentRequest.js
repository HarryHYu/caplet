const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

module.exports = sequelize.define('GuardianConsentRequest', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  userId: { type: DataTypes.UUID, allowNull: false },
  guardianEmail: { type: DataTypes.STRING, allowNull: false },
  tokenHash: { type: DataTypes.STRING, allowNull: false, unique: true },
  status: { type: DataTypes.STRING, allowNull: false, defaultValue: 'pending' },
  policyVersion: { type: DataTypes.STRING, allowNull: false },
  expiresAt: { type: DataTypes.DATE, allowNull: false },
  actedAt: { type: DataTypes.DATE, allowNull: true },
  guardianName: { type: DataTypes.STRING, allowNull: true },
  metadata: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
}, { tableName: 'guardian_consent_requests', timestamps: true });
