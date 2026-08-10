const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const NOTIFICATION_TYPES = ['new_thread_in_subject', 'reply_to_thread', 'best_answer_marked'];

// Lightweight in-app notification — no email/push infra, just a feed the
// user checks via the bell icon. Fanned out when a thread is approved in a
// subject the recipient follows (see routes/forum.js moderation/approve).
const ForumNotification = sequelize.define('ForumNotification', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'users', key: 'id' },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE',
  },
  type: {
    type: DataTypes.STRING(32),
    allowNull: false,
    validate: { isIn: [NOTIFICATION_TYPES] },
  },
  threadId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'forum_threads', key: 'id' },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE',
  },
  categoryId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'forum_categories', key: 'id' },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE',
  },
  message: {
    type: DataTypes.STRING(300),
    allowNull: false,
  },
  isRead: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
}, {
  tableName: 'forum_notifications',
  timestamps: true,
  indexes: [
    { name: 'forum_notifications_user_read_idx', fields: ['userId', 'isRead', 'createdAt'] },
  ],
});

ForumNotification.TYPES = Object.freeze([...NOTIFICATION_TYPES]);

module.exports = ForumNotification;
