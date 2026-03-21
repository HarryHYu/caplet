/**
 * Publish Test Course and its lesson. Run after import-lesson.js.
 * Usage: node scripts/publish-test-course.js
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { sequelize, Course, Module, Lesson } = require('../models');

async function run() {
  await sequelize.authenticate();
  const course = await Course.findOne({ where: { title: 'Test Course' } });
  if (!course) {
    console.log('Test Course not found. Run import-lesson.js first.');
    process.exit(1);
  }
  await course.update({ isPublished: true });
  const modules = await Module.findAll({ where: { courseId: course.id } });
  for (const mod of modules) {
    await Lesson.update({ isPublished: true }, { where: { moduleId: mod.id } });
  }
  console.log('Published Test Course.');
}

run()
  .then(() => process.exit(0))
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => sequelize.close());
