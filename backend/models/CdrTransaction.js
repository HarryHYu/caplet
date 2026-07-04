const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * One ingested, categorized CDR transaction — sensitive financial data.
 *
 * DATA MINIMIZATION / RETENTION: rows exist only while their CdrConnection is
 * active; revocation hard-deletes every row for the connection (asserted by
 * tests). We keep `description` (capped, needed to recategorize when rule
 * tables improve) but deliberately NOT merchantName or any provider brand.
 * Descriptions must never be logged — services/twinLog.js enforces that.
 *
 * `amount` is a signed whole-AUD INTEGER (negative = outflow), matching the
 * UserFinancialProfile money convention. `uncertain` mirrors the fail-safe
 * flag from services/twinCategorizer.js — uncertain rows are surfaced to the
 * user, never silently folded into category totals.
 */
const CdrTransaction = sequelize.define('CdrTransaction', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  connectionId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  accountId: {
    type: DataTypes.STRING,
    allowNull: false
  },
  transactionId: {
    type: DataTypes.STRING,
    allowNull: false
  },
  postedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  amount: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  description: {
    type: DataTypes.STRING(255),
    allowNull: false,
    set(value) {
      this.setDataValue('description', String(value == null ? '' : value).slice(0, 255));
    }
  },
  merchantCategoryCode: {
    type: DataTypes.STRING,
    allowNull: true
  },
  category: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'uncertain'
  },
  confidence: {
    type: DataTypes.FLOAT,
    allowNull: true
  },
  uncertain: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  }
}, {
  tableName: 'cdr_transactions',
  timestamps: true
});

module.exports = CdrTransaction;
