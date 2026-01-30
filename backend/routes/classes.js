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
  ClassAnnouncement,
  Comment,
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

const requireTeacherInClass = async (req, res, classroomId) => {
  // Admin can do everything without being explicitly a member
  if (req.user?.role === 'admin') return true;

  const membership = await ClassMembership.findOne({
    where: { classroomId, userId: req.user.id },
  });
  return !!membership && membership.role === 'teacher';
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

// Leave a class (teachers or students)
router.post('/:id/leave', authenticateToken, async (req, res) => {
  try {
    const classroom = await Classroom.findByPk(req.params.id);
    if (!classroom) {
      return res.status(404).json({ message: 'Class not found' });
    }

    const membership = await ClassMembership.findOne({
      where: { classroomId: classroom.id, userId: req.user.id },
    });
    if (!membership) {
      return res.status(400).json({ message: 'You are not in this class' });
    }

    // If teacher is trying to leave and they're the last teacher, block unless they are the only member.
    if (membership.role === 'teacher') {
      const teacherCount = await ClassMembership.count({
        where: { classroomId: classroom.id, role: 'teacher' },
      });
      const memberCount = await ClassMembership.count({
        where: { classroomId: classroom.id },
      });

      if (teacherCount <= 1) {
        if (memberCount <= 1) {
          // Safe: leaving would make the class empty anyway; delete class.
          await membership.destroy();
          await classroom.destroy();
          return res.json({ message: 'Left class and deleted empty class' });
        }
        return res
          .status(400)
          .json({ message: 'You are the last teacher. Delete the class instead.' });
      }
    }

    await membership.destroy();
    res.json({ message: 'Left class successfully' });
  } catch (error) {
    console.error('Leave class error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Delete a class (teacher in class or admin)
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const classroom = await Classroom.findByPk(req.params.id);
    if (!classroom) {
      return res.status(404).json({ message: 'Class not found' });
    }

    const allowed = await requireTeacherInClass(req, res, classroom.id);
    if (!allowed) {
      return res.status(403).json({ message: 'Only teachers can delete this class' });
    }

    await classroom.destroy();
    res.json({ message: 'Class deleted successfully' });
  } catch (error) {
    console.error('Delete class error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

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

    const includeSubmissions =
      membership.role === 'teacher'
        ? {
            model: AssignmentSubmission,
            as: 'submissions',
            include: [{ model: User, as: 'student', attributes: ['id', 'firstName', 'lastName', 'email'] }],
            required: false,
          }
        : {
            model: AssignmentSubmission,
            as: 'submissions',
            where: { studentId: req.user.id },
            required: false,
          };

    const assignments = await Assignment.findAll({
      where: { classroomId: classroom.id },
      include: [
        { model: Course, as: 'course', attributes: ['id', 'title'] },
        { model: Lesson, as: 'lesson', attributes: ['id', 'title'] },
        includeSubmissions,
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
      if (membership.role === 'teacher') {
        const submissions = (a.submissions || []).map((s) => ({
          id: s.id,
          studentId: s.studentId,
          status: s.status,
          submittedAt: s.submittedAt,
          student: s.student
            ? {
                id: s.student.id,
                firstName: s.student.firstName,
                lastName: s.student.lastName,
                email: s.student.email,
              }
            : null,
        }));

        return {
          id: a.id,
          title: a.title,
          description: a.description,
          dueDate: a.dueDate,
          course: a.course ? { id: a.course.id, title: a.course.title } : null,
          lesson: a.lesson ? { id: a.lesson.id, title: a.lesson.title } : null,
          submissions,
        };
      }

      const submission = a.submissions?.[0];
      return {
        id: a.id,
        title: a.title,
        description: a.description,
        dueDate: a.dueDate,
        course: a.course ? { id: a.course.id, title: a.course.title } : null,
        lesson: a.lesson ? { id: a.lesson.id, title: a.lesson.title } : null,
        statusForCurrentUser: submission ? submission.status : 'assigned',
        submittedAt: submission ? submission.submittedAt : null,
      };
    });

    // Load announcements (defensive: return empty array if fails)
    let announcementsDto = [];
    try {
      const announcements = await ClassAnnouncement.findAll({
        where: { classroomId: classroom.id },
        include: [
          {
            model: User,
            as: 'author',
            attributes: ['id', 'firstName', 'lastName', 'email'],
            required: false,
          },
        ],
        order: [['createdAt', 'DESC']],
        limit: 50,
      });
      announcementsDto = announcements.map((a) => ({
        id: a.id,
        content: a.content,
        attachments: a.attachments || [],
        createdAt: a.createdAt,
        author: a.author
          ? {
              id: a.author.id,
              firstName: a.author.firstName,
              lastName: a.author.lastName,
              email: a.author.email,
            }
          : null,
      }));
    } catch (announcementError) {
      console.warn('Failed to load announcements (non-critical):', announcementError.message);
      announcementsDto = [];
    }

    // Leaderboard: students by completed assignment count (most first)
    let leaderboard = [];
    try {
      const studentMembers = memberships.filter((m) => m.role === 'student');
      if (studentMembers.length > 0) {
        const assignmentsInClass = await Assignment.findAll({
          where: { classroomId: classroom.id },
          attributes: ['id'],
          raw: true,
        });
        const assignmentIds = assignmentsInClass.map((a) => a.id);
        if (assignmentIds.length > 0) {
          const completed = await AssignmentSubmission.findAll({
            where: { assignmentId: assignmentIds, status: 'completed' },
            attributes: ['studentId'],
            raw: true,
          });
          const countByStudent = {};
          studentMembers.forEach((m) => (countByStudent[m.user.id] = 0));
          completed.forEach((r) => {
            if (countByStudent[r.studentId] !== undefined) countByStudent[r.studentId]++;
          });
          leaderboard = studentMembers
            .map((m) => ({
              userId: m.user.id,
              firstName: m.user.firstName,
              lastName: m.user.lastName,
              completedCount: countByStudent[m.user.id] || 0,
            }))
            .sort((a, b) => b.completedCount - a.completedCount);
        } else {
          leaderboard = studentMembers.map((m) => ({
            userId: m.user.id,
            firstName: m.user.firstName,
            lastName: m.user.lastName,
            completedCount: 0,
          }));
        }
      }
    } catch (leaderboardErr) {
      console.warn('Leaderboard (non-critical):', leaderboardErr.message);
    }

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
      announcements: announcementsDto,
      leaderboard,
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

// Delete assignment (teacher in class or admin)
router.delete('/:classId/assignments/:assignmentId', authenticateToken, async (req, res) => {
  try {
    const { classId, assignmentId } = req.params;

    const classroom = await Classroom.findByPk(classId);
    if (!classroom) {
      return res.status(404).json({ message: 'Class not found' });
    }

    const allowed = await requireTeacherInClass(req, res, classroom.id);
    if (!allowed) {
      return res.status(403).json({ message: 'Only teachers can delete assignments' });
    }

    const assignment = await Assignment.findByPk(assignmentId);
    if (!assignment || assignment.classroomId !== classroom.id) {
      return res.status(404).json({ message: 'Assignment not found' });
    }

    await assignment.destroy(); // cascades submissions
    res.json({ message: 'Assignment deleted successfully' });
  } catch (error) {
    console.error('Delete assignment error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

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

// Un-mark assignment as completed (undo)
router.post('/assignments/:id/uncomplete', authenticateToken, async (req, res) => {
  try {
    const assignment = await Assignment.findByPk(req.params.id);
    if (!assignment) {
      return res.status(404).json({ message: 'Assignment not found' });
    }

    // Do not allow undo for lesson-linked assignments – those are controlled by lesson completion
    if (assignment.lessonId) {
      return res
        .status(400)
        .json({ message: 'Cannot undo completion for lesson-linked assignments.' });
    }

    // Ensure user is a member of the class
    const membership = await ClassMembership.findOne({
      where: { classroomId: assignment.classroomId, userId: req.user.id },
    });
    if (!membership) {
      return res.status(403).json({ message: 'You are not a member of this class' });
    }

    await AssignmentSubmission.destroy({
      where: {
        assignmentId: assignment.id,
        studentId: req.user.id,
      },
    });

    res.json({ message: 'Assignment marked as not completed' });
  } catch (error) {
    console.error('Uncomplete assignment error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Auto-complete assignments linked to a lesson when a student finishes that lesson
router.post('/lessons/:lessonId/complete', authenticateToken, async (req, res) => {
  try {
    const { lessonId } = req.params;

    // All classes this user is a member of
    const memberships = await ClassMembership.findAll({
      where: { userId: req.user.id },
    });
    const classroomIds = memberships.map((m) => m.classroomId);
    if (classroomIds.length === 0) {
      return res.json({ updated: [] });
    }

    const assignments = await Assignment.findAll({
      where: {
        lessonId,
        classroomId: classroomIds,
      },
    });

    const updated = [];

    for (const assignment of assignments) {
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

      updated.push({
        assignmentId: assignment.id,
        submissionId: submission.id,
        status: submission.status,
        submittedAt: submission.submittedAt,
      });
    }

    res.json({ updated });
  } catch (error) {
    console.error('Auto-complete lesson assignments error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Announcements

const classifyAttachment = (url) => {
  if (!url || typeof url !== 'string') return null;
  const lower = url.toLowerCase().trim();
  if (lower.match(/\.(png|jpe?g|gif|webp|svg)$/)) return 'image';
  if (
    lower.includes('youtube.com/watch') ||
    lower.includes('youtube.com/embed') ||
    lower.includes('youtu.be/')
  ) {
    return 'video';
  }
  return 'link';
};

// Create announcement (teachers only)
router.post(
  '/:id/announcements',
  authenticateToken,
  [body('content').trim().isLength({ min: 1 })],
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
      if (!membership) {
        return res.status(403).json({ message: 'You are not a member of this class' });
      }
      if (membership.role !== 'teacher') {
        return res.status(403).json({ message: 'Only teachers can post announcements' });
      }

      const { content, attachmentUrl } = req.body;
      const attachments = [];
      if (attachmentUrl && typeof attachmentUrl === 'string' && attachmentUrl.trim()) {
        const type = classifyAttachment(attachmentUrl.trim());
        if (type) {
          attachments.push({ url: attachmentUrl.trim(), type });
        }
      }

      const announcement = await ClassAnnouncement.create({
        classroomId: classroom.id,
        authorId: req.user.id,
        content: content.trim(),
        attachments,
      });

      const full = await ClassAnnouncement.findByPk(announcement.id, {
        include: [
          {
            model: User,
            as: 'author',
            attributes: ['id', 'firstName', 'lastName', 'email'],
            required: false,
          },
        ],
      });

      res.status(201).json({
        id: full.id,
        content: full.content,
        attachments: full.attachments || [],
        createdAt: full.createdAt,
        author: full.author
          ? {
              id: full.author.id,
              firstName: full.author.firstName,
              lastName: full.author.lastName,
              email: full.author.email,
            }
          : null,
      });
    } catch (error) {
      console.error('Create announcement error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }
);

// Delete announcement (author, teacher in class, or admin)
router.delete('/:classId/announcements/:announcementId', authenticateToken, async (req, res) => {
  try {
    const { classId, announcementId } = req.params;

    const classroom = await Classroom.findByPk(classId);
    if (!classroom) {
      return res.status(404).json({ message: 'Class not found' });
    }

    const announcement = await ClassAnnouncement.findByPk(announcementId);
    if (!announcement || announcement.classroomId !== classroom.id) {
      return res.status(404).json({ message: 'Announcement not found' });
    }

    // Author can delete their own, teachers/admin can delete any in that class
    const isAuthor = announcement.authorId === req.user.id;
    const isTeacherInClass = await requireTeacherInClass(req, res, classroom.id);

    if (!isAuthor && !isTeacherInClass) {
      return res.status(403).json({ message: 'Not allowed to delete this announcement' });
    }

    await announcement.destroy();
    res.json({ message: 'Announcement deleted successfully' });
  } catch (error) {
    console.error('Delete announcement error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// ----- Comments on announcements (all public) -----
router.get('/:classId/announcements/:announcementId/comments', authenticateToken, async (req, res) => {
  try {
    const { classId, announcementId } = req.params;
    const classroom = await Classroom.findByPk(classId);
    if (!classroom) return res.status(404).json({ message: 'Class not found' });
    const membership = await ClassMembership.findOne({ where: { classroomId: classroom.id, userId: req.user.id } });
    if (!membership) return res.status(403).json({ message: 'Not a member of this class' });
    const announcement = await ClassAnnouncement.findByPk(announcementId);
    if (!announcement || announcement.classroomId !== classroom.id) return res.status(404).json({ message: 'Announcement not found' });

    const comments = await Comment.findAll({
      where: { classroomId: classroom.id, commentableType: 'announcement', commentableId: announcementId },
      include: [{ model: User, as: 'author', attributes: ['id', 'firstName', 'lastName', 'email'] }],
      order: [['createdAt', 'ASC']],
    });
    res.json(comments.map((c) => ({
      id: c.id,
      content: c.content,
      isPrivate: c.isPrivate,
      createdAt: c.createdAt,
      author: c.author ? { id: c.author.id, firstName: c.author.firstName, lastName: c.author.lastName, email: c.author.email } : null,
    })));
  } catch (error) {
    console.error('Get announcement comments error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.post('/:classId/announcements/:announcementId/comments', authenticateToken, [body('content').trim().isLength({ min: 1 })], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const { classId, announcementId } = req.params;
    const classroom = await Classroom.findByPk(classId);
    if (!classroom) return res.status(404).json({ message: 'Class not found' });
    const membership = await ClassMembership.findOne({ where: { classroomId: classroom.id, userId: req.user.id } });
    if (!membership) return res.status(403).json({ message: 'Not a member of this class' });
    const announcement = await ClassAnnouncement.findByPk(announcementId);
    if (!announcement || announcement.classroomId !== classroom.id) return res.status(404).json({ message: 'Announcement not found' });

    const comment = await Comment.create({
      classroomId: classroom.id,
      commentableType: 'announcement',
      commentableId: announcementId,
      authorId: req.user.id,
      content: req.body.content.trim(),
      isPrivate: false,
      targetUserId: null,
    });
    const withAuthor = await Comment.findByPk(comment.id, {
      include: [{ model: User, as: 'author', attributes: ['id', 'firstName', 'lastName', 'email'] }],
    });
    res.status(201).json({
      id: withAuthor.id,
      content: withAuthor.content,
      isPrivate: withAuthor.isPrivate,
      createdAt: withAuthor.createdAt,
      author: withAuthor.author ? { id: withAuthor.author.id, firstName: withAuthor.author.firstName, lastName: withAuthor.author.lastName, email: withAuthor.author.email } : null,
    });
  } catch (error) {
    console.error('Create announcement comment error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// ----- Comments on assignments (public class comments + private student-teacher) -----
router.get('/:classId/assignments/:assignmentId/comments', authenticateToken, async (req, res) => {
  try {
    const { classId, assignmentId } = req.params;
    const classroom = await Classroom.findByPk(classId);
    if (!classroom) return res.status(404).json({ message: 'Class not found' });
    const membership = await ClassMembership.findOne({ where: { classroomId: classroom.id, userId: req.user.id } });
    if (!membership) return res.status(403).json({ message: 'Not a member of this class' });
    const assignment = await Assignment.findByPk(assignmentId);
    if (!assignment || assignment.classroomId !== classroom.id) return res.status(404).json({ message: 'Assignment not found' });

    const isTeacher = membership.role === 'teacher';
    const allComments = await Comment.findAll({
      where: { classroomId: classroom.id, commentableType: 'assignment', commentableId: assignmentId },
      include: [
        { model: User, as: 'author', attributes: ['id', 'firstName', 'lastName', 'email'] },
        { model: User, as: 'targetUser', attributes: ['id', 'firstName', 'lastName'], required: false },
      ],
      order: [['createdAt', 'ASC']],
    });
    const filtered = allComments.filter((c) => {
      if (!c.isPrivate) return true;
      if (c.authorId === req.user.id) return true;
      if (c.targetUserId === req.user.id) return true;
      if (isTeacher) return true;
      return false;
    });
    res.json(filtered.map((c) => ({
      id: c.id,
      content: c.content,
      isPrivate: c.isPrivate,
      targetUserId: c.targetUserId,
      targetUser: c.targetUser ? { id: c.targetUser.id, firstName: c.targetUser.firstName, lastName: c.targetUser.lastName } : null,
      createdAt: c.createdAt,
      author: c.author ? { id: c.author.id, firstName: c.author.firstName, lastName: c.author.lastName, email: c.author.email } : null,
    })));
  } catch (error) {
    console.error('Get assignment comments error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.post('/:classId/assignments/:assignmentId/comments', authenticateToken, [body('content').trim().isLength({ min: 1 })], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const { classId, assignmentId } = req.params;
    const { content, isPrivate, targetUserId } = req.body;
    const classroom = await Classroom.findByPk(classId);
    if (!classroom) return res.status(404).json({ message: 'Class not found' });
    const membership = await ClassMembership.findOne({ where: { classroomId: classroom.id, userId: req.user.id } });
    if (!membership) return res.status(403).json({ message: 'Not a member of this class' });
    const assignment = await Assignment.findByPk(assignmentId);
    if (!assignment || assignment.classroomId !== classroom.id) return res.status(404).json({ message: 'Assignment not found' });

    const privateComment = !!isPrivate;
    let targetId = targetUserId || null;
    if (privateComment && membership.role === 'teacher' && targetUserId) {
      const targetMember = await ClassMembership.findOne({ where: { classroomId: classroom.id, userId: targetUserId, role: 'student' } });
      if (!targetMember) return res.status(400).json({ message: 'Invalid target student for private comment' });
      targetId = targetUserId;
    }
    if (privateComment && membership.role === 'student') targetId = null;

    const comment = await Comment.create({
      classroomId: classroom.id,
      commentableType: 'assignment',
      commentableId: assignmentId,
      authorId: req.user.id,
      content: (content || '').trim(),
      isPrivate: privateComment,
      targetUserId: targetId,
    });
    const withAuthor = await Comment.findByPk(comment.id, {
      include: [
        { model: User, as: 'author', attributes: ['id', 'firstName', 'lastName', 'email'] },
        { model: User, as: 'targetUser', attributes: ['id', 'firstName', 'lastName'], required: false },
      ],
    });
    res.status(201).json({
      id: withAuthor.id,
      content: withAuthor.content,
      isPrivate: withAuthor.isPrivate,
      targetUserId: withAuthor.targetUserId,
      targetUser: withAuthor.targetUser ? { id: withAuthor.targetUser.id, firstName: withAuthor.targetUser.firstName, lastName: withAuthor.targetUser.lastName } : null,
      createdAt: withAuthor.createdAt,
      author: withAuthor.author ? { id: withAuthor.author.id, firstName: withAuthor.author.firstName, lastName: withAuthor.author.lastName, email: withAuthor.author.email } : null,
    });
  } catch (error) {
    console.error('Create assignment comment error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;

