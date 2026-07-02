const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * A single participant's graded answer to a single slide within a
 * LiveSession. Graded and timestamped server-side (backend/utils/liveGrading.js
 * + backend/realtime/liveSocket.js) — never trust a client-reported
 * correctness or elapsed time, both are spoofable.
 */
const LiveResponse = sequelize.define('LiveResponse', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  sessionId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  participantId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  slideIndex: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  responseData: {
    type: DataTypes.JSONB,
    allowNull: true
  },
  correct: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  pointsAwarded: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  // Server-side receipt timestamp (epoch ms) — the authority for speed scoring.
  answeredAtMs: {
    type: DataTypes.BIGINT,
    allowNull: false
  }
}, {
  tableName: 'live_responses',
  timestamps: true
});

module.exports = LiveResponse;
