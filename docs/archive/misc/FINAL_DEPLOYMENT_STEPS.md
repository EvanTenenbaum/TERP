# Final Railway Deployment Steps

## Current Status
✅ Code uploaded to Railway  
✅ MySQL database created  
⏳ **Need to link DATABASE_URL to TERP service**  

---

## Complete These 3 Steps (2 Minutes Total)

### Step 1: Link Database to TERP Service (1 minute)

1. Go to https://railway.app/project/courageous-presence
2. Click on **"TERP"** service
3. Click **"Variables"** tab
4. Click **"New Variable"** button
5. Click **"Add Reference"**
6. In the dropdown, select: **`${{MySQL.DATABASE_URL}}`**
7. Click **"Add"**

Railway will automatically redeploy TERP with the database connection.

### Step 2: Wait for Deployment (1-2 minutes)

1. Stay on the TERP service page
2. Click **"Deployments"** tab
3. Watch the latest deployment
4. Wait for status to show **"Success"** (green checkmark)

### Step 3: Get Your Live URL

1. Click **"Settings"** tab
2. Scroll to **"Networking"** section
3. Click **"Generate Domain"** button
4. Railway will give you a URL like: `terp-production.up.railway.app`
5. **Copy this URL** - this is your live TERP application!

---

## Verify Deployment Works

Visit your Railway URL and check:

1. ✅ Homepage loads
2. ✅ Navigate to `/needs` - Needs Management page
3. ✅ Navigate to `/vendor-supply` - Vendor Supply page
4. ✅ Open any client page - Should have "Needs & History" tab
5. ✅ Open any inventory batch - Should have "Client Interest" widget

---

## Run Database Migrations

After the app is deployed, you need to create the database tables.

### Option A: Via Railway Dashboard (Easiest)

1. Go to TERP service
2. Click **"Settings"** tab
3. Scroll to **"Deploy"** section
4. In **"Custom Start Command"**, temporarily set:
   ```
   pnpm db:push && pnpm start
   ```
5. Click **"Save"**
6. Railway will redeploy and run migrations
7. After successful deployment, change it back to just:
   ```
   pnpm start
   ```

### Option B: Via Railway CLI (On Your Local Machine)

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Link to project
railway link

# Run migration
railway run pnpm db:push
```

### Option C: Manual SQL (If Above Don't Work)

1. Get MySQL credentials from Railway:
   - Click on **MySQL** service
   - Go to **"Variables"** tab
   - Copy: `MYSQLHOST`, `MYSQLUSER`, `MYSQLPASSWORD`, `MYSQLDATABASE`

2. Connect to MySQL:
   ```bash
   mysql -h [MYSQLHOST] -u [MYSQLUSER] -p [MYSQLDATABASE]
   # Enter password when prompted
   ```

3. Run the migration SQL:
   ```bash
   mysql -h [MYSQLHOST] -u [MYSQLUSER] -p [MYSQLDATABASE] < migrations/001_needs_and_matching_module.sql
   ```

---

## Troubleshooting

### App Won't Start
- Check **"Deployments"** → **"View Logs"**
- Look for error messages
- Common issue: DATABASE_URL not set → Go back to Step 1

### Database Connection Error
- Verify DATABASE_URL is set in Variables tab
- Should look like: `mysql://user:pass@host:port/database`
- Make sure it references the MySQL service: `${{MySQL.DATABASE_URL}}`

### Migration Fails
- Check that MySQL service is running (green status)
- Try Option C (Manual SQL) above
- The SQL file is in: `migrations/001_needs_and_matching_module.sql`

### Pages Don't Load
- Check that deployment status is "Success"
- View deployment logs for errors
- Verify the generated domain is accessible

---

## After Successful Deployment

### Set Up Custom Domain (Optional)

1. TERP service → **"Settings"** → **"Domains"**
2. Click **"Custom Domain"**
3. Enter your domain (e.g., `terp.yourdomain.com`)
4. Add the CNAME record to your DNS:
   ```
   CNAME terp [railway-generated-domain]
   ```
5. Wait 5-30 minutes for DNS propagation

### Enable Automatic Deployments

Already enabled! Every time you push to GitHub main branch:
```bash
git push origin main
```

Railway automatically:
1. Detects the push
2. Builds the new code
3. Deploys to production
4. Zero manual work!

### Monitor Your App

1. **View Logs**: TERP service → "Deployments" → Click deployment → "View Logs"
2. **Metrics**: TERP service → "Metrics" tab (CPU, Memory, Network)
3. **Alerts**: Settings → "Notifications" → Add email/Slack

---

## What Was Deployed

### Needs & Matching Intelligence Module

**Backend:**
- 3 new database tables (client_needs, vendor_supply, match_records)
- Enhanced matching engine with confidence scoring
- Historical purchase analysis
- Duplicate prevention
- Match recording and analytics
- 8 new tRPC API endpoints
- 53 passing tests

**Frontend:**
- Client pages: "Needs & History" tab
- Inventory pages: "Client Interest" widget
- Dashboard: "Smart Opportunities" widget
- New pages: `/needs` and `/vendor-supply`
- 5 new React components

**Features:**
- Create and track client needs
- Find matches (inventory, vendor, historical)
- Confidence scoring (0-100)
- One-click quote creation
- Purchase pattern analysis
- Lapsed buyer detection

---

## Database Tables Created

After running migrations, these tables will exist:

1. **client_needs** - Client product needs
2. **vendor_supply** - Vendor supply items
3. **match_records** - Match tracking and analytics
4. **vendors** - Vendor information (if not exists)
5. All existing TERP tables (users, products, batches, orders, etc.)

---

## Next Steps

1. ✅ Complete Steps 1-3 above
2. ✅ Run database migrations (Option A, B, or C)
3. ✅ Test the application
4. ✅ Set up custom domain (optional)
5. ✅ Configure monitoring/alerts (optional)

---

## Support

- **Railway Docs**: https://docs.railway.app
- **Railway Discord**: https://discord.gg/railway
- **TERP Documentation**: 
  - `docs/NEEDS_AND_MATCHING_MODULE.md`
  - `docs/NEEDS_MODULE_IMPLEMENTATION_SUMMARY.md`
  - `RAILWAY_DEPLOYMENT_GUIDE.md`

---

## Summary

**What You Need To Do:**
1. Link DATABASE_URL to TERP service (1 minute)
2. Wait for deployment (2 minutes)
3. Run database migrations (1 minute)
4. Test the app (2 minutes)

**Total Time: ~6 minutes**

Then you're live! 🚀

---

**Last Updated**: 2025-10-26  
**Status**: Ready for final deployment steps

