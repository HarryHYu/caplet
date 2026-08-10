const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const CONTENT_STATUSES = ['pending', 'approved', 'rejected'];

const ForumPost = sequelize.define('ForumPost', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  threadId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'forum_threads', key: 'id' },
    onUpdate: 'CASCADE',
    onDelete: 'RESTRICT',
  },
  authorId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'users', key: 'id' },
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL',
  },
  parentPostId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'forum_posts', key: 'id' },
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL',
    comment: 'Optional single-level "replying to" reference — no deep nesting',
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false,
    // Can be empty when content lives entirely in contentBlocks (e.g. a
    // chart-only reply) — the route layer still requires content OR blocks.
    validate: { len: [0, 4000] },
  },
  status: {
    type: DataTypes.STRING(16),
    allowNull: false,
    defaultValue: 'pending',
    validate: { isIn: [CONTENT_STATUSES] },
  },
  moderationNote: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  reviewedById: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'users', key: 'id' },
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL',
  },
  reviewedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  isDeleted: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
  deletedById: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'users', key: 'id' },
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL',
  },
  deletedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  likeCount: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
  flagCount: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
  autoFlagged: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
  autoFlagReasons: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: [],
  },
  editedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  reactionCounts: {
    type: DataTypes.TEXT,
    allowNull: false,
    defaultValue: '{}',
    get() {
      const value = this.getDataValue('reactionCounts');
      return value ? JSON.parse(value) : {};
    },
    set(value) {
      this.setDataValue('reactionCounts', JSON.stringify(value && typeof value === 'object' ? value : {}));
    },
  },
  isAnonymous: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: 'Hides the author from peers in the UI. authorId is ALWAYS retained — moderators and safeguarding staff can still see who posted.',
  },
  contentBlocks: {
    type: DataTypes.TEXT,
    allowNull: false,
    defaultValue: '[]',
    comment: 'Ordered array of structured, server-validated content blocks (see services/forumBlocks.js). Never raw HTML.',
    get() {
      const value = this.getDataValue('contentBlocks');
      return value ? JSON.parse(value) : [];
    },
    set(value) {
      this.setDataValue('contentBlocks', JSON.stringify(Array.isArray(value) ? value : []));
    },
  },
}, {
  tableName: 'forum_posts',
  timestamps: true,
  indexes: [
    { name: 'forum_posts_thread_status_idx', fields: ['threadId', 'status', 'isDeleted'] },
    { name: 'forum_posts_author_idx', fields: ['authorId'] },
    { name: 'forum_posts_status_created_idx', fields: ['status', 'createdAt'] },
  ],
});

ForumPost.STATUSES = Object.freeze([...CONTENT_STATUSES]);

module.exports = ForumPost;
