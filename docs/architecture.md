# Architecture

> Caplet is a monorepo with a React frontend (root) and a Node.js/Express backend (`backend/`).

---

## Table of Contents

1. [Frontend](#frontend)
2. [Backend](#backend)
3. [Key Patterns](#key-patterns)
4. [Codebase Structure](#codebase-structure)
5. [Key Files Reference](#key-files-reference)

---

## Frontend

**Stack:** React 19 + Vite 7 + Tailwind CSS v3.4

| Technology | Version | Purpose |
|---|---|---|
| React | 19 | Modern UI with latest features |
| Vite | 7 | Fast build tool and HMR dev server |
| Tailwind CSS | 3.4 | Utility-first CSS (configured via `postcss.config.js` and `tailwind.config.js`) |
| React Router | 7 | Client-side routing — all routes defined in `src/App.jsx` |
| React Markdown | — | Rendering lesson/course content |
| Recharts | — | Data visualization |

**Key frontend conventions:**
- **Routing**: All routes defined in one file — `src/App.jsx`
- **State**: React Context only — `AuthContext`, `CoursesContext`, `ThemeContext`. No Redux/Zustand.
- **API layer**: Singleton `ApiService` class in `src/services/api.js`. All backend calls go through this. Short-lived access tokens stay in memory; refresh sessions use an HttpOnly backend cookie.
- **Styling**: Tailwind CSS with `class`-based dark mode. No custom theme extensions in `tailwind.config.js`.
- **Pages**: `src/pages/` contains route-level components. Calculator tools live in `src/pages/tools/`.
- **Module system**: ESM (`"type": "module"` in root `package.json`)

---

## Backend

**Stack:** Node.js + Express 5 + Sequelize + PostgreSQL in production, with SQLite for local development

| Technology | Purpose |
|---|---|
| Node.js + Express 5 | RESTful API server |
| PostgreSQL | Production database via Railway |
| SQLite | Local fallback when `DATABASE_URL` is not configured |
| Sequelize ORM + Umzug | ORM models plus explicit, reversible migrations |
| OpenAI API | Two-stage lesson generation and learning-assistance services (educational tools, not official advice or marking) |
| JWT | Authentication |
| bcryptjs | Password hashing (12 rounds) |
| express-validator | Input validation |
| Helmet | Security headers |

**Key backend conventions:**
- **Entry point**: `backend/server.js` — sets up middleware, mounts route files, runs Umzug migrations, then starts background readiness/retention jobs
- **Models**: `backend/models/` with associations in `backend/models/index.js`. Key hierarchy: `Course → Module → Lesson`. Classroom system: `Classroom → ClassMembership`, `Assignment → AssignmentSubmission`, `ClassAnnouncement → Comment`
- **Routes**: `backend/routes/` — auth, courses, users, progress, admin, survey, classes
- **Auth**: Short-lived JWT access tokens plus an HttpOnly refresh cookie; bcryptjs password hashing. Verification middleware lives in `backend/middleware/auth.js`
- **DB config**: `backend/config/database.js` — PostgreSQL when `DATABASE_URL` is set, SQLite otherwise
- **Module system**: CommonJS (`"type": "commonjs"` in `backend/package.json`)

**API Base URL:**
The frontend `ApiService` has a hardcoded production API URL (`caplet-production.up.railway.app`). For local development, the backend runs on port `5002` and the frontend Vite dev server on `5173`.

---

## Key Patterns

### Course Auto-Enrollment
No explicit enroll action — accessing a course auto-creates a `UserProgress` record for the user.

### Lesson Content Format
Lesson content uses a **slides-based format** (types: `text` / `video` / `image` / `question`) stored as JSON in the DB. See [content-pipeline.md](./content-pipeline.md) for the full format spec.

### Database Migrations
Schema changes are explicit Umzug migrations in `backend/migrations/`. They run on server startup and are rehearsed with `npm run migrations:check`. Existing legacy filename collisions are preserved because renaming an applied Umzug migration would make it appear new in production; new collisions are rejected by the migration naming check.

### ESLint Config
The flat config (`eslint.config.js`) has separate rule sets for `src/**` (browser/React) and `backend/**` (Node.js). Unused vars prefixed with uppercase or underscore are allowed: `varsIgnorePattern: '^[A-Z_]'`.

### AI Services
AI features use route-specific services and shared quotas/rate limits. Lesson generation is a planner/formatter pipeline; tutor, essay, saved-slide, and economics-marker features each have their own service and safety framing. Provider failures are logged with request IDs and returned as generic retryable errors.

---

## Codebase Structure

```
caplet/
├── backend/
│   ├── config/
│   │   └── database.js          # Sequelize + PostgreSQL config
│   ├── models/                  # Sequelize models
│   │   ├── index.js             # Model associations
│   │   ├── User.js
│   │   ├── Course.js
│   │   ├── Module.js
│   │   ├── Lesson.js
│   │   ├── UserProgress.js
│   │   ├── FinancialState.js
│   │   ├── CheckIn.js
│   │   ├── FinancialPlan.js
│   │   ├── Summary.js
│   │   ├── Classroom.js
│   │   ├── ClassMembership.js
│   │   ├── Assignment.js
│   │   ├── AssignmentSubmission.js
│   │   └── ClassAnnouncement.js
│   ├── routes/
│   │   ├── auth.js              # Authentication + JWT middleware
│   │   ├── courses.js           # Course/module/lesson endpoints
│   │   ├── users.js
│   │   ├── progress.js          # Progress tracking
│   │   ├── financial.js         # AI financial advisor endpoints
│   │   ├── admin.js
│   │   ├── survey.js
│   │   └── classes.js           # Classroom system
│   ├── services/
│   │   └── aiService.js         # OpenAI integration + unified prompt
│   ├── middleware/
│   │   └── auth.js              # JWT verification middleware
│   ├── scripts/                 # Course seeding scripts
│   │   ├── setup-budgeting-101.js
│   │   ├── add-investment-course.js
│   │   ├── add-quantitative-finance-course.js
│   │   ├── import-lesson.js     # Generic lesson importer
│   │   └── ...
│   ├── server.js                # Express app entry point
│   └── package.json             # CommonJS
├── src/
│   ├── components/
│   │   ├── Navbar.jsx
│   │   ├── Footer.jsx
│   │   └── financial/
│   │       ├── FinancialSnapshot.jsx
│   │       └── FinancialPlan.jsx
│   ├── contexts/
│   │   ├── AuthContext.jsx
│   │   ├── CoursesContext.jsx
│   │   └── ThemeContext.jsx
│   ├── pages/
│   │   ├── Home.jsx
│   │   ├── About.jsx
│   │   ├── Mission.jsx
│   │   ├── FAQ.jsx
│   │   ├── Contact.jsx
│   │   ├── Terms.jsx
│   │   ├── Courses.jsx
│   │   ├── CourseDetail.jsx
│   │   ├── LessonPlayer.jsx
│   │   ├── Dashboard.jsx        # AI chatbot interface
│   │   ├── Tools.jsx
│   │   └── tools/               # 10 financial calculator tools
│   ├── services/
│   │   └── api.js               # Centralized API calls (ApiService singleton)
│   ├── App.jsx                  # All routes defined here
│   └── main.jsx                 # Entry point
├── content/
│   └── lessons/                 # Lesson JSON files for import
├── public/                      # Static assets (robots.txt, sitemap.xml, etc.)
├── docs/                        # Project documentation (this folder)
├── package.json                 # ESM
├── tailwind.config.js
├── postcss.config.js
├── eslint.config.js
└── vite.config.js
```

---

## Key Files Reference

| File | Purpose |
|---|---|
| `backend/services/aiService.js` | Core AI logic — unified prompt system, model fallback |
| `backend/routes/financial.js` | Financial literacy assistant API endpoints, data extraction logic |
| `backend/models/index.js` | All model associations |
| `src/pages/Dashboard.jsx` | Chat-first UI, message management, financial snapshot |
| `src/services/api.js` | All frontend API calls (single source of truth) |
| `src/App.jsx` | All client-side routes |
| `backend/server.js` | Express app setup, middleware, DB sync |
