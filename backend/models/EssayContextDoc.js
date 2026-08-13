const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * A document in an essay's context library — the grounding material the
 * workspace AI chat must answer from first (see services/essayAssistant.js).
 *
 * `content` is the verbatim text the student supplied: pasted notes
 * (kind 'text') or text extracted from a PDF on the client (kind 'pdf').
 * List endpoints never return `content` — only its length and a short
 * preview — because a single document can be 150k characters.
 *
 * Private to the owning user (every query is scoped by userId) and removed
 * with the essay via FK CASCADE.
 */
const EssayContextDoc = sequelize.define('EssayContextDoc', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  essayId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  title: {
    type: DataTypes.STRING(160),
    allowNull: false
  },
  kind: {
    type: DataTypes.STRING(8),
    allowNull: false,
    defaultValue: 'text' // 'text' | 'pdf'
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false
  }
}, {
  tableName: 'essay_context_docs',
  timestamps: true
});

module.exports = EssayContextDoc;
