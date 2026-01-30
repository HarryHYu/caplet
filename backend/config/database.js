const { Sequelize } = require('sequelize');

// Use SQLite for development, PostgreSQL for production
const isDevelopment = process.env.NODE_ENV === 'development' || !process.env.DATABASE_URL;

const sequelize = new Sequelize(
  process.env.DATABASE_URL || 'sqlite://caplet.db',
  {
    dialect: isDevelopment ? 'sqlite' : 'postgres',
    storage: isDevelopment ? './caplet.db' : undefined,
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    pool: isDevelopment ? undefined : {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
  }
);

// Test database connection
const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connection established successfully.');
  } catch (error) {
    console.error('❌ Unable to connect to the database:', error);
  }
};

module.exports = { sequelize, testConnection };
