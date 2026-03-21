# Course → Module → Lesson (Railway PostgreSQL)

Everything runs on **PostgreSQL on Railway**. `DATABASE_URL` must be set (in Railway or in `backend/.env`).

## Run scripts against Railway

From project root, with `DATABASE_URL` set to your Railway Postgres URL:

```bash
cd backend && node scripts/setup-corporate-finance-part1.js
cd backend && node scripts/import-lesson.js ../content/my-lesson.json
cd backend && node cleanup-database.js
```

## What I need to run things for you

**One thing:** your **Railway PostgreSQL connection URL** (`DATABASE_URL`).

- Put it in **`backend/.env`** as:
  ```bash
  DATABASE_URL=postgres://user:password@host:port/railway
  ```
- Get the URL from: Railway dashboard → your Postgres service → **Connect** → copy the **Postgres connection URL**.
- **Don’t paste the URL in chat** (security). Add it to `backend/.env`, then say “done” or “it’s in .env” and I’ll run the scripts; they’ll use that file and hit Railway.

Once `DATABASE_URL` is in `backend/.env`, I can run the Corporate Finance skeleton (and any other script) directly against your Railway database.

## Slide types (in `slides` array)

Lessons support these slide types in the `slides` array. No progress is saved for flashcards, matching, fillblank, or ordering.

| Type | Fields | Description |
|------|--------|-------------|
| `text` | `content`, optional `caption` | Markdown content |
| `video` | `content` (YouTube URL), optional `caption` | Embedded video |
| `image` | `content` (URL), optional `caption` | Image with optional proxy |
| `question` | `question`, `options`, `correctIndex`, optional `explanation` | MCQ (also from `quiz` array) |
| `flashcard` | `cards` (array of `{front, back}`), optional `caption` | Flip cards, prev/next |
| `matching` | `pairs` (array of `{left, right}`), optional `caption` | Match terms to definitions |
| `fillblank` | `template`, `blanks`, optional `alternatives`, optional `caption` | Fill blanks; use `{{0}}`, `{{1}}` in template |
| `ordering` | `items`, `correctOrder` (indices), optional `prompt`, optional `caption` | Reorder items; up/down buttons |

Example snippets:

```json
{ "type": "flashcard", "caption": "Key terms", "cards": [{ "front": "What is X?", "back": "X is..." }] }
{ "type": "matching", "pairs": [{ "left": "Term", "right": "Definition" }] }
{ "type": "fillblank", "template": "The {{0}} regulates workplaces.", "blanks": ["Fair Work Commission"] }
{ "type": "ordering", "prompt": "Order the steps:", "items": ["Step A", "Step B"], "correctOrder": [0, 1] }
```
