const express = require('express');
const User = require('../models/User');
const Course = require('../models/Course');
const Lesson = require('../models/Lesson');

const router = express.Router();

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

module.exports = router;

// Maintenance: upsert admin (update email/password or create if missing)
// Security model mirrors /bootstrap: require ADMIN_BOOTSTRAP_TOKEN if set,
// otherwise allow only if no admin exists (first-time setup).
router.post('/upsert-admin', async (req, res) => {
  try {
    const headerToken = req.header('X-Bootstrap-Token');
    const expectedToken = process.env.ADMIN_BOOTSTRAP_TOKEN;

    const existingAdmin = await User.findOne({ where: { role: 'admin' } });

    if (expectedToken) {
      if (headerToken !== expectedToken) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
    } else if (existingAdmin) {
      return res.status(401).json({ message: 'Unauthorized (admin exists)' });
    }

    const { adminEmail, adminPassword } = req.body || {};
    if (!adminEmail || !adminPassword) {
      return res.status(400).json({ message: 'adminEmail and adminPassword are required in body' });
    }

    let admin = existingAdmin;
    if (!admin) {
      admin = await User.create({
        email: adminEmail,
        password: adminPassword,
        firstName: 'Admin',
        lastName: 'User',
        role: 'admin',
        isEmailVerified: true
      });
    } else {
      await admin.update({ email: adminEmail, password: adminPassword });
    }

    return res.json({ message: 'Admin upserted', admin: admin.toJSON() });
  } catch (error) {
    console.error('Upsert admin error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});


