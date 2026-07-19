const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

// Feedback signal for the recommendation engine: which cards were shown,
// which the student acted on. See migration 018.
const RecommendationEvent = sequelize.define('RecommendationEvent', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  userId:  { type: DataTypes.UUID, allowNull: false },
  recId:   { type: DataTypes.STRING(120), allowNull: false },
  recType: { type: DataTypes.STRING(40),  allowNull: false },
  action:  { type: DataTypes.STRING(20),  allowNull: false }, // shown | clicked | done
  topic:   { type: DataTypes.STRING(200), allowNull: true },
  subject: { type: DataTypes.STRING(100), allowNull: true },
}, {
  tableName: 'recommendation_events',
});

module.exports = RecommendationEvent;
