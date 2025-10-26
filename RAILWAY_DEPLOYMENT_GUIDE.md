# Railway Deployment Guide for TERP

## Overview

This guide will help you deploy TERP to Railway with **zero manual work after initial setup**. Railway will automatically deploy on every GitHub push, just like Vercel.

**Estimated Setup Time:** 5-10 minutes (one-time)  
**Future Deployments:** Automatic on every `git push`

---

## Prerequisites

- [x] GitHub account with TERP repository
- [x] Railway account (free - sign up at https://railway.app)
- [ ] Database credentials (MySQL)

---

## Step 1: Create Railway Account (1 minute)

1. Go to https://railway.app
2. Click "Login" or "Start a New Project"
3. Sign in with your GitHub account
4. Authorize Railway to access your GitHub repositories

**That's it!** Railway is now connected to your GitHub.

---

## Step 2: Create New Project (2 minutes)

### Option A: Via Railway Dashboard (Recommended)

1. Click "New Project" on Railway dashboard
2. Select "Deploy from GitHub repo"
3. Search for and select **"EvanTenenbaum/TERP"**
4. Railway will automatically detect it as a Node.js app
5. Click "Deploy Now"

### Option B: Via Railway CLI (Alternative)

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Link to your project
cd /path/to/TERP
railway init

# Deploy
railway up
```

---

## Step 3: Configure Environment Variables (3 minutes)

Railway needs the same environment variables that Vercel uses.

### Method 1: Copy from Vercel (Easiest)

If you have Vercel CLI installed:
```bash
# Export from Vercel
vercel env pull .env.production

# Import to Railway
railway variables --set-from-file .env.production
```

### Method 2: Manual Entry via Dashboard

1. Go to your Railway project
2. Click on your service
3. Go to "Variables" tab
4. Click "New Variable"
5. Add these variables:

```
DATABASE_URL=mysql://user:password@host:port/database
JWT_SECRET=your-jwt-secret-change-in-production
OPENAI_API_URL=your-openai-url (if using)
OPENAI_API_KEY=your-openai-key (if using)
OAUTH_SERVER_URL=https://vidabiz.butterfly-effect.dev
VITE_APP_ID=proj_abc123def456
VITE_OAUTH_PORTAL_URL=https://vida.butterfly-effect.dev
VITE_APP_TITLE=TERP
VITE_ANALYTICS_ENDPOINT=https://umami.dev.ops.butterfly-effect.dev
VITE_ANALYTICS_WEBSITE_ID=analytics_proj_abc123def456
```

**Important:** Copy the exact values from your Vercel environment variables.

### Method 3: Bulk Import via Railway CLI

```bash
# Set variables one by one
railway variables set DATABASE_URL="mysql://..."
railway variables set JWT_SECRET="your-secret"
# ... etc
```

---

## Step 4: Run Database Migration (One-time)

After the first deployment completes, you need to create the database tables.

### Option A: Via Railway CLI (Recommended)

```bash
# Connect to your Railway project
railway link

# Run the migration
railway run pnpm db:push
```

### Option B: Manual SQL Execution

1. Use the SQL migration file: `migrations/001_needs_and_matching_module.sql`
2. Connect to your MySQL database
3. Run the SQL file (see `DEPLOYMENT_INSTRUCTIONS.md` for details)

---

## Step 5: Verify Deployment (2 minutes)

1. Go to your Railway project dashboard
2. Click on your service
3. Go to "Deployments" tab
4. Wait for deployment to show "Success" (takes 2-3 minutes)
5. Click "View Logs" to see build output
6. Once deployed, Railway will show you a URL like: `https://terp-production.up.railway.app`

### Test Your Deployment

1. Visit the Railway URL
2. Check that the app loads
3. Navigate to `/needs` - Should show Needs Management page
4. Navigate to `/vendor-supply` - Should show Vendor Supply page
5. Open any client page - Should have "Needs & History" tab

---

## Step 6: Configure Custom Domain (Optional)

If you want to use your own domain:

1. Go to your Railway service
2. Click "Settings" tab
3. Scroll to "Domains"
4. Click "Add Domain"
5. Enter your domain (e.g., `terp.yourdomain.com`)
6. Railway will provide DNS records to add to your domain registrar
7. Add the CNAME record to your DNS
8. Wait for DNS propagation (5-30 minutes)

---

## Automatic Deployments (Zero Manual Work!)

**After initial setup, Railway automatically deploys on every GitHub push.**

### How it Works

1. You make changes to your code locally
2. Commit and push to GitHub:
   ```bash
   git add .
   git commit -m "Your changes"
   git push origin main
   ```
3. Railway automatically detects the push
4. Railway builds and deploys the new version
5. Your app is updated (takes 2-3 minutes)

**No manual steps required!** Just `git push` and Railway handles the rest.

---

## Monitoring & Logs

### View Deployment Status

1. Go to Railway dashboard
2. Click on your TERP project
3. See deployment status in real-time

### View Application Logs

1. Go to your Railway service
2. Click "Deployments" tab
3. Click on any deployment
4. View logs in real-time

### Set Up Alerts (Optional)

1. Go to "Settings" tab
2. Scroll to "Notifications"
3. Add your email or Slack webhook
4. Get notified of deployment success/failures

---

## Environment Management

### Development vs Production

Railway automatically sets `NODE_ENV=production` for you.

### Update Environment Variables

**Via Dashboard:**
1. Go to "Variables" tab
2. Click on variable to edit
3. Save changes
4. Railway automatically redeploys

**Via CLI:**
```bash
railway variables set DATABASE_URL="new-value"
```

---

## Database Management

### Option 1: Use Railway's Built-in MySQL (Recommended)

Railway can provision a MySQL database for you:

1. Go to your project
2. Click "New" → "Database" → "Add MySQL"
3. Railway creates a MySQL instance
4. Automatically sets `DATABASE_URL` environment variable
5. Run migration: `railway run pnpm db:push`

**Benefits:**
- Automatic backups
- Managed by Railway
- No external database needed
- Free tier available

### Option 2: Use External Database

Keep using your existing MySQL database:
- Just set the `DATABASE_URL` environment variable
- Railway connects to your external database

---

## Troubleshooting

### Deployment Failed

**Check build logs:**
1. Go to "Deployments" tab
2. Click on failed deployment
3. View logs to see error

**Common issues:**
- Missing environment variables → Add them in "Variables" tab
- Build errors → Check logs for specific error
- Database connection → Verify `DATABASE_URL` is correct

### App Not Loading

**Check:**
1. Deployment status is "Success"
2. Logs show "Server running on port..."
3. Environment variables are set correctly
4. Database migration was run

### Database Connection Issues

**Verify:**
```bash
# Test database connection
railway run node -e "const mysql = require('mysql2/promise'); mysql.createConnection(process.env.DATABASE_URL).then(() => console.log('Connected!')).catch(console.error)"
```

### Port Issues

Railway automatically sets the `PORT` environment variable. Your app should use:
```javascript
const PORT = process.env.PORT || 3000;
```

TERP already handles this correctly in `server/_core/index.ts`.

---

## Rollback to Previous Version

If a deployment breaks something:

1. Go to "Deployments" tab
2. Find the last working deployment
3. Click "..." menu
4. Click "Redeploy"

Railway will rollback to that version.

---

## Cost & Pricing

### Free Tier
- $5 free credit per month
- Enough for small projects
- No credit card required initially

### Paid Plans
- **Hobby:** $5/month (500 hours)
- **Pro:** $20/month (unlimited)

**For TERP:** Free tier should be sufficient for development/testing. Upgrade to Hobby for production.

---

## Migration from Vercel

### What to Update

1. **Frontend URL:** Update any hardcoded Vercel URLs to Railway URL
2. **API Endpoints:** Should work automatically (same codebase)
3. **Environment Variables:** Copy from Vercel to Railway
4. **Custom Domain:** Point to Railway instead of Vercel

### Keeping Both

You can keep Vercel for frontend-only and Railway for full-stack:
- Not recommended for TERP (adds complexity)
- Better to use Railway for everything

---

## Best Practices

### 1. Use Railway's Database
- Easier management
- Automatic backups
- Better performance (same region)

### 2. Set Up Notifications
- Get alerted on deployment failures
- Monitor app health

### 3. Use Environment Variables
- Never commit secrets to Git
- Use Railway's variables feature

### 4. Monitor Logs
- Check logs regularly
- Set up log drains for long-term storage

### 5. Enable Auto-Deploy
- Already enabled by default
- Deploys on every push to main branch

---

## Next Steps After Deployment

1. ✅ Verify app is running
2. ✅ Run database migration
3. ✅ Test all features
4. ✅ Set up custom domain (optional)
5. ✅ Configure notifications
6. ✅ Monitor first few deployments

---

## Support

### Railway Support
- Documentation: https://docs.railway.app
- Discord: https://discord.gg/railway
- Status: https://status.railway.app

### TERP Documentation
- Module docs: `docs/NEEDS_AND_MATCHING_MODULE.md`
- Deployment: `DEPLOYMENT_INSTRUCTIONS.md`
- Changelog: `CHANGELOG.md`

---

## Summary

**One-Time Setup (10 minutes):**
1. Create Railway account
2. Connect GitHub repo
3. Set environment variables
4. Run database migration

**Future Deployments (0 minutes):**
1. `git push origin main`
2. Railway auto-deploys
3. Done!

**Zero manual work after setup!** 🚀

---

## Quick Reference

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Link project
railway link

# View logs
railway logs

# Run commands
railway run <command>

# Set variables
railway variables set KEY=value

# Deploy
railway up
```

---

**Ready to deploy?** Follow Step 1-5 above. Good luck! 🎉

