const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * Polymorphic mapping from versioned learning content to a syllabus outcome.
 * contentId is a string so both database UUIDs and stable catalogue identifiers
 * can be mapped without coupling the curriculum graph to one content system.
 */
const ContentOutcome = sequelize.define('ContentOutcome', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  contentType: {
    type: DataTypes.STRING(50),
    allowNull: false,
  },
  contentId: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  contentVersion: {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: '1',
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
  tableName: 'content_outcomes',
  timestamps: true,
  indexes: [
    {
      name: 'content_outcomes_content_version_outcome_unique',
      unique: true,
      fields: ['contentType', 'contentId', 'contentVersion', 'outcomeId'],
    },
    {
      name: 'content_outcomes_outcome_type_idx',
      fields: ['outcomeId', 'contentType'],
    },
  ],
});

module.exports = ContentOutcome;
