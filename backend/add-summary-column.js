// Script to add summary column to financial_states table
const { sequelize } = require('./config/database');
require('dotenv').config();

const addSummaryColumn = async () => {
  try {
    console.log('Adding summary column to financial_states table...');
    
    // Check if column exists first
    const [results] = await sequelize.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'financial_states' 
      AND column_name = 'summary'
    `);

    if (results.length === 0) {
      // Column doesn't exist, add it
      await sequelize.query(`
        ALTER TABLE financial_states 
        ADD COLUMN summary TEXT DEFAULT ''
      `);
      console.log('✅ Summary column added successfully');
    } else {
      console.log('✅ Summary column already exists');
    }
  } catch (error) {
    console.error('❌ Error adding summary column:', error);
    throw error;
  }
};

// Run if called directly
if (require.main === module) {
  addSummaryColumn()
    .then(() => {
      console.log('Done!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Failed:', error);
      process.exit(1);
    });
}

module.exports = addSummaryColumn;

