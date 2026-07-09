/**
 * test-generate-grounded.js — prove GROUNDED lesson generation locally.
 *
 * This is a STANDALONE test. It does NOT modify lessonAI.js or touch the
 * website. It just demonstrates the real flow end to end with your key:
 *   retrieve curriculum chunks  ->  build a grounded prompt  ->  ask the model
 *   ->  print a lesson that cites the outcome codes it used.
 *
 * Run AFTER you've ingested some curriculum content (e.g. bash setup-library.sh).
 *
 * USAGE
 *   node scripts/test-generate-grounded.js "quadratic equations" --stage="Stage 5" --area="Mathematics"
 *   node scripts/test-generate-grounded.js "linear graphs" --stage="Stage 5" --model=gpt-4o-mini
 *
 * MODEL NOTE: defaults to GENERATION_MODEL env var, else 'gpt-4o-mini'. If your
 * key errors on the model, pass --model=<a model your OpenAI account supports>.
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const { sequelize } = require('../config/database');
const { retrieve } = require('../services/library/retriever');
const { getClient } = require('../services/embeddings');

const DEFAULT_MODEL = process.env.GENERATION_MODEL || 'gpt-4o-mini';

function parseArgs(argv) {
  const positional = [];
  const flags = {};
  for (const a of argv) {
    const m = a.match(/^--([^=]+)(?:=(.*))?$/);
    if (m) flags[m[1]] = m[2] === undefined ? true : m[2];
    else positional.push(a);
  }
  return { positional, flags };
}

async function main() {
  const { positional, flags } = parseArgs(process.argv.slice(2));
  const topic = positional.join(' ');
  if (!topic) {
    console.error('Usage: node scripts/test-generate-grounded.js "<topic>" [--stage=..] [--area=..] [--model=..]');
    process.exit(1);
  }
  const stage = flags.stage || null;
  const area = flags.area || 'Mathematics';
  const k = parseInt(flags.k, 10) || 10;
  const model = flags.model || DEFAULT_MODEL;

  await sequelize.authenticate();
  const client = getClient();
  if (!client) { console.error('OPENAI_API_KEY not set in backend/.env'); process.exit(1); }

  // ── 1. Retrieve grounding from the library ───────────────────────────────
  const filters = {};
  if (area) filters.learning_area = area;
  if (stage) filters.stage = stage;
  const hits = await retrieve({ kind: 'curriculum', filters, queryText: topic, k });

  if (!hits.length) {
    console.error('No curriculum chunks found. Ingest some content first (bash setup-library.sh).');
    process.exit(1);
  }

  console.log(`\n📚 Retrieved ${hits.length} grounding chunk(s) for "${topic}":`);
  hits.forEach((h, i) => {
    const tag = h.outcome_code ? `[${h.outcome_code}] ` : '';
    console.log(`   ${i + 1}. ${tag}${(h.chunk_text || '').replace(/\s+/g, ' ').slice(0, 90)}…`);
  });

  // ── 2. Build the grounded prompt ─────────────────────────────────────────
  const context = hits.map((h, i) => {
    const code = h.outcome_code || `chunk-${i + 1}`;
    return `[${code}] ${h.chunk_text}`;
  }).join('\n\n');

  const system = [
    'You are an expert NSW curriculum lesson designer.',
    'Use ONLY the syllabus content provided below as your source of truth.',
    'Do NOT introduce outcomes or content that are not in the provided context.',
    'For each section of the lesson, cite the outcome code(s) it addresses in [brackets].',
    'If the provided context does not cover part of the topic, say so rather than inventing it.',
  ].join('\n');

  const user = [
    stage ? `Stage: ${stage}` : '',
    `Learning area: ${area}`,
    `Topic: ${topic}`,
    '',
    '## Syllabus context (retrieved from the library)',
    context,
    '',
    'Write a concise lesson outline grounded in the above, citing outcome codes per section.',
  ].filter(Boolean).join('\n');

  // ── 3. Generate ──────────────────────────────────────────────────────────
  console.log(`\n🤖 Generating with model "${model}"...\n`);
  let res;
  try {
    res = await client.chat.completions.create({
      model,
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

  console.log('──────── GROUNDED LESSON ────────\n');
  console.log(res.choices?.[0]?.message?.content?.trim() || '(no content)');
  console.log('\n─────────────────────────────────');
  console.log('\nNotice: the lesson is built from retrieved syllabus chunks and cites their codes.');
}

main()
  .then(() => sequelize.close())
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Test failed:', err.message);
    sequelize.close().finally(() => process.exit(1));
  });
