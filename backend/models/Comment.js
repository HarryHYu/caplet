const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Comment = sequelize.define(
  'Comment',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    classroomId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'classrooms', key: 'id' },
      onDelete: 'CASCADE',
    },
    commentableType: {
      type: DataTypes.STRING(32),
      allowNull: false,
      comment: 'announcement | assignment',
    },
    commentableId: {
      type: DataTypes.UUID,
      allowNull: false,
      comment: 'id of announcement or assignment',
    },
    authorId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'users', key: 'id' },
      onDelete: 'CASCADE',
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    isPrivate: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'For assignments: private = only author + targetUser (or teachers) see it',
    },
    targetUserId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'users', key: 'id' },
      onDelete: 'CASCADE',
      comment: 'For private assignment comments: the student this thread is with (when teacher replies)',
    },
  },
  {
    tableName: 'comments',
    timestamps: true,
    indexes: [
      { fields: ['classroomId', 'commentableType', 'commentableId'] },
      { fields: ['authorId'] },
    ],
  }
);

module.exports = Comment;
