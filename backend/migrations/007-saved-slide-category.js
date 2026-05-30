module.exports = {
  async up(queryInterface, Sequelize) {
    const { DataTypes } = Sequelize;

    // AI-assigned revision category for a flagged slide. Nullable: slides
    // start uncategorized until the user (or auto-trigger) runs categorization.
    await queryInterface.addColumn('saved_slides', 'category', {
      type: DataTypes.STRING,
      allowNull: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('saved_slides', 'category');
  },
};
