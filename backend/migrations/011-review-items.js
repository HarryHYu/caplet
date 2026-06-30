/**
 * Migration: create the review_items table — the storage behind the shared
 * spaced-repetition scheduler (backend/services/srsScheduler.js).
 *
 * One row per (user, itemType, itemId): a single reviewable item is scheduled
 * once per user, enforced by a composite unique index.
 *
 * `itemId` is a STRING (not UUID) so it can hold a raw SavedSlide UUID or a
 * composite key for items embedded in JSONB (essay paragraphs / quotes), and
 * so no FK is declared on it. `userId` does reference users(id) with CASCADE.
 *
 * JSONB is not used here; all columns are portable across the Postgres (prod)
 * and SQLite (dev) dialects.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const { DataTypes } = Sequelize;

    await queryInterface.createTable('review_items', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      userId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      itemType: {
        type: DataTypes.STRING,
        allowNull: false
      },
      itemId: {
        type: DataTypes.STRING,
        allowNull: false
      },
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
      lastRecall: {
        type: DataTypes.STRING,
        allowNull: true
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      }
    });

    // One schedule per item per user.
    await queryInterface.addConstraint('review_items', {
      fields: ['userId', 'itemType', 'itemId'],
      type: 'unique',
      name: 'review_items_user_type_item_unique'
    });

    // Fast "what's due for this user" lookups.
    await queryInterface.addIndex('review_items', ['userId', 'nextDueAt'], {
      name: 'review_items_user_due_idx'
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('review_items');
  }
};
