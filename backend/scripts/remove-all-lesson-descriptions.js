/**
 * Remove all lesson descriptions from all courses
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { sequelize, Lesson } = require('../models');

async function run() {
  await sequelize.authenticate();
  
  const lessons = await Lesson.findAll();
  
  console.log(`Found ${lessons.length} lessons total. Removing all descriptions...\n`);
  
  // Force update all lessons to have null descriptions
  const result = await Lesson.update(
    { description: null },
    { where: {} }
  );
  
  console.log(`Done. Set descriptions to null for all ${lessons.length} lesson(s).`);
}

run()
  .then(() => process.exit(0))
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => sequelize.close());
