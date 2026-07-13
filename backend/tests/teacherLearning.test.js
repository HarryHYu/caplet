const TEACHER_ID = '10000000-0000-4000-8000-000000000001';
const OTHER_TEACHER_ID = '10000000-0000-4000-8000-000000000002';
const STUDENT_ID = '20000000-0000-4000-8000-000000000001';
const CLASSROOM_ID = '30000000-0000-4000-8000-000000000001';
const OUTCOME_ID = '40000000-0000-4000-8000-000000000001';
const QUESTION_ID = '50000000-0000-4000-8000-000000000001';
const ASSIGNMENT_ID = '60000000-0000-4000-8000-000000000001';
const EVIDENCE_ID = '70000000-0000-4000-8000-000000000001';
const REVISION_ID = '70000000-0000-4000-8000-000000000002';

jest.mock('../config/database', () => ({
  sequelize: {
    transaction: jest.fn(async (callback) => callback({ id: 'transaction' })),
  },
}));

jest.mock('../middleware/auth', () => ({
  requireAuth: (req, _res, next) => {
    req.user = {
      id: req.get('x-user-id') || '10000000-0000-4000-8000-000000000001',
      role: req.get('x-user-role') || 'instructor',
    };
    next();
  },
  requireAdmin: (req, res, next) => {
    req.user = {
      id: req.get('x-user-id') || '10000000-0000-4000-8000-000000000001',
      role: req.get('x-user-role') || 'admin',
    };
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Admin access required' });
    return next();
  },
}));

jest.mock('../models', () => ({
  User: {}, Classroom: {}, ClassMembership: {}, Assignment: {}, AssignmentSubmission: {},
  TeacherProfile: {}, TeacherVerificationAudit: {}, OutcomeAssignmentConfig: {}, CurriculumOutcome: {}, LearningEvidence: {},
  MasteryState: {}, Question: {}, QuestionOutcome: {},
}));

const express = require('express');
const request = require('supertest');
const { sequelize } = require('../config/database');
const models = require('../models');
const router = require('../routes/teacherLearning');

function app() {
  const instance = express();
  instance.use(express.json());
  instance.use('/api/teacher-learning', router);
  return instance;
}

function row(values) {
  return {
    ...values,
    update: jest.fn(async function update(changes) {
      Object.assign(this, changes);
      return this;
    }),
    toJSON() {
      const plain = { ...this };
      delete plain.update;
      delete plain.toJSON;
      return plain;
    },
  };
}

describe('/api/teacher-learning', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    sequelize.transaction.mockImplementation(async (callback) => callback({ id: 'transaction' }));
    models.Classroom.findByPk = jest.fn().mockResolvedValue({ id: CLASSROOM_ID, name: 'Year 12 Economics' });
    models.ClassMembership.findOne = jest.fn(async ({ where }) => {
      if (where.userId === OTHER_TEACHER_ID) return null;
      return { classroomId: CLASSROOM_ID, userId: where.userId, role: where.role };
    });
    models.ClassMembership.findAll = jest.fn().mockResolvedValue([]);
    models.TeacherProfile.findOne = jest.fn().mockResolvedValue({ id: 'profile-verified', status: 'verified' });
    models.TeacherProfile.findAll = jest.fn().mockResolvedValue([]);
    models.TeacherVerificationAudit.create = jest.fn().mockResolvedValue({ id: 'teacher-audit-1' });
    models.CurriculumOutcome.findAll = jest.fn().mockResolvedValue([]);
    models.MasteryState.findAll = jest.fn().mockResolvedValue([]);
    models.LearningEvidence.findAll = jest.fn().mockResolvedValue([]);
  });

  test('creates a pending teacher request with a normalised school affiliation', async () => {
    models.TeacherProfile.findOne.mockResolvedValue(null);
    models.TeacherProfile.create = jest.fn(async (values) => row({
      id: 'profile-1', createdAt: new Date(), updatedAt: new Date(), ...values,
    }));

    const response = await request(app())
      .post('/api/teacher-learning/onboarding/request')
      .set('x-user-role', 'student')
      .send({
        schoolName: 'Sydney Secondary College',
        staffEmail: 'teacher@SCHOOL.NSW.EDU.AU',
        positionTitle: 'Economics Teacher',
        jurisdiction: 'NSW',
      });

    expect(response.status).toBe(201);
    expect(response.body.status).toBe('pending');
    expect(response.body.profile.schoolAffiliation.domain).toBe('school.nsw.edu.au');
    expect(models.TeacherProfile.create).toHaveBeenCalledWith(expect.objectContaining({
      userId: TEACHER_ID,
      status: 'pending',
      schoolDomain: 'school.nsw.edu.au',
    }));
  });

  test('admin verification promotes a student account without trusting browser roles', async () => {
    const profile = row({
      id: 'profile-1', userId: STUDENT_ID, status: 'pending', schoolName: 'Test School',
      staffEmail: 'teacher@test.edu.au', requestedAt: new Date(), updatedAt: new Date(),
    });
    const user = row({ id: STUDENT_ID, role: 'student' });
    models.TeacherProfile.findOne.mockResolvedValue(profile);
    models.User.findByPk = jest.fn().mockResolvedValue(user);

    const response = await request(app())
      .patch(`/api/teacher-learning/onboarding/${STUDENT_ID}/status`)
      .set('x-user-role', 'admin')
      .send({ status: 'verified', note: 'School email confirmed' });

    expect(response.status).toBe(200);
    expect(user.update).toHaveBeenCalledWith({ role: 'instructor' }, { transaction: { id: 'transaction' } });
    expect(profile.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'verified', verifiedBy: TEACHER_ID }),
      { transaction: { id: 'transaction' } },
    );
    expect(models.TeacherVerificationAudit.create).toHaveBeenCalledWith(
      expect.objectContaining({
        teacherUserId: STUDENT_ID,
        fromStatus: 'pending',
        toStatus: 'verified',
      }),
      { transaction: { id: 'transaction' } },
    );
  });

  test('onboarding status reflects current verification instead of the persisted account role', async () => {
    models.TeacherProfile.findOne.mockResolvedValue({
      id: 'profile-1', userId: TEACHER_ID, status: 'rejected', schoolName: 'Test School',
      staffEmail: 'teacher@test.edu.au', requestedAt: new Date(), updatedAt: new Date(),
    });

    const response = await request(app())
      .get('/api/teacher-learning/onboarding/status')
      .set('x-user-role', 'instructor');

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('rejected');
    expect(response.body.teacherAccess).toBe(false);
  });

  test('denies class analytics to an instructor who is not a class teacher', async () => {
    const response = await request(app())
      .get(`/api/teacher-learning/classes/${CLASSROOM_ID}/analytics`)
      .set('x-user-id', OTHER_TEACHER_ID);

    expect(response.status).toBe(403);
    expect(models.MasteryState.findAll).not.toHaveBeenCalled();
    expect(models.LearningEvidence.findAll).not.toHaveBeenCalled();
  });

  test('revoked teacher verification immediately blocks class mastery access', async () => {
    models.TeacherProfile.findOne.mockResolvedValue({ id: 'profile-1', status: 'suspended' });
    const response = await request(app())
      .get(`/api/teacher-learning/classes/${CLASSROOM_ID}/analytics`);

    expect(response.status).toBe(403);
    expect(response.body.code).toBe('teacher_verification_required');
    expect(models.MasteryState.findAll).not.toHaveBeenCalled();
  });

  test('returns actionable class mastery analytics to a class teacher', async () => {
    models.ClassMembership.findAll.mockResolvedValue([
      { user: { id: STUDENT_ID, firstName: 'Ada', lastName: 'Lovelace', email: 'ada@example.test' } },
    ]);
    models.MasteryState.findAll.mockResolvedValue([
      {
        userId: STUDENT_ID, outcomeId: OUTCOME_ID, probability: 0.35,
        evidenceCount: 2, confidence: 'medium',
      },
    ]);
    models.LearningEvidence.findAll.mockResolvedValue([
      {
        id: EVIDENCE_ID, userId: STUDENT_ID, outcomeId: OUTCOME_ID,
        misconceptionCodes: ['movement-vs-shift'],
      },
    ]);
    models.CurriculumOutcome.findAll.mockResolvedValue([
      { id: OUTCOME_ID, code: 'H5', title: 'Market outcomes', sortOrder: 1 },
    ]);

    const response = await request(app())
      .get(`/api/teacher-learning/classes/${CLASSROOM_ID}/analytics?threshold=0.6`);

    expect(response.status).toBe(200);
    expect(response.body.analytics.heatmap.cells[0]).toMatchObject({
      studentId: STUDENT_ID,
      outcomeId: OUTCOME_ID,
      status: 'needs_support',
    });
    expect(response.body.analytics.commonMisconceptions[0].code).toBe('movement-vs-shift');
    expect(response.body.analytics.recommendedGroups[0].studentIds).toEqual([STUDENT_ID]);
  });

  test('creates an outcome-aware assignment and assigned submissions atomically', async () => {
    models.CurriculumOutcome.findAll.mockResolvedValue([{ id: OUTCOME_ID }]);
    models.ClassMembership.findAll.mockResolvedValue([{ userId: STUDENT_ID }]);
    models.QuestionOutcome.findAll = jest.fn().mockResolvedValue([
      { questionId: QUESTION_ID, outcomeId: OUTCOME_ID, weight: 1 },
    ]);
    models.Question.findAll = jest.fn().mockResolvedValue([
      { id: QUESTION_ID, status: 'published', difficulty: 'medium' },
    ]);
    models.Assignment.create = jest.fn().mockResolvedValue(row({
      id: ASSIGNMENT_ID, classroomId: CLASSROOM_ID, title: 'Markets checkpoint',
    }));
    models.OutcomeAssignmentConfig.create = jest.fn(async (values) => row({ id: 'config-1', ...values }));
    models.AssignmentSubmission.bulkCreate = jest.fn().mockResolvedValue([]);

    const response = await request(app())
      .post(`/api/teacher-learning/classes/${CLASSROOM_ID}/assignments`)
      .send({
        title: 'Markets checkpoint',
        mode: 'adaptive',
        outcomeIds: [OUTCOME_ID],
        questionSelection: { strategy: 'balanced', count: 1 },
      });

    expect(response.status).toBe(201);
    expect(response.body.learningConfig).toMatchObject({
      mode: 'adaptive',
      outcomeIds: [OUTCOME_ID],
      questionIds: [QUESTION_ID],
      targetStudentIds: [STUDENT_ID],
    });
    expect(models.AssignmentSubmission.bulkCreate).toHaveBeenCalledWith([
      expect.objectContaining({ assignmentId: ASSIGNMENT_ID, studentId: STUDENT_ID, status: 'assigned' }),
    ], expect.objectContaining({ transaction: { id: 'transaction' } }));
  });

  test('does not let an assignment target a student outside the class', async () => {
    models.CurriculumOutcome.findAll.mockResolvedValue([{ id: OUTCOME_ID }]);
    models.ClassMembership.findAll.mockResolvedValue([{ userId: STUDENT_ID }]);
    const outsiderId = '20000000-0000-4000-8000-000000000099';

    const response = await request(app())
      .post(`/api/teacher-learning/classes/${CLASSROOM_ID}/assignments`)
      .send({ title: 'Private assignment', outcomeIds: [OUTCOME_ID], studentIds: [outsiderId] });

    expect(response.status).toBe(400);
    expect(models.Assignment.create).not.toHaveBeenCalled();
  });

  test('resolves the next incomplete outcome assignment for an enrolled learner', async () => {
    const dueLater = row({
      id: ASSIGNMENT_ID,
      classroomId: CLASSROOM_ID,
      title: 'Assigned market practice',
      dueDate: new Date('2026-07-20T00:00:00Z'),
      createdAt: new Date('2026-07-13T00:00:00Z'),
    });
    models.ClassMembership.findAll.mockResolvedValue([{ classroomId: CLASSROOM_ID }]);
    models.Assignment.findAll = jest.fn().mockResolvedValue([dueLater]);
    models.AssignmentSubmission.findAll = jest.fn().mockResolvedValue([
      { assignmentId: ASSIGNMENT_ID, studentId: STUDENT_ID, status: 'assigned' },
    ]);
    models.OutcomeAssignmentConfig.findAll = jest.fn().mockResolvedValue([
      row({
        assignmentId: ASSIGNMENT_ID,
        mode: 'adaptive',
        outcomeIds: [OUTCOME_ID],
        questionIds: [QUESTION_ID],
        questionSelection: { strategy: 'balanced', count: 1 },
        targetStudentIds: [STUDENT_ID],
      }),
    ]);

    const response = await request(app())
      .get('/api/teacher-learning/assignments/next')
      .set('x-user-id', STUDENT_ID)
      .set('x-user-role', 'student');

    expect(response.status).toBe(200);
    expect(response.body.practice).toEqual(expect.objectContaining({
      mode: 'assigned',
      assignmentId: ASSIGNMENT_ID,
      assignmentMode: 'adaptive',
      outcomeIds: [OUTCOME_ID],
      questionIds: [QUESTION_ID],
    }));
    expect(models.AssignmentSubmission.findAll).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ studentId: STUDENT_ID, status: 'assigned' }),
    }));
  });

  test('teacher override appends human evidence with an audit reason and refreshes mastery', async () => {
    const original = row({
      id: EVIDENCE_ID,
      idempotencyKey: 'original-key',
      userId: STUDENT_ID,
      outcomeId: OUTCOME_ID,
      questionId: QUESTION_ID,
      sourceType: 'practice',
      sourceId: 'attempt-1',
      attemptNumber: 1,
      score: 2,
      maxScore: 10,
      normalizedScore: 0.2,
      assessmentType: 'short_answer',
      difficulty: 'medium',
      timeTakenSeconds: 120,
      markingMethod: 'ai',
      misconceptionCodes: ['old-code'],
      feedback: 'Original feedback',
      contentVersion: 1,
      occurredAt: new Date('2026-07-12T00:00:00Z'),
      metadata: {},
    });
    const revision = row({
      ...original.toJSON(), id: REVISION_ID, revisionOfId: EVIDENCE_ID,
      score: 8, normalizedScore: 0.8, markingMethod: 'human',
      occurredAt: new Date('2026-07-13T00:00:00Z'),
    });
    models.LearningEvidence.findOne = jest.fn(async ({ where }) => {
      if (where.id === EVIDENCE_ID) return original;
      return null;
    });
    models.LearningEvidence.create = jest.fn().mockResolvedValue(revision);
    models.LearningEvidence.findAll.mockResolvedValue([original, revision]);
    const mastery = row({ id: 'mastery-1', version: 1 });
    models.MasteryState.findOrCreate = jest.fn().mockResolvedValue([mastery, true]);

    const response = await request(app())
      .post(`/api/teacher-learning/classes/${CLASSROOM_ID}/students/${STUDENT_ID}/evidence/${EVIDENCE_ID}/override`)
      .send({
        score: 8,
        reason: 'The rubric awards two additional analysis marks.',
        feedback: 'Clear causal analysis.',
        idempotencyKey: 'override-request-0001',
      });

    expect(response.status).toBe(201);
    expect(response.body.masteryRefresh).toBe('updated');
    expect(models.LearningEvidence.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: STUDENT_ID,
        revisionOfId: EVIDENCE_ID,
        score: 8,
        markingMethod: 'human',
        metadata: expect.objectContaining({
          teacherOverride: expect.objectContaining({
            reason: 'The rubric awards two additional analysis marks.',
            teacherId: TEACHER_ID,
            classroomId: CLASSROOM_ID,
          }),
        }),
      }),
      { transaction: { id: 'transaction' } },
    );
  });

  test('reuses an override when the client retries with the same idempotency key', async () => {
    const original = row({
      id: EVIDENCE_ID,
      userId: STUDENT_ID,
      outcomeId: OUTCOME_ID,
      sourceType: 'practice',
      attemptNumber: 1,
      score: 2,
      maxScore: 10,
      assessmentType: 'short_answer',
      markingMethod: 'ai',
      misconceptionCodes: [],
      feedback: {},
      occurredAt: new Date('2026-07-12T00:00:00Z'),
      metadata: {},
    });
    const revision = row({
      id: REVISION_ID,
      revisionOfId: EVIDENCE_ID,
      userId: STUDENT_ID,
      outcomeId: OUTCOME_ID,
      sourceType: 'practice',
      attemptNumber: 1,
      score: 8,
      maxScore: 10,
      normalizedScore: 0.8,
      assessmentType: 'short_answer',
      markingMethod: 'human',
      misconceptionCodes: [],
      feedback: {},
      occurredAt: new Date('2026-07-13T00:00:00Z'),
      metadata: {},
    });
    models.LearningEvidence.findOne = jest.fn(async ({ where }) => {
      if (where.id === EVIDENCE_ID) return original;
      if (where.idempotencyKey) return revision;
      return null;
    });
    models.LearningEvidence.findAll.mockResolvedValue([original, revision]);
    models.MasteryState.findOrCreate = jest.fn().mockResolvedValue([row({ version: 1 }), true]);
    models.LearningEvidence.create = jest.fn();

    const response = await request(app())
      .post(`/api/teacher-learning/classes/${CLASSROOM_ID}/students/${STUDENT_ID}/evidence/${EVIDENCE_ID}/override`)
      .send({
        score: 8,
        reason: 'The rubric awards two additional analysis marks.',
        idempotencyKey: 'override-request-0001',
      });

    expect(response.status).toBe(200);
    expect(response.body.reused).toBe(true);
    expect(response.body.evidence.id).toBe(REVISION_ID);
    expect(models.LearningEvidence.create).not.toHaveBeenCalled();
  });

  test('refuses to override evidence for someone who is not a class student', async () => {
    models.ClassMembership.findOne.mockImplementation(async ({ where }) => {
      if (where.role === 'student') return null;
      return { role: 'teacher' };
    });

    const response = await request(app())
      .post(`/api/teacher-learning/classes/${CLASSROOM_ID}/students/${STUDENT_ID}/evidence/${EVIDENCE_ID}/override`)
      .send({ score: 8, reason: 'Reviewed against the rubric.' });

    expect(response.status).toBe(404);
    expect(models.LearningEvidence.findOne).not.toHaveBeenCalled();
  });
});
