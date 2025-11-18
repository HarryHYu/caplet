const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const FinancialState = sequelize.define('FinancialState', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  netWorth: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0
  },
  monthlyIncome: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0
  },
  monthlyExpenses: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0
  },
  savingsRate: {
    type: DataTypes.DECIMAL(5, 2),
    defaultValue: 0
  },
  accounts: {
    type: DataTypes.TEXT,
    allowNull: true,
    get() {
      const value = this.getDataValue('accounts');
      return value ? JSON.parse(value) : [];
    },
    set(value) {
      this.setDataValue('accounts', JSON.stringify(value));
    }
  },
  debts: {
    type: DataTypes.TEXT,
    allowNull: true,
    get() {
      const value = this.getDataValue('debts');
      return value ? JSON.parse(value) : [];
    },
    set(value) {
      this.setDataValue('debts', JSON.stringify(value));
    }
  },
  goals: {
    type: DataTypes.TEXT,
    allowNull: true,
    get() {
      const value = this.getDataValue('goals');
      return value ? JSON.parse(value) : [];
    },
    set(value) {
      this.setDataValue('goals', JSON.stringify(value));
    }
  },
  summary: {
    type: DataTypes.TEXT,
    allowNull: true,
    defaultValue: ''
  }
}, {
  tableName: 'financial_states',
  timestamps: true
});

module.exports = FinancialState;

