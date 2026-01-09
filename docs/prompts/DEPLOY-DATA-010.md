# DEPLOY-DATA-010: Schema Validation System Deployment

## Task Overview

Deploy the DATA-010 Schema Validation System changes to production. This includes database schema migrations and code deployment with full verification.

## Pre-Deployment Checklist

Before starting, verify:
- [ ] All tests pass locally (`pnpm test`)
- [ ] TypeScript compiles without errors (`pnpm check`)
- [ ] Branch is up to date with main
- [ ] Database backup exists (or can be created)

## Database Credentials

```
Host: terp-mysql-db-do-user-28175253-0.m.db.ondigitalocean.com
Port: 25060
Username: doadmin
Password: AVNS_Q_RGkS7-uB3Bk7xC2am
Database: defaultdb
SSL: Required
```

---

## Phase 1: Pre-Deployment Verification

### Step 1.1: Check Current Database State

Run this query to verify current `inventoryMovements` table structure:

```sql
SELECT COLUMN_NAME, DATA_TYPE, COLUMN_TYPE, IS_NULLABLE
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = 'defaultdb'
  AND TABLE_NAME = 'inventoryMovements'
ORDER BY ORDINAL_POSITION;
```

**Expected current state (before migration):**
- Should have `reason` column (TEXT)
- Should NOT have `adjustmentReason` column
- Should NOT have `notes` column

**If `notes` and `adjustmentReason` already exist:** Migration has already been applied. Skip to Phase 3.

### Step 1.2: Verify Code is Ready

```bash
# Ensure on correct branch
git checkout claude/verify-system-changes-iFwoC
git pull origin claude/verify-system-changes-iFwoC

# Run TypeScript check
pnpm check

# Run schema validation tests
pnpm test -- --run scripts/utils/schema-validation.property.test.ts scripts/utils/schema-validation.integration.test.ts
```

**Expected:** All 74 tests pass (62 property + 12 integration)

---

## Phase 2: Database Migration

### Step 2.1: Create Database Backup

```bash
# Create backup before migration
mysqldump -h terp-mysql-db-do-user-28175253-0.m.db.ondigitalocean.com \
  -P 25060 -u doadmin -p defaultdb \
  --tables inventoryMovements > backup_inventoryMovements_$(date +%Y%m%d_%H%M%S).sql
```

### Step 2.2: Apply Migration

**Option A: Using Drizzle Kit (Recommended)**
```bash
pnpm db:push
```

**Option B: Manual SQL Execution**

Connect to the database and run:

```sql
-- Migration 0030: Add adjustment reasons to inventoryMovements
-- Transaction for safety
START TRANSACTION;

-- Step 1: Add adjustmentReason enum column
ALTER TABLE inventoryMovements
ADD COLUMN adjustmentReason ENUM(
  'DAMAGED',
  'EXPIRED',
  'LOST',
  'THEFT',
  'COUNT_DISCREPANCY',
  'QUALITY_ISSUE',
  'REWEIGH',
  'OTHER'
) NULL AFTER referenceId;

-- Step 2: Rename reason column to notes
ALTER TABLE inventoryMovements
CHANGE COLUMN reason notes TEXT;

-- Step 3: Add deleted_at to orderStatusHistory (if not exists)
ALTER TABLE order_status_history
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP NULL DEFAULT NULL;

COMMIT;
```

### Step 2.3: Verify Migration Success

```sql
-- Verify inventoryMovements columns
SELECT COLUMN_NAME, DATA_TYPE, COLUMN_TYPE
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = 'defaultdb'
  AND TABLE_NAME = 'inventoryMovements'
  AND COLUMN_NAME IN ('notes', 'adjustmentReason', 'reason')
ORDER BY ORDINAL_POSITION;
```

**Expected output:**
| COLUMN_NAME | DATA_TYPE | COLUMN_TYPE |
|-------------|-----------|-------------|
| adjustmentReason | enum | enum('DAMAGED','EXPIRED',...) |
| notes | text | text |

**`reason` should NOT appear** (it was renamed to `notes`)

---

## Phase 3: Code Deployment

### Step 3.1: Merge Pull Request

```bash
# Create PR if not exists
gh pr create \
  --title "feat(data-010): Complete Schema Validation System" \
  --body "$(cat <<'EOF'
## Summary
- Resolves schema drift issues identified by Red Hat QA
- Adds adjustmentReason enum column to inventoryMovements
- Renames reason column to notes per migration 0030
- Implements 62+ property tests for schema validation
- Updates CI workflow with schema validation tests

## Database Migration Required
Migration `0030_add_adjustment_reasons.sql` must be applied before deployment.

## Test Plan
- [x] All 62 property tests pass
- [x] All 12 integration tests pass
- [x] TypeScript compilation passes
- [ ] Run schema validation against production
- [ ] Smoke test inventory adjustments
EOF
)"

# Merge after approval
gh pr merge --squash
```

### Step 3.2: Deploy to Production

```bash
# Pull latest main
git checkout main
git pull origin main

# Deploy (adjust based on your deployment method)
# Option A: If using PM2
pm2 restart terp-api

# Option B: If using Docker
docker-compose pull && docker-compose up -d

# Option C: If using Vercel/Railway/etc
# Automatic deployment on merge
```

---

## Phase 4: Post-Deployment Validation

### Step 4.1: Run Schema Validation Against Production

```bash
# Set production DATABASE_URL
export DATABASE_URL="mysql://doadmin:AVNS_Q_RGkS7-uB3Bk7xC2am@terp-mysql-db-do-user-28175253-0.m.db.ondigitalocean.com:25060/defaultdb?ssl=true"

# Run comprehensive validation
pnpm validate:schema

# Run quick sync check
pnpm tsx scripts/validate-schema-sync.ts
```

**Expected output:**
```
✅ inventoryMovements.notes exists
✅ inventoryMovements.adjustmentReason exists
✅ inventoryMovements.inventoryMovementType exists
✅ Schema is in sync!
```

### Step 4.2: Smoke Test API Endpoints

Test the inventory adjustment endpoint:

```bash
# Replace with valid auth token and batch ID
curl -X POST https://your-api.com/trpc/inventoryMovements.adjust \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "batchId": 1,
    "newQuantity": "100",
    "reason": "Test adjustment",
    "adjustmentReason": "COUNT_DISCREPANCY"
  }'
```

### Step 4.3: Verify Database Record

```sql
-- Check that new records use the new columns correctly
SELECT id, batchId, inventoryMovementType, adjustmentReason, notes, createdAt
FROM inventoryMovements
ORDER BY createdAt DESC
LIMIT 5;
```

---

## Phase 5: Rollback Procedure (If Needed)

### Step 5.1: Rollback Database Migration

```sql
START TRANSACTION;

-- Rename notes back to reason
ALTER TABLE inventoryMovements
CHANGE COLUMN notes reason TEXT;

-- Remove adjustmentReason column
ALTER TABLE inventoryMovements
DROP COLUMN adjustmentReason;

-- Remove deleted_at from orderStatusHistory (optional)
ALTER TABLE order_status_history
DROP COLUMN deleted_at;

COMMIT;
```

### Step 5.2: Rollback Code

```bash
# Revert to previous commit
git revert HEAD
git push origin main

# Redeploy
pm2 restart terp-api  # or your deployment command
```

---

## Success Criteria

Deployment is successful when:

1. **Database Migration Applied:**
   - `inventoryMovements.notes` column exists
   - `inventoryMovements.adjustmentReason` enum column exists
   - `order_status_history.deleted_at` column exists

2. **Schema Validation Passes:**
   - `pnpm validate:schema` reports zero drift
   - `scripts/validate-schema-sync.ts` reports all checks pass

3. **API Functional:**
   - `inventoryMovements.adjust` endpoint accepts `adjustmentReason` parameter
   - Existing functionality (without `adjustmentReason`) still works

4. **No Regressions:**
   - Existing inventory movement records are accessible
   - Audit logs display correctly in UI
   - No TypeScript/runtime errors in logs

---

## Files Changed in This Deployment

| File | Change |
|------|--------|
| `drizzle/schema.ts` | Added adjustmentReason, notes columns; added deleted_at to orderStatusHistory |
| `drizzle/0030_add_adjustment_reasons.sql` | Migration script |
| `server/inventoryMovementsDb.ts` | Updated to use notes, accept adjustmentReason |
| `server/routers/inventoryMovements.ts` | Added adjustmentReason to adjust endpoint |
| `server/ordersDb.ts` | Updated reason → notes references |
| `server/routers/audit.ts` | Updated reason → notes references |
| `server/routers/poReceiving.ts` | Updated reason → notes references |
| `server/routers/returns.ts` | Updated reason → notes references |
| `server/routers/warehouseTransfers.ts` | Updated reason → notes references |
| `server/samplesDb.ts` | Updated reason → notes references |
| `scripts/validate-schema-sync.ts` | Updated to check notes instead of reason |
| `scripts/utils/schema-validation.property.test.ts` | 62 property tests |
| `scripts/utils/schema-validation.integration.test.ts` | 12 integration tests |
| `.github/workflows/schema-validation.yml` | Added test step to CI |

---

## Contact / Escalation

If deployment fails:
1. Check application logs for errors
2. Verify database connectivity
3. Run rollback procedure if data integrity at risk
4. Escalate to development team with error details
