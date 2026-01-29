const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ClassAnnouncement = sequelize.define(
  'ClassAnnouncement',
  {
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
    authorId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    attachments: {
      type: DataTypes.TEXT,
      allowNull: true,
      get() {
        const value = this.getDataValue('attachments');
        return value ? JSON.parse(value) : [];
      },
      set(value) {
        this.setDataValue('attachments', JSON.stringify(value || []));
      },
    },
  },
  {
    tableName: 'class_announcements',
    timestamps: true,
  }
);

module.exports = ClassAnnouncement;

