const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * Persistent typewriter-tycoon state — one row per user. The `state` blob is
 * exclusively server-written (balance, tier, upgrade levels, pets, lifetime
 * words); clients only ever report typed-word counts. Party membership and
 * chat are memory-only and deliberately absent here.
 */
const TycoonState = sequelize.define('TycoonState', {
  userId: {
    type: DataTypes.UUID,
    primaryKey: true,
    allowNull: false,
  },
  state: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: {},
  },
}, {
  tableName: 'tycoon_states',
  timestamps: true,
});

module.exports = TycoonState;
