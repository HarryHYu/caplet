# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development
```bash
npm run dev          # Start both frontend (Vite, port 5173) and backend (Express, port 5002) concurrently
npm run client       # Frontend only
npm run server       # Backend only (runs nodemon in backend/)
```

### Build & Lint
```bash
npm run build        # Vite production build
npm run lint         # ESLint (flat config — separate rules for src/ and backend/)
```

### Testing
```bash
npm test             # Frontend tests via Vitest (src/test/**/*.test.{js,jsx})
cd backend && npm test   # Backend tests via Jest (backend/tests/**/*.test.js)
```

Frontend tests use `jsdom` + `@testing-library/react`. Backend tests use `supertest`.

## Architecture

Monorepo: React frontend at the root, Node.js/Express backend in `backend/`. The two halves use different module systems — ESM (`"type": "module"`) at the root, CommonJS (`"type": "commonjs"`) in `backend/`.

### Frontend (React 19 + Vite + Tailwind CSS v3)

- **Routing**: All routes defined in a single file — [src/App.jsx](src/App.jsx). Route guards (`RequireAuth`, `RequireAdmin`) live there too.
- **State**: React Context only — `AuthContext`, `CoursesContext`, `ThemeContext` in `src/contexts/`. No Redux or Zustand.
- **API layer**: Singleton `ApiService` class in [src/services/api.js](src/services/api.js). All backend calls go through this. Auth JWT stored in `localStorage`; editor session token in `sessionStorage`.
- **Design system**: CSS custom properties defined in [src/index.css](src/index.css) map to Tailwind tokens in [tailwind.config.js](tailwind.config.js). All colors go through `surface-*`, `text-*`, `accent-*`, `line-*` tokens — never raw hex in components. Dark mode is `class`-based.
- **Fonts**: Bricolage Grotesque (`font-display`/`font-bricolage`), Hanken Grotesk (`font-body`/`font-hanken`), Shantell Sans (`font-hand`, casual kicker labels), Lora (`font-serif`), JetBrains Mono (`font-mono`).

### Backend (Express 5 + Sequelize + PostgreSQL)

- **Entry point**: [backend/server.js](backend/server.js) — mounts all routes, runs migrations on startup, seeds production DB.
- **Database**: PostgreSQL in production (Railway). SQLite for local dev when `DATABASE_URL` is not set. Schema changes go in `backend/migrations/` — **never** alter models and rely on Sequelize `sync()`.
- **Migrations**: Managed by Umzug. Files in `backend/migrations/NNN-*.js` export `up()` and `down()` using `queryInterface`. They run automatically on server start via [backend/config/migrationRunner.js](backend/config/migrationRunner.js).
- **Models**: `backend/models/` — associations wired in `backend/models/index.js`. Core hierarchy: `Course → Module → Lesson`. Classroom system: `Classroom → ClassMembership`, `Assignment → AssignmentSubmission`.
- **Auth middleware**: [backend/middleware/auth.js](backend/middleware/auth.js) — `requireAuth` and `requireAdmin`. All routes import from here; do not duplicate JWT logic in route files.
- **AI (lesson generation)**: Two-stage pipeline in [backend/services/lessonAI.js](backend/services/lessonAI.js). Stage 1 (Planner) uses a powerful model to write lesson content as structured text; Stage 2 (Formatter, `gpt-5.4-mini`) converts it to JSON conforming to the slide schema.
- **Slide schema**: Canonical slide types and normalizer in [backend/utils/slideSchema.js](backend/utils/slideSchema.js). Rendered in the frontend by [src/components/lesson/SlideRenderer.jsx](src/components/lesson/SlideRenderer.jsx).

### Key patterns

- **Course auto-enrollment**: No explicit enroll action — accessing a course auto-creates a `UserProgress` row.
- **API base URL**: Frontend defaults to `http://localhost:5002/api` in dev, `https://caplet-production.up.railway.app/api` in prod. Override with `VITE_API_BASE_URL`.
- **Google OAuth**: Uses `@react-oauth/google` ID-token flow. Same Client ID used by both frontend (`VITE_GOOGLE_CLIENT_ID`) and backend (`GOOGLE_CLIENT_ID`).

## Environment Variables

Copy `.env.example` to `.env` at the project root for frontend vars (`VITE_*`). Backend vars go in `backend/.env` (not checked in). Key vars:

| Variable | Where | Purpose |
|---|---|---|
| `VITE_API_BASE_URL` | root `.env` | Override API URL in dev |
| `VITE_GOOGLE_CLIENT_ID` | root `.env` | Google OAuth client ID |
| `DATABASE_URL` | backend `.env` | Postgres connection string (omit to use SQLite) |
| `JWT_SECRET` | backend `.env` | Required in production; dev uses a fallback |
| `OPENAI_API_KEY` | backend `.env` | Required for AI lesson generation |

## Deployment

- **Frontend**: Vercel (`vercel.json` at root — SPA rewrite to `index.html`).
- **Backend**: Railway (`backend/railway.json`). S3-compatible storage wired via `backend/services/s3Presign.js`.
