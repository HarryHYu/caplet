const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

// Named learning-signal reactions, separate from the plain like/vote in
// ForumLike — a user can give a post both a like AND "Helpful" AND "This
// helped me". No downvote-equivalent exists here either.
const REACTION_TYPES = ['helpful', 'clear_explanation', 'this_helped_me'];
const REACTABLE_TYPES = ['thread', 'post'];

const ForumReaction = sequelize.define('ForumReaction', {
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
  reactableType: {
    type: DataTypes.STRING(16),
    allowNull: false,
    validate: { isIn: [REACTABLE_TYPES] },
  },
  reactableId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  reactionType: {
    type: DataTypes.STRING(24),
    allowNull: false,
    validate: { isIn: [REACTION_TYPES] },
  },
}, {
  tableName: 'forum_reactions',
  timestamps: true,
  indexes: [
    {
      name: 'forum_reactions_user_target_type_unique',
      unique: true,
      fields: ['userId', 'reactableType', 'reactableId', 'reactionType'],
    },
    { name: 'forum_reactions_target_idx', fields: ['reactableType', 'reactableId'] },
  ],
});

ForumReaction.REACTION_TYPES = Object.freeze([...REACTION_TYPES]);
ForumReaction.REACTABLE_TYPES = Object.freeze([...REACTABLE_TYPES]);

module.exports = ForumReaction;
