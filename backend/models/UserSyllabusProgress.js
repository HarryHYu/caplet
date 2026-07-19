const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const UserSyllabusProgress = sequelize.define('UserSyllabusProgress', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  userId: { type: DataTypes.UUID, allowNull: false },
  syllabusPointId: { type: DataTypes.UUID, allowNull: false },
  masteryLevel: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    validate: { min: 0, max: 100 },
  },
  practiceCount: { type: DataTypes.INTEGER, defaultValue: 0 },
  correctCount: { type: DataTypes.INTEGER, defaultValue: 0 },
  consecutiveWrong: { type: DataTypes.INTEGER, defaultValue: 0 },
  lessonSeen: { type: DataTypes.BOOLEAN, defaultValue: false },
  lastPracticed: { type: DataTypes.DATE, allowNull: true },
  // { recall: {p,c}, application: {p,c}, calculation: {p,c} } — p attempts, c correct
  typeStats: { type: DataTypes.JSON, allowNull: true },
}, {
  tableName: 'user_syllabus_progress',
});

module.exports = UserSyllabusProgress;
