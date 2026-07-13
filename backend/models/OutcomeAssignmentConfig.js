const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

// Define the JSON-backed attributes explicitly. SQLite and PostgreSQL then share
// identical behaviour, while callers always see arrays/objects.
const OutcomeAssignmentConfig = sequelize.define('OutcomeAssignmentConfig', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  assignmentId: {
    type: DataTypes.UUID,
    allowNull: false,
    unique: true,
    references: { model: 'assignments', key: 'id' },
    onDelete: 'CASCADE',
  },
  createdBy: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'users', key: 'id' },
    onDelete: 'CASCADE',
  },
  mode: {
    type: DataTypes.STRING(32),
    allowNull: false,
    defaultValue: 'practice',
    validate: {
      isIn: [[
        'diagnostic',
        'practice',
        'revision',
        'exam',
        'remediation',
        'adaptive',
      ]],
    },
  },
  outcomeIds: {
    type: DataTypes.TEXT,
    allowNull: false,
    defaultValue: '[]',
    get() {
      const raw = this.getDataValue('outcomeIds');
      if (Array.isArray(raw)) return raw;
      try { return JSON.parse(raw || '[]'); } catch { return []; }
    },
    set(value) {
      this.setDataValue('outcomeIds', JSON.stringify(Array.isArray(value) ? value : []));
    },
  },
  questionIds: {
    type: DataTypes.TEXT,
    allowNull: false,
    defaultValue: '[]',
    get() {
      const raw = this.getDataValue('questionIds');
      if (Array.isArray(raw)) return raw;
      try { return JSON.parse(raw || '[]'); } catch { return []; }
    },
    set(value) {
      this.setDataValue('questionIds', JSON.stringify(Array.isArray(value) ? value : []));
    },
  },
  questionSelection: {
    type: DataTypes.TEXT,
    allowNull: false,
    defaultValue: '{}',
    get() {
      const raw = this.getDataValue('questionSelection');
      if (raw && typeof raw === 'object') return raw;
      try { return JSON.parse(raw || '{}'); } catch { return {}; }
    },
    set(value) {
      this.setDataValue('questionSelection', JSON.stringify(value && typeof value === 'object' ? value : {}));
    },
  },
  targetStudentIds: {
    type: DataTypes.TEXT,
    allowNull: false,
    defaultValue: '[]',
    get() {
      const raw = this.getDataValue('targetStudentIds');
      if (Array.isArray(raw)) return raw;
      try { return JSON.parse(raw || '[]'); } catch { return []; }
    },
    set(value) {
      this.setDataValue('targetStudentIds', JSON.stringify(Array.isArray(value) ? value : []));
    },
  },
}, {
  tableName: 'outcome_assignment_configs',
  timestamps: true,
  indexes: [
    { fields: ['createdBy', 'createdAt'] },
    { fields: ['mode'] },
  ],
});

module.exports = OutcomeAssignmentConfig;
