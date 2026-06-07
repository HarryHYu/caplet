const crypto = require('crypto');

// A grid "map" of plots. Neighborhoods run from premium (top) to starter
// (bottom); prices scale by tier. Seeded once so all players share one world.
const NEIGHBOURHOODS = [
  { rows: [0, 1], name: 'Skyline Heights', tier: 'Luxury', base: 8000, step: 1400 },
  { rows: [2, 3], name: 'Riverside', tier: 'Premium', base: 2200, step: 360 },
  { rows: [4, 5], name: 'Maple Suburb', tier: 'Suburban', base: 450, step: 90 },
  { rows: [6, 7], name: 'Old Town', tier: 'Starter', base: 60, step: 18 },
];
const COLS = 10;
const ROWS = 8;
const DEFAULT_STYLE = 'cottage';
const DEFAULT_COLOR = '#cbd5e1';

function buildSeedRows() {
  const now = new Date();
  const rows = [];
  for (let y = 0; y < ROWS; y += 1) {
    const hood = NEIGHBOURHOODS.find((n) => n.rows.includes(y));
    for (let x = 0; x < COLS; x += 1) {
      const num = y * COLS + x + 1;
      rows.push({
        id: crypto.randomUUID(),
        name: `${hood.name} #${num}`,
        neighborhood: hood.name,
        tier: hood.tier,
        gridX: x,
        gridY: y,
        price: hood.base + x * hood.step,
        ownerId: null,
        houseStyle: DEFAULT_STYLE,
        houseColor: DEFAULT_COLOR,
        createdAt: now,
        updatedAt: now,
      });
    }
  }
  return rows;
}

module.exports = {
  async up(queryInterface, Sequelize) {
    const { DataTypes } = Sequelize;

    await queryInterface.createTable('properties', {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      name: { type: DataTypes.STRING, allowNull: false },
      neighborhood: { type: DataTypes.STRING, allowNull: false },
      tier: { type: DataTypes.STRING, allowNull: false },
      gridX: { type: DataTypes.INTEGER, allowNull: false },
      gridY: { type: DataTypes.INTEGER, allowNull: false },
      price: { type: DataTypes.INTEGER, allowNull: false },
      // Nullable owner: null = unowned. SET NULL on user delete so the plot
      // survives (becomes available) rather than being destroyed.
      ownerId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      houseStyle: { type: DataTypes.STRING, allowNull: false, defaultValue: DEFAULT_STYLE },
      houseColor: { type: DataTypes.STRING, allowNull: false, defaultValue: DEFAULT_COLOR },
      createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    });

    await queryInterface.addIndex('properties', ['ownerId'], { name: 'properties_owner_id_idx' });
    await queryInterface.addIndex('properties', ['gridY', 'gridX'], { name: 'properties_grid_idx' });

    // Seed the world map.
    await queryInterface.bulkInsert('properties', buildSeedRows());
  },

  async down(queryInterface) {
    await queryInterface.dropTable('properties');
  },
};
