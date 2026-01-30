/**
 * Drop only legacy/unused tables from PostgreSQL. Does NOT touch courses, modules, lessons, users, progress, surveys, etc.
 * Run: node scripts/drop-legacy-tables.js (with DATABASE_URL set)
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { sequelize } = require('../models');

const LEGACY_TABLES = [
  'financial_plans',
  'financial_states',
  'check_ins',
  'summaries'
];

async function run() {
  await sequelize.authenticate();
  console.log('Dropping legacy tables only (no user data touched)...');
  for (const table of LEGACY_TABLES) {
    try {
      await sequelize.query(`DROP TABLE IF EXISTS "${table}" CASCADE;`);
      console.log('Dropped:', table);
    } catch (e) {
      console.log('Skip (may not exist):', table, e.message);
    }
  }
  console.log('Done.');
}

run()
  .then(() => process.exit(0))
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => sequelize.close());
