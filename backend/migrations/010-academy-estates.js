// Academy Estates schema: Caplet Coins on users, the per-academy `properties`
// table, and the `property_transactions` ledger — then backfill landmark deeds
// for any classrooms that already exist. Ordinary plots are created on demand
// at purchase time, so only deeds (~12 per academy) are seeded here.
//
// Idempotent: guarded by table/column existence checks so it's safe whether the
// DB is fresh (production) or already carries an earlier build (local dev).
const { buildDeedRows } = require('../services/estateSeed');

async function tableExists(queryInterface, name) {
  const tables = await queryInterface.showAllTables();
  return tables
    .map((t) => (typeof t === 'string' ? t : t.tableName))
    .map((t) => t.toLowerCase())
    .includes(name.toLowerCase());
}

async function columnExists(queryInterface, table, column) {
  try {
    const desc = await queryInterface.describeTable(table);
    return Object.prototype.hasOwnProperty.call(desc, column);
  } catch {
    return false;
  }
}

module.exports = {
  async up(queryInterface, Sequelize) {
    const { DataTypes } = Sequelize;

    // 1. Caplet Coins on users.
    if (!(await columnExists(queryInterface, 'users', 'capletCoins'))) {
      await queryInterface.addColumn('users', 'capletCoins', {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      });
    }

    // 2. properties table.
    if (!(await tableExists(queryInterface, 'properties'))) {
      await queryInterface.createTable('properties', {
        id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
        classroomId: { type: DataTypes.UUID, allowNull: true },
        name: { type: DataTypes.STRING, allowNull: false },
        neighborhood: { type: DataTypes.STRING, allowNull: false },
        tier: { type: DataTypes.STRING, allowNull: false },
        gridX: { type: DataTypes.INTEGER, allowNull: false },
        gridY: { type: DataTypes.INTEGER, allowNull: false },
        price: { type: DataTypes.INTEGER, allowNull: false },
        marketValue: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
        ownerId: { type: DataTypes.UUID, allowNull: true },
        purchasePrice: { type: DataTypes.INTEGER, allowNull: true },
        lastRentAt: { type: DataTypes.DATE, allowNull: true },
        forSale: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
        askingPrice: { type: DataTypes.INTEGER, allowNull: true },
        houseStyle: { type: DataTypes.STRING, allowNull: false, defaultValue: 'cottage' },
        houseColor: { type: DataTypes.STRING, allowNull: false, defaultValue: '#cbd5e1' },
        createdAt: { type: DataTypes.DATE, allowNull: false },
        updatedAt: { type: DataTypes.DATE, allowNull: false },
      });
      await queryInterface.addIndex('properties', ['classroomId'], { name: 'properties_classroom_id_idx' });
      await queryInterface.addIndex('properties', ['classroomId', 'gridX', 'gridY'], { name: 'properties_classroom_grid_idx' });
    }

    // 3. property_transactions ledger.
    if (!(await tableExists(queryInterface, 'property_transactions'))) {
      await queryInterface.createTable('property_transactions', {
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
        createdAt: { type: DataTypes.DATE, allowNull: false },
        updatedAt: { type: DataTypes.DATE, allowNull: false },
      });
      await queryInterface.addIndex('property_transactions', ['classroomId', 'createdAt'], {
        name: 'property_transactions_classroom_created_idx',
      });
    }

    // 4. Backfill landmark deeds for existing academies (skip any that already
    //    have plots — idempotent).
    const [classrooms] = await queryInterface.sequelize.query('SELECT id FROM classrooms');
    if (classrooms.length) {
      const [withPlots] = await queryInterface.sequelize.query(
        'SELECT DISTINCT "classroomId" AS id FROM properties WHERE "classroomId" IS NOT NULL'
      );
      const seeded = new Set(withPlots.map((r) => r.id));
      for (const { id } of classrooms) {
        if (seeded.has(id)) continue;
        const rows = buildDeedRows(id);
        if (rows.length) await queryInterface.bulkInsert('properties', rows);
      }
    }
  },

  async down(queryInterface) {
    if (await tableExists(queryInterface, 'property_transactions')) {
      await queryInterface.dropTable('property_transactions');
      if (queryInterface.sequelize.getDialect() === 'postgres') {
        await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_property_transactions_kind";');
      }
    }
    if (await tableExists(queryInterface, 'properties')) {
      await queryInterface.dropTable('properties');
    }
    if (await columnExists(queryInterface, 'users', 'capletCoins')) {
      await queryInterface.removeColumn('users', 'capletCoins');
    }
  },
};
