const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const appendOnly = () => {
  throw new Error('FeatureFlagAudit is append-only');
};

const FeatureFlagAudit = sequelize.define('FeatureFlagAudit', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  flagId: { type: DataTypes.UUID, allowNull: true },
  flagKey: { type: DataTypes.STRING(100), allowNull: false },
  action: {
    type: DataTypes.STRING(30),
    allowNull: false,
    validate: { isIn: [['created', 'updated', 'archived', 'restored']] },
  },
  actorUserId: { type: DataTypes.UUID, allowNull: true },
  previousValue: { type: DataTypes.JSONB, allowNull: true },
  nextValue: { type: DataTypes.JSONB, allowNull: true },
  requestId: { type: DataTypes.STRING(128), allowNull: true },
  createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
}, {
  tableName: 'feature_flag_audits',
  timestamps: false,
  indexes: [
    { name: 'feature_flag_audits_flag_created_idx', fields: ['flagId', 'createdAt'] },
    { name: 'feature_flag_audits_actor_created_idx', fields: ['actorUserId', 'createdAt'] },
  ],
  hooks: {
    beforeUpdate: appendOnly,
    beforeBulkUpdate: appendOnly,
  },
});

module.exports = FeatureFlagAudit;
