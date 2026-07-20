# Deployment Guide - Render.com (Free)

**Time**: ~30 minutes  
**Cost**: Free tier (with free PostgreSQL trial)  
**No credit card required** (but has usage limits)

---

## Prerequisites

- GitHub account with access to [salary-management](https://github.com/neha-saggam/salary-management) repo
- Render.com account (free signup)
- 15 minutes of your time

---

## Step-by-Step Deployment

### Step 1: Create Render.com Account

1. Go to [render.com](https://render.com)
2. Click "Sign up" (use GitHub for faster signup)
3. Authorize GitHub access
4. Complete account setup

**Time**: 2 minutes

---

### Step 2: Create PostgreSQL Database

1. In Render dashboard, click **"New +"** → **"PostgreSQL"**

2. Configure:
   - **Name**: `salary-mgmt-db`
   - **Database**: `acme_salary_db`
   - **User**: `postgres`
   - **Region**: (choose closest to you)
   - **Plan**: Free (included in trial)
   - **PostgreSQL Version**: 15

3. Click **"Create Database"**

4. Wait 2-3 minutes for database to provision

5. **Copy the connection string** (you'll need it later):
   ```
   postgresql://user:password@host:5432/database
   ```

**Time**: 5 minutes

---

### Step 3: Create Web Service (Backend)

1. In Render dashboard, click **"New +"** → **"Web Service"**

2. **Connect GitHub Repository**:
   - Click "Connect a repository"
   - Select `salary-management` repo
   - Click "Connect"

3. **Configure Web Service**:
   - **Name**: `salary-mgmt-api`
   - **Environment**: Node
   - **Build Command**: 
     ```bash
     yarn install && yarn workspace backend build
     ```
   - **Start Command**: 
     ```bash
     yarn workspace backend start
     ```
   - **Plan**: Free

4. **Environment Variables** (Add these):
   ```
   DATABASE_URL = postgresql://...  (paste the full URL from Step 2)
   JWT_SECRET = your-secret-key-min-32-characters
   NODE_ENV = production
   LOG_LEVEL = warn
   LOG_FORMAT = json
   PORT = 3000
   ```
   
   **⚠️ For JWT_SECRET, generate a random 32+ character string**:
   ```bash
   # Run this locally to generate:
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

5. Click **"Create Web Service"**

6. Render will start building automatically (watch the deploy log)

**Status**: Deploying (visible in dashboard)  
**Time**: 10 minutes (includes first deployment)

---

### Step 4: Deploy Frontend (Optional but Recommended)

For a complete demo, deploy the frontend too:

1. In Render dashboard, click **"New +"** → **"Static Site"**

2. **Connect Repository**:
   - Select same `salary-management` repo

3. **Configure**:
   - **Name**: `salary-mgmt-ui`
   - **Build Command**: 
     ```bash
     yarn install && yarn workspace frontend build
     ```
   - **Publish Directory**: `frontend/dist`
   - **Environment Variables**:
     ```
     VITE_API_URL = https://salary-mgmt-api.onrender.com
     ```
     (Replace with your actual backend URL from Step 3)

4. Click **"Create Static Site"**

**Time**: 5 minutes (includes deployment)

---

### Step 5: Verify Deployment

**Backend**:
1. Go to Render dashboard → `salary-mgmt-api`
2. Look for the URL (something like `https://salary-mgmt-api.onrender.com`)
3. Test with curl:
   ```bash
   curl https://salary-mgmt-api.onrender.com/health
   ```
   
   Should return:
   ```json
   {
     "status": "ok",
     "timestamp": "2026-07-20T...",
     "uptime": 123.456
   }
   ```

**Frontend**:
1. Go to Render dashboard → `salary-mgmt-ui`
2. Click the URL (something like `https://salary-mgmt-ui.onrender.com`)
3. Should load React app
4. Try login with: `admin@acme.com` / `password123`

**Time**: 2 minutes

---

## After Deployment

### Configure Auto-Deploy

Your deployment is **already auto-enabled**! Every push to `main` branch will trigger a new deployment.

To trigger manually:
1. Render dashboard → Select service
2. Click "Manual Deploy" → "Deploy latest commit"

### Monitor Logs

1. Select service in Render dashboard
2. Click **"Logs"** tab
3. Watch real-time logs as requests come in

### Check Database

1. Connect to your PostgreSQL instance:
   ```bash
   psql postgresql://user:password@host:5432/acme_salary_db
   ```

2. Verify data:
   ```sql
   SELECT COUNT(*) FROM "Employee";  -- Should see ~10,000
   SELECT COUNT(*) FROM "User";       -- Should see 2 (admin, hr)
   ```

### Performance Monitoring

Your backend logs are already in JSON format (ready for Datadog/Sentry):
- ✅ Request logging enabled
- ✅ Error tracking enabled
- ✅ Auth events logged
- ✅ See [docs/MONITORING.md](docs/MONITORING.md) for integration guides

---

## Troubleshooting

### Database Connection Error
**Error**: `Error: Can't reach database server`

**Solution**:
1. Check `DATABASE_URL` environment variable is correct
2. Verify database is in same region (or different region shouldn't matter)
3. In Render dashboard → PostgreSQL → check status is "Available"

### Build Fails
**Error**: `yarn: command not found`

**Solution**:
1. Add to **Build Command**:
   ```bash
   npm install -g yarn && yarn install && yarn workspace backend build
   ```

### Port Already in Use
**Error**: `Port 3000 already in use`

**Solution**: Render automatically assigns correct port. Check:
- No hardcoded port in code
- Using `process.env.PORT` or default to 3000

### Empty Database
**Error**: No employees showing in UI

**Solution**:
- Migrations might not have run
- Render dashboard → Web Service → "Shell" tab
- Run:
  ```bash
  yarn workspace backend prisma migrate deploy
  yarn workspace backend prisma db seed
  ```

---

## Free Tier Limits

| Resource | Free Tier |
|----------|-----------|
| **Web Service** | 750 hours/month (30 days × 24 hours) |
| **PostgreSQL** | 90 days free trial, then $7/month |
| **Static Site** | Unlimited (frontend) |
| **Bandwidth** | 100 GB/month |
| **Memory** | 512 MB |
| **Data** | 256 MB database |

**Note**: After free PostgreSQL trial, you can either:
- Upgrade to paid PostgreSQL ($7/month)
- Switch to Railway.app or Fly.io (both have free tiers)
- Use local development with Docker

---

## URLs After Deployment

Once deployed, you'll have:

| Component | URL | Status |
|-----------|-----|--------|
| **Backend API** | `https://salary-mgmt-api.onrender.com` | ✅ Live |
| **Frontend** | `https://salary-mgmt-ui.onrender.com` | ✅ Live |
| **Health Check** | `/health` endpoint | ✅ Ready |
| **API Docs** | See [ARCHITECTURE.md](ARCHITECTURE.md) for endpoint list | 📖 |

---

## Next Steps

1. **Verify deployment works** ✅ (links above)
2. **Record video demo** - Show login, employee list, analytics
3. **Share deployment link** with Incubyte
4. **Update README** with live demo link

---

## Pricing After Free Trial

| Service | Cost | Alternative |
|---------|------|-------------|
| **Backend Web** | Free (750h/month) | ✅ |
| **PostgreSQL** | $7/month | Railway.app ($5+), Fly.io (free) |
| **Frontend Static** | Free | ✅ |
| **Total** | ~$7/month | Competitive vs AWS/GCP |

---

## Support

- **Render Docs**: https://render.com/docs
- **GitHub Issues**: https://github.com/neha-saggam/salary-management/issues
- **Incubyte Contact**: titiksha@incubyte.co

---

## Summary Checklist

- [ ] Create Render account
- [ ] Create PostgreSQL database (copy connection string)
- [ ] Create Web Service for backend
- [ ] Add environment variables
- [ ] Deploy backend (auto-deploys from GitHub)
- [ ] Create Static Site for frontend
- [ ] Test health check endpoint
- [ ] Test login (admin@acme.com / password123)
- [ ] Share live URLs with Incubyte
- [ ] Record video demo

**Estimated Total Time**: 30 minutes ⏱️

---

**Last Updated**: 2026-07-20  
**Status**: Ready for production  
**Next**: Record video demo & submit to Incubyte
