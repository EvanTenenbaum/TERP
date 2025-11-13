# 🚀 Quick Deployment Instructions

## Environment Variables Setup

Before deploying, ensure all required environment variables are configured.

### Required Variables

**On DigitalOcean App Platform:**

1. Go to your app in the DigitalOcean dashboard
2. Navigate to Settings > App-Level Environment Variables
3. Add the following required variables:

```bash
DATABASE_URL=mysql://user:password@host:port/database
JWT_SECRET=<generate with: openssl rand -base64 32>
NODE_ENV=production
```

**Optional but Recommended:**

```bash
SENTRY_DSN=<your-sentry-dsn>
CLERK_PUBLISHABLE_KEY=<your-clerk-key>
CLERK_SECRET_KEY=<your-clerk-secret>
```

### Validation

The application will automatically validate environment variables at startup. If validation fails, check the logs for specific error messages.

**See:** `docs/ENVIRONMENT_VARIABLES.md` for complete documentation.

---

## Production Deployment - Run on Production Server

### Option 1: Automated Script (Recommended)

```bash
./deploy-production.sh
```

The script will:

1. ✅ Verify you're on the correct branch
2. ✅ Pull latest code
3. ✅ Install dependencies
4. ✅ Run all tests (180/180 must pass)
5. ⚠️ Prompt for database backup confirmation
6. ✅ Apply database migration
7. ✅ Build production bundle
8. ✅ Restart services (PM2/systemd)
9. ✅ Verify deployment

---

### Option 2: Manual Steps

**1. Pull Latest Code**

```bash
git checkout claude/complete-matchmaking-integration-011CUfmYnaFREBPbmnydfTJx
git pull origin claude/complete-matchmaking-integration-011CUfmYnaFREBPbmnydfTJx
```

**2. Install Dependencies**

```bash
npm install
```

**3. Run Tests**

```bash
npm test
# Expected: 180 passed
```

**4. Backup Database** ⚠️ **CRITICAL**

```bash
mysqldump -u [username] -p [database_name] > backup_$(date +%Y%m%d_%H%M%S).sql
```

**5. Apply Database Migration**

```bash
npm run db:push
```

Or manually:

```bash
mysql -u [username] -p [database_name] < drizzle/0020_add_strain_type.sql
```

**6. Build Production**

```bash
npm run build
```

**7. Restart Server**

Using PM2:

```bash
pm2 restart terp-server
pm2 save
```

Using systemd:

```bash
sudo systemctl restart terp
```

**8. Verify Deployment**

Check these URLs work:

- `/matchmaking` - Main matchmaking interface
- `/dashboard` - Dashboard with new widget
- `/clients/[id]` - Client profile with Purchase Patterns
- `/inventory/[id]` - Batch detail with Potential Buyers

---

## What's Being Deployed

### New Features

✅ **Matchmaking Service Page** - Full matching interface
✅ **Dashboard Widget** - Top opportunities on homepage
✅ **Purchase Patterns** - Client buying history & predictions
✅ **Potential Buyers** - See who might buy your inventory
✅ **Numbered Variant Matching** - "Blue Dream #5" intelligence
✅ **Strain Type Matching** - INDICA/SATIVA/HYBRID awareness
✅ **Quantity Tolerance** - ±10-20% flexibility
✅ **Predictive Reorders** - Know when clients will reorder

### Database Changes

**Migration:** `drizzle/0020_add_strain_type.sql`

Adds:

- `strain_type` ENUM to `client_needs` table
- `strain_type` ENUM to `vendor_supply` table
- Performance indexes on both tables

**Rollback (if needed):**

```sql
ALTER TABLE `client_needs` DROP COLUMN `strain_type`;
ALTER TABLE `vendor_supply` DROP COLUMN `strain_type`;
```

---

## Verification Checklist

After deployment, verify:

- [ ] Server starts without errors
- [ ] `/matchmaking` page loads correctly
- [ ] Dashboard shows "Matchmaking Opportunities" widget
- [ ] Client Profile shows "Purchase Patterns" widget (for buyers)
- [ ] Batch Detail shows "Potential Buyers" widget
- [ ] Can create a test client need
- [ ] Matches are generated successfully
- [ ] No console errors in browser
- [ ] No server errors in logs

---

## Quick Status Check

```bash
# Check server status
pm2 status

# View server logs
pm2 logs terp-server --lines 50

# Check for errors
pm2 logs terp-server --err --lines 20

# Test database migration applied
mysql -u [username] -p -e "DESCRIBE client_needs;" [database_name]
# Should show 'strain_type' column

mysql -u [username] -p -e "DESCRIBE vendor_supply;" [database_name]
# Should show 'strain_type' column
```

---

## Rollback Plan

If issues occur:

**1. Revert Code**

```bash
git checkout [previous-commit-hash]
pm2 restart terp-server
```

**2. Rollback Database**

```bash
mysql -u [username] -p [database_name] <<EOF
ALTER TABLE client_needs DROP COLUMN strain_type;
ALTER TABLE vendor_supply DROP COLUMN strain_type;
EOF
```

**3. Restore from Backup (if needed)**

```bash
mysql -u [username] -p [database_name] < backup_[timestamp].sql
```

---

## Support

**Documentation:**

- **User Guide:** `MATCHMAKING_USER_GUIDE.md` (for sales team)
- **Deployment Guide:** `MATCHMAKING_DEPLOYMENT_GUIDE.md` (detailed procedures)
- **Technical Docs:** `MATCHMAKING_README.md` (architecture & features)

**Troubleshooting:**

- See `MATCHMAKING_DEPLOYMENT_GUIDE.md` section "Troubleshooting"

**Issue Tracking:**

- Monitor server logs for first 24 hours
- Check match generation success rate
- Verify widget performance

---

## Success Metrics

**Week 1 Goals:**

- ✅ Deployment successful, no downtime
- ✅ 80%+ match generation success rate
- ✅ 10+ quotes created from matches
- ✅ Zero critical bugs

**Month 1 Goals:**

- 50% sales team adoption
- 20% faster quote-to-order time
- 3-5 proactive sales from predictions

---

**Current Status:**

- ✅ Code pushed to branch: `claude/complete-matchmaking-integration-011CUfmYnaFREBPbmnydfTJx`
- ✅ All 180 tests passing
- ✅ Production build successful
- ⏳ Awaiting database migration on production server
- ⏳ Awaiting service restart on production server

**Ready to deploy!** 🚀
