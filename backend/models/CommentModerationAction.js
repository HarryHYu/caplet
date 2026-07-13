const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

module.exports = sequelize.define('CommentModerationAction', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  reportId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'comment_moderation_records', key: 'id' },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE',
  },
  actorId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'users', key: 'id' },
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL',
  },
  fromStatus: {
    type: DataTypes.STRING(32),
    allowNull: false,
  },
  toStatus: {
    type: DataTypes.STRING(32),
    allowNull: false,
    validate: { isIn: [['reviewed', 'dismissed', 'actioned']] },
  },
  note: {
    type: DataTypes.TEXT,
    allowNull: true,
    validate: { len: [0, 1000] },
  },
}, {
  tableName: 'comment_moderation_actions',
  timestamps: true,
  indexes: [
    {
      name: 'comment_moderation_actions_report_created_idx',
      fields: ['reportId', 'createdAt'],
    },
    {
      name: 'comment_moderation_actions_actor_created_idx',
      fields: ['actorId', 'createdAt'],
    },
  ],
});
