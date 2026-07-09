/**
 * library-search.js — test retrieval from the command line (Phase B, no AI).
 *
 * Embeds your query, searches the library, and prints the top matches with
 * their similarity scores. Use this to sanity-check that ingestion worked and
 * that relevant chunks come back BEFORE wiring retrieval into the AI pipeline.
 *
 * USAGE
 *   node scripts/library-search.js curriculum "quadratic equations" --stage="Stage 5" --learningArea="Mathematics"
 *   node scripts/library-search.js marking "balancing redox equations" --subject="Chemistry" --k=5
 *
 * First two positional args: <kind> <query text>. Remaining --flags are filters.
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const { sequelize } = require('../config/database');
const { retrieve } = require('../services/library/retriever');

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
  const kind = positional[0];
  const queryText = positional.slice(1).join(' ');

  if (!['curriculum', 'marking'].includes(kind) || !queryText) {
    console.error('Usage: node scripts/library-search.js <curriculum|marking> "<query>" [--filter=value] [--k=10]');
    process.exit(1);
  }

  // Build filters from flags, dropping the special --k.
  const k = parseInt(flags.k, 10) || 10;
  const filterMap = {
    learningArea: 'learning_area',
    stage: 'stage',
    syllabus: 'syllabus',
    outcomeCode: 'outcome_code',
    subject: 'subject',
    paperYear: 'paper_year',
    questionRef: 'question_ref',
    chunkType: 'chunk_type',
  };
  const filters = {};
  for (const [flag, col] of Object.entries(filterMap)) {
    if (flags[flag]) filters[col] = flags[flag];
  }

  await sequelize.authenticate();
  const hits = await retrieve({ kind, filters, queryText, k });

  console.log(`\n🔎 "${queryText}"  [${kind}]  filters=${JSON.stringify(filters)}\n`);
  if (!hits.length) {
    console.log('No results. Have you ingested anything for these filters yet?');
  }
  hits.forEach((h, i) => {
    const text = (h.chunk_text || '').replace(/\s+/g, ' ').slice(0, 240);
    const tag = h.outcome_code || h.question_ref || h.chunk_type || '';
    console.log(`${String(i + 1).padStart(2)}. score=${h.score.toFixed(3)}  ${tag}`);
    console.log(`    ${text}${text.length >= 240 ? '…' : ''}\n`);
  });
}

main()
  .then(() => sequelize.close())
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Search failed:', err.message);
    sequelize.close().finally(() => process.exit(1));
  });
