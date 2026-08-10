const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ForumPollOption = sequelize.define('ForumPollOption', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  pollId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'forum_polls', key: 'id' },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE',
  },
  text: {
    type: DataTypes.STRING(200),
    allowNull: false,
    validate: { len: [1, 200] },
  },
  sortOrder: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
}, {
  tableName: 'forum_poll_options',
  timestamps: true,
  indexes: [
    { name: 'forum_poll_options_poll_idx', fields: ['pollId', 'sortOrder'] },
  ],
});

module.exports = ForumPollOption;
