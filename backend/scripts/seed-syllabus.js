#!/usr/bin/env node
/**
 * One-shot manual seeder for the HSC syllabus-point catalogue.
 *   node scripts/seed-syllabus.js          # seed anything missing
 *   node scripts/seed-syllabus.js --force  # re-upsert every point
 *
 * Routes also seed lazily on first use, so this is mainly for a fresh DB.
 */

require('../models'); // register models + associations
const { ensureSyllabusSeeded } = require('../services/syllabusSeed');
const SyllabusPoint = require('../models/SyllabusPoint');
const { sequelize } = require('../config/database');

(async () => {
  const force = process.argv.includes('--force');
  const seeded = await ensureSyllabusSeeded({ force });
  const total = await SyllabusPoint.count();
  const bySubject = await SyllabusPoint.findAll({
    attributes: ['subject', [sequelize.fn('COUNT', sequelize.col('id')), 'n']],
    group: ['subject'],
    raw: true,
  });
  console.log(`Seeded ${seeded} point(s) this run. Catalogue now holds ${total} syllabus points:`);
  for (const row of bySubject) console.log(`  ${row.subject}: ${row.n}`);
  await sequelize.close();
})().catch((e) => { console.error('seed-syllabus failed:', e.message); process.exit(1); });
