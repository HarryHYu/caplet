# Caplet Overview.md

**Caplet** — *Think with Clarity. Spend with Confidence.*

This is the core project description for Caplet. It serves as the primary reference for both human contributors and AI coding agents (Claude, Gemini, Cursor, etc.) working in this repository.

> **CRITICAL (for AI agents):** Always run `git add -A && git commit -m "..." && git push` after making changes. Never forget to push.

---

## Project Overview

Caplet ([capletedu.org](https://capletedu.org)) is a **free financial education platform for Australians**, bridging the financial literacy gap through structured courses, financial calculators, classroom tools, and an AI-powered financial literacy assistant.

**Monorepo structure:**
- **Frontend** — React 19 + Vite + Tailwind CSS (project root), deployed to Vercel
- **Backend** — Node.js + Express 5 + Sequelize + PostgreSQL (`backend/`), deployed to Railway

**Core features:**
1. **Courses** — Australian-focused curriculum (budgeting, tax, super, investing, corporate finance). Slide-based lessons with quizzes and auto-enrollment.
2. **Tools** — 10 free financial calculators tailored to Australian context (Tax, GST, Salary, Super, Budget, Savings, Emergency Fund, Loan, Mortgage, Compound Interest).
3. **Classes** — Classroom management for teachers and students (invite codes, assignments, announcements, submissions).
4. **AI Financial Literacy Assistant** — Chat-first dashboard powered by GPT-4o. Extracts income/expenses/debts/goals from conversation to generate personalised financial education and learning plans. This is an educational tool only — not financial advice.
5. **Survey** — Anonymous financial literacy survey with results dashboard.

---

## Development Commands

### Frontend (from project root)

```bash
npm run dev       # Vite dev server → localhost:5173
npm run build     # Production build to dist/
npm run lint      # ESLint
npm run preview   # Preview production build
```

### Backend (from `backend/`)

```bash
npm run dev       # nodemon server.js → port 5002
npm start         # node server.js
```

> **Note:** Backend requires `DATABASE_URL` in `backend/.env` pointing to a PostgreSQL instance. There is **no SQLite fallback** — PostgreSQL is mandatory.

### Content Import Pipeline

```bash
# Import a lesson JSON file into the database
cd backend && node scripts/import-lesson.js ../content/lessons/my-lesson.json
```

See [`docs/content-pipeline.md`](./docs/content-pipeline.md) for full lesson JSON format and course seeding scripts.

---

## Architecture

### Frontend (React 19 + Vite + Tailwind v3)

| Concern | Detail |
|---|---|
| Routing | React Router v7 — all routes in `src/App.jsx` |
| State | React Context only: `AuthContext`, `CoursesContext`, `ThemeContext` — no Redux/Zustand |
| API Layer | Singleton `ApiService` class in `src/services/api.js` — all backend calls go through this |
| Auth | JWT token stored in `localStorage` |
| Styling | Tailwind CSS with `class`-based dark mode |
| Pages | `src/pages/` — route-level components; calculators in `src/pages/tools/` |
| Module System | ESM (`"type": "module"` in root `package.json`) |

### Backend (Express 5 + Sequelize + PostgreSQL)

| Concern | Detail |
|---|---|
| Entry Point | `backend/server.js` — middleware, route mounts, DB auto-sync (`{ alter: true }`) |
| Models | `backend/models/` — all associations in `backend/models/index.js` |
| Model Hierarchy | `Course → Module → Lesson`; `Classroom → ClassMembership`, `Assignment → AssignmentSubmission`, `ClassAnnouncement → Comment` |
| Routes | `backend/routes/` — auth, courses, users, progress, admin, survey, classes, proxy |
| Auth | JWT + bcryptjs (12 rounds). Middleware in `backend/middleware/auth.js` |
| DB Config | `backend/config/database.js` — Sequelize with PostgreSQL only |
| Module System | CommonJS (`"type": "commonjs"` in `backend/package.json`) |
| AI Service | `backend/services/aiService.js` — GPT-4o → GPT-4-turbo → GPT-3.5-turbo fallback |

### API Base URL

The frontend `ApiService` connects to the production backend at `caplet-production.up.railway.app`. For local development, the backend runs on port `5002` and the frontend on port `5173`.

---

## Key Patterns

- **Course auto-enrollment** — Accessing a course auto-creates a `UserProgress` record. No explicit enroll action required.
- **Lesson content** — Slides-based format (`text` / `video` / `image` / `question`) stored as JSON in the DB.
- **Database sync** — `{ alter: true }` on every server start — **no separate migration files**.
- **AI unified prompt** — Single API call that simultaneously extracts financial data, merges with existing state, and generates a response.
- **ESLint** — Flat config (`eslint.config.js`) with separate rule sets for `src/**` (browser/React) and `backend/**` (Node.js). Unused vars prefixed with uppercase or underscore are allowed: `varsIgnorePattern: '^[A-Z_]'`.

---

## Deployment

| Target | Service | Trigger |
|---|---|---|
| Frontend | Vercel ([capletedu.org](https://capletedu.org)) | Push to `main` |
| Backend | Railway | Push to `main` |
| Database | PostgreSQL on Railway | Auto-synced on server start |

### Backend Environment Variables (`backend/.env`)

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string (Railway) |
| `JWT_SECRET` | Secret for JWT signing — use a long, random string |
| `NODE_ENV` | `production` or `development` |
| `FRONTEND_URL` | Frontend URL for CORS (e.g. `https://capletedu.org`) |
| `OPENAI_API_KEY` | OpenAI API key for the AI financial literacy assistant |

See [`docs/deployment.md`](./docs/deployment.md) for full setup instructions.

---

## Documentation Index

Full documentation lives in [`docs/`](./docs/):

| Document | Description |
|---|---|
| [`docs/README.md`](./docs/README.md) | Documentation hub — platform overview and quick start |
| [`docs/architecture.md`](./docs/architecture.md) | Full frontend & backend architecture, codebase structure, key files |
| [`docs/database.md`](./docs/database.md) | All Sequelize models, field definitions, relationships, AI data flow |
| [`docs/deployment.md`](./docs/deployment.md) | Dev commands, environment variables, Railway + Vercel deployment |
| [`docs/content-pipeline.md`](./docs/content-pipeline.md) | Lesson JSON format, import workflow, course seeding scripts |
| [`docs/roadmap.md`](./docs/roadmap.md) | Recent work, immediate focus, monetization strategy, known challenges |

---

## Contact

**contact@capletedu.org**
