# content/marking/

Drop **marking** source files here — marking guidelines, criteria, band
descriptors, exemplar answers, and past-paper text (`.txt`, `.md`, `.pdf`).

Ingest them with:

```bash
cd backend
node scripts/ingest-library.js --connector=local --kind=marking \
  --folder=../content/marking \
  --subject="Chemistry" --stage="Year 11" --sourceVersion="2024"
```

Notes:
- Scanned past papers (image PDFs) need OCR before ingestion — the text
  extractor will tell you when OCR isn't configured. See `docs/library-setup.md`.
- Past papers / marking guidelines are also NESA Crown copyright — prototype
  only until licensed.
