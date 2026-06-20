const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

// A plot on an academy's property map. Owned by at most one user. `classroomId`
// scopes the plot to a single academy world (null = legacy global map).
const Property = sequelize.define('Property', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  classroomId: { type: DataTypes.UUID, allowNull: true },
  name: { type: DataTypes.STRING, allowNull: false },
  neighborhood: { type: DataTypes.STRING, allowNull: false },
  tier: { type: DataTypes.STRING, allowNull: false },
  gridX: { type: DataTypes.INTEGER, allowNull: false },
  gridY: { type: DataTypes.INTEGER, allowNull: false },
  // Static "list" price set at seed time — the floor/ceiling anchor for drift.
  price: { type: DataTypes.INTEGER, allowNull: false },
  // Current appraised value; drifts with demand. Buys happen at this value.
  marketValue: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  ownerId: { type: DataTypes.UUID, allowNull: true },
  // What the current owner paid — for profit/loss display. Null when unowned.
  purchasePrice: { type: DataTypes.INTEGER, allowNull: true },
  // Rent-accrual anchor: rent accumulates from this timestamp until collected.
  lastRentAt: { type: DataTypes.DATE, allowNull: true },
  // Player-to-player listing.
  forSale: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  askingPrice: { type: DataTypes.INTEGER, allowNull: true },
  houseStyle: { type: DataTypes.STRING, allowNull: false, defaultValue: 'cottage' },
  houseColor: { type: DataTypes.STRING, allowNull: false, defaultValue: '#cbd5e1' },
}, {
  tableName: 'properties',
  timestamps: true,
});

module.exports = Property;
