# Caplet Documentation

> **Live Site:** [capletedu.org](https://capletedu.org) · **Repo:** [github.com/raei-2748/caplet](https://github.com/raei-2748/caplet) · **Status:** Active development, pre-monetization

Caplet is a financial education platform for Australians — bridging the financial literacy gap through free courses, financial calculators, and an AI-powered financial advisor.

---

## Documentation Index

| Document | Description |
|---|---|
| [../CAPLET.md](../CAPLET.md) | **Core project description** — overview, architecture, commands, deployment |
| [architecture.md](./architecture.md) | Frontend & backend stack, key patterns, full codebase structure |
| [database.md](./database.md) | Full database schema — all Sequelize models and relationships |
| [deployment.md](./deployment.md) | Dev commands, environment variables, Railway + Vercel deployment |
| [content-pipeline.md](./content-pipeline.md) | Lesson JSON format, import workflow, course seeding scripts |
| [roadmap.md](./roadmap.md) | Recent developments, future plans, monetization strategy, challenges |

---

## Platform Overview

Caplet has three core pillars:

### 1. Courses
Free educational content covering Australian financial topics — budgeting, investment, superannuation, quantitative finance, and more.
- Auto-enrollment (no friction)
- Slide-based lessons with video support
- Interactive quizzes with progress tracking

### 2. Tools
10 free, SEO-optimized financial calculators tailored to the Australian context.
- Tax Calculator, Budget Planner, Savings Goal, Loan Repayment, Compound Interest, Mortgage, Super Contribution, GST, Salary, Emergency Fund

### 3. AI Financial Advisor
A chat-first dashboard powered by GPT-4o.
- Automatically extracts income, expenses, debts, and goals from natural conversation
- Generates personalized financial plans with exact calculations
- Session-only messages (privacy-first)
- Manual input override available

**Business model:** Courses and Tools are permanently free (traffic/SEO). The AI chatbot is the monetization target (not yet active).

---

## Quick Start

```bash
# Clone
git clone https://github.com/raei-2748/caplet.git && cd caplet

# Install frontend dependencies
npm install

# Run frontend dev server (localhost:5173)
npm run dev

# Run backend dev server (localhost:5002)
cd backend && npm run dev
```

See [deployment.md](./deployment.md) for full environment setup and production deployment.

---

## Tech Stack (Summary)

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite 6, Tailwind CSS 3.4, React Router 7 |
| Backend | Node.js, Express 5, Sequelize ORM |
| Database | PostgreSQL (Railway) |
| AI | OpenAI GPT-4o (with GPT-4-turbo / GPT-3.5-turbo fallback) |
| Frontend Deploy | Vercel |
| Backend Deploy | Railway |

---

## Contact

**contact@capletedu.org**

*Caplet — Think with Clarity. Spend with Confidence.*
