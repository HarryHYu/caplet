const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * One player in a LiveSession. `userId` is nullable — real Kahoot-style
 * joining needs only a nickname, no account. If the joiner happens to be
 * logged in, `userId` is attached opportunistically (see routes/live.js)
 * but nothing about the join flow requires it.
 */
const LiveParticipant = sequelize.define('LiveParticipant', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  sessionId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: true
  },
  nickname: {
    type: DataTypes.STRING(40),
    allowNull: false
  },
  totalScore: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  connected: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  }
}, {
  tableName: 'live_participants',
  timestamps: true
});

module.exports = LiveParticipant;
