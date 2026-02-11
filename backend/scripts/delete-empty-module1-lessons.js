/**
 * Delete all empty placeholder lessons in Module 1
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { sequelize, Course, Module, Lesson } = require('../models');

async function lessonHasContent(lesson) {
  const raw = lesson.get ? lesson.get('slides') : lesson.slides;
  if (raw) {
    const slides = typeof raw === 'string' ? (() => { try { return JSON.parse(raw); } catch { return null; } })() : raw;
    if (Array.isArray(slides) && slides.length > 0) return true;
  }
  const content = lesson.get ? lesson.get('content') : lesson.content;
  if (content && String(content).trim() && String(content).trim() !== '(Content to be added)') return true;
  const video = lesson.get ? lesson.get('videoUrl') : lesson.videoUrl;
  if (video && String(video).trim()) return true;
  return false;
}

async function run() {
  await sequelize.authenticate();
  const course = await Course.findOne({ where: { title: 'Corporate Finance PART 1' } });
  if (!course) {
    console.log('Course not found');
    process.exit(1);
  }
  const module = await Module.findOne({
    where: { courseId: course.id, title: 'Stakeholders and Corporate Decision Making (Module 1)' }
  });
  if (!module) {
    console.log('Module not found');
    process.exit(1);
  }

  const lessons = await Lesson.findAll({
    where: { moduleId: module.id },
    order: [['order', 'ASC']]
  });

  console.log(`Found ${lessons.length} lessons in Module 1:\n`);
  let deletedCount = 0;
  
  for (const lesson of lessons) {
    const hasContent = await lessonHasContent(lesson);
    const slides = lesson.slides;
    const slideCount = slides && Array.isArray(slides) ? slides.length : 0;
    console.log(`${lesson.order}. "${lesson.title}" - ${slideCount} slides, hasContent: ${hasContent}`);
    
    if (!hasContent) {
      console.log(`  → Deleting empty placeholder: "${lesson.title}"`);
      await lesson.destroy();
      deletedCount++;
      console.log(`  ✓ Deleted`);
    } else {
      console.log(`  → Keeping lesson with content: "${lesson.title}"`);
    }
  }

  console.log(`\nDone. Deleted ${deletedCount} empty placeholder lesson(s).`);
}

run()
  .then(() => process.exit(0))
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => sequelize.close());
