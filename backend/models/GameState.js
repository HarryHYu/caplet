const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

// A user's saved state for a single game (namespaced by gameKey).
const GameState = sequelize.define('GameState', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  gameKey: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  state: {
    type: DataTypes.TEXT,
    allowNull: true,
    get() {
      const value = this.getDataValue('state');
      return value ? JSON.parse(value) : null;
    },
    set(value) {
      this.setDataValue('state', value ? JSON.stringify(value) : null);
    },
  },
}, {
  tableName: 'game_states',
  timestamps: true,
});

module.exports = GameState;
