/**
 * Import a lesson from the canonical JSON format (from AI / content/example-lesson.json).
 * Usage: node scripts/import-lesson.js <path-to-lesson.json>
 * Example: node scripts/import-lesson.js ../../content/example-lesson.json
 */
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { sequelize, Course, Module, Lesson } = require('../models');

const VALID_CATEGORIES = [
  'budgeting', 'superannuation', 'tax', 'loans', 'investment', 'planning', 'corporate-finance', 'other'
];
const VALID_LEVELS = ['beginner', 'intermediate', 'advanced'];

async function ensureSlideColumns() {
  // PostgreSQL schema is managed by Sequelize sync; no extra columns needed here.
}

async function importLesson(filePath) {
  const absPath = path.isAbsolute(filePath) ? filePath : path.resolve(process.cwd(), filePath);
  if (!fs.existsSync(absPath)) {
    throw new Error(`File not found: ${absPath}`);
  }
  const raw = fs.readFileSync(absPath, 'utf8');
  const data = JSON.parse(raw);

  const courseTitle = data.courseTitle?.trim();
  const lessonTitle = data.lessonTitle?.trim();
  if (!courseTitle || !lessonTitle) {
    throw new Error('courseTitle and lessonTitle are required');
  }

  const category = VALID_CATEGORIES.includes(data.courseCategory) ? data.courseCategory : 'other';
  const level = VALID_LEVELS.includes(data.courseLevel) ? data.courseLevel : 'beginner';
  const shortDesc = (data.courseShortDescription || data.courseTitle || courseTitle).trim();
  const desc = (data.courseDescription || shortDesc).trim();
  const courseDuration = typeof data.courseDuration === 'number' ? data.courseDuration : 30;

  let course = await Course.findOne({ where: { title: courseTitle } });
  if (!course) {
    course = await Course.create({
      title: courseTitle,
      description: desc,
      shortDescription: shortDesc.slice(0, 500),
      category,
      level,
      duration: courseDuration,
      isPublished: false,
      isFree: true,
      price: 0
    });
    console.log('Created course:', course.title);
  } else {
    console.log('Using existing course:', course.title);
  }

  const moduleTitle = (data.moduleTitle || data.module || 'Content').trim();
  let module_ = await Module.findOne({ where: { courseId: course.id, title: moduleTitle } });
  if (!module_) {
    const maxOrder = await Module.max('order', { where: { courseId: course.id } });
    module_ = await Module.create({
      courseId: course.id,
      title: moduleTitle,
      description: null,
      order: (maxOrder ?? -1) + 1,
      isPublished: true
    });
    console.log('Created module:', module_.title);
  } else {
    console.log('Using existing module:', module_.title);
  }

  const lessonOrder = typeof data.lessonOrder === 'number' ? data.lessonOrder : (await Lesson.max('order', { where: { moduleId: module_.id } }) ?? -1) + 1;
  const rawSlides = Array.isArray(data.slides) ? data.slides : [];
  const contentFallback = rawSlides.find(s => s.type === 'text')?.content || '';

  const hasQuestionSlides = rawSlides.some(s => s.type === 'question');
  const quiz = Array.isArray(data.quiz) ? data.quiz : [];
  const questionSlidesFromQuiz = quiz.map((q, i) => ({
    type: 'question',
    id: `q${i + 1}`,
    question: (q.question || '').trim(),
    options: Array.isArray(q.options) ? q.options.map(o => String(o).trim()) : [],
    correctIndex: typeof q.correctIndex === 'number' ? q.correctIndex : 0,
    explanation: q.explanation ? String(q.explanation).trim() : undefined
  }));
  const slides = hasQuestionSlides ? rawSlides : [...rawSlides, ...questionSlidesFromQuiz];

  let lesson = await Lesson.findOne({
    where: { moduleId: module_.id, title: lessonTitle }
  });
  if (!lesson) {
    lesson = await Lesson.create({
      moduleId: module_.id,
      title: lessonTitle,
      description: lessonTitle,
      content: contentFallback,
      order: lessonOrder,
      duration: 5,
      lessonType: 'reading',
      isPublished: false,
      metadata: {},
      slides: slides.length > 0 ? slides : null
    });
    console.log('Created lesson:', lesson.title);
  } else {
    await lesson.update({
      order: lessonOrder,
      content: contentFallback,
      slides: slides.length > 0 ? slides : null,
      metadata: { ...(lesson.metadata || {}) }
    });
    console.log('Updated lesson:', lesson.title);
  }

  return { course, lesson };
}

async function main() {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error('Usage: node scripts/import-lesson.js <path-to-lesson.json>');
    process.exit(1);
  }
  try {
    await sequelize.authenticate();
    await ensureSlideColumns();
    await importLesson(filePath);
    console.log('Done.');
    process.exit(0);
  } catch (err) {
    console.error('Import failed:', err.message);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

main();
