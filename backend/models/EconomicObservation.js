const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const EconomicObservation = sequelize.define('EconomicObservation', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  seriesId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'economic_series', key: 'id' },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE',
  },
  observationDate: { type: DataTypes.DATEONLY, allowNull: false },
  periodStart: { type: DataTypes.DATEONLY, allowNull: false },
  periodEnd: { type: DataTypes.DATEONLY, allowNull: false },
  periodLabel: { type: DataTypes.STRING(100), allowNull: false },
  value: { type: DataTypes.DECIMAL(20, 8), allowNull: false },
  previousValue: { type: DataTypes.DECIMAL(20, 8), allowNull: true },
  releasedAt: { type: DataTypes.DATE, allowNull: true },
  retrievedAt: { type: DataTypes.DATE, allowNull: false },
  revisionState: { type: DataTypes.STRING(24), allowNull: false, defaultValue: 'initial' },
  revisionDetectedAt: { type: DataTypes.DATE, allowNull: true },
  isProvisional: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  sourceHash: { type: DataTypes.STRING(128), allowNull: true },
}, {
  tableName: 'economic_observations',
  timestamps: true,
  indexes: [
    { name: 'economic_observations_series_date_unique', unique: true, fields: ['seriesId', 'observationDate'] },
  ],
});

module.exports = EconomicObservation;
