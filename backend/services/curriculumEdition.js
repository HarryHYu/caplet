'use strict';

const EDITION_DEFINITIONS = [
  {
    key: 'NSW-ECO-2009', jurisdiction: 'NSW', subject: 'economics',
    label: 'Economics Stage 6 Syllabus (2009)', officialSyllabusCode: 'economics_stage_6_2009',
    sourceUrl: 'https://www.nsw.gov.au/education-and-training/nesa/curriculum/hsie/economics-stage-6-2009',
    firstHscCohortYear: null, lastHscCohortYear: 2027, metadata: { status: 'transition', legacy: true },
  },
  {
    key: 'NSW-ECO-2025', jurisdiction: 'NSW', subject: 'economics',
    label: 'Economics 11–12 Syllabus (2025)', officialSyllabusCode: 'economics_11_12_2025',
    sourceUrl: 'https://curriculum.nsw.edu.au/learning-areas/hsie/economics-11-12-2025/overview',
    firstHscCohortYear: 2028, lastHscCohortYear: null, metadata: { status: 'current' },
  },
];

async function ensureCurriculumEditions(models = require('../models')) {
  const { CurriculumEdition } = models;
  if (!CurriculumEdition?.findOrCreate) return { count: 0 };
  for (const definition of EDITION_DEFINITIONS) {
    await CurriculumEdition.findOrCreate({
      where: { key: definition.key },
      defaults: { ...definition, active: true, reviewedAt: null },
    });
  }
  return { count: EDITION_DEFINITIONS.length };
}

async function resolveEconomicsEdition(hscCohortYear, models = require('../models')) {
  const year = Number(hscCohortYear);
  if (!Number.isInteger(year) || year < 2000 || year > 2100) return null;
  const { CurriculumEdition } = models;
  const editions = await CurriculumEdition.findAll({ where: { jurisdiction: 'NSW', subject: 'economics', active: true } });
  const matches = editions.filter((edition) => {
    const row = edition.toJSON ? edition.toJSON() : edition;
    const starts = row.firstHscCohortYear == null || year >= row.firstHscCohortYear;
    const ends = row.lastHscCohortYear == null || year <= row.lastHscCohortYear;
    return starts && ends;
  });
  if (matches.length !== 1) return null;
  const row = matches[0].toJSON ? matches[0].toJSON() : matches[0];
  return {
    key: row.key,
    jurisdiction: row.jurisdiction,
    subject: row.subject,
    label: row.label,
    officialSyllabusCode: row.officialSyllabusCode,
    sourceUrl: row.sourceUrl,
    firstHscCohortYear: row.firstHscCohortYear,
    lastHscCohortYear: row.lastHscCohortYear,
    reviewedAt: row.reviewedAt,
  };
}

module.exports = { EDITION_DEFINITIONS, ensureCurriculumEditions, resolveEconomicsEdition };
