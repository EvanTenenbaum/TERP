# DATA-010: Complete Schema Validation System

## Task Summary

**Task ID:** DATA-010
**Status:** IN_PROGRESS (90% core complete)
**Priority:** HIGH
**Estimate:** 36-54h remaining
**Branch:** Create new branch from main

## Context

DATA-010 implemented core schema validation tools in December 2025, but was marked complete prematurely. A Red Hat QA review (January 2026) identified critical gaps that must be resolved before the task can be closed.

### What's Already Done (90%)
- ✅ Core validation tool: `scripts/validate-schema-comprehensive.ts`
- ✅ Fix recommendation generator: `scripts/fix-schema-drift.ts`
- ✅ Verification tool: `scripts/validate-schema-fixes.ts`
- ✅ Introspection utilities: `scripts/utils/schema-introspection.ts`
- ✅ npm scripts: `validate:schema`, `fix:schema:report`, `validate:schema:fixes`
- ✅ CI workflow: `.github/workflows/schema-validation.yml`
- ✅ API endpoint: `adminSchema.validate`

### What's NOT Done (Critical Gaps)
1. **Schema Debt:** 2 blocking issues in `drizzle/schema.ts`
2. **Testing:** Only 4/29 property tests implemented (14% coverage)
3. **Data Coverage:** 10 priority tables remain empty
4. **Production Verification:** Phases 3, 4, 6, 7 incomplete

## Required Reading

Before starting, read these files in order:

1. **Red Hat QA Report:** `docs/qa/DATA-010-REDHAT-QA-EXECUTION-ROADMAP.md`
2. **Original Spec:** `.kiro/specs/schema-validation-system/tasks.md`
3. **Requirements:** `.kiro/specs/schema-validation-system/requirements.md`
4. **Session History:** `docs/sessions/completed/Session-20251203-DATA-010-fff4be03.md`
5. **Roadmap Entry:** `docs/roadmaps/MASTER_ROADMAP.md` (search for "DATA-010")

## Phase 1: Schema Debt Resolution (8h)

### 1.1 Fix inventoryMovements.adjustmentReason

The `inventoryMovements` table in `drizzle/schema.ts` is missing the `adjustmentReason` column that exists in the database.

**Action:**
```typescript
// In drizzle/schema.ts - find inventoryMovements table
// Add this column (check database for exact type):
adjustmentReason: varchar('adjustment_reason', { length: 255 }),
```

**Verification:**
```bash
pnpm validate:schema
# Should show no issues for inventoryMovements
```

### 1.2 Fix orderStatusHistory Duplicate Mapping

The `orderStatusHistory` table has a duplicate column mapping issue identified in `DB_PILOT_ASSESSMENT.md`.

**Action:**
1. Run `pnpm validate:schema` and capture the specific error
2. Check `drizzle/schema.ts` for the `orderStatusHistory` table
3. Identify and fix the duplicate mapping (likely a column defined twice with different names)

**Reference:** `docs/analysis/DB_PILOT_ASSESSMENT.md`

### 1.3 Generate and Apply Migration

```bash
# After fixing schema.ts
pnpm db:generate   # Generate migration SQL
pnpm db:push       # Apply to database (staging first!)
```

### 1.4 Verify Zero Drift

```bash
pnpm validate:schema
# Expected: 0 issues on critical tables
```

**Exit Criteria Phase 1:**
- [ ] `adjustmentReason` column added to inventoryMovements
- [ ] `orderStatusHistory` duplicate mapping resolved
- [ ] Migration generated and applied
- [ ] `pnpm validate:schema` shows 0 critical issues

---

## Phase 2: Testing Implementation (16h)

### 2.1 Property Tests for Introspection

Implement the following tests in `scripts/utils/schema-validation.property.test.ts`:

| Test ID | Property | Reference |
|---------|----------|-----------|
| 2.1 | Complete Table Discovery | Req 1.1 |
| 2.2 | Complete Column Metadata Extraction | Req 1.2 |
| 2.3 | Enum Value Extraction Completeness | Req 1.3 |
| 2.4 | Foreign Key Discovery Completeness | Req 1.4 |
| 2.5 | Index Discovery Completeness | Req 1.5 |

### 2.2 Property Tests for Fix Generator

| Test ID | Property | Reference |
|---------|----------|-----------|
| 6.1 | Validation Report Parsing Completeness | Req 5.1 |
| 6.2 | Fix Recommendation Prioritization | Req 5.2 |
| 6.3 | Column Name Fix Correctness | Req 5.3 |
| 6.4 | Data Type Fix Correctness | Req 5.4 |
| 6.5 | Enum Fix Correctness | Req 5.5 |
| 6.6 | Fix Report Generation Completeness | Req 5.6 |
| 6.7 | Fix Target Consistency | Req 8.1 |
| 6.8 | Missing Column Recommendations | Req 8.2 |
| 6.9 | Extra Column Detection | Req 8.3 |

### 2.3 Property Tests for Verification

| Test ID | Property | Reference |
|---------|----------|-----------|
| 7.1 | Verification Scope Limitation | Req 6.1 |
| 7.2 | Issue Resolution Calculation | Req 6.2 |
| 7.3 | Verification Metrics Completeness | Req 6.5 |
| 7.4 | Exit Code Behavior | Req 6.3, 6.4 |

### 2.4 Integration Test

Create `scripts/utils/schema-validation.integration.test.ts`:
- Test full workflow: validate → fix:report → apply → verify
- Use test database with known drift
- Verify reports generated correctly

### 2.5 Add Tests to CI

Update `.github/workflows/schema-validation.yml` to run tests:
```yaml
- name: Run schema validation tests
  run: pnpm test -- --grep "schema-validation"
```

**Exit Criteria Phase 2:**
- [ ] 18+ property tests passing
- [ ] Integration test passing
- [ ] Tests added to CI workflow
- [ ] `pnpm test` includes schema validation tests

---

## Phase 3: Data Seeding (8h)

### 3.1 Seed client_needs Table

Script exists at `scripts/seed-client-needs.ts`:
```bash
tsx scripts/seed-client-needs.ts
# Expected: 25 records
```

### 3.2 Seed vip_portal_configurations Table

Create `scripts/seed-vip-portal-configs.ts`:
- Target: 10 configurations
- Link to existing VIP clients
- Include: isEnabled, allowedFeatures, customBranding

### 3.3 Seed Todo Tables

Create or update seeder for:
- `todo_lists`: 30 lists
- `todo_tasks`: 200 tasks
- `todo_list_members`: Link users to lists

### 3.4 Seed Comments Tables

Create or update seeder for:
- `comments`: 100 comments (attach to orders, clients, events)
- `comment_mentions`: 40 mentions (@user references)

### 3.5 Seed Pricing Tables

Create or update seeder for:
- `pricing_rules`: 8 rules (discounts, markups)
- `pricing_profiles`: 5 profiles (customer tiers)

**Exit Criteria Phase 3:**
- [ ] `client_needs` has 25+ records
- [ ] `vip_portal_configurations` has 10+ records
- [ ] `todo_lists` has 30+ records
- [ ] `todo_tasks` has 200+ records
- [ ] `comments` has 100+ records
- [ ] `comment_mentions` has 40+ records
- [ ] `pricing_rules` has 8+ records
- [ ] `pricing_profiles` has 5+ records

---

## Phase 4: Production Verification (4h)

### 4.1 Run Production Validation

```bash
# Option 1: Via CLI (if SSH access)
pnpm validate:schema

# Option 2: Via API (browser console)
fetch('/api/trpc/adminSchema.validate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include'
}).then(r => r.json()).then(console.log)
```

### 4.2 Archive Validation Report

```bash
mkdir -p docs/analysis/validation-reports/$(date +%Y-%m-%d)
cp schema-validation-report.json docs/analysis/validation-reports/$(date +%Y-%m-%d)/
cp SCHEMA_VALIDATION_REPORT.md docs/analysis/validation-reports/$(date +%Y-%m-%d)/
```

### 4.3 Run Seeding in Production

```bash
# Run each seeder against production
tsx scripts/seed-client-needs.ts
# ... etc
```

### 4.4 Smoke Test Features

Verify these features work with seeded data:
- [ ] Matchmaking page loads with client needs
- [ ] VIP Portal config page shows configurations
- [ ] Todo lists page shows lists and tasks
- [ ] Comments appear on orders/clients
- [ ] Pricing rules apply correctly

**Exit Criteria Phase 4:**
- [ ] Production validation shows 0 critical drift
- [ ] Validation reports archived
- [ ] All priority tables seeded in production
- [ ] Smoke tests pass

---

## Final Deliverables

### Update Session File

Edit `docs/sessions/completed/Session-20251203-DATA-010-fff4be03.md`:
- Mark all Phase 3-7 checkboxes complete
- Update "Final Status" to "✅ COMPLETE"
- Add completion date

### Update Roadmap

Edit `docs/roadmaps/MASTER_ROADMAP.md`:
1. Move DATA-010 from "Open Work" to "Completed Work"
2. Update status to "✅ COMPLETE"
3. Add completion date

### Update Legacy Reports

Edit these files to remove QA warnings:
- `docs/archive/legacy-reports/DATA-010-COMPLETION-REPORT.md`
- `docs/archive/legacy-reports/DATA-010-FINAL-STATUS.md`

### Archive QA Report

Move `docs/qa/DATA-010-REDHAT-QA-EXECUTION-ROADMAP.md` to archive with completion note.

---

## Success Criteria (Definition of Done)

- [ ] Zero schema drift on all 120+ tables
- [ ] All 6 critical tables validated (inventoryMovements, orderStatusHistory, invoices, ledgerEntries, payments, clientActivity)
- [ ] 18+ property tests implemented and passing
- [ ] Integration test passing
- [ ] Tests running in CI
- [ ] 10 priority tables seeded with data
- [ ] Production verification complete
- [ ] Session file updated with all checkboxes marked
- [ ] Roadmap updated to show DATA-010 complete
- [ ] All documentation updated

---

## Commands Reference

```bash
# Validation
pnpm validate:schema              # Full schema validation
pnpm validate:schema:fixes        # Verify critical tables only
pnpm fix:schema:report            # Generate fix recommendations

# Testing
pnpm test                         # Full test suite
pnpm test -- --grep "schema"      # Schema tests only

# Database
pnpm db:generate                  # Generate migrations
pnpm db:push                      # Apply schema changes

# Seeding
tsx scripts/seed-client-needs.ts  # Seed client needs
pnpm seed:new                     # New seeding system
pnpm seed:new:dry-run             # Preview without execution

# TypeScript
pnpm typecheck                    # Check for TS errors
pnpm lint                         # Run linter
```

---

## File Reference

| Purpose | Path |
|---------|------|
| Main validation tool | `scripts/validate-schema-comprehensive.ts` |
| Fix generator | `scripts/fix-schema-drift.ts` |
| Verification tool | `scripts/validate-schema-fixes.ts` |
| Introspection utilities | `scripts/utils/schema-introspection.ts` |
| Property tests | `scripts/utils/schema-validation.property.test.ts` |
| CI workflow | `.github/workflows/schema-validation.yml` |
| Main schema | `drizzle/schema.ts` |
| Spec tasks | `.kiro/specs/schema-validation-system/tasks.md` |
| Spec requirements | `.kiro/specs/schema-validation-system/requirements.md` |
| Red Hat QA | `docs/qa/DATA-010-REDHAT-QA-EXECUTION-ROADMAP.md` |
| Session file | `docs/sessions/completed/Session-20251203-DATA-010-fff4be03.md` |
| Roadmap | `docs/roadmaps/MASTER_ROADMAP.md` |

---

## Risk Mitigation

1. **Database Connection Issues:** Ensure DATABASE_URL is set and IP is whitelisted in DigitalOcean
2. **Migration Failures:** Always test migrations in staging before production
3. **Test Failures:** Check existing property tests in `schema-validation.property.test.ts` for patterns
4. **Seeding Conflicts:** Use `--dry-run` flag first, check referential integrity

---

## Estimated Timeline

| Phase | Duration | Dependencies |
|-------|----------|--------------|
| Phase 1: Schema Debt | 8h | None |
| Phase 2: Testing | 16h | Phase 1 |
| Phase 3: Data Seeding | 8h | Phase 1 |
| Phase 4: Production | 4h | Phases 1-3 |
| **Total** | **36h** | |

---

**Created:** January 9, 2026
**Source:** Red Hat QA Review
**Reference:** `docs/qa/DATA-010-REDHAT-QA-EXECUTION-ROADMAP.md`
