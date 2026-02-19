const { Sequelize } = require('sequelize');

const sequelize = process.env.DATABASE_URL
  ? new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  })
  : new Sequelize({
    dialect: 'sqlite',
    storage: './caplet.db',
    logging: false // Less noise in dev
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
