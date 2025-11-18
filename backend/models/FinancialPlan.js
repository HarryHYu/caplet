const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const FinancialPlan = sequelize.define('FinancialPlan', {
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
  checkInId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'check_ins',
      key: 'id'
    },
    onDelete: 'SET NULL'
  },
  budgetAllocation: {
    type: DataTypes.TEXT,
    allowNull: true,
    get() {
      const value = this.getDataValue('budgetAllocation');
      return value ? JSON.parse(value) : {};
    },
    set(value) {
      this.setDataValue('budgetAllocation', JSON.stringify(value));
    }
  },
  savingsStrategy: {
    type: DataTypes.TEXT,
    allowNull: true,
    get() {
      const value = this.getDataValue('savingsStrategy');
      return value ? JSON.parse(value) : {};
    },
    set(value) {
      this.setDataValue('savingsStrategy', JSON.stringify(value));
    }
  },
  debtStrategy: {
    type: DataTypes.TEXT,
    allowNull: true,
    get() {
      const value = this.getDataValue('debtStrategy');
      return value ? JSON.parse(value) : {};
    },
    set(value) {
      this.setDataValue('debtStrategy', JSON.stringify(value));
    }
  },
  goalTimelines: {
    type: DataTypes.TEXT,
    allowNull: true,
    get() {
      const value = this.getDataValue('goalTimelines');
      return value ? JSON.parse(value) : [];
    },
    set(value) {
      this.setDataValue('goalTimelines', JSON.stringify(value));
    }
  },
  actionItems: {
    type: DataTypes.TEXT,
    allowNull: true,
    get() {
      const value = this.getDataValue('actionItems');
      return value ? JSON.parse(value) : [];
    },
    set(value) {
      this.setDataValue('actionItems', JSON.stringify(value));
    }
  },
  insights: {
    type: DataTypes.TEXT,
    allowNull: true,
    get() {
      const value = this.getDataValue('insights');
      return value ? JSON.parse(value) : [];
    },
    set(value) {
      this.setDataValue('insights', JSON.stringify(value));
    }
  }
}, {
  tableName: 'financial_plans',
  timestamps: true
});

module.exports = FinancialPlan;

