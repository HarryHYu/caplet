// Script to explicitly create summaries table
const { sequelize, Summary } = require('./models');
require('dotenv').config();

const createSummariesTable = async () => {
  try {
    console.log('Creating summaries table...');
    
    // Force sync the Summary model to create the table
    await Summary.sync({ force: false, alter: true });
    
    // Verify table exists
    const [results] = await sequelize.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'summaries'
    `);
    
    if (results.length > 0) {
      console.log('✅ Summaries table created/verified successfully');
    } else {
      console.log('⚠️  Table may not exist, trying alternative method...');
      // Try creating directly
      await sequelize.query(`
        CREATE TABLE IF NOT EXISTS summaries (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          "userId" UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
          content TEXT NOT NULL DEFAULT '',
          "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
          "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
        )
      `);
      console.log('✅ Summaries table created via direct SQL');
    }
  } catch (error) {
    console.error('❌ Error creating summaries table:', error);
    throw error;
  }
};

// Run if called directly
if (require.main === module) {
  createSummariesTable()
    .then(() => {
      console.log('Done!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Failed:', error);
      process.exit(1);
    });
}

module.exports = createSummariesTable;

