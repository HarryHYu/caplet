# content/curriculum/

Drop NSW **syllabus** source files here for the lesson-generation library
(`.txt`, `.md`, `.pdf`, `.html`).

Ingest them with:

```bash
cd backend
node scripts/ingest-library.js --connector=local --kind=curriculum \
  --folder=../content/curriculum \
  --learningArea="Mathematics" --stage="Stage 5" \
  --syllabus="Mathematics K-10 (2022)" --sourceVersion="2022"
```

For Google Drive instead of a local folder, see `docs/library-setup.md`.

⚠️ NSW syllabus content is Crown copyright (not Creative Commons). Use prototype
data here for development/demo only; commercial use needs written permission
from NESA. See `caplet-nsw-curriculum-rag-plan.md`.
