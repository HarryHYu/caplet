const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const AssignmentSubmission = sequelize.define('AssignmentSubmission', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  assignmentId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'assignments',
      key: 'id',
    },
    onDelete: 'CASCADE',
  },
  studentId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id',
    },
    onDelete: 'CASCADE',
  },
  status: {
    type: DataTypes.ENUM('assigned', 'completed'),
    defaultValue: 'assigned',
  },
  submittedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
}, {
  tableName: 'assignment_submissions',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['assignmentId', 'studentId'],
    },
  ],
});

module.exports = AssignmentSubmission;

