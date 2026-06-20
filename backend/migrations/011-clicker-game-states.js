// game_states: per-user saved state for the hidden clicker game (one row per
// user per gameKey). Idempotent — only creates the table if absent.
async function tableExists(queryInterface, name) {
  const tables = await queryInterface.showAllTables();
  return tables
    .map((t) => (typeof t === 'string' ? t : t.tableName))
    .map((t) => t.toLowerCase())
    .includes(name.toLowerCase());
}

module.exports = {
  async up(queryInterface, Sequelize) {
    const { DataTypes } = Sequelize;
    if (await tableExists(queryInterface, 'game_states')) return;

    await queryInterface.createTable('game_states', {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      userId: { type: DataTypes.UUID, allowNull: false },
      gameKey: { type: DataTypes.STRING, allowNull: false },
      state: { type: DataTypes.TEXT, allowNull: true },
      createdAt: { type: DataTypes.DATE, allowNull: false },
      updatedAt: { type: DataTypes.DATE, allowNull: false },
    });
    await queryInterface.addIndex('game_states', ['userId', 'gameKey'], {
      name: 'game_states_user_game_idx',
      unique: true,
    });
  },

  async down(queryInterface) {
    if (await tableExists(queryInterface, 'game_states')) {
      await queryInterface.dropTable('game_states');
    }
  },
};
