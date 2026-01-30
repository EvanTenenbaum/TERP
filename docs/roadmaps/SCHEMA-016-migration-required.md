# SCHEMA-016: Root Cause and Required Migration

## Root Cause Identified

**The `products.strainId` column migration EXISTS but was NEVER EXECUTED on production.**

### Evidence

Migration file `drizzle/0002_many_kat_farrell.sql` contains:

```sql
ALTER TABLE `products` ADD `strainId` int;
```

This migration was created but never run against the production MySQL database.

### Why This Happened

1. Migration was added to codebase
2. Drizzle schema was updated to include `strainId`
3. Code was deployed referencing the column
4. **Migration was never executed** against production DB
5. Runtime queries fail with "Unknown column 'products.strainId'"

---

## The ACTUAL Fix (Not Workaround)

### Option 1: Run the Pending Migration (RECOMMENDED)

```bash
# Connect to production database
mysql -h <host> -u <user> -p <database>

# Run the migration
ALTER TABLE products ADD COLUMN strainId INT NULL;
ALTER TABLE products ADD INDEX idx_products_strainId (strainId);
ALTER TABLE products ADD CONSTRAINT fk_products_strainId
  FOREIGN KEY (strainId) REFERENCES strains(id) ON DELETE SET NULL;
```

**Prerequisites:**

- Database admin access
- Maintenance window (low traffic)
- Backup taken before migration

### Option 2: Remove strainId from Schema (BREAKING)

Remove `strainId` from `drizzle/schema.ts` and all code that references it. This would permanently disable strain features.

**NOT RECOMMENDED** - Strain features are valuable for product categorization.

---

## Current Workaround (TEMPORARY)

Until the migration is run, the following workarounds have been applied:

### Files Modified (Graceful Degradation)

| File                               | Change                                         | Purpose                                |
| ---------------------------------- | ---------------------------------------------- | -------------------------------------- |
| `server/inventoryIntakeService.ts` | Removed strainId from INSERT                   | Prevents INSERT failures               |
| `server/services/strainService.ts` | Added isSchemaError() try-catch to 4 functions | Prevents crashes, returns empty arrays |

### What This Workaround Does

- Strain features return empty results instead of crashing
- Products can still be created (without strain links)
- System remains functional but strain features are disabled

### What This Workaround Does NOT Do

- Does NOT fix the root cause
- Does NOT enable strain features
- Is NOT a permanent solution

---

## Verification After Migration

After running the migration, verify:

```bash
# 1. Check column exists
mysql> SHOW COLUMNS FROM products LIKE 'strainId';
+----------+---------+------+-----+---------+-------+
| Field    | Type    | Null | Key | Default | Extra |
+----------+---------+------+-----+---------+-------+
| strainId | int(11) | YES  | MUL | NULL    |       |
+----------+---------+------+-----+---------+-------+

# 2. Check index exists
mysql> SHOW INDEX FROM products WHERE Column_name = 'strainId';

# 3. Remove workaround code
# - Revert inventoryIntakeService.ts strainId removal
# - Remove isSchemaError() guards from strainService.ts (optional)
# - Update COLUMNS_PENDING_MIGRATION in tests
```

---

## Timeline

| Date       | Action                      | Status     |
| ---------- | --------------------------- | ---------- |
| Unknown    | Migration 0002 created      | ✅ Done    |
| Unknown    | Migration NOT run on prod   | ❌ Gap     |
| 2026-01-30 | Graceful degradation added  | ✅ Done    |
| TBD        | Run migration on production | 🔴 PENDING |
| TBD        | Remove workaround code      | 🔴 PENDING |
| TBD        | Enable strain features      | 🔴 PENDING |

---

## Related Tasks

- **QA-INFRA-005**: Remove safeProductSelect after strainId migration
- **SCHEMA-016**: This task - documents the root cause
- **Migration Task**: New task needed to run the migration

---

## Owner

This requires database admin intervention. The development team cannot fix this without production database access.
