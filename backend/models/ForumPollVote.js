const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ForumPollVote = sequelize.define('ForumPollVote', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  pollId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'forum_polls', key: 'id' },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE',
  },
  optionId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'forum_poll_options', key: 'id' },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE',
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'users', key: 'id' },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE',
  },
}, {
  tableName: 'forum_poll_votes',
  timestamps: true,
  indexes: [
    { name: 'forum_poll_votes_unique', unique: true, fields: ['pollId', 'optionId', 'userId'] },
    { name: 'forum_poll_votes_poll_user_idx', fields: ['pollId', 'userId'] },
  ],
});

module.exports = ForumPollVote;
