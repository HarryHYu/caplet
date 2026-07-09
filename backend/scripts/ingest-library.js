/**
 * ingest-library.js — fill the "library" (Phase A: ingestion).
 *
 * Reads resource files from a connector (local folder or Google Drive),
 * extracts text, chunks it, embeds each chunk, and stores everything in the
 * curriculum_chunks or marking_chunks table. Tracks every file in
 * library_sources so unchanged files are skipped on re-runs.
 *
 * USAGE
 *   # Local folder -> curriculum library
 *   node scripts/ingest-library.js --connector=local --kind=curriculum \
 *       --folder=../content/curriculum --learningArea="Mathematics" --stage="Stage 5" \
 *       --syllabus="Mathematics K-10 (2022)" --sourceVersion="2022"
 *
 *   # Google Drive -> marking library
 *   node scripts/ingest-library.js --connector=gdrive --kind=marking \
 *       --subject="Chemistry" --stage="Year 11" --sourceVersion="2024"
 *
 * FLAGS
 *   --connector   local | gdrive            (required)
 *   --kind        curriculum | marking      (required)
 *   --parser      generic | llm             (default: generic)
 *                   generic = structure-aware chunking, no LLM, no extra cost
 *                   llm     = LLM extraction of outcomes/criteria with metadata
 *   --folder      path                      (local only; default content/<kind>)
 *   --folderId    drive folder id           (gdrive only; else GOOGLE_DRIVE_FOLDER_ID)
 *   --force       re-ingest even if unchanged
 *   metadata defaults applied to every chunk in this run:
 *     curriculum: --learningArea --stage --syllabus --sourceVersion
 *     marking:    --subject --stage --paperYear --sourceVersion
 *
 * NOTE: This skeleton applies the SAME metadata to every chunk of a file and
 * leaves outcome_code/content_point null. The next step (your "actual library
 * content" task) is a STRUCTURED parser per source format that emits one chunk
 * per outcome content-point / marking criterion with its own codes. Swap the
 * chunkText() call for that parser when you have the source format.
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const { sequelize } = require('../config/database');
const { getConnector } = require('../services/library/connectors');
const { getParser } = require('../services/library/parsers');
const { extractText } = require('../services/library/textExtract');
const { embedBatch, toPgVector } = require('../services/embeddings');

function parseArgs(argv) {
  const args = {};
  for (const a of argv) {
    const m = a.match(/^--([^=]+)(?:=(.*))?$/);
    if (m) args[m[1]] = m[2] === undefined ? true : m[2];
  }
  return args;
}

const isPg = () => sequelize.getDialect() === 'postgres';

/** Find an existing source row by (connector, external_id). */
async function findSource(connector, externalId) {
  const rows = await sequelize.query(
    'SELECT id, checksum, status FROM library_sources WHERE connector = :c AND external_id = :e',
    { type: sequelize.QueryTypes.SELECT, replacements: { c: connector, e: externalId } }
  );
  return rows[0] || null;
}

/** Insert or update a source row; return its id. */
async function upsertSource(row) {
  const existing = await findSource(row.connector, row.external_id);
  if (existing) {
    await sequelize.query(
      `UPDATE library_sources SET name=:name, mime_type=:mime_type, checksum=:checksum,
         kind=:kind, status=:status, error=:error, chunk_count=:chunk_count,
         source_version=:source_version
       WHERE id=:id`,
      { replacements: { ...row, id: existing.id } }
    );
    return existing.id;
  }
  await sequelize.query(
    `INSERT INTO library_sources
       (connector, external_id, name, mime_type, checksum, kind, status, error, chunk_count, source_version)
     VALUES
       (:connector, :external_id, :name, :mime_type, :checksum, :kind, :status, :error, :chunk_count, :source_version)`,
    { replacements: row }
  );
  const created = await findSource(row.connector, row.external_id);
  return created.id;
}

async function deleteChunksForSource(table, sourceId) {
  await sequelize.query(`DELETE FROM ${table} WHERE source_id = :sid`, {
    replacements: { sid: sourceId },
  });
}

/** Insert one chunk row. `meta` carries the per-run metadata + chunk_text + embedding. */
async function insertChunk(kind, meta) {
  const embPlaceholder = isPg() ? ':embedding::vector' : ':embedding';
  const embedding = isPg() ? toPgVector(meta.embedding) : JSON.stringify(meta.embedding);

  if (kind === 'curriculum') {
    await sequelize.query(
      `INSERT INTO curriculum_chunks
         (learning_area, stage, syllabus, outcome_code, outcome_text, content_point,
          chunk_text, embedding, source_id, source_url, source_version)
       VALUES
         (:learning_area, :stage, :syllabus, :outcome_code, :outcome_text, :content_point,
          :chunk_text, ${embPlaceholder}, :source_id, :source_url, :source_version)`,
      { replacements: {
        learning_area: meta.learning_area || null,
        stage: meta.stage || null,
        syllabus: meta.syllabus || null,
        outcome_code: meta.outcome_code || null,
        outcome_text: meta.outcome_text || null,
        content_point: meta.content_point || null,
        chunk_text: meta.chunk_text,
        embedding,
        source_id: meta.source_id,
        source_url: meta.source_url || null,
        source_version: meta.source_version || null,
      } }
    );
  } else {
    await sequelize.query(
      `INSERT INTO marking_chunks
         (subject, stage, paper_year, question_ref, max_marks, chunk_type,
          chunk_text, embedding, source_id, source_url, source_version)
       VALUES
         (:subject, :stage, :paper_year, :question_ref, :max_marks, :chunk_type,
          :chunk_text, ${embPlaceholder}, :source_id, :source_url, :source_version)`,
      { replacements: {
        subject: meta.subject || null,
        stage: meta.stage || null,
        paper_year: meta.paper_year || null,
        question_ref: meta.question_ref || null,
        max_marks: meta.max_marks || null,
        chunk_type: meta.chunk_type || 'guideline',
        chunk_text: meta.chunk_text,
        embedding,
        source_id: meta.source_id,
        source_url: meta.source_url || null,
        source_version: meta.source_version || null,
      } }
    );
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const connectorName = args.connector;
  const kind = args.kind;

  if (!connectorName || !['curriculum', 'marking'].includes(kind)) {
    console.error('Usage: node scripts/ingest-library.js --connector=local|gdrive --kind=curriculum|marking [...]');
    process.exit(1);
  }

  // Build connector options.
  const connOpts = {};
  if (connectorName === 'local') {
    connOpts.folder = args.folder || path.join(__dirname, `../../content/${kind}`);
  } else if (['s3', 'r2', 'bucket'].includes(connectorName)) {
    if (args.bucket) connOpts.bucket = args.bucket;     // else LIBRARY_S3_BUCKET
    if (args.prefix) connOpts.prefix = args.prefix;     // optional "folder" in the bucket
    if (args.endpoint) connOpts.endpoint = args.endpoint; // for R2 / S3-compatible
  } else {
    connOpts.folderId = args.folderId; // gdrive; falls back to env inside the connector
  }

  // Per-run metadata defaults.
  const meta = {
    learning_area: args.learningArea,
    subject: args.subject,
    stage: args.stage,
    syllabus: args.syllabus,
    paper_year: args.paperYear,
    source_version: args.sourceVersion,
  };

  await sequelize.authenticate();
  const connector = getConnector(connectorName, connOpts);
  const parser = getParser(args.parser, kind);

  console.log(`📚 Ingesting [${kind}] from connector "${connectorName}" (parser: ${args.parser || 'generic'})...`);
  const resources = await connector.listResources();
  console.log(`   Found ${resources.length} file(s).`);

  const table = kind === 'curriculum' ? 'curriculum_chunks' : 'marking_chunks';
  let totalChunks = 0;
  let skipped = 0;

  for (const ref of resources) {
    const existing = await findSource(connectorName, ref.id);
    if (!args.force && existing && existing.checksum === ref.checksum && existing.status === 'ingested') {
      skipped++;
      console.log(`   ⏭  ${ref.name} (unchanged)`);
      continue;
    }

    try {
      const fetched = await connector.fetchResource(ref);
      const text = await extractText(fetched);
      // The parser turns raw text into structured records (each with chunk_text
      // plus any metadata it could extract). Generic = chunks only; llm = tagged.
      const records = await parser.parse(text, { kind, meta });

      if (!records.length) {
        console.log(`   ⚠  ${ref.name}: no text extracted, skipping.`);
        await upsertSource({
          connector: connectorName, external_id: ref.id, name: ref.name,
          mime_type: ref.mimeType, checksum: ref.checksum, kind,
          status: 'error', error: 'no text extracted', chunk_count: 0,
          source_version: meta.source_version || null,
        });
        continue;
      }

      const sourceId = await upsertSource({
        connector: connectorName, external_id: ref.id, name: ref.name,
        mime_type: ref.mimeType, checksum: ref.checksum, kind,
        status: 'pending', error: null, chunk_count: 0,
        source_version: meta.source_version || null,
      });

      await deleteChunksForSource(table, sourceId); // clean re-ingest

      const sourceUrl = connectorName === 'gdrive'
        ? `https://drive.google.com/file/d/${ref.id}/view`
        : null;

      // Embed in batches for speed/cost. Run-level `meta` provides defaults;
      // each record's own fields (outcome_code, etc.) override them.
      const BATCH = 64;
      for (let i = 0; i < records.length; i += BATCH) {
        const slice = records.slice(i, i + BATCH);
        const vectors = await embedBatch(slice.map((r) => r.chunk_text));
        for (let j = 0; j < slice.length; j++) {
          await insertChunk(kind, {
            ...meta,
            ...slice[j],
            embedding: vectors[j],
            source_id: sourceId,
            source_url: sourceUrl,
          });
        }
      }

      await sequelize.query(
        "UPDATE library_sources SET status='ingested', chunk_count=:n, error=NULL WHERE id=:id",
        { replacements: { n: records.length, id: sourceId } }
      );
      totalChunks += records.length;
      console.log(`   ✅ ${ref.name}: ${records.length} chunk(s).`);
    } catch (e) {
      console.error(`   ❌ ${ref.name}: ${e.message}`);
      await upsertSource({
        connector: connectorName, external_id: ref.id, name: ref.name,
        mime_type: ref.mimeType, checksum: ref.checksum, kind,
        status: 'error', error: e.message.slice(0, 500), chunk_count: 0,
        source_version: meta.source_version || null,
      });
    }
  }

  console.log(`\nDone. Ingested ${totalChunks} chunk(s); skipped ${skipped} unchanged file(s).`);
}

main()
  .then(() => sequelize.close())
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Ingestion failed:', err.message);
    sequelize.close().finally(() => process.exit(1));
  });
