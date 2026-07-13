const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

module.exports = sequelize.define('TeacherVerificationAudit', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  teacherProfileId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'teacher_profiles', key: 'id' },
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL',
  },
  teacherUserId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'users', key: 'id' },
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL',
  },
  actorUserId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'users', key: 'id' },
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL',
  },
  fromStatus: { type: DataTypes.STRING(24), allowNull: false },
  toStatus: {
    type: DataTypes.STRING(24),
    allowNull: false,
    validate: { isIn: [['pending', 'verified', 'rejected', 'suspended']] },
  },
  note: { type: DataTypes.TEXT, allowNull: true },
  metadata: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
}, {
  tableName: 'teacher_verification_audits',
  timestamps: true,
  indexes: [
    { name: 'teacher_verification_audits_profile_created_idx', fields: ['teacherProfileId', 'createdAt'] },
    { name: 'teacher_verification_audits_teacher_created_idx', fields: ['teacherUserId', 'createdAt'] },
    { name: 'teacher_verification_audits_actor_created_idx', fields: ['actorUserId', 'createdAt'] },
  ],
});
