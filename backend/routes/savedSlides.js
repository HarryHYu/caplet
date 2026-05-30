const express = require('express');
const SavedSlide = require('../models/SavedSlide');
const Lesson = require('../models/Lesson');
const Course = require('../models/Course');
const { requireAuth } = require('../middleware/auth');
const { categorizeSlides, slideToText } = require('../services/slideCategorizer');

const router = express.Router();
router.use(requireAuth);

function parseSlides(raw) {
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string') {
    try { return JSON.parse(raw); } catch { return []; }
  }
  return [];
}

router.get('/', async (req, res) => {
  try {
    const slides = await SavedSlide.findAll({
      where: { userId: req.user.id },
      include: [
        { model: Lesson, as: 'lesson', attributes: ['id', 'title', 'slides'] },
        { model: Course, as: 'course', attributes: ['id', 'title', 'category', 'thumbnail'] },
      ],
      order: [['createdAt', 'DESC']],
    });
    res.json({ savedSlides: slides });
  } catch (e) {
    console.error('Get saved slides error:', e);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { lessonId, courseId, slideIndex } = req.body;
    if (!lessonId || !courseId || slideIndex === undefined || slideIndex === null) {
      return res.status(400).json({ message: 'lessonId, courseId, and slideIndex are required' });
    }
    const [saved, created] = await SavedSlide.findOrCreate({
      where: { userId: req.user.id, lessonId, slideIndex: Number(slideIndex) },
      defaults: { courseId },
    });
    res.status(created ? 201 : 200).json({ savedSlide: saved });
  } catch (e) {
    console.error('Save slide error:', e);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Organize the user's flagged slides into AI-generated revision categories.
// Categorizes ALL of the user's saved slides together so groupings stay
// coherent, then persists the category onto each row.
router.post('/categorize', async (req, res) => {
  try {
    const slides = await SavedSlide.findAll({
      where: { userId: req.user.id },
      include: [
        { model: Lesson, as: 'lesson', attributes: ['id', 'title', 'slides'] },
        { model: Course, as: 'course', attributes: ['id', 'title'] },
      ],
    });

    if (slides.length === 0) {
      return res.json({ savedSlides: [], categorized: 0 });
    }

    const items = slides.map((s) => {
      const parsed = parseSlides(s.lesson?.slides);
      const slide = parsed[s.slideIndex];
      return {
        id: s.id,
        text: slideToText(slide) || s.lesson?.title || 'Slide',
        lessonTitle: s.lesson?.title,
        courseTitle: s.course?.title,
      };
    });

    const assignments = await categorizeSlides(items);

    // Persist categories. Slides the AI didn't assign keep their prior value.
    await Promise.all(
      slides.map((s) => {
        const cat = assignments.get(s.id);
        if (cat && cat !== s.category) {
          s.category = cat;
          return s.save();
        }
        return null;
      })
    );

    res.json({ categorized: assignments.size });
  } catch (e) {
    const status = e.status || 500;
    console.error('Categorize saved slides error:', e.message || e);
    res.status(status).json({
      message: e.message || 'Failed to categorize slides',
    });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const deleted = await SavedSlide.destroy({
      where: { id: req.params.id, userId: req.user.id },
    });
    if (!deleted) return res.status(404).json({ message: 'Saved slide not found' });
    res.status(204).end();
  } catch (e) {
    console.error('Delete saved slide error:', e);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;
