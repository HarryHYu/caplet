const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

module.exports = sequelize.define('OperationalAlert', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  fingerprint: { type: DataTypes.STRING(160), allowNull: false },
  source: { type: DataTypes.STRING(24), allowNull: false },
  environment: { type: DataTypes.STRING(50), allowNull: false },
  severity: { type: DataTypes.STRING(24), allowNull: false },
  summary: { type: DataTypes.STRING(240), allowNull: false },
  status: { type: DataTypes.STRING(24), allowNull: false, defaultValue: 'open' },
  firstDetectedAt: { type: DataTypes.DATE, allowNull: false },
  lastDetectedAt: { type: DataTypes.DATE, allowNull: false },
  occurrenceCount: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
  resolvedAt: { type: DataTypes.DATE, allowNull: true },
  metadata: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
  deliveryStatus: { type: DataTypes.STRING(24), allowNull: false, defaultValue: 'pending' },
  deliveryChannel: { type: DataTypes.STRING(24), allowNull: true },
  deliveryAttempts: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  deliveryLastAttemptAt: { type: DataTypes.DATE, allowNull: true },
  deliveryNextAttemptAt: { type: DataTypes.DATE, allowNull: true },
  deliveredAt: { type: DataTypes.DATE, allowNull: true },
  deliveryLastError: { type: DataTypes.TEXT, allowNull: true },
  deliveryProviderId: { type: DataTypes.STRING(255), allowNull: true },
}, {
  tableName: 'operational_alerts',
  timestamps: true,
  indexes: [
    { name: 'operational_alerts_fingerprint_unique', unique: true, fields: ['fingerprint'] },
    { name: 'operational_alerts_status_detected_idx', fields: ['status', 'lastDetectedAt'] },
    { name: 'operational_alerts_delivery_retry_idx', fields: ['status', 'deliveryStatus', 'deliveryNextAttemptAt'] },
  ],
});
