const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * A hosted, real-time "play this lesson live" session (Kahoot-style).
 * Standalone by design: joining needs only `code`, not a Classroom
 * membership — `classroomId` is optional metadata, not a gate.
 *
 * `status` walks: lobby -> active -> question_open <-> reveal -> finished.
 * `currentSlideIndex` is -1 while in the lobby (nothing pushed yet).
 * The authoritative in-memory session state (per-question timers, connected
 * sockets) lives in backend/realtime/liveSocket.js; this row is the
 * durable record used for the REST join/resume endpoints and eventual
 * history/reporting.
 */
const LiveSession = sequelize.define('LiveSession', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  code: {
    type: DataTypes.STRING(16),
    allowNull: false,
    unique: true
  },
  hostUserId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  lessonId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  classroomId: {
    type: DataTypes.UUID,
    allowNull: true
  },
  status: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'lobby'
  },
  currentSlideIndex: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: -1
  },
  settings: {
    type: DataTypes.JSONB,
    allowNull: true
  },
  startedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  endedAt: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'live_sessions',
  timestamps: true
});

module.exports = LiveSession;
