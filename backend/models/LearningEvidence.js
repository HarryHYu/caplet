const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const immutableEvidenceError = () => {
  throw new Error('LearningEvidence is append-only; create a revision using revisionOfId');
};

/**
 * An append-only observation that a learner demonstrated an outcome.
 * Corrections are new rows linked through revisionOfId. A unique link keeps
 * each revision chain linear, while a globally unique idempotency key
 * guarantees one canonical record for an interaction or correction request.
 */
const LearningEvidence = sequelize.define('LearningEvidence', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  idempotencyKey: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'users', key: 'id' },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE',
  },
  outcomeId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'curriculum_outcomes', key: 'id' },
    onUpdate: 'CASCADE',
    onDelete: 'RESTRICT',
  },
  questionId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'questions', key: 'id' },
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL',
  },
  practiceSessionId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'practice_sessions', key: 'id' },
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL',
  },
  sourceType: {
    type: DataTypes.STRING(50),
    allowNull: false,
  },
  sourceId: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  attemptNumber: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
    validate: { min: 1 },
  },
  score: {
    type: DataTypes.FLOAT,
    allowNull: true,
    validate: { min: 0 },
  },
  maxScore: {
    type: DataTypes.FLOAT,
    allowNull: true,
    validate: { min: Number.EPSILON },
  },
  normalizedScore: {
    type: DataTypes.FLOAT,
    allowNull: true,
    validate: { min: 0, max: 1 },
  },
  assessmentType: {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: 'practice',
  },
  difficulty: {
    type: DataTypes.STRING(50),
    allowNull: true,
  },
  timeTakenSeconds: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: { min: 0 },
  },
  markingMethod: {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: 'deterministic',
  },
  misconceptionCodes: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: [],
  },
  feedback: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: {},
  },
  contentVersion: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  occurredAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
  revisionOfId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'learning_evidence', key: 'id' },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE',
  },
  metadata: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: {},
  },
}, {
  tableName: 'learning_evidence',
  timestamps: true,
  indexes: [
    {
      name: 'learning_evidence_idempotency_unique',
      unique: true,
      fields: ['idempotencyKey'],
    },
    {
      name: 'learning_evidence_revision_of_unique',
      unique: true,
      fields: ['revisionOfId'],
    },
    {
      name: 'learning_evidence_user_outcome_occurred_idx',
      fields: ['userId', 'outcomeId', 'occurredAt'],
    },
    {
      name: 'learning_evidence_question_occurred_idx',
      fields: ['questionId', 'occurredAt'],
    },
    {
      name: 'learning_evidence_session_occurred_idx',
      fields: ['practiceSessionId', 'occurredAt'],
    },
    {
      name: 'learning_evidence_source_idx',
      fields: ['sourceType', 'sourceId'],
    },
  ],
  validate: {
    coherentScores() {
      const hasScore = this.score !== null && this.score !== undefined;
      const hasMaximum = this.maxScore !== null && this.maxScore !== undefined;
      if (hasScore !== hasMaximum) {
        throw new Error('score and maxScore must either both be provided or both be null');
      }
      if (hasScore && Number(this.score) > Number(this.maxScore)) {
        throw new Error('score cannot exceed maxScore');
      }
    },
    notSelfRevision() {
      if (this.id && this.revisionOfId && this.id === this.revisionOfId) {
        throw new Error('revisionOfId cannot reference the evidence itself');
      }
    },
  },
  hooks: {
    beforeUpdate: immutableEvidenceError,
    beforeBulkUpdate: immutableEvidenceError,
  },
});

module.exports = LearningEvidence;
