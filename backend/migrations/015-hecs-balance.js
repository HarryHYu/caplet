/**
 * Migration: add hecsBalance to user_financial_profiles.
 *
 * HECS/HELP is stored as its own whole-dollar INTEGER column (same convention as
 * annualIncome) rather than squeezed into the debts JSON array — it has different
 * fields (income-contingent repayment, annual indexation rather than an interest
 * "rate") that don't fit the { label, balance, rate } debt shape, and the debt
 * sequencing engine needs to reason about it separately. Nullable: a user without
 * a HELP debt simply leaves it empty.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const { DataTypes } = Sequelize;
    await queryInterface.addColumn('user_financial_profiles', 'hecsBalance', {
      type: DataTypes.INTEGER,
      allowNull: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('user_financial_profiles', 'hecsBalance');
  },
};
