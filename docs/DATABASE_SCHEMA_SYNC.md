# Database Schema Sync Process

## Overview

This document describes how to maintain synchronization between drizzle schema definitions and the production database for the TERP project.

## Database Connection

**Production Database:** DigitalOcean MySQL  
**Host:** terp-mysql-db-do-user-28175253-0.m.db.ondigitalocean.com  
**Port:** 25060  
**Database:** defaultdb  
**SSL:** REQUIRED (rejectUnauthorized: false)

Connection credentials are stored in `DEVELOPMENT_PROTOCOLS.md` and `.env` file.

## Validation

Run schema validation to check if drizzle schema matches the database:

```bash
pnpm exec tsx scripts/validate-schema-sync.ts
```

**Expected output:** `✅ Schema is in sync!`

If validation fails, follow the fixing process below.

## Schema Sync Strategy

The TERP project follows a **database-first** approach for schema synchronization:

1. **Database is the source of truth** - The production database structure defines what the schema should be
2. **Schema follows database** - Drizzle schema definitions are updated to match the database
3. **No automated migrations** - Schema changes are made manually and carefully to avoid data loss

This approach was chosen because:
- The database already contains production data
- Manual schema changes provide more control and safety
- Automated migrations can be risky with complex schema changes

## Fixing Schema Drift

If schema validation fails, follow these steps:

### Step 1: Identify the Drift

The validation script will show which columns or tables are out of sync. For example:

```
❌ inventoryMovements missing adjustmentReason column
```

### Step 2: Check Database Structure

Use MySQL to inspect the actual database structure:

```bash
mysql -u doadmin -p'<REDACTED>' \
  -h terp-mysql-db-do-user-28175253-0.m.db.ondigitalocean.com \
  -P 25060 \
  --ssl-mode=REQUIRED \
  defaultdb \
  -e "DESCRIBE tableName;"
```

### Step 3: Update Drizzle Schema

Update `drizzle/schema.ts` to match the database structure. For example:

```typescript
// If database has 'reason' (text) instead of 'adjustmentReason' (enum)
// Update schema from:
adjustmentReason: adjustmentReasonEnum,

// To:
reason: text("reason"),
```

### Step 4: Update Code References

Search for all code references to the old field name and update them:

```bash
grep -r "adjustmentReason" --include="*.ts" --include="*.tsx" server/ client/
```

Update all references to use the new field name.

### Step 5: Test and Validate

Run the validation script again to confirm the fix:

```bash
pnpm exec tsx scripts/validate-schema-sync.ts
```

## Common Schema Drift Issues

### Issue 1: Column Name Mismatch

**Problem:** Schema defines a column with one name, database has it with another

**Example:** Schema has `movementType`, database has `inventoryMovementType`

**Solution:** Update schema to match database column name

### Issue 2: Data Type Mismatch

**Problem:** Schema defines a column as enum, database has it as text/varchar

**Example:** Schema has `adjustmentReason: adjustmentReasonEnum`, database has `reason TEXT`

**Solution:** Update schema to use the correct data type

### Issue 3: Missing Columns

**Problem:** Schema defines a column that doesn't exist in database

**Solution:** Either add the column to database (if safe) or remove from schema

## Running Migrations (When Needed)

⚠️ **CAUTION:** Only run migrations after thorough testing

### Step 1: Fix SSL Configuration

Ensure `drizzle.config.ts` has SSL configuration:

```typescript
export default defineConfig({
  schema: ["./drizzle/schema.ts", "./drizzle/schema-vip-portal.ts", "./drizzle/schema-rbac.ts"],
  out: "./drizzle",
  dialect: "mysql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
    ssl: {
      rejectUnauthorized: false
    }
  },
});
```

### Step 2: Generate Migrations

```bash
pnpm drizzle-kit generate
```

This will create migration files in the `drizzle/` directory.

### Step 3: Review Migrations

**IMPORTANT:** Always review generated migration SQL before applying:

```bash
cat drizzle/0001_migration_name.sql
```

### Step 4: Apply Migrations

```bash
pnpm drizzle-kit push
```

Watch output carefully for errors.

### Step 5: Verify

```bash
pnpm exec tsx scripts/validate-schema-sync.ts
```

## Best Practices

1. **Always validate before seeding data** - Run validation script before any data seeding operations
2. **Document all schema changes** - Update this document when making schema changes
3. **Test in development first** - Never test schema changes directly in production
4. **Never modify production database directly** - Use drizzle-kit or documented SQL scripts
5. **Backup before changes** - Document current state before making any schema changes
6. **Use database as source of truth** - When in doubt, match schema to database structure

## Troubleshooting

### SSL Errors

**Error:** `HANDSHAKE_SSL_ERROR` or `self-signed certificate`

**Solution:** Add SSL configuration to `drizzle.config.ts`:

```typescript
ssl: {
  rejectUnauthorized: false
}
```

### Migration Fails

**Error:** Migration command fails with connection error

**Solution:**
1. Check DATABASE_URL is correct in `.env`
2. Verify database credentials
3. Check network connectivity
4. Review migration SQL for syntax errors

### Schema Validation Fails

**Error:** Validation script reports schema issues

**Solution:**
1. Run `DESCRIBE tableName` to check actual database structure
2. Update drizzle schema to match database
3. Update all code references to use correct field names
4. Re-run validation

### Drizzle-Kit Generate Errors

**Error:** `TypeError: Cannot read properties of undefined`

**Solution:** This usually indicates an issue with enum column definitions. Check that:
1. Enum types are properly defined with `mysqlEnum()`
2. Enum columns don't try to call the enum as a function
3. All column definitions have proper syntax

## Schema Validation Script

The validation script (`scripts/validate-schema-sync.ts`) checks:

1. All tables exist in database
2. Critical columns exist (inventoryMovements.reason, inventoryMovements.inventoryMovementType)
3. orderStatusHistory table structure

To add more validation checks, edit the script and add new checks in the same pattern.

## Related Documentation

- `docs/DEVELOPMENT_PROTOCOLS.md` - Database credentials and connection info
- `docs/CLAUDE_WORKFLOW.md` - Development workflow
- `drizzle/schema.ts` - Main schema definitions
- `scripts/validate-schema-sync.ts` - Schema validation tool

## History

**2025-11-18 (INFRA-003 - Session-20251118-INFRA-003-c2977611):**
- Fixed schema drift issues
- Updated `inventoryMovements` schema to match database
- Changed `movementType` to `inventoryMovementType`
- Changed `adjustmentReason` enum to `reason` text field
- Created validation script
- Added SSL configuration to drizzle.config.ts
- Documented database-first sync strategy
- Fixed RBAC schema (role_permissions, user_roles, user_permission_overrides)
  - Changed from composite primary keys to auto-increment ID columns
  - Added missing columns (assignedAt, assignedBy, grantedAt, grantedBy)
- Fixed orderStatusHistory table definition
  - Changed from fromStatus/toStatus to single fulfillmentStatus column
- Identified drizzle-kit tooling issue (generate/push commands fail)
- Confirmed schema validation passes despite drizzle-kit errors
