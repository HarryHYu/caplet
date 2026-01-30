// Script to add Basics of Investment course
require('dotenv').config();

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL is not set. Please set it before running this script.');
  process.exit(1);
}

process.env.NODE_ENV = process.env.NODE_ENV || 'production';

const { sequelize } = require('./config/database');
const Course = require('./models/Course');
const Module = require('./models/Module');
const Lesson = require('./models/Lesson');

const addInvestmentCourse = async () => {
  try {
    console.log('Adding Basics of Investment course...');

    // Ensure no duplicate courses with the same title exist
    const existingCourses = await Course.findAll({
      where: { title: 'BASICS OF INVESTMENT' },
      order: [['createdAt', 'ASC']]
    });

    let course = existingCourses[0] || null;

    if (existingCourses.length > 1) {
      const duplicateCourses = existingCourses.slice(1);
      const duplicateIds = duplicateCourses.map(c => c.id);
      console.log(`Found ${duplicateCourses.length} duplicate course(s). Removing...`);
      await Course.destroy({ where: { id: duplicateIds } }); // cascades to modules & lessons
      console.log('✅ Removed duplicate course entries');
    }

    if (course) {
      console.log('Course already exists, updating...');
      await Module.destroy({ where: { courseId: course.id } }); // cascades to lessons
      console.log(`✅ Using existing course: ${course.title}`);
    } else {
      // Create the Basics of Investment course
      course = await Course.create({
        title: 'BASICS OF INVESTMENT',
        shortDescription: 'Learn the fundamentals of investing and how the stock market works.',
        description: 'A comprehensive introduction to the stock market, shares, stock prices, and investment returns. Perfect for beginners who want to understand how investing works.',
        category: 'investment',
        level: 'beginner',
        duration: 30,
        thumbnail: 'https://placehold.co/600x400?text=Basics+of+Investment',
        isPublished: true,
        isFree: true,
        tags: ['investment', 'stock-market', 'shares', 'basics']
      });
      console.log(`✅ Created course: ${course.title}`);
    }

    const mod = await Module.create({
      courseId: course.id,
      title: 'Content',
      description: null,
      order: 0,
      isPublished: true
    });

    // Create Module 1 lesson with video and quiz
    const lesson = await Lesson.create({
      moduleId: mod.id,
      title: 'Module 1: Introduction to the Stock Market',
      description: 'Understand what the stock market is, why it exists, and how investors use it to grow wealth.',
      content: `# Module 1: Introduction to the Stock Market

## Objective
Understand what the stock market is, why it exists, and how investors use it to grow wealth.

## Definition Simplified

The stock market is a place—physical or digital—where people buy and sell shares of companies.

When you buy a share, you own a small piece of a company, and your investment can grow as the company grows.

## Core Concepts

### Shares = pieces of ownership

Buying a share means you own a fraction of a company.

### Stock Price = what people are willing to pay

Prices change based on demand, company performance, news, and investor expectations.

### Returns = money earned from investing

Returns come from:

- **Capital gains**: when share prices rise
- **Dividends**: company profits paid to shareholders

## Checkpoint Quiz

Match terms (shares, stock price, returns) with examples:
- **Shares**: Owning 5 pieces of a company
- **Stock Price**: The value of Apple stock changing during the day
- **Returns**: Making money because your investment grew`,
      duration: 30,
      order: 1,
      lessonType: 'video',
      videoUrl: 'https://www.youtube.com/watch?v=p7HKvqRI_Bo',
      isPublished: true,
      metadata: {
        hasQuiz: true,
        quizQuestions: [
          // Matching questions converted to multiple-choice
          {
            id: 1,
            type: 'multiple-choice',
            question: 'The value of Apple stock changing during the day is an example of:',
            options: [
              'Shares',
              'Stock price',
              'Returns'
            ],
            correctAnswer: 1
          },
          {
            id: 2,
            type: 'multiple-choice',
            question: 'Making money because your investment grew is an example of:',
            options: [
              'Shares',
              'Stock price',
              'Returns'
            ],
            correctAnswer: 2
          },
          {
            id: 3,
            type: 'multiple-choice',
            question: 'Owning 5 pieces of a company is an example of:',
            options: [
              'Shares',
              'Stock price',
              'Returns'
            ],
            correctAnswer: 0
          },
          // Shares MCQs
          {
            id: 4,
            type: 'multiple-choice',
            question: 'Which of the following best describes a share?',
            options: [
              'A loan to the government',
              'A small piece of ownership in a company',
              'Money kept in a savings account',
              'A type of credit card'
            ],
            correctAnswer: 1
          },
          {
            id: 5,
            type: 'multiple-choice',
            question: 'You buy 4 shares of a company at $22.5 each. How much have you invested?',
            options: [
              '$80',
              '$85',
              '$90',
              '$100'
            ],
            correctAnswer: 2
          },
          // Stock Price MCQs
          {
            id: 6,
            type: 'multiple-choice',
            question: 'Stock prices change because:',
            options: [
              'Companies randomly choose new prices',
              'Demand, performance, and market conditions cause changes',
              'The government sets all prices',
              'Stockbrokers change them at will'
            ],
            correctAnswer: 1
          },
          {
            id: 7,
            type: 'multiple-choice',
            question: 'A stock price rises from $50 to $65 and then down to $40. How could you describe the price changes?',
            options: [
              'The stock decreases to $65, then increases to $40',
              'The stock decreases to $40',
              'The stock increases to $65',
              'The stock increases to $65, then decreases to $40'
            ],
            correctAnswer: 3
          },
          // Returns MCQs
          {
            id: 8,
            type: 'multiple-choice',
            question: 'Investment returns are:',
            options: [
              'Money lost from investing',
              'Money earned from growth or dividends',
              'Fees charged by brokers',
              'Taxes from income'
            ],
            correctAnswer: 1
          },
          {
            id: 9,
            type: 'multiple-choice',
            question: 'You buy a stock for $100, it dips to $80 and then skyrockets to $160. What is your return as a percentage?',
            options: [
              '-20%',
              '20%',
              '60%',
              '100%'
            ],
            correctAnswer: 2
          }
        ]
      }
    });

    console.log(`✅ Created lesson: ${lesson.title} with quiz`);
    console.log('🎉 Basics of Investment course added successfully!');
    return course;
  } catch (error) {
    console.error('❌ Error adding Basics of Investment course:', error);
    throw error;
  }
};

// Run if called directly
if (require.main === module) {
  (async () => {
    try {
      await sequelize.authenticate();
      console.log('✅ Database connection established');
      await addInvestmentCourse();
      await sequelize.close();
      console.log('Done!');
      process.exit(0);
    } catch (error) {
      console.error('Failed:', error);
      await sequelize.close();
      process.exit(1);
    }
  })();
}

module.exports = addInvestmentCourse;

