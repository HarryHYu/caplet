// Script to delete placeholder courses and their related content
// Run with: node backend/scripts/delete-placeholders.js
const { Course, Module, Lesson, UserProgress } = require('../models');
require('dotenv').config();

const PLACEHOLDER_TITLES = [
  'Budgeting Basics for Young Adults',
  'Understanding Superannuation in Australia',
  'Tax Fundamentals for Individuals',
  'Loans and Credit Management',
  'Investment Basics for Beginners',
  'Financial Planning for Life Goals',
  'Test Course'
];

const deletePlaceholders = async () => {
  try {
    console.log('🗑️  Starting deletion of placeholder courses...');

    for (const title of PLACEHOLDER_TITLES) {
      const course = await Course.findOne({ where: { title } });
      
      if (course) {
        console.log(`Found course: "${title}" (ID: ${course.id}). Cleaning up dependencies...`);

        // Get all modules for this course
        const modules = await Module.findAll({ where: { courseId: course.id } });
        const moduleIds = modules.map(m => m.id);

        if (moduleIds.length > 0) {
          // 1. Delete user progress for these modules/lessons
          console.log(` - Deleting user progress for course modules...`);
          await UserProgress.destroy({ where: { courseId: course.id } });

          // 2. Delete all lessons in these modules
          console.log(` - Deleting lessons in ${moduleIds.length} modules...`);
          await Lesson.destroy({ where: { moduleId: moduleIds } });

          // 3. Delete the modules
          console.log(` - Deleting modules...`);
          await Module.destroy({ where: { courseId: course.id } });
        }

        // 4. Finally delete the course
        await course.destroy();
        console.log(`✅ Successfully deleted course: "${title}"`);
      } else {
        console.log(`ℹ️  Course "${title}" not found, skipping.`);
      }
    }

    console.log('\n✨ Placeholder cleanup complete!');
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
  }
};

deletePlaceholders().then(() => process.exit(0));
