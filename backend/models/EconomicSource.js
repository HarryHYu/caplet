const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const EconomicSource = sequelize.define('EconomicSource', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  code: { type: DataTypes.STRING(24), allowNull: false, unique: true },
  name: { type: DataTypes.STRING(160), allowNull: false },
  baseUrl: { type: DataTypes.STRING(500), allowNull: false },
  termsUrl: { type: DataTypes.STRING(500), allowNull: true },
  active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  lastReviewedAt: { type: DataTypes.DATE, allowNull: true },
  metadata: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
}, {
  tableName: 'economic_sources',
  timestamps: true,
  indexes: [{ name: 'economic_sources_code_unique', unique: true, fields: ['code'] }],
});

module.exports = EconomicSource;
