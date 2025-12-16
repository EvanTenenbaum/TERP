# TERP Production Seeding Runbook

**Version**: 1.0  
**Last Updated**: 2025-12-15  
**Status**: Production Ready

This runbook provides step-by-step instructions for executing database seeding operations in production environments, with specific guidance for Railway and DigitalOcean platforms.

---

## Overview

The TERP Database Seeding System provides production-grade database seeding with the following features:

- **Concurrency Control**: MySQL advisory locks prevent concurrent seeding operations
- **Schema Validation**: Pre-insertion validation ensures data integrity
- **PII Masking**: GDPR/CCPA compliant data masking for non-production environments
- **Structured Logging**: Comprehensive progress reporting and error tracking
- **Rollback Support**: Safe rollback procedures for recovery scenarios

---

## Prerequisites

Before executing seeding operations, ensure you have:

1. **Database Access**: Valid credentials for the target database
2. **Environment Variables**: Properly configured `DATABASE_URL` in the deployment environment
3. **Backup**: Recent database backup (recommended for production)
4. **Monitoring Access**: Ability to view deployment logs and health checks

---

## Seeding Commands

### Basic Usage

```bash
# Seed all tables with medium data volume
pnpm seed:new

# Seed specific table only
pnpm seed:new --table=clients

# Seed with specific data volume
pnpm seed:new --size=small    # ~195 records total
pnpm seed:new --size=medium   # ~500 records total
pnpm seed:new --size=large    # ~2000 records total

# Preview without executing (dry-run)
pnpm seed:new --dry-run --size=small

# Clean tables before seeding
pnpm seed:new --clean --size=small

# Skip confirmation prompts
pnpm seed:new --force --clean --size=small
```

### Command Options

| Option | Description | Example |
|--------|-------------|---------|
| `--table=<name>` | Seed specific table only | `--table=clients` |
| `--size=<size>` | Data volume (small/medium/large) | `--size=small` |
| `--dry-run` | Preview without executing | `--dry-run` |
| `--clean` | Clean tables before seeding | `--clean` |
| `--force` | Skip confirmation prompts | `--force` |
| `--verbose` | Enable detailed logging | `--verbose` |
| `--help` | Show help information | `--help` |

---

## Railway Deployment (Current Production)

### Production Environment

**Production URL**: https://terp-app-production.up.railway.app  
**Platform**: Railway  
**Database**: Railway MySQL  
**Configuration**: `railway.json`, `Dockerfile`

### Accessing Railway Console

Railway provides multiple methods to execute commands in the production environment:

#### Method 1: Railway Web Console

1. Navigate to [Railway Dashboard](https://railway.app/)
2. Select the TERP project
3. Click on the service (e.g., `terp-app`)
4. Navigate to the **Console** tab
5. Execute seeding commands directly in the web console

#### Method 2: Railway CLI

```bash
# Install Railway CLI (if not already installed)
npm install -g @railway/cli

# Login to Railway
railway login

# Link to project
railway link

# Execute command in production environment
railway run pnpm seed:new --dry-run --size=small
```

### Railway Seeding Workflow

#### Step 1: Dry-Run Test

Execute a dry-run to preview the seeding operation without modifying data:

```bash
railway run pnpm seed:new --dry-run --size=small
```

**Expected Output**:
- Tables: 7 (vendors, clients, products, batches, orders, invoices, payments)
- Total Records: 195 (small size)
- Status: "DRY RUN MODE: No data will be modified"
- Errors: 0

#### Step 2: Execute Small Seed Test

Execute a small-scale seeding operation to verify functionality:

```bash
railway run pnpm seed:new --clean --size=small --force
```

**Expected Output**:
- "✓ Cleaned table: [each table]" (7 tables)
- "Seeded [table]: X records in Yms" for each table
- Duration: ~100-500ms per table
- Tables: 7, Records: 195, Errors: 0
- "✅ Seeding completed successfully!"

#### Step 3: Validate Data Quality

Connect to the Railway MySQL database and execute validation queries:

```sql
-- Verify record counts
SELECT 'vendors' as tbl, COUNT(*) as cnt FROM vendors
UNION ALL SELECT 'clients', COUNT(*) FROM clients
UNION ALL SELECT 'products', COUNT(*) FROM products
UNION ALL SELECT 'batches', COUNT(*) FROM batches
UNION ALL SELECT 'orders', COUNT(*) FROM orders
UNION ALL SELECT 'invoices', COUNT(*) FROM invoices
UNION ALL SELECT 'payments', COUNT(*) FROM payments;
-- Expected: vendors=5, clients=10, products=20, batches=30, orders=50, invoices=50, payments=30

-- Verify foreign key integrity
SELECT COUNT(*) as orphaned_orders 
FROM orders o 
LEFT JOIN clients c ON o.client_id = c.id 
WHERE c.id IS NULL;
-- Expected: 0

-- Verify PII masking (development/staging only)
SELECT name, email FROM clients LIMIT 3;
-- Expected: Faker-generated data like "John Smith", "john.smith@example.com"
```

#### Step 4: Verify Application Health

After seeding, verify the application is functioning correctly:

```bash
# Check health endpoint
curl https://terp-app-production.up.railway.app/health
# Expected: {"status":"healthy",...}
```

Navigate to the application and verify:
- Clients page shows seeded clients
- Orders page shows seeded orders
- Vendors page shows seeded vendors
- Products page shows seeded products
- No console errors in browser DevTools (F12)

---

## DigitalOcean Deployment (Legacy)

### Legacy Environment

**Legacy URL**: https://terp-app-b9s35.ondigitalocean.app  
**Platform**: DigitalOcean App Platform  
**Database**: DigitalOcean Managed MySQL  
**Database Host**: terp-mysql-db-do-user-28175253-0.m.db.ondigitalocean.com:25060  
**Status**: Deprecated (migrated to Railway 2025-12-03)

### Accessing DigitalOcean Console

#### Method 1: DigitalOcean Web Console

1. Navigate to [DigitalOcean Console](https://cloud.digitalocean.com/)
2. Go to **Apps** → **terp-app**
3. Click **Console** → **Run Command**
4. Execute seeding commands in the console

#### Method 2: doctl CLI

```bash
# Install doctl (if not already installed)
# See: https://docs.digitalocean.com/reference/doctl/how-to/install/

# Authenticate
doctl auth init

# List apps to get APP_ID
doctl apps list

# Access console
doctl apps console <APP_ID>

# View logs
doctl apps logs <APP_ID> --type run
```

### DigitalOcean Seeding Workflow

The seeding workflow for DigitalOcean is identical to Railway (Steps 1-4 above), but uses the DigitalOcean console or doctl CLI instead of Railway CLI.

---

## Monitoring and Verification

### Real-Time Monitoring

During seeding operations, monitor the following:

#### Console Output

Watch for structured JSON logs indicating progress:

```json
{"level":"info","operation":"seed-vendors","phase":"start","msg":"Starting seeding operation: seed-vendors"}
{"level":"info","operation":"seed-vendors","phase":"complete","duration":150,"records":5,"msg":"Completed seeding operation: seed-vendors"}
```

#### Log Levels

- `info`: Normal operation progress
- `warn`: Non-critical issues (e.g., deprecation warnings)
- `error`: Critical failures requiring attention

### Post-Seeding Verification

After seeding completes, verify the following:

#### 1. Record Counts

Execute the record count validation query (see Step 3 above) to ensure all tables have the expected number of records.

#### 2. Foreign Key Integrity

Execute the foreign key integrity query (see Step 3 above) to ensure all relationships are valid. The result should be 0 orphaned records.

#### 3. Application Health

Check the health endpoint and verify the application loads correctly with the seeded data.

#### 4. Error Logs

Review application logs for any errors or warnings:

```bash
# Railway
railway logs

# DigitalOcean
doctl apps logs <APP_ID> --type run
```

---

## Rollback Procedures

If seeding fails or produces incorrect data, use the following rollback procedures:

### Automatic Rollback (Recommended)

The seeding system includes built-in rollback support:

```bash
pnpm seed:new --rollback
```

This command will:
1. Acquire the seeding lock
2. Delete records in reverse foreign key order
3. Verify all tables are empty
4. Release the lock

### Manual Rollback

If automatic rollback fails, use manual SQL commands:

```sql
-- Delete records in reverse foreign key order
DELETE FROM payments;
DELETE FROM invoices;
DELETE FROM orders;
DELETE FROM batches;
DELETE FROM products;
DELETE FROM clients;
DELETE FROM vendors;

-- Verify tables are empty
SELECT 'vendors' as tbl, COUNT(*) as cnt FROM vendors
UNION ALL SELECT 'clients', COUNT(*) FROM clients
UNION ALL SELECT 'products', COUNT(*) FROM products
UNION ALL SELECT 'batches', COUNT(*) FROM batches
UNION ALL SELECT 'orders', COUNT(*) FROM orders
UNION ALL SELECT 'invoices', COUNT(*) FROM invoices
UNION ALL SELECT 'payments', COUNT(*) FROM payments;
-- Expected: All counts should be 0
```

### Lock Release

If the seeding operation is interrupted and the lock is not released, manually release it:

```sql
-- Release stuck lock
SELECT RELEASE_LOCK('terp_seeding_global');
```

### Re-Seed from Scratch

After rollback, re-seed with a clean slate:

```bash
pnpm seed:new --clean --size=small --force
```

---

## Troubleshooting

### Common Errors

#### Connection Errors

**Error**: `Failed to connect to database after 3 attempts`

**Causes**:
- Invalid `DATABASE_URL` environment variable
- Database server is down or unreachable
- Network connectivity issues
- Firewall blocking connection

**Solutions**:
1. Verify `DATABASE_URL` is correctly configured in the deployment environment
2. Check database server status in Railway/DigitalOcean dashboard
3. Verify network connectivity from the deployment environment
4. Check firewall rules and whitelist the deployment environment IP

#### Lock Errors

**Error**: `Failed to acquire seeding lock - another seeding operation may be in progress`

**Causes**:
- Another seeding operation is currently running
- Previous seeding operation was interrupted and did not release the lock

**Solutions**:
1. Wait for the current seeding operation to complete
2. If no operation is running, manually release the lock (see Rollback Procedures)
3. Verify no other agents or processes are attempting to seed simultaneously

#### Validation Errors

**Error**: `Schema validation failed for table [table_name]`

**Causes**:
- Database schema does not match expected structure
- Missing columns or tables
- Type mismatches

**Solutions**:
1. Run database migrations to ensure schema is up-to-date: `pnpm db:push`
2. Verify the seeding system is compatible with the current schema version
3. Check for recent schema changes that may have broken compatibility

#### Foreign Key Constraint Errors

**Error**: `Foreign key constraint violation`

**Causes**:
- Attempting to insert records with invalid foreign key references
- Tables seeded out of order

**Solutions**:
1. Verify the seeding order follows the dependency graph (vendors → clients → products → batches → orders → invoices → payments)
2. Use `--clean` flag to ensure tables are empty before seeding
3. Check for orphaned records from previous seeding attempts

#### Out of Memory Errors

**Error**: `JavaScript heap out of memory`

**Causes**:
- Seeding too many records at once
- Insufficient memory in deployment environment

**Solutions**:
1. Use smaller data volumes: `--size=small` instead of `--size=large`
2. Seed tables individually: `--table=clients`
3. Increase memory allocation in deployment environment settings

---

## Best Practices

### Pre-Seeding Checklist

Before executing seeding operations in production:

- [ ] Create a database backup
- [ ] Verify `DATABASE_URL` is correct
- [ ] Run dry-run test to preview changes
- [ ] Ensure no other seeding operations are running
- [ ] Check application health before seeding
- [ ] Review recent schema changes for compatibility

### Post-Seeding Checklist

After seeding completes:

- [ ] Verify record counts match expectations
- [ ] Validate foreign key integrity
- [ ] Check application health endpoint
- [ ] Test application functionality with seeded data
- [ ] Review logs for errors or warnings
- [ ] Document any issues or anomalies

### Production Safety

When seeding in production:

- **Always use dry-run first**: Preview changes before executing
- **Start small**: Use `--size=small` for initial tests
- **Monitor closely**: Watch logs in real-time during seeding
- **Have rollback ready**: Be prepared to rollback if issues occur
- **Coordinate with team**: Ensure no one else is modifying the database
- **Schedule maintenance window**: Seed during low-traffic periods if possible

---

## Environment-Specific Behavior

### Development

- **PII Masking**: Enabled by default
- **Confirmation Prompts**: Enabled (use `--force` to skip)
- **Logging**: Standard verbosity

### Staging

- **PII Masking**: Enabled by default
- **Confirmation Prompts**: Enabled (use `--force` to skip)
- **Logging**: Standard verbosity

### Production

- **PII Masking**: Disabled (uses real data if provided)
- **Confirmation Prompts**: Enabled (use `--force` to skip)
- **Logging**: Enhanced with structured JSON logs

---

## Support and Escalation

If you encounter issues not covered in this runbook:

1. **Check Logs**: Review deployment logs for detailed error messages
2. **Consult Documentation**: See `scripts/seed/README.md` for additional details
3. **Review Code**: Check `scripts/seed/seed-main.ts` for implementation details
4. **Contact Team**: Escalate to the development team with logs and error details

---

## Appendix: Seeding System Architecture

### Components

| Component | Purpose | Location |
|-----------|---------|----------|
| **CLI Orchestrator** | Main entry point and command parsing | `scripts/seed/seed-main.ts` |
| **Seeders** | Table-specific seeding logic | `scripts/seed/seeders/` |
| **Locking** | Concurrency control via MySQL locks | `scripts/seed/lib/locking.ts` |
| **Validation** | Schema validation before insertion | `scripts/seed/lib/validation.ts` |
| **Data Masking** | PII masking for GDPR/CCPA compliance | `scripts/seed/lib/data-masking.ts` |
| **Logging** | Structured logging and progress reporting | `scripts/seed/lib/logging.ts` |

### Seeding Order

Tables are seeded in the following order to respect foreign key dependencies:

1. `vendors` (no dependencies)
2. `clients` (no dependencies)
3. `products` (depends on vendors)
4. `batches` (depends on products)
5. `orders` (depends on clients, batches)
6. `invoices` (depends on orders)
7. `payments` (depends on invoices)

### Data Volumes

| Size | Vendors | Clients | Products | Batches | Orders | Invoices | Payments | Total |
|------|---------|---------|----------|---------|--------|----------|----------|-------|
| Small | 5 | 10 | 20 | 30 | 50 | 50 | 30 | 195 |
| Medium | 10 | 25 | 50 | 75 | 150 | 150 | 100 | 560 |
| Large | 25 | 100 | 200 | 300 | 500 | 500 | 300 | 1925 |

---

**Document Version**: 1.0  
**Last Updated**: 2025-12-15  
**Maintained By**: TERP Development Team
