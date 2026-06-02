# Caplet

[![React](https://img.shields.io/badge/React-19.0-blue?logo=react)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-7.0-646CFF?logo=vite)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38B2AC?logo=tailwind-css)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

**Free Financial Education for Australians.**

Caplet (CapletEdu) is a free educational platform that bridges the financial literacy gap in Australia. It provides structured courses, financial calculators, and classroom tools designed for institutional integration—including Knox Grammar School Commerce Department and Capital Finance Club.

---

## Features

### 1. Courses
Australian-focused curriculum covering budgeting, tax, superannuation, investing, and business finance.
- **Auto-enrollment** — Click and start learning
- **Progress tracking** — Per-course and per-lesson completion
- **Slide-based lessons** — Text, video, images, math (KaTeX), and diagrams (Mermaid)
- **Module structure** — Courses → Modules → Lessons

### 2. Tools
Ten free financial calculators tailored for the Australian context:
- Tax, GST, Salary, Super Contribution
- Budget Planner, Savings Goal, Emergency Fund
- Loan Repayment, Mortgage, Compound Interest

### 3. Classes
Classroom management for teachers and students:
- Create classes, add students (by invite code)
- Post announcements, create assignments
- Track submissions and engagement

### 4. Lesson Editor
Author and publish slide-based lessons in the browser:
- Visual slide editor with reordering and live preview
- AI-assisted slide generation
- Import source material (including PDFs) to seed content

### 5. Revision
Reinforce learning with saved material:
- Bookmark slides while studying
- AI-generated summaries grouped by category
- Quick review slideshow

### 6. Survey & Metrics
- Anonymous financial literacy survey with a results dashboard
- Admin-only metrics dashboard for platform engagement

---

## Technical Stack

### Frontend
- **React 19** with Vite 7
- **Tailwind CSS** (utility-first, dark mode)
- **React Router 7** — Client-side routing
- **Recharts** — Survey and data visualization
- **React Markdown** + **remark-math** / **rehype-katex** — Lesson content & math rendering
- **Mermaid** — Diagram rendering
- **GSAP** — Animation
- **pdfjs-dist** — PDF parsing for content import
- **Google OAuth** (`@react-oauth/google`) — Social sign-in

### Backend
- **Node.js + Express 5** — REST API
- **PostgreSQL** (Railway) | SQLite (local dev)
- **Sequelize ORM** — Database models
- **JWT + bcryptjs** — Authentication

### Testing
- **Vitest** + **React Testing Library**

---

## Getting Started

### Prerequisites
- Node.js (v18+)
- npm / pnpm / yarn

### Quick Start

1. **Clone & enter**
   ```bash
   git clone https://github.com/HarryHYu/caplet.git
   cd caplet
   ```

2. **Install dependencies** (frontend + backend)
   ```bash
   npm install
   cd backend && npm install && cd ..
   ```

3. **Configure environment**
   ```bash
   cp .env.example .env
   # Set DATABASE_URL, JWT_SECRET, and other variables (see backend/README.md)
   ```

4. **Run frontend + backend together**
   ```bash
   npm run dev
   ```
   This uses `concurrently` to start both servers. To run them separately, use
   `npm run client` (frontend) and `npm run server` (backend).

Frontend: http://localhost:5173
Backend: http://localhost:5002

### Other Scripts
```bash
npm run build      # Production build
npm run preview    # Preview the production build
npm run lint       # Lint with ESLint
npm run test       # Run the test suite (Vitest)
npm run test:watch # Run tests in watch mode
```

---

## Architecture

```
caplet/
├── backend/          # Express API, Sequelize models, routes & migrations
├── src/              # React app
│   ├── components/   # Navbar, Footer, lesson & editor UI, etc.
│   ├── pages/        # Route components (incl. tools/)
│   ├── contexts/     # Auth, Courses, Theme
│   ├── services/     # API layer
│   ├── lib/          # Shared utilities (e.g. slide schema)
│   └── config/       # Client configuration
├── content/          # Lesson JSON files (import pipeline)
├── docs/             # Architecture, deployment & pipeline docs
└── public/           # Static assets
```

---

## Deployment

- **Frontend:** Vercel — capletedu.org
- **Backend:** Railway — PostgreSQL + Express API
- Push to `main` triggers auto-deploy for both.

See [`docs/deployment.md`](./docs/deployment.md) and [`docs/architecture.md`](./docs/architecture.md) for details.

---

## Contact

**contact@capletedu.org**

---

**Caplet** — *Think with clarity. Spend with confidence.*
