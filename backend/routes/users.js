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
    
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findByPk(decoded.userId);
    
    if (!user) {
      return res.status(401).json({ message: 'Invalid token' });
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid token' });
  }
};

// Get user profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    res.json({ user: req.user.toJSON() });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Update user profile
router.put('/profile', authenticateToken, [
  body('firstName').optional().trim().isLength({ min: 1, max: 50 }),
  body('lastName').optional().trim().isLength({ min: 1, max: 50 }),
  body('bio').optional().trim().isLength({ max: 1000 }),
  body('preferences').optional().isObject()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { firstName, lastName, bio, preferences } = req.body;
    
    await req.user.update({
      firstName: firstName || req.user.firstName,
      lastName: lastName || req.user.lastName,
      bio: bio !== undefined ? bio : req.user.bio,
      preferences: preferences || req.user.preferences
    });

    res.json({ 
      message: 'Profile updated successfully',
      user: req.user.toJSON()
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get user's enrolled courses
router.get('/courses', authenticateToken, async (req, res) => {
  try {
    const userProgress = await UserProgress.findAll({
      where: { userId: req.user.id },
      include: [
        {
          model: Course,
          as: 'course',
          where: { isPublished: true }
        }
      ],
      order: [['updatedAt', 'DESC']]
    });

    res.json({ courses: userProgress });
  } catch (error) {
    console.error('Get user courses error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Enroll in a course
router.post('/courses/:courseId/enroll', authenticateToken, async (req, res) => {
  try {
    const { courseId } = req.params;
    
    // Check if course exists and is published
    const course = await Course.findOne({
      where: { id: courseId, isPublished: true }
    });

    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    // Check if already enrolled
    const existingEnrollment = await UserProgress.findOne({
      where: { userId: req.user.id, courseId }
    });

    if (existingEnrollment) {
      return res.status(400).json({ message: 'Already enrolled in this course' });
    }

    // Create enrollment
    const enrollment = await UserProgress.create({
      userId: req.user.id,
      courseId,
      status: 'not_started'
    });

    res.status(201).json({
      message: 'Successfully enrolled in course',
      enrollment
    });
  } catch (error) {
    console.error('Enroll course error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get user dashboard data
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

module.exports = router;
