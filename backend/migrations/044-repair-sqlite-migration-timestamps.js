'use strict';

module.exports = {
  async up(queryInterface) {
    if (queryInterface.sequelize.getDialect() !== 'sqlite') return;
    for (const table of ['curriculum_editions', 'curriculum_outcomes', 'questions']) {
      await queryInterface.sequelize.query(
        `UPDATE "${table}"
         SET "updatedAt" = strftime('%Y-%m-%d %H:%M:%f +00:00', "updatedAt" / 1000.0, 'unixepoch')
         WHERE typeof("updatedAt") IN ('integer', 'real')`,
      );
    }
  },

  async down() {
    // Data repair only: restoring invalid numeric DATE values would make the
    // affected records unreadable by Sequelize again.
  },
};
