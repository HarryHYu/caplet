// Script to clean up database - delete everything except users
const { sequelize, User, Course, Lesson, UserProgress, Survey, FinancialState, CheckIn, FinancialPlan, Summary } = require('./models');
require('dotenv').config();

const cleanupDatabase = async () => {
  try {
    console.log('Starting database cleanup...');
    
    // Delete all data except users
    console.log('Deleting summaries...');
    await Summary.destroy({ where: {}, truncate: true });
    
    console.log('Deleting financial plans...');
    await FinancialPlan.destroy({ where: {}, truncate: true });
    
    console.log('Deleting check-ins...');
    await CheckIn.destroy({ where: {}, truncate: true });
    
    console.log('Deleting financial states...');
    await FinancialState.destroy({ where: {}, truncate: true });
    
    console.log('Deleting user progress...');
    await UserProgress.destroy({ where: {}, truncate: true });
    
    console.log('Deleting surveys...');
    await Survey.destroy({ where: {}, truncate: true });
    
    // NOTE: NOT deleting courses or lessons - they are content, not user data
    console.log('⚠️  Preserving courses and lessons (content, not user data)');
    
    // Remove summary column from financial_states if it exists
    try {
      console.log('Removing summary column from financial_states...');
      await sequelize.query(`
        ALTER TABLE financial_states 
        DROP COLUMN IF EXISTS summary
      `);
      console.log('✅ Summary column removed (if it existed)');
    } catch (error) {
      console.log('Note: Summary column may not exist:', error.message);
    }
    
    console.log('✅ Database cleanup completed!');
    console.log('Users table preserved.');
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

