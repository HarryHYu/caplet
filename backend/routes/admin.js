const express = require('express');
const User = require('../models/User');
const Course = require('../models/Course');
const Lesson = require('../models/Lesson');
const UserProgress = require('../models/UserProgress');

const router = express.Router();

// Auth middlewares (JWT + admin)
const jwt = require('jsonwebtoken');
const UserModel = require('../models/User');
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

const authenticateToken = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ message: 'No token provided' });
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await UserModel.findByPk(decoded.userId);
    if (!user) return res.status(401).json({ message: 'Invalid token' });
    req.user = user;
    next();
  } catch (e) {
    return res.status(401).json({ message: 'Invalid token' });
  }
};

const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
};

// One-time bootstrap endpoint
// Security: requires X-Bootstrap-Token header matching ADMIN_BOOTSTRAP_TOKEN
router.post('/bootstrap', async (req, res) => {
  try {
    const headerToken = req.header('X-Bootstrap-Token');
    const expectedToken = process.env.ADMIN_BOOTSTRAP_TOKEN;

    // If a token is configured, enforce it. If no token configured, allow bootstrap
    // ONLY if there is no existing admin (first-time setup safety).
    if (expectedToken) {
      if (headerToken !== expectedToken) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
    } else {
      const existingAdminCheck = await User.findOne({ where: { role: 'admin' } });
      if (existingAdminCheck) {
        return res.status(401).json({ message: 'Unauthorized (admin already exists)' });
      }
    }

    // If an admin already exists, do nothing
    const existingAdmin = await User.findOne({ where: { role: 'admin' } });
    if (existingAdmin) {
      return res.json({ message: 'Admin already exists, bootstrap skipped' });
    }

    // Create admin user
    const { adminEmail, adminPassword } = req.body || {};
    if (!adminEmail || !adminPassword) {
      return res.status(400).json({ message: 'adminEmail and adminPassword are required in body' });
    }

    const admin = await User.create({
      email: adminEmail,
      password: adminPassword,
      firstName: 'Admin',
      lastName: 'User',
      role: 'admin',
      isEmailVerified: true
    });

    // Seed 5 placeholder courses (no videos), each with 3 reading lessons
    const placeholderImage = 'https://placehold.co/600x400?text=Image';
    const seedCourses = [
      {
        title: 'Budgeting 101',
        shortDescription: 'Learn how to plan, track, and optimize your spending.',
        description: 'A beginner-friendly guide to budgeting in Australia. Markdown supported.',
        category: 'budgeting',
        level: 'beginner',
        duration: 120,
        thumbnail: placeholderImage,
        isPublished: true,
        isFree: true,
        tags: ['budgeting']
      },
      {
        title: 'Superannuation Basics',
        shortDescription: 'How super works, contributions, and retirement planning.',
        description: 'Understand Australian superannuation and set yourself up early.',
        category: 'superannuation',
        level: 'intermediate',
        duration: 150,
        thumbnail: placeholderImage,
        isPublished: true,
        isFree: true,
        tags: ['superannuation']
      },
      {
        title: 'Tax Basics',
        shortDescription: 'ATO, deductions, and lodging a return.',
        description: 'A simple path through the Australian tax system for individuals.',
        category: 'tax',
        level: 'intermediate',
        duration: 150,
        thumbnail: placeholderImage,
        isPublished: true,
        isFree: true,
        tags: ['tax']
      },
      {
        title: 'Loans & Credit',
        shortDescription: 'Using credit wisely and avoiding debt traps.',
        description: 'Learn about loans, credit cards, and managing repayments.',
        category: 'loans',
        level: 'intermediate',
        duration: 135,
        thumbnail: placeholderImage,
        isPublished: true,
        isFree: true,
        tags: ['loans', 'credit']
      },
      {
        title: 'Investing Foundations',
        shortDescription: 'Shares, ETFs, and diversification 101.',
        description: 'Build confidence with the basics of investing in Australia.',
        category: 'investment',
        level: 'beginner',
        duration: 180,
        thumbnail: placeholderImage,
        isPublished: true,
        isFree: true,
        tags: ['investment']
      }
    ];

    const createdCourses = [];
    for (const data of seedCourses) {
      const course = await Course.create(data);
      createdCourses.push(course);
    }

    // Create 3 simple reading lessons per course
    for (const course of createdCourses) {
      const lessons = [
        {
          courseId: course.id,
          title: `${course.title}: Introduction`,
          description: 'Overview and key concepts.',
          content: `# ${course.title}\n\nWelcome to this course. This is a placeholder article.`,
          duration: 15,
          order: 1,
          lessonType: 'reading',
          isPublished: true
        },
        {
          courseId: course.id,
          title: `${course.title}: Core Ideas`,
          description: 'Main content explained in simple terms.',
          content: 'Detailed Markdown content goes here. Replace with your material.',
          duration: 20,
          order: 2,
          lessonType: 'reading',
          isPublished: true
        },
        {
          courseId: course.id,
          title: `${course.title}: Practical Steps`,
          description: 'Actionable steps and a short recap.',
          content: 'Checklist and summary. Add images or links as needed.',
          duration: 20,
          order: 3,
          lessonType: 'reading',
          isPublished: true
        }
      ];
      for (const l of lessons) {
        await Lesson.create(l);
      }
    }

    return res.json({
      message: 'Bootstrap completed',
      admin: admin.toJSON(),
      courses: createdCourses.map(c => ({ id: c.id, title: c.title }))
    });
  } catch (error) {
    console.error('Bootstrap error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// Temporary: promote a user to admin (guarded by ADMIN_BOOTSTRAP_TOKEN; if missing, allow only specific emails)
router.post('/promote', async (req, res) => {
  try {
    const headerToken = req.header('X-Bootstrap-Token');
    const expectedToken = process.env.ADMIN_BOOTSTRAP_TOKEN;

    const { email } = req.body || {};
    if (!email) return res.status(400).json({ message: 'email required' });

    if (expectedToken) {
      if (headerToken !== expectedToken) return res.status(401).json({ message: 'Unauthorized' });
    } else {
      const allowedEmails = ['hhyu.direct@gmail.com', 'hhyudirect@gmail.com'];
      if (!allowedEmails.includes(email)) return res.status(401).json({ message: 'Unauthorized' });
    }

    const user = await User.findOne({ where: { email } });
    if (!user) return res.status(404).json({ message: 'User not found' });

    await user.update({ role: 'admin' });
    return res.json({ message: 'User promoted to admin', user: user.toJSON() });
  } catch (error) {
    console.error('Promote error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;


// Admin: list courses (include unpublished)
router.get('/courses', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const courses = await Course.findAll({
      order: [['createdAt', 'DESC']],
      include: [{ model: Lesson, as: 'lessons', required: false }]
    });
    res.json({ courses });
  } catch (e) {
    console.error('Admin list courses error:', e);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Admin: create course
router.post('/courses', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const course = await Course.create(req.body);
    res.status(201).json({ course });
  } catch (e) {
    console.error('Admin create course error:', e);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Admin: reset all user progress (dangerous). Secured by ADMIN_BOOTSTRAP_TOKEN header.
router.post('/reset-progress', async (req, res) => {
  try {
    const headerToken = req.header('X-Bootstrap-Token');
    const expectedToken = process.env.ADMIN_BOOTSTRAP_TOKEN;

    if (!expectedToken || headerToken !== expectedToken) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Truncate/destroy all progress
    await UserProgress.destroy({ where: {}, truncate: true, cascade: true, restartIdentity: true });

    return res.json({ message: 'All user progress has been reset' });
  } catch (error) {
    console.error('Reset progress error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// Admin: update course
router.put('/courses/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const course = await Course.findByPk(req.params.id);
    if (!course) return res.status(404).json({ message: 'Course not found' });
    await course.update(req.body);
    res.json({ course });
  } catch (e) {
    console.error('Admin update course error:', e);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Admin: delete course
router.delete('/courses/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const course = await Course.findByPk(req.params.id);
    if (!course) return res.status(404).json({ message: 'Course not found' });
    await course.destroy();
    res.json({ message: 'Course deleted' });
  } catch (e) {
    console.error('Admin delete course error:', e);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Admin: create lesson
router.post('/courses/:courseId/lessons', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const course = await Course.findByPk(req.params.courseId);
    if (!course) return res.status(404).json({ message: 'Course not found' });
    const lesson = await Lesson.create({ ...req.body, courseId: course.id });
    res.status(201).json({ lesson });
  } catch (e) {
    console.error('Admin create lesson error:', e);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Admin: update lesson
router.put('/lessons/:lessonId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const lesson = await Lesson.findByPk(req.params.lessonId);
    if (!lesson) return res.status(404).json({ message: 'Lesson not found' });
    await lesson.update(req.body);
    res.json({ lesson });
  } catch (e) {
    console.error('Admin update lesson error:', e);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Admin: delete lesson
router.delete('/lessons/:lessonId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const lesson = await Lesson.findByPk(req.params.lessonId);
    if (!lesson) return res.status(404).json({ message: 'Lesson not found' });
    await lesson.destroy();
    res.json({ message: 'Lesson deleted' });
  } catch (e) {
    console.error('Admin delete lesson error:', e);
    res.status(500).json({ message: 'Internal server error' });
  }
});

