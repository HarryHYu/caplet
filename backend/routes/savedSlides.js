const express = require('express');
const SavedSlide = require('../models/SavedSlide');
const Lesson = require('../models/Lesson');
const Course = require('../models/Course');
const ReviewItem = require('../models/ReviewItem');
const { requireAuth } = require('../middleware/auth');
const { categorizeSlides, slideToText } = require('../services/slideCategorizer');
const { summarizeSlides } = require('../services/slideSummarizer');
const { generateRecallQuestion } = require('../services/recallQuestion');

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

// Saved slides that are due for spaced-repetition review. A slide is "due" if
// it has never been reviewed (no ReviewItem yet) or its scheduled nextDueAt has
// passed. Each returned slide carries its `review` state (stage/nextDueAt) when
// one exists. Due-ness is computed against the shared ReviewItem schedule.
router.get('/due', async (req, res) => {
  try {
    const slides = await SavedSlide.findAll({
      where: { userId: req.user.id },
      include: [
        { model: Lesson, as: 'lesson', attributes: ['id', 'title', 'slides'] },
        { model: Course, as: 'course', attributes: ['id', 'title', 'category', 'thumbnail'] },
      ],
      order: [['createdAt', 'DESC']],
    });

    const reviews = await ReviewItem.findAll({
      where: { userId: req.user.id, itemType: 'savedSlide' },
    });
    const reviewByItemId = new Map(reviews.map((r) => [r.itemId, r]));

    const now = Date.now();
    const due = [];
    for (const s of slides) {
      const review = reviewByItemId.get(String(s.id));
      const isDue = !review || new Date(review.nextDueAt).getTime() <= now;
      if (!isDue) continue;
      const plain = s.toJSON();
      plain.review = review
        ? { stage: review.stage, nextDueAt: review.nextDueAt, lastRecall: review.lastRecall }
        : null;
      due.push(plain);
    }

    res.json({ savedSlides: due });
  } catch (e) {
    console.error('Get due saved slides error:', e);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Generate one active-recall question for a saved slide (AI). The actual recall
// grade is submitted through the shared scheduler (POST /api/review/submit with
// itemType 'savedSlide'), so this endpoint only produces the prompt + answer.
router.post('/:id/recall-question', async (req, res) => {
  try {
    const saved = await SavedSlide.findOne({
      where: { id: req.params.id, userId: req.user.id },
      include: [{ model: Lesson, as: 'lesson', attributes: ['id', 'title', 'slides'] }],
    });
    if (!saved) return res.status(404).json({ message: 'Saved slide not found' });

    const parsed = parseSlides(saved.lesson?.slides);
    const slide = parsed[saved.slideIndex];
    const text = slideToText(slide) || saved.lesson?.title || '';

    const recall = await generateRecallQuestion(text);
    res.json({ ...recall, savedSlideId: saved.id });
  } catch (e) {
    const status = e.status || 500;
    console.error('Recall question error:', e.message || e);
    res.status(status).json({ message: e.message || 'Failed to generate a question' });
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

// Condense the flagged slides in one category into a short AI summary
// slideshow. Stateless — nothing is saved; the slides are returned for the
// client to display. Body: { category }  ("Uncategorized" => uncategorized).
router.post('/summarize', async (req, res) => {
  try {
    const category = (req.body?.category ?? '').toString();
    const where = { userId: req.user.id };
    if (category && category !== 'Uncategorized') {
      where.category = category;
    } else {
      where.category = null;
    }

    const slides = await SavedSlide.findAll({
      where,
      include: [{ model: Lesson, as: 'lesson', attributes: ['id', 'title', 'slides'] }],
      order: [['createdAt', 'ASC']],
    });

    if (slides.length === 0) {
      return res.status(400).json({ message: 'No flagged slides in this category to summarize.' });
    }

    const items = slides.map((s) => {
      const parsed = parseSlides(s.lesson?.slides);
      const slide = parsed[s.slideIndex];
      return { text: slideToText(slide) || s.lesson?.title || 'Slide' };
    });

    const summarySlides = await summarizeSlides(items, { topic: category });
    res.json({ slides: summarySlides, category });
  } catch (e) {
    const status = e.status || 500;
    console.error('Summarize saved slides error:', e.message || e);
    res.status(status).json({ message: e.message || 'Failed to summarize slides' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const deleted = await SavedSlide.destroy({
      where: { id: req.params.id, userId: req.user.id },
    });
    if (!deleted) return res.status(404).json({ message: 'Saved slide not found' });
    // Tidy up the slide's review schedule (itemId is a string ref, not an FK,
    // so it does not cascade automatically).
    await ReviewItem.destroy({
      where: { userId: req.user.id, itemType: 'savedSlide', itemId: String(req.params.id) },
    }).catch(() => {});
    res.status(204).end();
  } catch (e) {
    console.error('Delete saved slide error:', e);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;
