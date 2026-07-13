const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const EconomicIngestionRun = sequelize.define('EconomicIngestionRun', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  sourceId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'economic_sources', key: 'id' },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE',
  },
  seriesId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'economic_series', key: 'id' },
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL',
  },
  adapterVersion: { type: DataTypes.STRING(80), allowNull: false },
  startedAt: { type: DataTypes.DATE, allowNull: false },
  completedAt: { type: DataTypes.DATE, allowNull: true },
  retrievedAt: { type: DataTypes.DATE, allowNull: false },
  status: { type: DataTypes.STRING(24), allowNull: false, defaultValue: 'running' },
  httpStatus: { type: DataTypes.INTEGER, allowNull: true },
  observationsAccepted: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  observationsRejected: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  latestObservationDate: { type: DataTypes.DATEONLY, allowNull: true },
  errorCode: { type: DataTypes.STRING(80), allowNull: true },
  errorSummary: { type: DataTypes.STRING(500), allowNull: true },
}, {
  tableName: 'economic_ingestion_runs',
  timestamps: true,
  indexes: [
    { name: 'economic_ingestion_runs_source_started_idx', fields: ['sourceId', 'startedAt'] },
    { name: 'economic_ingestion_runs_status_idx', fields: ['status', 'startedAt'] },
  ],
});

module.exports = EconomicIngestionRun;
