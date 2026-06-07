module.exports = {
  async up(queryInterface, Sequelize) {
    const { DataTypes } = Sequelize;

    // Per-user saved state for any game in the Games section. `gameKey`
    // namespaces each game (e.g. "clicker"), so one table scales to many games.
    await queryInterface.createTable('game_states', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      userId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      gameKey: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      // JSON blob of the game's saved state.
      state: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    });

    await queryInterface.addIndex('game_states', ['userId'], {
      name: 'game_states_user_id_idx',
    });
    // One saved state per (user, game).
    await queryInterface.addConstraint('game_states', {
      fields: ['userId', 'gameKey'],
      type: 'unique',
      name: 'game_states_user_game_unique',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('game_states');
  },
};
