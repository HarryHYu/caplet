module.exports = {
  async up(queryInterface, Sequelize) {
    const { DataTypes } = Sequelize;

    // Stores the user's selected avatar options as a JSON string.
    // Nullable + additive: existing users simply have no avatar config yet
    // and fall back to a default avatar.
    await queryInterface.addColumn('users', 'avatarConfig', {
      type: DataTypes.TEXT,
      allowNull: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('users', 'avatarConfig');
  },
};
