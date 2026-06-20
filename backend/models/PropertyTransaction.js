const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

// A single estate action in an academy world — the ledger behind the market's
// demand signal and the live activity feed.
const PropertyTransaction = sequelize.define('PropertyTransaction', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  classroomId: { type: DataTypes.UUID, allowNull: false },
  propertyId: { type: DataTypes.UUID, allowNull: false },
  actorId: { type: DataTypes.UUID, allowNull: true },
  counterpartyId: { type: DataTypes.UUID, allowNull: true },
  kind: {
    type: DataTypes.ENUM('bank_buy', 'bank_sell', 'list', 'unlist', 'p2p_sale', 'rent'),
    allowNull: false,
  },
  amount: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
}, {
  tableName: 'property_transactions',
  timestamps: true,
});

module.exports = PropertyTransaction;
