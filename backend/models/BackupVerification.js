const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const appendOnly = () => {
  throw new Error('BackupVerification is append-only');
};

const BackupVerification = sequelize.define('BackupVerification', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  verificationKey: { type: DataTypes.STRING(200), allowNull: false },
  backupId: { type: DataTypes.STRING(255), allowNull: false },
  provider: { type: DataTypes.STRING(100), allowNull: false },
  environment: { type: DataTypes.STRING(50), allowNull: false },
  status: {
    type: DataTypes.STRING(30),
    allowNull: false,
    validate: { isIn: [['verified', 'failed']] },
  },
  backupCreatedAt: { type: DataTypes.DATE, allowNull: false },
  verifiedAt: { type: DataTypes.DATE, allowNull: false },
  restoreTestedAt: { type: DataTypes.DATE, allowNull: true },
  checksumVerified: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  sizeBytes: { type: DataTypes.BIGINT, allowNull: true, validate: { min: 0 } },
  recoveryPointAt: { type: DataTypes.DATE, allowNull: true },
  recoveryTimeSeconds: { type: DataTypes.INTEGER, allowNull: true, validate: { min: 0 } },
  evidence: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
  evidenceDigest: { type: DataTypes.STRING(64), allowNull: false },
  notes: { type: DataTypes.TEXT, allowNull: true },
  recordedBy: { type: DataTypes.UUID, allowNull: true },
  requestId: { type: DataTypes.STRING(128), allowNull: true },
  createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
}, {
  tableName: 'backup_verifications',
  timestamps: false,
  indexes: [
    { name: 'backup_verifications_key_unique', unique: true, fields: ['verificationKey'] },
    {
      name: 'backup_verifications_environment_status_verified_idx',
      fields: ['environment', 'status', 'verifiedAt'],
    },
    { name: 'backup_verifications_backup_created_idx', fields: ['backupCreatedAt'] },
  ],
  hooks: {
    beforeUpdate: appendOnly,
    beforeBulkUpdate: appendOnly,
  },
});

module.exports = BackupVerification;
