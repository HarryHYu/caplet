const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

// Forum moderator grants live in their own table rather than widening
// User.role (a native Postgres ENUM) — adding a value there needs an
// ALTER TYPE and this project's forum migration must stay additive-only.
const ForumModerator = sequelize.define('ForumModerator', {
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
  grantedById: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'users', key: 'id' },
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL',
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
}, {
  tableName: 'forum_moderators',
  timestamps: true,
});

module.exports = ForumModerator;
