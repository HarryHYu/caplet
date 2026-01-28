// Script to clean up database for CapletEdu
// - Deletes user-generated education data (progress, surveys)
// - Drops legacy financial advisor tables that are no longer used in CapletEdu
const { sequelize, User, Course, Lesson, UserProgress, Survey } = require('./models');
require('dotenv').config();

const cleanupDatabase = async () => {
  try {
    console.log('Starting CapletEdu database cleanup...');

    // Delete education-related user data
    console.log('Deleting user progress...');
    await UserProgress.destroy({ where: {}, truncate: true });
    
    console.log('Deleting surveys...');
    await Survey.destroy({ where: {}, truncate: true });
    
    // NOTE: NOT deleting courses or lessons - they are content, not user data
    console.log('⚠️  Preserving courses and lessons (content, not user data)');

    // Drop legacy financial advisor tables (moved to CapletFinancial)
    const legacyTables = [
      'financial_plans',
      'financial_states',
      'check_ins',
      'summaries'
    ];

    for (const table of legacyTables) {
      try {
        console.log(`Dropping legacy table if exists: ${table}...`);
        await sequelize.query(`DROP TABLE IF EXISTS "${table}" CASCADE;`);
        console.log(`✅ Dropped (or did not exist): ${table}`);
      } catch (error) {
        console.log(`Note: Could not drop table ${table} (may not exist):`, error.message);
      }
    }

    console.log('✅ CapletEdu database cleanup completed!');
    console.log('Users, courses, and lessons preserved.');
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

