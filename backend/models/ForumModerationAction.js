const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

// Append-only audit trail covering both pre-publication decisions
// (approve/reject) and post-hoc moderation (pin/lock/delete/mute/ban/...).
const ACTIONS = [
  'approve_thread', 'reject_thread', 'approve_post', 'reject_post',
  'pin', 'unpin', 'lock', 'unlock', 'delete', 'restore',
  'mark_best_answer', 'unmark_best_answer',
  'dismiss_report', 'action_report',
  'mute', 'unmute', 'ban', 'unban', 'lift_sanction',
  'create_category', 'update_category',
];
const TARGET_TYPES = ['thread', 'post', 'report', 'user', 'category'];

const ForumModerationAction = sequelize.define('ForumModerationAction', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  actorId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'users', key: 'id' },
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL',
  },
  action: {
    type: DataTypes.STRING(32),
    allowNull: false,
    validate: { isIn: [ACTIONS] },
  },
  targetType: {
    type: DataTypes.STRING(16),
    allowNull: false,
    validate: { isIn: [TARGET_TYPES] },
  },
  targetId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  reportId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'forum_reports', key: 'id' },
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL',
  },
  note: {
    type: DataTypes.TEXT,
    allowNull: true,
    validate: { len: [0, 1000] },
  },
}, {
  tableName: 'forum_moderation_actions',
  timestamps: true,
  indexes: [
    { name: 'forum_mod_actions_target_idx', fields: ['targetType', 'targetId', 'createdAt'] },
    { name: 'forum_mod_actions_actor_idx', fields: ['actorId', 'createdAt'] },
  ],
});

ForumModerationAction.ACTIONS = Object.freeze([...ACTIONS]);

module.exports = ForumModerationAction;
