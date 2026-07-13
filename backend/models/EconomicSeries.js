const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const EconomicSeries = sequelize.define('EconomicSeries', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  key: { type: DataTypes.STRING(100), allowNull: false, unique: true },
  sourceId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'economic_sources', key: 'id' },
    onUpdate: 'CASCADE',
    onDelete: 'RESTRICT',
  },
  providerSeriesId: { type: DataTypes.STRING(255), allowNull: false },
  title: { type: DataTypes.STRING(255), allowNull: false },
  displayTitle: { type: DataTypes.STRING(255), allowNull: false },
  sourceUrl: { type: DataTypes.STRING(500), allowNull: false },
  unit: { type: DataTypes.STRING(80), allowNull: false },
  nativeFrequency: { type: DataTypes.STRING(24), allowNull: false },
  adjustment: { type: DataTypes.STRING(32), allowNull: false, defaultValue: 'not_applicable' },
  transformation: { type: DataTypes.STRING(80), allowNull: false, defaultValue: 'none' },
  definitionVersion: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
  expectedReleaseRule: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
  nextExpectedReleaseAt: { type: DataTypes.DATE, allowNull: true },
  freshnessGraceHours: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 72 },
  active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  metadata: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
}, {
  tableName: 'economic_series',
  timestamps: true,
  indexes: [
    { name: 'economic_series_key_unique', unique: true, fields: ['key'] },
    { name: 'economic_series_source_active_idx', fields: ['sourceId', 'active'] },
  ],
});

module.exports = EconomicSeries;
