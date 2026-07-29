/**
 * syllabusSeed.js — idempotent seeding of the NSW HSC syllabus-point catalogue.
 *
 * The 561 dot points across 11 subjects live in backend/data/*Syllabus.js. This
 * upserts them into syllabus_points. It is safe to call repeatedly (upsert on
 * the unique `code`) and self-skips subjects already fully seeded, so the study
 * coach routes can call ensureSyllabusSeeded() lazily on first use — mirroring
 * how the economics question bank seeds itself.
 */

const SyllabusPoint = require('../models/SyllabusPoint');

const ALL_SYLLABUSES = [
  { subject: 'Physics',                 data: require('../data/physicsSyllabus') },
  { subject: 'Chemistry',               data: require('../data/chemistrySyllabus') },
  { subject: 'Biology',                 data: require('../data/biologySyllabus') },
  { subject: 'Mathematics Advanced',    data: require('../data/mathsAdvancedSyllabus') },
  { subject: 'Mathematics Standard 2',  data: require('../data/mathsStandardSyllabus') },
  { subject: 'Mathematics Extension 1', data: require('../data/mathsExt1Syllabus') },
  { subject: 'Economics',               data: require('../data/economicsSyllabus') },
  { subject: 'Business Studies',        data: require('../data/businessStudiesSyllabus') },
  { subject: 'Legal Studies',           data: require('../data/legalStudiesSyllabus') },
  { subject: 'Modern History',          data: require('../data/modernHistorySyllabus') },
  { subject: 'Geography',               data: require('../data/geographySyllabus') },
];

let _seeded = false;

async function ensureSyllabusSeeded({ force = false } = {}) {
  if (_seeded && !force) return 0;
  let totalSeeded = 0;
  try {
    for (const { subject, data } of ALL_SYLLABUSES) {
      const existing = await SyllabusPoint.count({ where: { subject } });
      if (!force && existing >= data.length) continue; // already seeded
      for (const sp of data) {
        await SyllabusPoint.upsert(sp, { conflictFields: ['code'] });
      }
      totalSeeded += data.length;
    }
    _seeded = true;
  } catch (e) {
    // Non-fatal: the coach degrades to whatever is already seeded.
    console.warn('[syllabusSeed] seed error (non-fatal):', e.message);
  }
  return totalSeeded;
}

module.exports = { ensureSyllabusSeeded, ALL_SYLLABUSES };
