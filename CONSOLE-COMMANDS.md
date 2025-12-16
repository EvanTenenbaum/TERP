# Quick Console Commands for DATA-011 Verification

**For DigitalOcean App Platform Console** (when in `/app` directory)

---

## Step 1: Check if new seeding system is deployed

```bash
ls -la scripts/seed/
```

**Expected**: Should see `seed-main.ts` and other seed files

---

## Step 2: Run Dry-Run Test (Phase 1.1)

```bash
pnpm seed:new --dry-run --size=small
```

**Expected Output**:
```
✅ Would seed 7 tables with 195 total records
✅ 0 errors detected
```

---

## Step 3: Run Small Seed Test (Phase 1.2)

⚠️ **WARNING**: This will delete all existing data and reseed with test data!

```bash
pnpm seed:new --clean --size=small --force
```

**Expected Output**:
```
✅ Seeded 7 tables with 195 total records
✅ 0 errors
⏱️  Completed in ~30 seconds
```

---

## Step 4: Verify Data Quality (Phase 1.3)

If you have mysql client available:

```bash
# Check if mysql is available
which mysql

# If available, connect and verify
mysql -h $DB_HOST -P $DB_PORT -u $DB_USER -p$DB_PASSWORD $DB_NAME
```

Then run:
```sql
-- Check record counts
SELECT 'vendors' as tbl, COUNT(*) as cnt FROM vendors
UNION ALL SELECT 'clients', COUNT(*) FROM clients
UNION ALL SELECT 'products', COUNT(*) FROM products
UNION ALL SELECT 'batches', COUNT(*) FROM batches
UNION ALL SELECT 'orders', COUNT(*) FROM orders
UNION ALL SELECT 'invoices', COUNT(*) FROM invoices
UNION ALL SELECT 'payments', COUNT(*) FROM payments;

-- Check FK integrity (should return 0)
SELECT COUNT(*) as orphaned_orders 
FROM orders o 
LEFT JOIN clients c ON o.client_id = c.id 
WHERE c.id IS NULL;
```

**Expected Counts**:
- vendors: 5
- clients: 10
- products: 20
- batches: 30
- orders: 50
- invoices: 50
- payments: 30

**Expected FK Check**: 0 orphaned records

---

## Step 5: Check Application Health (Phase 1.4)

```bash
curl http://localhost:3000/health
# or
curl https://terp-app-b9s35.ondigitalocean.app/health
```

**Expected Response**:
```json
{
  "status": "healthy",
  "database": "connected",
  "timestamp": "2025-12-15T..."
}
```

---

## Alternative: If New Seeding System Not Deployed

If `scripts/seed/` doesn't exist, the latest code hasn't been deployed yet. You'll need to:

1. Trigger a new deployment in DigitalOcean
2. Wait for deployment to complete
3. Return to console and retry

Or use the legacy system temporarily:

```bash
# Check legacy system
ls -la scripts/seed-realistic-runner.ts

# Run legacy seed (if available)
pnpm seed:light
```

---

## Troubleshooting

### "Command not found: pnpm"

Try with npm:
```bash
npm run seed:new -- --dry-run --size=small
```

### "Cannot connect to database"

Check environment variables:
```bash
echo $DATABASE_URL
```

Should show a connection string. If empty, database env vars aren't set.

### "Permission denied"

You may need to run as the app user or check file permissions.

---

## After Verification

Once all steps pass, please share:
1. Output from dry-run test
2. Output from small seed test
3. Record counts from database
4. Health check response

This will allow me to document the successful completion of DATA-011.
