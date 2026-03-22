/**
 * Publish Slide Types Demo course and its lesson so it shows on the website.
 * Run: node scripts/publish-slide-types-demo.js (with DATABASE_URL set)
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { sequelize, Course, Module, Lesson } = require('../models');

async function run() {
  await sequelize.authenticate();
  const course = await Course.findOne({ where: { title: 'Slide Types Demo' } });
  if (!course) {
    console.log('Course "Slide Types Demo" not found. Run import-lesson.js first.');
    process.exit(1);
  }
  await course.update({ isPublished: true });
  console.log('Published course: Slide Types Demo');

  const modules = await Module.findAll({ where: { courseId: course.id } });
  for (const mod of modules) {
    const [updated] = await Lesson.update(
      { isPublished: true },
      { where: { moduleId: mod.id } }
    );
    if (updated > 0) console.log('Published', updated, 'lessons in', mod.title);
  }
  console.log('Done. Course now visible on the website.');
}

run()
  .then(() => process.exit(0))
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => sequelize.close());
