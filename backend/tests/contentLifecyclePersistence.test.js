const SequelizePackage = require('sequelize');
const { Sequelize, DataTypes } = SequelizePackage;
const migration = require('../migrations/028-lesson-version-lineage');

describe('lesson version lineage persistence', () => {
  test('adds a unique predecessor link and reverses it cleanly', async () => {
    const database = new Sequelize('sqlite::memory:', { logging: false });
    const queryInterface = database.getQueryInterface();
    await queryInterface.createTable('lessons', {
      id: { type: DataTypes.UUID, primaryKey: true },
    });
    try {
      await migration.up(queryInterface, SequelizePackage);
      const columns = await queryInterface.describeTable('lessons');
      expect(columns).toHaveProperty('previousVersionId');
      const indexes = await queryInterface.showIndex('lessons');
      expect(indexes.find((index) => index.name === 'lessons_previous_version_unique')).toMatchObject({ unique: true });

      await migration.down(queryInterface);
      const reverted = await queryInterface.describeTable('lessons');
      expect(reverted).not.toHaveProperty('previousVersionId');
    } finally {
      await database.close();
    }
  });
});
