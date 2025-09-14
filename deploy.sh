#!/bin/bash

echo "🚀 Deploying Caplet to Railway..."

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI not found. Installing..."
    npm install -g @railway/cli
fi

# Deploy Backend
echo "📦 Deploying Backend..."
cd backend
railway login
railway init --name caplet-backend
railway up

# Add PostgreSQL database
echo "🗄️ Adding PostgreSQL database..."
railway add postgresql

# Set environment variables
echo "⚙️ Setting environment variables..."
railway variables set NODE_ENV=production
railway variables set JWT_SECRET=$(openssl rand -base64 32)
railway variables set FRONTEND_URL=https://caplet-frontend.railway.app

# Get backend URL
BACKEND_URL=$(railway domain)
echo "✅ Backend deployed at: $BACKEND_URL"

# Deploy Frontend
echo "📦 Deploying Frontend..."
cd ../frontend
railway init --name caplet-frontend
railway variables set VITE_API_URL=$BACKEND_URL
railway up

# Get frontend URL
FRONTEND_URL=$(railway domain)
echo "✅ Frontend deployed at: $FRONTEND_URL"

# Update backend with frontend URL
cd ../backend
railway variables set FRONTEND_URL=$FRONTEND_URL

echo "🎉 Deployment complete!"
echo "Frontend: $FRONTEND_URL"
echo "Backend: $BACKEND_URL"
echo "Health Check: $BACKEND_URL/health"
