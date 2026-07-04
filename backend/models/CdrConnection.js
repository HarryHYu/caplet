const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * One consented CDR link between a user and a (mock or real) data holder.
 *
 * DATA MINIMIZATION: this row stores only what the twin needs to function —
 * consent lifecycle state and a minimized accounts snapshot
 * ({ accountId, productCategory, balance } — no masked numbers, no display
 * names, no provider brands). Revoking consent nulls the snapshot and purges
 * the connection's cdr_transactions rows (see routes/financialTwin.js).
 *
 * `persona` exists only for the mocked provider (which synthetic dataset this
 * connection draws); it is meaningless in real mode.
 */
const CdrConnection = sequelize.define('CdrConnection', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  status: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'pending' // 'pending' | 'active' | 'revoked'
  },
  consentId: {
    type: DataTypes.STRING,
    allowNull: true
  },
  cdrArrangementId: {
    type: DataTypes.STRING,
    allowNull: true
  },
  persona: {
    type: DataTypes.STRING,
    allowNull: true
  },
  scopes: {
    type: DataTypes.TEXT,
    allowNull: false,
    defaultValue: '[]',
    get() {
      const value = this.getDataValue('scopes');
      try {
        const parsed = value ? JSON.parse(value) : [];
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    },
    set(value) {
      this.setDataValue('scopes', JSON.stringify(Array.isArray(value) ? value : []));
    }
  },
  // Minimized snapshot: [{ accountId, productCategory, balance }] — whole AUD.
  accountsSnapshot: {
    type: DataTypes.TEXT,
    allowNull: true,
    get() {
      const value = this.getDataValue('accountsSnapshot');
      try {
        const parsed = value ? JSON.parse(value) : null;
        return Array.isArray(parsed) ? parsed : null;
      } catch {
        return null;
      }
    },
    set(value) {
      this.setDataValue('accountsSnapshot', value == null ? null : JSON.stringify(Array.isArray(value) ? value : []));
    }
  },
  consentedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  revokedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'cdr_connections',
  timestamps: true
});

module.exports = CdrConnection;
