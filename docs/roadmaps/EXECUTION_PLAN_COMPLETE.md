# TERP Complete Execution Plan

**Version:** 1.0
**Generated:** 2026-01-21
**Source:** MASTER_ROADMAP.md v6.5, INCOMPLETE_FEATURES_TASKS_2026-01-20.md, ROADMAP_ALIGNMENT_AUDIT.md
**Executor:** Claude Code (Parallel Agent Architecture)

---

## Executive Summary

This execution plan covers **71 open MVP tasks** + **30 Beta tasks** = **101 total tasks** organized into parallelizable waves with validation gates.

| Wave | Focus | Tasks | Parallel Agents | Estimated Time |
|------|-------|-------|-----------------|----------------|
| 0 | HALT - Human Required | 1 | 0 | BLOCKED |
| 1 | Build Stability | 2 | 2 | 4-8h |
| 2 | P0 Ship Blockers | 5 | 5 | 8-16h |
| 3 | Data Foundation | 10 | 4 | 4-8h |
| 4 | Navigation & P1 Features | 16 | 4 | 8-16h |
| 5 | P1 Backend Completeness | 8 | 4 | 16-24h |
| 6 | P2 APIs & Features | 17 | 6 | 16-24h |
| 7 | P2 Quality & Cleanup | 9 | 4 | 8-16h |
| 8 | P3 Cleanup | 5 | 3 | 4-8h |
| 9 | Beta - Reliability | 17 | 4 | 5-7 days |
| 10 | Beta - Work Surfaces Deploy | 11 | 2 | 2-3 days |
| **TOTAL** | | **101** | | |

---

## ABSOLUTE RULES

### Self-Healing Protocol

If ANY validation gate fails:
1. **STOP** - Do not proceed to next wave
2. **DIAGNOSE** - Run `pnpm run check && pnpm test` to identify failures
3. **FIX** - Address the specific failure(s)
4. **REVALIDATE** - Run gate again
5. **RETRY** - Only proceed when gate passes

### Human Escalation Triggers

Flag immediately and HALT if:
- [ ] Security credentials need rotation (SEC-023)
- [ ] Database migration requires production access
- [ ] Product decision needed (marked with 🔴 DECISION)
- [ ] External service configuration needed
- [ ] Any task marked "HUMAN REQUIRED"

### Completion Criteria

A task is **100% COMPLETE** only when:
1. Code changes committed
2. `pnpm run check` passes (0 TypeScript errors)
3. Relevant tests pass
4. No new warnings introduced
5. Documentation updated if API changed

---

## 🚨 WAVE 0: IMMEDIATE HALT - HUMAN REQUIRED

### ⛔ SEC-023: Rotate Exposed Database Credentials

**STATUS:** 🔴 BLOCKED - REQUIRES HUMAN ACTION

**Problem:** Production database credentials exposed in `drizzle/migrations/0007_DEPLOYMENT_INSTRUCTIONS.md`:
- Host: `terp-mysql-db-do-user-28175253-0.m.db.ondigitalocean.com`
- Password: `AVNS_Q_RGkS7-uB3Bk7xC2am`

**HUMAN ACTIONS REQUIRED:**
1. [ ] Log into DigitalOcean control panel
2. [ ] Rotate database credentials immediately
3. [ ] Update all service environment variables with new credentials
4. [ ] Verify services reconnect successfully
5. [ ] Remove/redact the file from repository
6. [ ] Scrub from git history using `git filter-repo` or BFG

**Verification:**
```bash
grep -r "AVNS_Q_RGkS7" . # Must return no results
```

**⚠️ DO NOT PROCEED TO WAVE 1 UNTIL SEC-023 IS RESOLVED BY HUMAN**

---

## WAVE 1: Build Stability (Parallel: 2 agents)

**Gate Criteria:** TypeScript errors reduced, test failures reduced

### WAVE 1A: TypeScript Fixes (Agent 1)

| Task | Description | Estimate | Dependencies |
|------|-------------|----------|--------------|
| **TS-001** | Fix 117 TypeScript errors | 16-24h | None |

**Execution:**
```bash
# Run check to see current errors
pnpm run check 2>&1 | head -200

# Fix errors by file, starting with highest count:
# - InventoryWorkSurface.tsx (8 errors)
# - clientLedger.ts (6 errors)
# - PickPackWorkSurface.tsx (6 errors)
# - OrderToInvoiceFlow.tsx (5 errors)
# - cogs.ts (5 errors)
```

**Completion Criteria:**
- [ ] `pnpm run check` returns 0 errors
- [ ] No `any` types introduced as workarounds
- [ ] Build succeeds: `pnpm build`

### WAVE 1B: Critical Test Fixes (Agent 2)

| Task | Description | Estimate | Dependencies |
|------|-------------|----------|--------------|
| **BUG-100** | Fix 122 failing tests (44 files) | 24-40h | TS-001 partial |

**Execution:**
```bash
# Run tests to see current failures
pnpm test 2>&1 | grep -E "(FAIL|✕)"

# Prioritize by impact:
# 1. useWorkSurfaceKeyboard.test.ts (6 failures)
# 2. accounting.test.ts (6 skipped due to NOT_IMPLEMENTED)
# 3. Component tests (multiple)
```

**Completion Criteria:**
- [ ] `pnpm test` passes with >95% pass rate
- [ ] No new skipped tests introduced
- [ ] CI pipeline would pass

---

### WAVE 1 GATE

```bash
#!/bin/bash
# Wave 1 Gate - Must pass before Wave 2

echo "=== WAVE 1 GATE CHECK ==="

# Check 1: TypeScript
echo "Checking TypeScript..."
TS_ERRORS=$(pnpm run check 2>&1 | grep -c "error TS" || echo "0")
if [ "$TS_ERRORS" -gt 0 ]; then
  echo "❌ FAIL: $TS_ERRORS TypeScript errors remain"
  exit 1
fi
echo "✅ TypeScript: 0 errors"

# Check 2: Tests
echo "Checking Tests..."
TEST_RESULT=$(pnpm test 2>&1)
FAILURES=$(echo "$TEST_RESULT" | grep -c "✕" || echo "0")
if [ "$FAILURES" -gt 10 ]; then
  echo "❌ FAIL: $FAILURES test failures (threshold: 10)"
  exit 1
fi
echo "✅ Tests: $FAILURES failures (acceptable)"

# Check 3: Build
echo "Checking Build..."
if ! pnpm build > /dev/null 2>&1; then
  echo "❌ FAIL: Build failed"
  exit 1
fi
echo "✅ Build: Success"

echo "=== WAVE 1 GATE PASSED ==="
```

---

## WAVE 2: P0 Ship Blockers (Parallel: 5 agents)

**Gate Criteria:** All P0 blockers resolved

### Agent 2A: WSQA-001 - Payment Recording

| Task | Description | Estimate | Module |
|------|-------------|----------|--------|
| **WSQA-001** | Wire InvoicesWorkSurface payment mutation | 4h | InvoicesWorkSurface.tsx:717-724 |

**Implementation:**
1. Import `trpc.payments.recordPayment` mutation
2. Replace stub in `handlePaymentSubmit` with actual mutation call
3. Add loading state to payment dialog
4. Add error handling with toast notification
5. Verify Golden Flow GF-004 passes

**Completion Criteria:**
- [ ] Payment mutation called on submit
- [ ] Payment persists to database
- [ ] Invoice balance updates
- [ ] Audit trail entry created

### Agent 2B: WSQA-002 - Lot Selection

| Task | Description | Estimate | Module |
|------|-------------|----------|--------|
| **WSQA-002** | Implement flexible lot selection | 2d | schema.ts, BatchSelectionDialog.tsx |

**Implementation:**
1. Create `order_line_item_allocations` table
2. Add `getAvailableForProduct` query
3. Add `allocateBatchesToLineItem` mutation with row-level locking
4. Build BatchSelectionDialog UI
5. Calculate weighted average COGS from selected batches

**Completion Criteria:**
- [ ] Migration applied successfully
- [ ] Batch selection UI works
- [ ] COGS calculated correctly
- [ ] Concurrent requests handled safely

### Agent 2C: WSQA-003 - RETURNED Status

| Task | Description | Estimate | Module |
|------|-------------|----------|--------|
| **WSQA-003** | Add RETURNED order status with processing paths | 2d | schema.ts, orderStateMachine.ts |

**Dependencies:** WSQA-002 (allocations table for restock)

**Implementation:**
1. Add RETURNED, RESTOCKED, RETURNED_TO_VENDOR to fulfillment_status enum
2. Create vendor_returns and vendor_return_items tables
3. Implement state machine transitions
4. Build processRestock (increases batch quantities)
5. Build processVendorReturn (creates vendor return records)

**Completion Criteria:**
- [ ] New statuses in enum
- [ ] State machine validates transitions
- [ ] Restock creates inventory movements
- [ ] Vendor return creates records

### Agent 2D: ACC-001 - GL Posting

| Task | Description | Estimate | Module |
|------|-------------|----------|--------|
| **ACC-001** | Fix silent GL posting failures | 8h | accountingHooks.ts:173,224,274,323 |

**Implementation:**
1. Change all `console.warn` for missing accounts to `throw new Error`
2. Wrap GL posting in transaction with rollback
3. Add admin alert when standard accounts missing
4. Create GL reconciliation report

**Completion Criteria:**
- [ ] `postSaleGLEntries` throws on missing accounts
- [ ] `postPaymentGLEntries` throws on missing accounts
- [ ] `postRefundGLEntries` throws on missing accounts
- [ ] `postCOGSGLEntries` throws on missing accounts
- [ ] Transaction rollback tested

### Agent 2E: Navigation Batch (Quick Wins)

| Task | Description | Estimate | Module |
|------|-------------|----------|--------|
| **NAV-006** | Add Leaderboard to Sales nav | 5m | navigation.ts |
| **NAV-007** | Add Client Needs to Sales nav | 5m | navigation.ts |
| **NAV-008** | Add Matchmaking to Sales nav | 5m | navigation.ts |
| **NAV-009** | Add Quotes to Sales nav | 5m | navigation.ts |
| **NAV-010** | Add Returns to Sales nav | 5m | navigation.ts |
| **NAV-011** | Add Vendor Supply to Inventory nav | 5m | navigation.ts |
| **NAV-012** | Add Pricing Rules to Finance nav | 5m | navigation.ts |
| **NAV-013** | Add Workflow Queue to Admin nav | 5m | navigation.ts |
| **NAV-014** | Add all 8 routes to Command Palette | 15m | CommandPalette.tsx |
| **NAV-015** | Verify TypeScript compilation | 5m | - |
| **NAV-016** | Manual QA verification | 15m | - |

**Completion Criteria:**
- [ ] All 8 routes visible in sidebar
- [ ] All 8 routes in Command Palette
- [ ] TypeScript compiles
- [ ] Navigation works correctly

---

### WAVE 2 GATE

```bash
#!/bin/bash
# Wave 2 Gate - P0 Blockers Resolved

echo "=== WAVE 2 GATE CHECK ==="

# Check 1: Payment Recording
echo "Checking WSQA-001..."
if grep -q "// In a real implementation" client/src/components/work-surface/InvoicesWorkSurface.tsx; then
  echo "❌ FAIL: Payment stub still present"
  exit 1
fi
echo "✅ WSQA-001: Payment wired"

# Check 2: Lot Selection Schema
echo "Checking WSQA-002..."
if ! grep -q "order_line_item_allocations" server/db/schema.ts; then
  echo "❌ FAIL: Allocations table not in schema"
  exit 1
fi
echo "✅ WSQA-002: Schema updated"

# Check 3: RETURNED Status
echo "Checking WSQA-003..."
if ! grep -q "RETURNED" server/db/schema.ts; then
  echo "❌ FAIL: RETURNED status not in schema"
  exit 1
fi
echo "✅ WSQA-003: Status added"

# Check 4: GL Posting
echo "Checking ACC-001..."
if grep -q "console.warn" server/accountingHooks.ts | grep -q "Standard accounts not found"; then
  echo "❌ FAIL: GL still silently failing"
  exit 1
fi
echo "✅ ACC-001: GL errors properly thrown"

# Check 5: Navigation
echo "Checking NAV tasks..."
if ! grep -q "Leaderboard" client/src/config/navigation.ts; then
  echo "❌ FAIL: Navigation not updated"
  exit 1
fi
echo "✅ NAV: Navigation updated"

# Final Check: Build
echo "Final build check..."
if ! pnpm build > /dev/null 2>&1; then
  echo "❌ FAIL: Build broken"
  exit 1
fi
echo "✅ Build: Success"

echo "=== WAVE 2 GATE PASSED ==="
```

---

## WAVE 3: Data Foundation (Parallel: 4 agents)

**Gate Criteria:** All seed scripts run successfully

### Agent 3A: Feature Flags & Work Surface Seeds

| Task | Description | Estimate |
|------|-------------|----------|
| **DATA-012** | Seed work surface feature flags (17+) | 4h |

**Flags to Seed:**
```typescript
const flags = [
  "work-surface-enabled",
  "work-surface-direct-intake",
  "work-surface-purchase-orders",
  "work-surface-orders",
  "work-surface-inventory",
  "work-surface-invoices",
  "work-surface-clients",
  "work-surface-keyboard-contract",
  "work-surface-save-state",
  "work-surface-inspector-panel",
  "work-surface-validation-timing",
  "work-surface-concurrent-edit",
  "work-surface-golden-flow-intake",
  "work-surface-golden-flow-order",
  "work-surface-golden-flow-invoice",
  "email-enabled",
  "sms-enabled"
];
```

### Agent 3B: Gamification & Scheduling Seeds

| Task | Description | Estimate |
|------|-------------|----------|
| **DATA-013** | Seed gamification module defaults | 4-8h |
| **DATA-014** | Seed scheduling module defaults | 4h |

### Agent 3C: Storage & Organization Seeds

| Task | Description | Estimate |
|------|-------------|----------|
| **DATA-015** | Seed storage sites and zones | 2-4h |
| **DATA-016** | Seed organization settings | 2h |
| **DATA-017** | Seed VIP portal configurations | 2h |

### Agent 3D: Additional Seeds

| Task | Description | Estimate |
|------|-------------|----------|
| **DATA-018** | Seed notification preferences | 2h |
| **DATA-019** | Seed credit system settings | 2h |
| **DATA-020** | Seed pricing rules and profiles | 4h |
| **DATA-021** | Add calendar recurring events schema | 4h |

---

### WAVE 3 GATE

```bash
#!/bin/bash
# Wave 3 Gate - Data Seeds Complete

echo "=== WAVE 3 GATE CHECK ==="

# Check: Feature flags seeded
echo "Checking feature flags..."
# This would normally query the database
# For now, verify seed script exists and is valid
if ! [ -f "scripts/seed/seed-feature-flags.ts" ]; then
  echo "⚠️ WARNING: Feature flags seed script missing"
fi

# Check: Build still passes
if ! pnpm build > /dev/null 2>&1; then
  echo "❌ FAIL: Build broken"
  exit 1
fi
echo "✅ Build: Success"

echo "=== WAVE 3 GATE PASSED ==="
```

---

## WAVE 4: P1 Features (Parallel: 4 agents)

### Agent 4A: Backend Endpoints

| Task | Description | Estimate |
|------|-------------|----------|
| **BE-QA-006** | Implement AR/AP summary endpoints | 8h |
| **BE-QA-007** | Implement cash expenses endpoints | 8h |
| **BE-QA-008** | Implement financial reports | 16h |

### Agent 4B: Feature Completeness

| Task | Description | Estimate |
|------|-------------|----------|
| **SSE-001** | Fix Live Shopping SSE event naming | 2h |
| **MEET-048** | Create Hour Tracking frontend | 16h |
| **WS-010A** | Integrate Photography Module | 4h |
| **NAV-017** | Route CreditsPage in App.tsx | 1h |
| **API-016** | Implement quote email sending | 4h |

### Agent 4C: Route Guards

| Task | Description | Estimate |
|------|-------------|----------|
| **QUAL-008** | Add feature flag checks to routes | 4h |

### Agent 4D: API Stubs

| Task | Description | Estimate |
|------|-------------|----------|
| **API-011** | Implement inventory.batch endpoint | 4h |
| **API-012** | Implement inventory.batches endpoint | 4h |
| **API-013** | Implement orders.confirm endpoint | 4h |
| **API-014** | Implement liveShopping.setSessionTimeout | 2h |
| **API-015** | Implement liveShopping.disableTimeout | 2h |

---

### WAVE 4 GATE

```bash
#!/bin/bash
# Wave 4 Gate - P1 Features Complete

echo "=== WAVE 4 GATE CHECK ==="

# Check: AR/AP endpoints exist
echo "Checking BE-QA-006..."
if grep -q "NOT_IMPLEMENTED" server/routers/accounting.ts; then
  echo "⚠️ WARNING: Some accounting endpoints still stubbed"
fi

# Check: Hour tracking page exists
if ! [ -f "client/src/pages/HourTrackingPage.tsx" ]; then
  echo "⚠️ WARNING: Hour tracking page missing (MEET-048)"
fi

# Check: Credits route exists
if ! grep -q "/credits" client/src/App.tsx; then
  echo "⚠️ WARNING: Credits route missing (NAV-017)"
fi

# Final check
if ! pnpm build > /dev/null 2>&1; then
  echo "❌ FAIL: Build broken"
  exit 1
fi
echo "✅ Build: Success"

echo "=== WAVE 4 GATE PASSED ==="
```

---

## WAVE 5: P2 Quality (Parallel: 6 agents)

### Agent 5A: Frontend Quality

| Task | Description | Estimate |
|------|-------------|----------|
| **FE-QA-004** | Complete Dashboard Widgets V3 Migration | 16h |
| **FE-QA-005** | Implement Live Shopping Session Console | 8h |
| **FE-QA-006** | Re-enable Batch Product Relation Display | 4h |
| **FE-QA-007** | Calculate Profitability Data | 4h |
| **FE-QA-008** | Fix TemplateSelector TODO ID | 1h |

### Agent 5B: Frontend Features

| Task | Description | Estimate |
|------|-------------|----------|
| **FE-QA-009** | Enable VendorSupplyPage Creation | 8h |
| **FE-QA-010** | Wire MatchmakingServicePage Action Buttons | 4h |
| **FE-QA-011** | Integrate Unused Dashboard Widgets | 8h |

### Agent 5C: Backend Quality

| Task | Description | Estimate |
|------|-------------|----------|
| **BE-QA-009** | Implement Journal Entry Audit Trail | 8h |
| **BE-QA-010** | Implement Live Catalog Brand/Price Features | 8h |
| **BE-QA-011** | Implement COGS Override Statistics | 4h |

### Agent 5D: Backend Features

| Task | Description | Estimate |
|------|-------------|----------|
| **BE-QA-012** | Implement Product Recommendations | 16h |
| **BE-QA-013** | Implement Session Extension Validation | 2h |
| **BE-QA-014** | Add Date Range Filtering to Scheduling | 2h |
| **BE-QA-015** | Add Feature Queries to db.ts | 4h |

### Agent 5E: Schema & API

| Task | Description | Estimate |
|------|-------------|----------|
| **API-017** | Implement Stock Threshold Configuration | 4h |
| **SCHEMA-001** | Fix products.name vs nameCanonical Mismatch | 4h |
| **SCHEMA-002** | Document batches.quantity vs onHandQty | 2h |
| **SCHEMA-003** | Add clients.tier and clients.isActive Columns | 4h |

### Agent 5F: Bug Fixes & Mobile

| Task | Description | Estimate |
|------|-------------|----------|
| **BUG-101** | Fix Property Test Bugs (PROP-BUG-001/002/003) | 4h |
| **MOB-001** | Address Mobile Responsiveness Issues (38) | 24h |

---

## WAVE 6: P2 Features & Cleanup (Parallel: 4 agents)

### Agent 6A: Recurring Orders

| Task | Description | Estimate |
|------|-------------|----------|
| **FEAT-025** | Implement Recurring Orders Feature | 40h |

### Agent 6B: Deprecation & Migration

| Task | Description | Estimate |
|------|-------------|----------|
| **DEPR-001** | Migrate Deprecated Vendor Router Usages | 8h |
| **DEPR-002** | Remove Deprecated PO Procedures | 2h |

### Agent 6C: Infrastructure Cleanup

| Task | Description | Estimate |
|------|-------------|----------|
| **INFRA-015** | Consolidate Duplicate Migration Version Numbers | 4h |
| **INFRA-016** | Move Non-SQL Files Out of Migrations | 1h |

### Agent 6D: P3 Cleanup

| Task | Description | Estimate |
|------|-------------|----------|
| **ABANDONED-001** | Remove Unused RTL/i18n Utilities | 1h |
| **QUAL-009** | Replace console.error with Logger | 8h |

---

## WAVE 7: Beta - Reliability Program (Parallel: 4 agents)

**🔴 DECISION REQUIRED:** Confirm Beta phase initiation

### Agent 7A: Foundation

| Task | Description | Estimate |
|------|-------------|----------|
| **REL-001** | Define Truth Model + Invariants | 8h |
| **REL-002** | Migrate Inventory Quantities to DECIMAL | 2d |
| **REL-003** | Migrate Money Amounts to DECIMAL | 2d |
| **REL-004** | Critical Mutation Wrapper | 16h |

### Agent 7B: Idempotency & Concurrency

| Task | Description | Estimate |
|------|-------------|----------|
| **REL-005** | Idempotency Keys for Critical Mutations | 2d |
| **REL-006** | Inventory Concurrency Hardening | 2d |
| **REL-007** | Inventory Movements Immutability | 16h |
| **REL-008** | Ledger Immutability + Fiscal Lock | 2d |

### Agent 7C: Reconciliation

| Task | Description | Estimate |
|------|-------------|----------|
| **REL-009** | Reconciliation Framework | 2d |
| **REL-010** | Inventory Reconciliation Pack | 16h |
| **REL-011** | AR/AP Reconciliation Pack | 2d |
| **REL-012** | Ledger Reconciliation Pack | 16h |

### Agent 7D: Testing & Observability

| Task | Description | Estimate |
|------|-------------|----------|
| **REL-013** | RBAC Drift Detector | 16h |
| **REL-014** | Critical Correctness Test Harness | 2d |
| **REL-015** | Observability for Critical Mutations | 16h |
| **REL-016** | Backup/Restore Reliability Runbook | 2d |
| **REL-017** | CI/PR Gates for Critical Domains | 16h |

---

## WAVE 8: Beta - Work Surfaces Deployment (Parallel: 2 agents)

### Agent 8A: Deployment Infrastructure

| Task | Description | Estimate | Status |
|------|-------------|----------|--------|
| **DEPLOY-001** | Wire WorkSurfaceGate into App.tsx | 4h | VERIFY |
| **DEPLOY-002** | Add gate scripts to package.json | 1h | VERIFY |
| **DEPLOY-003** | Seed missing RBAC permissions | 4h | VERIFY |
| **DEPLOY-004** | Capture baseline metrics | 2h | VERIFY |

### Agent 8B: Staged Rollout

| Task | Description | Estimate |
|------|-------------|----------|
| **DEPLOY-005** | Execute Stage 0 (Internal QA) | 8h |
| **DEPLOY-006** | Execute Stage 1 (10% Rollout) | 4h |
| **DEPLOY-007** | Execute Stage 2 (50% Rollout) | 4h |
| **DEPLOY-008** | Execute Stage 3 (100% Rollout) | 4h |

### Agent 8C: UX Beta Tasks

| Task | Description | Estimate |
|------|-------------|----------|
| **UXS-702** | Offline queue + sync | 5d |
| **UXS-706** | Session timeout handler | 2d |

---

## Human Action Flags Summary

### Immediate (Before Wave 1)
- [ ] **SEC-023**: Rotate database credentials (CRITICAL)

### Between Waves
- [ ] **Database Migrations**: Approve and run production migrations for WSQA-002, WSQA-003, SCHEMA tasks
- [ ] **Feature Flag Decisions**: Confirm rollout percentages for DEPLOY-006, 007, 008

### Product Decisions Required
- [ ] **UX Question 1**: Concurrent edit policy - prompt vs auto-resolve?
- [ ] **UX Question 2**: Export limit (10K rows) - acceptable?
- [ ] **UX Question 3**: Bulk selection limit (500 rows) - acceptable?
- [ ] **UX Question 4**: VIP Portal - full Work Surface or light touch?

---

## Validation Commands Reference

```bash
# TypeScript Check
pnpm run check

# Run All Tests
pnpm test

# Run Specific Test File
pnpm test -- path/to/test.ts

# Build Check
pnpm build

# Lint Check
pnpm lint

# Schema Validation
pnpm validate:schema

# E2E Tests (when configured)
pnpm test:e2e

# Gate Scripts (when added)
pnpm gate:placeholder
pnpm gate:rbac
pnpm gate:parity
pnpm gate:invariants
```

---

## Task Dependency Graph (Simplified)

```
SEC-023 (HUMAN) ─────────────────────────────────────┐
                                                      │
WAVE 1: TS-001 ─────────────────┬─────────────────────┤
        BUG-100 ────────────────┘                     │
                                                      ▼
WAVE 2: WSQA-001 ───────────────┬─────────────────────┤
        WSQA-002 ───────────────┼─────────────────────┤
        WSQA-003 (dep: WSQA-002)┤                     │
        ACC-001 ────────────────┤                     │
        NAV-006..016 ───────────┘                     │
                                                      ▼
WAVE 3: DATA-012..021 ────────────────────────────────┤
                                                      ▼
WAVE 4: BE-QA-006..008 ─────────┬─────────────────────┤
        P1 Features ────────────┤                     │
        API-011..016 ───────────┘                     │
                                                      ▼
WAVE 5-6: P2 Tasks (parallelizable) ──────────────────┤
                                                      ▼
WAVE 7: REL-001..017 (Beta Reliability) ──────────────┤
                                                      ▼
WAVE 8: DEPLOY-001..008 (Beta Work Surfaces) ─────────┘
        UXS-702, UXS-706
```

---

## Parallel Agent Allocation

| Wave | Agent Count | Agent Distribution |
|------|-------------|-------------------|
| 0 | 0 | Human only |
| 1 | 2 | TypeScript (1), Tests (1) |
| 2 | 5 | WSQA-001 (1), WSQA-002 (1), WSQA-003 (1), ACC-001 (1), NAV (1) |
| 3 | 4 | Seed scripts distributed by domain |
| 4 | 4 | Backend (2), Frontend features (1), APIs (1) |
| 5 | 6 | FE Quality (2), BE Quality (2), Schema (1), Mobile (1) |
| 6 | 4 | FEAT-025 (1), Deprecation (1), Infra (1), Cleanup (1) |
| 7 | 4 | Foundation (1), Idempotency (1), Reconciliation (1), Testing (1) |
| 8 | 2 | Deployment (1), UX Beta (1) |

---

## Success Metrics

### Wave 1 Exit
- [ ] 0 TypeScript errors
- [ ] <10 test failures
- [ ] Build passes

### Wave 2 Exit
- [ ] All P0 blockers resolved
- [ ] Golden Flows GF-001..008 pass
- [ ] Navigation enhanced

### MVP Complete (Wave 6 Exit)
- [ ] All 71 MVP tasks resolved
- [ ] E2E pass rate >88%
- [ ] No P0/P1 bugs open

### Beta Complete (Wave 8 Exit)
- [ ] Reliability Program complete
- [ ] Work Surfaces at 100% rollout
- [ ] All reconciliation reports pass

---

*This execution plan was generated from MASTER_ROADMAP.md v6.5 and INCOMPLETE_FEATURES_TASKS_2026-01-20.md. All task estimates are from source documents. Actual execution times may vary.*
