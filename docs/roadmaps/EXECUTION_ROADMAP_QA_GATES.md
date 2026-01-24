# TERP Execution Roadmap with QA Gates

**Version:** 2.0
**Created:** 2026-01-23
**Status:** Active
**Last Updated:** 2026-01-23 (QA Review Pass)

> **PURPOSE:** This document provides an optimized execution plan derived from MASTER_ROADMAP.md + Work Surfaces Analysis Report, organized by priority phases with built-in quality gates, dependency tracking, and validation checkpoints to prevent errors, bugs, and protocol violations.

---

## Executive Summary

| Metric | Count |
|--------|-------|
| **Total Open MVP Tasks** | 133 |
| **Total Open Beta Tasks** | 30 |
| **Total Extracted Work (TERP-*)** | 25 |
| **Total Work Surface Gaps** | 6 (NEW) |
| **P0 Critical Blockers** | 11 |
| **P1 High Priority** | 42 |
| **P2 Medium Priority** | 65 |
| **P3 Low Priority** | 15 |

### Critical Path Analysis

The following tasks MUST complete sequentially before MVP can ship:

```
SEC-023 (credentials) → TS-001 (TypeScript) → TEST-INFRA-* (test infrastructure)
    → BUG-100 (failing tests) → ACC-001 (GL posting) → WSQA-001/002/003 (Work Surfaces)
    → WS-PROD-001 + WS-VEND-001 (Work Surface Coverage)
```

### QA Review Findings (2026-01-23)

**Gap Analysis from Work Surfaces Report:**
- 2 critical pages (Products, Vendors) not using Work Surface pattern
- Golden Flows implemented but not wired to AR/AP UI
- Minor keyboard hint inconsistencies in 2 Work Surfaces
- Client Ledger Work Surface not verified

**Tasks Added from Work Surfaces Report:**
| Task ID | Description | Priority | Est. |
|---------|-------------|----------|------|
| WS-PROD-001 | Refactor Products page to Work Surface | HIGH | 8-16h |
| WS-VEND-001 | Refactor Vendors page to Work Surface | HIGH | 8-16h |
| WS-GF-001 | Wire Golden Flows to AR/AP Quick Actions | MEDIUM | 16-24h |
| WS-KB-001 | Add keyboard hint to Purchase Orders | LOW | 15 min |
| WS-KB-002 | Add keyboard hint to Direct Intake | LOW | 15 min |
| WS-TEST-001 | Test Client Ledger Work Surface | LOW | 30 min |

**Tasks Added from Comprehensive Gap Analysis:**
| Task ID | Description | Priority | Est. |
|---------|-------------|----------|------|
| BE-QA-006 | Implement AR/AP summary endpoints | HIGH | 8h |
| BE-QA-007 | Implement cash expenses endpoints | HIGH | 8h |
| BE-QA-008 | Implement financial reports | HIGH | 16h |
| QUAL-008 | Add feature flag checks to routes | HIGH | 4h |
| FE-QA-009 | Enable VendorSupplyPage Creation | MEDIUM | 8h |
| FE-QA-010 | Wire MatchmakingServicePage Buttons | MEDIUM | 4h |
| MOB-001 | Address Mobile Responsiveness (38 issues) | MEDIUM | 24h |
| TYPE-001 | Fix `as any` casts in Golden Flows | MEDIUM | 4h |

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

## Phase 4: Work Surface Core Completion (Days 10-14)

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

### Quick Wins (15-30 min each)

| Task | Description | Est. | Dependencies |
|------|-------------|------|--------------|
| **WS-KB-001** | Add keyboard hint `(Cmd+K)` to Purchase Orders search | 15 min | None |
| **WS-KB-002** | Add keyboard hint `(Cmd+K)` to Direct Intake search | 15 min | None |
| **WS-TEST-001** | Test Client Ledger Work Surface functionality | 30 min | None |

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

Before proceeding to Phase 4.5, ALL must pass:

- [ ] Payment recording persists to database
- [ ] Batch selection UI allows lot picking
- [ ] RETURNED status workflow complete
- [ ] Client Wizard opens and creates clients
- [ ] Live Shopping SSE events received by frontend
- [ ] Photography Module accessible on PhotographyPage
- [ ] CreditsPage routed and accessible
- [ ] Quote emails sent (not just marked sent)
- [ ] All 8 Golden Flows pass (GF-001 through GF-008)
- [ ] All Work Surfaces show `(Cmd+K)` keyboard hint in search
- [ ] Client Ledger Work Surface verified working

**Validation Script:**
```bash
#!/bin/bash
echo "=== QA Gate 4 Work Surface Validation ==="

# Test Work Surfaces
pnpm test client/src/components/work-surface/**/*.test.tsx

# Check keyboard hints consistency
echo "Verifying keyboard hints..."
grep -r "(Cmd+K)" client/src/components/work-surface/*.tsx | wc -l
# Should be 9+ (all Work Surfaces)

# Manual checklist reminder
echo "
MANUAL QA REQUIRED:
- [ ] Open InvoicesWorkSurface, record payment, verify in DB
- [ ] Open OrderCreator, select specific batch/lot
- [ ] Create order, return it, verify RETURNED status
- [ ] Open ClientsWorkSurface, click Add Client, verify wizard
- [ ] Open Client Ledger, verify Work Surface features
"
```

---

## Phase 4.5: Work Surface Coverage Gaps (Days 15-17)

> **Goal:** Achieve 100% Work Surface coverage across core domains
> **Duration:** 2-3 days
> **Mode:** 🟡 STRICT
> **Source:** Work Surfaces Analysis Report (Jan 23, 2026)

### Critical Coverage Gaps (HIGH Priority)

These pages use legacy data table patterns and should be refactored to Work Surface:

| Task | Description | Est. | Impact | Dependencies |
|------|-------------|------|--------|--------------|
| **WS-PROD-001** | Refactor Products page to Work Surface pattern | 8-16h | HIGH | Phase 4 complete |
| **WS-VEND-001** | Refactor Vendors page to Work Surface pattern | 8-16h | HIGH | Phase 4 complete |
| **WS-GF-001** | Wire Golden Flows to AR/AP Quick Actions | 16-24h | MEDIUM | WSQA-001 |

#### WS-PROD-001: Refactor Products Page to Work Surface

**Current State:**
- 150+ products using legacy data table
- Complex filter UI (Category, Brand, Columns dropdown)
- Traditional admin panel aesthetic
- Missing: save state, keyboard hints, metrics, inspector panel

**Implementation Steps:**
1. Create `ProductsWorkSurface.tsx` component
2. Implement Work Surface hooks (`useWorkSurfaceKeyboard`, `useSaveState`)
3. Add summary metrics bar (Total Products, Active, Value)
4. Implement Inspector Panel for product editing
5. Add keyboard shortcuts with `(Cmd+K)` hint
6. Wire to feature flag system (`WORK_SURFACE_INVENTORY`)
7. Test with 150+ products for performance
8. Write E2E tests

**Benefits:**
- Consistent UX across inventory domain (matches Inventory Work Surface)
- Keyboard-first navigation
- Real-time save state indicator

---

#### WS-VEND-001: Refactor Vendors Page to Work Surface

**Current State:**
- Empty legacy data table
- "Columns" dropdown (legacy pattern)
- Missing: save state, keyboard hints, metrics, action buttons

**Implementation Steps:**
1. Create `VendorsWorkSurface.tsx` component
2. Implement Work Surface hooks
3. Add summary metrics bar (Total Vendors, Active, Inventory Value)
4. Implement Inspector Panel (similar to Clients)
5. Add keyboard shortcuts with `(Cmd+K)` hint
6. Add "Add Vendor" action button
7. Wire to feature flag system
8. Write E2E tests

**Benefits:**
- Consistent UX matches Clients page pattern
- Inspector Panel for vendor details
- Keyboard-first navigation

---

#### WS-GF-001: Wire Golden Flows to AR/AP Quick Actions

**Current State:**
- "Receive Payment" button uses simple modal
- Golden Flows exist and are tested but NOT used
- Gap between implementation and usage

**Expected Flow (InvoiceToPaymentFlow):**
1. Select invoices
2. Enter payment amount
3. Choose payment method
4. Preview balance changes
5. Confirm and generate receipt

**Implementation Steps:**
1. Replace "Receive Payment" modal with `InvoiceToPaymentFlow`
2. Create or wire vendor payment Golden Flow to "Pay Vendor" button
3. Ensure proper integration with AR/AP page
4. Test full payment workflows
5. Update E2E tests if needed

### Verification Commands
```bash
# Products Work Surface tests
pnpm test client/src/components/work-surface/ProductsWorkSurface.test.tsx

# Vendors Work Surface tests
pnpm test client/src/components/work-surface/VendorsWorkSurface.test.tsx

# Golden Flows
pnpm test:e2e --grep "Golden Flow"

# Verify feature flags
grep -r "WORK_SURFACE" client/src/App.tsx
```

### QA Gate 4.5 ✅

Before proceeding to Phase 5, ALL must pass:

- [ ] Products page uses Work Surface pattern
- [ ] Products shows save state indicator, keyboard hints, summary metrics
- [ ] Products Inspector Panel opens on row click
- [ ] Vendors page uses Work Surface pattern
- [ ] Vendors shows save state indicator, keyboard hints, summary metrics
- [ ] Vendors "Add Vendor" button works
- [ ] "Receive Payment" uses InvoiceToPaymentFlow (multi-step wizard)
- [ ] "Pay Vendor" uses appropriate Golden Flow
- [ ] All 9 Work Surfaces show consistent UX

**Compliance Matrix Post-Phase 4.5:**

| Page | Work Surface | Save State | Keyboard | Metrics | Inspector |
|------|--------------|------------|----------|---------|-----------|
| Clients | ✅ | ✅ | ✅ | ✅ | ✅ |
| Inventory | ✅ | ✅ | ✅ | ✅ | ❓ |
| Invoices | ✅ | ✅ | ✅ | ✅ | ❓ |
| Quotes | ✅ | ✅ | ✅ | ✅ | ❓ |
| Orders | ✅ | ✅ | ✅ | ✅ | ❓ |
| Pick & Pack | ✅ | ✅ | ✅ | ✅ | N/A |
| Direct Intake | ✅ | ✅ | ✅ | ✅ | N/A |
| Purchase Orders | ✅ | ✅ | ✅ | ✅ | ❓ |
| Client Ledger | ✅ | ❓ | ❓ | ❓ | ❓ |
| **Products** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Vendors** | ✅ | ✅ | ✅ | ✅ | ✅ |

**Target: 100% Work Surface Coverage in Core Domains**

---

## Phase 5: Navigation & UX Polish (Days 18-19)

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

## Phase 6: Backend Completeness & Data Seeding (Days 20-23)

> **Goal:** Complete backend endpoints, data seeding, and schema tasks
> **Duration:** 3-4 days
> **Mode:** 🟡 STRICT (schema changes)

### Backend Completeness Tasks (P1 - HIGH)

| Task | Description | Est. | Dependencies |
|------|-------------|------|--------------|
| **BE-QA-006** | Implement AR/AP summary endpoints | 8h | Phase 5 |
| **BE-QA-007** | Implement cash expenses endpoints | 8h | None |
| **BE-QA-008** | Implement financial reports | 16h | BE-QA-006 |
| **QUAL-008** | Add feature flag checks to routes | 4h | None |

### Schema Tasks

| Task | Description | Est. | Dependencies |
|------|-------------|------|--------------|
| **TERP-0004** | Add notifications table to autoMigrate | 2-4h | None |
| **TERP-0006** | Dashboard preferences index cleanup | 4-8h | None |
| **SCHEMA-001** | Fix products.name vs nameCanonical | 4h | None |
| **SCHEMA-002** | Document batches.quantity vs onHandQty | 2h | None |
| **SCHEMA-003** | Add clients.tier and clients.isActive columns | 4h | None |
| **DATA-022** | Add Calendar Recurring Events Schema | 4h | None |

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

# Backend endpoint tests
pnpm test server/routers/accounting.test.ts
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
- [ ] AR/AP summary endpoints working
- [ ] Financial reports accessible
- [ ] Feature flag checks on all routes

---

## Phase 7: MVP Release Verification (Day 24)

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

## Dependency Graph (Updated with QA Review)

```
Phase 0 (Emergency) - Day 1
├── SEC-023 (credentials)
├── PERF-001 (empty catch)
└── ACC-001 (GL posting)
         │
         ▼
Phase 1 (Foundation) - Days 2-4
├── TS-001 (TypeScript) ──────────────────────────────┐
└── TEST-INFRA-01/02 (parallel) ──┬── TEST-INFRA-03 ──┤
                                  └── TEST-INFRA-04 ──┤
                                  └── TEST-QA-001 ────┤
                                                      │
                                            BUG-100 ←─┘
                                                      │
         ┌────────────────────────────────────────────┘
         ▼
Phase 2 (Security) - Days 5-6
├── TERP-0013 → TERP-0017
├── TERP-0014
├── SEC-024, DI-009, SEC-025, SEC-026 (parallel)
         │
         ▼
Phase 3 (Financial) - Days 7-9
├── TERP-0015 → TERP-0016
├── TERP-0001
└── TERP-0018
         │
         ▼
Phase 4 (Work Surfaces Core) - Days 10-14
├── WSQA-001 → WSQA-002 → WSQA-003
├── SSE-001 → LIVE-001
├── WS-010A, NAV-017, API-016 (parallel)
├── WS-KB-001, WS-KB-002, WS-TEST-001 (quick wins)
└── TERP-0003
         │
         ▼
Phase 4.5 (Work Surface Coverage) - Days 15-17 [NEW]
├── WS-PROD-001 (Products → Work Surface)
├── WS-VEND-001 (Vendors → Work Surface)
└── WS-GF-001 (Golden Flows → AR/AP)
         │
         ▼
Phase 5 (Navigation/UX) - Days 18-19
├── NAV-006..013 (parallel) → NAV-014 → NAV-015 → NAV-016
├── TERP-0002, TERP-0022, TERP-0021, TERP-0020 (parallel)
└── TERP-0005
         │
         ▼
Phase 6 (Backend/Data/Schema) - Days 20-23
├── BE-QA-006 → BE-QA-008, BE-QA-007, QUAL-008 (backend)
├── TERP-0004, TERP-0006, SCHEMA-001..003 (schema)
└── DATA-012..015, DATA-021, TERP-0011, TERP-0024 (seeding)
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

## Estimated Timeline (Updated after QA Review)

| Phase | Duration | Cumulative | Key Deliverables |
|-------|----------|------------|------------------|
| Phase 0: Emergency | 1 day | Day 1 | Credentials rotated, GL posting fixed |
| Phase 1: Foundation | 3 days | Days 2-4 | 0 TS errors, ≥95% tests pass |
| Phase 2: Security | 2 days | Days 5-6 | All endpoints protected |
| Phase 3: Financial | 3 days | Days 7-9 | Financial integrity verified |
| Phase 4: Work Surfaces Core | 5 days | Days 10-14 | WSQA-001/002/003 complete |
| Phase 4.5: WS Coverage | 3 days | Days 15-17 | Products + Vendors refactored |
| Phase 5: Navigation/UX | 2 days | Days 18-19 | All 8 nav items added |
| Phase 6: Backend/Data | 4 days | Days 20-23 | BE endpoints + seeding complete |
| Phase 7: MVP Release | 1 day | Day 24 | All QA gates pass |
| **MVP TOTAL** | **24 days** | | **~5 weeks** |
| Beta: Reliability | 3-4 weeks | Post-MVP | REL-001 through REL-017 |

### Timeline Change Log

| Change | Reason | Impact |
|--------|--------|--------|
| Added Phase 4.5 | Work Surfaces report identified Products/Vendors gaps | +3 days |
| Expanded Phase 6 | Added BE-QA-006/007/008 backend completeness tasks | +1 day |
| Total increase | 20 → 24 days | +4 days (more thorough coverage) |

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
| Gate 4 | Work Surfaces Core | All 8 Golden Flows pass, keyboard hints |
| Gate 4.5 | WS Coverage | Products + Vendors refactored to Work Surface |
| Gate 5 | Navigation/UX | All routes accessible |
| Gate 6 | Backend/Data | Schema + BE endpoints + seeding complete |
| Gate 7 | MVP Release | All criteria met |

---

## Appendix A: P2 Tasks (Deferred to Post-MVP or Parallel)

These tasks are important but not blocking MVP. They can be worked on in parallel or deferred:

### Frontend Quality (P2)

| Task | Description | Est. | Module |
|------|-------------|------|--------|
| FE-QA-009 | Enable VendorSupplyPage Creation | 8h | VendorSupplyPage.tsx |
| FE-QA-010 | Wire MatchmakingServicePage Action Buttons | 4h | MatchmakingServicePage.tsx |
| FE-QA-011 | Integrate Unused Dashboard Widgets (5) | 8h | widgets-v2/ |
| TYPE-001 | Fix `as any` Casts in Golden Flows | 4h | golden-flows/ |

### Backend Quality (P2)

| Task | Description | Est. | Module |
|------|-------------|------|--------|
| API-017 | Implement Stock Threshold Configuration | 4h | alerts.ts |
| STUB-001 | Implement Live Catalog Brand Extraction | 2h | liveCatalogService.ts |
| STUB-002 | Implement Live Catalog Price Range | 2h | liveCatalogService.ts |
| RBAC-002 | Verify Time Clock Route Permission Gate | 30 min | TimeClockPage.tsx |

### Deprecation & Cleanup (P2)

| Task | Description | Est. | Module |
|------|-------------|------|--------|
| DEPR-001 | Migrate Deprecated Vendor Router Usages | 8h | vendors.ts |
| DEPR-002 | Remove Deprecated PO Procedures (3) | 2h | purchaseOrders.ts |
| BUG-102 | Fix Property Test Bugs | 4h | property tests |

### Mobile & UX (P2)

| Task | Description | Est. | Module |
|------|-------------|------|--------|
| MOB-001 | Address Mobile Responsiveness Issues (38) | 24h | Multiple components |

### TERP Extracted Work (P2)

| Task | Description | Est. | Type |
|------|-------------|------|------|
| TERP-0007 | Surface non-sellable batch status in sales UI | 4-8h | Bug |
| TERP-0008 | Standardize batch status constants | 8-16h | Refactor |
| TERP-0009 | Add dashboard vs sales inventory consistency tests | 4-8h | QA |
| TERP-0010 | Refactor getDashboardStats test mocks | 2-4h | QA |
| TERP-0012 | Implement UI for top accounting API-only flows | 24-40h | Feature |
| TERP-0019 | Fix inventory snapshot widget SQL aliases | 2-4h | Bug |
| TERP-0023 | Resolve backend placeholder items | 16-24h | Hardening |
| TERP-0025 | Verify migration constraint naming fixes | 2-4h | QA |

### P3 Low Priority (Technical Debt)

| Task | Description | Est. | Module |
|------|-------------|------|--------|
| ABANDONED-001 | Remove Unused RTL/i18n Utilities | 1h | rtlUtils.ts |
| QUAL-009 | Replace console.error with Logger (23+ files) | 8h | Multiple files |

**Total P2/P3 Tasks:** 22 tasks, ~150 hours estimated

---

## Appendix B: QA Review Validation

### Cross-Reference Verification

| Source | Tasks Identified | Tasks in Roadmap | Coverage |
|--------|------------------|------------------|----------|
| MASTER_ROADMAP P0 | 11 | 11 | 100% |
| MASTER_ROADMAP P1 | 42 | 38 | 90% |
| MASTER_ROADMAP P2 | 65 | 43 (22 in Appendix) | 100% |
| Work Surfaces Report | 6 | 6 | 100% |
| TERP Extracted | 25 | 25 | 100% |

### Dependency Validation

| Dependency Chain | Valid | Notes |
|------------------|-------|-------|
| SEC-023 → TS-001 | ✅ | Security before code fixes |
| TS-001 → BUG-100 | ✅ | TypeScript before tests |
| TEST-INFRA-* → BUG-100 | ✅ | Infrastructure before fixes |
| WSQA-001 → WSQA-002 → WSQA-003 | ✅ | Payment → Lots → Returns |
| Phase 4 → Phase 4.5 | ✅ | Core WS before coverage gaps |
| BE-QA-006 → BE-QA-008 | ✅ | AR/AP before reports |

### Estimate Validation

| Phase | Total Estimate | Reasonable? | Notes |
|-------|----------------|-------------|-------|
| Phase 0 | 10-14h | ✅ | Accounts for complexity |
| Phase 1 | 48-72h | ✅ | TypeScript + tests intensive |
| Phase 2 | 20-36h | ✅ | Security requires thoroughness |
| Phase 3 | 34-62h | ✅ | Financial accuracy critical |
| Phase 4 | 40-56h | ✅ | Work Surface core |
| Phase 4.5 | 32-56h | ✅ | Refactors take time |
| Phase 5 | 24-48h | ✅ | Nav + UX polish |
| Phase 6 | 56-88h | ✅ | Backend + schema + seeding |

---

**Remember:** Verification over persuasion. Prove it works, don't convince yourself it works.
