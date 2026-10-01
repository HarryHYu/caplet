const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * One financial-literacy survey response (temporary research feature).
 * Unique per email: resubmitting replaces your previous answers instead of
 * stacking duplicates. The matching Caplet account (if the respondent made
 * one) lives in users; this row only remembers that it happened.
 */
const FinSurveyResponse = sequelize.define('FinSurveyResponse', {
  id: {
    type: DataTypes.UUID,
    primaryKey: true,
    allowNull: false,
    defaultValue: DataTypes.UUIDV4,
  },
  name: { type: DataTypes.STRING(120), allowNull: false },
  email: { type: DataTypes.STRING(255), allowNull: false, unique: true },
  school: { type: DataTypes.STRING(160), allowNull: true },
  answers: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
  accountCreated: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
}, {
  tableName: 'fin_survey_responses',
  timestamps: true,
});

module.exports = FinSurveyResponse;
