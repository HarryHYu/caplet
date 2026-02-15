# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

**CRITICAL: Always `git add -A && git commit -m "..." && git push` after making changes. Never forget to push.**

## Project Overview

Caplet is a free financial education platform for Australians. It is a monorepo with a React frontend (root) and a Node.js/Express backend (`backend/`). The frontend deploys to Vercel at capletedu.org; the backend deploys to Railway with PostgreSQL. Core features: Courses (modules/lessons with quizzes), Tools (10 calculators), Classes (classroom management), and Survey.

## Development Commands

### Frontend (from project root)
```bash
npm run dev          # Vite dev server (localhost:5173)
npm run build        # Production build to dist/
npm run lint         # ESLint (flat config, separate rules for src/ and backend/)
npm run preview      # Preview production build
```

### Backend (from backend/)
```bash
npm run dev          # nodemon server.js (port 5002)
npm start            # node server.js
```

The backend requires `DATABASE_URL` in `backend/.env` pointing to a PostgreSQL instance. There is no SQLite fallback — PostgreSQL is mandatory.

### Course Content Pipeline
```bash
cd backend && node scripts/import-lesson.js ../content/my-lesson.json
```
Lesson JSON format is documented in `content/LESSON_FORMAT.md`. Courses are seeded via standalone scripts in `backend/` (e.g. `setup-budgeting-101.js`, `add-investment-course.js`).

## Architecture

### Frontend (React 19 + Vite + Tailwind v3)
- **Routing**: React Router v7 in `src/App.jsx` — all routes defined in one file
- **State**: React Context for auth (`AuthContext`), courses (`CoursesContext`), and theme (`ThemeContext`) — no Redux/Zustand
- **API layer**: Singleton `ApiService` class in `src/services/api.js` — all backend calls go through this. Auth token stored in localStorage
- **Styling**: Tailwind CSS with `class`-based dark mode. No custom theme extensions in `tailwind.config.js`
- **Pages**: `src/pages/` contains route-level components. Calculator tools live in `src/pages/tools/`

### Backend (Express 5 + Sequelize + PostgreSQL)
- **Entry point**: `backend/server.js` — sets up middleware, mounts route files, auto-syncs DB with `{ alter: true }`
- **Models**: `backend/models/` with associations defined in `backend/models/index.js`. Key hierarchy: Course → Module → Lesson. Classroom system: Classroom → ClassMembership, Assignment → AssignmentSubmission, ClassAnnouncement → Comment
- **Routes**: `backend/routes/` — auth, courses, users, progress, admin, survey, classes, proxy (lesson images)
- **Auth**: JWT tokens, bcryptjs password hashing. Middleware in `backend/routes/auth.js`
- **DB config**: `backend/config/database.js` — Sequelize with PostgreSQL only

### API Base URL
The frontend `ApiService` has a hardcoded production API URL (`caplet-production.up.railway.app`). For local development, the backend runs on port 5002 and the frontend Vite dev server on 5173.

## Key Patterns

- Frontend uses ESM (`"type": "module"` in root package.json); backend uses CommonJS (`"type": "commonjs"`)
- The ESLint flat config (`eslint.config.js`) has separate rule sets for `src/**` (browser/React) and `backend/**` (Node.js)
- Unused vars prefixed with uppercase or underscore are allowed: `varsIgnorePattern: '^[A-Z_]'`
- Course auto-enrollment: no explicit enroll action — accessing a course auto-creates UserProgress
- Lesson content uses a slides-based format (text/video/image/question types) stored as JSON in the DB
- Database syncs with `{ alter: true }` on every server start — no separate migration files

## Deployment

- **Frontend**: Push to `main` → Vercel auto-deploys
- **Backend**: Push to `main` → Railway auto-deploys. Production DB seeding runs automatically on startup
- **Environment variables** (backend): `DATABASE_URL`, `JWT_SECRET`, `NODE_ENV`, `FRONTEND_URL`, `OPENAI_API_KEY`
