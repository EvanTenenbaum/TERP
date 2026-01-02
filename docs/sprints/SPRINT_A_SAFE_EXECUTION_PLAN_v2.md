# Sprint A: Safe Execution Plan (v2.0 - RedHat QA Corrected)

**Version:** 2.0  
**Created:** January 2, 2026  
**Status:** APPROVED FOR EXECUTION  
**RedHat QA Status:** ✅ All Critical Issues Addressed

---

## Executive Summary

This document outlines a risk-minimized, safety-first approach to Sprint A (Backend Infrastructure & Schema). Every change is designed to be:

1. **Reversible** - Full rollback capability at each checkpoint
2. **Verifiable** - QA gates before and after each change
3. **Isolated** - Changes don't affect other system components
4. **Incremental** - Small, testable steps instead of big-bang changes

---

## Core Safety Principles

1. **Read Before Write** - Every phase starts with analysis and validation before any modifications
2. **Dry-Run First** - All scripts support `--dry-run` mode to preview changes without applying them
3. **Checkpoint & Rollback** - Each phase creates a checkpoint that can be rolled back to
4. **Blast Radius Containment** - Changes are isolated to prevent cascading failures
5. **Verification Gates** - No phase proceeds until the previous phase passes QA

---

## Risk Assessment Matrix

| Task                            | Risk Level | Blast Radius             | Rollback Complexity      | Mitigation                     |
| ------------------------------- | ---------- | ------------------------ | ------------------------ | ------------------------------ |
| Schema Analysis                 | 🟢 LOW     | None (read-only)         | N/A                      | None needed                    |
| Migration Consolidation         | 🟡 MEDIUM  | Migration files only     | Simple (git revert)      | Dry-run first                  |
| Schema Export Fix               | 🟢 LOW     | Single file              | Simple (git revert)      | Code review                    |
| Database Migration              | 🔴 HIGH    | Production DB            | Complex (backup restore) | Full backup, staged rollout    |
| Optimistic Locking Verification | 🟢 LOW     | None (verification only) | N/A                      | Already implemented (DATA-005) |
| Backup Automation               | 🟢 LOW     | Scripts only             | Simple (disable cron)    | Test in staging first          |
| Index Changes                   | 🟡 MEDIUM  | Query performance        | Medium (drop indexes)    | Performance baseline first     |

---

## Execution Phases

### 🔵 PHASE 0: Pre-Flight Checks & Baseline Capture

**Duration:** 1 hour | **Risk:** 🟢 LOW | **Rollback:** N/A (read-only)

#### Objectives

- Register session per TERP protocols (MANDATORY)
- Capture current system state as baseline
- Verify all prerequisites are met
- Create recovery documentation

#### Tasks

| Step | Task                               | Command                                                        | Verification                       | Rollback |
| ---- | ---------------------------------- | -------------------------------------------------------------- | ---------------------------------- | -------- |
| 0.0  | **Register Session (MANDATORY)**   | See session registration below                                 | Session file created and pushed    | N/A      |
| 0.1  | Pull latest code from main         | `git pull origin main`                                         | `git log -1` shows expected commit | N/A      |
| 0.2  | Check for conflicting sessions     | `cat docs/ACTIVE_SESSIONS.md`                                  | No conflicts with schema work      | N/A      |
| 0.3  | Capture current schema state       | `pnpm audit:schema-drift 2>&1 \| tee /tmp/schema-baseline.txt` | Report generated                   | N/A      |
| 0.4  | Export current migration journal   | `ls -la drizzle/meta/ > /tmp/migration-journal.txt`            | Journal captured                   | N/A      |
| 0.5  | Run existing test suite            | `pnpm typecheck && pnpm lint && pnpm test`                     | All checks pass                    | N/A      |
| 0.6  | Document current deployment status | `curl -s https://terp-app-b9s35.ondigitalocean.app/health`     | Health check returns 200 OK        | N/A      |
| 0.7  | Create baseline Git tag            | `git tag baseline-sprint-a-$(date +%Y%m%d)`                    | Tag created                        | N/A      |

#### Session Registration (MANDATORY - Step 0.0)

```bash
# Generate session ID
SESSION_ID="Session-$(date +%Y%m%d)-SPRINT-A-$(openssl rand -hex 3)"
echo "Session ID: $SESSION_ID"

# Create session file
mkdir -p docs/sessions/active
cat > docs/sessions/active/$SESSION_ID.md << EOF
# Session: SPRINT-A - Backend Infrastructure & Schema

**Status**: In Progress
**Started**: $(date)
**Agent Type**: External (Manus)
**Platform**: Manus AI Agent
**Sprint**: Sprint A - Safe Execution Plan v2.0

## Files Being Modified
- drizzle/schema.ts
- drizzle/migrations/*
- scripts/schema-sync/* (new)
- scripts/restore-database.sh (new)
- docs/roadmaps/MASTER_ROADMAP.md

## Progress
- [ ] Phase 0: Pre-Flight Checks
- [ ] Phase 1: Schema Analysis
- [ ] Phase 2: Automation Tooling
- [ ] Phase 3: Schema Sync
- [ ] Phase 4: Infrastructure Improvements
- [ ] Phase 5: Final QA

## Notes
Following Sprint A Safe Execution Plan v2.0 with all RedHat QA corrections applied.
EOF

# Add to active sessions
echo "| $SESSION_ID | SPRINT-A | main | drizzle, scripts | In Progress | $(date +%Y-%m-%d) | TBA |" >> docs/ACTIVE_SESSIONS.md

# Commit and push IMMEDIATELY
git add docs/sessions/active/$SESSION_ID.md docs/ACTIVE_SESSIONS.md
git commit -m "chore: register session $SESSION_ID for Sprint A execution"
git push origin main
```

#### QA Gate 0

- [ ] Session registered and pushed to main
- [ ] All baseline data captured and saved
- [ ] `pnpm typecheck` passes
- [ ] `pnpm lint` passes
- [ ] `pnpm test` passes (or known failures documented)
- [ ] Health check returns 200 OK
- [ ] Baseline tag created
- [ ] No conflicting sessions in ACTIVE_SESSIONS.md

**🛑 STOP if QA Gate 0 fails. Do not proceed.**

---

### 🔵 PHASE 1: Schema Analysis & Validation (Read-Only)

**Duration:** 2 hours | **Risk:** 🟢 LOW | **Rollback:** N/A (read-only)

#### Objectives

- Understand exact schema drift between Drizzle and production DB
- Identify all missing tables, columns, and constraints
- Generate detailed diff report

#### Tasks

| Step | Task                                | Command                                                           | Verification        | Rollback |
| ---- | ----------------------------------- | ----------------------------------------------------------------- | ------------------- | -------- |
| 1.1  | Run schema drift detection          | `pnpm audit:schema-drift`                                         | Report generated    | N/A      |
| 1.2  | Run comprehensive schema validation | `pnpm validate:schema`                                            | Validation complete | N/A      |
| 1.3  | Generate fix report                 | `pnpm audit:schema-drift:fix 2>&1 \| tee /tmp/schema-fixes.txt`   | Fix SQL documented  | N/A      |
| 1.4  | Review existing migrations          | `ls -la drizzle/migrations/*.sql \| wc -l`                        | Count documented    | N/A      |
| 1.5  | Check for duplicate migrations      | `ls drizzle/migrations/*.sql \| cut -d'_' -f1 \| sort \| uniq -d` | No duplicates       | N/A      |
| 1.6  | Document remediation plan           | Save to `docs/sprints/sprint-a-remediation.md`                    | Plan documented     | N/A      |

#### QA Gate 1

- [ ] Schema drift report is complete
- [ ] All discrepancies are documented
- [ ] Remediation SQL is reviewed
- [ ] No unexpected issues discovered
- [ ] `pnpm typecheck && pnpm lint` still passes

**🛑 STOP if QA Gate 1 reveals unexpected complexity. Escalate for review.**

---

### 🔵 PHASE 2: Create/Verify Automation Tooling

**Duration:** 3 hours | **Risk:** 🟢 LOW | **Rollback:** Git revert

#### Objectives

- Create safe, idempotent scripts for schema operations (in `scripts/schema-sync/`)
- All scripts support dry-run mode
- Scripts include verification and rollback capabilities
- Create secure database restore script

#### Tasks

| Step | Task                                                   | Verification                         | Rollback                      |
| ---- | ------------------------------------------------------ | ------------------------------------ | ----------------------------- |
| 2.0  | Create `scripts/schema-sync/` directory                | Directory exists                     | `rm -rf scripts/schema-sync/` |
| 2.1  | Create `scripts/schema-sync/validate.ts`               | Script runs without errors           | `git checkout scripts/`       |
| 2.2  | Create `scripts/schema-sync/apply.ts` with `--dry-run` | Dry-run outputs expected SQL         | `git checkout scripts/`       |
| 2.3  | Create `scripts/schema-sync/rollback.ts`               | Rollback script tested               | `git checkout scripts/`       |
| 2.4  | Create `scripts/schema-sync/verify.ts`                 | Verification passes on current state | `git checkout scripts/`       |
| 2.5  | Create `scripts/restore-database.sh`                   | Mirrors security of backup script    | `git checkout scripts/`       |
| 2.6  | Add comprehensive logging                              | Logs capture all operations          | `git checkout scripts/`       |
| 2.7  | Test all scripts in dry-run mode                       | No errors, expected output           | `git checkout scripts/`       |

#### Script Safety Features (Required)

```typescript
// Every script must include:
interface ScriptOptions {
  dryRun: boolean; // Preview mode - no changes
  verbose: boolean; // Detailed logging
  checkpoint: boolean; // Create checkpoint before changes
  verify: boolean; // Run verification after changes
  rollbackOnError: boolean; // Auto-rollback on failure
}
```

#### QA Gate 2

- [ ] All scripts created and tested in dry-run mode
- [ ] Scripts include proper error handling
- [ ] Rollback script tested and working
- [ ] `scripts/restore-database.sh` created with secure credential handling
- [ ] Code review completed
- [ ] `pnpm typecheck && pnpm lint && pnpm test` passes

**🛑 STOP if scripts have bugs. Fix before proceeding.**

---

### 🔴 PHASE 3: Execute Schema Sync (HIGH RISK)

**Duration:** 4 hours | **Risk:** 🔴 HIGH | **Rollback:** Database restore

#### Pre-Execution Checklist

- [ ] **MANDATORY:** Full database backup completed via `bash scripts/backup-database.sh`
- [ ] **MANDATORY:** Backup verified (test restore to staging)
- [ ] **MANDATORY:** Maintenance window scheduled (if needed)
- [ ] **MANDATORY:** Rollback procedure documented and tested
- [ ] **MANDATORY:** Team notified of changes

#### Execution Strategy: Staged Rollout

Instead of applying all changes at once, we use a staged approach:

**Stage 3.1: Non-Breaking Additions (Safe)**

- Add new tables that don't affect existing functionality
- Add new columns with NULL defaults
- Add new indexes

**Stage 3.2: Schema Fixes (Medium Risk)**

- Fix column types
- Add missing constraints
- Update foreign keys

**Stage 3.3: Breaking Changes (High Risk)**

- Rename columns (if any)
- Change NOT NULL constraints
- Modify existing FKs

#### Tasks

| Step | Task                         | Command                                                     | Verification                      | Rollback                           |
| ---- | ---------------------------- | ----------------------------------------------------------- | --------------------------------- | ---------------------------------- |
| 3.0  | CREATE FULL BACKUP           | `bash scripts/backup-database.sh`                           | Backup file exists, size verified | N/A                                |
| 3.1  | Run dry-run of Stage 3.1     | `pnpm tsx scripts/schema-sync/apply.ts --dry-run --stage=1` | Review SQL output                 | N/A                                |
| 3.2  | Apply Stage 3.1 changes      | `pnpm tsx scripts/schema-sync/apply.ts --stage=1`           | Verify new tables exist           | `bash scripts/restore-database.sh` |
| 3.3  | Run verification script      | `pnpm tsx scripts/schema-sync/verify.ts`                    | All Stage 3.1 changes confirmed   | `bash scripts/restore-database.sh` |
| 3.4  | CHECKPOINT 3.1               | `bash scripts/backup-database.sh`                           | Incremental backup created        | N/A                                |
| 3.5  | Run dry-run of Stage 3.2     | `pnpm tsx scripts/schema-sync/apply.ts --dry-run --stage=2` | Review SQL output                 | N/A                                |
| 3.6  | Apply Stage 3.2 changes      | `pnpm tsx scripts/schema-sync/apply.ts --stage=2`           | Verify constraints                | Restore to Checkpoint 3.1          |
| 3.7  | Run verification script      | `pnpm tsx scripts/schema-sync/verify.ts`                    | All Stage 3.2 changes confirmed   | Restore to Checkpoint 3.1          |
| 3.8  | CHECKPOINT 3.2               | `bash scripts/backup-database.sh`                           | Incremental backup created        | N/A                                |
| 3.9  | Run application health check | `curl https://terp-app-b9s35.ondigitalocean.app/health`     | API responds correctly            | Restore to Checkpoint 3.2          |
| 3.10 | Run test suite               | `pnpm typecheck && pnpm lint && pnpm test`                  | Tests pass                        | Restore to Checkpoint 3.2          |

#### QA Gate 3

- [ ] All schema changes applied successfully
- [ ] Verification script passes
- [ ] Application health check passes
- [ ] `pnpm typecheck` passes
- [ ] `pnpm lint` passes
- [ ] `pnpm test` passes
- [ ] No errors in application logs

**🔴 ROLLBACK TRIGGER:** If any verification fails, immediately restore from most recent checkpoint using `bash scripts/restore-database.sh`.

---

### 🟡 PHASE 4: Infrastructure Improvements (Isolated)

**Duration:** 4 hours | **Risk:** 🟡 MEDIUM | **Rollback:** Git revert + config restore

#### Objectives

- Verify existing implementations (optimistic locking already complete)
- Enhance backup automation
- Add performance indexes

#### Task 4.1: Verify Optimistic Locking (DATA-005 - Already Implemented)

| Step  | Task                              | Command                                                | Verification                                         | Rollback |
| ----- | --------------------------------- | ------------------------------------------------------ | ---------------------------------------------------- | -------- |
| 4.1.1 | Verify version columns exist      | `grep -r "version.*int.*default(1)" drizzle/schema.ts` | Columns found in clients, batches, orders, inventory | N/A      |
| 4.1.2 | Verify optimistic locking utility | `cat server/_core/optimisticLocking.ts`                | Utility exists and functional                        | N/A      |
| 4.1.3 | Test optimistic locking in action | `pnpm test -- --grep "optimistic"`                     | Tests pass                                           | N/A      |
| 4.1.4 | Document verification             | Update sprint docs                                     | Documented                                           | N/A      |

#### Task 4.2: Automated Backups (Using Existing Infrastructure)

| Step  | Task                         | Command                                  | Verification         | Rollback          |
| ----- | ---------------------------- | ---------------------------------------- | -------------------- | ----------------- |
| 4.2.1 | Verify backup script         | `bash scripts/backup-database.sh --help` | Script runs          | N/A               |
| 4.2.2 | Test backup to local storage | `bash scripts/backup-database.sh`        | Backup file created  | N/A               |
| 4.2.3 | Verify S3 configuration      | Check `AWS_S3_BUCKET` env var            | S3 upload configured | N/A               |
| 4.2.4 | Setup cron job               | `bash scripts/setup-backup-cron.sh`      | Cron entry exists    | Remove cron entry |
| 4.2.5 | Verify backup status         | `bash scripts/check-backup-status.sh`    | Status healthy       | N/A               |

#### Task 4.3: Database Indexes (Performance)

| Step  | Task                               | Command                                                                | Verification                   | Rollback              |
| ----- | ---------------------------------- | ---------------------------------------------------------------------- | ------------------------------ | --------------------- |
| 4.3.1 | Capture query performance baseline | `pnpm tsx scripts/analyze-schema-indexes.py > /tmp/index-baseline.txt` | Metrics saved                  | N/A                   |
| 4.3.2 | Create index migration (dry-run)   | Review existing `0038_add_missing_indexes.sql`                         | Review SQL                     | N/A                   |
| 4.3.3 | Apply indexes one at a time        | Via Drizzle migration                                                  | Index exists                   | `DROP INDEX`          |
| 4.3.4 | Measure query performance          | Compare to baseline                                                    | Performance improved or stable | `DROP INDEX` if worse |

#### QA Gate 4

- [ ] Optimistic locking verified as functional (DATA-005 complete)
- [ ] Backup system tested and working
- [ ] Performance not degraded
- [ ] `pnpm typecheck && pnpm lint && pnpm test` passes

---

### 🔵 PHASE 5: Final QA & Documentation

**Duration:** 2 hours | **Risk:** 🟢 LOW | **Rollback:** N/A

#### Tasks

| Step | Task                     | Command                                                 | Verification            |
| ---- | ------------------------ | ------------------------------------------------------- | ----------------------- |
| 5.1  | Run full test suite      | `pnpm test`                                             | All tests pass          |
| 5.2  | Run E2E tests            | `pnpm test:e2e`                                         | Critical paths work     |
| 5.3  | Run TypeScript check     | `pnpm typecheck`                                        | No errors               |
| 5.4  | Run linting              | `pnpm lint`                                             | No errors               |
| 5.5  | Verify production health | `curl https://terp-app-b9s35.ondigitalocean.app/health` | Health check passes     |
| 5.6  | Document all changes     | Update `docs/CHANGELOG.md`                              | Changelog updated       |
| 5.7  | Update MASTER_ROADMAP.md | Mark Sprint A tasks complete                            | Tasks marked complete   |
| 5.8  | Validate roadmap         | `pnpm roadmap:validate`                                 | Validation passes       |
| 5.9  | Create rollback runbook  | `docs/sprints/sprint-a-rollback-runbook.md`             | Documented and reviewed |
| 5.10 | Archive session          | Move to `docs/sessions/completed/`                      | Session archived        |

#### Session Archival (MANDATORY)

```bash
# Archive session in SAME commit as final changes
mv docs/sessions/active/$SESSION_ID.md docs/sessions/completed/

# Remove from active sessions (edit docs/ACTIVE_SESSIONS.md)

# Validate sessions
pnpm validate:sessions

# Final commit
git add -A
git commit -m "feat(sprint-a): complete Sprint A - Backend Infrastructure & Schema

- Schema drift analysis and remediation complete
- Automation tooling created (scripts/schema-sync/)
- Database restore script added
- Optimistic locking verified (DATA-005)
- Backup automation verified
- All QA gates passed

Session: $SESSION_ID archived"
git push origin main
```

#### Final QA Gate

- [ ] All tests pass (`pnpm test`)
- [ ] E2E tests pass (`pnpm test:e2e`)
- [ ] TypeScript check passes (`pnpm typecheck`)
- [ ] Linting passes (`pnpm lint`)
- [ ] Production is healthy
- [ ] Documentation is complete
- [ ] Roadmap validated (`pnpm roadmap:validate`)
- [ ] Rollback procedures are documented
- [ ] Session archived
- [ ] Other teams notified

---

## Rollback Procedures

### Level 1: Code Rollback (Low Impact)

```bash
# Revert to baseline tag
git checkout baseline-sprint-a-YYYYMMDD
git push origin main --force  # Only if not merged
```

### Level 2: Migration Rollback (Medium Impact)

```bash
# Run rollback migration
pnpm tsx scripts/schema-sync/rollback.ts --to-checkpoint <checkpoint_id>
```

### Level 3: Full Database Restore (High Impact)

```bash
# Use secure restore script (mirrors backup-database.sh security)
bash scripts/restore-database.sh --backup-file <backup_file>

# Or manual process:
# 1. Stop application
doctl apps update <app_id> --spec '{"services":[{"instance_count":0}]}'

# 2. Restore database (credentials via .my.cnf or MYSQL_PWD)
bash scripts/restore-database.sh --backup-file backup_YYYYMMDD_HHMMSS.sql.gz

# 3. Restart application
doctl apps update <app_id> --spec '{"services":[{"instance_count":1}]}'

# 4. Verify health
curl https://terp-app-b9s35.ondigitalocean.app/health
```

---

## Monitoring During Execution

### Key Metrics to Watch

- Application response time
- Error rate in logs
- Database connection pool usage
- Memory usage
- API endpoint availability

### Alert Triggers (Stop & Rollback)

- Error rate > 1%
- Response time > 5s
- Health check fails
- Any 500 errors in logs

---

## Communication Protocol

### Before Starting

- [ ] Notify team of maintenance window
- [ ] Share this execution plan
- [ ] Confirm rollback procedures understood

### During Execution

- [ ] Update status after each phase
- [ ] Immediately report any issues
- [ ] Document any deviations from plan

### After Completion

- [ ] Send completion summary
- [ ] Share any lessons learned
- [ ] Update roadmap status

---

## Approval Checklist

Before executing this plan:

- [x] **RedHat QA Review:** All critical issues addressed (v2.0)
- [ ] **Technical Review:** Plan reviewed by senior engineer
- [ ] **Backup Verified:** Full backup tested and verified
- [ ] **Rollback Tested:** Rollback procedure tested in staging
- [ ] **Team Notified:** All stakeholders aware of changes
- [ ] **Monitoring Ready:** Alerts and dashboards configured

---

**Document Version:** 2.0  
**Created:** January 2, 2026  
**RedHat QA Corrections Applied:** January 2, 2026  
**Status:** READY FOR EXECUTION
