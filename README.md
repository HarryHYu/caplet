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
- **Slide-based lessons** — Text, video, images, and quizzes
- **Module structure** — Courses → Modules → Lessons

### 2. Tools
Ten free financial calculators tailored for Australian context:
- Tax, GST, Salary, Super Contribution
- Budget Planner, Savings Goal, Emergency Fund
- Loan Repayment, Mortgage, Compound Interest

### 3. Classes
Classroom management for teachers and students:
- Create classes, add students (by invite code)
- Post announcements, create assignments
- Track submissions and engagement

### 4. Survey
Anonymous financial literacy survey with results dashboard.

---

## Technical Stack

### Frontend
- **React 19** with Vite 7
- **Tailwind CSS** (utility-first, dark mode)
- **React Router 7** — Client-side routing
- **Recharts** — Survey and data visualization
- **React Markdown** — Lesson content rendering

### Backend
- **Node.js + Express 5** — REST API
- **PostgreSQL** (Railway) | SQLite (local dev)
- **Sequelize ORM** — Database models
- **JWT + bcryptjs** — Authentication

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

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Backend setup** (see `backend/README.md`)
   ```bash
   cd backend
   npm install
   # Add .env with DATABASE_URL, JWT_SECRET, etc.
   npm run dev
   ```

4. **Run frontend**
   ```bash
   cd ..
   npm run dev
   ```

Frontend: http://localhost:5173  
Backend: http://localhost:5002

---

## Architecture

```
caplet/
├── backend/          # Express API, Sequelize models
├── src/              # React app
│   ├── components/   # Navbar, Footer, BackgroundTexture, etc.
│   ├── pages/        # Route components
│   ├── contexts/     # Auth, Courses, Theme
│   └── services/     # API layer
├── content/          # Lesson JSON files (import pipeline)
└── public/           # Static assets
```

---

## Deployment

- **Frontend:** Vercel — capletedu.org
- **Backend:** Railway — PostgreSQL + Express API
- Push to `main` triggers auto-deploy for both.

See `DEPLOYMENT.md` for details.

---

## Contact

**contact@capletedu.org**

---

**Caplet** — *Think with clarity. Spend with confidence.*
