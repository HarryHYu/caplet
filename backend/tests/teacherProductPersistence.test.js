const SequelizePackage = require('sequelize');
const { Sequelize, DataTypes } = SequelizePackage;
const migration = require('../migrations/022-teacher-profiles');
const TeacherProfile = require('../models/TeacherProfile');
const OutcomeAssignmentConfig = require('../models/OutcomeAssignmentConfig');

describe('teacher product persistence', () => {
  test('migration matches both models and enforces one profile/config per owner', async () => {
    const database = new Sequelize('sqlite::memory:', { logging: false });
    const queryInterface = database.getQueryInterface();
    await queryInterface.createTable('users', {
      id: { type: DataTypes.UUID, primaryKey: true },
    });
    await queryInterface.createTable('assignments', {
      id: { type: DataTypes.UUID, primaryKey: true },
    });

    try {
      await migration.up(queryInterface, SequelizePackage);
      const tables = await queryInterface.showAllTables();
      expect(tables).toEqual(expect.arrayContaining([
        'teacher_profiles',
        'outcome_assignment_configs',
      ]));

      const assertModelMatches = async (tableName, Model) => {
        const columns = await queryInterface.describeTable(tableName);
        const attributes = Object.values(Model.rawAttributes)
          .filter((attribute) => attribute.type?.key !== 'VIRTUAL')
          .map((attribute) => attribute.field)
          .sort();
        expect(Object.keys(columns).sort()).toEqual(attributes);
      };
      await assertModelMatches('teacher_profiles', TeacherProfile);
      await assertModelMatches('outcome_assignment_configs', OutcomeAssignmentConfig);

      const teacherIndexes = await queryInterface.showIndex('teacher_profiles');
      const assignmentIndexes = await queryInterface.showIndex('outcome_assignment_configs');
      expect(teacherIndexes.some((index) => index.unique
        && index.fields.some((field) => field.attribute === 'userId'))).toBe(true);
      expect(assignmentIndexes.some((index) => index.unique
        && index.fields.some((field) => field.attribute === 'assignmentId'))).toBe(true);

      await migration.down(queryInterface);
      const afterDown = await queryInterface.showAllTables();
      expect(afterDown).not.toEqual(expect.arrayContaining([
        'teacher_profiles',
        'outcome_assignment_configs',
      ]));
    } finally {
      await database.close();
    }
  });
});
