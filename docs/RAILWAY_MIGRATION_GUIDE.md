# Railway Migration Guide - Simple Setup

**Date**: 2025-12-03  
**Strategy**: Single environment (production only)  
**Rationale**: No users yet, fast deploys, instant rollbacks

---

## Why Single Environment Makes Sense Now

### Your Current Stage
- ✅ Pre-launch (no users)
- ✅ Using "production" as testing anyway
- ✅ Solo/small team
- ✅ Fast iteration needed

### Railway's Safety Net
- ✅ 2-4 minute deploys (fast enough to iterate)
- ✅ Instant rollbacks (one click)
- ✅ Deployment history (can redeploy any version)
- ✅ Health checks (auto-rollback on failure)

### Cost Savings
- **Single environment**: $10-15/month
- **With staging**: $23/month
- **Savings**: $8-13/month ($96-156/year)

**Decision**: Start simple, add staging when you get users.

---

## Migration Steps

### Step 1: Install Railway CLI (2 minutes)

```bash
# Install
npm install -g @railway/cli

# Login
railway login

# This opens browser for authentication
```

### Step 2: Create Railway Project (5 minutes)

```bash
# Navigate to your repo
cd ~/path/to/TERP

# Initialize Railway project
railway init

# Follow prompts:
# - Project name: TERP
# - Link to GitHub: Yes
# - Repository: EvanTenenbaum/TERP
# - Branch: main
```

### Step 3: Add MySQL Database (2 minutes)

```bash
# Add MySQL service
railway add

# Select: MySQL
# Railway automatically:
# - Provisions MySQL 8
# - Sets DATABASE_URL environment variable
# - Configures connection
# - Enables backups
```

### Step 4: Set Environment Variables (10 minutes)

```bash
# Set all your env vars
railway variables set NODE_ENV=production
railway variables set RATE_LIMIT_GET=1000
railway variables set ENABLE_RBAC=true
railway variables set ENABLE_QA_CRONS=true
railway variables set UPLOAD_DIR=/tmp/uploads

# Vite variables (for build)
railway variables set VITE_APP_TITLE=TERP
railway variables set VITE_APP_LOGO=/logo.png
railway variables set VITE_APP_ID=terp-app

# Clerk authentication
railway variables set VITE_CLERK_PUBLISHABLE_KEY=<your-clerk-key>
railway variables set CLERK_SECRET_KEY=<your-clerk-secret>

# Auth secrets
railway variables set JWT_SECRET=your-jwt-secret
railway variables set NEXTAUTH_SECRET=your-nextauth-secret
railway variables set NEXTAUTH_URL=https://your-app.up.railway.app

# Monitoring (optional)
railway variables set SENTRY_DSN=your-sentry-dsn
railway variables set CRON_SECRET=your-cron-secret
railway variables set PAPERTRAIL_ENDPOINT=logs.papertrailapp.com:12345

# DATABASE_URL is automatically set by Railway when you added MySQL
# No need to set it manually!
```

**Pro tip**: You can also set these in the Railway dashboard:
- Go to: https://railway.app/project/your-project
- Click "Variables" tab
- Add variables with nice UI

### Step 5: Configure Build Settings (Optional)

Railway auto-detects everything, but you can customize:

```bash
# Create railway.json (optional)
cat > railway.json << 'EOF'
{
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "pnpm install && pnpm build"
  },
  "deploy": {
    "startCommand": "pnpm start",
    "healthcheckPath": "/health/live",
    "healthcheckTimeout": 100,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 3
  }
}
EOF

git add railway.json
git commit -m "chore: add Railway configuration"
```

**But honestly, you probably don't need this.** Railway auto-detects:
- Node.js project
- pnpm package manager
- Build command from package.json
- Start command from package.json

### Step 6: Deploy! (3 minutes)

```bash
# Deploy to Railway
railway up

# Railway will:
# 1. Build your app (2-3 min)
# 2. Run health checks
# 3. Deploy to production
# 4. Give you a URL

# Watch deployment
railway logs --follow
```

### Step 7: Get Your URL

```bash
# Generate domain
railway domain

# This gives you: your-app.up.railway.app

# Or add custom domain later:
railway domain add terp.yourdomain.com
```

### Step 8: Migrate Database (15 minutes)

```bash
# 1. Export from DigitalOcean
mysqldump -h terp-mysql-db-do-user-28175253-0.m.db.ondigitalocean.com \
  -P 25060 \
  -u doadmin \
  -p \
  --ssl-mode=REQUIRED \
  defaultdb > terp_backup.sql

# 2. Get Railway database credentials
railway variables | grep DATABASE_URL

# 3. Import to Railway
# Railway provides DATABASE_URL in this format:
# mysql://user:pass@host:port/railway

# Extract connection details and import
mysql -h railway-host -P port -u user -p railway < terp_backup.sql

# Or use Railway's built-in database tools
railway connect mysql < terp_backup.sql
```

### Step 9: Test Everything (10 minutes)

```bash
# Open your Railway app
railway open

# Test:
# - Homepage loads
# - Login works (Clerk)
# - Database queries work
# - All features functional

# Check logs for errors
railway logs --tail 100
```

### Step 10: Update DNS (5 minutes)

```bash
# Add custom domain in Railway
railway domain add terp-app-b9s35.ondigitalocean.app

# Railway gives you CNAME record
# Update your DNS:
# CNAME: terp-app-b9s35.ondigitalocean.app → your-app.up.railway.app

# Or use Railway's provided domain for now
```

### Step 11: Decommission DigitalOcean (After Testing)

```bash
# Once you're confident Railway works:

# 1. Stop DigitalOcean app (don't delete yet)
doctl apps update 1fd40be5-b9af-4e71-ab1d-3af0864a7da4 --instance-count 0

# 2. Keep DO database as backup for 1 week

# 3. After 1 week of successful Railway operation:
# Delete DO app and database
doctl apps delete 1fd40be5-b9af-4e71-ab1d-3af0864a7da4
doctl databases delete terp-mysql-db
```

---

## Daily Workflow (After Migration)

### Making Changes

```bash
# 1. Make changes locally
# ... edit code ...

# 2. Commit and push
git add .
git commit -m "feat: new feature"
git push origin main

# 3. Railway auto-deploys (2-4 min)
# Watch: railway logs --follow

# 4. Test on production
# Open: railway open

# 5. If broken: rollback instantly
railway rollback
```

### Viewing Logs

```bash
# Recent logs
railway logs

# Follow logs (live)
railway logs --follow

# Last 100 lines
railway logs --tail 100

# Filter by service
railway logs --service web
```

### Managing Variables

```bash
# List all variables
railway variables

# Set a variable
railway variables set KEY=VALUE

# Delete a variable
railway variables delete KEY

# Or use dashboard (easier)
railway open
# Click "Variables" tab
```

### Rollback

```bash
# List deployments
railway deployments

# Rollback to previous
railway rollback

# Rollback to specific deployment
railway rollback --deployment <id>

# Or use dashboard (one click)
railway open
# Click "Deployments" → "Rollback" button
```

---

## AI Agent Workflow

Update your agent workflows to use Railway:

### Old (DigitalOcean)
```bash
git push origin main
# Wait 7-11 minutes
doctl apps get <app-id>
doctl apps logs <app-id>
```

### New (Railway)
```bash
git push origin main
# Wait 2-4 minutes
railway status
railway logs
```

### Agent Commands Reference

```bash
# Deploy
railway up

# Check status
railway status

# View logs
railway logs --tail 100

# Rollback
railway rollback

# List variables
railway variables

# Set variable
railway variables set KEY=VALUE

# Open dashboard
railway open
```

---

## When to Add Staging Environment

Add staging when you have:
- ✅ First paying customers
- ✅ Multiple people deploying
- ✅ Need to test before production
- ✅ Regulatory requirements

### How to Add Staging Later

```bash
# 1. Create staging environment
railway environment create staging

# 2. Create develop branch
git checkout -b develop
git push -u origin develop

# 3. Link staging to develop branch
railway link --environment staging --branch develop

# 4. Deploy to staging
git checkout develop
railway up --environment staging

# 5. Now you have:
# - develop → staging-terp.up.railway.app
# - main → terp.up.railway.app

# 6. Workflow becomes:
# develop → test on staging → merge to main → deploys to prod
```

---

## Cost Breakdown

### Single Environment (Now)
- **App**: ~$8/month (512MB RAM, 0.5 vCPU)
- **Database**: ~$5/month (1GB storage)
- **Total**: ~$13/month

### With Staging (Later)
- **Production app**: ~$8/month
- **Production DB**: ~$5/month
- **Staging app**: ~$5/month
- **Staging DB**: ~$3/month
- **Total**: ~$21/month

**Current savings vs DO**: $37/month ($444/year)

---

## Troubleshooting

### Build Fails

```bash
# Check build logs
railway logs --deployment <id>

# Common issues:
# - Missing env vars
# - TypeScript errors
# - Dependency issues

# Fix and redeploy
git commit -am "fix: resolve build issue"
git push origin main
```

### App Crashes

```bash
# Check runtime logs
railway logs --tail 200

# Common issues:
# - Database connection
# - Missing env vars
# - Port binding (Railway auto-sets PORT)

# Railway auto-restarts on crash
# Check restart count: railway status
```

### Database Connection Issues

```bash
# Verify DATABASE_URL is set
railway variables | grep DATABASE_URL

# Test connection
railway connect mysql

# Check database logs
railway logs --service mysql
```

### Slow Deploys

```bash
# Railway should be 2-4 minutes
# If slower:
# - Check build logs for issues
# - Verify dependencies aren't being reinstalled
# - Check Railway status page: status.railway.app
```

---

## Rollback Plan

If Railway doesn't work out:

```bash
# 1. Re-enable DigitalOcean app
doctl apps update 1fd40be5-b9af-4e71-ab1d-3af0864a7da4 --instance-count 1

# 2. Point DNS back to DO

# 3. Verify DO app works

# 4. Delete Railway project
railway delete
```

**But you won't need this.** Railway is simpler and more reliable.

---

## Next Steps

1. ✅ Install Railway CLI
2. ✅ Create project and link GitHub
3. ✅ Add MySQL database
4. ✅ Set environment variables
5. ✅ Deploy to Railway
6. ✅ Migrate database
7. ✅ Test thoroughly
8. ✅ Update DNS
9. ✅ Monitor for 1 week
10. ✅ Decommission DigitalOcean

**Estimated time**: 1-2 hours total

---

## Support

- **Railway Docs**: https://docs.railway.app
- **Railway Discord**: https://discord.gg/railway
- **Railway Status**: https://status.railway.app

---

**Ready to migrate? Let's do this!** 🚂
