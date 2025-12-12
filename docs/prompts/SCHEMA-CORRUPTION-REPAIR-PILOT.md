# Database Schema Corruption Repair Pilot - Implementation Guide

**Version**: 1.0  
**Date**: December 10, 2025  
**Status**: Ready for Execution  
**Estimated Time**: 4-8 hours  

## Mission Statement

Safely fix corrupted schema definitions in the TERP codebase, specifically targeting malformed `deletedAt` timestamp fields, using the `inventoryMovements` table as a pilot. Work exclusively on local Docker MySQL with explicit safety guardrails to prevent any risk to staging or production systems.

## Critical Context

### The Problem
- 45+ tables in `drizzle/schema.ts` have `deletedAt` fields incorrectly nested inside other column option objects
- This corruption was caused by a botched merge of the soft delete feature (ST-013)
- The corruption prevents proper schema compilation and blocks seeding operations
- Example corruption: `varchar({ length: 255 }).deletedAt: timestamp("deleted_at")` (WRONG)
- Should be: proper table-level field `deletedAt: timestamp("deleted_at"),` (CORRECT)

### Why This Matters
- Schema validation system (DATA-010) is complete and working
- The 6 critical tables for seeding need to be aligned: `inventoryMovements`, `orderStatusHistory`, `invoices`, `ledgerEntries`, `payments`, `clientActivity`
- We're using `inventoryMovements` as the pilot to prove the manual repair process works
- Success criteria: `pnpm validate:schema` reports 0 issues for `inventoryMovements` table

### Safety-First Approach
- **Local only**: Work exclusively with local Docker MySQL via test harness
- **Manual precision**: No automation - hand-fix corruptions with surgical precision
- **DB-first**: Database structure is source of truth, align Drizzle schema to match
- **Non-destructive**: Only ADD or widen operations, never DROP/RENAME/narrow
- **Host guards**: Block any connection to production domains (ondigitalocean.com, etc.)

## Environment Setup

### Required Tools (Already Exist)
- `scripts/validate-schema-comprehensive.ts` - Schema validation tool
- `scripts/fix-schema-drift.ts` - Fix recommendation generator  
- `scripts/validate-schema-fixes.ts` - Verification tool
- `testing/db-util.ts` - Database utilities
- Local Docker MySQL test harness

### Test Harness Commands
```bash
# Start local Docker MySQL
pnpm test:env:up

# Reset to clean state with light data
pnpm test:db:reset light

# Run schema validation (main tool)
pnpm validate:schema

# Generate fix recommendations
pnpm fix:schema:report

# Verify fixes applied correctly
pnpm validate:schema:fixes
```

### Environment Validation
- Local `.env` should point to test harness DB (localhost:3306 or similar)
- No production credentials should be present
- `DATABASE_URL` must be local (localhost/127.0.0.1/0.0.0.0)

## Core Guardrails (MANDATORY)

### 1. Host Protection
```typescript
// Production host patterns to BLOCK
const PRODUCTION_HOSTS = [
  'ondigitalocean.com',
  'amazonaws.com', 
  'railway.app',
  'googlecloud.com',
  'azure.com'
];

// Must fail fast if non-local host detected
function validateLocalOnly(databaseUrl: string): void {
  const url = new URL(databaseUrl);
  const isLocal = ['localhost', '127.0.0.1', '0.0.0.0'].includes(url.hostname);
  
  if (!isLocal) {
    console.error('🚨 DANGER: Non-local database detected!');
    console.error(`Host: ${url.hostname}`);
    console.error('This pilot ONLY works with local Docker MySQL');
    process.exit(1);
  }
}
```

### 2. Non-Destructive Rule
- **ALLOWED**: ADD COLUMN, widen types (varchar(100) → varchar(255))
- **FORBIDDEN**: DROP COLUMN, RENAME, narrow types (varchar(255) → varchar(100))
- **PILOT SCOPE**: Only fix corruption + align `inventoryMovements` table

### 3. MySQL Version Compatibility
```sql
-- For MySQL 5.7+
ALTER TABLE inventoryMovements ADD COLUMN IF NOT EXISTS deletedAt TIMESTAMP NULL;

-- For older MySQL (fallback)
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_NAME='inventoryMovements' AND COLUMN_NAME='deletedAt');
SET @sql = IF(@col_exists = 0, 
  'ALTER TABLE inventoryMovements ADD COLUMN deletedAt TIMESTAMP NULL', 
  'SELECT "Column already exists"');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
```

### 4. DigitalOcean SSL (For Future Staging/Prod)
```typescript
// When connecting to DigitalOcean (not for pilot)
const DO_SSL_CONFIG = {
  ssl: {
    mode: 'REQUIRED',
    rejectUnauthorized: false  // Required for DO managed MySQL
  }
};
```

## Implementation Tasks

### Phase 0: Preflight (HARD GATES)

**Task 1: Environment Validation**
```bash
# Verify required scripts exist
ls -la scripts/validate-schema-comprehensive.ts
ls -la scripts/fix-schema-drift.ts  
ls -la testing/db-util.ts

# Start local test environment
pnpm test:env:up
pnpm test:db:reset light

# GATE: Validation tools must work
pnpm validate:schema
# If this fails, STOP and fix before proceeding
```

**Success Criteria**: 
- All scripts exist and execute
- Local Docker MySQL running
- `pnpm validate:schema` executes successfully (may show issues, that's expected)

### Phase 1: Host Guards and Safety

**Task 2: Implement Host Protection**
```typescript
// Create minimal host guard utility
function enforceLocalOnly(): void {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) throw new Error('DATABASE_URL not set');
  
  const url = new URL(dbUrl);
  const productionPatterns = ['ondigitalocean.com', 'amazonaws.com', 'railway.app'];
  
  if (productionPatterns.some(pattern => url.hostname.includes(pattern))) {
    console.error('🚨 Production host detected - BLOCKED');
    process.exit(1);
  }
  
  console.log('✅ Local environment confirmed');
}

// Add MySQL version detection utility
async function detectMySQLVersion(db: any): Promise<string> {
  const result = await db.execute(sql`SELECT VERSION() as version`);
  const version = result[0]?.version as string;
  console.log(`📊 MySQL Version: ${version}`);
  return version;
}
```

**Success Criteria**:
- Host guard blocks production domains
- MySQL version detection works
- SSL configuration ready for future DO work

### Phase 2: Manual Corruption Repair

**Task 3: Fix deletedAt Corruptions**

**Step 1: Identify Corruptions**
```bash
# Search for malformed deletedAt fields in drizzle/schema.ts
grep -n "deletedAt.*timestamp" drizzle/schema.ts

# Look for patterns like:
# varchar({ length: 255 }).deletedAt: timestamp("deleted_at")
# .references(() => users.id).deletedAt: timestamp("deleted_at")
# decimal({ precision: 15, scale: 2 }).deletedAt: timestamp("deleted_at")
```

**Step 2: Apply Surgical Repairs**
For each malformed `deletedAt`:

```typescript
// BEFORE (corrupted):
export const batches = pgTable("batches", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  deletedAt: timestamp("deleted_at"),  // ❌ WRONG - nested in options
  createdAt: timestamp("created_at").defaultNow(),
});

// AFTER (fixed):
export const batches = pgTable("batches", {
  id: serial("id").primaryKey(), 
  name: varchar("name", { length: 255 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  deletedAt: timestamp("deleted_at"),  // ✅ CORRECT - table-level sibling
});
```

**Step 3: Validate Each Fix**
```bash
# After each repair, ensure TypeScript compiles
pnpm check
# Must show 0 errors before proceeding to next corruption
```

**Success Criteria**:
- All malformed `deletedAt` fields moved to proper table-level position
- `pnpm check` passes with zero TypeScript errors
- Changes are surgical (only fix corruption, don't touch other code)

### Phase 3: Pilot Table Alignment

**Task 4: Align inventoryMovements with Database**

**Step 1: Get Fresh Validation Output**
```bash
# Reset database to clean state
pnpm test:db:reset light

# Run validation and focus on inventoryMovements
pnpm validate:schema | grep -A 20 -B 5 "inventoryMovements"
```

**Step 2: Manual Schema Alignment (DB-First)**
Based on validation output, manually adjust `inventoryMovements` table in `drizzle/schema.ts`:

```typescript
// Example alignment (adjust based on actual validation output)
export const inventoryMovements = pgTable("inventory_movements", {
  id: serial("id").primaryKey(),
  
  // Align types to match database exactly
  batchId: integer("batch_id").references(() => batches.id),  // int in DB
  quantity: decimal("quantity", { precision: 15, scale: 4 }), // decimal(15,4) in DB
  movementType: varchar("movement_type", { length: 50 }),     // varchar(50) in DB
  
  // Align nullability to match database
  reason: varchar("reason", { length: 255 }),                // nullable in DB
  notes: text("notes").notNull(),                             // NOT NULL in DB
  
  // Standard timestamps
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => new Date()),
  deletedAt: timestamp("deleted_at"),                         // nullable
});
```

**Step 3: Iterative Validation**
```bash
# Re-run validation after each change
pnpm validate:schema

# Focus on inventoryMovements issues
pnpm validate:schema | grep -A 10 "inventoryMovements"

# Repeat until 0 issues for inventoryMovements table
```

**Success Criteria**:
- `pnpm validate:schema` reports exactly 0 issues for `inventoryMovements` table
- Only `inventoryMovements` modified (no other tables touched)
- All changes are non-destructive (no column removal/renaming)

### Phase 4: Optional Migration Testing

**Task 5: Create Safe Migration (Only If Needed)**

Only create migration if database is missing a benign column that Drizzle expects.

**Step 1: Check MySQL Version**
```sql
SELECT VERSION();
-- Determine if IF NOT EXISTS is supported (MySQL 5.7+)
```

**Step 2: Create Migration File**
```sql
-- migrations/drift-fixes/001_pilot_inventoryMovements.sql

-- Pilot Migration: Add missing column to inventoryMovements
-- MySQL Version: 8.0.x (example)

-- Add column with version-aware syntax
ALTER TABLE inventory_movements ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP NULL;

-- Verification
DESCRIBE inventory_movements;

-- Rollback (commented)
-- ALTER TABLE inventory_movements DROP COLUMN deleted_at;
```

**Step 3: Test Migration Locally**
```bash
# Reset database
pnpm test:db:reset

# Apply migration manually
mysql -h localhost -u root -p terp_test < migrations/drift-fixes/001_pilot_inventoryMovements.sql

# Verify validation still passes
pnpm validate:schema

# Test rollback
mysql -h localhost -u root -p terp_test -e "ALTER TABLE inventory_movements DROP COLUMN deleted_at;"

# Re-validate after rollback
pnpm validate:schema
```

**Success Criteria**:
- Migration applies cleanly without errors
- Validation passes after migration
- Rollback works and validation still passes
- Only ADD/widen operations used (no DROP/RENAME)

### Phase 5: Documentation

**Task 6: Create Pilot Documentation**

Create `docs/PILOT_INVENTORYMOVEMENTS.md`:

```markdown
# inventoryMovements Pilot - Schema Corruption Repair

**Date**: December 10, 2025
**Status**: Complete
**MySQL Version**: 8.0.x (detected)

## What Was Broken
- `deletedAt` field incorrectly nested inside column options in 45+ tables
- Caused by botched merge of ST-013 soft delete feature
- Prevented proper TypeScript compilation and schema validation

## What Was Fixed
- Moved malformed `deletedAt` fields to proper table-level position
- Aligned `inventoryMovements` table types/nullability with actual database structure
- Applied database-first approach (DB is source of truth)

## Commands Used
```bash
pnpm test:env:up
pnpm test:db:reset light
pnpm validate:schema
pnpm check
```

## Results
- ✅ `pnpm check` passes (0 TypeScript errors)
- ✅ `pnpm validate:schema` reports 0 issues for `inventoryMovements`
- ✅ Migration tested and rollback verified (if applicable)
- ✅ No production systems touched (local only)

## Next Steps
- Apply same process to remaining 5 critical tables
- Implement batch processing for controlled scaling
- Add CI/CD integration after local success proven
```

**Success Criteria**:
- Complete documentation with all commands and results
- Clear record of what was broken and fixed
- Validation results documented (0 issues for pilot table)

### Phase 6: Success Checkpoint

**Task 7: Validate Pilot Success**

**Final Validation Checklist**:
```bash
# 1. TypeScript compilation
pnpm check
# Expected: 0 errors

# 2. Schema validation  
pnpm validate:schema
# Expected: 0 issues for inventoryMovements table

# 3. Migration testing (if created)
# Expected: applies and rolls back cleanly

# 4. Documentation
ls -la docs/PILOT_INVENTORYMOVEMENTS.md
# Expected: file exists with complete details
```

**Success Criteria**:
- All validation passes
- Pilot documentation complete
- No production systems accessed
- Ready for scaling to remaining tables

## Troubleshooting

### Common Issues

**1. Validation Tools Don't Work**
```bash
# Check if scripts exist
ls -la scripts/validate-schema-comprehensive.ts

# Check database connection
pnpm test:env:up
pnpm test:db:reset light

# Verify DATABASE_URL points to local
echo $DATABASE_URL
```

**2. TypeScript Compilation Fails**
```bash
# Check for syntax errors after repairs
pnpm check

# Look for unclosed brackets, missing commas
# Fix immediately before proceeding
```

**3. Host Guard Triggers**
```bash
# Verify DATABASE_URL is local
echo $DATABASE_URL | grep -E "(localhost|127\.0\.0\.1|0\.0\.0\.0)"

# Should NOT contain production domains
echo $DATABASE_URL | grep -E "(ondigitalocean|amazonaws|railway)"
```

**4. Validation Shows Persistent Issues**
```bash
# Focus on specific table
pnpm validate:schema | grep -A 20 "inventoryMovements"

# Check if types match database exactly
# Verify nullability matches (.notNull() vs nullable)
```

## Success Definition

**Pilot is successful when**:
1. ✅ `pnpm check` passes (0 TypeScript errors)
2. ✅ `pnpm validate:schema` reports 0 issues for `inventoryMovements`
3. ✅ Optional migration applies/rolls back cleanly (if created)
4. ✅ Complete documentation in `docs/PILOT_INVENTORYMOVEMENTS.md`
5. ✅ No production systems touched (local only)

**After pilot success**:
- Stop here - no scaling until pilot is fully validated
- Apply same process to remaining 5 critical tables
- Implement batch processing and CI/CD integration
- Plan staging and production deployment

## Key Files

- `drizzle/schema.ts` - Main schema file to repair
- `scripts/validate-schema-comprehensive.ts` - Validation tool
- `testing/db-util.ts` - Database utilities
- `docs/PILOT_INVENTORYMOVEMENTS.md` - Pilot documentation (to create)
- `migrations/drift-fixes/001_pilot_inventoryMovements.sql` - Optional migration

## Emergency Contacts

If issues arise:
1. Check this document for troubleshooting
2. Verify all safety guardrails are active
3. Ensure no production systems are accessed
4. Document any unexpected issues for future reference

---

**Remember**: This is a pilot. Manual precision over automation. Safety over speed. Local only, always.