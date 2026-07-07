const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * A user's personal financial snapshot (current values only — no history).
 *
 * Money fields are stored as whole-dollar INTEGERs (AUD). INTEGER is used over
 * DECIMAL because it round-trips identically across the SQLite (dev) / Postgres
 * (prod) split this app straddles, and the profile grain doesn't need cents.
 *
 * `debts` and `goals` are JSON arrays stored as TEXT (the same pattern as
 * User.preferences) so they work on both SQLite and Postgres:
 *   debts: [{ label: string, balance: number, rate: number, type?: 'credit_card'|'bnpl'|'personal_loan'|'other' }]
 *   goals: [{ label: string, target: number }]
 *
 * `hecsBalance` is a separate whole-dollar INTEGER column (not part of `debts`)
 * because HECS/HELP behaves differently from ordinary debt — indexed once a year,
 * income-contingent repayment, no interest "rate". See services/debtEngine.js.
 */
const UserFinancialProfile = sequelize.define('UserFinancialProfile', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    unique: true
  },
  annualIncome: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  hecsBalance: {
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
    defaultValue: '[]',
    get() {
      const value = this.getDataValue('debts');
      try {
        const parsed = value ? JSON.parse(value) : [];
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    },
    set(value) {
      this.setDataValue('debts', JSON.stringify(Array.isArray(value) ? value : []));
    }
  },
  goals: {
    type: DataTypes.TEXT,
    allowNull: false,
    defaultValue: '[]',
    get() {
      const value = this.getDataValue('goals');
      try {
        const parsed = value ? JSON.parse(value) : [];
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    },
    set(value) {
      this.setDataValue('goals', JSON.stringify(Array.isArray(value) ? value : []));
    }
  }
}, {
  tableName: 'user_financial_profiles',
  timestamps: true
});

module.exports = UserFinancialProfile;
