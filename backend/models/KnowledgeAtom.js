const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const KnowledgeAtom = sequelize.define('KnowledgeAtom', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  subject: {
    type: DataTypes.STRING(200),
    allowNull: false,
  },
  concept: {
    type: DataTypes.STRING(300),
    allowNull: false,
  },
  masteryLevel: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 30,
    validate: { min: 0, max: 100 },
  },
  lastReviewed: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
  reviewCount: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
  aiNotes: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  source: {
    type: DataTypes.STRING(50),
    allowNull: true,
    defaultValue: 'debrief',
  },
}, {
  tableName: 'knowledge_atoms',
});

module.exports = KnowledgeAtom;
