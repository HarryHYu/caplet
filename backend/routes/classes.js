const express = require('express');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const {
  User,
  Classroom,
  ClassMembership,
  Assignment,
  AssignmentSubmission,
  Course,
  Lesson,
} = require('../models');

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Auth middleware (same pattern as users route)
const authenticateToken = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ message: 'No token provided' });

    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findByPk(decoded.userId);
    if (!user) return res.status(401).json({ message: 'Invalid token' });

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid token' });
  }
};

const requireTeacher = (req, res, next) => {
  if (!req.user || (req.user.role !== 'instructor' && req.user.role !== 'admin')) {
    return res.status(403).json({ message: 'Teacher account required' });
  }
  next();
};

const generateClassCode = async () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  // Try a few times to avoid collisions
  for (let attempt = 0; attempt < 10; attempt++) {
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    const existing = await Classroom.findOne({ where: { code } });
    if (!existing) return code;
  }
  // Fallback to timestamp-based code
  return `CL${Date.now().toString(36).toUpperCase()}`;
};

// Get all classes for current user (both teaching and enrolled)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const memberships = await ClassMembership.findAll({
      where: { userId: req.user.id },
      include: [
        {
          model: Classroom,
          as: 'classroom',
        },
      ],
      order: [['createdAt', 'DESC']],
    });

    const teaching = [];
    const student = [];

    for (const m of memberships) {
      const dto = {
        id: m.classroom.id,
        name: m.classroom.name,
        code: m.classroom.code,
        role: m.role,
        createdAt: m.classroom.createdAt,
      };
      if (m.role === 'teacher') {
        teaching.push(dto);
      } else {
        student.push(dto);
      }
    }

    res.json({ teaching, student });
  } catch (error) {
    console.error('Get classes error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Create a new class (teachers only)
router.post(
  '/',
  authenticateToken,
  requireTeacher,
  [body('name').trim().isLength({ min: 1, max: 100 })],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { name, description } = req.body;
      const code = await generateClassCode();

      const classroom = await Classroom.create({
        name,
        description: description || '',
        code,
        createdBy: req.user.id,
      });

      await ClassMembership.create({
        classroomId: classroom.id,
        userId: req.user.id,
        role: 'teacher',
      });

      res.status(201).json({ classroom });
    } catch (error) {
      console.error('Create class error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }
);

// Join a class by code (students and teachers)
router.post(
  '/join',
  authenticateToken,
  [body('code').trim().isLength({ min: 4 })],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { code } = req.body;
      const normalizedCode = code.trim().toUpperCase();

      const classroom = await Classroom.findOne({ where: { code: normalizedCode } });
      if (!classroom) {
        return res.status(404).json({ message: 'Class not found. Check the code and try again.' });
      }

      // Determine membership role: teachers join as teachers, others as students
      const membershipRole =
        req.user.role === 'instructor' || req.user.role === 'admin' ? 'teacher' : 'student';

      const [membership] = await ClassMembership.findOrCreate({
        where: {
          classroomId: classroom.id,
          userId: req.user.id,
        },
        defaults: {
          role: membershipRole,
        },
      });

      res.json({
        classroom,
        membership: {
          id: membership.id,
          role: membership.role,
        },
      });
    } catch (error) {
      console.error('Join class error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }
);

// Get a single class with members and assignments
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const classroom = await Classroom.findByPk(req.params.id);
    if (!classroom) {
      return res.status(404).json({ message: 'Class not found' });
    }

    const membership = await ClassMembership.findOne({
      where: { classroomId: classroom.id, userId: req.user.id },
    });
    if (!membership) {
      return res.status(403).json({ message: 'You are not a member of this class' });
    }

    const memberships = await ClassMembership.findAll({
      where: { classroomId: classroom.id },
      include: [{ model: User, as: 'user' }],
      order: [['createdAt', 'ASC']],
    });

    const assignments = await Assignment.findAll({
      where: { classroomId: classroom.id },
      include: [
        { model: Course, as: 'course', attributes: ['id', 'title'] },
        { model: Lesson, as: 'lesson', attributes: ['id', 'title'] },
        {
          model: AssignmentSubmission,
          as: 'submissions',
          where: { studentId: req.user.id },
          required: false,
        },
      ],
      order: [['dueDate', 'ASC'], ['createdAt', 'DESC']],
    });

    const members = memberships.map((m) => ({
      id: m.user.id,
      firstName: m.user.firstName,
      lastName: m.user.lastName,
      email: m.user.email,
      role: m.role,
    }));

    const assignmentsDto = assignments.map((a) => {
      const submission = a.submissions?.[0];
      return {
        id: a.id,
        title: a.title,
        description: a.description,
        dueDate: a.dueDate,
        course: a.course
          ? { id: a.course.id, title: a.course.title }
          : null,
        lesson: a.lesson
          ? { id: a.lesson.id, title: a.lesson.title }
          : null,
        statusForCurrentUser: submission ? submission.status : 'assigned',
        submittedAt: submission ? submission.submittedAt : null,
      };
    });

    res.json({
      classroom: {
        id: classroom.id,
        name: classroom.name,
        code: classroom.code,
        description: classroom.description,
        createdBy: classroom.createdBy,
      },
      membership: {
        role: membership.role,
      },
      members,
      assignments: assignmentsDto,
    });
  } catch (error) {
    console.error('Get class detail error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Create assignment for a class (teachers only)
router.post(
  '/:id/assignments',
  authenticateToken,
  [body('title').trim().isLength({ min: 1, max: 200 })],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const classroom = await Classroom.findByPk(req.params.id);
      if (!classroom) {
        return res.status(404).json({ message: 'Class not found' });
      }

      const membership = await ClassMembership.findOne({
        where: { classroomId: classroom.id, userId: req.user.id },
      });
      if (!membership || membership.role !== 'teacher') {
        return res.status(403).json({ message: 'Only teachers in this class can create assignments' });
      }

      const { title, description, dueDate, courseId, lessonId } = req.body;

      const assignment = await Assignment.create({
        classroomId: classroom.id,
        title,
        description: description || '',
        dueDate: dueDate ? new Date(dueDate) : null,
        courseId: courseId || null,
        lessonId: lessonId || null,
      });

      res.status(201).json({ assignment });
    } catch (error) {
      console.error('Create assignment error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }
);

// Mark assignment as completed (student)
router.post('/assignments/:id/complete', authenticateToken, async (req, res) => {
  try {
    const assignment = await Assignment.findByPk(req.params.id);
    if (!assignment) {
      return res.status(404).json({ message: 'Assignment not found' });
    }

    // Ensure user is a member of the class
    const membership = await ClassMembership.findOne({
      where: { classroomId: assignment.classroomId, userId: req.user.id },
    });
    if (!membership) {
      return res.status(403).json({ message: 'You are not a member of this class' });
    }

    const [submission] = await AssignmentSubmission.findOrCreate({
      where: {
        assignmentId: assignment.id,
        studentId: req.user.id,
      },
      defaults: {
        status: 'completed',
        submittedAt: new Date(),
      },
    });

    if (submission.status !== 'completed') {
      submission.status = 'completed';
      submission.submittedAt = new Date();
      await submission.save();
    }

    res.json({
      message: 'Assignment marked as completed',
      submission: {
        id: submission.id,
        status: submission.status,
        submittedAt: submission.submittedAt,
      },
    });
  } catch (error) {
    console.error('Complete assignment error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;

