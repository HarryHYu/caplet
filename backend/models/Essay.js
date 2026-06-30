const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * A student's essay, stored privately for memorisation practice.
 *
 * `originalText` is the verbatim text the student supplied (pasted or extracted
 * from a PDF on the client). `parsedStructure` is the AI segmentation —
 * SEGMENTATION AND ANNOTATION ONLY, never a rewrite of the student's words:
 *
 *   {
 *     thesis: string,
 *     bodyParagraphs: [{
 *       topicSentence: string,
 *       text: string,
 *       quotes: [{ text: string, highLeverage: boolean }],
 *       techniques: [string]
 *     }],
 *     conclusion: string
 *   }
 *
 * Stored as JSONB to mirror Lesson.slides (Sequelize returns it as a native
 * object; on the SQLite dev fallback JSONB is transparently stored as TEXT).
 * It is null until the essay has been parsed (POST /api/essays/:id/parse).
 */
const Essay = sequelize.define('Essay', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  originalText: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  parsedStructure: {
    type: DataTypes.JSONB,
    allowNull: true
  }
}, {
  tableName: 'essays',
  timestamps: true
});

module.exports = Essay;
