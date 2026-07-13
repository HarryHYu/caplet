const path = require('path');
const { Sequelize } = require('sequelize');
const { Umzug, SequelizeStorage } = require('umzug');

async function main() {
  const database = process.env.MIGRATION_CHECK_DATABASE_URL
    ? new Sequelize(process.env.MIGRATION_CHECK_DATABASE_URL, { logging: false })
    : new Sequelize({ dialect: 'sqlite', storage: ':memory:', logging: false });
  const runner = new Umzug({
    migrations: {
      glob: path.join(__dirname, '../migrations/*.js').split(path.sep).join('/'),
      resolve: ({ name, path: migrationPath, context }) => {
        const migration = require(migrationPath);
        return {
          name,
          up: () => migration.up(context, Sequelize),
          down: () => migration.down(context, Sequelize),
        };
      },
    },
    context: database.getQueryInterface(),
    storage: new SequelizeStorage({ sequelize: database }),
    logger: undefined,
  });

  try {
    const applied = await runner.up();
    const pendingAfterUp = await runner.pending();
    if (!applied.length || pendingAfterUp.length) throw new Error('Not every migration applied cleanly.');
    await runner.down({ to: 0 });
    const remaining = await runner.executed();
    if (remaining.length) throw new Error('Not every migration rolled back cleanly.');
    console.log(`Migration rehearsal passed on ${database.getDialect()}: ${applied.length} up, ${applied.length} down.`);
  } finally {
    await database.close();
  }
}

main().catch((error) => {
  console.error('Migration rehearsal failed:', error);
  process.exitCode = 1;
});
