/**
 * Delete the empty placeholder lesson "Understanding the objective of the firm 1.1"
 * Keep the real one with content.
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { sequelize, Course, Module, Lesson } = require('../models');

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

  // Find lessons with similar title - the empty one likely has no slides
  const lessons = await Lesson.findAll({
    where: {
      moduleId: module.id,
      title: { [require('sequelize').Op.like]: '%objective of the firm%' }
    }
  });

  console.log(`Found ${lessons.length} lesson(s) with "objective of the firm" in title:`);
  for (const l of lessons) {
    const slides = l.slides;
    const hasContent = slides && Array.isArray(slides) && slides.length > 0;
    console.log(`  - "${l.title}" (order: ${l.order}, has slides: ${hasContent}, slides count: ${slides?.length || 0})`);
    
    if (!hasContent || !slides || slides.length === 0) {
      console.log(`  → Deleting empty placeholder: "${l.title}"`);
      await l.destroy();
      console.log(`  ✓ Deleted`);
    } else {
      console.log(`  → Keeping lesson with content: "${l.title}"`);
    }
  }

  console.log('Done.');
}

run()
  .then(() => process.exit(0))
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => sequelize.close());
