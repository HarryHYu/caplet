/**
 * Demo seed — populates a local/staging database with enough real content
 * that every part of the product is demonstrable end to end.
 *
 * Why this exists: a freshly-migrated database is schema-complete but empty,
 * and an empty app is indistinguishable from a broken one — no courses, no
 * classes to join, no teacher account able to create one. This creates the
 * accounts and content a walkthrough needs.
 *
 * Safe to run repeatedly: everything is findOrCreate/idempotent, and it never
 * deletes or overwrites existing rows.
 *
 *   node backend/scripts/seed-demo.js
 *
 * Refuses to run against production unless SEED_DEMO_ALLOW_PRODUCTION=true,
 * since it creates accounts with well-known passwords.
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const {
  sequelize, User, Course, Module, Lesson, Classroom, ClassMembership,
  TeacherProfile, ConsentRecord, ForumCategory, ForumThread, ForumPost,
  ForumModerator, ForumUserStats,
} = require('../models');
const { ensureForumCategories } = require('../services/forumCategories');

const PASSWORD = 'CapletDemo123!';
const CLASS_CODE = 'DEMO2026';

const ACCOUNTS = [
  { key: 'admin', email: 'admin@caplet.demo', firstName: 'Alex', lastName: 'Admin', role: 'admin', dateOfBirth: '1988-03-12' },
  { key: 'teacher', email: 'teacher@caplet.demo', firstName: 'Tara', lastName: 'Teacher', role: 'instructor', dateOfBirth: '1985-07-22' },
  { key: 'student', email: 'student@caplet.demo', firstName: 'Sam', lastName: 'Student', role: 'student', dateOfBirth: '2007-04-18' },
  { key: 'student2', email: 'student2@caplet.demo', firstName: 'Riley', lastName: 'Nguyen', role: 'student', dateOfBirth: '2007-09-02' },
];

async function ensureUser(spec) {
  const [user, created] = await User.findOrCreate({
    where: { email: spec.email },
    defaults: {
      email: spec.email,
      password: PASSWORD, // hashed by the model's beforeCreate hook
      firstName: spec.firstName,
      lastName: spec.lastName,
      role: spec.role,
      dateOfBirth: spec.dateOfBirth,
      isEmailVerified: true,
      onboarded: true,
    },
  });
  // Keep the role correct even if the account already existed as a student.
  if (!created && user.role !== spec.role) {
    user.role = spec.role;
    await user.save();
  }
  return user;
}

async function ensureConsent(userId, type) {
  const existing = await ConsentRecord.findOne({
    where: { userId, type, status: 'granted' },
    order: [['createdAt', 'DESC']],
  });
  if (existing) return existing;
  return ConsentRecord.create({
    userId, type, status: 'granted', policyVersion: 'current',
    grantedAt: new Date(), withdrawnAt: null, metadata: { source: 'demo_seed' },
  });
}

const COURSES = [
  {
    title: 'HSC Economics: The Global Economy',
    shortDescription: 'Globalisation, trade, and the forces shaping the world economy.',
    description: 'Covers globalisation, trade liberalisation, exchange rates, and the role of international organisations — mapped to the HSC Economics syllabus.',
    category: 'other', level: 'intermediate', duration: 240,
    modules: [
      {
        title: 'Introduction to the Global Economy',
        lessons: [
          { title: 'What is globalisation?', lessonType: 'reading', duration: 15 },
          { title: 'Measuring global integration', lessonType: 'reading', duration: 20 },
        ],
      },
      {
        title: 'Trade, Finance and Investment',
        lessons: [
          { title: 'Comparative advantage explained', lessonType: 'reading', duration: 25 },
          { title: 'Exchange rates in practice', lessonType: 'exercise', duration: 30 },
        ],
      },
    ],
  },
  {
    title: 'HSC Business Studies: Operations',
    shortDescription: 'How businesses turn inputs into outputs — and why it matters.',
    description: 'The operations function, transformation processes, quality management, and global sourcing, aligned to the HSC Business Studies syllabus.',
    category: 'other', level: 'beginner', duration: 180,
    modules: [
      {
        title: 'Role of Operations Management',
        lessons: [
          { title: 'Operations as a key business function', lessonType: 'reading', duration: 20 },
          { title: 'Cost leadership vs differentiation', lessonType: 'reading', duration: 20 },
        ],
      },
    ],
  },
  {
    title: 'Study Skills: Exam Technique',
    shortDescription: 'Practical techniques for revision, recall, and exam performance.',
    description: 'Spaced repetition, active recall, structuring extended responses, and managing exam time.',
    category: 'other', level: 'beginner', duration: 90,
    modules: [
      {
        title: 'Revision that actually works',
        lessons: [
          { title: 'Active recall vs re-reading', lessonType: 'reading', duration: 15 },
          { title: 'Building a spaced repetition schedule', lessonType: 'exercise', duration: 25 },
        ],
      },
    ],
  },
];

async function ensureCourses() {
  let createdCount = 0;
  for (const spec of COURSES) {
    const [course, created] = await Course.findOrCreate({
      where: { title: spec.title },
      defaults: {
        title: spec.title,
        description: spec.description,
        shortDescription: spec.shortDescription,
        category: spec.category,
        level: spec.level,
        duration: spec.duration,
        isPublished: true,
        isFree: true,
      },
    });
    if (created) createdCount += 1;
    if (!course.isPublished) { course.isPublished = true; await course.save(); }

    for (const [mIndex, moduleSpec] of spec.modules.entries()) {
      const [mod] = await Module.findOrCreate({
        where: { courseId: course.id, title: moduleSpec.title },
        defaults: { courseId: course.id, title: moduleSpec.title, order: mIndex, isPublished: true },
      });
      for (const [lIndex, lessonSpec] of moduleSpec.lessons.entries()) {
        await Lesson.findOrCreate({
          where: { moduleId: mod.id, title: lessonSpec.title },
          defaults: {
            moduleId: mod.id,
            title: lessonSpec.title,
            description: lessonSpec.title,
            duration: lessonSpec.duration,
            order: lIndex,
            lessonType: lessonSpec.lessonType,
            isPublished: true,
            lifecycleStatus: 'published',
            slides: [
              { type: 'text', title: lessonSpec.title, body: `Demo content for "${lessonSpec.title}".` },
            ],
          },
        });
      }
    }
  }
  return createdCount;
}

async function ensureClassroom(teacher, students) {
  const [classroom] = await Classroom.findOrCreate({
    where: { code: CLASS_CODE },
    defaults: {
      name: 'Year 12 Economics 2026',
      code: CLASS_CODE,
      description: 'Demo class for the Caplet walkthrough.',
      createdBy: teacher.id,
    },
  });
  await ClassMembership.findOrCreate({
    where: { classroomId: classroom.id, userId: teacher.id },
    defaults: { classroomId: classroom.id, userId: teacher.id, role: 'teacher' },
  });
  // Only pre-enrol the second student, so the primary demo student can be
  // shown joining live with the class code.
  for (const student of students) {
    await ClassMembership.findOrCreate({
      where: { classroomId: classroom.id, userId: student.id },
      defaults: { classroomId: classroom.id, userId: student.id, role: 'student' },
    });
  }
  return classroom;
}

async function ensureForumContent(author) {
  await ensureForumCategories();
  const economics = await ForumCategory.findOne({ where: { slug: 'economics' } });
  const studySkills = await ForumCategory.findOne({ where: { slug: 'study-skills' } });
  if (!economics || !studySkills) return 0;

  const SEED_THREADS = [
    {
      category: economics,
      title: 'How do I structure a 20-mark extended response?',
      body: 'I keep running out of time. What structure works for the longer Economics responses?',
      isQuestion: true,
      tags: ['question', 'help-needed'],
      reply: 'Plan for 4 body paragraphs: definition + theory, then two contrasting examples, then evaluation. Spend 5 minutes planning before you write — it saves more than it costs.',
    },
    {
      category: studySkills,
      title: 'Spaced repetition schedule that actually fits around school',
      body: 'Sharing the review schedule that got me through trials: day 1, day 3, day 7, day 21.',
      isQuestion: false,
      tags: ['resource', 'notes'],
      reply: null,
    },
  ];

  let created = 0;
  for (const spec of SEED_THREADS) {
    const existing = await ForumThread.findOne({ where: { title: spec.title } });
    if (existing) continue;
    const thread = await ForumThread.create({
      categoryId: spec.category.id,
      authorId: author.id,
      title: spec.title,
      slug: spec.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 80),
      body: spec.body,
      contentBlocks: [{ id: 'seed-text', type: 'text', data: { markdown: spec.body } }],
      isQuestion: spec.isQuestion,
      tags: spec.tags,
      status: 'approved',
      reviewedAt: new Date(),
      lastActivityAt: new Date(),
    });
    created += 1;
    spec.category.threadCount += 1;
    spec.category.lastActivityAt = new Date();
    await spec.category.save();

    if (spec.reply) {
      const post = await ForumPost.create({
        threadId: thread.id,
        authorId: author.id,
        content: spec.reply,
        contentBlocks: [{ id: 'seed-reply', type: 'text', data: { markdown: spec.reply } }],
        status: 'approved',
        reviewedAt: new Date(),
      });
      thread.replyCount += 1;
      if (spec.isQuestion) thread.bestAnswerPostId = post.id;
      await thread.save();
      spec.category.postCount += 1;
      await spec.category.save();
    }
  }
  return created;
}

async function main() {
  if (process.env.NODE_ENV === 'production' && process.env.SEED_DEMO_ALLOW_PRODUCTION !== 'true') {
    console.error('Refusing to seed demo accounts into production. Set SEED_DEMO_ALLOW_PRODUCTION=true to override.');
    process.exit(1);
  }

  await sequelize.authenticate();
  console.log('Seeding demo data...\n');

  const users = {};
  for (const spec of ACCOUNTS) users[spec.key] = await ensureUser(spec);
  console.log(`✔ accounts ready (${ACCOUNTS.length})`);

  await TeacherProfile.findOrCreate({
    where: { userId: users.teacher.id },
    defaults: {
      userId: users.teacher.id,
      status: 'verified',
      schoolName: 'Caplet Demo High School',
      staffEmail: users.teacher.email,
      positionTitle: 'Economics Teacher',
      verifiedAt: new Date(),
    },
  });
  const teacherProfile = await TeacherProfile.findOne({ where: { userId: users.teacher.id } });
  if (teacherProfile.status !== 'verified') {
    teacherProfile.status = 'verified';
    teacherProfile.verifiedAt = new Date();
    await teacherProfile.save();
  }
  console.log('✔ teacher profile verified');

  // Classroom participation is consent-gated by design (child-safety control).
  // Pre-granting it for the seeded students so the demo isn't blocked; the
  // consent screen itself is still demonstrable via a fresh signup.
  for (const key of ['student', 'student2']) {
    await ensureConsent(users[key].id, 'classroom_data');
  }
  console.log('✔ classroom_data consent granted for demo students');

  const newCourses = await ensureCourses();
  console.log(`✔ courses published (${COURSES.length} total, ${newCourses} new)`);

  const classroom = await ensureClassroom(users.teacher, [users.student2]);
  console.log(`✔ class "${classroom.name}" ready (code ${classroom.code})`);

  await ForumModerator.findOrCreate({
    where: { userId: users.teacher.id },
    defaults: { userId: users.teacher.id, grantedById: users.admin.id, notes: 'Demo seed' },
  });
  await ForumUserStats.findOrCreate({ where: { userId: users.student.id }, defaults: { userId: users.student.id } });
  const newThreads = await ensureForumContent(users.student2);
  console.log(`✔ forum ready (moderator granted, ${newThreads} new seeded thread(s))`);

  console.log('\n──────────── DEMO CREDENTIALS ────────────');
  console.log(`  password for all accounts:  ${PASSWORD}\n`);
  ACCOUNTS.forEach((a) => {
    const label = a.key === 'teacher' ? 'teacher + forum moderator' : a.key === 'admin' ? 'admin' : 'student';
    console.log(`  ${a.email.padEnd(26)} ${label}`);
  });
  console.log(`\n  class join code:            ${CLASS_CODE}`);
  console.log('  (student@caplet.demo is NOT yet in the class — join live with the code)');
  console.log('──────────────────────────────────────────\n');

  await sequelize.close();
}

main().catch(async (error) => {
  console.error('Demo seed failed:', error);
  try { await sequelize.close(); } catch { /* already closing */ }
  process.exit(1);
});
