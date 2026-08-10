const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const SANCTION_TYPES = ['mute', 'ban'];

const ForumSanction = sequelize.define('ForumSanction', {
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
  type: {
    type: DataTypes.STRING(16),
    allowNull: false,
    validate: { isIn: [SANCTION_TYPES] },
  },
  reason: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  issuedById: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'users', key: 'id' },
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL',
  },
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'null = indefinite (bans default to indefinite; mutes should set this)',
  },
  liftedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  liftedById: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'users', key: 'id' },
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL',
  },
  active: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  },
}, {
  tableName: 'forum_sanctions',
  timestamps: true,
  indexes: [
    { name: 'forum_sanctions_user_active_idx', fields: ['userId', 'active'] },
  ],
});

ForumSanction.TYPES = Object.freeze([...SANCTION_TYPES]);

module.exports = ForumSanction;
