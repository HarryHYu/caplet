const { Sequelize } = require('sequelize');

// PostgreSQL only (Railway). DATABASE_URL must be set.
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is required. Set it in Railway or in backend/.env');
}

const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000
  }
});

const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connection established (PostgreSQL).');
  } catch (error) {
    console.error('❌ Unable to connect to the database:', error);
  }
};

module.exports = { sequelize, testConnection };
