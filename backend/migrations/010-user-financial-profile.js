/**
 * Migration: create the user_financial_profiles table (1:1 with users).
 *
 * Stores a user's current financial snapshot — income/savings/super as whole
 * AUD dollars (INTEGER), plus debts/goals as JSON TEXT. A fresh table, unrelated
 * to the legacy financial-advisor tables dropped in 004-drop-financial-tables.js.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const { DataTypes } = Sequelize;

    await queryInterface.createTable('user_financial_profiles', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      userId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      annualIncome: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      savingsBalance: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      superBalance: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      monthlyExpenses: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      currency: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'AUD'
      },
      debts: {
        type: DataTypes.TEXT,
        allowNull: false,
        defaultValue: '[]'
      },
      goals: {
        type: DataTypes.TEXT,
        allowNull: false,
        defaultValue: '[]'
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      }
    });

    // Unique index enforces the 1:1 relationship and guards the upsert race.
    await queryInterface.addIndex('user_financial_profiles', ['userId'], {
      unique: true,
      name: 'user_financial_profiles_user_id_unique'
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('user_financial_profiles');
  }
};
