/**
 * Skeleton for Corporate Finance PART 1:
 * - 1 course: Corporate Finance PART 1
 * - 4 modules (Module 1 has 9 lessons; Modules 2–4 empty)
 * Run with DATABASE_URL set (PostgreSQL): node scripts/setup-corporate-finance-part1.js
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { sequelize, Course, Module, Lesson } = require('../models');

const COURSE_TITLE = 'Corporate Finance PART 1';
const COURSE = {
  title: COURSE_TITLE,
  description: 'Corporate Finance Part 1: Stakeholders and Corporate Decision Making, Firms and Financial Markets, ESG Markets, Fundamentals of Investing.',
  shortDescription: 'Stakeholders, corporate decision making, financial markets, ESG, risk and return.',
  category: 'corporate-finance',
  level: 'intermediate',
  duration: 180,
  isPublished: false,
  isFree: true,
  tags: ['corporate-finance', 'stakeholders', 'esg', 'risk-return']
};

const MODULES = [
  { title: 'Stakeholders and Corporate Decision Making (Module 1)', order: 0 },
  { title: 'Firms and Financial Markets (Module 2)', order: 1 },
  { title: 'Understanding ESG Markets (Module 3)', order: 2 },
  { title: 'Fundamentals of Investing: Risk, return, Beta (Module 4)', order: 3 }
];

const MODULE_1_LESSONS = [
  'Understanding Stakeholders 1.0',
  'Understanding the objective of the firm 1.1',
  'Focuses of Corporate Finance 1.2',
  'Maximisation of stock prices 1.3',
  'Potential areas of failure in the stock market 1.4',
  'Stockholder interests vs Management interests 1.5',
  'Limits of Board Independence 1.6',
  'Boardroom Dynamics and CEO Influence 1.7',
  'Case Study and Applications'
];

async function run() {
  await sequelize.authenticate();
  console.log('Database: PostgreSQL (Railway)');

  let course = await Course.findOne({ where: { title: COURSE_TITLE } });
  if (!course) {
    course = await Course.create(COURSE);
    console.log('Created course:', course.title);
  } else {
    console.log('Using existing course:', course.title);
  }

  const modules = [];
  for (const m of MODULES) {
    let mod = await Module.findOne({ where: { courseId: course.id, title: m.title } });
    if (!mod) {
      mod = await Module.create({
        courseId: course.id,
        title: m.title,
        description: null,
        order: m.order,
        isPublished: true
      });
      console.log('Created module:', mod.title);
    } else {
      console.log('Using existing module:', mod.title);
    }
    modules.push(mod);
  }

  const mod1 = modules[0];
  for (let i = 0; i < MODULE_1_LESSONS.length; i++) {
    const title = MODULE_1_LESSONS[i];
    const existing = await Lesson.findOne({ where: { moduleId: mod1.id, title } });
    if (!existing) {
      await Lesson.create({
        moduleId: mod1.id,
        title,
        description: '(Content to be added)',
        content: null,
        duration: 5,
        order: i + 1,
        lessonType: 'reading',
        isPublished: false
      });
      console.log('Created lesson:', title);
    } else {
      console.log('Lesson already exists:', title);
    }
  }

  console.log('Done. Corporate Finance PART 1 skeleton: 1 course, 4 modules, 9 lessons in Module 1.');
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => sequelize.close());
