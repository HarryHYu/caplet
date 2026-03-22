const path = require('path');
const { Umzug, SequelizeStorage } = require('umzug');
const { sequelize } = require('./database');

/**
 * Umzug migration runner.
 * Manages database schema migrations using Sequelize's queryInterface.
 * Migrations are stored in backend/migrations/ and tracked in the SequelizeMeta table.
 */
const umzug = new Umzug({
  migrations: {
    glob: path.join(__dirname, '../migrations/*.js'),
    resolve: ({ name, path: migrationPath, context }) => {
      // eslint-disable-next-line global-require
      const migration = require(migrationPath);
      const Sequelize = require('sequelize');
      return {
        name,
        up: async () => migration.up(context, Sequelize),
        down: async () => migration.down(context, Sequelize)
      };
    }
  },
  context: sequelize.getQueryInterface(),
  storage: new SequelizeStorage({ sequelize }),
  logger: console
});

/**
 * Run all pending migrations.
 * Creates the SequelizeMeta table if it doesn't exist and executes up() for each migration.
 */
const runMigrations = async () => {
  try {
    console.log('🔄 Running database migrations...');
    const migrations = await umzug.up();
    if (migrations.length > 0) {
      console.log(`✅ Successfully ran ${migrations.length} migration(s)`);
      migrations.forEach(migration => {
        console.log(`   - ${migration.name}`);
      });
    } else {
      console.log('✅ Database is up to date (no migrations to run)');
    }
  } catch (error) {
    console.error('❌ Migration error:', error);
    throw error;
  }
};

module.exports = { runMigrations };
