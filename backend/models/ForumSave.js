const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

// Bookmarks a thread into the user's personal "Revision list" (repurposed
// save/bookmark). Thread-level only — you save the discussion, not a reply.
const ForumSave = sequelize.define('ForumSave', {
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
  threadId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'forum_threads', key: 'id' },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE',
  },
}, {
  tableName: 'forum_saves',
  timestamps: true,
  indexes: [
    { name: 'forum_saves_user_thread_unique', unique: true, fields: ['userId', 'threadId'] },
    { name: 'forum_saves_user_idx', fields: ['userId', 'createdAt'] },
  ],
});

module.exports = ForumSave;
