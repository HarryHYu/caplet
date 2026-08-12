'use strict';

// Anonymous posting — hides the author's name from peers in the UI.
//
// IMPORTANT: this is pseudonymity toward other students, NOT anonymity from
// staff. authorId is still stored and still returned to moderators/admins,
// because a school forum must keep every post attributable for safeguarding
// (bullying, self-harm disclosures, academic-integrity breaches). The UI
// makes that promise explicit to the poster.
//
// SAFETY: up() is strictly additive in production, same rule as 049–051 —
// ADD COLUMN only. down() exists for explicit rollback and CI rehearsal and
// must fully reverse this migration — it is never run automatically in
// production.

async function ensureColumn(queryInterface, tableName, columnName, definition) {
  const columns = await queryInterface.describeTable(tableName);
  if (columns[columnName]) return;
  await queryInterface.addColumn(tableName, columnName, definition);
}

module.exports = {
  async up(queryInterface, Sequelize) {
    await ensureColumn(queryInterface, 'forum_threads', 'isAnonymous', {
      type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false,
    });
    await ensureColumn(queryInterface, 'forum_posts', 'isAnonymous', {
      type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false,
    });
  },

  async down(queryInterface) {
    // Exact reverse of up(): remove the columns it added. Guarded with
    // describeTable so a partially rolled-back state does not throw.
    for (const tableName of ['forum_threads', 'forum_posts']) {
      const columns = await queryInterface.describeTable(tableName);
      if (columns.isAnonymous) await queryInterface.removeColumn(tableName, 'isAnonymous');
    }
  },
};
