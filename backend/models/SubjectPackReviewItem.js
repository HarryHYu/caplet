const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const SubjectPackReviewItem = sequelize.define('SubjectPackReviewItem', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  subjectPackId: { type: DataTypes.UUID, allowNull: false },
  reviewKey: { type: DataTypes.STRING(180), allowNull: false },
  itemType: { type: DataTypes.STRING(50), allowNull: false },
  entityType: { type: DataTypes.STRING(50), allowNull: true },
  entityId: { type: DataTypes.STRING(255), allowNull: true },
  title: { type: DataTypes.STRING(255), allowNull: false },
  summary: { type: DataTypes.TEXT, allowNull: true },
  severity: { type: DataTypes.STRING(30), allowNull: false, defaultValue: 'decision' },
  status: { type: DataTypes.STRING(30), allowNull: false, defaultValue: 'open' },
  sourceCitation: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
  decisionOptions: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
  selectedOption: { type: DataTypes.STRING(120), allowNull: true },
  resolution: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
  resolvedBy: { type: DataTypes.UUID, allowNull: true },
  resolvedAt: { type: DataTypes.DATE, allowNull: true },
  sortOrder: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  metadata: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
}, {
  tableName: 'subject_pack_review_items',
  timestamps: true,
  indexes: [
    { name: 'subject_pack_review_items_key_unique', unique: true, fields: ['subjectPackId', 'reviewKey'] },
    { name: 'subject_pack_review_items_queue_idx', fields: ['subjectPackId', 'status', 'sortOrder'] },
  ],
});

module.exports = SubjectPackReviewItem;
