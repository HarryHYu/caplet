const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const parseObject = (value) => {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value;
  try { const parsed = value ? JSON.parse(value) : {}; return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {}; } catch { return {}; }
};
const parseArray = (value) => {
  if (Array.isArray(value)) return value;
  try { const parsed = value ? JSON.parse(value) : []; return Array.isArray(parsed) ? parsed : []; } catch { return []; }
};

const EconomicsExamSession = sequelize.define('EconomicsExamSession', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  userId: { type: DataTypes.UUID, allowNull: false },
  packId: { type: DataTypes.STRING, allowNull: false },
  packTitle: { type: DataTypes.STRING, allowNull: false },
  durationMinutes: { type: DataTypes.INTEGER, allowNull: false },
  status: { type: DataTypes.STRING, allowNull: false, defaultValue: 'in_progress' },
  startedAt: { type: DataTypes.DATE, allowNull: false },
  expiresAt: { type: DataTypes.DATE, allowNull: false },
  submittedAt: { type: DataTypes.DATE, allowNull: true },
  questions: { type: DataTypes.TEXT, allowNull: false, defaultValue: '[]', get() { return parseArray(this.getDataValue('questions')); }, set(value) { this.setDataValue('questions', JSON.stringify(parseArray(value))); } },
  answers: { type: DataTypes.TEXT, allowNull: false, defaultValue: '{}', get() { return parseObject(this.getDataValue('answers')); }, set(value) { this.setDataValue('answers', JSON.stringify(parseObject(value))); } },
  results: { type: DataTypes.TEXT, allowNull: false, defaultValue: '[]', get() { return parseArray(this.getDataValue('results')); }, set(value) { this.setDataValue('results', JSON.stringify(parseArray(value))); } },
}, { tableName: 'economics_exam_sessions', timestamps: true });

module.exports = EconomicsExamSession;
