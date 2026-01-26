# Golden Flow Execution Plan

**Created:** 2026-01-26
**Purpose:** Prioritize task execution to achieve full E2E functionality of golden flows first, then address remaining work
**Total Estimated Hours:** ~214h

---

## Executive Summary

This execution plan organizes all open tasks into 4 phases:

| Phase | Focus | Tasks | Est Hours | Golden Flow Impact |
|-------|-------|-------|-----------|-------------------|
| 1 | Golden Flow Blockers | 7 | 26h | Direct blockers - E2E broken without these |
| 2 | Golden Flow Hardening | 12 | 48h | Security/stability - E2E fragile without these |
| 3 | Golden Flow Enhancement | 14 | 68h | UX/completeness - E2E works but incomplete |
| 4 | Technical Debt & Quality | 22 | 72h | Code quality - no direct user impact |

---

## Golden Flows Reference

| # | Golden Flow | Status | Blocking Tasks |
|---|-------------|--------|----------------|
| GF-1 | Order Creation | Working | INV-003, ST-050 |
| GF-2 | Order to Invoice | Working | ORD-001, FIN-001 |
| GF-3 | Pick & Pack Fulfillment | Working | ST-051 |
| GF-4 | Invoice to Payment | Working | None (payment stub fixed) |
| GF-5 | Work Surface Keyboard | Working | None |

| # | Critical Path | Status | Blocking Tasks |
|---|---------------|--------|----------------|
| CP-1 | Complete Order Fulfillment | Working | INV-003, ST-050, ST-051 |
| CP-2 | Client Credit Workflow | Working | TERP-0003 |
| CP-3 | Inventory Intake | Working | None |
| CP-4 | Returns Workflow | Working | None |
| CP-5 | Sales Sheet to Quote to Order | Working | None |

---

## Phase 1: Golden Flow Blockers (26h)

**Goal:** Fix issues that cause golden flows to fail or produce incorrect data

### Batch 1.1: Data Integrity (10h)

These tasks prevent data corruption during golden flow execution.

| Task | Description | Est | Golden Flow Impact | Dependencies |
|------|-------------|-----|-------------------|--------------|
| **INV-003** | Add FOR UPDATE Lock in Batch Allocation | 2h | GF-1, CP-1 | None |
| **FIN-001** | Fix Invoice Number Race Condition | 2h | GF-2 | None |
| **ST-050** | Fix Silent Error Handling in RED Mode | 4h | GF-1, GF-2, GF-3, CP-1 | None |
| **ORD-001** | Fix Invoice Creation Timing | 4h | GF-2 | None |

**Acceptance Criteria:**
- [ ] Concurrent order confirmations cannot oversell inventory
- [ ] No duplicate invoice numbers under load
- [ ] Financial operation failures are visible (not silent)
- [ ] Invoices only created after order confirmation

**Verification:**
```bash
pnpm test server/ordersDb.test.ts
pnpm test server/arApDb.test.ts
# Manual: Create 10 concurrent orders for same batch, verify no overselling
```

---

### Batch 1.2: Transaction Atomicity (8h)

| Task | Description | Est | Golden Flow Impact | Dependencies |
|------|-------------|-----|-------------------|--------------|
| **ST-051** | Add Transaction Boundaries to Critical Operations | 8h | GF-1, GF-2, GF-3, CP-1 | ST-050 |

**Acceptance Criteria:**
- [ ] Order creation is atomic (all or nothing)
- [ ] Order cancellation rolls back inventory + GL
- [ ] Ship/deliver operations atomic
- [ ] No partial state possible

**Verification:**
```bash
pnpm test server/ordersDb.test.ts
pnpm test server/routers/orders.test.ts
# Manual: Cancel order mid-operation, verify rollback
```

---

### Batch 1.3: Architecture Foundation (8h)

| Task | Description | Est | Golden Flow Impact | Dependencies |
|------|-------------|-----|-------------------|--------------|
| **ARCH-001** | Create OrderOrchestrator Service | 8h | GF-1, GF-2, GF-3, CP-1 | ST-051 |

**Note:** Commit `bb06aad` shows this may already be complete. Verify before starting.

**Acceptance Criteria:**
- [ ] Single service handles create, confirm, ship, deliver, cancel
- [ ] All operations atomic within single transaction
- [ ] Clear separation from router layer

---

## Phase 2: Golden Flow Hardening (48h)

**Goal:** Secure and stabilize golden flows for production use

### Batch 2.1: Security Critical (8h)

These tasks protect golden flows from unauthorized access.

| Task | Description | Est | Golden Flow Impact | Dependencies |
|------|-------------|-----|-------------------|--------------|
| **SEC-027** | Protect Admin Setup Endpoints | 1h | All flows (auth) | None |
| **SEC-028** | Remove/Restrict Debug Endpoints | 1h | All flows (data exposure) | None |
| **SEC-029** | Fix Default Permission Grants | 2h | All flows (RBAC) | None |
| **SEC-030** | Fix VIP Portal Token Validation | 2h | GF-4 (VIP payments) | None |
| **TERP-0014** | Token Invalidation & Rate Limiting | 6h | All flows (session security) | None |

**Acceptance Criteria:**
- [ ] Admin endpoints require Super Admin auth
- [ ] Debug endpoints removed from production
- [ ] New users don't get read-all permissions
- [ ] VIP portal validates UUIDs
- [ ] Tokens invalidated on logout
- [ ] Auth endpoints rate-limited

---

### Batch 2.2: Client Management (6h)

Completes the client creation flow needed for CP-2.

| Task | Description | Est | Golden Flow Impact | Dependencies |
|------|-------------|-----|-------------------|--------------|
| **TERP-0003** | Add Client Wizard Dialog | 2h | CP-2 (client credit flow) | None |
| **TERP-0004** | Add Notifications Table to autoMigrate | 4h | All flows (notifications) | None |

**Acceptance Criteria:**
- [ ] "Add Client" button opens wizard dialog
- [ ] Client created successfully with validation
- [ ] Notifications table auto-created on startup

---

### Batch 2.3: Order Flow Hardening (16h)

| Task | Description | Est | Golden Flow Impact | Dependencies |
|------|-------------|-----|-------------------|--------------|
| **TERP-0017** | Convert Remaining Public Routers | 8h | All flows (auth) | SEC-027-030 |
| **ST-053** | Eliminate `any` Types in Critical Paths | 16h | GF-1, GF-2 (type safety) | None |

**Note:** ST-053 is large. Prioritize:
1. `server/ordersDb.ts` (~10 `any` types)
2. `server/routers/orders.ts` (~8 `any` types)
3. `client/src/pages/Orders.tsx` (~15 `any` types)

**Acceptance Criteria:**
- [ ] vendors, vendorSupply, dashboardEnhanced, tags routers protected
- [ ] No `any` types in orders, inventory, accounting paths

---

### Batch 2.4: Invoice & Payment Hardening (10h)

| Task | Description | Est | Golden Flow Impact | Dependencies |
|------|-------------|-----|-------------------|--------------|
| **TERP-0019** | Verify Inventory Snapshot Widget SQL | 4h | GF-2 (dashboard accuracy) | None |
| **NAV-017** | Add Missing /alerts Route | 1h | All flows (navigation) | None |
| **NAV-018** | Add Missing /reports/shrinkage Route | 1h | GF-3 (inventory reports) | None |
| **API-019** | Fix PaymentMethod Type Mismatch | 2h | GF-4 (payment recording) | None |
| **API-020** | Fix Pagination Response Inconsistency | 4h | All flows (list views) | None |

---

### Batch 2.5: Party Model (8h)

Ensures supplier/client data integrity across flows.

| Task | Description | Est | Golden Flow Impact | Dependencies |
|------|-------------|-----|-------------------|--------------|
| **PARTY-001** | Add Nullable supplierClientId to POs | 4h | CP-3 (inventory intake) | None |
| **PARTY-002** | Add FK Constraints to Bills Table | 2h | GF-4 (payment integrity) | None |
| **PARTY-004** | Convert Vendor Hard Deletes to Soft | 2h | All flows (data integrity) | None |

---

## Phase 3: Golden Flow Enhancement (68h)

**Goal:** Complete UX and add missing features for golden flows

### Batch 3.1: Dashboard & Analytics (16h)

| Task | Description | Est | Golden Flow Impact | Dependencies |
|------|-------------|-----|-------------------|--------------|
| **TERP-0002** | Dashboard Widget UX Error States | 8h | All flows (visibility) | None |
| **TERP-0005** | Reorganize Navigation Groups | 4h | All flows (discoverability) | None |
| **TERP-0020** | Replace TemplateSelector TODOs | 8h | All flows (templates) | None |

---

### Batch 3.2: Inventory UI Completion (18h)

| Task | Description | Est | Golden Flow Impact | Dependencies |
|------|-------------|-----|-------------------|--------------|
| **TERP-0021** | Restore BatchDetailDrawer Features | 12h | GF-3, CP-3 (batch visibility) | None |
| **TERP-07F** | Server-Side Batch Status Validation | 2h | GF-1 (prevent bad orders) | None |
| **PARTY-003** | Migrate Lots to Use supplierClientId | 8h | CP-3 (lot tracking) | PARTY-001 |

---

### Batch 3.3: UX Polish (24h)

| Task | Description | Est | Golden Flow Impact | Dependencies |
|------|-------------|-----|-------------------|--------------|
| **TERP-0022** | Add Confirmation Dialogs for Destructive Actions | 16h | All flows (safety) | None |
| **TERP-0023** | Resolve Backend Placeholders | 24h | Various flows | None |

**Note:** TERP-0023 is large. Prioritize by golden flow impact:
1. Receipt creation helper (GF-4)
2. Matching engine strainType (GF-1)
3. Leaderboard export (analytics)
4. COGS stats placeholders (GF-2)

---

### Batch 3.4: Schema & Migrations (10h)

| Task | Description | Est | Golden Flow Impact | Dependencies |
|------|-------------|-----|-------------------|--------------|
| **TERP-0006** | Add Cleanup Migrations for Constraints | 8h | All flows (DB stability) | None |
| **SM-003-F** | Add Status Column to Returns Schema | 4h | CP-4 (returns tracking) | None |

---

## Phase 4: Technical Debt & Quality (72h)

**Goal:** Improve code quality, testing, and observability

### Batch 4.1: Testing Infrastructure (22h)

| Task | Description | Est | Priority |
|------|-------------|-----|----------|
| **TERP-0009** | Dashboard vs Sales Inventory Tests | 8h | MEDIUM |
| **TERP-0010** | Refactor getDashboardStats Test Mocks | 4h | LOW |
| **TERP-0011** | Create QA Test Data Seeding Script | 8h | HIGH |
| **TEST-010** | Integration Tests for Order->Invoice->GL | 8h | LOW |
| **TEST-011** | Concurrent Operation Tests | 4h | LOW |
| **TEST-012** | Update Batch Status Transition Test Map | 2h | LOW |

---

### Batch 4.2: Test Fixes (10h)

| Task | Description | Est | Priority |
|------|-------------|-----|----------|
| **TEST-020** | Fix permissionMiddleware Mock Hoisting | 2h | HIGH |
| **TEST-021** | Add ResizeObserver Polyfill | 1h | HIGH |
| **TEST-022** | Fix EventFormDialog Test Environment | 2h | MEDIUM |
| **TEST-023** | Fix ResizeObserver Mock Constructor | 0.5h | HIGH |
| **TEST-024** | Add tRPC Mock isPending Property | 1h | HIGH |
| **TEST-025** | Fix tRPC Proxy Memory Leak | 1h | MEDIUM |
| **TEST-026** | Add vi.clearAllMocks() to Setup | 0.5h | MEDIUM |

---

### Batch 4.3: Lint Fixes (24h)

| Task | Description | Est | Priority |
|------|-------------|-----|----------|
| **LINT-001** | Fix React Hooks Violations | 4h | HIGH |
| **LINT-002** | Fix 'React' is not defined Errors | 2h | HIGH |
| **LINT-003** | Fix Unused Variable Errors | 4h | MEDIUM |
| **LINT-004** | Fix Array Index Key Violations | 4h | MEDIUM |
| **LINT-005** | Replace `any` Types (remaining) | 8h | MEDIUM |
| **LINT-006** | Remove console.log Statements | 2h | LOW |
| **LINT-007** | Fix Non-null Assertions | 2h | LOW |
| **LINT-008** | Fix NodeJS/HTMLTextAreaElement Types | 1h | MEDIUM |

---

### Batch 4.4: Observability (16h)

| Task | Description | Est | Priority |
|------|-------------|-----|----------|
| **OBS-001** | Add GL Balance Verification Cron | 4h | LOW |
| **OBS-002** | Add AR Reconciliation Check | 4h | LOW |
| **OBS-003** | Add Inventory Audit Trail | 4h | LOW |
| **PERF-003** | Add Mounted Ref Guard | 0.5h | MEDIUM |
| **PERF-004** | Fix PerformanceObserver Memory Leak | 0.5h | MEDIUM |
| **PERF-005** | Fix useWebVitals Mutable Ref | 1h | MEDIUM |
| **BUILD-001** | Add VITE_APP_TITLE Env Var | 0.5h | LOW |
| **BUILD-002** | Fix Chunk Size Warnings | 4h | LOW |
| **BUILD-003** | Add pnpm lint Script | 0.5h | LOW |

---

### Batch 4.5: Verification Tasks (6h)

| Task | Description | Est | Priority |
|------|-------------|-----|----------|
| **TERP-0024** | Verify DATA-021 Image Seeding | 4h | LOW |
| **TERP-0025** | Verify Migration Constraint Naming | 4h | LOW |

---

## Execution Timeline

### Week 1: Phase 1 (26h)
```
Day 1-2: Batch 1.1 - Data Integrity (10h)
  - INV-003, FIN-001, ST-050, ORD-001
Day 3: Batch 1.2 - Transaction Atomicity (8h)
  - ST-051
Day 4: Batch 1.3 - Architecture (8h)
  - ARCH-001 (verify/complete)
```

**Milestone:** All golden flows can execute without data corruption

### Week 2: Phase 2 Part 1 (24h)
```
Day 1: Batch 2.1 - Security Critical (8h)
  - SEC-027, SEC-028, SEC-029, SEC-030
Day 2-3: Batch 2.2 + 2.3 Part 1 (16h)
  - TERP-0003, TERP-0004, TERP-0014
```

**Milestone:** Golden flows secured for production

### Week 3: Phase 2 Part 2 (24h)
```
Day 1-2: Batch 2.3 Part 2 - ST-053 Critical Paths (16h)
Day 3: Batch 2.4 + 2.5 (8h)
```

**Milestone:** Golden flows hardened and stable

### Week 4-5: Phase 3 (68h)
```
Week 4: Batches 3.1 + 3.2 (34h)
Week 5: Batches 3.3 + 3.4 (34h)
```

**Milestone:** Golden flows feature-complete with full UX

### Week 6-7: Phase 4 (72h)
```
Week 6: Batches 4.1 + 4.2 + 4.3 (56h)
Week 7: Batches 4.4 + 4.5 (16h)
```

**Milestone:** Codebase quality improved, full test coverage

---

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| ST-051 complex, may take longer | Phase 1 delayed | Start early, parallel work on SEC-* |
| TERP-0023 scope creep | Phase 3 delayed | Time-box to 24h, defer low-impact items |
| Merge conflicts block work | All phases | Resolve conflicts before Phase 1 |
| ST-053 too large | Phase 2 delayed | Split by priority, defer non-critical files |

---

## Pre-Requisites

Before starting Phase 1:

1. **Resolve MASTER_ROADMAP.md merge conflicts**
   - Lines 3709-3723 (ACC/INV tasks)
   - Lines 4090-4106 (ARCH/PARTY tasks)

2. **Verify completed tasks**
   - Confirm ARCH-001 status (commit `bb06aad`)
   - Confirm INV-001/INV-002 status (commits `68fa278`, `408db95`)

3. **Archive stale sessions**
   - Clean up docs/sessions/active/ for sessions older than Jan 20

---

## Success Metrics

| Metric | Current | Phase 1 | Phase 2 | Phase 3 | Phase 4 |
|--------|---------|---------|---------|---------|---------|
| Golden Flows Working | 5/5 | 5/5 | 5/5 | 5/5 | 5/5 |
| Golden Flows Secure | Partial | Partial | 5/5 | 5/5 | 5/5 |
| Golden Flows Complete | Partial | Partial | Partial | 5/5 | 5/5 |
| Open P0 Tasks | 9 | 2 | 0 | 0 | 0 |
| Open P1 Tasks | 5 | 5 | 0 | 0 | 0 |
| `any` Types | 515 | 515 | <200 | <100 | <50 |
| Test Coverage | ~70% | ~70% | ~75% | ~80% | ~85% |

---

## Appendix: Task-to-Golden-Flow Matrix

| Task | GF-1 Order | GF-2 Invoice | GF-3 Pick/Pack | GF-4 Payment | GF-5 Keyboard |
|------|------------|--------------|----------------|--------------|---------------|
| INV-003 | **BLOCKER** | - | - | - | - |
| FIN-001 | - | **BLOCKER** | - | - | - |
| ST-050 | **BLOCKER** | **BLOCKER** | **BLOCKER** | - | - |
| ST-051 | **BLOCKER** | **BLOCKER** | **BLOCKER** | - | - |
| ORD-001 | - | **BLOCKER** | - | - | - |
| ARCH-001 | HARDEN | HARDEN | HARDEN | - | - |
| SEC-027-030 | SECURE | SECURE | SECURE | SECURE | SECURE |
| TERP-0003 | ENHANCE | - | - | - | - |
| TERP-0014 | SECURE | SECURE | SECURE | SECURE | SECURE |
| ST-053 | HARDEN | HARDEN | - | - | - |

**Legend:**
- **BLOCKER**: Flow will fail or produce corrupt data
- SECURE: Flow works but vulnerable to attack
- HARDEN: Flow works but fragile under load/edge cases
- ENHANCE: Flow works but missing features
