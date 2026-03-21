/**
 * Delete Test Course and all its modules/lessons. Run before re-importing.
 * Usage: node scripts/delete-test-course.js
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { sequelize, Course, Module, Lesson } = require('../models');

async function run() {
  await sequelize.authenticate();
  const course = await Course.findOne({ where: { title: 'Test Course' } });
  if (!course) {
    console.log('Test Course not found. Nothing to delete.');
    process.exit(0);
    return;
  }
  const modules = await Module.findAll({ where: { courseId: course.id } });
  for (const mod of modules) {
    const deleted = await Lesson.destroy({ where: { moduleId: mod.id } });
    console.log('Deleted', deleted, 'lessons from', mod.title);
  }
  await Module.destroy({ where: { courseId: course.id } });
  await course.destroy();
  console.log('Deleted Test Course.');
}

run()
  .then(() => process.exit(0))
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => sequelize.close());
