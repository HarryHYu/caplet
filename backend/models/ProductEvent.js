const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * Durable product analytics event. Dimensions needed by learning and teacher
 * reporting are first-class indexed columns; event-specific detail remains in
 * metadata. A globally unique client key makes retries safe.
 */
const ProductEvent = sequelize.define('ProductEvent', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  idempotencyKey: {
    type: DataTypes.STRING(255),
    allowNull: false,
    defaultValue: DataTypes.UUIDV4,
  },
  type: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'users', key: 'id' },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE',
  },
  anonymousId: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  sessionId: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  practiceSessionId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'practice_sessions', key: 'id' },
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL',
  },
  classroomId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'classrooms', key: 'id' },
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL',
  },
  outcomeId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'curriculum_outcomes', key: 'id' },
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL',
  },
  feature: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  entityType: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  entityId: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  schemaVersion: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
    validate: { min: 1 },
  },
  metadata: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: {},
  },
  occurredAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
  receivedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
}, {
  tableName: 'product_events',
  timestamps: true,
  indexes: [
    { name: 'product_events_idempotency_unique', unique: true, fields: ['idempotencyKey'] },
    { name: 'product_events_user_occurred_idx', fields: ['userId', 'occurredAt'] },
    { name: 'product_events_session_occurred_idx', fields: ['sessionId', 'occurredAt'] },
    {
      name: 'product_events_practice_session_occurred_idx',
      fields: ['practiceSessionId', 'occurredAt'],
    },
    { name: 'product_events_classroom_occurred_idx', fields: ['classroomId', 'occurredAt'] },
    { name: 'product_events_outcome_occurred_idx', fields: ['outcomeId', 'occurredAt'] },
    {
      name: 'product_events_feature_type_occurred_idx',
      fields: ['feature', 'type', 'occurredAt'],
    },
  ],
});

module.exports = ProductEvent;
