const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * A paragraph-level annotation on an essay in the workspace.
 *
 * `paragraphIndex` is the 0-based index into parsedStructure.bodyParagraphs.
 * `anchor` is an optional verbatim snippet of that paragraph the note points
 * at ('' anchors the whole paragraph) — AI-proposed anchors are snapped to
 * exact source slices before they ever reach this table.
 *
 * kind: 'note' (student-written) | 'explanation' (AI paragraph summary from
 * POST /api/essays/:id/explain — at most one per paragraph; re-running the
 * explain endpoint replaces it).
 * source: 'user' | 'ai' — every annotation created through POST /annotations
 * is 'user' (AI chat proposals are only persisted by an explicit student
 * action); only the explain endpoint writes 'ai' rows.
 */
const EssayAnnotation = sequelize.define('EssayAnnotation', {
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
  paragraphIndex: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  anchor: {
    type: DataTypes.TEXT,
    allowNull: false,
    defaultValue: ''
  },
  note: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  kind: {
    type: DataTypes.STRING(16),
    allowNull: false,
    defaultValue: 'note' // 'note' | 'explanation'
  },
  source: {
    type: DataTypes.STRING(8),
    allowNull: false,
    defaultValue: 'user' // 'user' | 'ai'
  }
}, {
  tableName: 'essay_annotations',
  timestamps: true
});

module.exports = EssayAnnotation;
