const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const QUESTION_STATUSES = [
  'draft',
  'in_review',
  'approved',
  'published',
  'superseded',
  'archived',
];

/**
 * One immutable-by-convention version of a question-bank item. questionKey is
 * stable across versions; sourceKey makes repeated imports idempotent; and
 * previousVersionId preserves a traversable provenance chain.
 */
const Question = sequelize.define('Question', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  questionKey: {
    type: DataTypes.STRING(150),
    allowNull: false,
    defaultValue: DataTypes.UUIDV4,
  },
  sourceKey: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  version: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
    validate: { min: 1 },
  },
  previousVersionId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'questions', key: 'id' },
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL',
  },
  editorWorkspaceId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'editor_workspaces', key: 'id' },
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL',
  },
  subject: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  syllabusVersion: {
    type: DataTypes.STRING(50),
    allowNull: true,
  },
  curriculumEditionId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'curriculum_editions', key: 'id' },
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL',
  },
  prompt: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  responseType: {
    type: DataTypes.STRING(50),
    allowNull: false,
  },
  options: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: [],
  },
  answerKey: {
    type: DataTypes.JSONB,
    allowNull: true,
  },
  explanation: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  difficulty: {
    type: DataTypes.STRING(50),
    allowNull: true,
  },
  marks: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
    validate: { min: 1 },
  },
  expectedMinutes: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: { min: 1 },
  },
  commandVerb: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  rubric: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: [],
  },
  modelAnswer: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  misconceptions: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: [],
  },
  source: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: {},
  },
  metadata: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: {},
  },
  lifecycleStatus: {
    type: DataTypes.STRING(30),
    allowNull: false,
    defaultValue: 'draft',
    validate: { isIn: [QUESTION_STATUSES] },
  },
  status: {
    type: DataTypes.VIRTUAL,
    get() {
      return this.getDataValue('lifecycleStatus');
    },
    set(value) {
      this.setDataValue('lifecycleStatus', value);
    },
  },
  publishedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  reviewedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  createdBy: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'users', key: 'id' },
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL',
  },
  reviewedBy: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'users', key: 'id' },
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL',
  },
}, {
  tableName: 'questions',
  timestamps: true,
  indexes: [
    { name: 'questions_key_version_unique', unique: true, fields: ['questionKey', 'version'] },
    { name: 'questions_source_key_unique', unique: true, fields: ['sourceKey'] },
    { name: 'questions_previous_version_unique', unique: true, fields: ['previousVersionId'] },
    { name: 'questions_workspace_updated_idx', fields: ['editorWorkspaceId', 'updatedAt'] },
    {
      name: 'questions_subject_status_difficulty_idx',
      fields: ['subject', 'lifecycleStatus', 'difficulty'],
    },
  ],
});

Question.STATUSES = Object.freeze([...QUESTION_STATUSES]);

module.exports = Question;
