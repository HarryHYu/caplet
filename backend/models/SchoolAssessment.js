const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

// A school assessment (exam, essay, assignment, etc.) parsed from the student's
// assessment grid or timetable and stored per-user. Feeds into the AI study plan.
const SchoolAssessment = sequelize.define('SchoolAssessment', {
  id:       { type: DataTypes.UUID,    defaultValue: DataTypes.UUIDV4, primaryKey: true },
  userId:   { type: DataTypes.UUID,    allowNull: false, references: { model: 'users', key: 'id' } },
  subject:  { type: DataTypes.STRING,  allowNull: false, validate: { notEmpty: true, len: [1, 200] } },
  title:    { type: DataTypes.STRING,  allowNull: false, validate: { notEmpty: true, len: [1, 300] } },
  taskType: { type: DataTypes.STRING,  allowNull: true  },
  dueDate:  { type: DataTypes.DATEONLY, allowNull: true },
  weight:   { type: DataTypes.FLOAT,   allowNull: true  },
  notes:    { type: DataTypes.TEXT,    allowNull: true  },
  status: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'upcoming',
    validate: { isIn: [['upcoming', 'submitted', 'marked']] },
  },
}, {
  tableName: 'school_assessments',
  timestamps: true,
  indexes: [{ fields: ['userId', 'dueDate'] }],
});

module.exports = SchoolAssessment;
