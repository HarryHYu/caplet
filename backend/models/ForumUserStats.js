const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

// Study-citizenship reputation ("Contribution") — lives on its own
// forum-owned table keyed by userId, same pattern as ForumModerator /
// ForumSanction, rather than a column on the shared `users` table.
const BADGES = [
  { key: 'first_answer', label: 'First Answer', description: 'Had a reply marked as the best answer.' },
  { key: 'helper', label: 'Helper', description: '5 replies marked as the best answer.' },
  { key: 'community_favorite', label: 'Community Favorite', description: '10+ helpful reactions received.' },
  { key: 'prolific_contributor', label: 'Prolific Contributor', description: '20+ approved posts.' },
];

const ForumUserStats = sequelize.define('ForumUserStats', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    unique: true,
    references: { model: 'users', key: 'id' },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE',
  },
  contributionScore: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
  bestAnswerCount: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
  helpfulReactionsReceived: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
  approvedThreadCount: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
  approvedPostCount: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
  badges: {
    type: DataTypes.TEXT,
    allowNull: false,
    defaultValue: '[]',
    get() {
      const value = this.getDataValue('badges');
      return value ? JSON.parse(value) : [];
    },
    set(value) {
      this.setDataValue('badges', JSON.stringify(Array.isArray(value) ? value : []));
    },
  },
}, {
  tableName: 'forum_user_stats',
  timestamps: true,
});

ForumUserStats.BADGES = Object.freeze(BADGES.map((b) => Object.freeze({ ...b })));

module.exports = ForumUserStats;
