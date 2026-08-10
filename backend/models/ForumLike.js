const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const LIKEABLE_TYPES = ['thread', 'post'];

const ForumLike = sequelize.define('ForumLike', {
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
  likeableType: {
    type: DataTypes.STRING(16),
    allowNull: false,
    validate: { isIn: [LIKEABLE_TYPES] },
  },
  likeableId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
}, {
  tableName: 'forum_likes',
  timestamps: true,
  indexes: [
    {
      name: 'forum_likes_user_target_unique',
      unique: true,
      fields: ['userId', 'likeableType', 'likeableId'],
    },
    { name: 'forum_likes_target_idx', fields: ['likeableType', 'likeableId'] },
  ],
});

ForumLike.LIKEABLE_TYPES = Object.freeze([...LIKEABLE_TYPES]);

module.exports = ForumLike;
