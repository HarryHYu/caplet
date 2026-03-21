# CAPLET — Overview & Context

## What Is Caplet?

Caplet (CapletEdu) is a free financial education platform for Australians. It bridges the financial literacy gap with structured courses, calculators, and classroom tools. Currently integrated with Knox Grammar School Commerce Department and Capital Finance Club.

**Core components:**

1. **Courses** — Free educational content (modules → lessons with slides, video, quizzes)
2. **Tools** — Free financial calculators (SEO-friendly, Australian context)
3. **Classes** — Classroom management for teachers and students
4. **Survey** — Anonymous financial literacy survey with results

**Status:** Free educational platform; institutional partnerships in place.

---

## Technical Architecture

### Frontend
- **React 19** + Vite 7
- **Tailwind CSS v3.4** (postcss.config.js, tailwind.config.js)
- **React Router v7** — All routes in `src/App.jsx`
- **React Markdown** — Lesson content
- **Recharts** — Survey results
- **Dark mode** — `class`-based via ThemeContext

### Backend
- **Node.js + Express 5** — REST API
- **PostgreSQL** (Railway) | SQLite (local dev)
- **Sequelize ORM** — Models and migrations
- **JWT** — Auth
- **bcryptjs** — Passwords
- **express-validator** — Input validation
- **Helmet** — Security

### Deployment
- **Frontend:** Vercel (capletedu.org)
- **Backend:** Railway (PostgreSQL + Express)
- **Repo:** github.com/HarryHYu/caplet

---

## Current Features

### 1. Courses
- **Structure:** Course → Module → Lesson
- **Lessons:** Slides (text, video, image, question types)
- **Progress:** Auto-enrollment, per-lesson and per-course completion
- **Quizzes:** Multiple-choice, score stored in UserProgress
- **Content:** Import via `backend/scripts/import-lesson.js` (see `content/LESSON_FORMAT.md`)

### 2. Tools (10 calculators)
1. Tax Calculator  
2. Budget Planner  
3. Savings Goal  
4. Loan Repayment  
5. Compound Interest  
6. Mortgage  
7. Super Contribution  
8. GST  
9. Salary  
10. Emergency Fund  

All free; Australian context (GST, super, tax); mobile-responsive.

### 3. Classes
- Teachers create classes, generate invite codes
- Students join via code
- Announcements and comments
- Assignments linked to courses/lessons
- Submissions and grading
- Class management (teachers can add/remove, delete class)

### 4. Survey
- Anonymous financial literacy survey
- Results dashboard (age, spending, school-taught, confidence, etc.)
- Recharts visualizations

### 5. Auth & Settings
- JWT login/register
- Profile (Settings → Profile)
- Account (Settings → Account)
- User profile pages (public, role-based)
- Role switching (student ↔ instructor)

### 6. Static Pages
- **Home** — Hero, features, methodology, course preview, mission, FAQ
- **Contact** — contact@capletedu.org
- **Terms** — Disclaimer (educational only, not financial advice)
- **Login / Register** — Split layout with brand panel

---

## Codebase Structure

```
caplet/
├── backend/
│   ├── config/database.js
│   ├── models/          # User, Course, Module, Lesson, UserProgress, Classroom, etc.
│   ├── routes/          # auth, courses, progress, classes, users, survey, admin, proxy
│   ├── scripts/         # import-lesson.js, course setup scripts
│   └── server.js
├── src/
│   ├── components/      # Navbar, Footer, BackgroundTexture, etc.
│   ├── contexts/        # AuthContext, CoursesContext, ThemeContext
│   ├── pages/           # Home, Courses, Tools, Classes, etc.
│   ├── services/api.js  # ApiService
│   └── App.jsx
├── content/             # Lesson JSON files
├── public/              # Static assets (logo, light1.jpg, dark1.jpg)
└── package.json
```

---

## Key Patterns

- **Course auto-enrollment** — No explicit enroll; accessing a course creates UserProgress
- **Lesson format** — Slides array (text/video/image/question types) in JSON
- **API base URL** — `caplet-production.up.railway.app` in production; port 5002 locally
- **DB sync** — Sequelize `{ alter: true }` on server start

---

## Environment Variables

**Backend (.env):**
- `DATABASE_URL` — PostgreSQL (or SQLite for dev)
- `JWT_SECRET`
- `NODE_ENV`
- `FRONTEND_URL`
- `OPENAI_API_KEY` (optional; used by proxy for external APIs)

**Frontend:** API URL in `vercel.json` / env for Vite.

---

## Contact & Links

- **Site:** capletedu.org  
- **Contact:** contact@capletedu.org  
- **Repo:** github.com/HarryHYu/caplet  
