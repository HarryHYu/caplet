/**
 * Remove all lesson descriptions from Module 1
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

  const lessons = await Lesson.findAll({
    where: { moduleId: module.id },
    order: [['order', 'ASC']]
  });

  console.log('Removing descriptions from all lessons:\n');
  for (const lesson of lessons) {
    await lesson.update({ description: null });
    console.log(`Removed description from "${lesson.title}"`);
  }

  console.log(`\nDone. Removed descriptions from ${lessons.length} lesson(s).`);
}

run()
  .then(() => process.exit(0))
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => sequelize.close());
