const path = require('path');
const crypto = require('crypto');
const { Sequelize } = require('sequelize');
const { Umzug, SequelizeStorage } = require('umzug');

describe('account data export and erasure integration', () => {
  let database;
  let models;
  let exportedAccountData;
  let eraseAccountData;
  let user;
  let otherUser;
  let sharedClassroom;
  let ownedClassroom;
  let assignment;
  let ownedAssignment;
  let lesson;
  let question;
  let targetedConfig;
  let participant;
  let registeredAsset;

  beforeAll(async () => {
    database = new Sequelize({ dialect: 'sqlite', storage: ':memory:', logging: false });
    const runner = new Umzug({
      migrations: {
        glob: path.join(__dirname, '../migrations/*.js').split(path.sep).join('/'),
        resolve: ({ name, path: migrationPath, context }) => {
          const migration = require(migrationPath);
          return {
            name,
            up: () => migration.up(context, require('sequelize')),
            down: () => migration.down(context, require('sequelize')),
          };
        },
      },
      context: database.getQueryInterface(),
      storage: new SequelizeStorage({ sequelize: database }),
      logger: undefined,
    });
    await runner.up();

    jest.doMock('../config/database', () => ({ sequelize: database }));
    models = require('../models');
    ({ exportedAccountData, eraseAccountData } = require('../services/accountDataService'));

    user = await models.User.create({
      email: 'erase-me@example.test',
      password: 'password123',
      firstName: 'Erase',
      lastName: 'Me',
      dateOfBirth: '2008-01-01',
      role: 'student',
    });
    otherUser = await models.User.create({
      email: 'keep-me@example.test',
      password: 'password123',
      firstName: 'Keep',
      lastName: 'Me',
      dateOfBirth: '1980-01-01',
      role: 'instructor',
    });

    const course = await models.Course.create({
      title: 'Privacy course',
      description: 'Course used by account erasure integration tests.',
      shortDescription: 'Privacy test course',
      category: 'other',
      level: 'beginner',
      duration: 30,
      isPublished: true,
    });
    const module = await models.Module.create({
      courseId: course.id,
      title: 'Privacy module',
      order: 1,
    });
    lesson = await models.Lesson.create({
      moduleId: module.id,
      title: 'Privacy lesson',
      duration: 10,
      order: 1,
      lessonType: 'reading',
      reviewedBy: user.id,
      metadata: {
        reviewAttribution: {
          reviewerUserId: user.id,
          reviewerName: 'Erase Me',
        },
      },
    });

    sharedClassroom = await models.Classroom.create({
      name: 'Shared classroom',
      code: 'SHARED01',
      createdBy: otherUser.id,
    });
    ownedClassroom = await models.Classroom.create({
      name: 'Owned classroom',
      code: 'OWNED001',
      createdBy: user.id,
    });
    await models.ClassMembership.bulkCreate([
      { classroomId: sharedClassroom.id, userId: otherUser.id, role: 'teacher' },
      { classroomId: sharedClassroom.id, userId: user.id, role: 'student' },
      { classroomId: ownedClassroom.id, userId: user.id, role: 'teacher' },
    ]);
    assignment = await models.Assignment.create({
      classroomId: sharedClassroom.id,
      courseId: course.id,
      lessonId: lesson.id,
      title: 'Shared assignment',
    });
    ownedAssignment = await models.Assignment.create({
      classroomId: ownedClassroom.id,
      courseId: course.id,
      lessonId: lesson.id,
      title: 'Owned assignment',
    });
    await models.AssignmentSubmission.create({
      assignmentId: assignment.id,
      studentId: user.id,
      status: 'completed',
      submittedAt: new Date(),
    });
    const announcement = await models.ClassAnnouncement.create({
      classroomId: sharedClassroom.id,
      authorId: user.id,
      content: 'My announcement',
    });
    const comment = await models.Comment.create({
      classroomId: sharedClassroom.id,
      commentableType: 'announcement',
      commentableId: announcement.id,
      authorId: user.id,
      content: 'My classroom comment',
    });
    const report = await models.CommentModerationRecord.create({
      classroomId: sharedClassroom.id,
      commentId: comment.id,
      reportedById: otherUser.id,
      commentAuthorId: user.id,
      reason: 'privacy',
      details: 'Contains personal information',
      contentSnapshot: comment.content,
    });
    await models.CommentModerationAction.create({
      reportId: report.id,
      actorId: otherUser.id,
      fromStatus: 'pending',
      toStatus: 'actioned',
      note: 'Removed after review',
    });
    await models.CommentModerationAction.create({
      reportId: report.id,
      actorId: user.id,
      fromStatus: 'pending',
      toStatus: 'reviewed',
      note: 'Learner safety review preserved without actor identity',
    });

    await models.UserProgress.create({
      userId: user.id,
      courseId: course.id,
      lessonId: lesson.id,
      status: 'in_progress',
      notes: 'Private progress note',
    });
    const teacherProfile = await models.TeacherProfile.create({
      userId: user.id,
      schoolName: 'Example School',
      staffEmail: 'erase-me@example.test',
      status: 'pending',
    });
    await models.TeacherVerificationAudit.create({
      teacherProfileId: teacherProfile.id,
      teacherUserId: user.id,
      actorUserId: otherUser.id,
      fromStatus: 'pending',
      toStatus: 'rejected',
      note: 'Rejected Erase Me during the test review',
    });
    targetedConfig = await models.OutcomeAssignmentConfig.create({
      assignmentId: assignment.id,
      createdBy: otherUser.id,
      mode: 'practice',
      targetStudentIds: [user.id, otherUser.id],
    });

    const otherSession = await models.LiveSession.create({
      code: 'LIVEKEEP',
      hostUserId: otherUser.id,
      lessonId: lesson.id,
      status: 'finished',
    });
    participant = await models.LiveParticipant.create({
      sessionId: otherSession.id,
      userId: user.id,
      nickname: 'EraseMe',
    });
    await models.LiveResponse.create({
      sessionId: otherSession.id,
      participantId: participant.id,
      slideIndex: 0,
      responseData: { answer: 'private response' },
      correct: true,
      pointsAwarded: 100,
      answeredAtMs: Date.now(),
    });
    await models.LiveSession.create({
      code: 'LIVEERAS',
      hostUserId: user.id,
      lessonId: lesson.id,
      status: 'finished',
    });

    const connection = await models.CdrConnection.create({
      userId: user.id,
      status: 'active',
      scopes: ['bank:transactions:read'],
    });
    await models.CdrTransaction.create({
      connectionId: connection.id,
      accountId: 'account-1',
      transactionId: 'transaction-1',
      amount: -42,
      description: 'PRIVATE PURCHASE',
      category: 'spending',
      uncertain: false,
    });
    await models.GuardianConsentRequest.create({
      userId: user.id,
      guardianEmail: 'guardian@example.test',
      tokenHash: 'secret-token-hash',
      policyVersion: 'privacy-v1',
      expiresAt: new Date(Date.now() + 86400000),
    });

    question = await models.Question.create({
      questionKey: 'privacy-question',
      subject: 'economics',
      prompt: 'What is privacy?',
      responseType: 'short_answer',
      createdBy: user.id,
      reviewedBy: user.id,
      metadata: {
        reviewAttribution: {
          reviewerUserId: user.id,
          reviewerName: 'Erase Me',
        },
      },
    });
    await models.ContentRevision.create({
      entityType: 'question',
      entityId: question.id,
      version: 1,
      snapshot: {
        id: question.id,
        createdBy: user.id,
        reviewedBy: user.id,
        metadata: {
          reviewAttribution: {
            reviewerUserId: user.id,
            reviewerName: 'Erase Me',
          },
        },
      },
      changeSummary: 'Privacy test revision',
    });
    await models.FeatureFlag.create({
      key: 'privacy.test.flag',
      createdBy: user.id,
      updatedBy: otherUser.id,
    });
    await models.FeatureFlagAudit.create({
      flagKey: 'privacy.test.flag',
      action: 'created',
      actorUserId: user.id,
      nextValue: { key: 'privacy.test.flag', createdBy: user.id },
    });
    await models.BackupVerification.create({
      verificationKey: 'provider:test:backup:2026-01-01',
      backupId: 'backup-1',
      provider: 'test',
      environment: 'test',
      status: 'verified',
      backupCreatedAt: new Date('2026-01-01T00:00:00Z'),
      verifiedAt: new Date('2026-01-01T00:05:00Z'),
      checksumVerified: true,
      evidenceDigest: crypto.createHash('sha256').update('test').digest('hex'),
      recordedBy: user.id,
    });
    registeredAsset = await models.UploadedAsset.create({
      key: `quarantine/uploads/users/${user.id}/avatar-test.png`,
      finalKey: `uploads/users/${user.id}/avatar-test.png`,
      userId: user.id,
      purpose: 'avatar',
      mimeType: 'image/png',
      status: 'presigned',
    });
  });

  afterAll(async () => {
    await database.close();
    jest.dontMock('../config/database');
  });

  test('exports every user-linked category without leaking guardian auth secrets', async () => {
    const document = await exportedAccountData(user, { models });

    expect(document.schemaVersion).toBe(2);
    expect(document.account).not.toHaveProperty('password');
    expect(document.data.UserProgress).toHaveLength(1);
    expect(document.data.AssignmentSubmission).toEqual([
      expect.objectContaining({ studentId: user.id, assignmentId: assignment.id }),
    ]);
    expect(document.data.ClassAnnouncement).toHaveLength(1);
    expect(document.data.Comment).toHaveLength(1);
    expect(document.data.TeacherProfile).toHaveLength(1);
    expect(document.data.OutcomeAssignmentConfig).toEqual([
      expect.objectContaining({ id: targetedConfig.id }),
    ]);
    expect(document.data.Assignment).toEqual([
      expect.objectContaining({ id: ownedAssignment.id, title: 'Owned assignment' }),
    ]);
    expect(document.data.LiveParticipant).toEqual([
      expect.objectContaining({ id: participant.id, nickname: 'EraseMe' }),
    ]);
    expect(document.data.LiveResponse).toHaveLength(1);
    expect(document.data.CdrTransaction).toEqual([
      expect.objectContaining({ description: 'PRIVATE PURCHASE' }),
    ]);
    expect(document.data.CommentModerationRecord).toHaveLength(1);
    expect(document.data.CommentModerationAction).toHaveLength(2);
    expect(document.data.QuestionAttribution).toEqual([
      expect.objectContaining({ id: question.id }),
    ]);
    expect(document.data.LessonReviewAttribution).toEqual([
      expect.objectContaining({ id: lesson.id }),
    ]);
    expect(document.data.ContentRevisionAttribution).toHaveLength(1);
    expect(document.data.TeacherVerificationAuditAttribution).toHaveLength(1);
    expect(document.data.FeatureFlagAuditAttribution).toHaveLength(1);
    expect(document.data.BackupVerificationAttribution).toHaveLength(1);
    expect(document.data.UploadedAsset).toEqual([
      expect.objectContaining({ id: registeredAsset.id, status: 'presigned' }),
    ]);
    expect(document.data.GuardianConsentRequest[0]).not.toHaveProperty('tokenHash');
  });

  test('deletes owned rows and objects, scrubs shared references, and commits atomically', async () => {
    const objectStorage = { deleteUserObjects: jest.fn().mockResolvedValue({ deletedKeys: [] }) };
    await eraseAccountData(user.id, { models, objectStorage });

    expect(objectStorage.deleteUserObjects).toHaveBeenCalledWith({
      userId: user.id,
      keys: expect.arrayContaining([registeredAsset.key, registeredAsset.finalKey]),
    });
    await expect(models.User.findByPk(user.id)).resolves.toBeNull();
    await expect(models.User.findByPk(otherUser.id)).resolves.toEqual(expect.objectContaining({ id: otherUser.id }));
    await expect(models.Classroom.findByPk(ownedClassroom.id)).resolves.toBeNull();
    await expect(models.Classroom.findByPk(sharedClassroom.id)).resolves.toEqual(expect.objectContaining({ id: sharedClassroom.id }));
    await expect(models.Assignment.findByPk(assignment.id)).resolves.toEqual(expect.objectContaining({ id: assignment.id }));
    await expect(models.AssignmentSubmission.count({ where: { studentId: user.id } })).resolves.toBe(0);
    await expect(models.ClassAnnouncement.count({ where: { authorId: user.id } })).resolves.toBe(0);
    await expect(models.Comment.count({ where: { authorId: user.id } })).resolves.toBe(0);
    await expect(models.LiveParticipant.findByPk(participant.id)).resolves.toBeNull();
    await expect(models.LiveResponse.count({ where: { participantId: participant.id } })).resolves.toBe(0);
    const moderationRecord = await models.CommentModerationRecord.findOne({ where: { reason: 'privacy' } });
    expect(moderationRecord).toMatchObject({
      commentId: null,
      commentAuthorId: null,
      reportedById: otherUser.id,
      details: null,
      contentSnapshot: '[redacted after account deletion]',
      status: 'pending',
    });
    const preservedAction = await models.CommentModerationAction.findOne({
      where: { note: 'Learner safety review preserved without actor identity' },
    });
    expect(preservedAction).toMatchObject({ actorId: null, toStatus: 'reviewed' });
    await expect(models.UploadedAsset.count({ where: { userId: user.id } })).resolves.toBe(0);
    await expect(models.CdrConnection.count({ where: { userId: user.id } })).resolves.toBe(0);
    await expect(models.CdrTransaction.count()).resolves.toBe(0);

    await targetedConfig.reload();
    expect(targetedConfig.targetStudentIds).toEqual([otherUser.id]);
    await lesson.reload();
    expect(lesson.reviewedBy).toBeNull();
    expect(lesson.metadata.reviewAttribution).toMatchObject({
      reviewerUserId: null,
      reviewerName: 'Deleted user',
    });
    await question.reload();
    expect(question.createdBy).toBeNull();
    expect(question.reviewedBy).toBeNull();
    expect(question.metadata.reviewAttribution).toMatchObject({
      reviewerUserId: null,
      reviewerName: 'Deleted user',
    });
    const revision = await models.ContentRevision.findOne({ where: { entityId: question.id } });
    expect(revision.snapshot).toMatchObject({
      createdBy: null,
      reviewedBy: null,
      metadata: { reviewAttribution: { reviewerUserId: null, reviewerName: 'Deleted user' } },
    });
    const teacherAudit = await models.TeacherVerificationAudit.findOne({ where: { toStatus: 'rejected' } });
    expect(teacherAudit).toMatchObject({ teacherProfileId: null, teacherUserId: null, actorUserId: otherUser.id });
    expect(teacherAudit.note).toBe('Rejected [redacted] during the test review');
    const flag = await models.FeatureFlag.findOne({ where: { key: 'privacy.test.flag' } });
    expect(flag).toMatchObject({ createdBy: null, updatedBy: otherUser.id });
    const audit = await models.FeatureFlagAudit.findOne({ where: { flagKey: 'privacy.test.flag' } });
    expect(audit.actorUserId).toBeNull();
    expect(audit.nextValue).toMatchObject({ key: 'privacy.test.flag', createdBy: null });
    const backup = await models.BackupVerification.findOne({ where: { backupId: 'backup-1' } });
    expect(backup.recordedBy).toBeNull();
  });

  test('does not delete the database account when object erasure fails', async () => {
    const retryUser = await models.User.create({
      email: 'retry@example.test',
      password: 'password123',
      firstName: 'Retry',
      lastName: 'User',
      role: 'student',
    });
    await models.UploadedAsset.create({
      key: `quarantine/uploads/users/${retryUser.id}/avatar.png`,
      finalKey: `uploads/users/${retryUser.id}/avatar.png`,
      userId: retryUser.id,
      purpose: 'avatar',
      mimeType: 'image/png',
    });
    const objectStorage = { deleteUserObjects: jest.fn().mockRejectedValue(new Error('S3 unavailable')) };

    await expect(eraseAccountData(retryUser.id, { models, objectStorage })).rejects.toThrow('S3 unavailable');
    await expect(models.User.findByPk(retryUser.id)).resolves.toEqual(expect.objectContaining({ id: retryUser.id }));
    await expect(models.UploadedAsset.count({ where: { userId: retryUser.id } })).resolves.toBe(1);
  });
});
