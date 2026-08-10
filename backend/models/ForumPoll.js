const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

// Repurposed poll — a "study check" attached to a thread: which-answer-is-
// correct checks, confidence polls, etc. One poll per thread.
const ForumPoll = sequelize.define('ForumPoll', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  threadId: {
    type: DataTypes.UUID,
    allowNull: false,
    unique: true,
    references: { model: 'forum_threads', key: 'id' },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE',
  },
  question: {
    type: DataTypes.STRING(300),
    allowNull: false,
    validate: { len: [1, 300] },
  },
  allowMultiple: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
  closesAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
}, {
  tableName: 'forum_polls',
  timestamps: true,
});

module.exports = ForumPoll;
