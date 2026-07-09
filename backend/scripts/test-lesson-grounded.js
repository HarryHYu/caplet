/**
 * test-lesson-grounded.js — prove the REAL lessonAI grounding path locally.
 *
 * Calls the actual generateLessonSlides() (the wired two-stage pipeline) with a
 * real model, so you can confirm lessons are grounded in the curriculum library.
 *
 * Run AFTER ingesting curriculum into caplet's DB:
 *   node scripts/ingest-library.js --connector=local --kind=curriculum \
 *     --folder=../content/curriculum --learningArea="Mathematics" --stage="Stage 5"
 *
 * USAGE
 *   node scripts/test-lesson-grounded.js "who invented the quadratic formula" \
 *     --area="Mathematics" --stage="Stage 5" --model=gpt-4o-mini --slides=5
 *
 * If your library has the planted "Harry Yu" fact, a grounded lesson should
 * repeat it — proving generation used the library, not the model's memory.
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const { sequelize } = require('../config/database');
const { generateLessonSlides } = require('../services/lessonAI');

function parseArgs(argv) {
  const pos = []; const f = {};
  for (const a of argv) { const m = a.match(/^--([^=]+)(?:=(.*))?$/); if (m) f[m[1]] = m[2] === undefined ? true : m[2]; else pos.push(a); }
  return { pos, f };
}

async function main() {
  const { pos, f } = parseArgs(process.argv.slice(2));
  const topic = pos.join(' ');
  if (!topic) { console.error('Usage: node scripts/test-lesson-grounded.js "<topic>" [--area=] [--stage=] [--model=gpt-4o-mini] [--slides=5]'); process.exit(1); }
  const area = f.area || 'Mathematics';
  const stage = f.stage || 'Stage 5';
  const model = f.model || 'gpt-4o-mini';
  const slideCount = parseInt(f.slides, 10) || 5;

  await sequelize.authenticate();
  console.log(`\nGenerating a grounded lesson on "${topic}" (${area} ${stage}) with ${model}…\n`);

  const out = await generateLessonSlides(topic, {
    title: topic,
    curriculum: `${area} ${stage}`,
    audience: stage,
    learningArea: area,
    stage,
    slideCount,
    model,
    formatterModel: model,
  });

  console.log('Outcome codes used from library:', out.curriculumOutcomes && out.curriculumOutcomes.length ? out.curriculumOutcomes.join(', ') : '(none — was the library ingested?)');
  console.log(`\nGenerated ${out.slides.length} slide(s):\n`);
  out.slides.forEach((s, i) => {
    const text = s.content || s.title || s.question || JSON.stringify(s).slice(0, 120);
    console.log(`  ${i + 1}. [${s.type}] ${String(text).replace(/\s+/g, ' ').slice(0, 140)}`);
  });
  if (out.warnings && out.warnings.length) console.log('\nWarnings:', out.warnings.join('; '));
  console.log('\nIf the content reflects your library (e.g. the planted fact), grounding works end to end.');
}

main()
  .then(() => sequelize.close())
  .then(() => process.exit(0))
  .catch((err) => { console.error('Test failed:', err.message); sequelize.close().finally(() => process.exit(1)); });
