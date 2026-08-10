'use strict';

// Anonymous posting — hides the author's name from peers in the UI.
//
// IMPORTANT: this is pseudonymity toward other students, NOT anonymity from
// staff. authorId is still stored and still returned to moderators/admins,
// because a school forum must keep every post attributable for safeguarding
// (bullying, self-harm disclosures, academic-integrity breaches). The UI
// makes that promise explicit to the poster.
//
// SAFETY: strictly additive, same rule as 049–051. ADD COLUMN only, and
// down() is a no-op — never drop.

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

  async down() {
    // Intentionally a no-op — see the additive-only migration policy above.
  },
};
