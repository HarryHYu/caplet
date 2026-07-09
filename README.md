# Caplet

[![React](https://img.shields.io/badge/React-19.1-149ECA?logo=react)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-7.1-646CFF?logo=vite)](https://vite.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC?logo=tailwind-css)](https://tailwindcss.com/)
[![Express](https://img.shields.io/badge/Express-5.1-000000?logo=express)](https://expressjs.com/)
[![Sequelize](https://img.shields.io/badge/Sequelize-6.37-52B0E7?logo=sequelize)](https://sequelize.org/)

Caplet is a free open platform for building and delivering structured courses, interactive tools, and collaborative workspaces — for any subject, any audience, any purpose. The app combines public course browsing, authenticated lesson progress, classroom management, revision workflows, a code-gated AI-powered lesson editor, and a suite of calculators and tools.

<img width="1328" height="1057" alt="Screenshot 2026-06-02 at 5 55 11 PM" src="https://github.com/user-attachments/assets/2ab48122-b9f1-44b8-87e4-db65d79a0f31" />

The repository is a single JavaScript monorepo:

- `src/` contains the React/Vite frontend.
- `backend/` contains the Express API, Sequelize models, Umzug migrations, route handlers, and content scripts.
- `content/` contains lesson JSON used by importer and seeding scripts.
- `docs/` contains deeper deployment, database, content, and architecture notes.

Production is currently set up for a Vercel frontend and Railway backend/PostgreSQL deployment. Local development can run against PostgreSQL via `DATABASE_URL`, or against the SQLite fallback created at `backend/caplet.db` when `DATABASE_URL` is omitted.

## Product Surface

### Public Pages

The frontend routes are defined in `src/App.jsx`.

| Route | Purpose |
|---|---|
| `/` | Public home page. Authenticated users are redirected to `/dashboard`. |
| `/courses` | Browse published courses. |
| `/courses/:courseId` | Course detail page with modules and lessons. |
| `/courses/:courseId/modules/:moduleId` | Module detail page. |
| `/courses/:courseId/lessons/:lessonId` | Slide-based lesson player. |
| `/fintools` | Index of financial calculators (formerly `/tools`, which now redirects here). |
| `/fintools/tax-calculator` | Australian income tax calculator. |
| `/fintools/budget-planner` | Budget planner. |
| `/fintools/savings-goal` | Savings goal calculator. |
| `/fintools/loan-repayment` | Loan repayment calculator. |
| `/fintools/compound-interest` | Compound interest calculator. |
| `/fintools/mortgage` | Mortgage calculator. |
| `/fintools/super-contribution` | Super contribution calculator. |
| `/fintools/gst` | GST calculator. |
| `/fintools/salary` | Salary calculator. |
| `/fintools/emergency-fund` | Emergency fund calculator. |
| `/edutools` | Index of education tools (revision and essay memoriser). |
| `/demo` | Standalone product demo/tour, available whether signed in or not. |
| `/play` | Join a live Kahoot-style quiz session (Caplet Live). |
| `/contact` | Contact page. |
| `/terms` | Terms page. |
| `/profile/:userId` | Public user profile. |
| `/survey` | Anonymous survey form. |

### Authenticated Pages

| Route | Purpose |
|---|---|
| `/dashboard` | User dashboard and learning overview. |
| `/revision` | Saved slide review. Users can organize saved slides and generate summary slides with AI. |
| `/essays` | Essay memoriser — practise recalling essays with AI feedback. |
| `/classes` | Class list and class creation/joining. |
| `/classes/:classId` | Class detail page with announcements, assignments, members, comments, and completion controls. |
| `/settings/profile` | User profile settings. |
| `/settings/account` | Account settings. |

### Admin Pages

| Route | Purpose |
|---|---|
| `/metrics` | Admin-only platform metrics dashboard. |
| `/survey-results` | Admin-only survey results dashboard. |

### Editor

`/editor` is a code-gated lesson editor. It does not require a normal user login. Instead, `POST /api/editor/enter` exchanges a workspace code for a 60-day editor JWT stored in `sessionStorage`.

The editor supports:

- Workspace-scoped course, module, and lesson CRUD.
- Draft/publish controls through `isPublished`.
- Slide editing and preview.
- AI-assisted lesson generation through `/api/ai/generate-lesson`.
- Lesson image and course cover uploads through S3 presigned POSTs.
- PDF/text source import on the frontend through `src/lib/pdfExtract.js`.

Editor workspaces are stored in `EditorWorkspace`, and courses can belong to a workspace through `workspaceId`.

## Lesson System

Lessons are stored as slide arrays on the `Lesson.slides` field. The backend validates editor writes with `backend/utils/slideSchema.js`; the frontend mirrors normalization in `src/lib/slideSchema.js` so older lesson shapes keep rendering.

Canonical slide types:

- `text`
- `media`
- `choice`
- `fillblank`
- `cards`
- `match`
- `order`
- `table`
- `divider`
- `chart`
- `diagram`
- `embed`
- `hotspot`
- `timeline`
- `desmos`

Legacy aliases such as `image`, `video`, `audio`, `question`, `truefalse`, `flashcard`, `matching`, and `ordering` are normalized to canonical types.

The lesson player in `src/components/lesson/SlideRenderer.jsx` renders:

- Markdown and math with `react-markdown`, `remark-math`, and `rehype-katex`.
- YouTube video embeds, audio, images, and iframes.
- Choice, fill-in-the-blank, matching, ordering, hotspot, and timeline interactions.
- Recharts-powered chart slides.
- Mermaid diagram slides.
- Desmos calculator slides using `VITE_DESMOS_API_KEY`.
- Google Maps embeds with `VITE_GOOGLE_MAPS_KEY` replacement for generated URLs.

See `content/LESSON_FORMAT.md` and `docs/content-pipeline.md` for content authoring details.

## Core Features

### Courses and Progress

Courses are organized as:

```text
Course -> Module -> Lesson
```

Published courses are returned by `/api/courses`. Lessons are fetched through `/api/courses/:courseId/lessons/:lessonId`, with slide JSON parsed and normalized before returning to the client.

Authenticated progress is stored in `UserProgress` and includes:

- lesson status
- progress percentage
- current slide index
- time spent
- completion timestamp
- quiz scores
- notes/bookmark fields

### Classes

The classroom system is built around:

```text
Classroom -> ClassMembership
Classroom -> Assignment -> AssignmentSubmission
Classroom -> ClassAnnouncement -> Comment
```

Teachers can create classes, invite students with join codes, add co-teachers by email, post announcements, create course/lesson assignments, and remove members. Students can join classes, mark assignments complete, and participate in announcement or assignment comments.

### Revision

Users can save slides while learning. Saved slides are stored in `SavedSlide` and surfaced at `/revision`.

The revision page can:

- group saved slides by category
- ask the backend to categorize saved slides with AI
- ask the backend to summarize a category into review slides
- render those summary slides through the same lesson slide renderer

AI categorization and summarization live in `backend/services/slideCategorizer.js` and `backend/services/slideSummarizer.js`.

### Surveys and Metrics

The public survey is submitted through `/api/survey`. Admin users can view survey stats and platform metrics through `/survey-results` and `/metrics`.

### Authentication and Roles

Authentication supports:

- email/password registration and login
- Google ID token login
- JWT sessions with 7-day expiry
- Gmail canonicalization for account matching

New accounts always start with the `student` role. Role elevation is handled through admin/bootstrap endpoints, not self-service signup.

Supported roles in the current codebase:

- `student`
- `instructor`
- `admin`

Admin-only frontend routes use `RequireAdmin` in `src/App.jsx`. Backend route protection is handled by `backend/middleware/auth.js`.

## Technology Stack

### Frontend

- React 19.1
- Vite 7.1
- React Router 7
- Tailwind CSS 3.4
- Heroicons
- GSAP
- Recharts
- React Markdown
- KaTeX via `remark-math` and `rehype-katex`
- Mermaid
- Desmos embeds
- Google OAuth via `@react-oauth/google`
- PDF parsing via `pdfjs-dist`
- Vitest and React Testing Library

### Backend

- Node.js
- Express 5
- Sequelize 6
- Umzug migrations
- PostgreSQL in production
- SQLite fallback for local development without `DATABASE_URL`
- JWT authentication
- bcrypt password hashing
- Google Auth Library
- OpenAI SDK for lesson/revision AI flows
- AWS SDK for S3 presigned uploads
- Jest and Supertest

## Repository Structure

```text
caplet/
+-- backend/
|   +-- config/
|   |   +-- database.js
|   |   +-- migrationRunner.js
|   +-- middleware/
|   |   +-- auth.js
|   +-- migrations/
|   |   +-- 001-initial-schema.js
|   |   +-- 002-chat-messages.js
|   |   +-- 002-user-onboarded.js
|   |   +-- 003-editor-workspaces.js
|   |   +-- 004-drop-financial-tables.js
|   |   +-- 005-slides-to-jsonb.js
|   |   +-- 006-saved-slides.js
|   |   +-- 007-saved-slide-category.js
|   +-- models/
|   |   +-- User.js
|   |   +-- Course.js
|   |   +-- Module.js
|   |   +-- Lesson.js
|   |   +-- UserProgress.js
|   |   +-- Survey.js
|   |   +-- Classroom.js
|   |   +-- ClassMembership.js
|   |   +-- Assignment.js
|   |   +-- AssignmentSubmission.js
|   |   +-- ClassAnnouncement.js
|   |   +-- Comment.js
|   |   +-- ChatMessage.js
|   |   +-- EditorWorkspace.js
|   |   +-- SavedSlide.js
|   |   +-- index.js
|   +-- routes/
|   |   +-- admin.js
|   |   +-- ai.js
|   |   +-- auth.js
|   |   +-- chat.js
|   |   +-- classes.js
|   |   +-- courses.js
|   |   +-- editor.js
|   |   +-- metrics.js
|   |   +-- progress.js
|   |   +-- proxy.js
|   |   +-- savedSlides.js
|   |   +-- survey.js
|   |   +-- uploads.js
|   |   +-- users.js
|   +-- scripts/
|   +-- services/
|   +-- tests/
|   +-- utils/
|   +-- server.js
+-- content/
|   +-- lessons/
|   +-- year10-at2-revision/
+-- docs/
+-- public/
+-- src/
|   +-- components/
|   +-- config/
|   +-- contexts/
|   +-- lib/
|   +-- pages/
|   +-- services/
|   +-- test/
|   +-- App.jsx
|   +-- index.css
|   +-- main.jsx
+-- package.json
+-- vite.config.js
+-- tailwind.config.js
+-- postcss.config.js
+-- eslint.config.js
+-- vercel.json
```

## Getting Started

### Prerequisites

- Node.js 18 or newer
- npm
- Optional: PostgreSQL if you want to use the same database engine as production
- Optional: AWS S3 credentials for uploads
- Optional: OpenAI API key for AI lesson/revision features
- Optional: Google OAuth client ID for Google sign-in

### Clone

```bash
git clone https://github.com/raei-2748/caplet.git
cd caplet
```

### Install Dependencies

Install root dependencies:

```bash
npm install
```

Install backend dependencies:

```bash
cd backend
npm install
cd ..
```

### Configure Environment

Create frontend environment file:

```bash
cp .env.example .env
```

Create backend environment file:

```bash
cp backend/.env.example backend/.env
```

For local development, the smallest useful backend `.env` is:

```env
PORT=5002
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
JWT_SECRET=dev-secret-change-me
```

If `DATABASE_URL` is not set, the backend uses SQLite at `backend/caplet.db`.

For PostgreSQL development or production, set:

```env
DATABASE_URL=postgres://username:password@host:5432/database
```

For production, also set:

```env
JWT_SECRET=long-random-secret
ADMIN_BOOTSTRAP_TOKEN=long-random-bootstrap-token
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
OPENAI_API_KEY=sk-...
AWS_REGION=ap-southeast-2
AWS_S3_BUCKET=your-bucket
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
```

Frontend `.env` variables:

```env
VITE_API_BASE_URL=http://localhost:5002/api
VITE_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
VITE_GOOGLE_MAPS_KEY=
VITE_DESMOS_API_KEY=dcb31709b452b1cf9dc26972add0fda6
```

`VITE_API_BASE_URL` must include the `/api` suffix. If it is omitted in development, `src/services/api.js` defaults to `http://localhost:5002/api`, then falls back to `http://localhost:5000/api` and the production Railway API for network errors.

### Run the App

Run frontend and backend together from the project root:

```bash
npm run dev
```

This starts:

- frontend: `http://localhost:5173`
- backend: `http://localhost:5002`

Run only the frontend:

```bash
npm run client
```

Run only the backend:

```bash
npm run server
```

Backend health checks:

```bash
curl http://localhost:5002/health
curl http://localhost:5002/health/db
```

## Scripts

Root scripts:

| Command | Purpose |
|---|---|
| `npm run dev` | Run backend and frontend together with `concurrently`. |
| `npm run client` | Run the Vite dev server. |
| `npm run server` | Run `backend/npm run dev`. |
| `npm run build` | Build the frontend into `dist/`. |
| `npm run preview` | Preview the production frontend build. |
| `npm run lint` | Run ESLint over the repo. |
| `npm run test` | Run frontend Vitest tests. |
| `npm run test:watch` | Run frontend tests in watch mode. |

Backend scripts:

| Command | Purpose |
|---|---|
| `cd backend && npm run dev` | Run Express through nodemon. |
| `cd backend && npm start` | Run Express with Node. |
| `cd backend && npm test` | Run backend Jest tests. |
| `cd backend && npm run build` | Placeholder script; no backend build step is required. |

Content and maintenance scripts live in `backend/scripts/`. Notable scripts include:

- `seed-production.js`
- `setup-budgeting-101.js`
- `setup-corporate-finance-part1.js`
- `setup-year10-at2-revision.js`
- `import-lesson.js`
- `create-editor-workspace.js`
- `publish-slide-types-demo.js`
- `update-lesson-image-urls.js`
- `seed-classes.js`

Example lesson import:

```bash
cd backend
node scripts/import-lesson.js ../content/lessons/example-lesson.json
```

## API Overview

The API server mounts these route groups in `backend/server.js`:

| Prefix | File | Purpose |
|---|---|---|
| `/api/auth` | `backend/routes/auth.js` | Register, login, Google login, current user, logout. |
| `/api/courses` | `backend/routes/courses.js` | Published course/module/lesson reads. |
| `/api/users` | `backend/routes/users.js` | User profile and public profile operations. |
| `/api/progress` | `backend/routes/progress.js` | Lesson and course progress. |
| `/api/admin` | `backend/routes/admin.js` | Bootstrap, promotion, admin course operations, progress reset. |
| `/api/survey` | `backend/routes/survey.js` | Survey submission and stats. |
| `/api/metrics` | `backend/routes/metrics.js` | Admin metrics. |
| `/api/classes` | `backend/routes/classes.js` | Classrooms, memberships, announcements, assignments, comments. |
| `/api/uploads` | `backend/routes/uploads.js` | S3 presigned uploads for avatars, class assets, lesson images, and course covers. |
| `/api/editor` | `backend/routes/editor.js` | Code-gated editor workspace API. |
| `/api/ai` | `backend/routes/ai.js` | AI lesson generation. |
| `/api/chat` | `backend/routes/chat.js` | Chat message persistence. |
| `/api/saved-slides` | `backend/routes/savedSlides.js` | Saved slide revision, AI categorization, AI summarization. |
| `/api/proxy-image` | `backend/routes/proxy.js` | Image proxy for hosts that may block hotlinking. |

The API root also exposes:

| Path | Purpose |
|---|---|
| `/` | Basic API server metadata. |
| `/health` | Application health check. |
| `/health/db` | Database query and migration health check. |

## Database

Database setup is handled in `backend/config/database.js`.

- If `DATABASE_URL` is set, Sequelize uses PostgreSQL.
- If `DATABASE_URL` is omitted, Sequelize uses SQLite at `backend/caplet.db`.
- `backend/server.js` runs `runMigrations()` on startup.
- `backend/models/index.js` calls `sequelize.sync({ force: false })` only as a safe fallback. Schema changes should be made through migration files, not through destructive sync behavior.

Current migrations:

```text
001-initial-schema.js
002-chat-messages.js
002-user-onboarded.js
003-editor-workspaces.js
004-drop-financial-tables.js
005-slides-to-jsonb.js
006-saved-slides.js
007-saved-slide-category.js
```

The server also runs `seed-production.js` on startup when `NODE_ENV=production`.

## Uploads

Uploads are implemented through S3 presigned POSTs:

- Service: `backend/services/s3Presign.js`
- Route: `POST /api/uploads/presign`
- Frontend helper: `api.presignUpload()` and `api.postToPresignedUrl()`

Supported upload purposes:

- `avatar`
- `classLogo`
- `classBanner`
- `lessonImage`
- `courseCover`

Supported MIME types:

- `image/jpeg`
- `image/png`
- `image/webp`
- `image/gif`

Uploads require either a regular user JWT or an editor JWT. Lesson image and course cover uploads are restricted to admins/instructors or matching editor workspaces.

See `docs/aws-s3-setup.md` for S3 setup.

## Testing

Frontend tests use Vitest and React Testing Library:

```bash
npm run test
```

Current frontend tests live in `src/test/`, including calculator tests.

Backend tests use Jest and Supertest:

```bash
cd backend
npm test
```

Current backend tests live in `backend/tests/`, including auth and slide schema tests.

Linting:

```bash
npm run lint
```

## Financial Twin Engine

A live, consent-driven simulation of a student's financial trajectory, built on top of the debt engine. It ingests bank/BNPL/super transaction data through a Consumer Data Right (CDR) adapter, categorizes it deterministically, and projects HELP balance, super, and savings forward 10–20+ years as a seeded Monte Carlo **range of scenarios** (percentile bands, never a single number, never advice).

### Mocked vs real CDR modes

Caplet is **not yet an accredited CDR data recipient**, so the engine runs entirely against a mocked provider that mimics the real CDR flow (consent handshake → token exchange → paginated, enveloped data calls → revocation):

- `CDR_MODE=mock` (default) — synthetic personas in `backend/services/cdr/fixtures/personas.js`, including deliberately messy cases: irregular BNPL instalments, misclassifiable merchants, partial data, consent revoked mid-sync.
- `CDR_MODE=real` — **refused at boot** unless `CDR_ACCREDITED=true`. Any real credential env var (`CDR_CLIENT_ID`, `CDR_CLIENT_SECRET`, `CDR_PRIVATE_KEY_PATH`) present without that flag also refuses boot (`assertCdrBootSafety` in `backend/services/cdr/index.js`), so mocked and real modes can never be confused. The real client drops in behind `getCdrProvider()` with no downstream changes.

### Architecture

| Piece | Where | Notes |
|---|---|---|
| CDR adapter boundary | `backend/services/cdr/` | Provider factory, error classes, payload validation, string-decimal → whole-dollar normalization |
| Categorizer | `backend/services/twinCategorizer.js` | Deterministic rules; ambiguous input fails safe to `uncertain`; HECS requires an explicit ATO+HELP signal and is never consumer debt |
| Assumptions | `backend/services/twinAssumptions.js` | Every economic figure carries an effective date + source, echoed in API responses |
| Projection | `backend/services/twinProjection.js` | Seeded (mulberry32) Monte Carlo; reuses `debtEngine.hecsYearStep` so HECS math has one home; seed echoed for reproducibility |
| API | `backend/routes/financialTwin.js` | `/api/financial-twin/{connect,connection,connection/revoke,categorized,projection}` (auth required) |
| Storage | `cdr_connections`, `cdr_transactions` (migration 016) | Minimized snapshot only; revoking consent hard-deletes all stored transactions |
| UI | `src/pages/tools/FinancialTwin.jsx` (`/tools/financial-twin`) | Fan chart of percentile bands, uncertain-transaction review list, assumptions provenance table |

### Data protection

Ingested transactions are stored minimally (no merchant names, no provider brands, no account numbers), are hard-deleted on consent revocation, and are never written to logs — `backend/services/twinLog.js` logs identifiers and counts only and throws if passed financial fields.

### Running its tests

```bash
cd backend
npx jest tests/cdrProvider.test.js tests/twinCategorizer.test.js tests/twinProjection.test.js tests/twinCompliance.test.js tests/financialTwin.test.js
npm test        # or simply the whole suite
```

The suite includes adversarial categorization cases, a zero-volatility parity gate (the Monte Carlo engine must reproduce `calculateHecsProjection` exactly), seeded-reproducibility checks, and compliance-language tests asserting no output ever reads as personal advice or names a real provider. Frontend: `npx vitest run src/test/financialTwin.test.jsx`.

## Deployment

### Frontend

The frontend is configured for Vercel:

- Build command: `npm run build`
- Output directory: `dist`
- Rewrites are defined in `vercel.json` so client-side routes return `index.html`.

Production API default in `src/services/api.js`:

```text
https://caplet-production.up.railway.app/api
```

Set `VITE_API_BASE_URL` in Vercel if that backend URL changes.

### Backend

The backend is configured for Railway:

- Entry point: `backend/server.js`
- Start command: `npm start`
- Production database: PostgreSQL through `DATABASE_URL`
- Production frontend origins allowed by CORS include `caplet.org`, `www.caplet.org`, `capletedu.org`, `www.capletedu.org` (both domains are live permanently, not just during a migration window), `caplet.vercel.app`, local development origins, and matching Vercel preview domains.

Required production variables:

```env
DATABASE_URL=
JWT_SECRET=
ADMIN_BOOTSTRAP_TOKEN=
FRONTEND_URL=https://caplet.org
NODE_ENV=production
```

Optional production variables:

```env
GOOGLE_CLIENT_ID=
OPENAI_API_KEY=
AWS_REGION=
AWS_S3_BUCKET=
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
S3_PUBLIC_BASE_URL=
```

## Development Notes

- Root `package.json` uses ESM with `"type": "module"`.
- Backend `package.json` uses CommonJS with `"type": "commonjs"`.
- All frontend API calls should go through `src/services/api.js`.
- All frontend routes are centralized in `src/App.jsx`.
- Shared React state currently uses Context providers: `AuthContext`, `CoursesContext`, and `ThemeContext`.
- Schema changes should be added as migrations in `backend/migrations/`.
- Slide validation lives in the backend; frontend normalization is for rendering compatibility.
- Do not rely on role values sent during registration. The backend always creates self-service users as `student`.
- There is no `LICENSE` file in this repository at the time of writing.

## Further Documentation

- `docs/architecture.md`
- `docs/database.md`
- `docs/deployment.md`
- `docs/content-pipeline.md`
- `docs/aws-s3-setup.md`
- `docs/roadmap.md`
- `content/LESSON_FORMAT.md`

Some older docs may still mention removed financial planning tables or Sequelize `alter` sync. The current codebase uses migrations and has removed the older financial tables via `004-drop-financial-tables.js`.

## Contact

contact@caplet.org

Caplet — build anything, for anyone.
