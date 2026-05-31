const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const SavedSlide = sequelize.define('SavedSlide', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  courseId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  lessonId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  slideIndex: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  // AI-assigned revision category; null until categorized.
  category: {
    type: DataTypes.STRING,
    allowNull: true
  }
}, {
  tableName: 'saved_slides',
  timestamps: true
});

module.exports = SavedSlide;
