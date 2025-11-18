// Script to restore Budgeting 101 course with actual content
const { Course, Lesson } = require('./models');
require('dotenv').config();

const restoreBudgetingCourse = async () => {
  try {
    console.log('Restoring Budgeting 101 course...');
    
    // Check if course already exists
    let course = await Course.findOne({
      where: { title: 'Budgeting 101' }
    });

    if (course) {
      console.log('Budgeting 101 course already exists, deleting old version...');
      // Delete existing lessons
      await Lesson.destroy({ where: { courseId: course.id } });
      // Delete course
      await Course.destroy({ where: { id: course.id } });
    }

    // Create the course
    course = await Course.create({
      title: 'Budgeting 101',
      shortDescription: 'Learn how to plan, track, and optimize your spending.',
      description: 'A beginner-friendly guide to budgeting in Australia. Learn the fundamentals of creating and maintaining a budget that works for you.',
      category: 'budgeting',
      level: 'beginner',
      duration: 120,
      thumbnail: 'https://placehold.co/600x400?text=Budgeting+101',
      isPublished: true,
      isFree: true,
      tags: ['budgeting', 'personal-finance', 'money-management']
    });

    console.log(`✅ Created course: ${course.title}`);

    // Create the lesson with YouTube video and quiz
    const lesson = await Lesson.create({
      courseId: course.id,
      title: 'Introduction to Budgeting',
      description: 'Learn the basics of budgeting with interactive content and a quiz.',
      content: `# Introduction to Budgeting

## What is Budgeting?

Budgeting is the process of creating a plan to spend your money. It helps you understand where your money goes and ensures you have enough for the things that matter most.

## Why Budget?

- **Control your finances**: Know exactly where your money is going
- **Save for goals**: Whether it's a holiday, a car, or a house deposit
- **Avoid debt**: Prevent overspending and accumulating debt
- **Reduce stress**: Financial planning reduces money-related anxiety
- **Build wealth**: Track your progress toward financial independence

## The 50/30/20 Rule

A popular budgeting method divides your income into three categories:

- **50%** for needs (rent, groceries, utilities, minimum debt payments)
- **30%** for wants (entertainment, dining out, hobbies)
- **20%** for savings and debt repayment

## Getting Started

1. Track your income: Know how much money you have coming in
2. List your expenses: Write down everything you spend money on
3. Categorize: Group expenses into needs, wants, and savings
4. Adjust: Make changes to align with your goals
5. Review regularly: Check your budget monthly and adjust as needed

## Budgeting Tools

There are many tools available to help you budget:

- **Spreadsheets**: Excel or Google Sheets for manual tracking
- **Apps**: PocketGuard, YNAB, or Goodbudget
- **Banking apps**: Many banks offer built-in budgeting features
- **Pen and paper**: Sometimes the simplest method is the best

Remember, the best budget is one you'll actually stick to!`,
      duration: 30,
      order: 1,
      lessonType: 'video',
      videoUrl: 'https://www.youtube.com/watch?v=YQZ2k8a3QyE', // Placeholder - update with actual video URL
      isPublished: true,
      metadata: {
        hasQuiz: true,
        quizQuestions: [
          {
            id: 1,
            type: 'multiple-choice',
            question: 'What is the main purpose of a budget?',
            options: [
              'To limit your spending completely',
              'To create a plan for how to spend your money',
              'To track only your income',
              'To avoid saving money'
            ],
            correctAnswer: 1
          },
          {
            id: 2,
            type: 'multiple-choice',
            question: 'According to the 50/30/20 rule, what percentage should go to needs?',
            options: ['20%', '30%', '50%', '70%'],
            correctAnswer: 2
          },
          {
            id: 3,
            type: 'multiple-choice',
            question: 'Which of the following is considered a "need" in budgeting?',
            options: ['Dining out', 'Rent', 'Entertainment', 'Hobbies'],
            correctAnswer: 1
          },
          {
            id: 4,
            type: 'short-answer',
            question: 'What is one benefit of budgeting?'
          },
          {
            id: 5,
            type: 'multiple-choice',
            question: 'How often should you review your budget?',
            options: ['Daily', 'Weekly', 'Monthly', 'Yearly'],
            correctAnswer: 2
          }
        ]
      }
    });

    console.log(`✅ Created lesson: ${lesson.title} with quiz`);

    console.log('🎉 Budgeting 101 course restored successfully!');
    return course;
  } catch (error) {
    console.error('❌ Error restoring Budgeting 101 course:', error);
    throw error;
  }
};

// Run if called directly
if (require.main === module) {
  restoreBudgetingCourse()
    .then(() => {
      console.log('Done!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Failed:', error);
      process.exit(1);
    });
}

module.exports = restoreBudgetingCourse;

