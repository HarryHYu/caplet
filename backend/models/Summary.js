const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Summary = sequelize.define('Summary', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    unique: true, // One summary per user
    references: {
      model: 'users',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false,
    defaultValue: ''
  }
}, {
  tableName: 'summaries',
  timestamps: true
});

module.exports = Summary;

