const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * One CapletMark submission: a student's answer to an HSC Economics question,
 * plus the AI's structured feedback on it. `subject` is included now (rather
 * than assumed) so this table can hold other subjects later without a
 * migration — see PRD: Subject Expansion Playbook.
 *
 * `strengths`/`gaps`/`terminology` are JSONB string arrays (see
 * backend/services/economicsMarker.js for the shape the AI returns).
 */
const MarkedAttempt = sequelize.define('MarkedAttempt', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  subject: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'economics'
  },
  // 'short_answer' | 'stimulus_response' | 'extended_response'
  responseType: {
    type: DataTypes.STRING,
    allowNull: false
  },
  question: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  markValue: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  focusArea: {
    type: DataTypes.STRING,
    allowNull: true
  },
  // Optional library provenance. Free-form CapletMark submissions deliberately
  // leave these null; sourced attempts can be retried in one click.
  sourceResourceId: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  sourcePromptId: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  sourceFocusId: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  studentAnswer: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  estimatedMark: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  band: {
    type: DataTypes.STRING,
    allowNull: false
  },
  strengths: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: []
  },
  gaps: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: []
  },
  terminology: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: []
  },
  modelAnswer: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  nextRecommendation: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'marked_attempts',
  timestamps: true
});

module.exports = MarkedAttempt;
