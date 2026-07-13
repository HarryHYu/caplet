const crypto = require('crypto');
const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const { Op } = require('sequelize');
const { sequelize } = require('../config/database');
const {
  User,
  Classroom,
  ClassMembership,
  Assignment,
  AssignmentSubmission,
  TeacherProfile,
  TeacherVerificationAudit,
  OutcomeAssignmentConfig,
  CurriculumOutcome,
  LearningEvidence,
  MasteryState,
  Question,
  QuestionOutcome,
} = require('../models');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const {
  asArray,
  asPlain,
  buildClassAnalytics,
  currentEvidence,
  refreshMasteryAfterOverride,
  selectAssignmentQuestions,
  uniqueStrings,
} = require('../services/teacherLearningService');

const router = express.Router();

const VALID_JURISDICTIONS = ['ACT', 'NSW', 'NT', 'QLD', 'SA', 'TAS', 'VIC', 'WA'];
const VALID_MODES = ['diagnostic', 'practice', 'revision', 'exam', 'remediation', 'adaptive'];

const asyncRoute = (handler) => (req, res, next) => {
  Promise.resolve(handler(req, res, next)).catch(next);
};

const rejectInvalid = (req, res, next) => {
  const errors = validationResult(req);
  if (errors.isEmpty()) return next();
  return res.status(400).json({
    message: 'Validation failed',
    errors: errors.array().map((error) => ({ field: error.path, message: error.msg })),
  });
};

const requireTeacherModels = () => {
  const required = {
    TeacherProfile,
    TeacherVerificationAudit,
    OutcomeAssignmentConfig,
    CurriculumOutcome,
    LearningEvidence,
    MasteryState,
    Question,
    QuestionOutcome,
  };
  const missing = Object.entries(required).filter(([, model]) => !model).map(([name]) => name);
  if (missing.length) {
    const error = new Error(`Teacher learning models are not registered: ${missing.join(', ')}`);
    error.status = 503;
    throw error;
  }
};

const normaliseDomain = (value, staffEmail) => {
  const candidate = String(value || staffEmail?.split('@')[1] || '').trim().toLowerCase();
  if (!candidate) return null;
  return candidate.replace(/^https?:\/\//, '').split('/')[0].replace(/^www\./, '') || null;
};

const profileDto = (profile) => {
  if (!profile) return { status: 'not_requested', profile: null };
  const row = asPlain(profile);
  return {
    status: row.status,
    profile: {
      id: row.id,
      userId: row.userId,
      schoolAffiliation: {
        name: row.schoolName,
        domain: row.schoolDomain,
        staffEmail: row.staffEmail,
        positionTitle: row.positionTitle,
        jurisdiction: row.jurisdiction,
      },
      verificationNote: row.verificationNote || null,
      requestedAt: row.requestedAt,
      verifiedAt: row.verifiedAt || null,
      updatedAt: row.updatedAt,
    },
  };
};

const affiliationValidators = [
  body('schoolName').trim().isLength({ min: 2, max: 200 }),
  body('staffEmail').trim().isEmail().normalizeEmail(),
  body('schoolDomain').optional({ nullable: true }).trim().isLength({ min: 3, max: 253 }),
  body('positionTitle').optional({ nullable: true }).trim().isLength({ min: 2, max: 120 }),
  body('jurisdiction').optional({ nullable: true }).isIn(VALID_JURISDICTIONS),
];

// Any signed-in educator can request verification; an admin review promotes the
// account to instructor rather than trusting a role supplied by the browser.
router.post(
  '/onboarding/request',
  requireAuth,
  affiliationValidators,
  rejectInvalid,
  asyncRoute(async (req, res) => {
    requireTeacherModels();
    const existing = await TeacherProfile.findOne({ where: { userId: req.user.id } });
    if (existing?.status === 'verified') {
      return res.status(409).json({
        message: 'This teacher account is already verified. Update the school affiliation instead.',
        ...profileDto(existing),
      });
    }

    const values = {
      userId: req.user.id,
      status: 'pending',
      schoolName: req.body.schoolName,
      schoolDomain: normaliseDomain(req.body.schoolDomain, req.body.staffEmail),
      staffEmail: req.body.staffEmail.toLowerCase(),
      positionTitle: req.body.positionTitle || null,
      jurisdiction: req.body.jurisdiction || null,
      verificationNote: null,
      requestedAt: new Date(),
      verifiedAt: null,
      verifiedBy: null,
    };

    let profile;
    let created = false;
    if (existing) {
      profile = await existing.update(values);
    } else {
      profile = await TeacherProfile.create(values);
      created = true;
    }
    return res.status(created ? 201 : 200).json(profileDto(profile));
  }),
);

router.get('/onboarding/status', requireAuth, asyncRoute(async (req, res) => {
  requireTeacherModels();
  const profile = await TeacherProfile.findOne({ where: { userId: req.user.id } });
  res.json({
    ...profileDto(profile),
    teacherAccess: req.user.role === 'admin' || profile?.status === 'verified',
  });
}));

// Changing schools returns the affiliation to review, without silently
// demoting an instructor who may still need access to existing classes.
router.patch(
  '/onboarding/affiliation',
  requireAuth,
  affiliationValidators,
  rejectInvalid,
  asyncRoute(async (req, res) => {
    requireTeacherModels();
    const profile = await TeacherProfile.findOne({ where: { userId: req.user.id } });
    if (!profile) return res.status(404).json({ message: 'Teacher verification has not been requested' });
    const previousStatus = profile.status;
    await sequelize.transaction(async (transaction) => {
      await profile.update({
        status: 'pending',
        schoolName: req.body.schoolName,
        schoolDomain: normaliseDomain(req.body.schoolDomain, req.body.staffEmail),
        staffEmail: req.body.staffEmail.toLowerCase(),
        positionTitle: req.body.positionTitle || null,
        jurisdiction: req.body.jurisdiction || null,
        verificationNote: null,
        requestedAt: new Date(),
        verifiedAt: null,
        verifiedBy: null,
      }, { transaction });
      if (previousStatus !== 'pending') {
        await TeacherVerificationAudit.create({
          teacherProfileId: profile.id,
          teacherUserId: req.user.id,
          actorUserId: req.user.id,
          fromStatus: previousStatus,
          toStatus: 'pending',
          note: 'School affiliation changed and requires reverification.',
          metadata: { source: 'teacher_affiliation_change' },
        }, { transaction });
      }
    });
    const updated = profile;
    res.json(profileDto(updated));
  }),
);

router.get('/onboarding/requests', requireAdmin, asyncRoute(async (req, res) => {
  requireTeacherModels();
  const status = req.query.status;
  if (status && !['pending', 'verified', 'rejected', 'suspended'].includes(status)) {
    return res.status(400).json({ message: 'Invalid teacher verification status' });
  }
  const profiles = await TeacherProfile.findAll({
    where: status ? { status } : {},
    order: [['requestedAt', 'ASC']],
  });
  res.json({ requests: profiles.map(profileDto) });
}));

router.patch(
  '/onboarding/:userId/status',
  requireAdmin,
  param('userId').isUUID(),
  body('status').isIn(['verified', 'rejected', 'suspended']),
  body('note').optional({ nullable: true }).trim().isLength({ max: 2000 }),
  rejectInvalid,
  asyncRoute(async (req, res) => {
    requireTeacherModels();
    if (['rejected', 'suspended'].includes(req.body.status) && !req.body.note) {
      return res.status(400).json({ message: 'A reason is required when rejecting or suspending teacher access' });
    }
    const profile = await TeacherProfile.findOne({ where: { userId: req.params.userId } });
    if (!profile) return res.status(404).json({ message: 'Teacher verification request not found' });
    const user = await User.findByPk(req.params.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const previousStatus = profile.status;
    const verified = req.body.status === 'verified';
    await sequelize.transaction(async (transaction) => {
      await profile.update({
        status: req.body.status,
        verificationNote: req.body.note || null,
        verifiedAt: verified ? new Date() : null,
        verifiedBy: verified ? req.user.id : null,
      }, { transaction });
      if (verified && user.role === 'student') {
        await user.update({ role: 'instructor' }, { transaction });
      }
      await TeacherVerificationAudit.create({
        teacherProfileId: profile.id,
        teacherUserId: user.id,
        actorUserId: req.user.id,
        fromStatus: previousStatus,
        toStatus: req.body.status,
        note: req.body.note || null,
        metadata: { source: 'admin_teacher_verification' },
      }, { transaction });
    });
    res.json({ ...profileDto(profile), teacherAccess: verified || user.role === 'admin' });
  }),
);

async function requireClassTeacher(req, res, next) {
  try {
    const classroom = await Classroom.findByPk(req.params.classroomId);
    if (!classroom) return res.status(404).json({ message: 'Class not found' });
    if (req.user.role !== 'admin') {
      if (req.user.role !== 'instructor') {
        return res.status(403).json({ message: 'Verified teacher access required' });
      }
      const profile = await TeacherProfile.findOne({
        where: { userId: req.user.id },
        attributes: ['id', 'status'],
      });
      if (profile?.status !== 'verified') {
        return res.status(403).json({
          message: 'A currently verified teacher profile is required',
          code: 'teacher_verification_required',
        });
      }
      const membership = await ClassMembership.findOne({
        where: {
          classroomId: classroom.id,
          userId: req.user.id,
          role: 'teacher',
        },
      });
      if (!membership) {
        return res.status(403).json({ message: 'Only teachers in this class can access learning data' });
      }
      req.classMembership = membership;
    }
    req.classroom = classroom;
    return next();
  } catch (error) {
    return next(error);
  }
}

async function requireClassStudent(req, res, next) {
  try {
    const membership = await ClassMembership.findOne({
      where: {
        classroomId: req.classroom.id,
        userId: req.params.studentId,
        role: 'student',
      },
    });
    if (!membership) return res.status(404).json({ message: 'Student is not a member of this class' });
    req.studentMembership = membership;
    return next();
  } catch (error) {
    return next(error);
  }
}

async function loadClassLearningSnapshot(classroomId, { subject, outcomeIds } = {}) {
  const memberships = await ClassMembership.findAll({
    where: { classroomId, role: 'student' },
    include: [{
      model: User,
      as: 'user',
      attributes: ['id', 'firstName', 'lastName', 'email'],
      required: true,
    }],
    order: [['createdAt', 'ASC']],
  });
  const students = memberships.map((membership) => asPlain(membership.user || membership.User))
    .filter(Boolean);
  const studentIds = students.map((student) => student.id);
  if (!studentIds.length) return { students, outcomes: [], states: [], evidence: [] };

  const [states, evidence] = await Promise.all([
    MasteryState.findAll({ where: { userId: { [Op.in]: studentIds } } }),
    LearningEvidence.findAll({ where: { userId: { [Op.in]: studentIds } } }),
  ]);

  const requestedIds = uniqueStrings(outcomeIds || []);
  const outcomeWhere = requestedIds.length
    ? { id: { [Op.in]: requestedIds } }
    : { subject: subject || 'economics' };
  const outcomes = await CurriculumOutcome.findAll({
    where: outcomeWhere,
    order: [['sortOrder', 'ASC'], ['code', 'ASC']],
  });
  if (requestedIds.length && outcomes.length !== requestedIds.length) {
    const error = new Error('One or more curriculum outcomes do not exist');
    error.status = 400;
    throw error;
  }
  const allowedOutcomeIds = new Set(outcomes.map((outcome) => String(outcome.id)));
  return {
    students,
    outcomes,
    states: states.filter((state) => allowedOutcomeIds.has(String(state.outcomeId))),
    evidence: evidence.filter((item) => allowedOutcomeIds.has(String(item.outcomeId))),
  };
}

router.get(
  '/classes/:classroomId/analytics',
  requireAuth,
  param('classroomId').isUUID(),
  query('threshold').optional().isFloat({ min: 0.2, max: 0.95 }),
  query('subject').optional().trim().isLength({ min: 2, max: 80 }),
  query('outcomeIds').optional().trim().isLength({ min: 1, max: 4000 }),
  rejectInvalid,
  requireClassTeacher,
  asyncRoute(async (req, res) => {
    requireTeacherModels();
    const outcomeIds = req.query.outcomeIds
      ? req.query.outcomeIds.split(',').map((id) => id.trim()).filter(Boolean)
      : [];
    const snapshot = await loadClassLearningSnapshot(req.classroom.id, {
      subject: req.query.subject,
      outcomeIds,
    });
    res.json({
      classroom: {
        id: req.classroom.id,
        name: req.classroom.name,
      },
      analytics: buildClassAnalytics({
        ...snapshot,
        threshold: req.query.threshold || 0.6,
      }),
    });
  }),
);

router.get(
  '/classes/:classroomId/students/:studentId/profile',
  requireAuth,
  param('classroomId').isUUID(),
  param('studentId').isUUID(),
  query('threshold').optional().isFloat({ min: 0.2, max: 0.95 }),
  query('subject').optional().trim().isLength({ min: 2, max: 80 }),
  rejectInvalid,
  requireClassTeacher,
  requireClassStudent,
  asyncRoute(async (req, res) => {
    requireTeacherModels();
    const snapshot = await loadClassLearningSnapshot(req.classroom.id, {
      subject: req.query.subject,
    });
    const analytics = buildClassAnalytics({
      ...snapshot,
      threshold: req.query.threshold || 0.6,
    });
    const profile = analytics.individualProfiles.find(
      (item) => item.student.id === String(req.params.studentId),
    );
    if (!profile) return res.status(404).json({ message: 'Student learning profile not found' });
    return res.json({
      classroom: { id: req.classroom.id, name: req.classroom.name },
      threshold: analytics.threshold,
      profile,
      commonMisconceptions: analytics.commonMisconceptions.filter((item) => {
        const studentEvidence = currentEvidence(snapshot.evidence).filter(
          (evidence) => String(evidence.userId) === String(req.params.studentId),
        );
        const codes = new Set(studentEvidence.flatMap((item) => asArray(item.misconceptionCodes))
          .map((code) => typeof code === 'string' ? code : code?.code)
          .filter(Boolean));
        return codes.has(item.code);
      }),
    });
  }),
);

const assignmentValidators = [
  param('classroomId').isUUID(),
  body('title').trim().isLength({ min: 1, max: 200 }),
  body('description').optional({ nullable: true }).isString().isLength({ max: 5000 }),
  body('dueDate').optional({ nullable: true }).isISO8601(),
  body('mode').optional().isIn(VALID_MODES),
  body('outcomeIds').isArray({ min: 1, max: 20 }),
  body('outcomeIds.*').isUUID(),
  body('questionIds').optional().isArray({ min: 1, max: 50 }),
  body('questionIds.*').optional().isUUID(),
  body('studentIds').optional().isArray({ min: 1, max: 500 }),
  body('studentIds.*').optional().isUUID(),
  body('questionSelection').optional().isObject(),
  body('questionSelection.count').optional().isInt({ min: 1, max: 50 }),
  body('questionSelection.strategy').optional().isIn(['balanced', 'manual', 'adaptive']),
];

router.post(
  '/classes/:classroomId/assignments',
  requireAuth,
  assignmentValidators,
  rejectInvalid,
  requireClassTeacher,
  asyncRoute(async (req, res) => {
    requireTeacherModels();
    const outcomeIds = uniqueStrings(req.body.outcomeIds);
    const outcomes = await CurriculumOutcome.findAll({
      where: { id: { [Op.in]: outcomeIds } },
    });
    if (outcomes.length !== outcomeIds.length) {
      return res.status(400).json({ message: 'One or more curriculum outcomes do not exist' });
    }

    const studentMemberships = await ClassMembership.findAll({
      where: { classroomId: req.classroom.id, role: 'student' },
      attributes: ['userId'],
    });
    const classStudentIds = uniqueStrings(studentMemberships.map((membership) => membership.userId));
    const requestedStudentIds = uniqueStrings(req.body.studentIds || []);
    const targetStudentIds = requestedStudentIds.length ? requestedStudentIds : classStudentIds;
    const invalidStudentIds = targetStudentIds.filter((id) => !classStudentIds.includes(id));
    if (invalidStudentIds.length) {
      return res.status(400).json({ message: 'Assignments can only target students in this class' });
    }
    if (!targetStudentIds.length) {
      return res.status(400).json({ message: 'This class has no students to assign' });
    }

    const created = await sequelize.transaction(async (transaction) => {
      const questionSelection = {
        strategy: req.body.questionSelection?.strategy || (req.body.questionIds?.length ? 'manual' : 'balanced'),
        count: req.body.questionSelection?.count || req.body.questionIds?.length || 5,
        ...req.body.questionSelection,
      };
      const questionIds = await selectAssignmentQuestions({
        outcomeIds,
        requestedQuestionIds: req.body.questionIds,
        selection: questionSelection,
        Question,
        QuestionOutcome,
        transaction,
      });
      const assignment = await Assignment.create({
        classroomId: req.classroom.id,
        title: req.body.title,
        description: req.body.description || '',
        dueDate: req.body.dueDate ? new Date(req.body.dueDate) : null,
        courseId: null,
        lessonId: null,
      }, { transaction });
      const config = await OutcomeAssignmentConfig.create({
        assignmentId: assignment.id,
        createdBy: req.user.id,
        mode: req.body.mode || 'practice',
        outcomeIds,
        questionIds,
        questionSelection,
        targetStudentIds,
      }, { transaction });
      await AssignmentSubmission.bulkCreate(targetStudentIds.map((studentId) => ({
        assignmentId: assignment.id,
        studentId,
        status: 'assigned',
      })), { transaction, ignoreDuplicates: true });
      return { assignment, config };
    });

    res.status(201).json({
      assignment: asPlain(created.assignment),
      learningConfig: asPlain(created.config),
    });
    const { recordProductEvent } = require('../services/productEvents');
    await recordProductEvent({
      idempotencyKey: `outcome-assignment-created:${created.assignment.id}`,
      type: 'assignment_created',
      userId: req.user.id,
      classroomId: req.classroom.id,
      outcomeId: outcomeIds[0] || null,
      feature: 'adaptive_assignment',
      entityType: 'assignment',
      entityId: created.assignment.id,
      metadata: { mode: created.config.mode, outcomeCount: outcomeIds.length, studentCount: targetStudentIds.length, questionCount: created.config.questionIds.length },
    });
  }),
);

router.get(
  '/classes/:classroomId/assignments/:assignmentId',
  requireAuth,
  param('classroomId').isUUID(),
  param('assignmentId').isUUID(),
  rejectInvalid,
  requireClassTeacher,
  asyncRoute(async (req, res) => {
    requireTeacherModels();
    const assignment = await Assignment.findOne({
      where: { id: req.params.assignmentId, classroomId: req.classroom.id },
    });
    if (!assignment) return res.status(404).json({ message: 'Assignment not found' });
    const config = await OutcomeAssignmentConfig.findOne({ where: { assignmentId: assignment.id } });
    if (!config) return res.status(404).json({ message: 'Outcome-aware assignment configuration not found' });
    return res.json({ assignment: asPlain(assignment), learningConfig: asPlain(config) });
  }),
);

// Learner bridge for Practice's "assigned" mode. The assigned submission is
// the source of truth for targeting; class membership is checked independently
// so a stale submission can never expose work from a class the learner left.
router.get(
  '/assignments/next',
  requireAuth,
  query('assignmentId').optional().isUUID(),
  rejectInvalid,
  asyncRoute(async (req, res) => {
    requireTeacherModels();
    const memberships = await ClassMembership.findAll({
      where: { userId: req.user.id, role: 'student' },
      attributes: ['classroomId'],
    });
    const classroomIds = uniqueStrings(memberships.map((membership) => membership.classroomId));
    if (!classroomIds.length) {
      if (req.query.assignmentId) return res.status(404).json({ message: 'Assigned practice not found' });
      return res.json({ assignment: null, learningConfig: null, practice: null });
    }

    const assignmentWhere = {
      classroomId: { [Op.in]: classroomIds },
    };
    if (req.query.assignmentId) assignmentWhere.id = req.query.assignmentId;
    const assignments = await Assignment.findAll({
      where: assignmentWhere,
      order: [['dueDate', 'ASC'], ['createdAt', 'ASC']],
    });
    if (!assignments.length) {
      if (req.query.assignmentId) return res.status(404).json({ message: 'Assigned practice not found' });
      return res.json({ assignment: null, learningConfig: null, practice: null });
    }

    const assignmentIds = assignments.map((assignment) => assignment.id);
    const submissions = await AssignmentSubmission.findAll({
      where: {
        assignmentId: { [Op.in]: assignmentIds },
        studentId: req.user.id,
        status: 'assigned',
      },
    });
    const assignedIds = new Set(submissions.map((submission) => String(submission.assignmentId)));
    const configs = assignedIds.size
      ? await OutcomeAssignmentConfig.findAll({
        where: { assignmentId: { [Op.in]: [...assignedIds] } },
      })
      : [];
    const configByAssignment = new Map(
      configs.map((config) => [String(config.assignmentId), config]),
    );
    const eligible = assignments.filter((assignment) => {
      const id = String(assignment.id);
      const config = configByAssignment.get(id);
      if (!assignedIds.has(id) || !config) return false;
      const targetStudentIds = asArray(config.targetStudentIds);
      return !targetStudentIds.length || targetStudentIds.map(String).includes(String(req.user.id));
    });
    eligible.sort((a, b) => {
      const left = a.dueDate ? new Date(a.dueDate).getTime() : Number.POSITIVE_INFINITY;
      const right = b.dueDate ? new Date(b.dueDate).getTime() : Number.POSITIVE_INFINITY;
      return left - right || new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
    });
    const assignment = eligible[0];
    if (!assignment) {
      if (req.query.assignmentId) return res.status(404).json({ message: 'Incomplete assigned practice not found' });
      return res.json({ assignment: null, learningConfig: null, practice: null });
    }
    const config = configByAssignment.get(String(assignment.id));
    return res.json({
      assignment: asPlain(assignment),
      learningConfig: asPlain(config),
      practice: {
        mode: 'assigned',
        assignmentId: assignment.id,
        classroomId: assignment.classroomId,
        assignmentMode: config.mode,
        outcomeIds: asArray(config.outcomeIds),
        questionIds: asArray(config.questionIds),
        questionSelection: config.questionSelection || {},
      },
    });
  }),
);

const stableOverrideKey = ({ classroomId, studentId, evidenceId, clientKey }) => {
  const digest = crypto.createHash('sha256')
    .update(`${classroomId}:${studentId}:${evidenceId}:${clientKey}`)
    .digest('hex');
  return `teacher-override:${digest}`;
};

router.post(
  '/classes/:classroomId/students/:studentId/evidence/:evidenceId/override',
  requireAuth,
  param('classroomId').isUUID(),
  param('studentId').isUUID(),
  param('evidenceId').isUUID(),
  body('score').isFloat({ min: 0 }),
  body('maxScore').optional().isFloat({ gt: 0 }),
  body('feedback').optional({ nullable: true }).custom((value) => {
    if (typeof value === 'string') return value.length <= 20000;
    return value && typeof value === 'object' && JSON.stringify(value).length <= 20000;
  }).withMessage('Feedback must be text or a structured object no larger than 20,000 characters'),
  body('misconceptionCodes').optional().isArray({ max: 50 }),
  body('misconceptionCodes.*').optional().isString().isLength({ min: 1, max: 120 }),
  body('reason').trim().isLength({ min: 3, max: 2000 }),
  body('idempotencyKey').optional().isString().isLength({ min: 8, max: 200 }),
  rejectInvalid,
  requireClassTeacher,
  requireClassStudent,
  asyncRoute(async (req, res) => {
    requireTeacherModels();
    const original = await LearningEvidence.findOne({
      where: { id: req.params.evidenceId, userId: req.params.studentId },
    });
    if (!original) return res.status(404).json({ message: 'Learning evidence not found for this student' });

    const originalRow = asPlain(original);
    const maxScore = Number(req.body.maxScore ?? originalRow.maxScore);
    const score = Number(req.body.score);
    if (!Number.isFinite(maxScore) || maxScore <= 0 || score > maxScore) {
      return res.status(400).json({ message: 'Score must be between zero and the maximum score' });
    }
    const clientKey = req.body.idempotencyKey || req.get('Idempotency-Key') || crypto.randomUUID();
    const idempotencyKey = stableOverrideKey({
      classroomId: req.classroom.id,
      studentId: req.params.studentId,
      evidenceId: originalRow.id,
      clientKey,
    });

    let revision;
    let reused = false;
    try {
      revision = await sequelize.transaction(async (transaction) => {
        const existingForKey = await LearningEvidence.findOne({
          where: { idempotencyKey },
          transaction,
        });
        if (existingForKey) {
          reused = true;
          return existingForKey;
        }
        const existingRevision = await LearningEvidence.findOne({
          where: { revisionOfId: originalRow.id },
          transaction,
        });
        if (existingRevision) {
          const error = new Error('This evidence has already been revised. Override its latest revision instead.');
          error.status = 409;
          throw error;
        }
        const rawMetadata = originalRow.metadata && typeof originalRow.metadata === 'object'
          ? originalRow.metadata
          : {};
        return LearningEvidence.create({
          idempotencyKey,
          userId: originalRow.userId,
          outcomeId: originalRow.outcomeId,
          questionId: originalRow.questionId || null,
          practiceSessionId: originalRow.practiceSessionId || null,
          sourceType: originalRow.sourceType,
          sourceId: originalRow.sourceId || null,
          attemptNumber: originalRow.attemptNumber,
          score,
          maxScore,
          normalizedScore: Number((score / maxScore).toFixed(6)),
          assessmentType: originalRow.assessmentType,
          difficulty: originalRow.difficulty,
          timeTakenSeconds: originalRow.timeTakenSeconds,
          markingMethod: 'human',
          misconceptionCodes: req.body.misconceptionCodes ?? asArray(originalRow.misconceptionCodes),
          feedback: req.body.feedback ?? originalRow.feedback,
          contentVersion: originalRow.contentVersion,
          occurredAt: new Date(),
          revisionOfId: originalRow.id,
          metadata: {
            ...rawMetadata,
            teacherOverride: {
              reason: req.body.reason,
              teacherId: req.user.id,
              classroomId: req.classroom.id,
              previousScore: originalRow.score,
              previousMaxScore: originalRow.maxScore,
              overriddenAt: new Date().toISOString(),
            },
          },
        }, { transaction });
      });
    } catch (error) {
      if (error.name === 'SequelizeUniqueConstraintError') {
        error.status = 409;
        error.message = 'This evidence was revised by another request';
      }
      throw error;
    }

    let mastery = null;
    let masteryRefresh = 'updated';
    try {
      mastery = await refreshMasteryAfterOverride({
        userId: originalRow.userId,
        outcomeId: originalRow.outcomeId,
        LearningEvidence,
        MasteryState,
      });
    } catch (error) {
      masteryRefresh = 'deferred';
      console.error('Mastery refresh after teacher override failed:', error);
    }

    res.status(reused ? 200 : 201).json({
      evidence: asPlain(revision),
      reused,
      masteryRefresh,
      mastery: mastery ? asPlain(mastery) : null,
    });
  }),
);

// Return safe client errors and keep internal details out of production payloads.
// eslint-disable-next-line no-unused-vars
router.use((error, req, res, next) => {
  const status = Number(error.status) || 500;
  if (status >= 500) console.error('Teacher learning route error:', error);
  res.status(status).json({
    message: status >= 500 ? 'Unable to complete the teacher learning request' : error.message,
  });
});

module.exports = router;
module.exports._private = {
  loadClassLearningSnapshot,
  normaliseDomain,
  profileDto,
  stableOverrideKey,
};
