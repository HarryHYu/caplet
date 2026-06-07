module.exports = {
  async up(queryInterface, Sequelize) {
    const { DataTypes } = Sequelize;

    // Wallet: a coin balance on each user. Starter balance of 100 so the shop
    // is usable before the coin-earning system exists. Additive.
    await queryInterface.addColumn('users', 'coins', {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 100,
    });

    // Inventory: which catalog items a user owns. Additive new table.
    await queryInterface.createTable('user_items', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      userId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      // Catalog item id, e.g. "hair:long20". Items live in code (shopCatalog.js).
      itemId: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    });

    await queryInterface.addIndex('user_items', ['userId'], {
      name: 'user_items_user_id_idx',
    });
    // A user can only own a given item once.
    await queryInterface.addConstraint('user_items', {
      fields: ['userId', 'itemId'],
      type: 'unique',
      name: 'user_items_user_item_unique',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('user_items');
    await queryInterface.removeColumn('users', 'coins');
  },
};
