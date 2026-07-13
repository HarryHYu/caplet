const { Op } = require('sequelize');

const STUDENT_ID = 'student-1';
const PEER_ID = 'student-2';
const TEACHER_ID = 'teacher-1';
const ADMIN_ID = 'admin-1';
const CLASSROOM_ID = 'class-1';
const ASSIGNMENT_ID = 'assignment-1';
const ANNOUNCEMENT_ID = 'announcement-1';
const COMMENT_ID = 'comment-1';

jest.mock('../config/database', () => ({
  sequelize: {
    fn: jest.fn((name, ...args) => ({ fn: name, args })),
    col: jest.fn((name) => ({ col: name })),
    transaction: jest.fn(async (callback) => callback({ id: 'transaction' })),
  },
}));

jest.mock('../middleware/auth', () => ({
  requireAuth: (req, _res, next) => {
    req.user = {
      id: req.get('x-user-id') || STUDENT_ID,
      role: req.get('x-user-role') || 'student',
      dateOfBirth: req.get('x-user-dob') || null,
    };
    next();
  },
}));

jest.mock('../services/moderationNotifications', () => ({
  notifyModerationQueue: jest.fn(),
}));

jest.mock('../models', () => ({
  User: {},
  Classroom: {},
  ClassMembership: {},
  Assignment: {},
  AssignmentSubmission: {},
  Course: {},
  Lesson: {},
  ClassAnnouncement: {},
  Comment: {},
  CommentModerationRecord: {},
  CommentModerationAction: {},
  ConsentRecord: {},
  TeacherProfile: {},
}));

const express = require('express');
const request = require('supertest');
const models = require('../models');
const { sequelize } = require('../config/database');
const { notifyModerationQueue } = require('../services/moderationNotifications');
const router = require('../routes/classes');

function app() {
  const instance = express();
  instance.use(express.json());
  instance.use('/api/classes', router);
  return instance;
}

function as(requestBuilder, { id = STUDENT_ID, role = 'student', dob } = {}) {
  const authenticated = requestBuilder.set('x-user-id', id).set('x-user-role', role);
  return dob ? authenticated.set('x-user-dob', dob) : authenticated;
}

function detailFixtures() {
  const self = { id: STUDENT_ID, firstName: 'Ari', lastName: 'Student', email: 'ari@example.com' };
  const peer = { id: PEER_ID, firstName: 'Bea', lastName: 'Peer', email: 'bea@example.com' };
  const teacher = { id: TEACHER_ID, firstName: 'Tess', lastName: 'Teacher', email: 'tess@school.edu.au' };
  models.ClassMembership.findAll.mockResolvedValue([
    { role: 'student', user: self },
    { role: 'student', user: peer },
    { role: 'teacher', user: teacher },
  ]);
  models.Assignment.findAll.mockImplementation(async (options) => {
    if (options.raw) return [{ id: ASSIGNMENT_ID }];
    return [{
      id: ASSIGNMENT_ID,
      title: 'Checkpoint',
      description: '',
      dueDate: null,
      course: null,
      lesson: null,
      submissions: [{
        id: 'submission-1',
        studentId: STUDENT_ID,
        status: 'completed',
        submittedAt: new Date('2026-07-13T00:00:00Z'),
        student: self,
      }],
    }];
  });
  models.AssignmentSubmission.findAll.mockResolvedValue([
    { studentId: PEER_ID },
    { studentId: PEER_ID },
    { studentId: STUDENT_ID },
  ]);
  models.ClassAnnouncement.findAll.mockResolvedValue([{
    id: ANNOUNCEMENT_ID,
    content: 'Welcome',
    attachments: [],
    createdAt: new Date('2026-07-13T00:00:00Z'),
    author: peer,
  }]);
  models.Comment.findAll.mockResolvedValue([]);
}

describe('classroom child-safety boundaries', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    sequelize.transaction.mockImplementation(async (callback) => callback({ id: 'transaction' }));
    models.Classroom.findByPk = jest.fn().mockResolvedValue({
      id: CLASSROOM_ID,
      name: 'Year 11 Economics',
      code: 'ABC123',
      description: '',
      createdBy: TEACHER_ID,
    });
    models.Classroom.findOne = jest.fn().mockResolvedValue({ id: CLASSROOM_ID, code: 'ABC123' });
    models.Classroom.create = jest.fn();
    models.ClassMembership.findOne = jest.fn(async ({ where }) => {
      if (where.userId === ADMIN_ID) return null;
      if (where.userId === TEACHER_ID) return { classroomId: CLASSROOM_ID, userId: TEACHER_ID, role: 'teacher' };
      return { classroomId: CLASSROOM_ID, userId: where.userId, role: where.role || 'student' };
    });
    models.ClassMembership.findAll = jest.fn().mockResolvedValue([]);
    models.ClassMembership.create = jest.fn();
    models.ClassMembership.findOrCreate = jest.fn().mockResolvedValue([{ id: 'membership-1', role: 'student' }, true]);
    models.Assignment.findAll = jest.fn().mockResolvedValue([]);
    models.Assignment.findByPk = jest.fn().mockResolvedValue({ id: ASSIGNMENT_ID, classroomId: CLASSROOM_ID });
    models.AssignmentSubmission.findAll = jest.fn().mockResolvedValue([]);
    models.ClassAnnouncement.findAll = jest.fn().mockResolvedValue([]);
    models.ClassAnnouncement.findByPk = jest.fn().mockResolvedValue({ id: ANNOUNCEMENT_ID, classroomId: CLASSROOM_ID });
    models.Comment.findAll = jest.fn().mockResolvedValue([]);
    models.Comment.findOne = jest.fn();
    models.Comment.create = jest.fn().mockResolvedValue({ id: COMMENT_ID });
    models.Comment.findByPk = jest.fn().mockResolvedValue({
      id: COMMENT_ID,
      content: 'A safe comment',
      isPrivate: false,
      createdAt: new Date(),
      author: { id: STUDENT_ID, firstName: 'Ari', lastName: 'Student', email: 'ari@example.com' },
    });
    models.CommentModerationRecord.findOrCreate = jest.fn(async ({ defaults }) => [{
      id: 'report-1',
      createdAt: new Date(),
      ...defaults,
    }, true]);
    models.CommentModerationRecord.findAll = jest.fn().mockResolvedValue([]);
    models.CommentModerationRecord.findOne = jest.fn();
    models.CommentModerationAction.create = jest.fn();
    models.User.findByPk = jest.fn().mockResolvedValue({ id: PEER_ID, role: 'student' });
    models.TeacherProfile.findOne = jest.fn().mockResolvedValue({ id: 'profile-1', status: 'verified' });
    models.ConsentRecord.findOne = jest.fn(async ({ where }) => {
      if (where.type === 'classroom_data') return { status: 'granted', grantedAt: new Date(), withdrawnAt: null };
      if (where.type === 'parental') {
        return {
          status: 'granted',
          grantedAt: new Date(),
          withdrawnAt: null,
          metadata: { purposes: ['classroom_data'] },
        };
      }
      return null;
    });
  });

  test('denies class join when age is unknown', async () => {
    const response = await as(request(app()).post('/api/classes/join')).send({ code: 'ABC123' });
    expect(response.status).toBe(403);
    expect(response.body.code).toBe('age_confirmation_required');
    expect(models.ConsentRecord.findOne).not.toHaveBeenCalled();
    expect(models.Classroom.findOne).not.toHaveBeenCalled();
  });

  test('denies a minor without latest purpose-specific parental consent', async () => {
    models.ConsentRecord.findOne.mockImplementation(async ({ where }) => {
      if (where.type === 'classroom_data') return { status: 'granted', grantedAt: new Date() };
      return { status: 'granted', grantedAt: new Date(), withdrawnAt: null, metadata: { purposes: ['ai_processing'] } };
    });
    const response = await as(request(app()).post('/api/classes/join'), {
      id: 'minor-no-guardian', dob: '2012-01-01',
    }).send({ code: 'ABC123' });
    expect(response.status).toBe(403);
    expect(response.body.code).toBe('guardian_consent_required');
    expect(models.Classroom.findOne).not.toHaveBeenCalled();
  });

  test('allows a minor with current classroom and purpose-specific parental consent to join', async () => {
    const response = await as(request(app()).post('/api/classes/join'), {
      id: 'minor-approved', dob: '2012-01-01',
    }).send({ code: 'abc123' });
    expect(response.status).toBe(200);
    expect(models.Classroom.findOne).toHaveBeenCalledWith({ where: { code: 'ABC123' } });
  });

  test('throttles repeated join guesses and keeps the missing-class error generic', async () => {
    models.Classroom.findOne.mockResolvedValue(null);
    for (let attempt = 0; attempt < 10; attempt += 1) {
      const response = await as(request(app()).post('/api/classes/join'), {
        id: 'join-rate-user', dob: '2000-01-01',
      }).send({ code: 'ZZZ999' });
      expect(response.status).toBe(404);
      expect(response.body.message).toBe('Unable to join this class. Check the code and try again.');
    }
    const blocked = await as(request(app()).post('/api/classes/join'), {
      id: 'join-rate-user', dob: '2000-01-01',
    }).send({ code: 'ZZZ999' });
    expect(blocked.status).toBe(429);
  });

  test('student class detail hides peer contacts and named performance', async () => {
    detailFixtures();
    const response = await as(request(app()).get(`/api/classes/${CLASSROOM_ID}`)).send();
    expect(response.status).toBe(200);
    expect(response.body.members.every((member) => member.email === undefined)).toBe(true);
    expect(response.body.announcements[0].author.email).toBeUndefined();
    expect(response.body.leaderboard).toEqual([]);
    expect(response.body.leaderboardSummary).toEqual({ position: 2, totalStudents: 2, completedCount: 1 });
    expect(response.body.assignments[0].submissions).toBeUndefined();
    expect(models.TeacherProfile.findOne).not.toHaveBeenCalled();
  });

  test('verified teacher detail retains scoped contacts and full performance', async () => {
    detailFixtures();
    const response = await as(request(app()).get(`/api/classes/${CLASSROOM_ID}`), {
      id: TEACHER_ID, role: 'instructor',
    }).send();
    expect(response.status).toBe(200);
    expect(response.body.members.map((member) => member.email)).toEqual([
      'ari@example.com', 'bea@example.com', 'tess@school.edu.au',
    ]);
    expect(response.body.announcements[0].author.email).toBe('bea@example.com');
    expect(response.body.leaderboard).toHaveLength(2);
    expect(response.body.leaderboardSummary).toBeNull();
  });

  test('revoking teacher verification immediately blocks sensitive class detail', async () => {
    models.TeacherProfile.findOne.mockResolvedValue({ id: 'profile-1', status: 'suspended' });
    const response = await as(request(app()).get(`/api/classes/${CLASSROOM_ID}`), {
      id: TEACHER_ID, role: 'instructor',
    }).send();
    expect(response.status).toBe(403);
    expect(response.body.code).toBe('teacher_verification_required');
    expect(models.ClassMembership.findAll).not.toHaveBeenCalled();
  });

  test('suspended teachers cannot create or list teaching classes while learner memberships remain visible', async () => {
    models.TeacherProfile.findOne.mockResolvedValue({ id: 'profile-1', status: 'suspended' });
    models.ClassMembership.findAll.mockResolvedValue([
      {
        role: 'teacher',
        classroom: { id: 'teaching-class', name: 'Teacher class', code: 'TEACH1', createdAt: new Date() },
      },
      {
        role: 'student',
        classroom: { id: 'learner-class', name: 'Learner class', code: 'LEARN1', createdAt: new Date() },
      },
    ]);

    const listResponse = await as(request(app()).get('/api/classes'), {
      id: TEACHER_ID, role: 'instructor',
    }).send();
    expect(listResponse.status).toBe(200);
    expect(listResponse.body.teacherAccess).toBe(false);
    expect(listResponse.body.teaching).toEqual([]);
    expect(listResponse.body.student).toEqual([
      expect.objectContaining({ id: 'learner-class', role: 'student' }),
    ]);

    const createResponse = await as(request(app()).post('/api/classes'), {
      id: TEACHER_ID, role: 'instructor',
    }).send({ name: 'Blocked class' });
    expect(createResponse.status).toBe(403);
    expect(createResponse.body.code).toBe('teacher_verification_required');
    expect(models.Classroom.create).not.toHaveBeenCalled();
  });

  test('student comment DTOs omit peer email while verified teachers retain it', async () => {
    const peerComment = {
      id: COMMENT_ID,
      content: 'Question',
      isPrivate: false,
      createdAt: new Date(),
      author: { id: PEER_ID, firstName: 'Bea', lastName: 'Peer', email: 'bea@example.com' },
    };
    models.Comment.findAll.mockResolvedValue([peerComment]);
    const studentResponse = await as(request(app()).get(
      `/api/classes/${CLASSROOM_ID}/announcements/${ANNOUNCEMENT_ID}/comments`,
    )).send();
    expect(studentResponse.body[0].author.email).toBeUndefined();

    const teacherResponse = await as(request(app()).get(
      `/api/classes/${CLASSROOM_ID}/announcements/${ANNOUNCEMENT_ID}/comments`,
    ), { id: TEACHER_ID, role: 'instructor' }).send();
    expect(teacherResponse.body[0].author.email).toBe('bea@example.com');
  });

  test('enforces comment length, per-user rate limiting, and student self-delete', async () => {
    const tooLong = await as(request(app()).post(
      `/api/classes/${CLASSROOM_ID}/announcements/${ANNOUNCEMENT_ID}/comments`,
    ), { id: 'long-comment-user' }).send({ content: 'x'.repeat(2001) });
    expect(tooLong.status).toBe(400);
    expect(models.Comment.create).not.toHaveBeenCalled();

    for (let attempt = 0; attempt < 10; attempt += 1) {
      const response = await as(request(app()).post(
        `/api/classes/${CLASSROOM_ID}/announcements/${ANNOUNCEMENT_ID}/comments`,
      ), { id: 'comment-rate-user' }).send({ content: `Comment ${attempt}` });
      expect(response.status).toBe(201);
    }
    const blocked = await as(request(app()).post(
      `/api/classes/${CLASSROOM_ID}/announcements/${ANNOUNCEMENT_ID}/comments`,
    ), { id: 'comment-rate-user' }).send({ content: 'One too many' });
    expect(blocked.status).toBe(429);

    const destroy = jest.fn();
    models.Comment.findOne.mockResolvedValue({ id: COMMENT_ID, authorId: STUDENT_ID, destroy });
    const deleted = await as(request(app()).delete(
      `/api/classes/${CLASSROOM_ID}/announcements/${ANNOUNCEMENT_ID}/comments/${COMMENT_ID}`,
    )).send();
    expect(deleted.status).toBe(204);
    expect(destroy).toHaveBeenCalled();
  });

  test.each([
    ['bullying', PEER_ID, 'student'],
    ['other', TEACHER_ID, 'instructor'],
  ])('routes %s or staff-authored reports to independent admin review', async (reason, authorId, authorRole) => {
    models.Comment.findOne.mockResolvedValue({
      id: COMMENT_ID,
      classroomId: CLASSROOM_ID,
      authorId,
      content: 'Reported content',
      isPrivate: false,
      commentableType: 'announcement',
      commentableId: ANNOUNCEMENT_ID,
    });
    models.ClassMembership.findOne.mockImplementation(async ({ where }) => {
      if (where.userId === authorId && authorRole === 'instructor') return { role: 'teacher' };
      return { role: 'student' };
    });
    models.User.findByPk.mockResolvedValue({ id: authorId, role: authorRole });
    const response = await as(request(app()).post(
      `/api/classes/${CLASSROOM_ID}/comments/${COMMENT_ID}/reports`,
    ), { id: `reporter-${reason}` }).send({ reason });
    expect(response.status).toBe(201);
    const defaults = models.CommentModerationRecord.findOrCreate.mock.calls[0][0].defaults;
    expect(defaults.reviewQueue).toBe('admin');
    expect(defaults.priority).toBe(reason === 'bullying' ? 'high' : 'standard');
    expect(notifyModerationQueue).toHaveBeenCalledWith(expect.objectContaining({ reviewQueue: 'admin' }));
  });

  test('owner queue excludes conflicted/admin reports, while the central admin queue marks overdue items', async () => {
    models.CommentModerationRecord.findAll.mockResolvedValueOnce([]).mockResolvedValueOnce([{
      id: 'report-old',
      classroomId: CLASSROOM_ID,
      reason: 'bullying',
      status: 'pending',
      reviewQueue: 'admin',
      priority: 'high',
      contentSnapshot: 'Serious concern',
      createdAt: new Date(Date.now() - 25 * 60 * 60 * 1000),
      notificationStatus: 'failed',
      notificationChannel: 'webhook',
      notificationAttempts: 2,
      notificationNextAttemptAt: new Date(Date.now() + 60 * 1000),
      notificationLastError: 'Moderation webhook returned HTTP 503',
      actions: [],
    }]);
    const ownerResponse = await as(request(app()).get(
      `/api/classes/${CLASSROOM_ID}/moderation/reports`,
    ), { id: TEACHER_ID, role: 'instructor' }).send();
    expect(ownerResponse.status).toBe(200);
    const ownerWhere = models.CommentModerationRecord.findAll.mock.calls[0][0].where;
    expect(ownerWhere.reviewQueue).toBe('class_owner');
    expect(ownerWhere.commentAuthorId[Op.ne]).toBe(TEACHER_ID);

    const adminResponse = await as(request(app()).get('/api/classes/moderation/admin/reports'), {
      id: ADMIN_ID, role: 'admin',
    }).send();
    expect(adminResponse.status).toBe(200);
    expect(adminResponse.body.reports[0].overdue).toBe(true);
    expect(adminResponse.body.reports[0].notification).toMatchObject({
      status: 'failed',
      channel: 'webhook',
      attempts: 2,
      lastError: 'Moderation webhook returned HTTP 503',
    });
    expect(adminResponse.body.guidance.emergency).toContain('000');
  });

  test('owner cannot action a report about their own content, while admin action is audited', async () => {
    const report = {
      id: 'report-1',
      classroomId: CLASSROOM_ID,
      commentAuthorId: TEACHER_ID,
      reviewQueue: 'admin',
      status: 'pending',
      update: jest.fn(async function update(values) { Object.assign(this, values); }),
    };
    models.CommentModerationRecord.findOne.mockResolvedValue(report);
    const conflicted = await as(request(app()).patch(
      `/api/classes/${CLASSROOM_ID}/moderation/reports/${report.id}`,
    ), { id: TEACHER_ID, role: 'instructor' }).send({ status: 'actioned' });
    expect(conflicted.status).toBe(403);
    expect(conflicted.body.code).toBe('independent_review_required');
    expect(models.CommentModerationAction.create).not.toHaveBeenCalled();

    const admin = await as(request(app()).patch(
      `/api/classes/${CLASSROOM_ID}/moderation/reports/${report.id}`,
    ), { id: ADMIN_ID, role: 'admin' }).send({ status: 'actioned', note: 'Escalated to school safeguarding lead.' });
    expect(admin.status).toBe(200);
    expect(models.CommentModerationAction.create).toHaveBeenCalledWith(expect.objectContaining({
      reportId: report.id,
      fromStatus: 'pending',
      toStatus: 'actioned',
    }), { transaction: { id: 'transaction' } });
  });
});
