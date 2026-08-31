'use strict';

// Typewriter tycoon save slots: parked runs, like save files in any game.
// The ACTIVE run stays in tycoon_states (one per user, hot path untouched);
// this table holds the runs a player has shelved — named, loadable, and
// deletable from the panel's Games menu. State is the same server-written
// JSONB blob shape as tycoon_states.
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
    if (await tableExists(queryInterface, 'tycoon_saves')) return;
    await queryInterface.createTable('tycoon_saves', {
      id: { type: Sequelize.UUID, primaryKey: true, allowNull: false },
      userId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onDelete: 'CASCADE',
      },
      name: { type: Sequelize.STRING(40), allowNull: false, defaultValue: 'Saved run' },
      state: { type: Sequelize.JSONB, allowNull: false, defaultValue: {} },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });
    await queryInterface.addIndex('tycoon_saves', ['userId']);
  },

  async down(queryInterface) {
    if (await tableExists(queryInterface, 'tycoon_saves')) {
      await queryInterface.dropTable('tycoon_saves');
    }
  },
};
