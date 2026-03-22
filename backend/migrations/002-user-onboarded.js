/**
 * Migration: Add onboarding fields to Users table
 * Description: Adds onboarded boolean flag and onboardingData JSON field to track user onboarding status
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    const { DataTypes } = Sequelize;

    await queryInterface.addColumn('users', 'onboarded', {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false
    });

    await queryInterface.addColumn('users', 'onboardingData', {
      type: DataTypes.TEXT,
      allowNull: true
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('users', 'onboarded');
    await queryInterface.removeColumn('users', 'onboardingData');
  }
};
