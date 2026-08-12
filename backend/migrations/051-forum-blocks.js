'use strict';

// Structured, block-based post content (charts, graphs, tables, 3D models,
// code, math, images, sandboxed embeds) — stored as validated JSON, never
// HTML. See backend/services/forumBlocks.js for the schema + validation.
//
// SAFETY: up() is strictly additive in production, same rule as 049/050 —
// only ADD COLUMN. down() exists for explicit rollback and CI rehearsal and
// must fully reverse this migration — it is never run automatically in
// production.

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

  async down(queryInterface) {
    // Exact reverse of up(): remove the columns it added. Guarded with
    // describeTable so a partially rolled-back state does not throw.
    for (const tableName of ['forum_threads', 'forum_posts']) {
      const columns = await queryInterface.describeTable(tableName);
      if (columns.contentBlocks) await queryInterface.removeColumn(tableName, 'contentBlocks');
    }
  },
};
