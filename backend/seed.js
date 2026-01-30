const { Course, Module, Lesson, User } = require('./models');

const seedDatabase = async () => {
  try {
    console.log('🌱 Seeding database...');

    // Create sample courses
    const courses = [
      {
        title: 'Budgeting Basics for Young Adults',
        description: 'Learn the fundamentals of personal budgeting, including how to track expenses, create a budget, and save money effectively.',
        shortDescription: 'Master the basics of personal budgeting and money management.',
        category: 'budgeting',
        level: 'beginner',
        duration: 120,
        isPublished: true,
        isFree: true,
        tags: ['budgeting', 'personal-finance', 'money-management'],
        learningOutcomes: [
          'Create a personal budget',
          'Track monthly expenses',
          'Identify areas for savings',
          'Set financial goals'
        ]
      },
      {
        title: 'Understanding Superannuation in Australia',
        description: 'A comprehensive guide to Australian superannuation, including how it works, contribution strategies, and retirement planning.',
        shortDescription: 'Everything you need to know about Australian superannuation.',
        category: 'superannuation',
        level: 'intermediate',
        duration: 180,
        isPublished: true,
        isFree: true,
        tags: ['superannuation', 'retirement', 'australia', 'investments'],
        learningOutcomes: [
          'Understand superannuation basics',
          'Learn contribution strategies',
          'Plan for retirement',
          'Choose appropriate super funds'
        ]
      },
      {
        title: 'Tax Fundamentals for Individuals',
        description: 'Learn about Australian tax system, deductions, and how to file your tax return correctly.',
        shortDescription: 'Master the basics of Australian taxation.',
        category: 'tax',
        level: 'intermediate',
        duration: 150,
        isPublished: true,
        isFree: true,
        tags: ['tax', 'australia', 'deductions', 'tax-return'],
        learningOutcomes: [
          'Understand tax obligations',
          'Identify deductible expenses',
          'Complete tax returns',
          'Maximize tax benefits'
        ]
      }
    ];

    // Create courses
    const createdCourses = [];
    for (const courseData of courses) {
      const course = await Course.create(courseData);
      createdCourses.push(course);
      console.log(`✅ Created course: ${course.title}`);
    }

    // Create one default module per course (Course → Module → Lesson)
    const defaultModules = [];
    for (let i = 0; i < createdCourses.length; i++) {
      const mod = await Module.create({
        courseId: createdCourses[i].id,
        title: 'Content',
        description: null,
        order: 0,
        isPublished: true
      });
      defaultModules.push(mod);
    }

    // Create sample lessons for the first course
    const budgetingLessons = [
      {
        moduleId: defaultModules[0].id,
        title: 'Introduction to Budgeting',
        description: 'What is budgeting and why is it important?',
        content: 'Budgeting is the process of creating a plan to spend your money. It helps you understand where your money goes and ensures you have enough for the things that matter most.',
        duration: 15,
        order: 1,
        lessonType: 'video',
        isPublished: true
      },
      {
        moduleId: defaultModules[0].id,
        title: 'Tracking Your Expenses',
        description: 'Learn how to track your daily expenses effectively.',
        content: 'Tracking expenses is the foundation of good budgeting. We\'ll show you different methods and tools to keep track of where your money goes.',
        duration: 20,
        order: 2,
        lessonType: 'video',
        isPublished: true
      },
      {
        moduleId: defaultModules[0].id,
        title: 'Creating Your First Budget',
        description: 'Step-by-step guide to creating a personal budget.',
        content: 'Now that you understand your expenses, let\'s create a budget that works for your lifestyle and financial goals.',
        duration: 25,
        order: 3,
        lessonType: 'exercise',
        isPublished: true
      },
      {
        moduleId: defaultModules[0].id,
        title: 'Budgeting Quiz',
        description: 'Test your understanding of budgeting concepts.',
        content: 'Answer these questions to test your knowledge of budgeting fundamentals.',
        duration: 10,
        order: 4,
        lessonType: 'quiz',
        isPublished: true
      }
    ];

    // Create lessons
    for (const lessonData of budgetingLessons) {
      const lesson = await Lesson.create(lessonData);
      console.log(`✅ Created lesson: ${lesson.title}`);
    }

    // Create sample lessons for superannuation course
    const superLessons = [
      {
        moduleId: defaultModules[1].id,
        title: 'What is Superannuation?',
        description: 'Understanding the basics of Australian superannuation.',
        content: 'Superannuation is Australia\'s retirement savings system. Learn how it works and why it\'s important for your future.',
        duration: 20,
        order: 1,
        lessonType: 'video',
        isPublished: true
      },
      {
        moduleId: defaultModules[1].id,
        title: 'Superannuation Contributions',
        description: 'Learn about different types of super contributions.',
        content: 'There are several ways to contribute to your super. Understand the different types and their benefits.',
        duration: 25,
        order: 2,
        lessonType: 'video',
        isPublished: true
      }
    ];

    for (const lessonData of superLessons) {
      const lesson = await Lesson.create(lessonData);
      console.log(`✅ Created lesson: ${lesson.title}`);
    }

    console.log('🎉 Database seeded successfully!');
    console.log(`📚 Created ${createdCourses.length} courses`);
    console.log(`📖 Created ${budgetingLessons.length + superLessons.length} lessons`);

  } catch (error) {
    console.error('❌ Error seeding database:', error);
  }
};

// Run if called directly
if (require.main === module) {
  seedDatabase().then(() => {
    process.exit(0);
  });
}

module.exports = seedDatabase;
