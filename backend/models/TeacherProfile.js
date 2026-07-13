const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const TeacherProfile = sequelize.define('TeacherProfile', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    unique: true,
    references: { model: 'users', key: 'id' },
    onDelete: 'CASCADE',
  },
  status: {
    type: DataTypes.STRING(24),
    allowNull: false,
    defaultValue: 'pending',
    validate: { isIn: [['pending', 'verified', 'rejected', 'suspended']] },
  },
  schoolName: {
    type: DataTypes.STRING(200),
    allowNull: false,
  },
  schoolDomain: {
    type: DataTypes.STRING(253),
    allowNull: true,
  },
  staffEmail: {
    type: DataTypes.STRING(254),
    allowNull: false,
    validate: { isEmail: true },
  },
  positionTitle: {
    type: DataTypes.STRING(120),
    allowNull: true,
  },
  jurisdiction: {
    type: DataTypes.STRING(20),
    allowNull: true,
  },
  verificationNote: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  requestedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
  verifiedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  verifiedBy: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'users', key: 'id' },
    onDelete: 'SET NULL',
  },
}, {
  tableName: 'teacher_profiles',
  timestamps: true,
  indexes: [
    { fields: ['status', 'requestedAt'] },
    { fields: ['schoolDomain'] },
  ],
});

module.exports = TeacherProfile;
