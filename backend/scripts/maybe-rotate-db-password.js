/**
 * TEMPORARY ONE-OFF: db password rotation hook (delete after rotation completes).
 *
 * Runs at server startup. If the env var ROTATE_DB_PASSWORD is set and is a
 * valid alphanumeric password (>= 16 chars), this executes:
 *
 *   ALTER USER postgres WITH PASSWORD '<value>';
 *
 * against the currently connected database, then continues normal startup.
 *
 * This exists only because the local network blocks Railway's TCP proxy port
 * for direct psql access. Once the rotation is complete:
 *   1. Remove ROTATE_DB_PASSWORD from caplet's Railway env vars
 *   2. Delete this file
 *   3. Remove the require() and call in server.js
 */
const { sequelize } = require('../config/database');

async function maybeRotateDbPassword() {
  const newPassword = process.env.ROTATE_DB_PASSWORD;
  if (!newPassword) return false;

  if (!/^[A-Za-z0-9]{16,128}$/.test(newPassword)) {
    console.error('❌ ROTATE_DB_PASSWORD set but value is invalid (must be 16-128 alphanumeric chars). Refusing to rotate.');
    process.exit(1);
  }

  console.log('🔐 ROTATE_DB_PASSWORD is set. Rotating Postgres password on startup...');

  try {
    // The value has already been validated as alphanumeric so it cannot
    // contain quotes or break out of the string literal. ALTER USER does
    // not support parameter binding so we have to interpolate.
    await sequelize.query(`ALTER USER postgres WITH PASSWORD '${newPassword}'`);
    console.log('✅ Postgres password rotated.');
    console.log('   IMPORTANT: now update DATABASE_URL on caplet + Postgres services');
    console.log('   and remove ROTATE_DB_PASSWORD from caplet env vars.');
    return true;
  } catch (err) {
    console.error('❌ Password rotation failed:', err.message);
    process.exit(1);
  }
}

module.exports = { maybeRotateDbPassword };
