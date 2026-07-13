const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const PRACTICE_STATUSES = ['in_progress', 'completed', 'abandoned'];

/**
 * Resumable state for every learner practice mode. config holds mode-specific
 * state such as submitted answers while the top-level fields support fast
 * resume, completion, classroom, and assignment queries.
 */
const PracticeSession = sequelize.define('PracticeSession', {
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
  subject: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  mode: {
    type: DataTypes.STRING(50),
    allowNull: false,
  },
  status: {
    type: DataTypes.STRING(30),
    allowNull: false,
    defaultValue: 'in_progress',
    validate: { isIn: [PRACTICE_STATUSES] },
  },
  clientSessionKey: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  primaryOutcomeId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'curriculum_outcomes', key: 'id' },
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL',
  },
  classroomId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'classrooms', key: 'id' },
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL',
  },
  assignmentId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'assignments', key: 'id' },
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL',
  },
  questionIds: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: [],
  },
  currentIndex: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    validate: { min: 0 },
  },
  score: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 0,
    validate: { min: 0 },
  },
  maxScore: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 0,
    validate: { min: 0 },
  },
  config: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: {},
  },
  summary: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: {},
  },
  metadata: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: {},
  },
  startedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
  lastActivityAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
  completedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
}, {
  tableName: 'practice_sessions',
  timestamps: true,
  indexes: [
    {
      name: 'practice_sessions_user_client_key_unique',
      unique: true,
      fields: ['userId', 'clientSessionKey'],
    },
    {
      name: 'practice_sessions_user_status_activity_idx',
      fields: ['userId', 'status', 'lastActivityAt'],
    },
    {
      name: 'practice_sessions_outcome_status_idx',
      fields: ['primaryOutcomeId', 'status'],
    },
    {
      name: 'practice_sessions_class_assignment_status_idx',
      fields: ['classroomId', 'assignmentId', 'status'],
    },
  ],
});

PracticeSession.STATUSES = Object.freeze([...PRACTICE_STATUSES]);

module.exports = PracticeSession;
