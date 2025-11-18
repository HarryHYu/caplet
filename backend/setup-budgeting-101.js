// Script to delete all courses/lessons and create Budgeting 101 course
const { Course, Lesson } = require('./models');
require('dotenv').config();

const setupBudgeting101 = async () => {
  try {
    console.log('Setting up Budgeting 101 course...');
    
    // Delete ALL courses and their lessons first
    console.log('Deleting all existing courses and lessons...');
    await Lesson.destroy({ where: {}, truncate: true });
    await Course.destroy({ where: {}, truncate: true });
    console.log('✅ All courses and lessons deleted');

    // Create the Budgeting 101 course
    const course = await Course.create({
      title: 'BUDGETING 101',
      shortDescription: 'Learn the fundamentals of budgeting and money management.',
      description: 'A comprehensive guide to understanding budgets, income, expenses, and savings. Perfect for beginners who want to take control of their finances.',
      category: 'budgeting',
      level: 'beginner',
      duration: 30,
      thumbnail: 'https://placehold.co/600x400?text=Budgeting+101',
      isPublished: true,
      isFree: true,
      tags: ['budgeting', 'personal-finance', 'money-management', 'basics']
    });

    console.log(`✅ Created course: ${course.title}`);

    // Create Module 1 lesson with video and quiz
    const lesson = await Lesson.create({
      courseId: course.id,
      title: 'Module 1: What is a budget?',
      description: 'Grasp the basic idea of what a budget is and how it fits into everyday decisions.',
      content: `# Module 1: What is a budget?

## Objective
Grasp the basic idea of what a budget is and how it fits into everyday decisions.

## Definition Simplified

A budget is a written or digital plan that shows how you expect to earn and spend money over a period of time (week, month, year, etc.). This helps track how much money you have spare and allows you to avoid a majority of debt.

## Core Concepts

### Income = money coming in

Income is the money you receive from various sources such as:
- Wages from a job
- Money from investments
- Gifts or allowances
- Any money that comes into your possession

### Expenses = money going out

Expenses are the money you spend on:
- Bills (rent, utilities, phone)
- Food and groceries
- Entertainment (Netflix, movies)
- Purchases (clothes, headphones, etc.)

### Savings = what's left or set aside

Savings is money you:
- Set aside for future goals
- Keep for emergencies
- Invest for long-term growth
- Reserve for specific purchases

## Checkpoint Quiz

Match terms (income, expense, savings) with examples:
- **Income**: Part-time job, investments
- **Expenses**: Netflix subscription, new headphones
- **Savings**: Emergency fund, long-term fund`,
      duration: 30,
      order: 1,
      lessonType: 'video',
      videoUrl: 'https://www.youtube.com/watch?v=HT-xa7Y7xps',
      isPublished: true,
      metadata: {
        hasQuiz: true,
        quizQuestions: [
          {
            id: 1,
            type: 'multiple-choice',
            question: 'Which of the following is income?',
            options: [
              'Paying rent',
              'Receiving wages from your part-time job',
              'Buying food',
              'Paying tax'
            ],
            correctAnswer: 1
          },
          {
            id: 2,
            type: 'multiple-choice',
            question: 'You earn $60 mowing lawns, $20 walking dogs, $10 from an investment fund and you spend $20 on food. What is your total income?',
            options: [
              '$70',
              '$80',
              '$90',
              '$110'
            ],
            correctAnswer: 2
          },
          {
            id: 3,
            type: 'multiple-choice',
            question: 'Which of these best describes an expense?',
            options: [
              'Money used to buy goods or services',
              'Money you save for later',
              'Money received as a gift',
              'Money invested in shares'
            ],
            correctAnswer: 0
          },
          {
            id: 4,
            type: 'multiple-choice',
            question: 'Which of the following is an expense?',
            options: [
              'Paycheck',
              'Money transferred to savings',
              'Monthly phone bill',
              'Interest earned on savings'
            ],
            correctAnswer: 2
          },
          {
            id: 5,
            type: 'multiple-choice',
            question: 'Savings are:',
            options: [
              'Money you borrow from others',
              'Money kept aside for future goals',
              'Money you spend on wants',
              'Extra bills'
            ],
            correctAnswer: 1
          },
          {
            id: 6,
            type: 'multiple-choice',
            question: 'You want to buy a $120 jacket in 3 months. How much must you save per month (assuming no interest)?',
            options: [
              '$30',
              '$40',
              '$50',
              '$60'
            ],
            correctAnswer: 1
          }
        ]
      }
    });

    console.log(`✅ Created lesson: ${lesson.title} with quiz`);
    console.log('🎉 Budgeting 101 course setup completed successfully!');
    return course;
  } catch (error) {
    console.error('❌ Error setting up Budgeting 101 course:', error);
    throw error;
  }
};

// Run if called directly
if (require.main === module) {
  setupBudgeting101()
    .then(() => {
      console.log('Done!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Failed:', error);
      process.exit(1);
    });
}

module.exports = setupBudgeting101;

