# Caplet Deployment Guide

## Current Setup

- **Frontend:** Vercel — capletedu.org
- **Backend:** Railway — PostgreSQL + Express API
- **Domain:** capletedu.org (custom domain on Vercel)

Push to `main` triggers auto-deploy for both.

---

## Backend (Railway)

1. **Add PostgreSQL** — Create PostgreSQL service in Railway, copy `DATABASE_URL`
2. **Environment variables:**
   - `DATABASE_URL` (from PostgreSQL service)
   - `JWT_SECRET`
   - `NODE_ENV=production`
   - `FRONTEND_URL=https://capletedu.org`
   - `PORT` (Railway sets this)
3. **Deploy** — Push to `main` or use Railway CLI: `railway up`

---

## Frontend (Vercel)

1. **Connect repo** — github.com/HarryHYu/caplet
2. **Build settings** — Vite default (root dir, `npm run build`)
3. **Env** — `VITE_API_URL` set in `vercel.json` to Railway backend URL
4. **Custom domain** — capletedu.org

---

## Environment Variables

### Backend
| Variable       | Description                |
|----------------|----------------------------|
| DATABASE_URL   | PostgreSQL connection      |
| JWT_SECRET     | Token signing secret       |
| NODE_ENV       | production / development   |
| FRONTEND_URL   | CORS allowed origin        |

### Frontend
| Variable       | Description                |
|----------------|----------------------------|
| VITE_API_URL   | Backend API base URL       |

---

## Production Checklist

- [ ] Backend on Railway
- [ ] PostgreSQL connected
- [ ] Frontend on Vercel
- [ ] Custom domain configured
- [ ] CORS and API URL correct
