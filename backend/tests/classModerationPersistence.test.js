const SequelizePackage = require('sequelize');
const { Sequelize, DataTypes } = SequelizePackage;
const moderationMigration = require('../migrations/032-class-comment-moderation');
const teacherAuditMigration = require('../migrations/033-teacher-verification-audit');
const notificationMigration = require('../migrations/034-moderation-notification-delivery');
const CommentModerationRecord = require('../models/CommentModerationRecord');
const CommentModerationAction = require('../models/CommentModerationAction');
const TeacherVerificationAudit = require('../models/TeacherVerificationAudit');

async function expectModelColumns(queryInterface, tableName, Model) {
  const columns = await queryInterface.describeTable(tableName);
  const attributes = Object.values(Model.rawAttributes)
    .filter((attribute) => attribute.type?.key !== 'VIRTUAL')
    .map((attribute) => attribute.field)
    .sort();
  expect(Object.keys(columns).sort()).toEqual(attributes);
}

describe('class safety persistence', () => {
  test('moderation and teacher audit migrations match models and reverse cleanly', async () => {
    const database = new Sequelize('sqlite::memory:', { logging: false });
    const queryInterface = database.getQueryInterface();
    await queryInterface.createTable('users', { id: { type: DataTypes.UUID, primaryKey: true } });
    await queryInterface.createTable('classrooms', { id: { type: DataTypes.UUID, primaryKey: true } });
    await queryInterface.createTable('comments', { id: { type: DataTypes.UUID, primaryKey: true } });
    await queryInterface.createTable('teacher_profiles', { id: { type: DataTypes.UUID, primaryKey: true } });
    try {
      await moderationMigration.up(queryInterface, SequelizePackage);
      // A process can stop after DDL commits but before Umzug records the
      // migration. Re-running must resume without duplicate-table/index errors.
      await moderationMigration.up(queryInterface, SequelizePackage);
      await teacherAuditMigration.up(queryInterface, SequelizePackage);
      await notificationMigration.up(queryInterface, SequelizePackage);
      await notificationMigration.up(queryInterface, SequelizePackage);
      await expectModelColumns(queryInterface, 'comment_moderation_records', CommentModerationRecord);
      await expectModelColumns(queryInterface, 'comment_moderation_actions', CommentModerationAction);
      await expectModelColumns(queryInterface, 'teacher_verification_audits', TeacherVerificationAudit);
      const reportIndexes = await queryInterface.showIndex('comment_moderation_records');
      expect(reportIndexes.find((index) => index.name === 'comment_moderation_reporter_comment_unique'))
        .toMatchObject({ unique: true });
      expect(reportIndexes.find((index) => index.name === 'comment_moderation_notification_retry_idx'))
        .toBeDefined();

      await notificationMigration.down(queryInterface);
      await teacherAuditMigration.down(queryInterface);
      await moderationMigration.down(queryInterface);
      const tables = await queryInterface.showAllTables();
      expect(tables).not.toEqual(expect.arrayContaining([
        'comment_moderation_records',
        'comment_moderation_actions',
        'teacher_verification_audits',
      ]));
    } finally {
      await database.close();
    }
  });
});
