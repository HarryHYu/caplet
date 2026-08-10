const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

// Board colors are token keys (not raw hex) — the frontend maps each to an
// existing design-token accent (coral/amber/green/blue) so new categories
// never need a new color introduced in code.
const CATEGORY_COLORS = ['coral', 'amber', 'green', 'blue'];

const ForumCategory = sequelize.define('ForumCategory', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING(80),
    allowNull: false,
    validate: { len: [1, 80] },
  },
  slug: {
    type: DataTypes.STRING(80),
    allowNull: false,
    unique: true,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  color: {
    type: DataTypes.STRING(16),
    allowNull: false,
    defaultValue: 'coral',
    validate: { isIn: [CATEGORY_COLORS] },
  },
  sortOrder: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
  isLocked: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: 'When true, only moderators/admins can start threads here (e.g. Announcements)',
  },
  isArchived: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
  threadCount: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    comment: 'Denormalized count of approved, non-deleted threads',
  },
  postCount: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
  lastActivityAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  createdById: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'users', key: 'id' },
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL',
  },
}, {
  tableName: 'forum_categories',
  timestamps: true,
});

ForumCategory.COLORS = Object.freeze([...CATEGORY_COLORS]);

module.exports = ForumCategory;
