const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ClassMembership = sequelize.define('ClassMembership', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  classroomId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'classrooms',
      key: 'id',
    },
    onDelete: 'CASCADE',
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id',
    },
    onDelete: 'CASCADE',
  },
  role: {
    type: DataTypes.ENUM('teacher', 'student'),
    allowNull: false,
    defaultValue: 'student',
  },
}, {
  tableName: 'class_memberships',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['classroomId', 'userId'],
    },
  ],
});

module.exports = ClassMembership;

