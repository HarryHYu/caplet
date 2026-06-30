const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * A scheduled, spaced-repetition review for a single reviewable item belonging
 * to one user. Generic on purpose: `itemType` distinguishes the kind of thing
 * being scheduled and `itemId` references the underlying item.
 *
 *   itemType: 'savedSlide'      itemId: the SavedSlide UUID
 *   itemType: 'essayParagraph'  itemId: `${essayId}:${paragraphIndex}`
 *   itemType: 'quote'           itemId: `${essayId}:q:${paragraphIndex}:${quoteIndex}`
 *
 * `itemId` is a STRING (not a UUID) so it can hold either a raw UUID or a
 * composite key for items that live inside a JSONB blob rather than their own
 * table. A new reviewable kind can be added without a migration.
 *
 * Scheduling math lives in backend/services/srsScheduler.js (a pure function);
 * this model only stores the resulting state.
 */
const ReviewItem = sequelize.define('ReviewItem', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  // Kind of reviewable item: 'savedSlide' | 'essayParagraph' | 'quote' (extensible).
  itemType: {
    type: DataTypes.STRING,
    allowNull: false
  },
  // Reference to the underlying item (UUID or composite key — see header).
  itemId: {
    type: DataTypes.STRING,
    allowNull: false
  },
  // Ladder index: 0 -> 1d, 1 -> 3d, 2 -> 7d, 3 -> 14d.
  stage: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  nextDueAt: {
    type: DataTypes.DATE,
    allowNull: false
  },
  lastReviewedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  // Result of the most recent recall: 'pass' | 'fail'.
  lastRecall: {
    type: DataTypes.STRING,
    allowNull: true
  }
}, {
  tableName: 'review_items',
  timestamps: true
  // Indexes/constraints (the composite unique on userId+itemType+itemId and the
  // due-lookup index) live in migration 011-review-items.js, which is the source
  // of truth for schema — matching the SavedSlide convention.
});

module.exports = ReviewItem;
