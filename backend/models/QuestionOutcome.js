const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const QuestionOutcome = sequelize.define('QuestionOutcome', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  questionId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'questions', key: 'id' },
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
  isPrimary: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
  weight: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 1,
    validate: { min: 0 },
  },
  metadata: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: {},
  },
}, {
  tableName: 'question_outcomes',
  timestamps: true,
  indexes: [
    {
      name: 'question_outcomes_question_outcome_unique',
      unique: true,
      fields: ['questionId', 'outcomeId'],
    },
    {
      name: 'question_outcomes_outcome_primary_idx',
      fields: ['outcomeId', 'isPrimary'],
    },
  ],
});

module.exports = QuestionOutcome;
