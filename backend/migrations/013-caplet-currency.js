module.exports = {
  async up(queryInterface, Sequelize) {
    const { DataTypes } = Sequelize;

    // Account-level "soft" currency, earned by completing lessons.
    await queryInterface.addColumn('users', 'capletCoins', {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    });

    // Account-level "hard"/premium currency (intended for microtransactions).
    // Balance only for now — no purchase flow yet.
    await queryInterface.addColumn('users', 'capletGems', {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('users', 'capletGems');
    await queryInterface.removeColumn('users', 'capletCoins');
  },
};
