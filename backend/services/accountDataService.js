const { Op } = require('sequelize');

const plain = (row) => (row?.toJSON ? row.toJSON() : { ...row });
const plainRows = (rows) => rows.map(plain);

function uniqueRows(rows) {
  return [...new Map(rows.map((row) => [String(row.id), row])).values()];
}

function referencesUser(value, userId) {
  if (String(value) === String(userId)) return true;
  if (Array.isArray(value)) return value.some((item) => referencesUser(item, userId));
  if (value && typeof value === 'object') {
    return Object.values(value).some((item) => referencesUser(item, userId));
  }
  return false;
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function redactUserReferences(value, userId, personalTerms = []) {
  if (String(value) === String(userId)) return null;
  if (Array.isArray(value)) {
    return value
      .filter((item) => String(item) !== String(userId))
      .map((item) => redactUserReferences(item, userId, personalTerms));
  }
  if (typeof value === 'string') {
    return [String(userId), ...personalTerms]
      .filter((term) => String(term || '').length >= 3)
      .reduce((text, term) => text.replace(new RegExp(escapeRegExp(term), 'gi'), '[redacted]'), value);
  }
  if (!value || typeof value !== 'object') return value;
  const reviewerWasDeleted = String(value.reviewerUserId || '') === String(userId);
  const redacted = Object.fromEntries(
    Object.entries(value).map(([key, item]) => [key, redactUserReferences(item, userId, personalTerms)]),
  );
  if (reviewerWasDeleted && Object.prototype.hasOwnProperty.call(redacted, 'reviewerName')) {
    redacted.reviewerName = 'Deleted user';
  }
  return redacted;
}

async function findAll(Model, where, options = {}) {
  if (!Model?.findAll) return [];
  return Model.findAll({ where, ...options });
}

async function exportedAccountData(account, { models = require('../models') } = {}) {
  const userId = account.id;
  const direct = [
    ['UserProgress', { userId }],
    ['ClassMembership', { userId }],
    // AssignmentSubmission uses studentId, not userId.
    ['AssignmentSubmission', { studentId: userId }],
    ['Classroom', { createdBy: userId }],
    ['ClassAnnouncement', { authorId: userId }],
    ['Comment', { [Op.or]: [{ authorId: userId }, { targetUserId: userId }] }],
    ['ChatMessage', { userId }],
    ['SavedSlide', { userId }],
    ['UserFinancialProfile', { userId }],
    ['ReviewItem', { userId }],
    ['Essay', { userId }],
    ['MarkedAttempt', { userId }],
    ['StudyPlan', { userId }],
    ['EconomicsExamSession', { userId }],
    ['PracticeSession', { userId }],
    ['LearningEvidence', { userId }],
    ['MasteryState', { userId }],
    ['ProductEvent', { userId }],
    ['AIInteraction', { userId }],
    ['ConsentRecord', { userId }],
    ['UserPrivacyPreference', { userId }],
    ['GuardianConsentRequest', { userId }],
    ['TeacherProfile', { userId }],
    ['UploadedAsset', { userId }],
  ];

  const dataEntries = await Promise.all(direct.map(async ([name, where]) => [
    name,
    plainRows(await findAll(models[name], where)),
  ]));
  const data = Object.fromEntries(dataEntries);

  // Guardian tokens are authentication secrets, not portable account data.
  data.GuardianConsentRequest = data.GuardianConsentRequest.map((row) => {
    const safe = { ...row };
    delete safe.tokenHash;
    return safe;
  });

  const cdrConnections = await findAll(models.CdrConnection, { userId });
  const connectionIds = cdrConnections.map((row) => row.id);
  data.CdrConnection = plainRows(cdrConnections);
  data.CdrTransaction = connectionIds.length
    ? plainRows(await findAll(models.CdrTransaction, { connectionId: { [Op.in]: connectionIds } }))
    : [];

  const liveSessions = await findAll(models.LiveSession, { hostUserId: userId });
  const liveParticipants = await findAll(models.LiveParticipant, { userId });
  const participantIds = liveParticipants.map((row) => row.id);
  data.LiveSession = plainRows(liveSessions);
  data.LiveParticipant = plainRows(liveParticipants);
  data.LiveResponse = participantIds.length
    ? plainRows(await findAll(models.LiveResponse, { participantId: { [Op.in]: participantIds } }))
    : [];

  const ownedClassroomIds = data.Classroom.map((row) => row.id);
  const ownedAssignments = ownedClassroomIds.length
    ? await findAll(models.Assignment, { classroomId: { [Op.in]: ownedClassroomIds } })
    : [];
  data.Assignment = plainRows(ownedAssignments);

  data.CommentModerationRecord = plainRows(await findAll(models.CommentModerationRecord, {
    [Op.or]: [
      { reportedById: userId },
      { commentAuthorId: userId },
      { reviewedById: userId },
    ],
  }));
  const moderationReportIds = data.CommentModerationRecord.map((row) => row.id);
  data.CommentModerationAction = plainRows(await findAll(models.CommentModerationAction,
    moderationReportIds.length
      ? { [Op.or]: [{ actorId: userId }, { reportId: { [Op.in]: moderationReportIds } }] }
      : { actorId: userId }));

  const allAssignmentConfigs = await findAll(models.OutcomeAssignmentConfig, {});
  const ownedAssignmentIds = new Set(ownedAssignments.map((row) => String(row.id)));
  data.OutcomeAssignmentConfig = plainRows(uniqueRows(allAssignmentConfigs.filter((row) => (
    String(row.createdBy) === String(userId)
    || ownedAssignmentIds.has(String(row.assignmentId))
    || (Array.isArray(row.targetStudentIds) && row.targetStudentIds.map(String).includes(String(userId)))
  ))));

  const allQuestions = await findAll(models.Question, {});
  data.QuestionAttribution = plainRows(allQuestions.filter((row) => (
    String(row.createdBy) === String(userId)
    || String(row.reviewedBy) === String(userId)
    || referencesUser(row.metadata, userId)
  )));
  const allLessons = await findAll(models.Lesson, {});
  data.LessonReviewAttribution = plainRows(allLessons.filter((row) => (
    String(row.reviewedBy) === String(userId) || referencesUser(row.metadata, userId)
  )));
  data.ContentRevisionAttribution = plainRows((await findAll(models.ContentRevision, {}))
    .filter((row) => referencesUser(row.snapshot, userId)));
  data.TeacherVerificationAuditAttribution = plainRows(await findAll(models.TeacherVerificationAudit, {
    [Op.or]: [{ teacherUserId: userId }, { actorUserId: userId }],
  }));
  data.MarkedAttemptReviewAttribution = plainRows(await findAll(models.MarkedAttempt, {
    humanOverrideBy: userId,
  }));
  data.TeacherVerificationAttribution = plainRows(await findAll(models.TeacherProfile, {
    verifiedBy: userId,
  }));
  data.FeatureFlagAttribution = plainRows(await findAll(models.FeatureFlag, {
    [Op.or]: [{ createdBy: userId }, { updatedBy: userId }],
  }));
  data.FeatureFlagAuditAttribution = plainRows((await findAll(models.FeatureFlagAudit, {}))
    .filter((row) => String(row.actorUserId) === String(userId)
      || referencesUser(row.previousValue, userId)
      || referencesUser(row.nextValue, userId)));
  data.BackupVerificationAttribution = plainRows(await findAll(models.BackupVerification, {
    recordedBy: userId,
  }));

  return {
    schemaVersion: 2,
    generatedAt: new Date().toISOString(),
    account: plain(account),
    data,
  };
}

async function eraseAccountData(userId, {
  models = require('../models'),
  objectStorage = require('./s3Presign'),
} = {}) {
  const account = await models.User.findByPk(userId);
  if (!account) throw new Error('Account no longer exists');
  const personalTerms = [
    account.email,
    [account.firstName, account.lastName].filter(Boolean).join(' '),
  ].filter(Boolean);
  const registeredAssets = await findAll(models.UploadedAsset, { userId });
  const objectKeys = [...new Set(registeredAssets.flatMap((asset) => [
    asset.key,
    asset.finalKey,
    asset.finalKey ? `quarantine/${asset.finalKey}` : null,
  ]).filter(Boolean))];

  // Object deletion happens first. If storage rejects the request, keep the
  // database account intact so the user can retry without orphaning media.
  // If the database transaction later fails, a retry remains safe because S3
  // multi-delete is idempotent.
  if (objectKeys.length || process.env.AWS_S3_BUCKET) {
    await objectStorage.deleteUserObjects({ userId, keys: objectKeys });
  }

  const deleted = {};
  await models.sequelize.transaction(async (transaction) => {
    const destroy = async (name, where) => {
      if (!models[name]?.destroy) return 0;
      const count = await models[name].destroy({ where, transaction });
      deleted[name] = (deleted[name] || 0) + count;
      return count;
    };

    // Remove the learner from assignment targeting stored inside JSON/TEXT.
    // Configs authored by this account are deleted below; shared configs are
    // retained with only this learner's identifier removed.
    if (models.OutcomeAssignmentConfig?.findAll) {
      const configs = await models.OutcomeAssignmentConfig.findAll({ transaction });
      for (const config of configs) {
        const targets = Array.isArray(config.targetStudentIds) ? config.targetStudentIds : [];
        if (String(config.createdBy) !== String(userId) && targets.map(String).includes(String(userId))) {
          await config.update({
            targetStudentIds: targets.filter((id) => String(id) !== String(userId)),
          }, { transaction });
        }
      }
    }

    // Rows that indirectly contain learner data are removed before their
    // parents, making this work on legacy databases as well as current FKs.
    const participantRows = await findAll(models.LiveParticipant, { userId }, { transaction });
    const participantIds = participantRows.map((row) => row.id);
    if (participantIds.length) await destroy('LiveResponse', { participantId: { [Op.in]: participantIds } });
    await destroy('LiveParticipant', { userId });

    const connectionRows = await findAll(models.CdrConnection, { userId }, { transaction });
    const connectionIds = connectionRows.map((row) => row.id);
    if (connectionIds.length) await destroy('CdrTransaction', { connectionId: { [Op.in]: connectionIds } });
    await destroy('CdrConnection', { userId });

    // Safety evidence remains auditable after erasure, but no longer identifies
    // the reporter, learner, or reviewer. Content/details supplied by or about
    // the erased account are replaced while status, reason, and timestamps stay.
    const affectedModerationReportIds = [];
    if (models.CommentModerationRecord?.findAll) {
      const moderationRows = await models.CommentModerationRecord.findAll({
        where: {
          [Op.or]: [
            { reportedById: userId },
            { commentAuthorId: userId },
            { reviewedById: userId },
          ],
        },
        transaction,
      });
      for (const record of moderationRows) {
        affectedModerationReportIds.push(record.id);
        const contentBelongsToUser = String(record.reportedById) === String(userId)
          || String(record.commentAuthorId) === String(userId);
        await record.update({
          ...(String(record.reportedById) === String(userId) ? { reportedById: null } : {}),
          ...(String(record.commentAuthorId) === String(userId) ? { commentAuthorId: null } : {}),
          ...(String(record.reviewedById) === String(userId) ? { reviewedById: null } : {}),
          ...(contentBelongsToUser ? {
            details: null,
            contentSnapshot: '[redacted after account deletion]',
          } : {}),
          metadata: redactUserReferences(record.metadata || {}, userId, personalTerms),
        }, { transaction });
      }
    }
    if (models.CommentModerationAction?.findAll) {
      const actions = await models.CommentModerationAction.findAll({
        where: affectedModerationReportIds.length
          ? { [Op.or]: [{ actorId: userId }, { reportId: { [Op.in]: affectedModerationReportIds } }] }
          : { actorId: userId },
        transaction,
      });
      for (const action of actions) {
        await action.update({
          ...(String(action.actorId) === String(userId) ? { actorId: null } : {}),
          note: redactUserReferences(action.note, userId, personalTerms),
        }, { transaction });
      }
    }
    await destroy('Comment', { [Op.or]: [{ authorId: userId }, { targetUserId: userId }] });
    await destroy('ClassAnnouncement', { authorId: userId });
    await destroy('AssignmentSubmission', { studentId: userId });
    await destroy('ClassMembership', { userId });

    await destroy('ProductEvent', { userId });
    await destroy('LearningEvidence', { userId });
    await destroy('MasteryState', { userId });
    await destroy('PracticeSession', { userId });
    await destroy('OutcomeAssignmentConfig', { createdBy: userId });

    for (const name of [
      'UserProgress',
      'SavedSlide',
      'ReviewItem',
      'Essay',
      'ChatMessage',
      'UserFinancialProfile',
      'MarkedAttempt',
      'EconomicsExamSession',
      'StudyPlan',
      'TeacherProfile',
      'GuardianConsentRequest',
      'AIInteraction',
      'ConsentRecord',
      'UserPrivacyPreference',
      'UploadedAsset',
    ]) {
      await destroy(name, { userId });
    }

    // These records belong to shared content or immutable operational audit
    // trails. Erase only the account attribution rather than deleting them.
    if (models.Lesson?.findAll) {
      const lessons = await models.Lesson.findAll({ transaction });
      for (const lesson of lessons) {
        const patch = {};
        if (String(lesson.reviewedBy) === String(userId)) patch.reviewedBy = null;
        if (referencesUser(lesson.metadata, userId)) {
          patch.metadata = redactUserReferences(lesson.metadata, userId, personalTerms);
        }
        if (Object.keys(patch).length) await lesson.update(patch, { transaction });
      }
    }
    if (models.MarkedAttempt?.update) {
      await models.MarkedAttempt.update(
        { humanOverrideBy: null },
        { where: { humanOverrideBy: userId }, transaction },
      );
    }
    if (models.Question?.findAll) {
      const questions = await models.Question.findAll({ transaction });
      for (const question of questions) {
        const patch = {};
        if (String(question.createdBy) === String(userId)) patch.createdBy = null;
        if (String(question.reviewedBy) === String(userId)) patch.reviewedBy = null;
        if (referencesUser(question.metadata, userId)) {
          patch.metadata = redactUserReferences(question.metadata, userId, personalTerms);
        }
        if (Object.keys(patch).length) await question.update(patch, { transaction });
      }
    }
    if (models.ContentRevision?.findAll) {
      const revisions = await models.ContentRevision.findAll({ transaction });
      for (const revision of revisions) {
        if (referencesUser(revision.snapshot, userId)) {
          await revision.update({
            snapshot: redactUserReferences(revision.snapshot, userId, personalTerms),
          }, { transaction });
        }
      }
    }
    if (models.TeacherVerificationAudit?.findAll) {
      const audits = await models.TeacherVerificationAudit.findAll({
        where: { [Op.or]: [{ teacherUserId: userId }, { actorUserId: userId }] },
        transaction,
      });
      for (const audit of audits) {
        await audit.update({
          ...(String(audit.teacherUserId) === String(userId) ? { teacherUserId: null } : {}),
          ...(String(audit.actorUserId) === String(userId) ? { actorUserId: null } : {}),
          note: redactUserReferences(audit.note, userId, personalTerms),
          metadata: redactUserReferences(audit.metadata || {}, userId, personalTerms),
        }, { transaction });
      }
    }
    if (models.FeatureFlagAudit?.findAll) {
      const audits = await models.FeatureFlagAudit.findAll({ transaction });
      for (const audit of audits) {
        if (String(audit.actorUserId) === String(userId)
            || referencesUser(audit.previousValue, userId)
            || referencesUser(audit.nextValue, userId)) {
          // Operational history stays present, but its JSON snapshots must not
          // outlive a user's erased identity. hooks:false is the explicit
          // privacy exception to this model's general append-only guard.
          await models.FeatureFlagAudit.update({
            ...(String(audit.actorUserId) === String(userId) ? { actorUserId: null } : {}),
            previousValue: redactUserReferences(audit.previousValue, userId, personalTerms),
            nextValue: redactUserReferences(audit.nextValue, userId, personalTerms),
          }, { where: { id: audit.id }, transaction, hooks: false });
        }
      }
    }

    // A hosted live session and a teacher-created classroom are account-owned.
    // Their dependent rows are intentionally removed by explicit cascade.
    await destroy('LiveSession', { hostUserId: userId });
    await destroy('Classroom', { createdBy: userId });

    const userCount = await models.User.destroy({ where: { id: userId }, transaction });
    if (userCount !== 1) throw new Error('Account no longer exists');
    deleted.User = userCount;
  });

  return { deleted, deletedObjectKeys: objectKeys };
}

module.exports = {
  eraseAccountData,
  exportedAccountData,
};
