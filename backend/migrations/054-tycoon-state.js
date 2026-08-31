'use strict';

// Typewriter tycoon: one row per user holding their persistent game state
// (balance, typewriter tier, upgrade levels, pets, lifetime words). The whole
// game state is a JSONB blob — the economy's shape iterates quickly and every
// field is server-computed, so a rigid schema buys nothing. Chat and party
// membership remain memory-only and never touch the database.
//
// SAFETY: up() is strictly additive in production — it only creates the
// table. down() exists for explicit rollback and CI rehearsal only.

async function tableExists(queryInterface, tableName) {
  const tables = await queryInterface.showAllTables();
  return tables.some((table) => {
    if (typeof table === 'string') return table === tableName;
    return table?.tableName === tableName || table?.name === tableName;
  });
}

module.exports = {
  async up(queryInterface, Sequelize) {
    if (await tableExists(queryInterface, 'tycoon_states')) return;
    await queryInterface.createTable('tycoon_states', {
      userId: {
        type: Sequelize.UUID,
        primaryKey: true,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onDelete: 'CASCADE',
      },
      state: { type: Sequelize.JSONB, allowNull: false, defaultValue: {} },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });
  },

  async down(queryInterface) {
    if (await tableExists(queryInterface, 'tycoon_states')) {
      await queryInterface.dropTable('tycoon_states');
    }
  },
};
