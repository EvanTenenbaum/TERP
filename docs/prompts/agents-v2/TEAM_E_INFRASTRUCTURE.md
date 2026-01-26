# Agent Team E: Infrastructure & Schema

You are Agent Team E working on the TERP project. You MUST follow all protocols exactly as specified.

**Mode:** STRICT
**Branch:** `claude/team-e-infrastructure-{SESSION_ID}`
**Estimate:** 20-28 hours
**Dependencies:** None - START IMMEDIATELY

---

## YOUR TASKS

| Task      | Description                            | Estimate | Module                              |
| --------- | -------------------------------------- | -------- | ----------------------------------- |
| TERP-0004 | Add notifications table to autoMigrate | 2-4h     | `server/autoMigrate.ts`             |
| TERP-0006 | Add cleanup migrations (0053/0054)     | 4-8h     | `drizzle/`                          |
| TERP-0019 | Verify MySQL identifier length limits  | 2-4h     | `drizzle/schema.ts`                 |
| PARTY-002 | Add FK Constraints to Bills Table      | 2h       | `drizzle/schema.ts`                 |
| PARTY-003 | Migrate Lots to Use supplierClientId   | 8h       | `drizzle/schema.ts`, `inventory.ts` |
| BUILD-001 | Add VITE_APP_TITLE env variable        | 0.5h     | `.env.example`                      |
| BUILD-002 | Fix chunk size warnings                | 4h       | `vite.config.ts`                    |
| BUILD-003 | Add pnpm lint script                   | 0.5h     | `package.json`                      |
| OBS-001   | Add GL Balance Verification Cron       | 4h       | `server/cron/`                      |
| OBS-002   | Add AR Reconciliation Check            | 4h       | `server/cron/`                      |

---

## MANDATORY PROTOCOLS

### PHASE 1: Pre-Flight (15 minutes)

```bash
# Clone, setup, read protocols
gh repo clone EvanTenenbaum/TERP && cd TERP && pnpm install
cat CLAUDE.md
cat docs/TERP_AGENT_INSTRUCTIONS.md
cat .kiro/steering/08-adaptive-qa-protocol.md

# Generate Session ID
SESSION_ID="Session-$(date +%Y%m%d)-TEAM-E-INFRA-$(openssl rand -hex 4)"
git pull --rebase origin main
```

### PHASE 2: Session Registration (10 minutes)

```bash
cat > "docs/sessions/active/${SESSION_ID}.md" << 'EOF'
# Team E: Infrastructure & Schema

**Session ID:** ${SESSION_ID}
**Agent:** Team E
**Started:** $(date +%Y-%m-%d)
**Status:** In Progress
**Mode:** STRICT

## Tasks
- [ ] TERP-0004: Add notifications table to autoMigrate
- [ ] TERP-0006: Add cleanup migrations (0053/0054)
- [ ] TERP-0019: Verify MySQL identifier length limits
- [ ] PARTY-002: Add FK Constraints to Bills Table
- [ ] PARTY-003: Migrate Lots to Use supplierClientId
- [ ] BUILD-001: Add VITE_APP_TITLE env variable
- [ ] BUILD-002: Fix chunk size warnings
- [ ] BUILD-003: Add pnpm lint script
- [ ] OBS-001: Add GL Balance Verification Cron
- [ ] OBS-002: Add AR Reconciliation Check

## Progress Notes
Starting infrastructure work...
EOF

echo "- Team-E: ${SESSION_ID} - Infrastructure" >> docs/ACTIVE_SESSIONS.md
git checkout -b "claude/team-e-infrastructure-${SESSION_ID}"
git add docs/sessions/active/ docs/ACTIVE_SESSIONS.md
git commit -m "chore: register Team E Infrastructure session"
git push -u origin "claude/team-e-infrastructure-${SESSION_ID}"
```

### PHASE 3: Implementation

#### Execution Order

```
Batch 1: Critical Schema (2-4h)
└── TERP-0004: Notifications table
    - Add CREATE TABLE IF NOT EXISTS
    - Include indexes and FKs
    - Idempotent execution

Batch 2: Cleanup Migrations (4-8h)
├── TERP-0006: 0053/0054 migrations
│   - Dashboard preferences index fix
│   - Long constraint name cleanup
└── TERP-0019: Identifier verification
    - Check MySQL 64-char limit
    - Document findings

Batch 3: Party Model Schema (8h)
├── PARTY-002: Bills FK constraints
│   - Add foreign keys with proper names
└── PARTY-003: Lots supplierClientId
    - Add nullable column
    - Migration to populate from vendorId
    - Update inventory queries

Batch 4: Build Config (4h)
├── BUILD-001: VITE_APP_TITLE
├── BUILD-002: Chunk splitting
│   - Configure manualChunks in vite.config.ts
│   - Split vendor chunks
└── BUILD-003: Lint script
    - Add "lint": "eslint client/src server"
    - Add "lint:fix": "eslint --fix"

Batch 5: Observability (4h each)
├── OBS-001: GL Balance Cron
│   - Daily check: SUM(debits) = SUM(credits)
│   - Alert if > $0.01 difference
└── OBS-002: AR Reconciliation
    - Compare invoices.amountDue vs clients.totalOwed
    - Alert on mismatches
```

### STRICT Mode: Migration Testing

**For every schema change:**

```bash
# 1. Test on fresh database
pnpm db:push  # Clean schema push

# 2. Test on existing database with data
# Apply migration incrementally

# 3. Verify rollback exists
# Document rollback steps

# 4. Check identifier lengths
mysql> SELECT
  TABLE_NAME,
  CONSTRAINT_NAME,
  LENGTH(CONSTRAINT_NAME) as len
FROM information_schema.KEY_COLUMN_USAGE
WHERE LENGTH(CONSTRAINT_NAME) > 60;
```

### Migration File Template

```sql
-- drizzle/0053_fix_dashboard_preferences_index.sql
-- Description: Fix dashboard preferences unique index
-- Rollback: DROP INDEX IF EXISTS ...; CREATE INDEX ...

-- Step 1: Remove conflicting index (if exists)
DROP INDEX IF EXISTS `dashboard_preferences_user_idx` ON `dashboard_preferences`;

-- Step 2: Create correct index
CREATE INDEX `user_idx` ON `dashboard_preferences` (`user_id`);

-- Verification: SELECT * FROM information_schema.STATISTICS WHERE TABLE_NAME = 'dashboard_preferences';
```

### PHASE 4: Validation

```bash
# Schema verification
pnpm db:push  # Should succeed
pnpm check    # TypeScript types match schema
pnpm test     # Migration tests pass

# Build verification
pnpm build    # No chunk warnings
pnpm lint     # Script exists and works

# Full verification
pnpm check && pnpm lint && pnpm test && pnpm build
```

### PHASE 5: Completion

```bash
git commit -m "complete: Team E Infrastructure

Schema work:
- TERP-0004: Notifications autoMigrate
- TERP-0006: Cleanup migrations 0053/0054
- TERP-0019: Identifier limits verified
- PARTY-002/003: Bills FK and Lots migration

Build config:
- BUILD-001/002/003: Env, chunks, lint script

Observability:
- OBS-001: GL balance cron
- OBS-002: AR reconciliation cron

All migrations tested on fresh and existing DBs.
All tests passing."
```

---

## Required Output Format

```markdown
## Team E Verification Results

✅ **Verified:**

- pnpm check: PASS
- pnpm lint: PASS
- pnpm test: PASS
- pnpm build: PASS (no chunk warnings)
- pnpm db:push: PASS (schema valid)

🗃️ **Migrations Created:**

- drizzle/0053_fix_dashboard_preferences_index.sql
- drizzle/0054_fix_long_constraint_names.sql

📊 **Schema Changes:**

- notifications table: autoMigrate enabled
- bills: FK constraints added
- lots: supplierClientId column added

⚠️ **Risk Notes:**

- PARTY-003 migration needs data backfill
- Long constraint names in legacy DBs need cleanup

🔁 **Rollback Plan:**

- Each migration has documented rollback steps
- Schema changes are additive (no data loss)

🟥 **RedHat QA (STRICT):**

- Migrations tested: fresh DB + existing DB
- Identifier lengths: all < 64 chars
- FK constraints: proper naming convention
```

---

## Schema Change Rules

1. **ALWAYS use idempotent migrations** - IF NOT EXISTS
2. **ALWAYS test on fresh AND existing databases**
3. **ALWAYS document rollback steps**
4. **NEVER drop columns without data migration**
5. **ALWAYS check MySQL identifier length limits (64 chars)**
