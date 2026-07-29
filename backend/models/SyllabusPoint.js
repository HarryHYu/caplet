const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const SyllabusPoint = sequelize.define('SyllabusPoint', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  code: {
    type: DataTypes.STRING(30),
    allowNull: false,
    unique: true,
    validate: { notEmpty: true },
  },
  subject: {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: 'Physics',
  },
  year: { type: DataTypes.INTEGER, allowNull: false },
  module: { type: DataTypes.INTEGER, allowNull: false },
  moduleName: { type: DataTypes.STRING(100), allowNull: false },
  topic: { type: DataTypes.STRING(150), allowNull: false },
  inquiryQuestion: { type: DataTypes.TEXT, allowNull: true },
  dotPoint: { type: DataTypes.TEXT, allowNull: false },
  weight: { type: DataTypes.INTEGER, defaultValue: 1 },
  orderIndex: { type: DataTypes.INTEGER, defaultValue: 0 },
}, {
  tableName: 'syllabus_points',
});

module.exports = SyllabusPoint;
