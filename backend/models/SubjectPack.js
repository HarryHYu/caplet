const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const LIFECYCLE_STATUSES = ['draft', 'in_review', 'ready', 'published', 'archived'];

const SubjectPack = sequelize.define('SubjectPack', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  key: { type: DataTypes.STRING(160), allowNull: false, unique: true },
  slug: { type: DataTypes.STRING(160), allowNull: false },
  version: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1, validate: { min: 1 } },
  title: { type: DataTypes.STRING(255), allowNull: false },
  description: { type: DataTypes.TEXT, allowNull: true },
  jurisdiction: { type: DataTypes.STRING(50), allowNull: false },
  subject: { type: DataTypes.STRING(100), allowNull: false },
  syllabusVersion: { type: DataTypes.STRING(80), allowNull: false },
  curriculumEditionId: { type: DataTypes.UUID, allowNull: false },
  createdBy: { type: DataTypes.UUID, allowNull: true },
  lifecycleStatus: {
    type: DataTypes.STRING(30),
    allowNull: false,
    defaultValue: 'draft',
    validate: { isIn: [LIFECYCLE_STATUSES] },
  },
  sourceDocuments: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
  readiness: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
  metadata: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
  reviewedAt: { type: DataTypes.DATE, allowNull: true },
  publishedAt: { type: DataTypes.DATE, allowNull: true },
}, {
  tableName: 'subject_packs',
  timestamps: true,
  indexes: [
    { name: 'subject_packs_slug_version_unique', unique: true, fields: ['slug', 'version'] },
    { name: 'subject_packs_owner_status_idx', fields: ['createdBy', 'lifecycleStatus'] },
  ],
});

SubjectPack.LIFECYCLE_STATUSES = Object.freeze([...LIFECYCLE_STATUSES]);
module.exports = SubjectPack;
