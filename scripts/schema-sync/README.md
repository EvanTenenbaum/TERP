# TERP Schema Sync Scripts

Safe, automated schema management tools for the TERP ERP system.

## Overview

These scripts provide a safety-first approach to database schema management with:

- **Dry-run mode** for previewing changes
- **Checkpoint/rollback** capabilities
- **Staged rollout** support
- **Verification** after changes

## Scripts

### `validate.ts`

Validates the current schema state by analyzing Drizzle schema files and migration journal.

```bash
# Basic validation
pnpm tsx scripts/schema-sync/validate.ts

# Verbose output
pnpm tsx scripts/schema-sync/validate.ts --verbose

# JSON output (for CI/CD)
pnpm tsx scripts/schema-sync/validate.ts --json

# Strict mode (fail on warnings)
pnpm tsx scripts/schema-sync/validate.ts --strict
```

### `apply.ts`

Applies schema changes with safety features.

```bash
# Preview changes (ALWAYS run this first)
pnpm tsx scripts/schema-sync/apply.ts --dry-run

# Apply Stage 1 only (safe additions)
pnpm tsx scripts/schema-sync/apply.ts --stage=1

# Apply with checkpoint
pnpm tsx scripts/schema-sync/apply.ts --checkpoint

# Force apply (skip confirmation)
pnpm tsx scripts/schema-sync/apply.ts --force
```

**Stages:**

1. **Stage 1 (Safe):** New tables, nullable columns, indexes
2. **Stage 2 (Medium):** Column types, constraints, foreign keys
3. **Stage 3 (High Risk):** Renames, NOT NULL changes

### `rollback.ts`

Rolls back schema changes to a previous state.

```bash
# List available rollback targets
pnpm tsx scripts/schema-sync/rollback.ts --list

# Rollback to checkpoint
pnpm tsx scripts/schema-sync/rollback.ts --to-checkpoint=checkpoint-2026-01-02

# Rollback to migration
pnpm tsx scripts/schema-sync/rollback.ts --to-migration=25

# Dry-run rollback
pnpm tsx scripts/schema-sync/rollback.ts --to-checkpoint=<id> --dry-run
```

### `verify.ts`

Verifies schema state after changes.

```bash
# Basic verification
pnpm tsx scripts/schema-sync/verify.ts

# Verbose output
pnpm tsx scripts/schema-sync/verify.ts --verbose

# JSON output
pnpm tsx scripts/schema-sync/verify.ts --json
```

## Workflow

### Standard Schema Change Process

1. **Analyze current state:**

   ```bash
   pnpm tsx scripts/schema-sync/validate.ts --verbose
   ```

2. **Preview changes:**

   ```bash
   pnpm tsx scripts/schema-sync/apply.ts --dry-run
   ```

3. **Create backup:**

   ```bash
   bash scripts/backup-database.sh
   ```

4. **Apply Stage 1 (safe changes):**

   ```bash
   pnpm tsx scripts/schema-sync/apply.ts --stage=1 --checkpoint
   ```

5. **Verify:**

   ```bash
   pnpm tsx scripts/schema-sync/verify.ts
   ```

6. **Apply Stage 2 (if needed):**

   ```bash
   pnpm tsx scripts/schema-sync/apply.ts --stage=2
   ```

7. **Final verification:**
   ```bash
   pnpm tsx scripts/schema-sync/verify.ts
   pnpm test
   ```

### Rollback Process

If something goes wrong:

1. **List available targets:**

   ```bash
   pnpm tsx scripts/schema-sync/rollback.ts --list
   ```

2. **Rollback to checkpoint:**

   ```bash
   pnpm tsx scripts/schema-sync/rollback.ts --to-checkpoint=<id>
   ```

3. **Or restore from backup:**
   ```bash
   bash scripts/restore-database.sh <backup_file.sql.gz> --verify
   ```

## Safety Features

### Dry-Run Mode

All scripts support `--dry-run` to preview changes without applying them.

### Checkpoints

The `--checkpoint` flag creates a database backup before applying changes.

### Staged Rollout

Changes are categorized by risk level and can be applied in stages.

### Automatic Rollback

The `--rollback-on-error` flag (default: true) automatically rolls back on failure.

### Verification

The `verify.ts` script checks:

- Schema file integrity
- Migration journal validity
- Required tables exist
- Optimistic locking columns (DATA-005)
- Soft delete columns (ST-013)
- Backup infrastructure

## Integration with Existing Tools

These scripts complement existing TERP schema tools:

| Tool                          | Purpose                             |
| ----------------------------- | ----------------------------------- |
| `pnpm audit:schema-drift`     | Detect drift between Drizzle and DB |
| `pnpm validate:schema`        | Comprehensive schema validation     |
| `scripts/safe-schema-sync.sh` | Add missing columns safely          |
| `scripts/backup-database.sh`  | Create database backups             |
| `scripts/restore-database.sh` | Restore from backups                |

## Related Documentation

- [Sprint A Safe Execution Plan](../../docs/sprints/SPRINT_A_SAFE_EXECUTION_PLAN_v2.md)
- [Schema Analysis Report](../../docs/sprints/sprint-a-schema-analysis.md)
- [Database Schema Guide](../../docs/dev-guide/database-schema.md)

---

**Version:** 1.0.0  
**Created:** January 2, 2026  
**Sprint:** Sprint A - Backend Infrastructure & Schema
