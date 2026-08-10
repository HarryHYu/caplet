'use strict';

// Structured, block-based post content (charts, graphs, tables, 3D models,
// code, math, images, sandboxed embeds) — stored as validated JSON, never
// HTML. See backend/services/forumBlocks.js for the schema + validation.
//
// SAFETY: strictly additive, same rule as 049/050. Only ADD COLUMN. down()
// is a no-op — never drop.

async function ensureColumn(queryInterface, tableName, columnName, definition) {
  const columns = await queryInterface.describeTable(tableName);
  if (columns[columnName]) return;
  await queryInterface.addColumn(tableName, columnName, definition);
}

module.exports = {
  async up(queryInterface, Sequelize) {
    await ensureColumn(queryInterface, 'forum_threads', 'contentBlocks', {
      type: Sequelize.TEXT, allowNull: false, defaultValue: '[]',
    });
    await ensureColumn(queryInterface, 'forum_posts', 'contentBlocks', {
      type: Sequelize.TEXT, allowNull: false, defaultValue: '[]',
    });
  },

  async down() {
    // Intentionally a no-op — see the additive-only migration policy above.
  },
};
