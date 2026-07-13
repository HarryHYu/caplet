const express = require('express');
const SavedSlide = require('../models/SavedSlide');
const Lesson = require('../models/Lesson');
const Course = require('../models/Course');
const ReviewItem = require('../models/ReviewItem');
const { requireAuth } = require('../middleware/auth');
const { categorizeSlides, slideToText } = require('../services/slideCategorizer');
const { summarizeSlides } = require('../services/slideSummarizer');
const { generateRecallQuestion } = require('../services/recallQuestion');
const { requireAIConsent } = require('../services/privacyConsent');
const { recordAIInteractionSafely } = require('../services/aiHistory');
const { reserveAIQuota } = require('../middleware/aiQuota');

const router = express.Router();
router.use(requireAuth);

const recallQuota = reserveAIQuota({ scope: 'saved-slide-recall', units: 1 });
const categorizeQuota = reserveAIQuota({ scope: 'saved-slide-categorize', units: 4 });
const summarizeQuota = reserveAIQuota({ scope: 'saved-slide-summary', units: 3 });
const MAX_CATEGORIZE_SLIDES = 60;
const MAX_SUMMARY_SLIDES = 30;

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
router.post('/:id/recall-question', requireAIConsent, recallQuota, async (req, res) => {
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
    await recordAIInteractionSafely({
      userId: req.user.id,
      feature: 'saved_slide_recall',
      modelVersion: 'gpt-5.4-mini',
      status: 'completed',
      inputSummary: saved.lesson?.title || 'Saved slide',
      outputSummary: recall.question || 'Recall question generated',
      metadata: { savedSlideId: saved.id },
    });
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
router.post('/categorize', requireAIConsent, categorizeQuota, async (req, res) => {
  try {
    const slides = await SavedSlide.findAll({
      where: { userId: req.user.id },
      include: [
        { model: Lesson, as: 'lesson', attributes: ['id', 'title', 'slides'] },
        { model: Course, as: 'course', attributes: ['id', 'title'] },
      ],
      limit: MAX_CATEGORIZE_SLIDES + 1,
    });

    if (slides.length === 0) {
      return res.json({ savedSlides: [], categorized: 0 });
    }
    if (slides.length > MAX_CATEGORIZE_SLIDES) {
      return res.status(413).json({
        message: `Organise up to ${MAX_CATEGORIZE_SLIDES} saved slides at a time. Remove or review older slides first.`,
      });
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

    await recordAIInteractionSafely({
      userId: req.user.id,
      feature: 'saved_slide_categorisation',
      modelVersion: 'gpt-5.4-mini',
      status: 'completed',
      inputSummary: `${slides.length} saved slides`,
      outputSummary: `${assignments.size} slides categorised`,
      metadata: { slideCount: slides.length, categorisedCount: assignments.size },
    });

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
router.post('/summarize', requireAIConsent, summarizeQuota, async (req, res) => {
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
      limit: MAX_SUMMARY_SLIDES + 1,
    });

    if (slides.length === 0) {
      return res.status(400).json({ message: 'No flagged slides in this category to summarize.' });
    }
    if (slides.length > MAX_SUMMARY_SLIDES) {
      return res.status(413).json({
        message: `Summaries support up to ${MAX_SUMMARY_SLIDES} saved slides in one category. Split this category first.`,
      });
    }

    const items = slides.map((s) => {
      const parsed = parseSlides(s.lesson?.slides);
      const slide = parsed[s.slideIndex];
      return { text: slideToText(slide) || s.lesson?.title || 'Slide' };
    });

    const summarySlides = await summarizeSlides(items, { topic: category });
    await recordAIInteractionSafely({
      userId: req.user.id,
      feature: 'saved_slide_summary',
      modelVersion: 'gpt-5.4-mini',
      status: 'completed',
      inputSummary: `${items.length} slides in ${category || 'Uncategorized'}`,
      outputSummary: `${summarySlides.length} summary slides generated`,
      metadata: { sourceSlideCount: items.length, summarySlideCount: summarySlides.length },
    });
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
