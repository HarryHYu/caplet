# Deployment Guide

Caplet uses **Vercel** for the frontend and **Railway** for the backend + PostgreSQL database.

---

## Table of Contents

1. [Development Commands](#development-commands)
2. [Environment Variables](#environment-variables)
3. [Backend Deployment (Railway)](#backend-deployment-railway)
4. [Frontend Deployment (Vercel)](#frontend-deployment-vercel)
5. [Database](#database)
6. [Production Checklist](#production-checklist)
7. [Monitoring & Scaling](#monitoring--scaling)

---

## Development Commands

### Frontend (from project root)

```bash
npm run dev       # Vite dev server → localhost:5173
npm run build     # Production build to dist/
npm run lint      # ESLint (flat config, separate rules for src/ and backend/)
npm run preview   # Preview production build
```

### Backend (from `backend/`)

```bash
npm run dev       # nodemon server.js → port 5002
npm start         # node server.js
```

> **Note:** Production requires `DATABASE_URL` and refuses to start without it. Local development and tests use SQLite when `DATABASE_URL` is omitted.

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string (Railway) |
| `OPENAI_API_KEY` | OpenAI API key for the AI financial advisor |
| `JWT_SECRET` | Secret for JWT token signing — use a long, random string |
| `NODE_ENV` | `production` or `development` |
| `FRONTEND_URL` | Frontend URL for CORS (e.g. `https://caplet.org`) |
| `TRUST_PROXY_HOPS` | Trusted reverse-proxy hop count (normally `1` on Railway) |
| `RATE_LIMIT_KEY_SALT` | Long random salt used to pseudonymise limiter and request-log identities |
| `OPS_SERVICE_TOKEN` | Runtime machine credential used only to accept backup verification evidence |
| `OPS_ALERT_WEBHOOK_URL` | Optional HTTPS endpoint for durable, PII-free readiness and backup alerts |
| `AI_ESTIMATED_COST_USD_PER_UNIT` / `AI_MONTHLY_BUDGET_USD` | Optional planning estimate and budget shown to administrators; not provider billing |
| `RESEND_API_KEY` / `GUARDIAN_CONSENT_FROM_EMAIL` | Production delivery of one-time guardian-consent links |

### Frontend

| Variable | Description |
|---|---|
| `VITE_API_BASE_URL` | Backend API base including `/api` (e.g. `https://caplet-production.up.railway.app/api`) |

The frontend has safe development and production defaults. Set `VITE_API_BASE_URL` explicitly for previews and alternate environments.

---

## Backend Deployment (Railway)

### Initial Setup

1. **Install Railway CLI**
   ```bash
   npm install -g @railway/cli
   ```

2. **Login**
   ```bash
   railway login
   ```

3. **Deploy backend**
   ```bash
   cd backend
   railway init
   railway up
   ```

4. **Add PostgreSQL**
   - In Railway dashboard → add a PostgreSQL service
   - Copy the `DATABASE_URL` from the PostgreSQL service
   - Set it as an environment variable in your backend service

5. **Set environment variables**
   ```bash
   railway variables set NODE_ENV=production
   railway variables set JWT_SECRET=your-super-secure-jwt-secret
   railway variables set FRONTEND_URL=https://caplet.org
   railway variables set OPENAI_API_KEY=sk-...
   ```

### Subsequent Deploys

Push to the `main` branch → Railway auto-deploys.

---

## Frontend Deployment (Vercel)

### Initial Setup

1. Connect the GitHub repository to Vercel
2. Set the root directory to `/` (project root)
3. Set the build command to `npm run build`
4. Set the output directory to `dist`
5. Add environment variables in the Vercel dashboard

### Subsequent Deploys

Push to the `main` branch → Vercel auto-deploys.

### Custom Domain

The frontend is live at **[caplet.org](https://caplet.org)** (migrated from `capletedu.org`).

To configure a custom domain:
1. Add the domain in the Vercel dashboard
2. Update CORS settings in the backend (`FRONTEND_URL`)
3. Update the frontend API URL if needed

---

## Database

### Migrations

Every schema change is an ordered Umzug migration in `backend/migrations/`. The backend applies pending migrations at startup and never uses Sequelize `sync({ alter: true })` in place of a migration.

Before deployment, CI rehearses every migration up and down on both in-memory SQLite and PostgreSQL 16. Locally:

```bash
cd backend
npm run migrations:check
MIGRATION_CHECK_DATABASE_URL=postgres://... npm run migrations:check
```

### Course Seeding

Courses are seeded via standalone scripts. Run them locally with `DATABASE_URL` set, or on Railway:

```bash
# From project root
cd backend && node scripts/setup-budgeting-101.js
cd backend && node scripts/add-investment-course.js
cd backend && node scripts/add-quantitative-finance-course.js

# Import a single lesson from JSON
cd backend && node scripts/import-lesson.js ../content/lessons/my-lesson.json
```

See [content-pipeline.md](./content-pipeline.md) for the lesson JSON format.

### Getting the Railway DATABASE_URL

1. Railway dashboard → your Postgres service → **Connect**
2. Copy the **Postgres connection URL**
3. Add to `backend/.env`:
   ```bash
   DATABASE_URL=postgres://user:password@host:port/railway
   ```

---

## Production Checklist

- [ ] Backend deployed to Railway
- [ ] PostgreSQL database connected and `DATABASE_URL` set
- [ ] `JWT_SECRET`, `OPENAI_API_KEY`, `FRONTEND_URL` set in Railway
- [ ] `RATE_LIMIT_KEY_SALT`, runtime `OPS_SERVICE_TOKEN`, operations-alert destination, guardian-email variables and upload S3 variables set
- [ ] GitHub backup secrets use the exact names in `.github/workflows/backup-restore-verification.yml`, including `CAPLET_OPS_SERVICE_TOKEN` with the same value as runtime `OPS_SERVICE_TOKEN`
- [ ] Frontend deployed to Vercel
- [ ] `VITE_API_BASE_URL` set in Vercel environment variables
- [ ] CORS configured correctly (`FRONTEND_URL` matches actual frontend URL)
- [ ] Readiness check working: `https://your-backend.railway.app/api/ops/ready`
- [ ] `/api/ops/admin/observability` shows request/AI signals and the alert delivery channel as configured
- [ ] Scheduled backup/restore workflow has a recent verified run
- [ ] SQLite and PostgreSQL migration rehearsals pass
- [ ] Frontend/backend tests, lint and production build pass
- [ ] AI marker evaluation passes with the production model configuration
- [ ] Custom domain configured (caplet.org)
- [ ] SSL certificates active
- [ ] Database seeded with course content

---

## Monitoring & Scaling

- Railway provides built-in monitoring and logs — check the Railway dashboard
- Scale beyond one backend replica only after moving rate-limit and AI-quota state to a shared Redis-compatible store
- Database can be upgraded for more capacity
- Consider a CDN for static assets
- Monitor costs in the Railway dashboard
