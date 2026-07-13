const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const CurriculumEdition = sequelize.define('CurriculumEdition', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  key: { type: DataTypes.STRING(80), allowNull: false, unique: true },
  jurisdiction: { type: DataTypes.STRING(50), allowNull: false },
  subject: { type: DataTypes.STRING(100), allowNull: false },
  label: { type: DataTypes.STRING(255), allowNull: false },
  officialSyllabusCode: { type: DataTypes.STRING(120), allowNull: true },
  sourceUrl: { type: DataTypes.STRING(500), allowNull: false },
  firstHscCohortYear: { type: DataTypes.INTEGER, allowNull: true },
  lastHscCohortYear: { type: DataTypes.INTEGER, allowNull: true },
  reviewedAt: { type: DataTypes.DATE, allowNull: true },
  active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  metadata: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
}, {
  tableName: 'curriculum_editions',
  timestamps: true,
  indexes: [
    { name: 'curriculum_editions_key_unique', unique: true, fields: ['key'] },
    { name: 'curriculum_editions_subject_active_idx', fields: ['jurisdiction', 'subject', 'active'] },
  ],
});

module.exports = CurriculumEdition;
