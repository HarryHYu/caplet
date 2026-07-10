/**
 * Migration: create the Financial Twin's CDR tables.
 *
 * cdr_connections  — one row per consented (mock or real) CDR link; holds the
 *                    consent lifecycle and a minimized accounts snapshot.
 * cdr_transactions — ingested, categorized transactions; hard-deleted when
 *                    the owning connection's consent is revoked.
 *
 * Money is whole-AUD INTEGER (signed for transaction amounts), matching
 * user_financial_profiles. See backend/models/CdrConnection.js and
 * CdrTransaction.js for the data-minimization rationale.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const { DataTypes } = Sequelize;

    await queryInterface.createTable('cdr_connections', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      userId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      status: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'pending'
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
        defaultValue: '[]'
      },
      accountsSnapshot: {
        type: DataTypes.TEXT,
        allowNull: true
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
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      }
    });

    await queryInterface.createTable('cdr_transactions', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      connectionId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'cdr_connections', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
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
        allowNull: false
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
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      }
    });

    await queryInterface.addIndex('cdr_connections', ['userId'], {
      name: 'cdr_connections_user_id'
    });
    await queryInterface.addIndex('cdr_transactions', ['connectionId', 'postedAt'], {
      name: 'cdr_transactions_connection_id_posted_at'
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('cdr_transactions');
    await queryInterface.dropTable('cdr_connections');
  }
};
