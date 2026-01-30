# Course → Module → Lesson: What to Do

## If you use **PostgreSQL** (e.g. Railway) and already have courses/lessons

1. **Clean legacy tables (optional)**  
   From project root:
   ```bash
   cd backend && node cleanup-database.js
   ```

2. **Migrate old lessons into modules (one-time)**  
   From project root:
   ```bash
   cd backend && node scripts/migrate-lessons-to-modules.js
   ```
   This creates a "Content" module per course and moves each lesson into it.

3. **Deploy**  
   Deploy your app as usual. The API and frontend already use Course → Module → Lesson.

---

## If you use **SQLite** locally and don’t care about old data

1. **Delete the old DB and let the app recreate it**  
   From project root:
   ```bash
   rm backend/caplet.db
   ```

2. **Start the backend**  
   From project root:
   ```bash
   cd backend && npm run dev
   ```
   (Or however you usually start it.)  
   On first run it will create a new DB with courses, modules, and lessons.

3. **Seed if you use seeds**  
   If you have a seed script, run it so you get sample courses/modules/lessons.

---

## Adding a new lesson via JSON (import script)

1. Put your lesson JSON file somewhere (e.g. `content/my-lesson.json`).

2. From project root run:
   ```bash
   cd backend && node scripts/import-lesson.js ../content/my-lesson.json
   ```

3. The script will:
   - Find or create the course
   - Find or create the module (default name "Content", or use `moduleTitle` in the JSON)
   - Create or update the lesson under that module

---

## Summary

- **PostgreSQL + existing data:** Run `cleanup-database.js` (optional), then `migrate-lessons-to-modules.js` once, then deploy.
- **SQLite / fresh start:** Delete `backend/caplet.db`, start the backend, optionally run your seed.
- **New lesson from JSON:** Run `node scripts/import-lesson.js <path-to-json>` from the `backend` folder.
