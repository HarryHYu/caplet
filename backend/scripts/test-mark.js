/**
 * test-mark.js — prove GROUNDED marking locally.
 *
 * STANDALONE test. Does not touch the website. Demonstrates the marking flow
 * with your key:
 *   retrieve marking criteria/exemplars  ->  build a marking prompt
 *   ->  ask the model to mark the answer  ->  print mark + per-criterion
 *       reasoning + feedback, grounded in the retrieved criteria.
 *
 * Run AFTER ingesting marking content:
 *   bash setup-library.sh --kind=marking --area=Chemistry
 *
 * USAGE
 *   node scripts/test-mark.js \
 *     --subject="Chemistry" --stage="Year 11" \
 *     --question="Explain why ionic compounds conduct electricity when molten but not solid. (3 marks)" \
 *     --answer="Ionic compounds have ions. When solid the ions can't move. When molten they move and carry charge."
 *
 *   # or read the answer from a file:
 *   node scripts/test-mark.js --subject="Chemistry" --question="..." --answerFile=./answer.txt
 *
 * MODEL NOTE: defaults to GENERATION_MODEL env, else 'gpt-4o-mini'. Override with
 * --model=<a model your OpenAI key supports> if it errors.
 */

const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const { sequelize } = require('../config/database');
const { retrieve } = require('../services/library/retriever');
const { getClient } = require('../services/embeddings');

const DEFAULT_MODEL = process.env.GENERATION_MODEL || 'gpt-4o-mini';

function parseArgs(argv) {
  const flags = {};
  for (const a of argv) {
    const m = a.match(/^--([^=]+)(?:=(.*))?$/);
    if (m) flags[m[1]] = m[2] === undefined ? true : m[2];
  }
  return flags;
}

async function main() {
  const flags = parseArgs(process.argv.slice(2));
  const subject = flags.subject || null;
  const stage = flags.stage || null;
  const question = flags.question || '';
  const answer = flags.answerFile ? fs.readFileSync(flags.answerFile, 'utf8') : (flags.answer || '');
  const k = parseInt(flags.k, 10) || 8;
  const model = flags.model || DEFAULT_MODEL;

  if (!question || !answer) {
    console.error('Usage: node scripts/test-mark.js --subject=".." --question=".." --answer=".." [--stage=..] [--answerFile=..]');
    process.exit(1);
  }

  await sequelize.authenticate();
  const client = getClient();
  if (!client) { console.error('OPENAI_API_KEY not set in backend/.env'); process.exit(1); }

  // ── 1. Retrieve marking criteria/exemplars from the library ──────────────
  const filters = {};
  if (subject) filters.subject = subject;
  if (stage) filters.stage = stage;
  const hits = await retrieve({ kind: 'marking', filters, queryText: `${question}\n${answer}`, k });

  if (!hits.length) {
    console.error('No marking chunks found. Ingest marking content first (bash setup-library.sh --kind=marking).');
    process.exit(1);
  }

  console.log(`\n📑 Retrieved ${hits.length} marking chunk(s):`);
  hits.forEach((h, i) => {
    const tag = h.chunk_type ? `(${h.chunk_type}) ` : '';
    console.log(`   ${i + 1}. ${tag}${(h.chunk_text || '').replace(/\s+/g, ' ').slice(0, 90)}…`);
  });

  const criteria = hits.map((h, i) => `[${h.chunk_type || 'guideline'} ${i + 1}] ${h.chunk_text}`).join('\n\n');

  // ── 2. Build the marking prompt (structured JSON output) ─────────────────
  const system = [
    'You are an experienced NSW exam marker.',
    'Mark the student answer using ONLY the marking criteria provided below.',
    'Do not invent criteria or award marks not supported by the criteria.',
    'Return ONLY JSON of the form:',
    '{"marks_awarded": <int>, "max_marks": <int|null>, "per_criterion": [{"criterion": "<text>", "awarded": <int>, "reason": "<why>"}], "feedback": "<actionable feedback to the student>"}',
  ].join('\n');

  const user = [
    subject ? `Subject: ${subject}` : '',
    stage ? `Stage: ${stage}` : '',
    `## Question\n${question}`,
    `## Student answer\n${answer}`,
    `## Marking criteria (retrieved from the library)\n${criteria}`,
    'Mark the answer now. Return only the JSON.',
  ].filter(Boolean).join('\n\n');

  // ── 3. Mark ──────────────────────────────────────────────────────────────
  console.log(`\n🤖 Marking with model "${model}"...\n`);
  let res;
  try {
    res = await client.chat.completions.create({
      model,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    });
  } catch (e) {
    console.error(`Model call failed (${e.message}).`);
    console.error('Tip: pass --model=<a model your OpenAI key supports> (e.g. gpt-4o-mini).');
    process.exit(1);
  }

  let parsed;
  try {
    parsed = JSON.parse(res.choices?.[0]?.message?.content || '{}');
  } catch {
    console.error('Model did not return valid JSON. Raw output:');
    console.error(res.choices?.[0]?.message?.content);
    process.exit(1);
  }

  // ── 4. Print result ──────────────────────────────────────────────────────
  console.log('──────── MARKING RESULT ────────\n');
  console.log(`Mark: ${parsed.marks_awarded}${parsed.max_marks != null ? ` / ${parsed.max_marks}` : ''}\n`);
  if (Array.isArray(parsed.per_criterion)) {
    console.log('Per criterion:');
    parsed.per_criterion.forEach((c) => {
      console.log(`  • [${c.awarded}] ${c.criterion}`);
      console.log(`      ${c.reason}`);
    });
    console.log('');
  }
  console.log(`Feedback: ${parsed.feedback || '(none)'}`);
  console.log('\n────────────────────────────────');
  console.log('\nNote: a single answer just shows it works. Real accuracy = Quadratic');
  console.log('Weighted Kappa over many answers vs known human marks (the eval harness).');
}

main()
  .then(() => sequelize.close())
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Test failed:', err.message);
    sequelize.close().finally(() => process.exit(1));
  });
