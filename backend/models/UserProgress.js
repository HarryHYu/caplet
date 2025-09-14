const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const UserProgress = sequelize.define('UserProgress', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  courseId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'courses',
      key: 'id'
    }
  },
  lessonId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'lessons',
      key: 'id'
    }
  },
  status: {
    type: DataTypes.ENUM('not_started', 'in_progress', 'completed'),
    defaultValue: 'not_started'
  },
  progressPercentage: {
    type: DataTypes.DECIMAL(5, 2),
    defaultValue: 0.00,
    validate: {
      min: 0,
      max: 100
    }
  },
  timeSpent: {
    type: DataTypes.INTEGER, // in minutes
    defaultValue: 0
  },
  lastAccessedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  completedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  quizScores: {
    type: DataTypes.TEXT,
    defaultValue: '{}',
    get() {
      const value = this.getDataValue('quizScores');
      return value ? JSON.parse(value) : {};
    },
    set(value) {
      this.setDataValue('quizScores', JSON.stringify(value));
    }
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  bookmarks: {
    type: DataTypes.TEXT,
    defaultValue: '[]',
    get() {
      const value = this.getDataValue('bookmarks');
      return value ? JSON.parse(value) : [];
    },
    set(value) {
      this.setDataValue('bookmarks', JSON.stringify(value));
    }
  }
}, {
  tableName: 'user_progress',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['userId', 'courseId', 'lessonId']
    }
  ]
});

module.exports = UserProgress;
