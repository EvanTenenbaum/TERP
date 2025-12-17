# Production Seeding Runbook

**Version**: 1.0  
**Last Updated**: 2025-12-16  
**Status**: Active

This runbook provides step-by-step instructions for seeding the TERP production database.

---

## Prerequisites

Before seeding production:

1. **Backup the database** (DigitalOcean takes automatic daily backups)
2. **Verify you have production access** via DigitalOcean console
3. **Ensure no active users** are using the system during seeding
4. **Review the seed size** - start with `small` for testing

---

## Quick Reference

```bash
# Dry-run (preview only, no changes)
pnpm seed:new --dry-run --size=small

# Small seed (195 records) - for testing
pnpm seed:new --clean --size=small --force

# Medium seed (1,950 records) - for staging
pnpm seed:new --clean --size=medium --force

# Large seed (19,500 records) - for production
pnpm seed:new --clean --size=large --force

# Complete seed (includes bills, POs)
pnpm seed:new --clean --size=medium --complete --force
```

---

## Step-by-Step Instructions

### Step 1: Access DigitalOcean Console

1. Log into DigitalOcean App Platform
2. Navigate to the TERP app
3. Open the **Console** tab
4. Wait for the console to connect

### Step 2: Run Dry-Run Test

Always run a dry-run first to preview what will be seeded:

```bash
pnpm seed:new --dry-run --size=small
```

**Expected Output**:
```
🌱 TERP Database Seeder
========================
Mode: DRY RUN (no changes will be made)
Size: small

📊 Preview:
  vendors:    5 records
  clients:    10 records
  products:   20 records
  batches:    30 records
  orders:     50 records
  invoices:   50 records
  payments:   30 records
  
Total: 195 records
```

### Step 3: Execute Seed

If dry-run looks correct, execute the seed:

```bash
pnpm seed:new --clean --size=small --force
```

**Flags explained**:
- `--clean`: Clears existing data before seeding
- `--size=small`: Uses small dataset (195 records)
- `--force`: Skips confirmation prompt

### Step 4: Verify Seeded Data

After seeding, verify the data:

```bash
# Check record counts
npx tsx scripts/prod-db-query.ts counts

# Verify specific tables
npx tsx scripts/prod-db-query.ts "SELECT COUNT(*) FROM clients"
npx tsx scripts/prod-db-query.ts "SELECT COUNT(*) FROM orders"
```

### Step 5: Test Application

1. Navigate to production URL: https://terp-app-b9s35.ondigitalocean.app
2. Log in and verify:
   - Clients page shows seeded clients
   - Orders page shows seeded orders
   - No console errors in browser DevTools

---

## Seed Sizes

| Size | Records | Use Case |
|------|---------|----------|
| `small` | 195 | Testing, quick verification |
| `medium` | 1,950 | Staging, demo environments |
| `large` | 19,500 | Production, load testing |

### Record Distribution by Size

| Entity | Small | Medium | Large |
|--------|-------|--------|-------|
| Vendors | 5 | 15 | 50 |
| Clients | 10 | 50 | 200 |
| Products | 20 | 100 | 500 |
| Batches | 30 | 200 | 1,000 |
| Orders | 50 | 500 | 5,000 |
| Invoices | 50 | 500 | 5,000 |
| Payments | 30 | 300 | 3,000 |

---

## Rollback Procedures

### Option 1: Re-seed with Clean Flag

The simplest rollback is to re-seed:

```bash
pnpm seed:new --clean --size=small --force
```

### Option 2: Manual Data Cleanup

If you need to manually clean specific tables:

```sql
-- Clear seeded data (preserves schema)
SET FOREIGN_KEY_CHECKS = 0;

TRUNCATE TABLE payments;
TRUNCATE TABLE invoiceLineItems;
TRUNCATE TABLE invoices;
TRUNCATE TABLE order_line_items;
TRUNCATE TABLE orders;
TRUNCATE TABLE batches;
TRUNCATE TABLE products;
TRUNCATE TABLE clients;
TRUNCATE TABLE vendors;

SET FOREIGN_KEY_CHECKS = 1;
```

### Option 3: Release Stuck Locks

If seeding fails mid-way and locks are stuck:

```sql
-- Check for locks
SHOW PROCESSLIST;

-- Kill stuck process (replace ID)
KILL <process_id>;
```

---

## Monitoring Seeding Progress

### Via Console Output

The seeder provides real-time progress:

```
🌱 Seeding vendors... 5/5 ✓
🌱 Seeding clients... 10/10 ✓
🌱 Seeding products... 20/20 ✓
🌱 Seeding batches... 30/30 ✓
🌱 Seeding orders... 50/50 ✓
🌱 Seeding invoices... 50/50 ✓
🌱 Seeding payments... 30/30 ✓

✅ Seeding complete!
   Total records: 195
   Duration: 12.3s
   Errors: 0
```

### Via Database Queries

Monitor progress by querying counts:

```bash
npx tsx scripts/prod-db-query.ts "SELECT 'clients' as tbl, COUNT(*) as cnt FROM clients UNION ALL SELECT 'orders', COUNT(*) FROM orders"
```

### Via Application Health

After seeding, verify health endpoint:

```bash
curl https://terp-app-b9s35.ondigitalocean.app/health
```

---

## Troubleshooting

### Error: "Connection refused"

**Cause**: Database not accessible
**Solution**: 
1. Check DATABASE_URL in environment variables
2. Verify database is running in DigitalOcean

### Error: "Foreign key constraint fails"

**Cause**: Seeding order incorrect or orphaned references
**Solution**:
1. Use `--clean` flag to clear existing data
2. Verify seeding order in `scripts/seed/seeders/index.ts`

### Error: "Duplicate entry"

**Cause**: Data already exists
**Solution**:
1. Use `--clean` flag to clear existing data
2. Or use `--force` to overwrite

### Error: "Lock wait timeout"

**Cause**: Another process has table locked
**Solution**:
1. Wait for other process to complete
2. Or kill stuck process (see Rollback section)

### Error: "Out of memory"

**Cause**: Large seed size on limited resources
**Solution**:
1. Use smaller seed size
2. Seed in batches (run multiple small seeds)

---

## DigitalOcean-Specific Notes

### Console Timeout

The DigitalOcean console may timeout after 10 minutes of inactivity. For large seeds:
1. Keep the console active
2. Or use `nohup` to run in background

### Environment Variables

Ensure these are set in DigitalOcean App Settings:
- `DATABASE_URL` - Production database connection string
- `NODE_ENV=production` - Ensures production behavior

### Resource Limits

DigitalOcean App Platform has resource limits:
- Memory: Check your plan's limits
- CPU: Seeding is CPU-intensive
- Timeout: Long-running commands may be killed

For large seeds, consider:
1. Upgrading instance temporarily
2. Running during off-peak hours
3. Using smaller batch sizes

---

## Best Practices

1. **Always dry-run first** - Preview before executing
2. **Start small** - Test with `small` size before `large`
3. **Backup first** - Ensure backup exists before `--clean`
4. **Monitor progress** - Watch console output for errors
5. **Verify after** - Check data and test application
6. **Document changes** - Note when and what was seeded

---

## Related Documentation

- `scripts/seed/README.md` - Seeder technical documentation
- `.kiro/steering/04-infrastructure.md` - Infrastructure guide
- `docs/deployment/README.md` - Deployment overview

