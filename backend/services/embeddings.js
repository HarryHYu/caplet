/**
 * Embeddings — turn text into vectors.
 *
 * A vector is a list of numbers that captures the *meaning* of a piece of text.
 * Similar meanings produce similar vectors. We embed every chunk at ingestion
 * time (stored in the DB) and embed each query at request time, then compare.
 *
 * CRITICAL: queries and documents MUST be embedded with the SAME model.
 * If you change EMBEDDING_MODEL you must change EMBEDDING_DIM in the migration
 * AND re-embed everything already stored.
 */

const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL || 'text-embedding-3-small';
const EMBEDDING_DIM = 1536; // text-embedding-3-small => 1536

// Offline mode: set LIBRARY_FAKE_EMBED=1 to generate deterministic vectors with
// NO API key. Retrieval ranks by lexical (word) overlap — good enough to prove
// the pipeline plumbing (ingest/store/retrieve) end to end and for CI, but NOT
// semantically accurate. Use the real model for actual quality.
const FAKE_EMBED = process.env.LIBRARY_FAKE_EMBED === '1';

let _client = null;
function getClient() {
  if (_client) return _client;
  if (!process.env.OPENAI_API_KEY) return null;
  const OpenAI = require('openai'); // lazy: only needed when really calling the API
  _client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return _client;
}

// Deterministic word-hash vector (offline mode only).
function fakeEmbed(text) {
  const v = new Array(EMBEDDING_DIM).fill(0);
  const words = String(text || '').toLowerCase().match(/[a-z0-9]+/g) || [];
  for (const w of words) {
    let h = 0;
    for (let i = 0; i < w.length; i++) h = (h * 31 + w.charCodeAt(i)) >>> 0;
    v[h % EMBEDDING_DIM] += 1;
  }
  const norm = Math.sqrt(v.reduce((a, x) => a + x * x, 0)) || 1;
  return v.map((x) => x / norm);
}

/**
 * Embed a single string. Returns number[] of length EMBEDDING_DIM.
 */
async function embedText(text) {
  const [vec] = await embedBatch([text]);
  return vec;
}

/**
 * Embed many strings at once (far cheaper / faster than one call each).
 * Returns an array of number[] in the same order as the input.
 */
async function embedBatch(texts) {
  if (FAKE_EMBED) {
    return texts.map((t) => fakeEmbed(t));
  }
  const client = getClient();
  if (!client) {
    const err = new Error('Embeddings unavailable — OPENAI_API_KEY is not set.');
    err.status = 503;
    throw err;
  }
  const input = texts.map((t) => (t == null ? '' : String(t)).slice(0, 8000));
  const res = await client.embeddings.create({ model: EMBEDDING_MODEL, input });
  // The API returns items possibly out of order; sort by index to be safe.
  return res.data
    .slice()
    .sort((a, b) => a.index - b.index)
    .map((d) => d.embedding);
}

/**
 * Format a JS number[] as a pgvector literal: '[0.1,0.2,...]'.
 * Used when binding the query/insert vector for Postgres.
 */
function toPgVector(vec) {
  return `[${vec.join(',')}]`;
}

/**
 * Cosine similarity between two equal-length vectors. Range ~[-1, 1];
 * 1 = identical meaning. Used by the SQLite brute-force retriever.
 */
function cosineSimilarity(a, b) {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

module.exports = {
  EMBEDDING_MODEL,
  EMBEDDING_DIM,
  getClient,
  embedText,
  embedBatch,
  toPgVector,
  cosineSimilarity,
};
