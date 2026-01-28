const { sequelize } = require('../config/database');
const User = require('./User');
const Course = require('./Course');
const Lesson = require('./Lesson');
const UserProgress = require('./UserProgress');
const Survey = require('./Survey');

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
  syncDatabase
};
