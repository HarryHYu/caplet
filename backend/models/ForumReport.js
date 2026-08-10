const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

// 'academic_integrity' covers requests for exam answers / assessment content —
// a risk specific to a school study forum that generic forum reason lists don't cover.
const REPORT_REASONS = ['bullying', 'harassment', 'inappropriate', 'academic_integrity', 'spam', 'other'];
const REPORTABLE_TYPES = ['thread', 'post'];
const MODERATION_STATUSES = ['pending', 'reviewed', 'dismissed', 'actioned'];

const ForumReport = sequelize.define('ForumReport', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  reportableType: {
    type: DataTypes.STRING(16),
    allowNull: false,
    validate: { isIn: [REPORTABLE_TYPES] },
  },
  reportableId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  reportedById: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'users', key: 'id' },
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL',
  },
  contentAuthorId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'users', key: 'id' },
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL',
  },
  reason: {
    type: DataTypes.STRING(32),
    allowNull: false,
    validate: { isIn: [REPORT_REASONS] },
  },
  details: {
    type: DataTypes.TEXT,
    allowNull: true,
    validate: { len: [0, 1000] },
  },
  contentSnapshot: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  status: {
    type: DataTypes.STRING(32),
    allowNull: false,
    defaultValue: 'pending',
    validate: { isIn: [MODERATION_STATUSES] },
  },
  reviewQueue: {
    type: DataTypes.STRING(32),
    allowNull: false,
    defaultValue: 'moderator',
    validate: { isIn: [['moderator', 'admin']] },
  },
  priority: {
    type: DataTypes.STRING(16),
    allowNull: false,
    defaultValue: 'standard',
    validate: { isIn: [['standard', 'high']] },
  },
  reviewedById: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'users', key: 'id' },
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL',
  },
  reviewedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  metadata: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: {},
  },
}, {
  tableName: 'forum_reports',
  timestamps: true,
  indexes: [
    {
      name: 'forum_reports_reporter_target_unique',
      unique: true,
      fields: ['reportableType', 'reportableId', 'reportedById'],
    },
    { name: 'forum_reports_queue_status_idx', fields: ['reviewQueue', 'status', 'createdAt'] },
    { name: 'forum_reports_target_idx', fields: ['reportableType', 'reportableId'] },
  ],
});

ForumReport.REASONS = Object.freeze([...REPORT_REASONS]);
ForumReport.STATUSES = Object.freeze([...MODERATION_STATUSES]);

module.exports = ForumReport;
