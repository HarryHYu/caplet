const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ContentRevision = sequelize.define('ContentRevision', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  entityType: { type: DataTypes.STRING, allowNull: false },
  entityId: { type: DataTypes.STRING, allowNull: false },
  version: { type: DataTypes.INTEGER, allowNull: false },
  snapshot: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
  workspaceId: { type: DataTypes.UUID, allowNull: true },
  changeSummary: { type: DataTypes.STRING, allowNull: true },
}, { tableName: 'content_revisions', timestamps: true });

module.exports = ContentRevision;
