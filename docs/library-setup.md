# Library (RAG) — Setup & Run Guide

This is the **skeleton** of Caplet's curriculum + marking "library" (RAG knowledge
base). It lets you ingest resource files (from a local folder or a shared Google
Drive), embed them, and retrieve the most relevant pieces for a query. It is
standalone — not yet wired into lesson generation or marking (that's the next step).

Conceptual background: see `how-a-library-works.md` and `caplet-nsw-curriculum-rag-plan.md`.

---

## What got added

```
backend/
  migrations/008-curriculum-library.js         # tables + pgvector
  services/embeddings.js                        # text -> vectors (OpenAI)
  services/library/
    chunker.js                                  # split docs into chunks
    textExtract.js                              # PDF/text -> plain text (+ OCR hook)
    retriever.js                                # the search step
    connectors/
      baseConnector.js                          # the source-agnostic interface
      localFolderConnector.js                   # source: a folder on disk
      googleDriveConnector.js                   # source: a shared Drive folder
      index.js                                  # getConnector(name)
  scripts/
    ingest-library.js                           # fill the library
    library-search.js                           # test retrieval from CLI
content/curriculum/   content/marking/          # drop source files here
```

---

## 1. Install dependencies

```bash
cd backend
npm install                # picks up the new googleapis + pdf-parse deps
```

## 2. Environment variables

Add to `backend/.env`:

```env
OPENAI_API_KEY=sk-...                 # already required by Caplet's AI
# EMBEDDING_MODEL=text-embedding-3-small   # optional; this is the default

# Only needed for the Google Drive connector:
GOOGLE_DRIVE_FOLDER_ID=<the folder id from the Drive URL>
GOOGLE_SERVICE_ACCOUNT_JSON=<base64 of your service-account key JSON>
```

### Database

- **Production (Railway Postgres):** pgvector is used automatically. Railway's
  Postgres supports the `vector` extension; the migration runs `CREATE EXTENSION`.
- **Local dev:** if `DATABASE_URL` is unset, Caplet uses SQLite, and the library
  falls back to brute-force search in JS — fine for testing. For behaviour that
  matches production, run a local Postgres with pgvector instead (e.g. the
  `pgvector/pgvector` Docker image) and set `DATABASE_URL`.

## 3. Run the migration

Migrations run automatically on server start (`npm run server`). To create the
library tables, just start the backend once, or run your normal migration flow.

## 4. Set up Google Drive (the online drive)

1. Go to **Google Cloud Console** → create a project.
2. **APIs & Services → Library →** enable **Google Drive API**.
3. **APIs & Services → Credentials → Create credentials → Service account.**
4. Open the service account → **Keys → Add key → JSON** → download the file.
5. **Share your Drive folder** with the service account's email
   (e.g. `caplet-bot@your-project.iam.gserviceaccount.com`) as **Viewer**.
6. Get the **folder id** from the folder's URL:
   `https://drive.google.com/drive/folders/`**`THIS_PART`**.
7. Base64-encode the key file and put it in the env var:

   ```bash
   base64 -i service-account.json | tr -d '\n'   # macOS/Linux: copy the output
   ```

   Set `GOOGLE_SERVICE_ACCOUNT_JSON` to that string and `GOOGLE_DRIVE_FOLDER_ID`
   to the folder id. (Base64 so the whole key fits in one env var on Railway.)

> Why a service account (not OAuth login)? It's server-to-server: no human has to
> click "allow" each time the ingestion script runs. You just share the folder
> with the bot's email.

## 5. Ingest resources

**From a local folder** (quickest to test):

```bash
cd backend
# put a .txt/.md/.pdf in ../content/curriculum first
node scripts/ingest-library.js --connector=local --kind=curriculum \
  --folder=../content/curriculum \
  --learningArea="Mathematics" --stage="Stage 5" --sourceVersion="2022"
```

**From Google Drive:**

```bash
node scripts/ingest-library.js --connector=gdrive --kind=curriculum \
  --learningArea="Mathematics" --stage="Stage 5" --sourceVersion="2022"
```

Re-running skips unchanged files (tracked in `library_sources` by checksum).
Add `--force` to re-ingest everything.

## 6. Test retrieval

```bash
node scripts/library-search.js curriculum "quadratic equations" --stage="Stage 5"
node scripts/library-search.js marking "redox titration marking" --subject="Chemistry" --k=5
```

You should see ranked chunks with similarity scores. If relevant chunks come
back, retrieval works and you're ready to wire it into the AI.

---

## Parsing: generic vs LLM

Ingestion has a pluggable parser layer (`services/library/parsers/`), chosen with
`--parser`:

- `--parser=generic` (default) — structure-aware chunking. Splits on headings /
  outcomes and keeps the heading on each chunk. No LLM, no extra cost.
- `--parser=llm` — an LLM reads each document and extracts structured records:
  one chunk per **outcome content-point** (curriculum) tagged with its
  `outcome_code` / `outcome_text`, or one per **marking criterion / exemplar**
  (marking) tagged with `question_ref` / `max_marks`. Costs one cheap LLM call
  per ~6k-char segment, once at ingestion. Falls back to generic chunking for any
  segment it can't parse, so content is never lost. Model: `LIBRARY_PARSER_MODEL`
  (default `gpt-5.4-mini`).

```bash
# higher-quality, tagged ingestion:
node scripts/ingest-library.js --connector=gdrive --kind=curriculum --parser=llm \
  --learningArea="Mathematics" --stage="Stage 5"
# or via the setup script:
bash setup-library.sh --parser=llm
```

## What this skeleton does NOT do yet (next steps)

1. **OCR.** Scanned past papers (image PDFs) and student-work images need OCR.
   `textExtract.js` has an `ocrImage()` hook that currently throws — wire in
   `tesseract.js` or a vision model there.
2. **Validation.** Check extracted `outcome_code`s against a known list of real
   NSW codes; flag anything that doesn't match (catches parse errors, and is a
   credibility feature for the pitch).
3. **Wiring into the AI.** Call `retrieve()` inside `services/lessonAI.js`
   (`runStage1`) to ground lessons, and build a marking endpoint that retrieves
   criteria + exemplars. This is your Day 5–8.
4. **Accuracy benchmark.** Especially for marking — measure AI marks vs known
   human marks. See `how-a-library-works.md`, Part 8.

## Cost note

Embeddings (`text-embedding-3-small`) are very cheap — a whole syllabus costs a
few cents to embed once. The vector store is just your existing Postgres (free).
Ongoing cost scales with generation/marking requests, not library size.
