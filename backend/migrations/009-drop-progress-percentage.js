/**
 * Migration: drop user_progress.progressPercentage
 *
 * The column was defined in the initial schema but was never written to —
 * every row has been 0.00 since day one. The actual course completion
 * percentage is computed on-the-fly in GET /progress/course/:id and is
 * not stored. Keeping a column that is always wrong is confusing, so we
 * drop it here.
 *
 * The frontend "Continue Learning" progress bar now computes the percentage
 * directly from the courses context (completed lessons / total lessons).
 */

module.exports = {
  async up(queryInterface) {
    const tables = await queryInterface.showAllTables();
    if (!tables.includes('user_progress')) return;

    const cols = await queryInterface.describeTable('user_progress');
    if (cols.progressPercentage) {
      await queryInterface.removeColumn('user_progress', 'progressPercentage');
    }
  },

  async down(queryInterface, Sequelize) {
    const { DataTypes } = Sequelize;
    await queryInterface.addColumn('user_progress', 'progressPercentage', {
      type: DataTypes.DECIMAL(5, 2),
      defaultValue: 0.00,
      allowNull: false,
    });
  },
};
