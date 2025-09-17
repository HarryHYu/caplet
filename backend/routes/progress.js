const express = require('express');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const UserProgress = require('../models/UserProgress');
const Course = require('../models/Course');
const Lesson = require('../models/Lesson');
const User = require('../models/User');

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

// Update lesson progress
router.put('/lesson/:lessonId', authenticateToken, [
  body('status').optional().isIn(['not_started', 'in_progress', 'completed']),
  body('timeSpent').optional().isInt({ min: 0 }),
  body('notes').optional().isString()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { lessonId } = req.params;
    const { status, timeSpent, notes } = req.body;

    // Get the lesson to find its course
    const lesson = await Lesson.findByPk(lessonId);
    if (!lesson) {
      return res.status(404).json({ message: 'Lesson not found' });
    }

    // Find or create progress record
    let progress = await UserProgress.findOne({
      where: { 
        userId: req.user.id, 
        courseId: lesson.courseId,
        lessonId: lessonId
      }
    });

    if (!progress) {
      progress = await UserProgress.create({
        userId: req.user.id,
        courseId: lesson.courseId,
        lessonId: lessonId,
        status: 'not_started'
      });
    }

    // Update progress
    const updateData = {};
    if (status) updateData.status = status;
    if (timeSpent !== undefined) updateData.timeSpent = timeSpent;
    if (notes !== undefined) updateData.notes = notes;
    
    if (status === 'completed') {
      updateData.completedAt = new Date();
    }
    
    updateData.lastAccessedAt = new Date();

    await progress.update(updateData);

    res.json({
      message: 'Progress updated successfully',
      progress
    });
  } catch (error) {
    console.error('Update progress error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get course progress
router.get('/course/:courseId', authenticateToken, async (req, res) => {
  try {
    const { courseId } = req.params;

    const progress = await UserProgress.findAll({
      where: { 
        userId: req.user.id, 
        courseId: courseId
      },
      include: [
        {
          model: Lesson,
          as: 'lesson'
        }
      ]
    });

    // Calculate overall course progress
    const totalLessons = await Lesson.count({
      where: { courseId, isPublished: true }
    });

    const completedLessons = progress.filter(p => p.status === 'completed').length;
    const progressPercentage = totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0;

    res.json({
      courseProgress: {
        totalLessons,
        completedLessons,
        progressPercentage: Math.round(progressPercentage * 100) / 100,
        status: progressPercentage === 100 ? 'completed' : 
                progressPercentage > 0 ? 'in_progress' : 'not_started'
      },
      lessonProgress: progress
    });
  } catch (error) {
    console.error('Get course progress error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get all user progress
router.get('/', authenticateToken, async (req, res) => {
  try {
    const progress = await UserProgress.findAll({
      where: { userId: req.user.id },
      include: [
        {
          model: Course,
          as: 'course'
        },
        {
          model: Lesson,
          as: 'lesson'
        }
      ],
      order: [['updatedAt', 'DESC']]
    });

    res.json({ progress });
  } catch (error) {
    console.error('Get progress error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Bookmark a lesson
router.post('/bookmark/:lessonId', authenticateToken, async (req, res) => {
  try {
    const { lessonId } = req.params;

    // Get the lesson to find its course
    const lesson = await Lesson.findByPk(lessonId);
    if (!lesson) {
      return res.status(404).json({ message: 'Lesson not found' });
    }

    // Find or create progress record
    let progress = await UserProgress.findOne({
      where: { 
        userId: req.user.id, 
        courseId: lesson.courseId,
        lessonId: lessonId
      }
    });

    if (!progress) {
      progress = await UserProgress.create({
        userId: req.user.id,
        courseId: lesson.courseId,
        lessonId: lessonId,
        status: 'not_started'
      });
    }

    // Add bookmark if not already bookmarked
    const bookmarks = progress.bookmarks || [];
    if (!bookmarks.includes(lessonId)) {
      bookmarks.push(lessonId);
      await progress.update({ bookmarks });
    }

    res.json({
      message: 'Lesson bookmarked successfully',
      progress
    });
  } catch (error) {
    console.error('Bookmark lesson error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Remove bookmark
router.delete('/bookmark/:lessonId', authenticateToken, async (req, res) => {
  try {
    const { lessonId } = req.params;

    const progress = await UserProgress.findOne({
      where: { 
        userId: req.user.id, 
        lessonId: lessonId
      }
    });

    if (progress && progress.bookmarks) {
      const bookmarks = progress.bookmarks.filter(id => id !== lessonId);
      await progress.update({ bookmarks });
    }

    res.json({ message: 'Bookmark removed successfully' });
  } catch (error) {
    console.error('Remove bookmark error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;
