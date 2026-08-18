/**
 * routes/classes.js assignment integrity.
 *
 *  - Assignment.create used to take body courseId/lessonId verbatim. A
 *    malformed UUID (Postgres DatabaseError) or an unknown id (FK violation)
 *    surfaced as a 500 for what is simply a bad request body.
 *  - POST /assignments/:id/complete only checked class membership, so a
 *    teacher could file a completed submission for themselves and pollute the
 *    class's submissions list.
 *  - Route params keying UUID columns are guarded so a malformed id 404s
 *    before it reaches the database.
 */
const CLASSROOM_ID = '11111111-1111-4111-8111-111111111111';
const ASSIGNMENT_ID = '22222222-2222-4222-8222-222222222222';
const COURSE_ID = '33333333-3333-4333-8333-333333333333';
const LESSON_ID = '44444444-4444-4444-8444-444444444444';

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
      id: req.get('x-user-id') || 'teacher-1',
      role: req.get('x-user-role') || 'instructor',
      dateOfBirth: '1985-01-01',
    };
    next();
  },
}));

jest.mock('../services/moderationNotifications', () => ({ notifyModerationQueue: jest.fn() }));

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
const router = require('../routes/classes');

const app = () => {
  const instance = express();
  instance.use(express.json());
  instance.use('/api/classes', router);
  return instance;
};

const as = (builder, { id = 'teacher-1', role = 'instructor' } = {}) => builder
  .set('x-user-id', id)
  .set('x-user-role', role);

describe('assignment creation validates linked content', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    models.Classroom.findByPk = jest.fn().mockResolvedValue({ id: CLASSROOM_ID, createdBy: 'teacher-1' });
    models.ClassMembership.findOne = jest.fn().mockResolvedValue({
      classroomId: CLASSROOM_ID, userId: 'teacher-1', role: 'teacher',
    });
    models.TeacherProfile.findOne = jest.fn().mockResolvedValue({ id: 'profile-1', status: 'verified' });
    models.Course.findByPk = jest.fn().mockResolvedValue({ id: COURSE_ID });
    models.Lesson.findByPk = jest.fn().mockResolvedValue({ id: LESSON_ID });
    models.Assignment.create = jest.fn(async (values) => ({ id: ASSIGNMENT_ID, ...values }));
  });

  it('400s a malformed courseId instead of letting the UUID cast raise a 500', async () => {
    const res = await as(request(app()).post(`/api/classes/${CLASSROOM_ID}/assignments`))
      .send({ title: 'Read chapter 2', courseId: 'not-a-uuid' });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Linked course not found');
    expect(models.Assignment.create).not.toHaveBeenCalled();
  });

  it('400s a well-formed but nonexistent courseId instead of an FK 500', async () => {
    models.Course.findByPk.mockResolvedValue(null);

    const res = await as(request(app()).post(`/api/classes/${CLASSROOM_ID}/assignments`))
      .send({ title: 'Read chapter 2', courseId: COURSE_ID });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Linked course not found');
    expect(models.Assignment.create).not.toHaveBeenCalled();
  });

  it('400s a malformed or unknown lessonId', async () => {
    const malformed = await as(request(app()).post(`/api/classes/${CLASSROOM_ID}/assignments`))
      .send({ title: 'Finish lesson', lessonId: '../../etc/passwd' });
    expect(malformed.status).toBe(400);
    expect(malformed.body.message).toBe('Linked lesson not found');

    models.Lesson.findByPk.mockResolvedValue(null);
    const missing = await as(request(app()).post(`/api/classes/${CLASSROOM_ID}/assignments`))
      .send({ title: 'Finish lesson', lessonId: LESSON_ID });
    expect(missing.status).toBe(400);

    expect(models.Assignment.create).not.toHaveBeenCalled();
  });

  it('creates the assignment when the linked ids resolve', async () => {
    const res = await as(request(app()).post(`/api/classes/${CLASSROOM_ID}/assignments`))
      .send({ title: 'Read chapter 2', courseId: COURSE_ID, lessonId: LESSON_ID });

    expect(res.status).toBe(201);
    expect(models.Assignment.create).toHaveBeenCalledWith(expect.objectContaining({
      classroomId: CLASSROOM_ID, courseId: COURSE_ID, lessonId: LESSON_ID,
    }));
  });

  it('404s a malformed class id before any lookup (UUID param guard)', async () => {
    const res = await as(request(app()).post('/api/classes/not-a-uuid/assignments'))
      .send({ title: 'Read chapter 2' });

    expect(res.status).toBe(404);
    expect(models.Classroom.findByPk).not.toHaveBeenCalled();
  });
});

describe('POST /assignments/:id/complete is student-only', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    models.Assignment.findByPk = jest.fn().mockResolvedValue({
      id: ASSIGNMENT_ID, classroomId: CLASSROOM_ID, lessonId: null,
    });
    models.AssignmentSubmission.findOrCreate = jest.fn().mockResolvedValue([
      { id: 'submission-1', status: 'completed', submittedAt: new Date() }, true,
    ]);
  });

  it('403s a teacher so their own submission never pollutes the class list', async () => {
    models.ClassMembership.findOne = jest.fn().mockResolvedValue({
      classroomId: CLASSROOM_ID, userId: 'teacher-1', role: 'teacher',
    });

    const res = await as(request(app()).post(`/api/classes/assignments/${ASSIGNMENT_ID}/complete`)).send();

    expect(res.status).toBe(403);
    expect(res.body.message).toBe('Only students can complete assignments');
    expect(models.AssignmentSubmission.findOrCreate).not.toHaveBeenCalled();
  });

  it('still lets a student complete it', async () => {
    models.ClassMembership.findOne = jest.fn().mockResolvedValue({
      classroomId: CLASSROOM_ID, userId: 'student-1', role: 'student',
    });

    const res = await as(
      request(app()).post(`/api/classes/assignments/${ASSIGNMENT_ID}/complete`),
      { id: 'student-1', role: 'student' },
    ).send();

    expect(res.status).toBe(200);
    expect(models.AssignmentSubmission.findOrCreate).toHaveBeenCalled();
  });

  it('404s a malformed assignment id before any lookup', async () => {
    const res = await as(request(app()).post('/api/classes/assignments/nope/complete')).send();

    expect(res.status).toBe(404);
    expect(models.Assignment.findByPk).not.toHaveBeenCalled();
  });
});
