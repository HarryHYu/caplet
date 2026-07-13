const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * Ownership registry for every S3-compatible object URL Caplet issues.
 *
 * A row is created when a presigned upload is issued. The object may never be
 * uploaded, but deleting a missing key is safe and keeping the registry from
 * the start means account erasure never has to infer ownership from a public
 * URL embedded in content.
 */
module.exports = sequelize.define('UploadedAsset', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  key: {
    type: DataTypes.STRING(1024),
    allowNull: false,
    unique: true,
  },
  finalKey: {
    type: DataTypes.STRING(1024),
    allowNull: false,
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'users', key: 'id' },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE',
  },
  workspaceId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'editor_workspaces', key: 'id' },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE',
  },
  purpose: {
    type: DataTypes.STRING(32),
    allowNull: false,
  },
  mimeType: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  classroomId: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  lessonId: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  courseId: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  status: {
    type: DataTypes.STRING(24),
    allowNull: false,
    defaultValue: 'presigned',
  },
}, {
  tableName: 'uploaded_assets',
  timestamps: true,
  validate: {
    hasOwner() {
      if (!this.userId && !this.workspaceId) {
        throw new Error('An uploaded asset must belong to a user or editor workspace');
      }
    },
  },
});
