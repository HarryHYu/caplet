// Script to clean up database for CapletEdu
// - Deletes user-generated education data (progress, surveys)
// - Drops legacy/unused tables (financial advisor tables no longer used)
// PostgreSQL only (Railway). Requires DATABASE_URL.
const { sequelize, UserProgress, Survey } = require('./models');
require('dotenv').config();

// Tables we do NOT need (legacy or moved to another app). Only these are dropped.
const LEGACY_TABLES = [
  'financial_plans',
  'financial_states',
  'check_ins',
  'summaries'
];

const cleanupDatabase = async () => {
  try {
    console.log('Starting database cleanup (PostgreSQL)...');

    // Delete education-related user data
    console.log('Deleting user progress...');
    await UserProgress.destroy({ where: {}, truncate: true });

    console.log('Deleting surveys...');
    await Survey.destroy({ where: {}, truncate: true });

    console.log('Preserving courses, modules, lessons, users, classrooms (content & core data).');

    // Drop only legacy/unused tables
    for (const table of LEGACY_TABLES) {
      try {
        console.log(`Dropping legacy table if exists: ${table}...`);
        await sequelize.query(`DROP TABLE IF EXISTS "${table}" CASCADE;`);
        console.log(`✅ Dropped (or did not exist): ${table}`);
      } catch (error) {
        console.log(`Note: Could not drop table ${table} (may not exist):`, error.message);
      }
    }

    console.log('✅ CapletEdu database cleanup completed!');
  } catch (error) {
    console.error('❌ Database cleanup error:', error);
    throw error;
  }
};

// Run if called directly
if (require.main === module) {
  cleanupDatabase()
    .then(() => {
      console.log('Done!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Failed:', error);
      process.exit(1);
    });
}

module.exports = cleanupDatabase;

