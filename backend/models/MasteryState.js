const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * Materialized, explainable mastery state for exactly one learner and outcome.
 * LearningEvidence remains the source of truth; this row can be deterministically
 * recalculated and versioned as the mastery algorithm evolves.
 */
const MasteryState = sequelize.define('MasteryState', {
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
  outcomeId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'curriculum_outcomes', key: 'id' },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE',
  },
  probability: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 0,
    validate: { min: 0, max: 1 },
  },
  evidenceCount: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    validate: { min: 0 },
  },
  lastDemonstratedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  retentionStrength: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 0,
    validate: { min: 0, max: 1 },
  },
  confidence: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'low',
    validate: { isIn: [['low', 'medium', 'high']] },
  },
  misconceptions: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: [],
  },
  nextReviewAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  version: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
    validate: { min: 1 },
  },
  calculatedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
  metadata: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: {},
  },
}, {
  tableName: 'mastery_states',
  timestamps: true,
  indexes: [
    {
      name: 'mastery_states_user_outcome_unique',
      unique: true,
      fields: ['userId', 'outcomeId'],
    },
    {
      name: 'mastery_states_user_review_idx',
      fields: ['userId', 'nextReviewAt'],
    },
    {
      name: 'mastery_states_outcome_probability_idx',
      fields: ['outcomeId', 'probability'],
    },
  ],
});

module.exports = MasteryState;
