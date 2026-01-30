const { Course, Module, Lesson, User } = require('./models');

const seedProductionDatabase = async () => {
  try {
    console.log('🌱 Seeding production database...');

    // Check if courses already exist
    const existingCourses = await Course.count();
    if (existingCourses > 0) {
      console.log('✅ Database already seeded, skipping...');
      return;
    }

    // Create comprehensive course content
    const courses = [
      {
        title: 'Budgeting Basics for Young Adults',
        description: 'Learn the fundamentals of personal budgeting, including how to track expenses, create a budget, and save money effectively. Perfect for beginners who want to take control of their finances.',
        shortDescription: 'Master the basics of personal budgeting and money management.',
        category: 'budgeting',
        level: 'beginner',
        duration: 120,
        isPublished: true,
        isFree: true,
        tags: ['budgeting', 'personal-finance', 'money-management', 'savings'],
        learningOutcomes: [
          'Create a personal budget that works for your lifestyle',
          'Track monthly expenses effectively',
          'Identify areas for savings and cost reduction',
          'Set realistic financial goals',
          'Use budgeting tools and apps'
        ]
      },
      {
        title: 'Understanding Superannuation in Australia',
        description: 'A comprehensive guide to Australian superannuation, including how it works, contribution strategies, and retirement planning. Essential knowledge for every working Australian.',
        shortDescription: 'Everything you need to know about Australian superannuation.',
        category: 'superannuation',
        level: 'intermediate',
        duration: 180,
        isPublished: true,
        isFree: true,
        tags: ['superannuation', 'retirement', 'australia', 'investments', 'pension'],
        learningOutcomes: [
          'Understand how superannuation works in Australia',
          'Learn effective contribution strategies',
          'Plan for retirement with confidence',
          'Choose appropriate super funds',
          'Maximize government co-contributions'
        ]
      },
      {
        title: 'Tax Fundamentals for Individuals',
        description: 'Learn about Australian tax system, deductions, and how to file your tax return correctly. Save money and avoid common tax mistakes.',
        shortDescription: 'Master the basics of Australian taxation.',
        category: 'tax',
        level: 'intermediate',
        duration: 150,
        isPublished: true,
        isFree: true,
        tags: ['tax', 'australia', 'deductions', 'tax-return', 'ato'],
        learningOutcomes: [
          'Understand your tax obligations',
          'Identify legitimate deductible expenses',
          'Complete tax returns accurately',
          'Maximize tax benefits and refunds',
          'Work with the ATO effectively'
        ]
      },
      {
        title: 'Loans and Credit Management',
        description: 'Navigate the world of loans, credit cards, and debt management. Learn how to use credit wisely and avoid common pitfalls.',
        shortDescription: 'Smart strategies for managing loans and credit.',
        category: 'loans',
        level: 'intermediate',
        duration: 135,
        isPublished: true,
        isFree: true,
        tags: ['loans', 'credit', 'debt', 'mortgage', 'credit-cards'],
        learningOutcomes: [
          'Understand different types of loans',
          'Manage credit cards effectively',
          'Improve your credit score',
          'Avoid debt traps',
          'Choose the right loan products'
        ]
      },
      {
        title: 'Investment Basics for Beginners',
        description: 'Start your investment journey with confidence. Learn about shares, ETFs, managed funds, and building a diversified portfolio.',
        shortDescription: 'Begin your investment journey with confidence.',
        category: 'investment',
        level: 'advanced',
        duration: 200,
        isPublished: true,
        isFree: true,
        tags: ['investment', 'shares', 'etf', 'portfolio', 'diversification'],
        learningOutcomes: [
          'Understand different investment options',
          'Build a diversified portfolio',
          'Assess investment risks',
          'Use investment platforms effectively',
          'Plan for long-term wealth building'
        ]
      },
      {
        title: 'Financial Planning for Life Goals',
        description: 'Create a comprehensive financial plan for major life events like buying a home, starting a family, or planning for retirement.',
        shortDescription: 'Plan for major life financial goals.',
        category: 'planning',
        level: 'advanced',
        duration: 160,
        isPublished: true,
        isFree: true,
        tags: ['financial-planning', 'life-goals', 'home-buying', 'family', 'retirement'],
        learningOutcomes: [
          'Set and prioritize financial goals',
          'Create a comprehensive financial plan',
          'Plan for major purchases',
          'Prepare for life changes',
          'Work with financial advisors'
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

    // Create detailed lessons for each course (use moduleId)
    const allLessons = [
      // Budgeting course lessons
      {
        moduleId: defaultModules[0].id,
        title: 'Introduction to Budgeting',
        description: 'What is budgeting and why is it important for your financial health?',
        content: 'Budgeting is the process of creating a plan to spend your money. It helps you understand where your money goes and ensures you have enough for the things that matter most. A good budget gives you control over your finances and helps you achieve your financial goals.',
        duration: 15,
        order: 1,
        lessonType: 'video',
        isPublished: true
      },
      {
        moduleId: defaultModules[0].id,
        title: 'Tracking Your Expenses',
        description: 'Learn how to track your daily expenses effectively using various methods.',
        content: 'Tracking expenses is the foundation of good budgeting. We\'ll show you different methods and tools to keep track of where your money goes, from simple pen and paper to modern apps and spreadsheets.',
        duration: 20,
        order: 2,
        lessonType: 'video',
        isPublished: true
      },
      {
        moduleId: defaultModules[0].id,
        title: 'Creating Your First Budget',
        description: 'Step-by-step guide to creating a personal budget that works for you.',
        content: 'Now that you understand your expenses, let\'s create a budget that works for your lifestyle and financial goals. We\'ll cover the 50/30/20 rule and other budgeting methods.',
        duration: 25,
        order: 3,
        lessonType: 'exercise',
        isPublished: true
      },
      {
        moduleId: defaultModules[0].id,
        title: 'Budgeting Tools and Apps',
        description: 'Explore modern tools and apps that make budgeting easier and more effective.',
        content: 'Discover the best budgeting apps and tools available in Australia, including features, costs, and how to choose the right one for your needs.',
        duration: 18,
        order: 4,
        lessonType: 'reading',
        isPublished: true
      },
      {
        moduleId: defaultModules[0].id,
        title: 'Budgeting Quiz',
        description: 'Test your understanding of budgeting concepts and principles.',
        content: 'Answer these questions to test your knowledge of budgeting fundamentals and ensure you\'re ready to create your own budget.',
        duration: 10,
        order: 5,
        lessonType: 'quiz',
        isPublished: true
      },

      // Superannuation course lessons
      {
        moduleId: defaultModules[1].id,
        title: 'What is Superannuation?',
        description: 'Understanding the basics of Australian superannuation system.',
        content: 'Superannuation is Australia\'s retirement savings system. Learn how it works, why it\'s important, and how it fits into your overall financial planning.',
        duration: 20,
        order: 1,
        lessonType: 'video',
        isPublished: true
      },
      {
        moduleId: defaultModules[1].id,
        title: 'Superannuation Contributions',
        description: 'Learn about different types of super contributions and their benefits.',
        content: 'There are several ways to contribute to your super. Understand the different types, their tax benefits, and how to maximize your retirement savings.',
        duration: 25,
        order: 2,
        lessonType: 'video',
        isPublished: true
      },
      {
        moduleId: defaultModules[1].id,
        title: 'Choosing a Super Fund',
        description: 'How to choose the right superannuation fund for your needs.',
        content: 'Learn how to compare super funds, understand fees, and choose the investment options that align with your retirement goals.',
        duration: 22,
        order: 3,
        lessonType: 'reading',
        isPublished: true
      },

      // Tax course lessons
      {
        moduleId: defaultModules[2].id,
        title: 'Understanding Australian Tax System',
        description: 'Overview of how the Australian tax system works for individuals.',
        content: 'Learn about income tax, tax brackets, and how the Australian tax system is structured to help you understand your obligations.',
        duration: 18,
        order: 1,
        lessonType: 'video',
        isPublished: true
      },
      {
        moduleId: defaultModules[2].id,
        title: 'Common Tax Deductions',
        description: 'Discover legitimate tax deductions that can reduce your tax bill.',
        content: 'Learn about common work-related deductions, investment deductions, and other expenses you can claim to reduce your taxable income.',
        duration: 20,
        order: 2,
        lessonType: 'video',
        isPublished: true
      }
    ];

    // Create lessons
    for (const lessonData of allLessons) {
      const lesson = await Lesson.create(lessonData);
      console.log(`✅ Created lesson: ${lesson.title}`);
    }

    console.log('🎉 Production database seeded successfully!');
    console.log(`📚 Created ${createdCourses.length} courses`);
    console.log(`📖 Created ${allLessons.length} lessons`);

  } catch (error) {
    console.error('❌ Error seeding production database:', error);
  }
};

// Run if called directly
if (require.main === module) {
  seedProductionDatabase().then(() => {
    process.exit(0);
  });
}

module.exports = seedProductionDatabase;
