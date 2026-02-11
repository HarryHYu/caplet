/**
 * List all lessons in Module 1 to verify
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { sequelize, Course, Module, Lesson } = require('../models');

async function run() {
  await sequelize.authenticate();
  const course = await Course.findOne({ where: { title: 'Corporate Finance PART 1' } });
  const module = await Module.findOne({
    where: { courseId: course.id, title: 'Stakeholders and Corporate Decision Making (Module 1)' }
  });
  const lessons = await Lesson.findAll({
    where: { moduleId: module.id },
    order: [['order', 'ASC']]
  });
  console.log(`\nLessons in Module 1 (${lessons.length} total):\n`);
  for (const l of lessons) {
    const slides = l.slides;
    const slideCount = slides && Array.isArray(slides) ? slides.length : 0;
    console.log(`${l.order}. "${l.title}" - ${slideCount} slides`);
  }
}

run()
  .then(() => process.exit(0))
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => sequelize.close());
