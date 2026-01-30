/**
 * Publish Corporate Finance PART 1 course and all its lessons so they show on the website.
 * Run: node scripts/publish-corporate-finance-part1.js (with DATABASE_URL set)
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { sequelize, Course, Module, Lesson } = require('../models');

async function run() {
  await sequelize.authenticate();
  const course = await Course.findOne({ where: { title: 'Corporate Finance PART 1' } });
  if (!course) {
    console.log('Course "Corporate Finance PART 1" not found.');
    process.exit(1);
  }
  await course.update({ isPublished: true });
  console.log('Published course: Corporate Finance PART 1');

  const modules = await Module.findAll({ where: { courseId: course.id } });
  for (const mod of modules) {
    const updated = await Lesson.update(
      { isPublished: true },
      { where: { moduleId: mod.id } }
    );
    if (updated[0] > 0) console.log('Published', updated[0], 'lessons in', mod.title);
  }
  console.log('Done. Course and lessons now visible on the website.');
}

run()
  .then(() => process.exit(0))
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => sequelize.close());
