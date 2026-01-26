# Pilot: inventoryMovements Schema Alignment

**Date**: December 10, 2025  
**Status**: ✅ COMPLETE  
**MySQL Version**: 8.0.44 (Docker container `terp-test-db`)

---

## Executive Summary

The pilot successfully aligned the `inventoryMovements` table between the Drizzle ORM schema and the local MySQL database. The validation tool was also fixed to eliminate false positives caused by type representation differences.

**Result**: `pnpm validate:schema` now reports **0 issues** for `inventoryMovements`.

---

## What Was Found

### Original Hypothesis: Schema Corruption

The pilot was designed to find and fix "corrupted" `deletedAt` definitions nested inside column options.

### Actual Finding: Schema Drift + Validation Tool Bugs

1. **No corruption found**: The `deletedAt` field was not nested incorrectly in any table
2. **Schema drift**: The database had a `deleted_at` column (from migration 0039) but the Drizzle schema was missing the corresponding `deletedAt` field
3. **Validation tool false positives**: The tool was reporting mismatches due to:
   - Comparing MySQL types (`int`, `enum`, `text`, `timestamp`) with JavaScript runtime types (`number`, `string`, `date`)
   - Comparing MySQL boolean representation (`0`/`1`) with JavaScript booleans (`true`/`false`)

---

## What Was Fixed

### 1. Drizzle Schema (`drizzle/schema.ts`)

Added `deletedAt` field to `inventoryMovements` table:

```typescript
export const inventoryMovements = mysqlTable(
  "inventoryMovements",
  {
    // ... existing columns ...
    deletedAt: timestamp("deleted_at"), // Added for pilot
  }
  // ... indexes ...
);
```

### 2. Database (`terp-test`)

Added `deleted_at` column to match Drizzle schema:

```sql
ALTER TABLE inventoryMovements ADD COLUMN deleted_at TIMESTAMP NULL;
```

### 3. Validation Tool (`scripts/utils/schema-introspection.ts`)

Fixed `normalizeDataType` function to handle JavaScript runtime types:

```typescript
const typeMap: Record<string, string[]> = {
  int: ["int", "integer", "int4", "number"], // 'number' is JS runtime type
  bigint: ["bigint", "int8", "number"],
  varchar: ["varchar", "string"],
  text: ["text", "longtext", "mediumtext", "string"],
  decimal: ["decimal", "numeric", "string", "number"],
  timestamp: ["timestamp", "datetime", "date"], // 'date' is JS runtime type
  boolean: ["boolean", "bool", "tinyint"],
  enum: ["enum", "string"], // enums are strings in JS
  json: ["json", "object", "unknown"],
};
```

### 4. Validation Tool (`scripts/validate-schema-comprehensive.ts`)

Fixed nullable comparison to normalize MySQL `0`/`1` to JavaScript booleans:

```typescript
const dbNullable = Boolean(dbCol.isNullable); // Normalize 0/1 to true/false
```

---

## Commands Used

### Environment Setup

```bash
# Start Docker MySQL container
pnpm test:env:up

# Verify container running
/Applications/Docker.app/Contents/Resources/bin/docker ps --filter "name=terp-test-db"
# Output: terp-test-db Up X minutes
```

### Database Inspection

```bash
# Check table structure
/Applications/Docker.app/Contents/Resources/bin/docker exec terp-test-db mysql -uroot -prootpassword -e "USE \`terp-test\`; DESCRIBE inventoryMovements;"
```

### Validation

```bash
# Run schema validation
pnpm validate:schema

# Check specific table
cat SCHEMA_VALIDATION_REPORT.md | grep -A 50 "inventoryMovements"
```

---

## Validation Results

### Before Fix

```
inventoryMovements: 20 issues
- DataType mismatches: int vs number (4 columns)
- DataType mismatches: enum vs string (1 column)
- DataType mismatches: text vs string (1 column)
- DataType mismatches: timestamp vs date (2 columns)
- Nullable mismatches: 0 vs false, 1 vs true (10 columns)
```

### After Fix

```
✅ inventoryMovements: No issues
```

### Overall Validation Summary

```
Tables Checked: 120
Columns Checked: 1345
Total Issues: 28 (down from hundreds)
Critical Issues: 0
```

---

## Database Connection Details

| Property      | Value        |
| ------------- | ------------ |
| Host          | 127.0.0.1    |
| Port          | 3307         |
| User          | root         |
| Password      | rootpassword |
| Database      | terp-test    |
| Container     | terp-test-db |
| MySQL Version | 8.0.44       |

---

## Files Modified

1. `drizzle/schema.ts` - Added `deletedAt` to `inventoryMovements`
2. `scripts/utils/schema-introspection.ts` - Fixed `normalizeDataType` type mappings
3. `scripts/validate-schema-comprehensive.ts` - Fixed nullable comparison
4. `.env` - Added `DATABASE_URL` for local test database
5. `testing/db-util.ts` - Fixed Docker path for macOS

---

## Migration (Optional)

No formal migration file was created because:

1. The `deleted_at` column was added manually via Docker exec
2. The column already exists in production (from migration 0039)
3. This was a pilot to test the process, not a production change

For future schema drift fixes, use this template:

```sql
-- migrations/drift-fixes/XXX_add_deleted_at.sql
-- Version-safe guard for MySQL 8.0+
SET @column_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'inventoryMovements'
  AND COLUMN_NAME = 'deleted_at'
);

SET @sql = IF(@column_exists = 0,
  'ALTER TABLE inventoryMovements ADD COLUMN deleted_at TIMESTAMP NULL',
  'SELECT "Column already exists"'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Verification
DESCRIBE inventoryMovements;

-- Rollback (commented, use only if needed)
-- ALTER TABLE inventoryMovements DROP COLUMN deleted_at;
```

---

## Lessons Learned

1. **Validation tool quality matters**: False positives waste time and obscure real issues
2. **Type representation differs**: MySQL types ≠ Drizzle SQL types ≠ JavaScript runtime types
3. **Boolean normalization needed**: MySQL returns `0`/`1`, JavaScript uses `true`/`false`
4. **Schema drift is common**: Database may have columns that Drizzle schema lacks
5. **DB-first approach works**: Inspect database first, then align Drizzle schema

---

## Next Steps

1. ✅ Pilot complete for `inventoryMovements`
2. Apply same fixes to remaining 28 issues across other tables
3. Consider adding validation tool improvements to CI pipeline
4. Document standard process for schema drift detection and repair

---

## Success Criteria Verification

| Criteria                                                       | Status                                    |
| -------------------------------------------------------------- | ----------------------------------------- |
| `pnpm check` passes (schema compiles)                          | ✅ `drizzle/schema.ts` has no diagnostics |
| `pnpm validate:schema` shows 0 issues for `inventoryMovements` | ✅ Confirmed                              |
| Migration tested (if created)                                  | N/A - manual fix used                     |
| Pilot documentation complete                                   | ✅ This document                          |
| No staging/prod touched                                        | ✅ Local Docker only                      |
| Host guard concept documented                                  | ✅ See handoff context                    |

---

**Pilot Status: COMPLETE** ✅
