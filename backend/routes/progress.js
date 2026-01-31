const express = require('express');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const UserProgress = require('../models/UserProgress');
const Course = require('../models/Course');
const Module = require('../models/Module');
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
  } catch {
    res.status(401).json({ message: 'Invalid token' });
  }
};

// Helper: lesson has actual content (slides, text, or video)
function lessonHasContent(lesson) {
  const raw = lesson.get ? lesson.get('slides') : lesson.slides;
  if (raw) {
    const slides = typeof raw === 'string' ? (() => { try { return JSON.parse(raw); } catch { return null; } })() : raw;
    if (Array.isArray(slides) && slides.length > 0) return true;
  }
  const content = lesson.get ? lesson.get('content') : lesson.content;
  if (content && String(content).trim()) return true;
  const video = lesson.get ? lesson.get('videoUrl') : lesson.videoUrl;
  if (video && String(video).trim()) return true;
  return false;
}

// Update lesson progress
router.put('/lesson/:lessonId', authenticateToken, [
  body('status').optional().isIn(['not_started', 'in_progress', 'completed']),
  body('timeSpent').optional().isInt({ min: 0 }),
  body('notes').optional().isString(),
  body('lastSlideIndex').optional().isInt({ min: 0 }),
  body('quizScores').optional().isObject()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { lessonId } = req.params;
    const { status, timeSpent, notes, lastSlideIndex, quizScores } = req.body;

    // Get the lesson and its module to find courseId
    const lesson = await Lesson.findByPk(lessonId, {
      include: [{ model: Module, as: 'module', attributes: ['courseId'] }]
    });
    if (!lesson || !lesson.module) {
      return res.status(404).json({ message: 'Lesson not found' });
    }
    // Reject marking empty lessons as completed
    if (status === 'completed' && !lessonHasContent(lesson)) {
      return res.status(400).json({ message: 'Cannot mark empty lesson as complete' });
    }
    const courseId = lesson.module.courseId;

    // Find or create progress record
    let progress = await UserProgress.findOne({
      where: { 
        userId: req.user.id, 
        courseId,
        lessonId: lessonId
      }
    });

    if (!progress) {
      progress = await UserProgress.create({
        userId: req.user.id,
        courseId,
        lessonId: lessonId,
        status: 'not_started'
      });
    }

    // Update progress
    const updateData = {};
    if (status) updateData.status = status;
    if (timeSpent !== undefined) updateData.timeSpent = timeSpent;
    if (notes !== undefined) updateData.notes = notes;
    if (lastSlideIndex !== undefined) updateData.lastSlideIndex = lastSlideIndex;
    if (quizScores !== undefined && typeof quizScores === 'object') {
      const merged = { ...(progress.quizScores || {}), ...quizScores };
      updateData.quizScores = merged;
    }

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

// Get course progress (creates progress tracking entry if not exists - courses are directly accessible)
router.get('/course/:courseId', authenticateToken, async (req, res) => {
  try {
    const { courseId } = req.params;

    // Check if course exists
    const course = await Course.findOne({
      where: { id: courseId }
    });

    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    // Check if user has any progress for this course
    let progress = await UserProgress.findAll({
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

    // Create progress tracking entry if none exists (for progress bar calculation)
    if (progress.length === 0) {
      await UserProgress.create({
        userId: req.user.id,
        courseId: courseId,
        lessonId: null, // Course-level progress tracking
        status: 'not_started'
      });
    }

    // Re-fetch progress to include the new entry
    progress = await UserProgress.findAll({
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

    // Calculate overall course progress (lessons via modules)
    const modules = await Module.findAll({
      where: { courseId },
      attributes: ['id', 'order'],
      order: [['order', 'ASC']]
    });
    const moduleIds = modules.map((m) => m.id);
    const lessonsByModule = await Lesson.findAll({
      where: { moduleId: moduleIds },
      attributes: ['id', 'moduleId']
    });
    const allLessonsFull = await Lesson.findAll({
      where: { id: lessonsByModule.map(l => l.id) },
      attributes: ['id', 'content', 'videoUrl', 'slides']
    });
    const lessonHasContentMap = new Map();
    for (const l of allLessonsFull) {
      lessonHasContentMap.set(String(l.id), lessonHasContent(l));
    }
    const lessonsWithContent = lessonsByModule.filter(l => lessonHasContentMap.get(String(l.id)) === true);
    const totalLessons = lessonsWithContent.length;
    const completedProgress = progress.filter(p => p.lessonId && p.status === 'completed');
    const completedLessonIds = new Set(completedProgress.map(p => String(p.lessonId)));
    const completedLessons = lessonsWithContent.filter(l => completedLessonIds.has(String(l.id))).length;
    const progressPercentage = totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0;

    // Per-module progress (only count lessons with content)
    const moduleProgress = modules.map((m) => {
      const moduleLessons = lessonsByModule.filter(l => l.moduleId === m.id);
      const withContent = moduleLessons.filter(l => lessonHasContentMap.get(String(l.id)) === true);
      const completedInModule = withContent.filter(l => completedLessonIds.has(String(l.id))).length;
      return {
        moduleId: m.id,
        totalLessons: withContent.length,
        completedLessons: completedInModule
      };
    });

    // Normalize lessonProgress for frontend (ensure lessonId is string)
    const lessonProgress = progress
      .filter(p => p.lessonId)
      .map(p => ({
        lessonId: String(p.lessonId),
        status: p.status,
        lastSlideIndex: p.lastSlideIndex,
        quizScores: p.quizScores || {}
      }));

    res.json({
      courseProgress: {
        totalLessons,
        completedLessons,
        progressPercentage: Math.round(progressPercentage * 100) / 100,
        status: progressPercentage === 100 ? 'completed' : 
                progressPercentage > 0 ? 'in_progress' : 'not_started'
      },
      moduleProgress,
      lessonProgress
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

    // Get the lesson and its module to find courseId
    const lesson = await Lesson.findByPk(lessonId, {
      include: [{ model: Module, as: 'module', attributes: ['courseId'] }]
    });
    if (!lesson || !lesson.module) {
      return res.status(404).json({ message: 'Lesson not found' });
    }
    const courseId = lesson.module.courseId;

    // Find or create progress record
    let progress = await UserProgress.findOne({
      where: { 
        userId: req.user.id, 
        courseId,
        lessonId: lessonId
      }
    });

    if (!progress) {
      progress = await UserProgress.create({
        userId: req.user.id,
        courseId,
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
