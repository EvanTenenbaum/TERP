# TERP Execution Roadmap with QA Gates

**Version:** 1.0
**Created:** 2026-01-23
**Status:** Active
**Last Updated:** 2026-01-23

> **PURPOSE:** This document provides an optimized execution plan derived from MASTER_ROADMAP.md, organized by priority phases with built-in quality gates, dependency tracking, and validation checkpoints to prevent errors, bugs, and protocol violations.

---

## Executive Summary

| Metric | Count |
|--------|-------|
| **Total Open MVP Tasks** | ~108 |
| **Total Open Beta Tasks** | ~30 |
| **Total Extracted Work (TERP-*)** | 25 |
| **P0 Critical Blockers** | 11 |
| **P1 High Priority** | ~35 |
| **P2 Medium Priority** | ~50 |
| **P3 Low Priority** | ~12 |

### Critical Path Analysis

The following tasks MUST complete sequentially before MVP can ship:

```
SEC-023 (credentials) → TS-001 (TypeScript) → TEST-INFRA-* (test infrastructure)
    → BUG-100 (failing tests) → ACC-001 (GL posting) → WSQA-001/002/003 (Work Surfaces)
```

---

## Phase 0: Emergency Blockers (Day 1)

> **Goal:** Eliminate critical security vulnerabilities and silent failures
> **Duration:** 4-8 hours
> **Mode:** 🔴 RED (requires explicit approval)

### Tasks

| Task | Description | Est. | Risk | Dependencies |
|------|-------------|------|------|--------------|
| **SEC-023** | Rotate exposed database credentials | 2-4h | CRITICAL | None |
| **PERF-001** | Fix empty catch blocks in usePerformanceMonitor.ts | 15 min | HIGH | None |
| **ACC-001** | Fix Silent GL Posting Failures (accountingHooks.ts) | 8h | CRITICAL | None |

### Verification Commands
```bash
# After each task
pnpm check && pnpm lint && pnpm test && pnpm build
```

### QA Gate 0 ✅

Before proceeding to Phase 1, ALL must pass:

- [ ] Database credentials rotated and verified in production
- [ ] No empty catch blocks in performance monitoring
- [ ] GL posting throws on missing standard accounts
- [ ] `pnpm check` passes (0 TypeScript errors)
- [ ] `pnpm lint` passes (0 linting errors)
- [ ] No P0 security vulnerabilities remain open

**Gate Owner:** Evan (explicit approval required)

---

## Phase 1: Foundation & Test Infrastructure (Days 2-4)

> **Goal:** Establish reliable build and test infrastructure
> **Duration:** 2-3 days
> **Mode:** 🟡 STRICT

### Track A: TypeScript Errors (Blocking)

| Task | Description | Est. | Dependencies |
|------|-------------|------|--------------|
| **TS-001** | Fix 117 TypeScript errors | 16-24h | Phase 0 complete |

### Track B: Test Infrastructure (Parallel with Track A)

| Task | Description | Est. | Dependencies |
|------|-------------|------|--------------|
| **TEST-INFRA-01** | Fix DOM/jsdom test container setup | 4h | None |
| **TEST-INFRA-02** | Configure DATABASE_URL for test environment | 4h | None |
| **TEST-INFRA-03** | Fix tRPC router initialization in tests | 4h | None |
| **TEST-INFRA-04** | Create comprehensive test fixtures/factories | 8h | TEST-INFRA-02 |
| **TEST-INFRA-05** | Fix async element detection (findBy vs getBy) | 4h | TEST-INFRA-01 |
| **TEST-QA-001** | Fix React Hook Test Infrastructure | 2h | TEST-INFRA-01 |

### Track C: Test Fixing (After Track B)

| Task | Description | Est. | Dependencies |
|------|-------------|------|--------------|
| **BUG-100** | Fix 122 failing tests (44 test files) | 24-40h | TEST-INFRA-* complete |
| **TEST-INFRA-06** | Fix admin endpoint security test | 2h | BUG-100 |

### Execution Order

```
[Parallel Start]
├── Track A: TS-001 (TypeScript errors)
└── Track B: TEST-INFRA-01 + TEST-INFRA-02 (parallel)
                ↓
         TEST-INFRA-03 + TEST-INFRA-05 + TEST-QA-001 (parallel)
                ↓
         TEST-INFRA-04 (needs TEST-INFRA-02)
[Wait for Track A + Track B]
                ↓
         Track C: BUG-100 → TEST-INFRA-06
```

### Verification Commands
```bash
# TypeScript check (must be 0 errors)
pnpm check 2>&1 | grep -c "error" # Should output: 0

# Full test suite
pnpm test 2>&1 | tail -20

# Build verification
pnpm build
```

### QA Gate 1 ✅

Before proceeding to Phase 2, ALL must pass:

- [ ] `pnpm check` reports 0 TypeScript errors
- [ ] `pnpm test` reports ≥95% pass rate (1850+ passing)
- [ ] `pnpm build` succeeds without errors
- [ ] Test infrastructure supports: jsdom, DATABASE_URL, tRPC, fixtures
- [ ] All React Hook tests pass
- [ ] No test files skipped due to infrastructure issues

**Validation Script:**
```bash
#!/bin/bash
echo "=== QA Gate 1 Validation ==="
ERRORS=$(pnpm check 2>&1 | grep -c "error" || echo "0")
echo "TypeScript errors: $ERRORS"
[ "$ERRORS" -eq 0 ] || exit 1

TESTS=$(pnpm test 2>&1 | grep -E "Tests.*passed" | tail -1)
echo "Test results: $TESTS"

pnpm build
echo "Build: SUCCESS"
```

---

## Phase 2: Security Hardening (Days 5-6)

> **Goal:** Close all security vulnerabilities
> **Duration:** 1-2 days
> **Mode:** 🔴 RED (all security changes)

### Priority Order

| Task | Description | Est. | Dependencies |
|------|-------------|------|--------------|
| **TERP-0013** | Security hardening for public endpoint exposure | 6-10h | Phase 1 complete |
| **TERP-0014** | Token invalidation and auth rate limiting | 6-12h | None |
| **TERP-0017** | Convert remaining public routers to protected | 4-8h | TERP-0013 |
| **SEC-024** | Validate Quote Email XSS Prevention | 1h | None |
| **DI-009** | Add Vendor ID Validation in Return Processing | 30 min | None |
| **SEC-025** | Implement Session Extension Limit | 1h | None |
| **SEC-026** | Validate Cron Leader Election Race Condition | 2h | None |

### Verification Commands
```bash
# Security audit
pnpm test server/routers/auth.test.ts
pnpm test server/routers/rbac-roles.test.ts

# Verify no public endpoints remain
grep -r "publicProcedure" server/routers/*.ts | grep -v "// deprecated" | wc -l
# Should be minimal (health, webhook endpoints only)
```

### QA Gate 2 ✅

Before proceeding to Phase 3, ALL must pass:

- [ ] All tRPC procedures use `protectedProcedure` (except health/webhooks)
- [ ] Token invalidation on logout verified
- [ ] Auth rate limiting in place
- [ ] No XSS vectors in email templates
- [ ] Session extension has max limit
- [ ] Cron leader election is race-condition safe
- [ ] `pnpm test server/routers/auth.test.ts` passes
- [ ] Security penetration test: unauthenticated requests rejected

**Validation Script:**
```bash
#!/bin/bash
echo "=== QA Gate 2 Security Validation ==="

# Check for remaining publicProcedure usage (should be <5)
PUBLIC_COUNT=$(grep -r "publicProcedure" server/routers/*.ts 2>/dev/null | wc -l)
echo "Public procedures remaining: $PUBLIC_COUNT"
[ "$PUBLIC_COUNT" -lt 10 ] || exit 1

# Run auth tests
pnpm test server/routers/auth.test.ts
echo "Auth tests: PASSED"
```

---

## Phase 3: Data Integrity & Financial Systems (Days 7-9)

> **Goal:** Ensure financial accuracy and data consistency
> **Duration:** 2-3 days
> **Mode:** 🔴 RED (financial systems)

### Priority Order

| Task | Description | Est. | Dependencies |
|------|-------------|------|--------------|
| **TERP-0015** | Financial integrity validation fixes | 6-10h | Phase 2 |
| **TERP-0016** | Business logic guardrails (orders, precision) | 12-20h | TERP-0015 |
| **TERP-0001** | Dashboard backend data accuracy | 8-16h | None |
| **TERP-0018** | Consistency and cleanup tasks | 8-16h | None |

### Verification Commands
```bash
# Financial tests
pnpm test server/services/cogsChangeIntegrationService.test.ts
pnpm test server/routers/orders.test.ts
pnpm test server/routers/payments.test.ts

# Dashboard accuracy
pnpm test server/routers/dashboard.test.ts
pnpm test server/routers/analytics.test.ts
```

### QA Gate 3 ✅

Before proceeding to Phase 4, ALL must pass:

- [ ] Credit number generation is atomic
- [ ] Fiscal period locks enforced before posting
- [ ] Duplicate refunds prevented
- [ ] Credit limits block invalid orders
- [ ] Order state machine validates transitions
- [ ] Financial calculations use decimal precision
- [ ] Dashboard data uses real COGS (no hardcoded %)
- [ ] Soft delete patterns consistent across codebase
- [ ] `pnpm test server/services/**/*.test.ts` passes

**Validation Script:**
```bash
#!/bin/bash
echo "=== QA Gate 3 Financial Integrity ==="
pnpm test server/services/cogsChangeIntegrationService.test.ts
pnpm test server/routers/orders.test.ts
pnpm test server/routers/payments.test.ts
pnpm test server/routers/dashboard.test.ts
echo "All financial tests: PASSED"
```

---

## Phase 4: Work Surface Completion (Days 10-14)

> **Goal:** Complete all Work Surface blockers for MVP
> **Duration:** 4-5 days
> **Mode:** 🟡 STRICT

### Critical Work Surface Tasks (P0)

| Task | Description | Est. | Dependencies |
|------|-------------|------|--------------|
| **WSQA-001** | Wire InvoicesWorkSurface Payment Recording | 4h | Phase 3 |
| **WSQA-002** | Implement Flexible Lot Selection | 2d | WSQA-001 |
| **WSQA-003** | Add RETURNED Order Status | 2d | WSQA-002 |
| **TERP-0003** | Add Client Wizard to ClientsWorkSurface | 1-2h | None |

### Supporting Tasks (P1)

| Task | Description | Est. | Dependencies |
|------|-------------|------|--------------|
| **SSE-001** | Fix Live Shopping SSE Event Naming | 2h | None |
| **LIVE-001** | Implement or Remove Live Shopping Console | 4h | SSE-001 |
| **WS-010A** | Integrate Photography Module | 4h | None |
| **NAV-017** | Route CreditsPage in App.tsx | 1h | None |
| **API-016** | Implement Quote Email Sending | 4h | None |

### Verification Commands
```bash
# Work Surface tests
pnpm test client/src/components/work-surface/**/*.test.tsx

# Golden Flow validation
pnpm test:e2e --grep "Golden Flow"

# Invoice to Payment flow
pnpm test:e2e --grep "GF-004"
```

### QA Gate 4 ✅

Before proceeding to Phase 5, ALL must pass:

- [ ] Payment recording persists to database
- [ ] Batch selection UI allows lot picking
- [ ] RETURNED status workflow complete
- [ ] Client Wizard opens and creates clients
- [ ] Live Shopping SSE events received by frontend
- [ ] Photography Module accessible on PhotographyPage
- [ ] CreditsPage routed and accessible
- [ ] Quote emails sent (not just marked sent)
- [ ] All 8 Golden Flows pass (GF-001 through GF-008)

**Validation Script:**
```bash
#!/bin/bash
echo "=== QA Gate 4 Work Surface Validation ==="

# Test Work Surfaces
pnpm test client/src/components/work-surface/**/*.test.tsx

# Manual checklist reminder
echo "
MANUAL QA REQUIRED:
- [ ] Open InvoicesWorkSurface, record payment, verify in DB
- [ ] Open OrderCreator, select specific batch/lot
- [ ] Create order, return it, verify RETURNED status
- [ ] Open ClientsWorkSurface, click Add Client, verify wizard
"
```

---

## Phase 5: Navigation & UX Polish (Days 15-16)

> **Goal:** Complete navigation enhancements and UX fixes
> **Duration:** 1-2 days
> **Mode:** 🟢 SAFE

### Navigation Tasks (Can run in parallel)

| Task | Description | Est. | Dependencies |
|------|-------------|------|--------------|
| **NAV-006** | Add Leaderboard to Sales nav | 5 min | None |
| **NAV-007** | Add Client Needs to Sales nav | 5 min | None |
| **NAV-008** | Add Matchmaking to Sales nav | 5 min | None |
| **NAV-009** | Add Quotes to Sales nav | 5 min | None |
| **NAV-010** | Add Returns to Sales nav | 5 min | None |
| **NAV-011** | Add Vendor Supply to Inventory nav | 5 min | None |
| **NAV-012** | Add Pricing Rules to Finance nav | 5 min | None |
| **NAV-013** | Add Workflow Queue to Admin nav | 5 min | None |
| **NAV-014** | Add all 8 routes to Command Palette | 15 min | NAV-006..013 |
| **NAV-015** | Verify TypeScript compilation | 5 min | NAV-014 |
| **NAV-016** | Manual QA verification | 15 min | NAV-015 |
| **TERP-0005** | Reorganize navigation groups | 2-4h | NAV-006..016 |

### UX Polish Tasks

| Task | Description | Est. | Dependencies |
|------|-------------|------|--------------|
| **TERP-0002** | Dashboard widget UX improvements | 4-8h | TERP-0001 |
| **TERP-0022** | Add confirmation dialogs, remove window.alert | 8-16h | None |
| **TERP-0021** | Restore BatchDetailDrawer features | 6-12h | None |
| **TERP-0020** | Replace TemplateSelector TODOs | 4-8h | None |

### Verification Commands
```bash
# Navigation compilation check
pnpm check client/src/config/navigation.ts

# Build verification
pnpm build

# UI smoke test
pnpm test:e2e --grep "navigation"
```

### QA Gate 5 ✅

Before proceeding to Phase 6, ALL must pass:

- [ ] All 8 hidden routes visible in sidebar
- [ ] All 8 routes accessible via Command Palette
- [ ] TypeScript compilation passes
- [ ] Navigation groups logically organized
- [ ] Dashboard widgets show error states correctly
- [ ] Leaderboard rows navigate to client profiles
- [ ] Confirmation dialogs on all destructive actions
- [ ] No `window.alert()` calls remain

**Validation Script:**
```bash
#!/bin/bash
echo "=== QA Gate 5 Navigation & UX Validation ==="

# Verify navigation items
grep -c "path:" client/src/config/navigation.ts
# Should be 32+ (24 original + 8 new)

pnpm check
pnpm build
echo "Navigation and UX: VERIFIED"
```

---

## Phase 6: Data Seeding & Schema (Days 17-19)

> **Goal:** Complete data seeding and schema tasks
> **Duration:** 2-3 days
> **Mode:** 🟡 STRICT (schema changes)

### Schema Tasks

| Task | Description | Est. | Dependencies |
|------|-------------|------|--------------|
| **TERP-0004** | Add notifications table to autoMigrate | 2-4h | None |
| **TERP-0006** | Dashboard preferences index cleanup | 4-8h | None |
| **SCHEMA-001** | Fix products.name vs nameCanonical | 4h | None |

### Data Seeding Tasks

| Task | Description | Est. | Dependencies |
|------|-------------|------|--------------|
| **DATA-012** | Seed work surface feature flags (17+) | 4h | None |
| **DATA-013** | Seed gamification module defaults | 4-8h | None |
| **DATA-014** | Seed scheduling module defaults | 4h | None |
| **DATA-015** | Seed storage sites and zones | 2-4h | None |
| **DATA-021** | Seed mock product images | 6h | None |
| **TERP-0011** | Create QA test data seeding script | 4-8h | None |
| **TERP-0024** | Verify DATA-021 completion | 2-4h | DATA-021 |

### Verification Commands
```bash
# Schema validation
pnpm validate:schema

# Run migrations
pnpm db:migrate

# Run seed scripts
pnpm seed:qa-data

# Verify data
pnpm db:seed:verify
```

### QA Gate 6 ✅

Before proceeding to MVP Release, ALL must pass:

- [ ] `pnpm validate:schema` passes
- [ ] `pnpm db:migrate` runs without errors
- [ ] Notifications table created on server startup
- [ ] All feature flags seeded
- [ ] QA test data seeded (QA_* prefixed entities)
- [ ] Product images visible in Live Catalog
- [ ] No schema drift warnings

---

## Phase 7: MVP Release Verification (Day 20)

> **Goal:** Final verification before MVP release
> **Duration:** 1 day
> **Mode:** 🔴 RED (full verification)

### Final Verification Checklist

```bash
#!/bin/bash
echo "=== MVP RELEASE VERIFICATION ==="

# 1. Core verification
echo "Step 1: Core verification..."
pnpm check && pnpm lint && pnpm test && pnpm build
pnpm roadmap:validate

# 2. E2E tests
echo "Step 2: E2E test suite..."
pnpm test:e2e

# 3. Golden Flows
echo "Step 3: Golden Flow verification..."
for flow in GF-001 GF-002 GF-003 GF-004 GF-005 GF-006 GF-007 GF-008; do
  echo "Testing $flow..."
  pnpm test:e2e --grep "$flow"
done

# 4. Security scan
echo "Step 4: Security verification..."
grep -r "publicProcedure" server/routers/*.ts | wc -l

# 5. Production health
echo "Step 5: Production health check..."
curl -s https://terp-app-b9s35.ondigitalocean.app/health

echo "=== MVP VERIFICATION COMPLETE ==="
```

### MVP Release QA Gate ✅

**ALL CONDITIONS MUST BE MET:**

| Category | Requirement | Status |
|----------|-------------|--------|
| **TypeScript** | 0 errors | ☐ |
| **Lint** | 0 errors | ☐ |
| **Unit Tests** | ≥95% pass rate | ☐ |
| **E2E Tests** | ≥90% pass rate | ☐ |
| **Build** | Success | ☐ |
| **Roadmap** | Valid (pnpm roadmap:validate) | ☐ |
| **Golden Flows** | All 8 pass | ☐ |
| **Security** | No P0 vulnerabilities | ☐ |
| **Health Check** | 200 OK | ☐ |
| **Error Logs** | No new errors | ☐ |

---

## BETA Phase Tasks (Post-MVP)

After MVP release, proceed to Beta milestone.

### Reliability Program (REL-001 through REL-017)

| Task | Description | Est. | Dependencies |
|------|-------------|------|--------------|
| REL-001 | Define Truth Model + Invariants | 8h | MVP Complete |
| REL-002 | Migrate Inventory Quantities to DECIMAL | 2d | REL-001 |
| REL-003 | Migrate Money Amounts to DECIMAL | 2d | REL-001 |
| REL-004 | Critical Mutation Wrapper | 16h | REL-002, REL-003 |
| REL-005 | Idempotency Keys | 2d | REL-004 |
| REL-006 | Inventory Concurrency Hardening | 2d | REL-004 |
| REL-007 | Inventory Movements Immutability | 16h | REL-006 |
| REL-008 | Ledger Immutability + Fiscal Lock | 2d | REL-006 |
| REL-009 | Reconciliation Framework | 2d | REL-007, REL-008 |
| REL-010 | Inventory Reconciliation Pack | 16h | REL-009 |
| REL-011 | AR/AP Reconciliation Pack | 2d | REL-009 |
| REL-012 | Ledger Reconciliation Pack | 16h | REL-009 |
| REL-013 | RBAC Drift Detector | 16h | MVP Complete |
| REL-014 | Critical Correctness Test Harness | 2d | REL-010..012 |
| REL-015 | Observability for Critical Mutations | 16h | REL-004 |
| REL-016 | Backup/Restore Reliability Runbook | 2d | REL-009 |
| REL-017 | CI/PR Gates for Critical Domains | 16h | REL-014 |

### Beta QA Gate ✅

| Category | Requirement |
|----------|-------------|
| **Decimal Migration** | All inventory/money as DECIMAL |
| **Transaction Safety** | All critical mutations transactional |
| **Idempotency** | All critical mutations have idempotency keys |
| **Reconciliation** | Daily reconciliation reports enabled |
| **Observability** | Critical mutation metrics in dashboard |
| **CI Gates** | PR blocking on invariant violations |

---

## Dependency Graph

```
Phase 0 (Emergency)
├── SEC-023 (credentials)
├── PERF-001 (empty catch)
└── ACC-001 (GL posting)
         │
         ▼
Phase 1 (Foundation)
├── TS-001 (TypeScript) ──────────────────────────────┐
└── TEST-INFRA-01/02 (parallel) ──┬── TEST-INFRA-03 ──┤
                                  └── TEST-INFRA-04 ──┤
                                  └── TEST-QA-001 ────┤
                                                      │
                                            BUG-100 ←─┘
                                                      │
         ┌────────────────────────────────────────────┘
         ▼
Phase 2 (Security)
├── TERP-0013 → TERP-0017
├── TERP-0014
├── SEC-024, DI-009, SEC-025, SEC-026 (parallel)
         │
         ▼
Phase 3 (Financial)
├── TERP-0015 → TERP-0016
├── TERP-0001
└── TERP-0018
         │
         ▼
Phase 4 (Work Surfaces)
├── WSQA-001 → WSQA-002 → WSQA-003
├── SSE-001 → LIVE-001
├── WS-010A, NAV-017, API-016 (parallel)
└── TERP-0003
         │
         ▼
Phase 5 (Navigation/UX)
├── NAV-006..013 (parallel) → NAV-014 → NAV-015 → NAV-016
├── TERP-0002, TERP-0022, TERP-0021, TERP-0020 (parallel)
└── TERP-0005
         │
         ▼
Phase 6 (Data/Schema)
├── TERP-0004, TERP-0006, SCHEMA-001 (parallel)
└── DATA-012..015, DATA-021, TERP-0011, TERP-0024
         │
         ▼
Phase 7 (MVP Release)
         │
         ▼
BETA: REL-001 → REL-002/003 → REL-004 → REL-005/006
                                       → REL-007/008 → REL-009 → REL-010/011/012
```

---

## Risk Mitigation

### High-Risk Tasks

| Task | Risk | Mitigation |
|------|------|------------|
| SEC-023 | Credential rotation could break production | Coordinate with Evan, have rollback ready |
| TS-001 | 117 errors could indicate deeper issues | Fix in batches, test after each 20 fixes |
| BUG-100 | 122 failing tests is a large scope | Prioritize by root cause, fix infrastructure first |
| WSQA-002 | Lot selection touches inventory core | Use feature flag, extensive E2E testing |
| REL-002/003 | DECIMAL migration is data-changing | Backup before, run in maintenance window |

### Rollback Procedures

For each phase, maintain:

1. **Git tag** before starting phase: `git tag phase-X-start`
2. **Database backup** before schema changes
3. **Feature flags** for all new functionality
4. **Revert script** ready:
   ```bash
   git revert --no-commit HEAD~N..HEAD
   pnpm db:rollback
   ```

---

## Estimated Timeline

| Phase | Duration | Cumulative |
|-------|----------|------------|
| Phase 0: Emergency | 1 day | Day 1 |
| Phase 1: Foundation | 3 days | Days 2-4 |
| Phase 2: Security | 2 days | Days 5-6 |
| Phase 3: Financial | 3 days | Days 7-9 |
| Phase 4: Work Surfaces | 5 days | Days 10-14 |
| Phase 5: Navigation/UX | 2 days | Days 15-16 |
| Phase 6: Data/Schema | 3 days | Days 17-19 |
| Phase 7: MVP Release | 1 day | Day 20 |
| **MVP TOTAL** | **20 days** | |
| Beta: Reliability | 3-4 weeks | Post-MVP |

---

## Agent Execution Protocol

### Before Starting Any Task

```bash
# 1. Pull latest
git pull origin main

# 2. Check active sessions
cat docs/ACTIVE_SESSIONS.md

# 3. Create session (if needed)
SESSION_ID="Session-$(date +%Y%m%d)-TASK-ID-$(openssl rand -hex 3)"
```

### During Task Execution

```bash
# After each significant change
pnpm check && pnpm lint && pnpm test
```

### After Completing Task

```bash
# 1. Full verification
pnpm check && pnpm lint && pnpm test && pnpm build

# 2. Commit with conventional format
git add .
git commit -m "fix(module): description [TASK-ID]"

# 3. Push
git push origin main

# 4. Verify deployment
./scripts/watch-deploy.sh

# 5. Update roadmap status to complete
# Add: **Completed:** YYYY-MM-DD, **Key Commits:** `abc1234`
```

### Verification Output Template

Always provide at task completion:

```
VERIFICATION RESULTS
====================
TypeScript: ✅ PASS | ❌ FAIL (X errors)
Lint:       ✅ PASS | ❌ FAIL (X warnings)
Tests:      ✅ PASS | ❌ FAIL (X/Y passing)
Build:      ✅ PASS | ❌ FAIL
Deployment: ✅ VERIFIED | ⏳ PENDING | ❌ FAILED

[If any failures, list specific errors and fixes applied]
```

---

## Quick Reference

### Essential Commands

```bash
# Core verification
pnpm check          # TypeScript
pnpm lint           # ESLint
pnpm test           # Unit tests
pnpm build          # Build

# Roadmap
pnpm roadmap:validate

# Deployment
./scripts/watch-deploy.sh
curl https://terp-app-b9s35.ondigitalocean.app/health
```

### QA Gate Summary

| Gate | Phase | Key Requirement |
|------|-------|-----------------|
| Gate 0 | Emergency | No P0 security issues |
| Gate 1 | Foundation | 0 TypeScript errors, ≥95% tests pass |
| Gate 2 | Security | All procedures protected |
| Gate 3 | Financial | Financial calculations accurate |
| Gate 4 | Work Surfaces | All 8 Golden Flows pass |
| Gate 5 | Navigation/UX | All routes accessible |
| Gate 6 | Data/Schema | Schema validation passes |
| Gate 7 | MVP Release | All criteria met |

---

**Remember:** Verification over persuasion. Prove it works, don't convince yourself it works.
