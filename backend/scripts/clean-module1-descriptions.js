/**
 * Remove "(Content to be added)" from lesson descriptions in Module 1
 * and restore the Case Study lesson as empty placeholder
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

  // Update all lessons to remove "(Content to be added)" from descriptions
  const lessons = await Lesson.findAll({
    where: { moduleId: module.id },
    order: [['order', 'ASC']]
  });

  console.log('Cleaning lesson descriptions:\n');
  for (const lesson of lessons) {
    const desc = lesson.description || '';
    if (desc.includes('(Content to be added)')) {
      const cleaned = desc.replace(/\(Content to be added\)/g, '').trim();
      await lesson.update({ description: cleaned || lesson.title });
      console.log(`Updated "${lesson.title}": removed "(Content to be added)"`);
    }
  }

  // Restore Case Study lesson as empty placeholder
  let caseStudy = await Lesson.findOne({
    where: { moduleId: module.id, title: 'Case Study and Applications' }
  });
  
  if (!caseStudy) {
    const maxOrder = await Lesson.max('order', { where: { moduleId: module.id } });
    caseStudy = await Lesson.create({
      moduleId: module.id,
      title: 'Case Study and Applications',
      description: 'Case Study and Applications',
      content: null,
      duration: 5,
      order: (maxOrder ?? 7) + 1,
      lessonType: 'reading',
      isPublished: false,
      slides: null
    });
    console.log('\nCreated empty placeholder: "Case Study and Applications"');
  } else {
    console.log('\n"Case Study and Applications" already exists');
  }

  console.log('\nDone.');
}

run()
  .then(() => process.exit(0))
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => sequelize.close());
