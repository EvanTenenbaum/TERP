# INFRA-003: Fix Database Schema Sync

**Task ID:** INFRA-003  
**Priority:** P2 (Infrastructure)  
**Estimate:** 2-4 hours  
**Status:** ready

---

## Objective

Fix database schema synchronization issues between the drizzle schema definitions and the actual DigitalOcean production database. Ensure all tables, columns, and constraints match the drizzle schema exactly.

---

## Context

During DATA-001 seeding work, multiple schema mismatches were discovered:

- `inventoryMovements` table missing `adjustmentReason` column (defined in drizzle, not in DB)
- `orderStatusHistory` has duplicate column mapping in drizzle schema
- Migration system has SSL and schema errors
- Several generators failed due to schema drift

**Impact:** Blocks future seeding efforts (DATA-002, DATA-003) and causes generator failures

**Root Cause:** Database schema has drifted from drizzle schema definitions over time

---

## Deliverables

1. ✅ Database schema in sync with drizzle definitions
2. ✅ Migration system working properly with SSL configured
3. ✅ All pending migrations run successfully
4. ✅ Schema validation script to prevent future drift
5. ✅ Documentation of schema sync process

---

## Implementation Protocol

### Phase 1: Analyze Schema Drift (30 min)

**Step 1.1: Identify all schema mismatches**

Create a script to compare drizzle schema with actual database:

```typescript
// scripts/validate-schema-sync.ts
import { db } from "./db-sync.js";
import { sql } from "drizzle-orm";
import * as schema from "../drizzle/schema.js";

async function validateSchemaSync() {
  console.log("🔍 Validating schema sync...\n");

  const issues: string[] = [];

  // Get all tables from database
  const tablesResult = await db.execute(sql`
    SELECT TABLE_NAME 
    FROM information_schema.TABLES 
    WHERE TABLE_SCHEMA = DATABASE()
  `);
  const dbTables = (tablesResult[0] as any[]).map(t => t.TABLE_NAME);

  // Get all tables from drizzle schema
  const schemaTables = Object.keys(schema);

  // Check for tables in schema but not in DB
  for (const table of schemaTables) {
    if (!dbTables.includes(table)) {
      issues.push(`❌ Table '${table}' defined in schema but not in database`);
    }
  }

  // For each table, check columns
  for (const tableName of dbTables) {
    const columnsResult = await db.execute(sql`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = ${tableName}
    `);
    const dbColumns = columnsResult[0] as any[];

    // Compare with drizzle schema (if exists)
    // Log any mismatches
  }

  if (issues.length === 0) {
    console.log("✅ Schema is in sync!");
  } else {
    console.log(`\n❌ Found ${issues.length} schema issues:\n`);
    issues.forEach(issue => console.log(issue));
  }

  return issues;
}

validateSchemaSync();
```

**Step 1.2: Document all issues**

Create a report:

- Tables missing from database
- Columns missing from tables
- Data type mismatches
- Constraint mismatches

### Phase 2: Fix Migration System (30-60 min)

**Step 2.1: Fix SSL configuration**

The migration system currently fails with SSL errors. Fix by updating the database connection:

```typescript
// Check drizzle.config.ts or migration connection
// Ensure it uses the same SSL config as db-sync.ts:
ssl: {
  rejectUnauthorized: false;
}
```

**Step 2.2: Test migration system**

```bash
# Generate migrations
pnpm drizzle-kit generate

# Check pending migrations
pnpm drizzle-kit check

# Run migrations (dry run first if possible)
pnpm drizzle-kit push
```

**Step 2.3: Fix any migration errors**

Common issues:

- SSL errors → Add `rejectUnauthorized: false`
- Schema errors → Fix drizzle schema definitions
- Permission errors → Verify DATABASE_URL credentials

### Phase 3: Run Pending Migrations (30-60 min)

**Step 3.1: Backup database (CRITICAL)**

```bash
# Document current state before making changes
pnpm exec tsx scripts/validate-schema-sync.ts > /tmp/schema-before.txt
```

**Step 3.2: Run migrations**

```bash
# Push schema changes to database
pnpm drizzle-kit push

# Or run specific migrations
pnpm drizzle-kit migrate
```

**Step 3.3: Verify migrations succeeded**

```bash
# Check schema after migrations
pnpm exec tsx scripts/validate-schema-sync.ts > /tmp/schema-after.txt

# Compare before/after
diff /tmp/schema-before.txt /tmp/schema-after.txt
```

### Phase 4: Fix Specific Known Issues (30-60 min)

**Issue 1: inventoryMovements.adjustmentReason**

```sql
-- Check if column exists
SELECT COLUMN_NAME
FROM information_schema.COLUMNS
WHERE TABLE_NAME = 'inventoryMovements'
AND COLUMN_NAME = 'adjustmentReason';

-- If missing, add it
ALTER TABLE inventoryMovements
ADD COLUMN adjustmentReason VARCHAR(255);
```

**Issue 2: orderStatusHistory duplicate columns**

Check `drizzle/schema.ts` for duplicate column mappings:

```typescript
// Look for duplicate field names mapping to same column
// Example of WRONG:
export const orderStatusHistory = mysqlTable("order_status_history", {
  fromStatus: varchar("fulfillmentStatus", { length: 50 }),
  toStatus: varchar("fulfillmentStatus", { length: 50 }), // DUPLICATE!
});

// Should be:
export const orderStatusHistory = mysqlTable("order_status_history", {
  fromStatus: varchar("from_status", { length: 50 }),
  toStatus: varchar("to_status", { length: 50 }),
});
```

Fix the schema definition and regenerate migrations.

### Phase 5: Create Schema Validation Tool (30 min)

**Step 5.1: Enhance validation script**

Make `scripts/validate-schema-sync.ts` comprehensive:

- Check all tables
- Check all columns
- Check data types
- Check constraints
- Check indexes
- Generate detailed report

**Step 5.2: Add to CI/CD**

Add schema validation to GitHub Actions:

```yaml
# .github/workflows/schema-validation.yml
name: Schema Validation
on: [push]
jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - run: pnpm install
      - run: pnpm exec tsx scripts/validate-schema-sync.ts
```

**Step 5.3: Document process**

Create `docs/DATABASE_SCHEMA_SYNC.md`:

- How to check schema sync
- How to run migrations
- How to fix schema drift
- Best practices

### Phase 6: Validation & Documentation (30 min)

**Step 6.1: Run full validation**

```bash
# Validate schema is in sync
pnpm exec tsx scripts/validate-schema-sync.ts

# Should output: ✅ Schema is in sync!
```

**Step 6.2: Test with seed script**

```bash
# Try running a seed script to verify schema works
pnpm exec tsx scripts/seed-critical-tables.ts

# Should complete without schema errors
```

**Step 6.3: Update roadmap**

Mark INFRA-003 as complete in `docs/roadmaps/MASTER_ROADMAP.md`:

```markdown
**Status:** ✅ Complete (2025-11-17)

**Resolution:** Fixed database schema sync issues. Ran pending migrations, fixed inventoryMovements and orderStatusHistory schema definitions, created schema validation tool. Database now in sync with drizzle schema. See docs/DATABASE_SCHEMA_SYNC.md for process documentation.
```

---

## Success Criteria

- [ ] Schema validation script runs without errors
- [ ] All tables from drizzle schema exist in database
- [ ] All columns match between drizzle and database
- [ ] Migration system works without SSL errors
- [ ] `inventoryMovements.adjustmentReason` column exists
- [ ] `orderStatusHistory` has no duplicate column mappings
- [ ] Documentation created
- [ ] Roadmap updated
- [ ] Session archived

---

## Known Issues & Solutions

### Issue: SSL Errors During Migration

**Error:** `HANDSHAKE_SSL_ERROR` or `self-signed certificate`

**Solution:**

```typescript
// In drizzle.config.ts or migration connection
ssl: {
  rejectUnauthorized: false;
}
```

### Issue: Permission Denied

**Error:** `Access denied for user`

**Solution:** Verify DATABASE_URL has correct credentials and permissions

### Issue: Table Already Exists

**Error:** `Table 'xxx' already exists`

**Solution:** This is OK - migration system should handle this. If not, manually check if table structure matches schema.

---

## Testing

After completing INFRA-003:

1. **Run schema validation:**

   ```bash
   pnpm exec tsx scripts/validate-schema-sync.ts
   # Should output: ✅ Schema is in sync!
   ```

2. **Test seed scripts:**

   ```bash
   pnpm exec tsx scripts/seed-critical-tables.ts
   # Should complete without schema errors
   ```

3. **Verify specific fixes:**

   ```sql
   -- Check inventoryMovements has adjustmentReason
   DESCRIBE inventoryMovements;

   -- Check orderStatusHistory columns
   DESCRIBE orderStatusHistory;
   ```

---

## Session Management

**Register session:**

```bash
echo "- INFRA-003: Session-$(date +%Y%m%d)-INFRA-003-$(openssl rand -hex 4) ($(date +%Y-%m-%d))" >> docs/ACTIVE_SESSIONS.md
```

**Archive session on completion:**

```bash
# Move session file to completed
mv docs/sessions/active/Session-*.md docs/sessions/completed/

# Remove from ACTIVE_SESSIONS.md
# Update roadmap to ✅ Complete
```

---

## Important Notes

⚠️ **This task MUST complete before DATA-002 and DATA-003 can start**

DATA-002 and DATA-003 depend on the schema being correct. If schema is out of sync, their seed scripts will fail with column/table errors.

**Coordination:**

- Complete INFRA-003 first
- Verify schema validation passes
- Then notify that DATA-002 and DATA-003 can start in parallel

---

## Resources

- Database: DigitalOcean MySQL (see .env for DATABASE_URL)
- Schema: `drizzle/schema.ts`
- Migrations: `drizzle/` directory
- Validation: `scripts/validate-schema-sync.ts` (create this)
- Documentation: `docs/DATABASE_SCHEMA_SYNC.md` (create this)

---

## Estimated Time

- Phase 1: 30 min (analyze drift)
- Phase 2: 30-60 min (fix migration system)
- Phase 3: 30-60 min (run migrations)
- Phase 4: 30-60 min (fix specific issues)
- Phase 5: 30 min (validation tool)
- Phase 6: 30 min (testing & documentation)

**Total: 2-4 hours**

---

Good luck! This is critical infrastructure work that will unblock future seeding efforts. Take your time and test thoroughly.
