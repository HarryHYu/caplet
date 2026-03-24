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

> **Note:** The backend requires `DATABASE_URL` in `backend/.env` pointing to a PostgreSQL instance. There is **no SQLite fallback** — PostgreSQL is mandatory.

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string (Railway) |
| `OPENAI_API_KEY` | OpenAI API key for the AI financial advisor |
| `JWT_SECRET` | Secret for JWT token signing — use a long, random string |
| `NODE_ENV` | `production` or `development` |
| `FRONTEND_URL` | Frontend URL for CORS (e.g. `https://capletedu.org`) |

### Frontend

| Variable | Description |
|---|---|
| `VITE_API_URL` | Backend API URL (e.g. `https://caplet-production.up.railway.app`) |

> The frontend `ApiService` (`src/services/api.js`) has a hardcoded production API URL. For local development, the backend runs on port `5002`.

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
   railway variables set FRONTEND_URL=https://capletedu.org
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

The frontend is live at **[capletedu.org](https://capletedu.org)**.

To configure a custom domain:
1. Add the domain in the Vercel dashboard
2. Update CORS settings in the backend (`FRONTEND_URL`)
3. Update the frontend API URL if needed

---

## Database

### Auto-Sync

The backend syncs the DB schema with `{ alter: true }` on every server start — **no separate migration files** are needed. Schema changes are applied automatically.

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
- [ ] Frontend deployed to Vercel
- [ ] `VITE_API_URL` set in Vercel environment variables
- [ ] CORS configured correctly (`FRONTEND_URL` matches actual frontend URL)
- [ ] Health check working: `https://your-backend.railway.app/health`
- [ ] Custom domain configured (capletedu.org)
- [ ] SSL certificates active
- [ ] Database seeded with course content

---

## Monitoring & Scaling

- Railway provides built-in monitoring and logs — check the Railway dashboard
- Railway auto-scales based on traffic
- Database can be upgraded for more capacity
- Consider a CDN for static assets
- Monitor costs in the Railway dashboard
