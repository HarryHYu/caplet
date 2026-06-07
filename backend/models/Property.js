const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

// A plot on the shared Caplet Real Estate map. Owned by at most one user.
const Property = sequelize.define('Property', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  name: { type: DataTypes.STRING, allowNull: false },
  neighborhood: { type: DataTypes.STRING, allowNull: false },
  tier: { type: DataTypes.STRING, allowNull: false },
  gridX: { type: DataTypes.INTEGER, allowNull: false },
  gridY: { type: DataTypes.INTEGER, allowNull: false },
  price: { type: DataTypes.INTEGER, allowNull: false },
  ownerId: { type: DataTypes.UUID, allowNull: true },
  houseStyle: { type: DataTypes.STRING, allowNull: false, defaultValue: 'cottage' },
  houseColor: { type: DataTypes.STRING, allowNull: false, defaultValue: '#cbd5e1' },
}, {
  tableName: 'properties',
  timestamps: true,
});

module.exports = Property;
