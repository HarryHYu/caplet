const { DataTypes } = require('sequelize');
const sequelize = require('../config/database').sequelize;

const Survey = sequelize.define('Survey', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  age: {
    type: DataTypes.STRING,
    allowNull: false
  },
  tracksSpending: {
    type: DataTypes.ENUM('yes', 'no'),
    allowNull: false
  },
  taughtAtSchool: {
    type: DataTypes.ENUM('yes', 'no'),
    allowNull: false
  },
  confidence: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 1,
      max: 10
    }
  },
  termsConfusing: {
    type: DataTypes.ENUM('yes', 'no'),
    allowNull: false
  },
  helpfulExplanations: {
    type: DataTypes.TEXT,
    allowNull: false,
    get() {
      const value = this.getDataValue('helpfulExplanations');
      return value ? JSON.parse(value) : [];
    },
    set(value) {
      this.setDataValue('helpfulExplanations', JSON.stringify(value));
    }
  }
}, {
  tableName: 'surveys',
  timestamps: true
});

module.exports = Survey;

