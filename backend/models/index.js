const { sequelize } = require('../config/database');
const User = require('./User');
const Course = require('./Course');
const Lesson = require('./Lesson');
const UserProgress = require('./UserProgress');
const Survey = require('./Survey');
const FinancialState = require('./FinancialState');
const CheckIn = require('./CheckIn');
const FinancialPlan = require('./FinancialPlan');
const Summary = require('./Summary');

// Define associations
Course.hasMany(Lesson, { 
  foreignKey: 'courseId', 
  as: 'lessons',
  onDelete: 'CASCADE'
});
Lesson.belongsTo(Course, { 
  foreignKey: 'courseId', 
  as: 'course'
});

User.hasMany(UserProgress, { 
  foreignKey: 'userId', 
  as: 'progress',
  onDelete: 'CASCADE'
});
UserProgress.belongsTo(User, { 
  foreignKey: 'userId', 
  as: 'user'
});

User.hasOne(FinancialState, {
  foreignKey: 'userId',
  as: 'financialState',
  onDelete: 'CASCADE'
});
FinancialState.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user'
});

User.hasMany(CheckIn, {
  foreignKey: 'userId',
  as: 'checkIns',
  onDelete: 'CASCADE'
});
CheckIn.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user'
});

User.hasMany(FinancialPlan, {
  foreignKey: 'userId',
  as: 'financialPlans',
  onDelete: 'CASCADE'
});
FinancialPlan.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user'
});

User.hasOne(Summary, {
  foreignKey: 'userId',
  as: 'summary',
  onDelete: 'CASCADE'
});
Summary.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user'
});

CheckIn.hasOne(FinancialPlan, {
  foreignKey: 'checkInId',
  as: 'plan',
  onDelete: 'SET NULL'
});
FinancialPlan.belongsTo(CheckIn, {
  foreignKey: 'checkInId',
  as: 'checkIn'
});

Course.hasMany(UserProgress, { 
  foreignKey: 'courseId', 
  as: 'progress',
  onDelete: 'CASCADE'
});
UserProgress.belongsTo(Course, { 
  foreignKey: 'courseId', 
  as: 'course'
});

Lesson.hasMany(UserProgress, { 
  foreignKey: 'lessonId', 
  as: 'progress',
  onDelete: 'CASCADE'
});
UserProgress.belongsTo(Lesson, { 
  foreignKey: 'lessonId', 
  as: 'lesson'
});

// Sync database
const syncDatabase = async () => {
  try {
    await sequelize.sync({ alter: true });
    console.log('✅ Database synchronized successfully');
  } catch (error) {
    console.error('❌ Database sync error:', error);
  }
};

module.exports = {
  sequelize,
  User,
  Course,
  Lesson,
  UserProgress,
  Survey,
  FinancialState,
  CheckIn,
  FinancialPlan,
  Summary,
  syncDatabase
};
