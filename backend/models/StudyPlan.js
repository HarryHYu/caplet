const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * A student's current seven-day plan and the inputs used to build it.
 * JSON values use explicit getters/setters for SQLite/Postgres parity.
 */
const StudyPlan = sequelize.define('StudyPlan', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userId: { type: DataTypes.UUID, allowNull: false, unique: true },
  yearLevel: { type: DataTypes.STRING, allowNull: false },
  subjects: {
    type: DataTypes.TEXT,
    allowNull: false,
    defaultValue: '[]',
    get() { return parseArray(this.getDataValue('subjects')); },
    set(value) { this.setDataValue('subjects', JSON.stringify(parseArray(value))); }
  },
  goal: { type: DataTypes.STRING(200), allowNull: false },
  examDates: {
    type: DataTypes.TEXT,
    allowNull: false,
    defaultValue: '{}',
    get() { return parseObject(this.getDataValue('examDates')); },
    set(value) { this.setDataValue('examDates', JSON.stringify(parseObject(value))); }
  },
  availableDays: {
    type: DataTypes.TEXT,
    allowNull: false,
    defaultValue: '[]',
    get() { return parseArray(this.getDataValue('availableDays')); },
    set(value) { this.setDataValue('availableDays', JSON.stringify(parseArray(value))); }
  },
  minutesPerDay: { type: DataTypes.INTEGER, allowNull: false },
  diagnosticAnswers: {
    type: DataTypes.TEXT,
    allowNull: false,
    defaultValue: '{}',
    get() { return parseObject(this.getDataValue('diagnosticAnswers')); },
    set(value) { this.setDataValue('diagnosticAnswers', JSON.stringify(parseObject(value))); }
  },
  weakTopics: {
    type: DataTypes.TEXT,
    allowNull: false,
    defaultValue: '[]',
    get() { return parseArray(this.getDataValue('weakTopics')); },
    set(value) { this.setDataValue('weakTopics', JSON.stringify(parseArray(value))); }
  },
  tasks: {
    type: DataTypes.TEXT,
    allowNull: false,
    defaultValue: '[]',
    get() { return parseArray(this.getDataValue('tasks')); },
    set(value) { this.setDataValue('tasks', JSON.stringify(parseArray(value))); }
  },
  sourceFingerprint: { type: DataTypes.STRING, allowNull: true },
  signalSummary: { type: DataTypes.STRING(255), allowNull: true },
  generatedAt: { type: DataTypes.DATE, allowNull: false }
}, {
  tableName: 'study_plans',
  timestamps: true
});

function parseArray(value) {
  if (Array.isArray(value)) return value;
  try {
    const parsed = value ? JSON.parse(value) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function parseObject(value) {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value;
  try {
    const parsed = value ? JSON.parse(value) : {};
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

module.exports = StudyPlan;
