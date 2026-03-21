# Caplet Backend API

Backend API for the Caplet financial education platform.

## Features

- **Auth** — JWT registration/login
- **Courses** — CRUD for courses, modules, lessons
- **Progress** — Lesson completion, quiz scores, auto-enrollment
- **Classes** — Classroom management (teachers, students, announcements, assignments)
- **Survey** — Anonymous survey submission and stats
- **Proxy** — Image proxy for lesson content (Reddit, Imgur, Google Drive)

## Tech Stack

- Node.js + Express 5
- Sequelize ORM
- PostgreSQL (Railway production)
- JWT + bcryptjs

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create `backend/.env`:
   ```env
   DATABASE_URL=postgres://user:pass@host:5432/dbname
   JWT_SECRET=your-secret
   NODE_ENV=development
   FRONTEND_URL=http://localhost:5173
   PORT=5002
   ```

3. Run:
   ```bash
   npm run dev    # nodemon, port 5002
   npm start      # production
   ```

## Database

PostgreSQL only. `DATABASE_URL` is required. Tables sync on startup via Sequelize `{ alter: true }`.

## Course Content

Import lessons:
```bash
node scripts/import-lesson.js ../content/my-lesson.json
```

See `content/LESSON_FORMAT.md` for JSON format.
