const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

// A cosmetic (or future item) a user owns. itemId references the code catalog
// in config/shopCatalog.js (e.g. "hair:long20").
const UserItem = sequelize.define('UserItem', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  itemId: {
    type: DataTypes.STRING,
    allowNull: false,
  },
}, {
  tableName: 'user_items',
  timestamps: true,
});

module.exports = UserItem;
