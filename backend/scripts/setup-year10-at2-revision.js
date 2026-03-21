/**
 * Create Year 10 AT2 Revision course skeleton: 2 modules (Revision, Tools), no lessons yet.
 * Run: node scripts/setup-year10-at2-revision.js
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { sequelize, Course, Module } = require('../models');

async function run() {
  await sequelize.authenticate();

  let course = await Course.findOne({ where: { title: 'Year 10 AT2 Revision' } });
  if (course) {
    console.log('Course already exists. Skipping.');
    process.exit(0);
    return;
  }

  course = await Course.create({
    title: 'Year 10 AT2 Revision',
    description: 'Revision materials for Year 10 AT2. Contains revision lessons and interactive tools (flashcards, matching, etc.).',
    shortDescription: 'Revision lessons and interactive tools for Year 10 AT2.',
    category: 'other',
    level: 'intermediate',
    duration: 60,
    isPublished: true,
    isFree: true,
  });
  console.log('Created course: Year 10 AT2 Revision');

  await Module.create({
    courseId: course.id,
    title: 'Revision',
    description: null,
    order: 0,
    isPublished: true,
  });
  console.log('Created module: Revision');

  await Module.create({
    courseId: course.id,
    title: 'Tools',
    description: 'Interactive revision tools: flashcards, matching, fill-in-blank, ordering.',
    order: 1,
    isPublished: true,
  });
  console.log('Created module: Tools');

  console.log('Done. Add lessons via import-lesson.js or content JSON.');
}

run()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => sequelize.close());
