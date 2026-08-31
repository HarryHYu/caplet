const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * A parked typewriter-tycoon run — a save slot. The active run lives in
 * TycoonState; starting a new game or loading a different save moves whole
 * state blobs between the two. Server-written only.
 */
const TycoonSave = sequelize.define('TycoonSave', {
  id: {
    type: DataTypes.UUID,
    primaryKey: true,
    allowNull: false,
    defaultValue: DataTypes.UUIDV4,
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  name: {
    type: DataTypes.STRING(40),
    allowNull: false,
    defaultValue: 'Saved run',
  },
  state: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: {},
  },
}, {
  tableName: 'tycoon_saves',
  timestamps: true,
});

module.exports = TycoonSave;
