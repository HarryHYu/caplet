/**
 * retriever — the "fetch the right pages" step of RAG.
 *
 * Given a query and some metadata filters, return the top-k most
 * meaning-similar chunks from the library. This is the function the AI
 * pipeline will call to ground generation/marking.
 *
 * Dialect-aware:
 *   - Postgres: real vector search via pgvector  (ORDER BY embedding <=> query)
 *   - SQLite:   brute-force cosine in JS over the filtered rows (dev only)
 *
 * Usage:
 *   const { retrieve } = require('./services/library/retriever');
 *   const hits = await retrieve({
 *     kind: 'curriculum',
 *     filters: { learning_area: 'Mathematics', stage: 'Stage 5' },
 *     queryText: 'quadratic equations',
 *     k: 10,
 *   });
 */

const { sequelize } = require('../../config/database');
const { embedText, toPgVector, cosineSimilarity } = require('../embeddings');

// Allow-list of columns we let callers filter on, per table.
// (Prevents SQL injection via filter keys.)
const TABLES = {
  curriculum: {
    name: 'curriculum_chunks',
    filterable: ['learning_area', 'stage', 'syllabus', 'outcome_code'],
    select: ['id', 'learning_area', 'stage', 'syllabus', 'outcome_code',
      'outcome_text', 'content_point', 'chunk_text', 'source_url', 'source_version'],
  },
  marking: {
    name: 'marking_chunks',
    filterable: ['subject', 'stage', 'paper_year', 'question_ref', 'chunk_type'],
    select: ['id', 'subject', 'stage', 'paper_year', 'question_ref', 'max_marks',
      'chunk_type', 'chunk_text', 'source_url', 'source_version'],
  },
};

function buildWhere(spec, filters) {
  const clauses = [];
  const replacements = {};
  for (const [key, val] of Object.entries(filters || {})) {
    if (val == null || val === '') continue;
    if (!spec.filterable.includes(key)) {
      throw new Error(`Filter "${key}" is not allowed on ${spec.name}.`);
    }
    clauses.push(`${key} = :flt_${key}`);
    replacements[`flt_${key}`] = val;
  }
  return { where: clauses.length ? `WHERE ${clauses.join(' AND ')}` : '', replacements };
}

async function retrieve({ kind, filters = {}, queryText, k = 10 }) {
  const spec = TABLES[kind];
  if (!spec) throw new Error(`Unknown library kind "${kind}". Use 'curriculum' or 'marking'.`);
  if (!queryText || !queryText.trim()) throw new Error('queryText is required.');

  const queryVec = await embedText(queryText);
  const isPg = sequelize.getDialect() === 'postgres';
  const { where, replacements } = buildWhere(spec, filters);
  const cols = spec.select.join(', ');

  if (isPg) {
    // pgvector cosine distance: smaller <=> means more similar.
    const sql = `
      SELECT ${cols}, (embedding <=> :qvec::vector) AS distance
      FROM ${spec.name}
      ${where}
      ORDER BY embedding <=> :qvec::vector
      LIMIT :k
    `;
    const rows = await sequelize.query(sql, {
      type: sequelize.QueryTypes.SELECT,
      replacements: { ...replacements, qvec: toPgVector(queryVec), k },
    });
    // Convert distance -> similarity for a consistent API (cosine sim = 1 - distance).
    return rows.map((r) => {
      const { distance, ...rest } = r;
      return { ...rest, score: 1 - Number(distance) };
    });
  }

  // ── SQLite brute-force fallback (dev) ──────────────────────────────────
  const sql = `SELECT ${cols}, embedding FROM ${spec.name} ${where}`;
  const rows = await sequelize.query(sql, {
    type: sequelize.QueryTypes.SELECT,
    replacements,
  });
  const scored = rows
    .map((r) => {
      const { embedding, ...rest } = r;
      let vec;
      try { vec = JSON.parse(embedding); } catch { vec = null; }
      if (!Array.isArray(vec)) return null;
      return { ...rest, score: cosineSimilarity(queryVec, vec) };
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score)
    .slice(0, k);
  return scored;
}

module.exports = { retrieve, TABLES };
