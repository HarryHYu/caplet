const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

// "Follow a subject" (repurposed subreddit subscription) — drives the
// in-app notification fanout when a thread is approved in that category.
const ForumSubscription = sequelize.define('ForumSubscription', {
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
  categoryId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'forum_categories', key: 'id' },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE',
  },
}, {
  tableName: 'forum_subscriptions',
  timestamps: true,
  indexes: [
    { name: 'forum_subscriptions_user_category_unique', unique: true, fields: ['userId', 'categoryId'] },
    { name: 'forum_subscriptions_category_idx', fields: ['categoryId'] },
  ],
});

module.exports = ForumSubscription;
