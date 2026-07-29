const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

// One completed focus session (Pomodoro or manually logged time).
const StudySession = sequelize.define('StudySession', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  userId: { type: DataTypes.UUID, allowNull: false, references: { model: 'users', key: 'id' } },
  courseId: { type: DataTypes.UUID, allowNull: true },
  label: { type: DataTypes.STRING, allowNull: true },
  durationMins: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  source: { type: DataTypes.STRING, allowNull: false, defaultValue: 'timer' },
}, {
  tableName: 'study_sessions',
  timestamps: true,
  indexes: [{ fields: ['userId', 'createdAt'] }],
});

module.exports = StudySession;
