const express = require('express');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const UserProgress = require('../models/UserProgress');
const Course = require('../models/Course');

const router = express.Router();

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Middleware to verify JWT token
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
    res.status(401).json({ message: 'Invalid token' });
  }
};

// Role guard: require admin
const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
};

// Get current user's own profile (full)
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    res.json({ user: req.user.toJSON() });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Update user profile (name, email, password, dateOfBirth, bio, role, preferences)
router.put('/profile', authenticateToken, [
  body('firstName').optional().trim().isLength({ min: 1, max: 50 }),
  body('lastName').optional().trim().isLength({ min: 1, max: 50 }),
  body('email').optional().isEmail().normalizeEmail(),
  body('password').optional().isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('dateOfBirth').optional({ values: 'falsy' }).isISO8601().withMessage('Invalid date (use YYYY-MM-DD)'),
  body('bio').optional().trim().isLength({ max: 1000 }),
  body('preferences').optional().isObject(),
  body('role').optional().isIn(['student', 'instructor'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { firstName, lastName, email, password, dateOfBirth, bio, preferences, role } = req.body;

    // If changing email, ensure it's not taken by another user
    if (email && email !== req.user.email) {
      const existing = await User.findOne({ where: { email } });
      if (existing) {
        return res.status(400).json({ message: 'That email is already in use' });
      }
    }

    // Determine new role (admins keep role; others may switch student/instructor)
    let newRole = req.user.role;
    if (role && req.user.role !== 'admin') {
      if (role === 'student' || role === 'instructor') {
        newRole = role;
      }
    }

    const updates = {
      firstName: firstName !== undefined ? firstName : req.user.firstName,
      lastName: lastName !== undefined ? lastName : req.user.lastName,
      bio: bio !== undefined ? bio : req.user.bio,
      preferences: preferences || req.user.preferences,
      role: newRole
    };
    if (email !== undefined) updates.email = email;
    if (dateOfBirth !== undefined) updates.dateOfBirth = dateOfBirth === '' ? null : dateOfBirth;
    if (password && password.trim()) updates.password = password.trim();

    await req.user.update(updates);

    res.json({
      message: 'Profile updated successfully',
      user: req.user.toJSON()
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get user dashboard data (must be before /:userId)
router.get('/dashboard', authenticateToken, async (req, res) => {
  try {
    const userProgress = await UserProgress.findAll({
      where: { userId: req.user.id },
      include: [
        {
          model: Course,
          as: 'course'
        }
      ]
    });

    const stats = {
      totalCourses: userProgress.length,
      completedCourses: userProgress.filter(p => p.status === 'completed').length,
      inProgressCourses: userProgress.filter(p => p.status === 'in_progress').length,
      totalTimeSpent: userProgress.reduce((sum, p) => sum + (p.timeSpent || 0), 0)
    };

    res.json({
      user: req.user.toJSON(),
      stats,
      recentCourses: userProgress.slice(0, 5)
    });
  } catch (error) {
    console.error('Get dashboard error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get another user's public profile (no email, no dateOfBirth)
router.get('/:userId', authenticateToken, async (req, res) => {
  try {
    const profileUser = await User.findByPk(req.params.userId, {
      attributes: ['id', 'firstName', 'lastName', 'bio', 'role', 'profilePicture'],
    });
    if (!profileUser) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({ user: profileUser.toJSON() });
  } catch (error) {
    console.error('Get public profile error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;
