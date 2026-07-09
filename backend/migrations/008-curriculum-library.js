/**
 * Migration 008 — Curriculum & Marking "Library" (RAG knowledge base)
 *
 * Creates the three tables that power retrieval-augmented generation:
 *   - library_sources    : one row per ingested file (dedup + versioning)
 *   - curriculum_chunks  : syllabus outcomes / content points (lesson grounding)
 *   - marking_chunks     : marking criteria / exemplars / past-paper text (marking grounding)
 *
 * Dialect-aware:
 *   - PostgreSQL (prod/Railway): uses the `pgvector` extension and a real
 *     `vector(N)` column with an HNSW cosine index for fast similarity search.
 *   - SQLite (local dev): pgvector is unavailable, so the embedding is stored
 *     as TEXT (a JSON array). The retriever does brute-force cosine in JS.
 *
 * EMBEDDING DIMENSION must match the embedding model (see services/embeddings.js).
 * text-embedding-3-small => 1536. If you change the model, change this AND re-embed.
 */

const EMBEDDING_DIM = 1536;

module.exports = {
  async up(queryInterface) {
    const sequelize = queryInterface.sequelize;
    const dialect = sequelize.getDialect();
    const isPg = dialect === 'postgres';

    // ── Dialect-specific column fragments ──────────────────────────────────
    const idCol = isPg
      ? 'id SERIAL PRIMARY KEY'
      : 'id INTEGER PRIMARY KEY AUTOINCREMENT';
    const embeddingCol = isPg
      ? `embedding vector(${EMBEDDING_DIM})`
      : 'embedding TEXT'; // JSON array of floats on SQLite
    const tsCol = isPg
      ? 'created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()'
      : "created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP";

    // ── pgvector extension (Postgres only) ─────────────────────────────────
    if (isPg) {
      await sequelize.query('CREATE EXTENSION IF NOT EXISTS vector;');
    }

    // ── library_sources : tracks every ingested file ───────────────────────
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS library_sources (
        ${idCol},
        connector    TEXT NOT NULL,            -- 'local' | 'gdrive' | ...
        external_id  TEXT NOT NULL,            -- file id within that connector
        name         TEXT NOT NULL,
        mime_type    TEXT,
        checksum     TEXT,                      -- to skip re-ingesting unchanged files
        kind         TEXT NOT NULL,            -- 'curriculum' | 'marking'
        status       TEXT NOT NULL DEFAULT 'pending', -- pending|ingested|error
        error        TEXT,
        chunk_count  INTEGER NOT NULL DEFAULT 0,
        source_version TEXT,
        ${tsCol}
      );
    `);
    await sequelize.query(
      'CREATE UNIQUE INDEX IF NOT EXISTS library_sources_conn_ext_idx ' +
      'ON library_sources (connector, external_id);'
    );

    // ── curriculum_chunks : lesson-generation grounding ────────────────────
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS curriculum_chunks (
        ${idCol},
        learning_area  TEXT,                    -- e.g. 'Mathematics'
        stage          TEXT,                    -- e.g. 'Stage 5'
        syllabus       TEXT,                    -- e.g. 'Mathematics K-10 (2022)'
        outcome_code   TEXT,                    -- e.g. 'MA5-EQU-C'
        outcome_text   TEXT,                    -- the official outcome statement
        content_point  TEXT,                    -- a single syllabus dot point
        chunk_text     TEXT NOT NULL,           -- the text that was embedded
        ${embeddingCol},
        source_id      INTEGER REFERENCES library_sources(id) ON DELETE CASCADE,
        source_url     TEXT,
        source_version TEXT,
        ${tsCol}
      );
    `);
    await sequelize.query(
      'CREATE INDEX IF NOT EXISTS curriculum_chunks_area_stage_idx ' +
      'ON curriculum_chunks (learning_area, stage);'
    );

    // ── marking_chunks : marking grounding ─────────────────────────────────
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS marking_chunks (
        ${idCol},
        subject        TEXT,                    -- e.g. 'Chemistry'
        stage          TEXT,                    -- e.g. 'Stage 6' / 'Year 11'
        paper_year     TEXT,                    -- e.g. '2023'
        question_ref   TEXT,                    -- e.g. 'Q21(a)'
        max_marks      INTEGER,
        chunk_type     TEXT,                    -- 'criterion' | 'exemplar' | 'guideline'
        chunk_text     TEXT NOT NULL,
        ${embeddingCol},
        source_id      INTEGER REFERENCES library_sources(id) ON DELETE CASCADE,
        source_url     TEXT,
        source_version TEXT,
        ${tsCol}
      );
    `);
    await sequelize.query(
      'CREATE INDEX IF NOT EXISTS marking_chunks_subject_stage_idx ' +
      'ON marking_chunks (subject, stage);'
    );

    // ── Vector indexes (Postgres / pgvector only) ──────────────────────────
    // HNSW = fast approximate nearest-neighbour. vector_cosine_ops = cosine distance.
    if (isPg) {
      await sequelize.query(
        'CREATE INDEX IF NOT EXISTS curriculum_chunks_embedding_hnsw ' +
        'ON curriculum_chunks USING hnsw (embedding vector_cosine_ops);'
      );
      await sequelize.query(
        'CREATE INDEX IF NOT EXISTS marking_chunks_embedding_hnsw ' +
        'ON marking_chunks USING hnsw (embedding vector_cosine_ops);'
      );
    }
  },

  async down(queryInterface) {
    const sequelize = queryInterface.sequelize;
    await sequelize.query('DROP TABLE IF EXISTS curriculum_chunks;');
    await sequelize.query('DROP TABLE IF EXISTS marking_chunks;');
    await sequelize.query('DROP TABLE IF EXISTS library_sources;');
    // Note: we intentionally do NOT drop the `vector` extension on down(),
    // in case other tables come to rely on it.
  }
};
