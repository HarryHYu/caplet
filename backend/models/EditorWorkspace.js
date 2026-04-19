const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const EditorWorkspace = sequelize.define('EditorWorkspace', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  label: {
    type: DataTypes.STRING,
    allowNull: true
  },
  codeDigest: {
    type: DataTypes.STRING(64),
    allowNull: false,
    unique: true
  }
}, {
  tableName: 'editor_workspaces',
  timestamps: true
});

module.exports = EditorWorkspace;
