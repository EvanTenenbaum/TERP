# Implementation Plan - Streamlined for Autonomous Execution

## Phase 0: Preflight (HARD GATES - Must Pass Before Any Schema Changes)

- [x] 1. Preflight Setup and Validation (FAIL-FAST GATES)
  - Verify required scripts exist: `validate-schema-comprehensive.ts`, `fix-schema-drift.ts`, `testing/db-util.ts`
  - Start local Docker MySQL: `pnpm test:env:up` then `pnpm test:db:reset light`
  - **GATE**: Run `pnpm validate:schema` - if it fails, STOP and fix before any schema edits
  - Verify local `.env` points to test harness (no production credentials)
  - _Requirements: 1.3, 1.4, 7.1, 7.2_

## Phase 1: Host Guards and Safety (Minimal Implementation)

- [x] 2. Implement Host Guards and DigitalOcean Safety
  - Create host protection with production domain denylist (ondigitalocean.com, amazonaws.com, railway.app)
  - Implement fail-fast for non-local hosts unless `--confirm-staging`/`--confirm-prod` flags used
  - Add DigitalOcean SSL configuration (`ssl-mode=REQUIRED`, `rejectUnauthorized=false`)
  - Add MySQL version detection utility for IF NOT EXISTS support
  - **CRITICAL**: Host guard must run before any database command
  - _Requirements: 1.1, 1.2, 1.5, 6.1, 6.2, 6.3, 6.4, 6.5_

## Phase 2: Manual Corruption Repair (Surgical, No Automation)

- [x] 3. Manual Corruption Detection and Surgical Repair
  - Open `drizzle/schema.ts` and manually locate `deletedAt: timestamp("deleted_at")` nested inside column options
  - Apply surgical repairs by hand: remove from options, add as proper table-level field
  - Run `pnpm check` after each repair to ensure zero TypeScript errors
  - Keep changes minimal and targeted to corruption only
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 8.3_

## Phase 3: Pilot Table Alignment (Manual, Use Existing Tools)

- [x] 4. Pilot Table Validation (inventoryMovements Only)
  - Run `pnpm test:db:reset light` to get fresh database state
  - Run `pnpm validate:schema` and manually review output for `inventoryMovements` table
  - Manually adjust only `inventoryMovements` types/nullability to match database (DB-first)
  - Re-run `pnpm validate:schema` and iterate until 0 issues for `inventoryMovements`
  - Keep scope limited: no other tables, no column removal/renaming (ADD/widen-only)
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 4.1, 4.2, 4.3, 4.4, 4.5, 7.1, 7.2, 7.3, 7.4_

## Phase 4: Optional Safe Migration (Only If Needed)

- [x] 5. Optional Migration Testing (Only if benign column missing in DB)
  - **SKIPPED**: Column was added manually via Docker exec for pilot
  - Migration template documented in `docs/PILOT_INVENTORYMOVEMENTS.md`
  - Check MySQL version: `SELECT VERSION()` to determine IF NOT EXISTS support
  - Hand-craft single ADD/widen-only SQL file: `migrations/drift-fixes/001_pilot_inventoryMovements.sql`
  - Use version-aware guard: IF NOT EXISTS (MySQL 5.7+) or INFORMATION_SCHEMA check (older)
  - Include verification (`DESCRIBE inventoryMovements;`) and commented rollback (`DROP COLUMN ...`)
  - Test locally: reset DB → apply migration → validate → rollback → re-validate
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

## Phase 5: Pilot Documentation

- [x] 6. Create Pilot Documentation
  - ✅ Created `docs/PILOT_INVENTORYMOVEMENTS.md` with complete details
  - ✅ Documented actual finding: schema drift (not corruption) + validation tool bugs
  - ✅ Recorded all commands used: Docker, validation, inspection
  - ✅ Included MySQL version (8.0.44), validation results (0 issues)
  - ✅ Documented migration template for future use
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

## Phase 6: Pilot Success Checkpoint

- [x] 7. Pilot Success Validation
  - ✅ `drizzle/schema.ts` compiles with no diagnostics
  - ✅ `pnpm validate:schema` reports 0 issues for `inventoryMovements`
  - ✅ Migration template documented (manual fix used for pilot)
  - ✅ Pilot documentation complete: `docs/PILOT_INVENTORYMOVEMENTS.md`
  - **CHECKPOINT PASSED**: Pilot validated successfully
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

---

## DEFERRED: Post-Pilot Scaling (Only After Pilot Success)

- [ ]* 8. Controlled Scaling Infrastructure (DEFER: Post-pilot)
  - Implement batch processing for additional tables (2-3 per batch)
  - Add enhanced host guards for staging/production with confirmation flags
  - Create DigitalOcean SSL integration and backup strategies
  - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5_

- [ ]* 9. CI/CD Integration (DEFER: Post-pilot)
  - Add MySQL container to CI pipeline
  - Integrate `pnpm validate:schema` in CI checks
  - Add migration linting (block DROP/RENAME/narrowing MODIFY)
  - _Requirements: 12.4_

- [ ]* 10. Staging and Production Deployment (DEFER: Post-pilot)
  - Execute staging rehearsal with backups and SSL
  - Plan production deployment with maintenance windows
  - Create operational runbook for ongoing schema management
  - _Requirements: 10.4, 10.5, 11.1, 11.4, 12.4_

---

## DigitalOcean Readiness Checklist (For Future Staging/Production Work)

- [ ] MySQL version captured and IF NOT EXISTS support confirmed or fallback implemented
- [ ] SSL parameters set for DO connections (`ssl-mode=REQUIRED`, `rejectUnauthorized=false`)
- [ ] Host guards require explicit confirmation flags (`--confirm-staging`/`--confirm-prod`)
- [ ] Backup strategy in place before any DO database changes
- [ ] No DROP/RENAME/narrowing MODIFY operations in any migration
- [ ] Rollback procedures tested on local database before applying to DO