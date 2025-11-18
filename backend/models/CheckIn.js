const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const CheckIn = sequelize.define('CheckIn', {
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
  majorEvents: {
    type: DataTypes.TEXT,
    allowNull: true,
    get() {
      const value = this.getDataValue('majorEvents');
      return value ? JSON.parse(value) : [];
    },
    set(value) {
      this.setDataValue('majorEvents', JSON.stringify(value));
    }
  },
  monthlyExpenses: {
    type: DataTypes.TEXT,
    allowNull: true,
    get() {
      const value = this.getDataValue('monthlyExpenses');
      return value ? JSON.parse(value) : {};
    },
    set(value) {
      this.setDataValue('monthlyExpenses', JSON.stringify(value));
    }
  },
  goalsUpdate: {
    type: DataTypes.TEXT,
    allowNull: true,
    get() {
      const value = this.getDataValue('goalsUpdate');
      return value ? JSON.parse(value) : [];
    },
    set(value) {
      this.setDataValue('goalsUpdate', JSON.stringify(value));
    }
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'check_ins',
  timestamps: true
});

module.exports = CheckIn;

