const { sequelize } = require('../config/database');
const User = require('./User');
const Course = require('./Course');
const Lesson = require('./Lesson');
const UserProgress = require('./UserProgress');
const Survey = require('./Survey');
const Classroom = require('./Classroom');
const ClassMembership = require('./ClassMembership');
const Assignment = require('./Assignment');
const AssignmentSubmission = require('./AssignmentSubmission');
const ClassAnnouncement = require('./ClassAnnouncement');

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

// Classroom relationships
User.hasMany(Classroom, {
  foreignKey: 'createdBy',
  as: 'createdClasses',
  onDelete: 'CASCADE',
});
Classroom.belongsTo(User, {
  foreignKey: 'createdBy',
  as: 'creator',
});

Classroom.hasMany(ClassMembership, {
  foreignKey: 'classroomId',
  as: 'memberships',
  onDelete: 'CASCADE',
});
ClassMembership.belongsTo(Classroom, {
  foreignKey: 'classroomId',
  as: 'classroom',
});

User.hasMany(ClassMembership, {
  foreignKey: 'userId',
  as: 'classMemberships',
  onDelete: 'CASCADE',
});
ClassMembership.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user',
});

Classroom.hasMany(Assignment, {
  foreignKey: 'classroomId',
  as: 'assignments',
  onDelete: 'CASCADE',
});
Assignment.belongsTo(Classroom, {
  foreignKey: 'classroomId',
  as: 'classroom',
});

Assignment.belongsTo(Course, {
  foreignKey: 'courseId',
  as: 'course',
});
Assignment.belongsTo(Lesson, {
  foreignKey: 'lessonId',
  as: 'lesson',
});

Assignment.hasMany(AssignmentSubmission, {
  foreignKey: 'assignmentId',
  as: 'submissions',
  onDelete: 'CASCADE',
});
AssignmentSubmission.belongsTo(Assignment, {
  foreignKey: 'assignmentId',
  as: 'assignment',
});

User.hasMany(AssignmentSubmission, {
  foreignKey: 'studentId',
  as: 'assignmentSubmissions',
  onDelete: 'CASCADE',
});
AssignmentSubmission.belongsTo(User, {
  foreignKey: 'studentId',
  as: 'student',
});

// Class announcements
Classroom.hasMany(ClassAnnouncement, {
  foreignKey: 'classroomId',
  as: 'announcements',
  onDelete: 'CASCADE',
});
ClassAnnouncement.belongsTo(Classroom, {
  foreignKey: 'classroomId',
  as: 'classroom',
});

User.hasMany(ClassAnnouncement, {
  foreignKey: 'authorId',
  as: 'classAnnouncements',
  onDelete: 'CASCADE',
});
ClassAnnouncement.belongsTo(User, {
  foreignKey: 'authorId',
  as: 'author',
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
  Classroom,
  ClassMembership,
  Assignment,
  AssignmentSubmission,
  ClassAnnouncement,
  syncDatabase
};
