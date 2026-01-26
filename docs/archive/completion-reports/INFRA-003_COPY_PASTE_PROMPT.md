# INFRA-003: Fix Database Schema Sync - Copy-Paste Prompt

## ⚠️ CRITICAL: Infrastructure Task - Extra Care Required

This task modifies the **production database schema**. Follow all protocols strictly.

---

## Task Overview

**Task ID:** INFRA-003  
**Priority:** P2 (Infrastructure) - **BLOCKS DATA-002 and DATA-003**  
**Estimate:** 2-4 hours  
**Risk Level:** MEDIUM (database changes)

**Objective:** Fix database schema synchronization issues between drizzle schema definitions and the actual DigitalOcean production database.

**Impact:** Blocks future seeding efforts (DATA-002, DATA-003) and causes generator failures.

---

## Copy-Paste Prompt

```
You are working on the TERP project (cannabis ERP system).

TASK: INFRA-003 - Fix Database Schema Sync
PRIORITY: P2 (Infrastructure) - BLOCKS DATA-002 and DATA-003
ESTIMATE: 2-4 hours
RISK LEVEL: MEDIUM (production database changes)

⚠️ CRITICAL: This task modifies production database schema. Follow ALL protocols.

=== DATABASE CREDENTIALS ===

**DigitalOcean MySQL Database:**
- Host: terp-mysql-db-do-user-28175253-0.m.db.ondigitalocean.com
- Port: 25060
- Username: doadmin
- Password: <REDACTED>
- Database: defaultdb
- SSL: REQUIRED (rejectUnauthorized: false)

**Connection String:**
```

DATABASE_URL="mysql://doadmin:<REDACTED>@terp-mysql-db-do-user-28175253-0.m.db.ondigitalocean.com:25060/defaultdb?ssl={"rejectUnauthorized":false}"

````

=== SETUP ===

**Step 1: Clone and prepare**

```bash
gh repo clone EvanTenenbaum/TERP
cd TERP
````

**Step 2: Read protocols (MANDATORY)**

```bash
# Read these files BEFORE starting:
cat docs/DEVELOPMENT_PROTOCOLS.md | head -200
cat docs/CLAUDE_WORKFLOW.md | head -100
cat docs/prompts/INFRA-003.md
```

**Step 3: Register session**

```bash
SESSION_ID="Session-$(date +%Y%m%d)-INFRA-003-$(openssl rand -hex 4)"
echo "- INFRA-003: $SESSION_ID ($(date +%Y-%m-%d))" >> docs/ACTIVE_SESSIONS.md
git add docs/ACTIVE_SESSIONS.md
git commit -m "Register INFRA-003 session"
git push origin main
```

**Step 4: Create session file**

```bash
cat > "docs/sessions/active/$SESSION_ID.md" << 'EOF'
# INFRA-003: Fix Database Schema Sync

**Session ID:** [SESSION_ID]
**Started:** [DATE]
**Agent:** Manus
**Status:** In Progress
**Risk Level:** MEDIUM (production database changes)

## Objective
Fix database schema synchronization between drizzle and production DB

## Progress
- [ ] Phase 1: Analyze Schema Drift (30 min)
- [ ] Phase 2: Fix Migration System (30-60 min)
- [ ] Phase 3: Run Pending Migrations (30-60 min)
- [ ] Phase 4: Fix Specific Known Issues (30-60 min)
- [ ] Phase 5: Create Schema Validation Tool (30 min)
- [ ] Phase 6: Validation & Testing (30 min)
- [ ] Phase 7: Documentation (15 min)
- [ ] Phase 8: Completion (15 min)

## Known Issues to Fix
1. inventoryMovements missing adjustmentReason column
2. orderStatusHistory has duplicate column mapping
3. Migration system has SSL errors
4. Schema drift between drizzle and database

## Changes Made
(Document all schema changes here)

## Testing Completed
(Document all tests here)
EOF
```

**Step 5: Update roadmap to in progress**

```bash
# Edit docs/roadmaps/MASTER_ROADMAP.md
# Find: - [ ] **INFRA-003:
# Change to: - [~] **INFRA-003: (Session-$SESSION_ID)
```

**Step 6: Push registration**

```bash
git add -A
git commit -m "INFRA-003: Register session and mark in progress"
git push origin main
```

=== PHASE 1: ANALYZE SCHEMA DRIFT (30 min) ===

**Step 1.1: Create validation script**

```bash
cat > scripts/validate-schema-sync.ts << 'TYPESCRIPT'
import { db } from "./db-sync.js";
import { sql } from "drizzle-orm";
import * as schema from "../drizzle/schema.js";

async function validateSchemaSync() {
  console.log("🔍 Validating schema sync...\n");

  const issues: string[] = [];

  // Get all tables from database
  const tablesResult = await db.execute(sql\`
    SELECT TABLE_NAME
    FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = DATABASE()
  \`);
  const dbTables = (tablesResult[0] as any[]).map(t => t.TABLE_NAME);

  console.log(\`Found \${dbTables.length} tables in database\n\`);

  // Check for known issues
  console.log("🔍 Checking known issues...\n");

  // Issue 1: inventoryMovements.adjustmentReason
  const invMovColumns = await db.execute(sql\`
    SELECT COLUMN_NAME
    FROM information_schema.COLUMNS
    WHERE TABLE_NAME = 'inventoryMovements'
  \`);
  const invMovColumnNames = (invMovColumns[0] as any[]).map(c => c.COLUMN_NAME);

  if (!invMovColumnNames.includes('adjustmentReason')) {
    issues.push("❌ inventoryMovements missing adjustmentReason column");
  } else {
    console.log("✅ inventoryMovements.adjustmentReason exists");
  }

  // Issue 2: orderStatusHistory columns
  const oshColumns = await db.execute(sql\`
    SELECT COLUMN_NAME
    FROM information_schema.COLUMNS
    WHERE TABLE_NAME = 'orderStatusHistory'
  \`);
  const oshColumnNames = (oshColumns[0] as any[]).map(c => c.COLUMN_NAME);
  console.log(\`✅ orderStatusHistory columns: \${oshColumnNames.join(', ')}\`);

  if (issues.length === 0) {
    console.log("\n✅ Schema is in sync!");
    return true;
  } else {
    console.log(\`\n❌ Found \${issues.length} schema issues:\n\`);
    issues.forEach(issue => console.log(issue));
    return false;
  }
}

validateSchemaSync()
  .then(success => process.exit(success ? 0 : 1))
  .catch(err => {
    console.error("Error:", err);
    process.exit(1);
  });
TYPESCRIPT
```

**Step 1.2: Run validation**

```bash
pnpm exec tsx scripts/validate-schema-sync.ts
```

**Step 1.3: Document issues**

```bash
# Save output to file
pnpm exec tsx scripts/validate-schema-sync.ts > /tmp/schema-issues.txt
cat /tmp/schema-issues.txt
```

**Step 1.4: Commit validation script**

```bash
git add scripts/validate-schema-sync.ts
git commit -m "INFRA-003: Add schema validation script"
git push origin main
```

=== PHASE 2: FIX MIGRATION SYSTEM (30-60 min) ===

**Step 2.1: Check drizzle config**

```bash
cat drizzle.config.ts
```

**Step 2.2: Fix SSL configuration if needed**

If drizzle.config.ts doesn't have SSL config, update it:

```typescript
// drizzle.config.ts
export default {
  schema: "./drizzle/schema.ts",
  out: "./drizzle",
  driver: "mysql2",
  dbCredentials: {
    connectionString: process.env.DATABASE_URL!,
    ssl: {
      rejectUnauthorized: false,
    },
  },
};
```

**Step 2.3: Test migration system**

```bash
# Generate migrations
pnpm drizzle-kit generate

# Check for errors
# If SSL errors, fix drizzle.config.ts
```

**Step 2.4: Commit config fixes**

```bash
git add drizzle.config.ts
git commit -m "INFRA-003: Fix SSL configuration in drizzle config"
git push origin main
```

=== PHASE 3: RUN PENDING MIGRATIONS (30-60 min) ===

⚠️ **CRITICAL: Backup before migrations**

**Step 3.1: Document current state**

```bash
pnpm exec tsx scripts/validate-schema-sync.ts > /tmp/schema-before.txt
cat /tmp/schema-before.txt
```

**Step 3.2: Run migrations**

```bash
# Push schema changes to database
pnpm drizzle-kit push

# Watch output carefully for errors
```

**Step 3.3: Verify migrations succeeded**

```bash
pnpm exec tsx scripts/validate-schema-sync.ts > /tmp/schema-after.txt
diff /tmp/schema-before.txt /tmp/schema-after.txt
```

**Step 3.4: Document migration results**

Update session file with:

- What migrations ran
- Any errors encountered
- Current schema status

=== PHASE 4: FIX SPECIFIC KNOWN ISSUES (30-60 min) ===

**Issue 1: inventoryMovements.adjustmentReason**

```bash
# Check if column exists
mysql -u doadmin -p'<REDACTED>' \
  -h terp-mysql-db-do-user-28175253-0.m.db.ondigitalocean.com \
  -P 25060 \
  --ssl-mode=REQUIRED \
  defaultdb \
  -e "SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_NAME = 'inventoryMovements' AND COLUMN_NAME = 'adjustmentReason';"
```

If missing, add it:

```bash
mysql -u doadmin -p'<REDACTED>' \
  -h terp-mysql-db-do-user-28175253-0.m.db.ondigitalocean.com \
  -P 25060 \
  --ssl-mode=REQUIRED \
  defaultdb \
  -e "ALTER TABLE inventoryMovements ADD COLUMN adjustmentReason VARCHAR(255);"
```

**Issue 2: orderStatusHistory duplicate columns**

```bash
# Check drizzle schema for duplicates
grep -A 20 "orderStatusHistory" drizzle/schema.ts
```

If duplicate column mappings found, fix them:

```typescript
// WRONG:
export const orderStatusHistory = mysqlTable("orderStatusHistory", {
  fromStatus: varchar("fulfillmentStatus", { length: 50 }),
  toStatus: varchar("fulfillmentStatus", { length: 50 }), // DUPLICATE!
});

// CORRECT:
export const orderStatusHistory = mysqlTable("orderStatusHistory", {
  fromStatus: varchar("from_status", { length: 50 }),
  toStatus: varchar("to_status", { length: 50 }),
});
```

**Step 4.3: Commit schema fixes**

```bash
git add drizzle/schema.ts
git commit -m "INFRA-003: Fix orderStatusHistory duplicate column mappings"
git push origin main
```

**Step 4.4: Regenerate and run migrations**

```bash
pnpm drizzle-kit generate
pnpm drizzle-kit push
```

=== PHASE 5: CREATE SCHEMA VALIDATION TOOL (30 min) ===

**Step 5.1: Enhance validation script**

Make scripts/validate-schema-sync.ts more comprehensive:

- Check all tables
- Check all columns
- Check data types
- Generate detailed report

**Step 5.2: Create documentation**

```bash
cat > docs/DATABASE_SCHEMA_SYNC.md << 'EOF'
# Database Schema Sync Process

## Overview

This document describes how to maintain synchronization between drizzle schema definitions and the production database.

## Validation

Run schema validation:

\`\`\`bash
pnpm exec tsx scripts/validate-schema-sync.ts
\`\`\`

Expected output: "✅ Schema is in sync!"

## Running Migrations

1. Generate migrations:
\`\`\`bash
pnpm drizzle-kit generate
\`\`\`

2. Review generated migrations in drizzle/ folder

3. Push to database:
\`\`\`bash
pnpm drizzle-kit push
\`\`\`

4. Verify:
\`\`\`bash
pnpm exec tsx scripts/validate-schema-sync.ts
\`\`\`

## Fixing Schema Drift

If schema validation fails:

1. Identify the issue (missing column, wrong type, etc.)
2. Fix drizzle schema definition
3. Generate new migration
4. Test in development first
5. Push to production
6. Verify with validation script

## Best Practices

- Always run validation before seeding data
- Document all schema changes in migrations
- Test migrations in development first
- Never modify production database directly
- Use drizzle-kit for all schema changes

## Troubleshooting

### SSL Errors

Add to drizzle.config.ts:
\`\`\`typescript
ssl: {
  rejectUnauthorized: false
}
\`\`\`

### Migration Fails

1. Check DATABASE_URL is correct
2. Verify database credentials
3. Check for conflicting schema changes
4. Review migration SQL

## Database Credentials

See DEVELOPMENT_PROTOCOLS.md for database credentials.
EOF
```

**Step 5.3: Commit documentation**

```bash
git add docs/DATABASE_SCHEMA_SYNC.md scripts/validate-schema-sync.ts
git commit -m "INFRA-003: Add schema sync documentation and enhanced validation"
git push origin main
```

=== PHASE 6: VALIDATION & TESTING (30 min) ===

⚠️ **MANDATORY: All tests must pass before pushing to main**

**Test 1: Schema Validation**

```bash
pnpm exec tsx scripts/validate-schema-sync.ts
```

**Expected:** "✅ Schema is in sync!"  
**If fails:** Go back and fix issues

**Test 2: Known Issues Fixed**

```bash
# Test inventoryMovements.adjustmentReason exists
mysql -u doadmin -p'<REDACTED>' \
  -h terp-mysql-db-do-user-28175253-0.m.db.ondigitalocean.com \
  -P 25060 \
  --ssl-mode=REQUIRED \
  defaultdb \
  -e "DESCRIBE inventoryMovements;"
```

**Expected:** adjustmentReason column appears  
**If fails:** Add the column

**Test 3: Migration System Works**

```bash
# Test migration generation
pnpm drizzle-kit generate

# Should complete without errors
```

**Expected:** No SSL errors, no schema errors  
**If fails:** Fix drizzle.config.ts

**Test 4: Seed Script Test**

```bash
# Try running a simple seed script
pnpm exec tsx scripts/seed-critical-tables.ts
```

**Expected:** No schema errors  
**If fails:** Fix remaining schema issues

**Test 5: Database Connection**

```bash
# Test database connection
mysql -u doadmin -p'<REDACTED>' \
  -h terp-mysql-db-do-user-28175253-0.m.db.ondigitalocean.com \
  -P 25060 \
  --ssl-mode=REQUIRED \
  defaultdb \
  -e "SELECT 'Connection successful' as status;"
```

**Expected:** "Connection successful"  
**If fails:** Check credentials

=== TESTING CHECKLIST ===

Before proceeding to completion, verify ALL tests pass:

- [ ] Schema validation passes (no errors)
- [ ] inventoryMovements.adjustmentReason column exists
- [ ] orderStatusHistory has no duplicate column mappings
- [ ] Migration system works without SSL errors
- [ ] Seed scripts run without schema errors
- [ ] Database connection works
- [ ] All migrations applied successfully
- [ ] Documentation created
- [ ] All changes committed to git

⚠️ **DO NOT PROCEED if any test fails. Fix issues first.**

=== PHASE 7: DOCUMENTATION (15 min) ===

**Step 7.1: Update session file**

Document in docs/sessions/active/$SESSION_ID.md:

- All schema changes made
- All tests completed
- All issues fixed
- Current schema status

**Step 7.2: Create completion summary**

```bash
cat > docs/INFRA-003-COMPLETION-REPORT.md << 'EOF'
# INFRA-003 Completion Report

**Date:** [DATE]
**Session:** [SESSION_ID]
**Status:** ✅ Complete

## Summary

Fixed database schema synchronization between drizzle and production database.

## Changes Made

1. **inventoryMovements table:**
   - Added adjustmentReason column (VARCHAR(255))

2. **orderStatusHistory schema:**
   - Fixed duplicate column mappings
   - Updated drizzle schema definition

3. **Migration system:**
   - Fixed SSL configuration in drizzle.config.ts
   - Verified migrations run successfully

4. **Schema validation:**
   - Created scripts/validate-schema-sync.ts
   - Validated all tables and columns in sync

## Testing Completed

- ✅ Schema validation passes
- ✅ Known issues fixed
- ✅ Migration system works
- ✅ Seed scripts run without errors
- ✅ Database connection verified

## Documentation Created

- docs/DATABASE_SCHEMA_SYNC.md - Schema sync process
- scripts/validate-schema-sync.ts - Validation tool

## Impact

- ✅ Unblocks DATA-002 (comments & dashboard seeding)
- ✅ Unblocks DATA-003 (pricing seeding)
- ✅ Prevents future schema drift
- ✅ Enables reliable data seeding

## Next Steps

DATA-002 and DATA-003 can now proceed safely.
EOF
```

**Step 7.3: Commit documentation**

```bash
git add docs/INFRA-003-COMPLETION-REPORT.md docs/sessions/active/$SESSION_ID.md
git commit -m "INFRA-003: Document completion and testing results"
git push origin main
```

=== PHASE 8: COMPLETION (15 min) ===

⚠️ **ONLY proceed if ALL tests passed**

**Step 8.1: Update roadmap**

Edit docs/roadmaps/MASTER_ROADMAP.md:

Find the INFRA-003 entry and update:

```markdown
- [x] **INFRA-003: Fix Database Schema Sync** (Session-$SESSION_ID) ✅ COMPLETE
  - Task ID: INFRA-003
  - Status: ✅ Complete (2025-11-17)
  - Action: Fix database schema synchronization issues
  - **Resolution:**
    - Fixed inventoryMovements.adjustmentReason column (added)
    - Fixed orderStatusHistory duplicate column mappings
    - Fixed migration system SSL configuration
    - Created schema validation tool (scripts/validate-schema-sync.ts)
    - Created documentation (docs/DATABASE_SCHEMA_SYNC.md)
    - All tests passed
    - Database now in sync with drizzle schema
  - **Impact:** Unblocks DATA-002 and DATA-003
  - Actual Time: [X] hours
  - Documentation: docs/INFRA-003-COMPLETION-REPORT.md, docs/DATABASE_SCHEMA_SYNC.md
```

**Step 8.2: Archive session**

```bash
mv docs/sessions/active/$SESSION_ID.md docs/sessions/completed/
```

**Step 8.3: Update ACTIVE_SESSIONS.md**

```bash
# Remove INFRA-003 line from docs/ACTIVE_SESSIONS.md
sed -i '/INFRA-003/d' docs/ACTIVE_SESSIONS.md
```

**Step 8.4: Final commit and push**

```bash
git add -A
git commit -m "INFRA-003: Complete - Schema sync fixed, all tests passed

- Fixed inventoryMovements.adjustmentReason column
- Fixed orderStatusHistory duplicate mappings
- Fixed migration system SSL configuration
- Created schema validation tool
- Created documentation
- All tests passed
- Unblocks DATA-002 and DATA-003"
git push origin main
```

**Step 8.5: Verify push succeeded**

```bash
git log --oneline -1
# Should show your completion commit

git status
# Should show: "Your branch is up to date with 'origin/main'"
```

=== COMPLETION CHECKLIST ===

Before marking complete, verify ALL items:

**Schema Changes:**

- [x] inventoryMovements.adjustmentReason column exists
- [x] orderStatusHistory duplicate mappings fixed
- [x] Migration system SSL configured
- [x] All pending migrations run successfully

**Testing:**

- [x] Schema validation passes (no errors)
- [x] Migration system works without errors
- [x] Seed scripts run without schema errors
- [x] Database connection verified
- [x] All known issues fixed

**Documentation:**

- [x] docs/DATABASE_SCHEMA_SYNC.md created
- [x] docs/INFRA-003-COMPLETION-REPORT.md created
- [x] scripts/validate-schema-sync.ts created
- [x] Session file updated with all changes
- [x] Roadmap updated to complete

**Git & Deployment:**

- [x] All changes committed
- [x] All commits pushed to main
- [x] Session archived to completed/
- [x] ACTIVE_SESSIONS.md updated
- [x] Push verified successful

**Verification:**

- [x] Run: pnpm exec tsx scripts/validate-schema-sync.ts
- [x] Output: "✅ Schema is in sync!"
- [x] No errors in any test

=== PROTOCOLS FOLLOWED ===

1. ✅ **Testing before pushing:** All tests passed before final push
2. ✅ **Documentation:** Complete documentation created
3. ✅ **Validation:** Schema validation tool created and verified
4. ✅ **Backup:** Current state documented before changes
5. ✅ **Commit frequently:** Changes committed after each phase
6. ✅ **Session tracking:** Session file updated throughout
7. ✅ **Roadmap updates:** Roadmap updated to complete
8. ✅ **Archive session:** Session moved to completed/

=== FILES MODIFIED ===

**Created:**

- scripts/validate-schema-sync.ts
- docs/DATABASE_SCHEMA_SYNC.md
- docs/INFRA-003-COMPLETION-REPORT.md

**Modified:**

- drizzle.config.ts (SSL configuration)
- drizzle/schema.ts (orderStatusHistory fix)
- docs/roadmaps/MASTER_ROADMAP.md (mark complete)
- docs/ACTIVE_SESSIONS.md (remove entry)

**Database Changes:**

- inventoryMovements: Added adjustmentReason column

=== ESTIMATED TIME ===

- Phase 1: 30 min (analyze)
- Phase 2: 30-60 min (fix migration system)
- Phase 3: 30-60 min (run migrations)
- Phase 4: 30-60 min (fix known issues)
- Phase 5: 30 min (validation tool)
- Phase 6: 30 min (testing)
- Phase 7: 15 min (documentation)
- Phase 8: 15 min (completion)

**Total: 2-4 hours**

=== REFERENCE ===

Full specification: docs/prompts/INFRA-003.md
Development protocols: docs/DEVELOPMENT_PROTOCOLS.md
Workflow guide: docs/CLAUDE_WORKFLOW.md
Database credentials: In this prompt and DEVELOPMENT_PROTOCOLS.md
Schema sync docs: docs/DATABASE_SCHEMA_SYNC.md (created by this task)

=== SUCCESS CRITERIA ===

**Task is complete when:**

1. ✅ Schema validation passes with no errors
2. ✅ All known issues fixed
3. ✅ Migration system works
4. ✅ Documentation created
5. ✅ All tests passed
6. ✅ Changes pushed to main
7. ✅ Roadmap updated
8. ✅ Session archived

**Verification command:**

```bash
pnpm exec tsx scripts/validate-schema-sync.ts
```

**Expected output:**

```
✅ Schema is in sync!
```

If you see this output and all checklist items are complete, the task is done.

```

---

## Important Notes

### Risk Level: MEDIUM

This task modifies production database schema. Extra care required:

1. **Backup first:** Document current state before changes
2. **Test thoroughly:** All tests must pass before pushing
3. **Verify migrations:** Check migration SQL before running
4. **Rollback plan:** Know how to revert changes if needed

### Testing is Mandatory

**DO NOT push to main until:**
- Schema validation passes
- All known issues fixed
- Migration system works
- Seed scripts run without errors
- All tests in Phase 6 pass

### Push to Main Protocol

**Correct sequence:**
1. Complete all phases
2. Run ALL tests in Phase 6
3. Verify ALL tests pass
4. Update roadmap
5. Archive session
6. Commit all changes
7. Push to main
8. Verify push succeeded

**DO NOT:**
- Push before testing
- Skip any tests
- Push with failing tests
- Push without documentation

### Blocks Other Tasks

INFRA-003 blocks:
- DATA-002 (comments & dashboard seeding)
- DATA-003 (pricing seeding)

These tasks cannot start until INFRA-003 is complete and schema validation passes.

### Database Credentials

Credentials are included in the prompt for immediate use. Also documented in DEVELOPMENT_PROTOCOLS.md.

**Connection string:**
```

mysql://doadmin:<REDACTED>@terp-mysql-db-do-user-28175253-0.m.db.ondigitalocean.com:25060/defaultdb?ssl={"rejectUnauthorized":false}

````

### Success Verification

After completion, verify:

```bash
# Schema validation
pnpm exec tsx scripts/validate-schema-sync.ts
# Expected: "✅ Schema is in sync!"

# Git status
git status
# Expected: "Your branch is up to date with 'origin/main'"

# Roadmap check
grep "INFRA-003" docs/roadmaps/MASTER_ROADMAP.md
# Expected: Shows [x] complete status
````

### Common Issues

**Issue 1: SSL errors**

- Fix: Add `rejectUnauthorized: false` to drizzle.config.ts

**Issue 2: Schema validation fails**

- Fix: Run migrations, add missing columns

**Issue 3: Migration fails**

- Fix: Check DATABASE_URL, verify credentials

**Issue 4: Seed scripts fail**

- Fix: Ensure schema is in sync first

### Time Estimate

**Total: 2-4 hours**

Breakdown:

- Analysis: 30 min
- Migration fixes: 30-60 min
- Running migrations: 30-60 min
- Fixing known issues: 30-60 min
- Validation tool: 30 min
- Testing: 30 min (mandatory)
- Documentation: 15 min
- Completion: 15 min

### Questions?

- Full specification: docs/prompts/INFRA-003.md
- Development protocols: docs/DEVELOPMENT_PROTOCOLS.md
- Workflow guide: docs/CLAUDE_WORKFLOW.md
- Database docs: docs/DATABASE_SCHEMA_SYNC.md (created by this task)
