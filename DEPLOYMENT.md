# 🚀 Caplet Deployment Guide

## Railway Deployment

### Backend API Deployment

1. **Install Railway CLI**
   ```bash
   npm install -g @railway/cli
   ```

2. **Login to Railway**
   ```bash
   railway login
   ```

3. **Deploy Backend**
   ```bash
   cd backend
   railway init
   railway up
   ```

4. **Add PostgreSQL Database**
   - In Railway dashboard, add PostgreSQL service
   - Copy the DATABASE_URL from the PostgreSQL service
   - Set it as environment variable in your backend service

5. **Set Environment Variables**
   ```bash
   railway variables set NODE_ENV=production
   railway variables set JWT_SECRET=your-super-secure-jwt-secret
   railway variables set FRONTEND_URL=https://your-frontend-app.railway.app
   ```

### Frontend Deployment

1. **Build Frontend**
   ```bash
   npm run build
   ```

2. **Deploy to Railway**
   ```bash
   railway init
   railway up
   ```

3. **Set Environment Variables**
   ```bash
   railway variables set VITE_API_URL=https://your-backend-app.railway.app
   ```

### Environment Variables

#### Backend
- `NODE_ENV=production`
- `DATABASE_URL` (set by Railway PostgreSQL)
- `JWT_SECRET` (your secure secret)
- `FRONTEND_URL` (your frontend URL)

#### Frontend
- `VITE_API_URL` (your backend API URL)

### Database Migration

The backend will automatically:
- Create all database tables
- Seed with production data
- Handle migrations

### Health Checks

- Backend: `https://your-backend.railway.app/health`
- Frontend: `https://your-frontend.railway.app`

### Custom Domain (Optional)

1. Add custom domain in Railway dashboard
2. Update CORS settings in backend
3. Update frontend API URL

## Production Checklist

- [ ] Backend deployed to Railway
- [ ] PostgreSQL database connected
- [ ] Environment variables set
- [ ] Frontend deployed to Railway
- [ ] CORS configured correctly
- [ ] Health checks working
- [ ] Custom domain configured (optional)
- [ ] SSL certificates active
- [ ] Database seeded with content

## Monitoring

- Railway provides built-in monitoring
- Check logs in Railway dashboard
- Monitor database performance
- Set up alerts for downtime

## Scaling

- Railway auto-scales based on traffic
- Database can be upgraded for more capacity
- Consider CDN for static assets
- Monitor costs in Railway dashboard
