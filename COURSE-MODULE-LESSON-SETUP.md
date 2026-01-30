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
