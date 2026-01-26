# DATA-011 Manual Production Verification Steps

**Task**: Complete production verification of TERP Database Seeding System  
**Status**: Documentation Complete - Manual Verification Required  
**Date**: 2025-12-15

---

## What Has Been Completed

✅ **Phase 2: Production Documentation** (100% Complete)

- Created comprehensive production runbook
- Updated seed system README with production section
- Created automated verification script

✅ **Phase 3: Legacy Code Cleanup** (100% Complete)

- Added deprecation warnings to SKIP_SEEDING
- Archived legacy scripts to scripts/legacy/
- Updated all documentation references

✅ **Phase 4: Checkpoint** (100% Complete)

- All changes committed (commits: 315b135f, 09c731b4, 5077f5fc)
- All changes pushed to GitHub
- Session archived and ACTIVE_SESSIONS updated

---

## What Needs Manual Completion

⚠️ **Phase 1: Production Environment Verification** (Partial - Steps 1.3 and 1.4)

These steps require database access from an authorized environment (DigitalOcean App Platform console or Railway console).

---

## Option 1: Using DigitalOcean App Platform Console (Recommended)

### Step 1: Access the Console

1. Go to https://cloud.digitalocean.com/
2. Log in with your DigitalOcean credentials
3. Navigate to **Apps** → **terp-app**
4. Click **Console** tab
5. Wait for console to initialize

### Step 2: Pull Latest Code

```bash
cd /workspace
git pull origin main
```

### Step 3: Run Verification Script

```bash
bash scripts/verify-production-seeding.sh
```

This script will:

- Run dry-run test (Phase 1.1)
- Execute small seed test (Phase 1.2) - **requires confirmation**
- Validate data quality (Phase 1.3)
- Test application health (Phase 1.4)

### Step 4: Review Output

The script will output a summary. Expected results:

```
✅ Phase 1.1 Complete: Dry-run test passed
✅ Phase 1.2 Complete: Small seed test passed
✅ Phase 1.3 Complete: Data quality validated
✅ Phase 1.4 Complete: Application health check passed
```

### Step 5: Verify in Application UI

1. Navigate to https://terp-app-b9s35.ondigitalocean.app
2. Check the following pages:
   - **Clients**: Should show 10 seeded clients
   - **Orders**: Should show 50 seeded orders
   - **Vendors**: Should show 5 seeded vendors
   - **Products**: Should show 20 seeded products
3. Open browser console (F12) and check for errors
4. Verify data loads correctly and UI is responsive

---

## Option 2: Using Railway Console (If Migrated)

### Step 1: Install Railway CLI

```bash
npm install -g @railway/cli
```

### Step 2: Login and Link

```bash
railway login
railway link
```

### Step 3: Pull Latest Code

```bash
railway run git pull origin main
```

### Step 4: Run Verification Script

```bash
railway run bash scripts/verify-production-seeding.sh
```

### Step 5: Monitor Logs

```bash
railway logs --follow
```

### Step 6: Verify in Application UI

1. Navigate to your Railway production URL
2. Follow the same verification steps as Option 1, Step 5

---

## Option 3: Manual Verification (Without Script)

If the automated script doesn't work, follow these manual steps:

### Step 1: Dry-Run Test

```bash
pnpm seed:new --dry-run --size=small
```

**Expected Output**:

```
✅ Would seed 7 tables with 195 total records
✅ 0 errors detected
```

### Step 2: Execute Small Seed Test

⚠️ **WARNING**: This will clean and reseed the database!

```bash
pnpm seed:new --clean --size=small --force
```

**Expected Output**:

```
✅ Seeded 7 tables with 195 total records
✅ 0 errors
⏱️  Completed in ~30 seconds
```

### Step 3: Validate Data Quality

Connect to the database and run these SQL queries:

```sql
-- Verify record counts
SELECT 'vendors' as tbl, COUNT(*) as cnt FROM vendors
UNION ALL SELECT 'clients', COUNT(*) FROM clients
UNION ALL SELECT 'products', COUNT(*) FROM products
UNION ALL SELECT 'batches', COUNT(*) FROM batches
UNION ALL SELECT 'orders', COUNT(*) FROM orders
UNION ALL SELECT 'invoices', COUNT(*) FROM invoices
UNION ALL SELECT 'payments', COUNT(*) FROM payments;
```

**Expected Counts**:

- vendors: 5
- clients: 10
- products: 20
- batches: 30
- orders: 50
- invoices: 50
- payments: 30

```sql
-- Verify foreign key integrity (should return 0)
SELECT COUNT(*) as orphaned_orders
FROM orders o
LEFT JOIN clients c ON o.client_id = c.id
WHERE c.id IS NULL;

SELECT COUNT(*) as orphaned_invoices
FROM invoices i
LEFT JOIN orders o ON i.order_id = o.id
WHERE o.id IS NULL;

SELECT COUNT(*) as orphaned_payments
FROM payments p
LEFT JOIN invoices i ON p.invoice_id = i.id
WHERE i.id IS NULL;
```

**Expected**: All queries should return `0` (no orphaned records)

### Step 4: Test Application Health

```bash
# DigitalOcean
curl https://terp-app-b9s35.ondigitalocean.app/health

# Railway
curl https://terp-app-production.up.railway.app/health
```

**Expected Response**:

```json
{
  "status": "healthy",
  "database": "connected",
  "timestamp": "2025-12-15T19:30:00.000Z"
}
```

### Step 5: UI Verification

Same as Option 1, Step 5.

---

## Troubleshooting

### Issue: "Failed to connect to database"

**Solution**:

1. Check DATABASE_URL environment variable is set
2. Verify database is online: `doctl databases get 03cd0216-a4df-42c6-9bff-d9dc7dadec83`
3. Check firewall rules allow app access

### Issue: "SKIP_SEEDING is set"

**Solution**:

1. Check environment variables in DigitalOcean/Railway console
2. Remove `SKIP_SEEDING=true` if present
3. Redeploy application

### Issue: Seed script hangs

**Solution**:

1. Check database connection timeout settings
2. Verify no long-running queries blocking tables
3. Try with `--timeout=120` flag

### Issue: Foreign key violations

**Solution**:

1. Run `pnpm seed:new --clean --force` to reset database
2. Check seed order in `scripts/seed/seed-main.ts`
3. Verify schema migrations are up to date

---

## Success Criteria Checklist

Once manual verification is complete, confirm all criteria are met:

- [ ] Dry-run shows 7 tables, 195 records, 0 errors
- [ ] Small seed inserts 195 records, 0 errors
- [ ] SQL queries confirm expected counts
- [ ] SQL queries confirm 0 orphaned records
- [ ] Health endpoint returns `{"status":"healthy"}`
- [ ] Clients page shows 10 seeded clients
- [ ] Orders page shows 50 seeded orders
- [ ] Vendors page shows 5 seeded vendors
- [ ] Products page shows 20 seeded products
- [ ] Browser console shows no errors
- [ ] Application logs show no warnings

---

## After Completion

Once all verification steps are complete:

1. **Update Session File**:

   ```bash
   # Mark Phase 1.3 and 1.4 as complete in:
   # docs/sessions/completed/Session-20251215-DATA-011-5d08d4.md
   ```

2. **Update Completion Report**:

   ```bash
   # Add verification results to:
   # docs/DATA-011-COMPLETION-REPORT.md
   ```

3. **Commit Final Status**:

   ```bash
   git add docs/sessions/completed/Session-20251215-DATA-011-5d08d4.md
   git add docs/DATA-011-COMPLETION-REPORT.md
   git commit -m "docs: complete DATA-011 production verification"
   git push origin main
   ```

4. **Notify Team**:
   - Share completion report with team
   - Update project management system
   - Close DATA-011 task

---

## Documentation References

- **Production Runbook**: `docs/deployment/SEEDING_RUNBOOK.md`
- **Seed System README**: `scripts/seed/README.md`
- **Verification Script**: `scripts/verify-production-seeding.sh`
- **Completion Report**: `docs/DATA-011-COMPLETION-REPORT.md`
- **Session File**: `docs/sessions/completed/Session-20251215-DATA-011-5d08d4.md`

---

## Questions or Issues?

If you encounter any issues during verification:

1. Check the troubleshooting section above
2. Review the production runbook for detailed procedures
3. Check application logs for error messages
4. Verify environment variables are correctly set

---

**Last Updated**: 2025-12-15  
**Created By**: External Agent (Manus)  
**Session**: Session-20251215-DATA-011-5d08d4
