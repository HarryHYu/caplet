const crypto = require('crypto');
const { getCityPlan } = require('./cityPlan');

// Defaults for a freshly-seeded (unowned) lot.
const DEFAULT_STYLE = 'cottage';
const DEFAULT_COLOR = '#cbd5e1';

/**
 * Build the buyable-lot rows for one academy's world, ready for bulkInsert.
 * The layout comes from the deterministic city plan (services/cityPlan.js):
 * a large districted metropolis. Fixed infrastructure (roads/parks/civic) is
 * NOT seeded — it's rendered client-side from the plan's `infra` descriptor.
 *
 * @param {string|null} classroomId  Academy this map belongs to.
 * @returns {Array<object>} plain row objects matching the `properties` table.
 */
function buildSeedRows(classroomId = null) {
  const now = new Date();
  return getCityPlan().plots.map((p) => ({
    id: crypto.randomUUID(),
    classroomId,
    name: p.name,
    neighborhood: p.neighborhood,
    tier: p.tier,
    gridX: p.gridX,
    gridY: p.gridY,
    price: p.price,
    marketValue: p.price,
    ownerId: null,
    purchasePrice: null,
    lastRentAt: null,
    forSale: false,
    askingPrice: null,
    houseStyle: DEFAULT_STYLE,
    houseColor: DEFAULT_COLOR,
    createdAt: now,
    updatedAt: now,
  }));
}

/**
 * Build ONLY the landmark-deed rows for one academy. These are the handful of
 * special parcels (the player-art stages + beach resort) that must exist in the
 * DB so the GET endpoint can list them and they can be bought. Ordinary plots
 * are created on demand at purchase time (see academyEstate buy), so a new
 * academy seeds ~12 rows instead of ~50k.
 *
 * @param {string|null} classroomId
 * @returns {Array<object>} deed rows for bulkCreate.
 */
function buildDeedRows(classroomId = null) {
  return buildSeedRows(classroomId).filter((r) => r.tier === 'Landmark');
}

module.exports = {
  buildSeedRows,
  buildDeedRows,
  DEFAULT_STYLE,
  DEFAULT_COLOR,
};
