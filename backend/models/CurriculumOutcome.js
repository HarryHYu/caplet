const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * A versioned syllabus outcome. Outcomes form a self-referencing hierarchy so
 * a syllabus can be represented from broad strands down to assessable skills.
 * The composite natural key keeps successive syllabus versions independent.
 */
const CurriculumOutcome = sequelize.define('CurriculumOutcome', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  jurisdiction: {
    type: DataTypes.STRING(50),
    allowNull: false,
  },
  subject: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  syllabusCode: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  syllabusVersion: {
    type: DataTypes.STRING(50),
    allowNull: false,
  },
  curriculumEditionId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'curriculum_editions', key: 'id' },
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL',
  },
  code: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  title: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  parentId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'curriculum_outcomes', key: 'id' },
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL',
  },
  yearLevel: {
    type: DataTypes.STRING(50),
    allowNull: true,
  },
  prerequisites: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: [],
  },
  sortOrder: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
  isAssessable: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  },
  metadata: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: {},
  },
}, {
  tableName: 'curriculum_outcomes',
  timestamps: true,
  indexes: [
    {
      name: 'curriculum_outcomes_syllabus_code_unique',
      unique: true,
      fields: ['jurisdiction', 'subject', 'syllabusVersion', 'code'],
    },
    {
      name: 'curriculum_outcomes_hierarchy_idx',
      fields: ['jurisdiction', 'subject', 'syllabusVersion', 'parentId', 'sortOrder'],
    },
    {
      name: 'curriculum_outcomes_subject_assessable_idx',
      fields: ['subject', 'syllabusVersion', 'isAssessable'],
    },
  ],
});

module.exports = CurriculumOutcome;
