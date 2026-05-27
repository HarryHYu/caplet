const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Lesson = sequelize.define('Lesson', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  moduleId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'modules',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      len: [1, 200]
    }
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  videoUrl: {
    type: DataTypes.STRING,
    allowNull: true
  },
  duration: {
    type: DataTypes.INTEGER, // in minutes
    allowNull: false
  },
  order: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  lessonType: {
    type: DataTypes.ENUM('video', 'reading', 'quiz', 'exercise', 'assignment'),
    allowNull: false
  },
  isPublished: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  resources: {
    type: DataTypes.TEXT,
    defaultValue: '[]',
    get() {
      const value = this.getDataValue('resources');
      return value ? JSON.parse(value) : [];
    },
    set(value) {
      this.setDataValue('resources', JSON.stringify(value));
    }
  },
  metadata: {
    type: DataTypes.TEXT,
    defaultValue: '{}',
    get() {
      const value = this.getDataValue('metadata');
      return value ? JSON.parse(value) : {};
    },
    set(value) {
      this.setDataValue('metadata', JSON.stringify(value));
    }
  },
  // Slide-based content (Khan/EP style): [{ type, ...config }]
  // Stored as JSONB in Postgres so we can query inside slide content later.
  // Sequelize returns this as a native array/object — no JSON.parse needed.
  slides: {
    type: DataTypes.JSONB,
    allowNull: true,
  }
}, {
  tableName: 'lessons',
  timestamps: true
});

module.exports = Lesson;
