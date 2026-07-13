const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const REPORT_REASONS = ['bullying', 'harassment', 'inappropriate', 'privacy', 'spam', 'other'];
const MODERATION_STATUSES = ['pending', 'reviewed', 'dismissed', 'actioned'];
const NOTIFICATION_STATUSES = ['pending', 'delivering', 'delivered', 'failed'];

const CommentModerationRecord = sequelize.define('CommentModerationRecord', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  classroomId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'classrooms', key: 'id' },
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL',
  },
  commentId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'comments', key: 'id' },
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL',
  },
  reportedById: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'users', key: 'id' },
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL',
  },
  commentAuthorId: {
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
    validate: { len: [1, 2000] },
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
    defaultValue: 'class_owner',
    validate: { isIn: [['class_owner', 'admin']] },
  },
  priority: {
    type: DataTypes.STRING(16),
    allowNull: false,
    defaultValue: 'standard',
    validate: { isIn: [['standard', 'high']] },
  },
  notificationStatus: {
    type: DataTypes.STRING(24),
    allowNull: false,
    defaultValue: 'pending',
    validate: { isIn: [NOTIFICATION_STATUSES] },
  },
  notificationChannel: {
    type: DataTypes.STRING(24),
    allowNull: true,
    validate: { isIn: [['webhook', 'email']] },
  },
  notificationAttempts: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    validate: { min: 0 },
  },
  notificationLastAttemptAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  notificationNextAttemptAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  notificationDeliveredAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  notificationLastError: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  notificationProviderId: {
    type: DataTypes.STRING(255),
    allowNull: true,
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
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: {},
  },
}, {
  tableName: 'comment_moderation_records',
  timestamps: true,
  indexes: [
    {
      name: 'comment_moderation_reporter_comment_unique',
      unique: true,
      fields: ['commentId', 'reportedById'],
    },
    {
      name: 'comment_moderation_class_status_created_idx',
      fields: ['classroomId', 'reviewQueue', 'status', 'createdAt'],
    },
    {
      name: 'comment_moderation_queue_status_created_idx',
      fields: ['reviewQueue', 'status', 'createdAt'],
    },
    {
      name: 'comment_moderation_reporter_created_idx',
      fields: ['reportedById', 'createdAt'],
    },
    {
      name: 'comment_moderation_notification_retry_idx',
      fields: ['status', 'notificationStatus', 'notificationNextAttemptAt'],
    },
  ],
});

CommentModerationRecord.REASONS = Object.freeze([...REPORT_REASONS]);
CommentModerationRecord.STATUSES = Object.freeze([...MODERATION_STATUSES]);
CommentModerationRecord.NOTIFICATION_STATUSES = Object.freeze([...NOTIFICATION_STATUSES]);

module.exports = CommentModerationRecord;
