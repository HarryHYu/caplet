/**
 * One-time migration: move lessons from courseId to moduleId (Course → Module → Lesson).
 * Run once on your DB when moving to Course → Module → Lesson.
 * - If your lessons table still has courseId: run this, then deploy the new schema.
 * - Uses raw SQL so it works even after the Lesson model has been updated to moduleId-only.
 * Usage: node scripts/migrate-lessons-to-modules.js
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { sequelize, Course, Module, Lesson } = require('../models');

async function migrate() {
  await sequelize.authenticate();

  // 1) Ensure modules table exists
  await Module.sync({ alter: true });
  console.log('Modules table ready.');

  // 2) Check if lessons has courseId column (old schema) - PostgreSQL only
  const [rows] = await sequelize.query(`
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'lessons' AND column_name = 'courseId'
  `);
  const hasCourseId = rows && rows.length > 0;

  if (!hasCourseId) {
    console.log('Lessons table has no courseId column (already migrated or new DB). Nothing to do.');
    return;
  }

  // 3) Add moduleId to lessons if missing
  await sequelize.query(`
    ALTER TABLE lessons ADD COLUMN IF NOT EXISTS "moduleId" UUID REFERENCES modules(id);
  `).catch(() => {});

  // 4) Get all lessons with courseId (raw SQL)
  const lessonsRaw = await sequelize.query('SELECT id, "courseId" FROM lessons WHERE "courseId" IS NOT NULL', { type: sequelize.QueryTypes.SELECT });

  const byCourse = {};
  for (const row of lessonsRaw) {
    const cid = row.courseId;
    if (!cid) continue;
    if (!byCourse[cid]) byCourse[cid] = [];
    byCourse[cid].push(row);
  }

  for (const courseId of Object.keys(byCourse)) {
    const course = await Course.findByPk(courseId);
    if (!course) continue;
    let mod = await Module.findOne({ where: { courseId, title: 'Content' } });
    if (!mod) {
      mod = await Module.create({
        courseId,
        title: 'Content',
        description: null,
        order: 0,
        isPublished: true
      });
      console.log('Created default module "Content" for course:', course.title);
    }
    const ids = byCourse[courseId].map((r) => r.id);
    const placeholders = ids.map(() => '?').join(',');
    await sequelize.query(`UPDATE lessons SET "moduleId" = ? WHERE id IN (${placeholders})`, { replacements: [mod.id, ...ids] });
    console.log('Migrated', ids.length, 'lessons to module for course:', course.title);
  }

  console.log('Migration done.');
}

if (require.main === module) {
  migrate()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = migrate;
