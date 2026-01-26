# QA-MIGRATION-FIXES Execution Plan

**Task:** Fix QA issues identified in migrations 0053-0056
**Parent Tasks:** TERP-0006, PARTY-002, PARTY-003
**Estimate:** 4h
**Created:** 2026-01-26
**Mode:** STRICT

## Issues to Address

| ID     | Severity | Migration | Issue                                             |
| ------ | -------- | --------- | ------------------------------------------------- |
| QA-R02 | P1       | 0055      | ADD CONSTRAINT not idempotent                     |
| QA-R03 | P1       | 0055      | CREATE INDEX IF NOT EXISTS not valid in MySQL 5.7 |
| QA-R04 | P2       | 0055      | Hard DELETE violates soft-delete policy           |
| QA-R05 | P2       | 0055      | Fallback ID selection may pick wrong account      |
| QA-R06 | P2       | 0056      | Name matching can produce false positives         |
| QA-R01 | P3       | 0054      | No-op migration adds no value                     |
| QA-R07 | P3       | 0056      | Step numbering error                              |

---

## Phase 1: Fix P1 Critical Issues (QA-R02, QA-R03)

**Priority:** BLOCKING - Must fix before any production deployment
**Risk Level:** RED (database migrations)

### Step 1.1: Verify MySQL Version Target

| Attribute  | Value                                                        |
| ---------- | ------------------------------------------------------------ |
| File       | N/A (research)                                               |
| Action     | Check DigitalOcean MySQL version to determine syntax support |
| Command    | `doctl databases get <db-id>` or check DO dashboard          |
| Est        | 5 min                                                        |
| Dependency | None                                                         |

**Expected Outcome:** Determine if MySQL 8.0.29+ (supports IF NOT EXISTS) or 5.7

### Step 1.2: Make ADD CONSTRAINT Idempotent (QA-R02)

| Attribute  | Value                                       |
| ---------- | ------------------------------------------- |
| File       | `drizzle/0055_add_bills_fk_constraints.sql` |
| Lines      | 97-123                                      |
| Change     | Wrap each ALTER TABLE in conditional check  |
| Est        | 15 min                                      |
| Dependency | None                                        |

**Implementation Pattern:**

```sql
-- Check if constraint exists before adding
SET @fk_exists = (
  SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = DATABASE()
    AND TABLE_NAME = 'bills'
    AND CONSTRAINT_NAME = 'fk_bills_vendor_id'
);

SET @sql = IF(@fk_exists = 0,
  'ALTER TABLE `bills` ADD CONSTRAINT `fk_bills_vendor_id`
   FOREIGN KEY (`vendorId`) REFERENCES `vendors`(`id`)
   ON DELETE RESTRICT ON UPDATE CASCADE',
  'SELECT ''Constraint fk_bills_vendor_id already exists'' AS info');

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
```

**Repeat for all 5 constraints:**

1. `fk_bills_vendor_id`
2. `fk_bills_created_by`
3. `fk_bill_line_items_bill_id`
4. `fk_bill_line_items_product_id`
5. `fk_bill_line_items_lot_id`

### Step 1.3: Make CREATE INDEX Idempotent (QA-R03)

| Attribute  | Value                                                         |
| ---------- | ------------------------------------------------------------- |
| File       | `drizzle/0055_add_bills_fk_constraints.sql`                   |
| Lines      | 130-136                                                       |
| Change     | Replace `CREATE INDEX IF NOT EXISTS` with conditional pattern |
| Est        | 10 min                                                        |
| Dependency | Step 1.1 (MySQL version)                                      |

**Implementation Pattern (MySQL 5.7 compatible):**

```sql
-- Check if index exists before creating
SET @idx_exists = (
  SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'bills'
    AND INDEX_NAME = 'idx_bills_vendor_id'
);

SET @sql = IF(@idx_exists = 0,
  'CREATE INDEX `idx_bills_vendor_id` ON `bills` (`vendorId`)',
  'SELECT ''Index idx_bills_vendor_id already exists'' AS info');

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
```

**Repeat for all 3 indexes:**

1. `idx_bills_vendor_id`
2. `idx_bills_created_by`
3. `idx_bill_line_items_bill_id`

### Step 1.4: Verify Phase 1

| Attribute  | Value                                      |
| ---------- | ------------------------------------------ |
| Action     | Test migration on fresh DB and existing DB |
| Commands   | See verification section                   |
| Est        | 10 min                                     |
| Dependency | Steps 1.2, 1.3                             |

---

## Phase 2: Fix P2 Medium Issues (QA-R04, QA-R05, QA-R06)

**Priority:** Should fix before production
**Risk Level:** STRICT

### Step 2.1: Document Hard DELETE Exception (QA-R04)

| Attribute  | Value                                                   |
| ---------- | ------------------------------------------------------- |
| File       | `drizzle/0055_add_bills_fk_constraints.sql`             |
| Lines      | 46-61                                                   |
| Change     | Add explicit policy exception reference and audit trail |
| Est        | 5 min                                                   |
| Dependency | None                                                    |

**Implementation:**

- Add reference to policy exception approval
- Add pre-delete SELECT to log affected records
- Document in MASTER_ROADMAP.md as known exception

**Pattern:**

```sql
-- ============================================================================
-- POLICY EXCEPTION: Hard delete of orphaned soft-deleted records
-- Approved: 2026-01-26 (QA-R04)
-- Justification: Records are (1) already soft-deleted, (2) orphaned with no
-- parent bill, (3) blocking FK constraints. This is garbage collection.
-- ============================================================================

-- Audit: Log records before deletion (for manual recovery if needed)
-- SELECT id, billId, deleted_at FROM billLineItems
-- WHERE billId NOT IN (SELECT id FROM bills) AND deleted_at IS NOT NULL;

DELETE FROM `billLineItems`
WHERE `billId` NOT IN (SELECT `id` FROM `bills`)
AND `deleted_at` IS NOT NULL;
```

### Step 2.2: Improve Fallback ID Selection (QA-R05)

| Attribute  | Value                                            |
| ---------- | ------------------------------------------------ |
| File       | `drizzle/0055_add_bills_fk_constraints.sql`      |
| Lines      | 32-36, 40-44                                     |
| Change     | Use system account instead of arbitrary first ID |
| Est        | 10 min                                           |
| Dependency | None                                             |

**Implementation Options:**

**Option A: Use named system account (preferred)**

```sql
-- Use system vendor account if exists, otherwise first vendor
UPDATE `bills`
SET `vendorId` = COALESCE(
  (SELECT `id` FROM `vendors` WHERE `name` = 'System' OR `name` = 'Unknown' LIMIT 1),
  (SELECT `id` FROM `vendors` ORDER BY `id` ASC LIMIT 1)
)
WHERE `vendorId` NOT IN (SELECT `id` FROM `vendors`)
AND `vendorId` IS NOT NULL
AND EXISTS (SELECT 1 FROM `vendors` LIMIT 1);
```

**Option B: Create system account if missing**

```sql
-- Insert system vendor if not exists
INSERT IGNORE INTO `vendors` (`name`, `created_at`)
VALUES ('Unknown Vendor', CURRENT_TIMESTAMP);

-- Then use it as fallback
UPDATE `bills`
SET `vendorId` = (SELECT `id` FROM `vendors` WHERE `name` = 'Unknown Vendor' LIMIT 1)
WHERE `vendorId` NOT IN (SELECT `id` FROM `vendors`)
AND `vendorId` IS NOT NULL;
```

**Decision Required:** Which option to implement? Option A is safer (no INSERT), Option B is cleaner (dedicated system account).

### Step 2.3: Add Logging for Name Matching (QA-R06)

| Attribute  | Value                                                   |
| ---------- | ------------------------------------------------------- |
| File       | `drizzle/0056_migrate_lots_supplier_client_id.sql`      |
| Lines      | 45-52                                                   |
| Change     | Add pre-update verification and post-update audit query |
| Est        | 10 min                                                  |
| Dependency | None                                                    |

**Implementation:**

```sql
-- ============================================================================
-- STEP 2: Handle lots without supplier_profiles mapping
-- ============================================================================
-- WARNING: Name matching is inherently fragile. This step logs potential
-- false positives for manual review.

-- PRE-CHECK: Show lots that will be matched by name (run manually to verify)
-- SELECT l.id AS lot_id, l.vendorId, v.name AS vendor_name,
--        c.id AS client_id, c.name AS client_name
-- FROM lots l
-- INNER JOIN vendors v ON v.id = l.vendorId AND v.deleted_at IS NULL
-- INNER JOIN clients c ON LOWER(TRIM(c.name)) = LOWER(TRIM(v.name))
--   AND c.is_seller = 1 AND c.deleted_at IS NULL
-- WHERE (l.supplier_client_id IS NULL OR l.supplier_client_id = 0)
--   AND l.deleted_at IS NULL;

UPDATE `lots` l
INNER JOIN `vendors` v ON v.id = l.vendorId AND v.deleted_at IS NULL
INNER JOIN `clients` c ON LOWER(TRIM(c.name)) = LOWER(TRIM(v.name))
  AND c.is_seller = 1
  AND c.deleted_at IS NULL
SET l.supplier_client_id = c.id
WHERE (l.supplier_client_id IS NULL OR l.supplier_client_id = 0)
  AND l.deleted_at IS NULL;

-- POST-CHECK: Verify remaining unmapped lots
-- SELECT COUNT(*) AS unmapped_lots FROM lots
-- WHERE (supplier_client_id IS NULL OR supplier_client_id = 0)
--   AND deleted_at IS NULL;
```

### Step 2.4: Verify Phase 2

| Attribute  | Value                     |
| ---------- | ------------------------- |
| Action     | Run verification commands |
| Est        | 5 min                     |
| Dependency | Steps 2.1, 2.2, 2.3       |

---

## Phase 3: Fix P3 Low Issues (QA-R01, QA-R07)

**Priority:** Optional, cosmetic
**Risk Level:** SAFE

### Step 3.1: Evaluate Migration 0054 (QA-R01)

| Attribute  | Value                                           |
| ---------- | ----------------------------------------------- |
| File       | `drizzle/0054_fix_long_constraint_names.sql`    |
| Change     | Either remove entirely or keep as documentation |
| Est        | 5 min                                           |
| Dependency | None                                            |

**Options:**

**Option A: Keep as-is**

- Pros: No changes, no risk
- Cons: Adds clutter to migration history

**Option B: Remove migration file**

- Pros: Cleaner migration history
- Cons: May cause issues if already applied to some databases

**Option C: Convert to actual validation (recommended)**

- Add runtime check that fails if any constraint > 60 chars
- Provides value instead of being no-op

**Recommended: Option A** - Keep as-is. Removing applied migrations is risky.

### Step 3.2: Fix Step Numbering (QA-R07)

| Attribute  | Value                                              |
| ---------- | -------------------------------------------------- |
| File       | `drizzle/0056_migrate_lots_supplier_client_id.sql` |
| Line       | 55                                                 |
| Change     | Rename "STEP 5" to "STEP 3"                        |
| Est        | 2 min                                              |
| Dependency | None                                               |

---

## Verification Checklist

### Pre-Deployment Verification

- [ ] `pnpm check` passes
- [ ] `pnpm lint` passes (my files only)
- [ ] `pnpm build` passes

### Migration Testing (REQUIRED for RED mode)

**On Fresh Database:**

```bash
# Drop and recreate test database
mysql -e "DROP DATABASE IF EXISTS terp_test; CREATE DATABASE terp_test;"

# Run all migrations
pnpm drizzle-kit push --config=drizzle.config.ts

# Verify constraints exist
mysql terp_test -e "SELECT CONSTRAINT_NAME FROM information_schema.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = 'terp_test' AND TABLE_NAME IN ('bills', 'billLineItems');"
```

**On Existing Database (with data):**

```bash
# Backup first
mysqldump terp_prod > backup_$(date +%Y%m%d).sql

# Run migrations
pnpm drizzle-kit push --config=drizzle.config.ts

# Verify no data loss
mysql terp_prod -e "SELECT COUNT(*) FROM bills; SELECT COUNT(*) FROM billLineItems;"
```

**Idempotency Test:**

```bash
# Run migration twice - second run should not error
pnpm drizzle-kit push --config=drizzle.config.ts
pnpm drizzle-kit push --config=drizzle.config.ts
```

### Post-Deployment Verification

- [ ] Health check passes: `curl https://terp-app-b9s35.ondigitalocean.app/health`
- [ ] No errors in logs: `./scripts/terp-logs.sh run 100 | grep -i "error"`
- [ ] Bills can be created/updated in application
- [ ] BillLineItems can be created/updated in application

---

## Rollback Plan

### Phase 1 Rollback (if FK constraints cause issues)

```sql
-- Remove all FK constraints added
ALTER TABLE `billLineItems` DROP FOREIGN KEY `fk_bill_line_items_lot_id`;
ALTER TABLE `billLineItems` DROP FOREIGN KEY `fk_bill_line_items_product_id`;
ALTER TABLE `billLineItems` DROP FOREIGN KEY `fk_bill_line_items_bill_id`;
ALTER TABLE `bills` DROP FOREIGN KEY `fk_bills_created_by`;
ALTER TABLE `bills` DROP FOREIGN KEY `fk_bills_vendor_id`;

-- Remove indexes
DROP INDEX `idx_bills_vendor_id` ON `bills`;
DROP INDEX `idx_bills_created_by` ON `bills`;
DROP INDEX `idx_bill_line_items_bill_id` ON `billLineItems`;
```

### Phase 2 Rollback

- QA-R04: Cannot restore hard-deleted records (documented limitation)
- QA-R05: Revert vendorId/createdBy to original values (would need pre-migration backup)
- QA-R06: `UPDATE lots SET supplier_client_id = NULL WHERE deleted_at IS NULL;`

### Full Rollback (nuclear option)

```bash
# Restore from backup
mysql terp_prod < backup_YYYYMMDD.sql
```

---

## Time Estimate Summary

| Phase        | Steps   | Estimated Time |
| ------------ | ------- | -------------- |
| Phase 1 (P1) | 1.1-1.4 | 40 min         |
| Phase 2 (P2) | 2.1-2.4 | 30 min         |
| Phase 3 (P3) | 3.1-3.2 | 7 min          |
| Verification | All     | 30 min         |
| **Total**    |         | **~2 hours**   |

**Roadmap Estimate:** 4h (includes buffer for unknowns)
**Confidence Level:** High

---

## Decision Points Requiring Sign-off

1. **QA-R04:** Accept hard DELETE exception for orphaned soft-deleted records?
   - [ ] Approved by: ******\_\_\_******

2. **QA-R05:** Which fallback option?
   - [ ] Option A: Use existing system account if found
   - [ ] Option B: Create dedicated "Unknown Vendor" account

3. **QA-R01:** Keep migration 0054 as-is?
   - [ ] Yes, keep as documentation
   - [ ] No, convert to actual validation

---

## Dependencies

- MySQL version confirmation (for Phase 1)
- No other agents working on `drizzle/` directory (check ACTIVE_SESSIONS.md)
- Database backup before execution
