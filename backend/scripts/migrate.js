/**
 * migrate.js — run all pending database migrations once, then exit.
 *
 * The server runs migrations on startup, but this lets the setup script (and
 * you) apply schema changes without booting the whole API.
 *
 * Usage: cd backend && node scripts/migrate.js
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const { sequelize } = require('../config/database');
const { runMigrations } = require('../config/migrationRunner');

(async () => {
  try {
    await sequelize.authenticate();
    await runMigrations();
    console.log('✅ Migrations complete.');
    await sequelize.close();
    process.exit(0);
  } catch (e) {
    console.error('❌ Migration failed:', e.message);
    await sequelize.close().catch(() => {});
    process.exit(1);
  }
})();
