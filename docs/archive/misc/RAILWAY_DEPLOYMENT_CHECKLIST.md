# Railway Deployment Checklist for TERP

## Current Status: In Progress

### ✅ Completed Steps

1. ✅ **Code uploaded to Railway** - Build in progress
2. ✅ **Railway project linked** - "courageous-presence"
3. ✅ **MySQL decision made** - Using MySQL (matches codebase)
4. ✅ **PostgreSQL conversion abandoned** - Too risky, rolled back successfully
5. ✅ **TypeScript verified** - Zero errors after rollback

### ⏳ Pending Steps (User Action Required)

1. ⏳ **Add MySQL Database**
   - Go to: https://railway.app/project/courageous-presence
   - Click "New" → "Database" → "Add MySQL"
   - Railway auto-sets `DATABASE_URL` environment variable

2. ⏳ **Verify TERP Service**
   - Check that TERP service is visible and building
   - Go to "Variables" tab
   - Confirm `DATABASE_URL` is set

### 🔄 Next Steps (Automated After User Completes Above)

1. Run database migrations via Railway CLI
2. Set additional environment variables
3. Verify deployment success
4. Get live URL
5. Test all features

---

## Environment Variables Needed

### Critical (Required for App to Start)
- `DATABASE_URL` - Auto-set by Railway MySQL
- `JWT_SECRET` - For authentication (can generate new one)
- `NODE_ENV` - Set to "production"

### Optional (For Full Features)
- `CRON_SECRET` - For scheduled tasks
- `ENABLE_QA_CRONS` - Enable/disable cron jobs
- `ENABLE_RBAC` - Role-based access control
- `RATE_LIMIT_GET` - API rate limiting
- `SENTRY_DSN` - Error tracking
- `UPLOAD_DIR` - File upload directory

---

## Database Migration Command

Once MySQL is provisioned:

```bash
RAILWAY_TOKEN=26fcd793-0f1c-40ad-91ce-fba58846e959 railway run -- pnpm db:push
```

Or manually run SQL:
```bash
mysql -h [HOST] -u [USER] -p [DATABASE] < migrations/001_needs_and_matching_module.sql
```

---

## Post-Deployment Verification

1. Check deployment logs for errors
2. Visit the Railway-provided URL
3. Test these pages:
   - `/` - Homepage/Dashboard
   - `/needs` - Needs Management
   - `/vendor-supply` - Vendor Supply
   - Any client page - Should have "Needs & History" tab
   - Any inventory batch - Should have "Client Interest" section

4. Verify database tables created:
   - `client_needs`
   - `vendor_supply`
   - `match_records`
   - All other TERP tables

---

## Rollback Plan (If Needed)

1. Railway has automatic rollback in dashboard
2. Go to "Deployments" tab
3. Find last working deployment
4. Click "..." → "Redeploy"

---

## Self-Hosting Migration Path (Future)

When ready to move to your own hardware:

1. **Export MySQL database:**
   ```bash
   mysqldump -h [RAILWAY_HOST] -u [USER] -p [DATABASE] > terp_backup.sql
   ```

2. **Install MySQL on your server:**
   ```bash
   sudo apt install mysql-server
   ```

3. **Import database:**
   ```bash
   mysql -u root -p terp_production < terp_backup.sql
   ```

4. **Update environment variables:**
   - Point `DATABASE_URL` to your server
   - Update any other URLs/endpoints

5. **Deploy TERP:**
   ```bash
   git clone https://github.com/EvanTenenbaum/TERP
   cd TERP
   pnpm install
   pnpm build
   pnpm start
   ```

6. **Set up reverse proxy (nginx):**
   ```nginx
   server {
       listen 80;
       server_name terp.yourdomain.com;
       location / {
           proxy_pass http://localhost:3000;
       }
   }
   ```

---

## Support & Documentation

- **Railway Docs:** https://docs.railway.app
- **TERP Needs Module:** `docs/NEEDS_AND_MATCHING_MODULE.md`
- **Deployment Guide:** `RAILWAY_DEPLOYMENT_GUIDE.md`
- **Migration SQL:** `migrations/001_needs_and_matching_module.sql`

---

## Current Deployment URL

Will be available after deployment completes.
Check Railway dashboard under "Settings" → "Networking" → "Public Domain"

---

**Last Updated:** 2025-10-26
**Status:** Awaiting MySQL database provisioning

