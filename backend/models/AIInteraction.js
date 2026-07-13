const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

module.exports = sequelize.define('AIInteraction', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  userId: { type: DataTypes.UUID, allowNull: true },
  workspaceId: { type: DataTypes.UUID, allowNull: true },
  feature: { type: DataTypes.STRING, allowNull: false },
  modelVersion: { type: DataTypes.STRING, allowNull: true },
  promptVersion: { type: DataTypes.STRING, allowNull: true },
  status: { type: DataTypes.STRING, allowNull: false },
  confidence: { type: DataTypes.STRING, allowNull: true },
  inputSummary: { type: DataTypes.TEXT, allowNull: true },
  outputSummary: { type: DataTypes.TEXT, allowNull: true },
  metadata: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
  occurredAt: { type: DataTypes.DATE, allowNull: false },
  expiresAt: { type: DataTypes.DATE, allowNull: true },
}, { tableName: 'ai_interactions', timestamps: true });
