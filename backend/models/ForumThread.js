const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

// Pre-moderation: every thread is invisible to the public until a moderator
// approves it. 'rejected' threads stay visible only to their author + mods.
const CONTENT_STATUSES = ['pending', 'approved', 'rejected'];

// Fixed, curated vocabulary (not user-defined tags) — study-purpose flairs.
const TAGS = ['question', 'help-needed', 'resource', 'notes', 'past-paper', 'discussion'];

const ForumThread = sequelize.define('ForumThread', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  categoryId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'forum_categories', key: 'id' },
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
  title: {
    type: DataTypes.STRING(200),
    allowNull: false,
    validate: { len: [4, 200] },
  },
  slug: {
    type: DataTypes.STRING(220),
    allowNull: false,
  },
  body: {
    type: DataTypes.TEXT,
    allowNull: false,
    // Can be empty when content lives entirely in contentBlocks (e.g. a
    // chart-only post) — the route layer still requires body OR blocks.
    validate: { len: [0, 8000] },
  },
  isQuestion: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: 'Enables "mark as best answer" on replies (Stack Overflow pattern)',
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
  isPinned: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
  isLocked: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
  isDeleted: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: 'Soft-delete only — content is never hard-deleted from the database',
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
  viewCount: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
  replyCount: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    comment: 'Denormalized count of approved, non-deleted replies',
  },
  likeCount: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
  bestAnswerPostId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'forum_posts', key: 'id' },
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL',
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
    comment: 'Set by the word-filter heuristic to raise this in the review queue',
  },
  autoFlagReasons: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: [],
  },
  lastActivityAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  tags: {
    type: DataTypes.TEXT,
    allowNull: false,
    defaultValue: '[]',
    get() {
      const value = this.getDataValue('tags');
      return value ? JSON.parse(value) : [];
    },
    set(value) {
      this.setDataValue('tags', JSON.stringify(Array.isArray(value) ? value : []));
    },
  },
  isMegathread: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: 'Curated, mod-pinned study-resource hub for its subject (repurposed "stickied megathread")',
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
  tableName: 'forum_threads',
  timestamps: true,
  indexes: [
    { name: 'forum_threads_category_status_idx', fields: ['categoryId', 'status', 'isDeleted'] },
    { name: 'forum_threads_author_idx', fields: ['authorId'] },
    { name: 'forum_threads_status_created_idx', fields: ['status', 'createdAt'] },
  ],
});

ForumThread.STATUSES = Object.freeze([...CONTENT_STATUSES]);
ForumThread.TAGS = Object.freeze([...TAGS]);

module.exports = ForumThread;
