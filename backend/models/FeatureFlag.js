const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const FeatureFlag = sequelize.define('FeatureFlag', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  key: {
    type: DataTypes.STRING(100),
    allowNull: false,
    validate: { is: /^[a-z][a-z0-9._-]{1,99}$/ },
  },
  description: { type: DataTypes.STRING(500), allowNull: true },
  enabled: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  isPublic: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  rolloutPercentage: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 100,
    validate: { min: 0, max: 100 },
  },
  publicValue: { type: DataTypes.JSONB, allowNull: true },
  internalConfig: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
  version: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1, validate: { min: 1 } },
  archivedAt: { type: DataTypes.DATE, allowNull: true },
  createdBy: { type: DataTypes.UUID, allowNull: true },
  updatedBy: { type: DataTypes.UUID, allowNull: true },
}, {
  tableName: 'feature_flags',
  timestamps: true,
  indexes: [
    { name: 'feature_flags_key_unique', unique: true, fields: ['key'] },
    { name: 'feature_flags_public_active_idx', fields: ['isPublic', 'archivedAt', 'key'] },
  ],
});

module.exports = FeatureFlag;
