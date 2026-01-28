# Golden Flow Execution Plan v2.0 (Integrated)

**Created:** 2026-01-28
**Supersedes:** Golden Flow Execution Plan v1.0
**Source:** Original v1.0 + QA Protocol v3.0 Database Audit findings
**Purpose:** Complete integrated plan for all 8 Golden Flows with parallel agent optimization
**Total Estimated Hours:** ~130h work, ~40h wall-clock with parallelization

---

## Executive Summary

This plan integrates:
1. **Original v1.0 tasks** (55 tasks, 214h) - Security, hardening, enhancements
2. **New database remediation tasks** (16 tasks, 41h) - From QA Protocol v3.0 audit

### Task Integration Summary

| Source | Phase 1 | Phase 2 | Phase 3 | Phase 4 | Total |
|--------|---------|---------|---------|---------|-------|
| Original v1.0 | 7 | 12 | 14 | 22 | 55 |
| QA v3.0 (NEW) | 5 | 8 | 3 | 0 | 16 |
| **TOTAL** | **12** | **20** | **17** | **22** | **71** |

---

## Golden Flows Reference (Updated)

| # | Golden Flow | Current Status | Blocking Tasks |
|---|-------------|----------------|----------------|
| GF-001 | Direct Intake | 🔴 BLOCKED | DB-001, ST-058, INV-003 |
| GF-002 | Procure-to-Pay | 🔴 BLOCKED | DB-004, ST-059, PARTY-001 |
| GF-003 | Order-to-Cash | 🔴 BLOCKED | BUG-115, ST-058, ST-050, ST-051 |
| GF-004 | Invoice & Payment | 🟡 PARTIAL | FIN-001, ST-057, ORD-001 |
| GF-005 | Pick & Pack | 🔴 BLOCKED | Depends on GF-003 |
| GF-006 | Client Ledger | 🟡 PARTIAL | ST-057 |
| GF-007 | Inventory Mgmt | 🔴 BLOCKED | ST-056, ST-058, INV-003 |
| GF-008 | Sample Request | 🔴 BLOCKED | DB-001 |

---

## Phase 0: Critical Pre-Requisites (NEW - 5h)

> **NEW FROM QA AUDIT - Must complete before Phase 1**
> **Agents Required:** 4 (parallel)
> **Wall-Clock:** 2h

These tasks UNBLOCK the database constraints and safeInArray migration.

| Task | Description | Est | Files | Dependencies |
|------|-------------|-----|-------|--------------|
| **DB-001** | Race condition in samplesDb.ts - add transaction/lock | 1h | `server/samplesDb.ts:109-119` | None |
| **DB-002** | Empty array bug in referrals.ts creditIds | 30m | `server/routers/referrals.ts:389-391` | None |
| **DB-003** | Missing validation in productCategories.ts | 30m | `server/routers/productCategories.ts:378` | None |
| **DB-004** | RBAC routes validate arrays after crash | 1h | `server/routers/rbac-roles.ts`, `rbac-users.ts` | None |
| **DB-005** | Duplicate referralSettings table definition | 2h | `drizzle/schema.ts:6615`, `schema-gamification.ts:730` | None |

### Parallel Execution (Phase 0)
```
Agent A: DB-001 (1h)     ─┐
Agent B: DB-002 (0.5h)   ─┼─► SYNC POINT 0 (2h wall-clock)
Agent C: DB-003 (0.5h)   ─┤
Agent D: DB-004 (1h)     ─┘
         DB-005 (2h) - Can run with any agent after their task
```

### Verification Gate 0
- [ ] `pnpm check` passes
- [ ] `pnpm test` passes
- [ ] samplesDb.ts uses transaction + FOR UPDATE
- [ ] All empty array bugs fixed

---

## Phase 1: Golden Flow Blockers (31h work, 8h wall-clock)

> **Goal:** Fix issues that cause golden flows to fail or produce incorrect data
> **Combines:** Original Batch 1.1-1.3 + New database constraints

### Batch 1.1: Data Integrity - Original (10h)

| Task | Description | Est | Golden Flow Impact | Dependencies |
|------|-------------|-----|-------------------|--------------|
| **INV-003** | Add FOR UPDATE Lock in Batch Allocation | 2h | GF-001, GF-003, GF-007 | None |
| **FIN-001** | Fix Invoice Number Race Condition | 2h | GF-004 | None |
| **ST-050** | Fix Silent Error Handling in RED Mode | 4h | GF-001, GF-003, GF-004 | None |
| **ORD-001** | Fix Invoice Creation Timing | 2h | GF-004 | None |

### Batch 1.2: Data Integrity - NEW Database (5h)

| Task | Description | Est | Golden Flow Impact | Dependencies |
|------|-------------|-----|-------------------|--------------|
| **ST-056** | Add CHECK constraints on batch quantities | 2h | GF-001, GF-003, GF-007, GF-008 | DB-001 |
| **ST-057** | Add GL entry single-direction constraint | 1h | GF-004, GF-006 | None |
| **BUG-115** | Empty array crash in ordersDb confirmDraftOrder | 1h | GF-003, GF-005 | None |
| **BUG-116** | Fix remaining critical inArray crashes | 1h | All GF | DB-002, DB-003, DB-004 |

### Batch 1.3: Transaction Atomicity - Original (8h)

| Task | Description | Est | Golden Flow Impact | Dependencies |
|------|-------------|-----|-------------------|--------------|
| **ST-051** | Add Transaction Boundaries to Critical Ops | 8h | GF-001, GF-003, GF-004 | ST-050 |

### Batch 1.4: Architecture Foundation - Original (8h)

| Task | Description | Est | Golden Flow Impact | Dependencies |
|------|-------------|-----|-------------------|--------------|
| **ARCH-001** | Create OrderOrchestrator Service | 8h | GF-001, GF-003, GF-004 | ST-051 |

**Note:** Verify ARCH-001 status - commit `bb06aad` suggests partial completion.

### Parallel Execution (Phase 1)
```
Wave 1A (parallel):
  Agent A: INV-003 (2h)    Agent B: FIN-001 (2h)    Agent C: ST-050 (4h)    Agent D: ORD-001 (2h)
         ↓                        ↓                        ↓                        ↓
         └────────────────────────┴────────────────────────┴────────────────────────┘
                                          ↓
                                    SYNC POINT 1A

Wave 1B (parallel):
  Agent A: ST-056 (2h)     Agent B: ST-057 (1h)     Agent C: BUG-115 + BUG-116 (2h)
         ↓                        ↓                        ↓
         └────────────────────────┴────────────────────────┘
                                    ↓
                              SYNC POINT 1B

Wave 1C (sequential - dependencies):
  Agent A: ST-051 (8h) ──► Agent B: ARCH-001 (8h)
```

### Verification Gate 1
- [ ] Concurrent order confirmations cannot oversell inventory
- [ ] No duplicate invoice numbers under load
- [ ] CHECK constraints active on batches table
- [ ] GL constraint active on ledger_entries
- [ ] `pnpm test` passes

---

## Phase 2: Golden Flow Hardening (56h work, 14h wall-clock)

> **Goal:** Secure and stabilize golden flows + complete safeInArray migration
> **Combines:** Original Batch 2.1-2.5 + safeInArray migration

### Batch 2.1: Security Critical - Original (8h)

| Task | Description | Est | Golden Flow Impact | Dependencies |
|------|-------------|-----|-------------------|--------------|
| **SEC-027** | Protect Admin Setup Endpoints | 1h | All GF (auth) | None |
| **SEC-028** | Remove/Restrict Debug Endpoints | 1h | All GF (data exposure) | None |
| **SEC-029** | Fix Default Permission Grants | 2h | All GF (RBAC) | None |
| **SEC-030** | Fix VIP Portal Token Validation | 2h | GF-004 (VIP) | None |
| **TERP-0014** | Token Invalidation & Rate Limiting | 6h | All GF (security) | None |

### Batch 2.2: Client Management - Original (6h)

| Task | Description | Est | Golden Flow Impact | Dependencies |
|------|-------------|-----|-------------------|--------------|
| **TERP-0003** | Add Client Wizard Dialog | 2h | GF-003 | None |
| **TERP-0004** | Add Notifications Table to autoMigrate | 4h | All GF | None |

### Batch 2.3: safeInArray Migration - NEW (8h)

| Task | Description | Est | Golden Flow Impact | Dependencies |
|------|-------------|-----|-------------------|--------------|
| **ST-058-A** | safeInArray: ordersDb.ts + orders.ts | 3h | GF-003, GF-005 | BUG-115, BUG-116 |
| **ST-058-B** | safeInArray: inventoryDb.ts + inventory.ts | 3h | GF-001, GF-007 | BUG-115, BUG-116 |
| **ST-058-C** | safeInArray: arApDb.ts + payments + clientLedger | 2h | GF-004, GF-006 | BUG-115, BUG-116 |

### Batch 2.4: Order Flow Hardening - Original (16h)

| Task | Description | Est | Golden Flow Impact | Dependencies |
|------|-------------|-----|-------------------|--------------|
| **TERP-0017** | Convert Remaining Public Routers | 8h | All GF (auth) | SEC-027-030 |
| **ST-053** | Eliminate `any` Types in Critical Paths | 8h | GF-001, GF-003 | None |

### Batch 2.5: Invoice & Payment Hardening - Original (10h)

| Task | Description | Est | Golden Flow Impact | Dependencies |
|------|-------------|-----|-------------------|--------------|
| **TERP-0019** | Verify Inventory Snapshot Widget SQL | 4h | GF-003 | None |
| **NAV-017** | Add Missing /alerts Route | 1h | All GF | None |
| **NAV-018** | Add Missing /reports/shrinkage Route | 1h | GF-007 | None |
| **API-019** | Fix PaymentMethod Type Mismatch | 2h | GF-004 | None |
| **API-020** | Fix Pagination Response Inconsistency | 4h | All GF | None |

### Batch 2.6: Party Model - Original (8h)

| Task | Description | Est | Golden Flow Impact | Dependencies |
|------|-------------|-----|-------------------|--------------|
| **PARTY-001** | Add Nullable supplierClientId to POs | 4h | GF-002 | None |
| **PARTY-002** | Add FK Constraints to Bills Table | 2h | GF-004 | None |
| **PARTY-004** | Convert Vendor Hard Deletes to Soft | 2h | All GF | None |

### Parallel Execution (Phase 2)
```
Wave 2A (4 agents parallel):
  Agent A: SEC-027+028 (2h)  Agent B: SEC-029+030 (4h)  Agent C: TERP-0003+0004 (6h)  Agent D: ST-058-A (3h)
         ↓                          ↓                          ↓                           ↓
         └──────────────────────────┴──────────────────────────┴───────────────────────────┘
                                               ↓
                                         SYNC POINT 2A

Wave 2B (4 agents parallel):
  Agent A: ST-058-B (3h)  Agent B: ST-058-C (2h)  Agent C: TERP-0014 (6h)  Agent D: PARTY-001+002 (6h)
         ↓                       ↓                       ↓                        ↓
         └───────────────────────┴───────────────────────┴────────────────────────┘
                                           ↓
                                     SYNC POINT 2B

Wave 2C (3 agents parallel):
  Agent A: TERP-0017 (8h)  Agent B: ST-053 (8h)  Agent C: TERP-0019+NAV+API (12h)
```

### Verification Gate 2
- [ ] All safeInArray migrations complete (48 occurrences in critical paths)
- [ ] Admin/debug endpoints secured
- [ ] VIP portal token validation working
- [ ] `pnpm test` passes
- [ ] `pnpm build` passes

---

## Phase 3: Data Integrity + Enhancement (41h work, 12h wall-clock)

> **Goal:** Complete soft delete conversion + UX enhancements
> **Combines:** Original Batch 3.1-3.4 + New data integrity tasks

### Batch 3.1: Soft Delete Conversion - NEW (14h)

| Task | Description | Est | Golden Flow Impact | Dependencies |
|------|-------------|-----|-------------------|--------------|
| **DB-006** | Add deletedAt columns to pricing/PO tables | 2h | GF-002 | None |
| **ST-059** | Convert hard deletes to soft deletes | 8h | GF-001, GF-002, GF-007 | DB-006 |
| **ST-060** | Add deletedAt query filters (50+ queries) | 4h | GF-002 | DB-006 |

### Batch 3.2: COGS & Payment Integrity - NEW (6h)

| Task | Description | Est | Golden Flow Impact | Dependencies |
|------|-------------|-----|-------------------|--------------|
| **DB-007** | Standardize COGS precision to decimal(15,4) | 4h | GF-003, GF-004 | None |
| **ST-061** | Add payment over-allocation validation | 2h | GF-004, GF-006 | None |

### Batch 3.3: Dashboard & Analytics - Original (16h)

| Task | Description | Est | Golden Flow Impact | Dependencies |
|------|-------------|-----|-------------------|--------------|
| **TERP-0002** | Dashboard Widget UX Error States | 8h | All GF | None |
| **TERP-0005** | Reorganize Navigation Groups | 4h | All GF | None |
| **TERP-0020** | Replace TemplateSelector TODOs | 4h | All GF | None |

### Batch 3.4: Inventory UI Completion - Original (22h)

| Task | Description | Est | Golden Flow Impact | Dependencies |
|------|-------------|-----|-------------------|--------------|
| **TERP-0021** | Restore BatchDetailDrawer Features | 12h | GF-007 | None |
| **TERP-07F** | Server-Side Batch Status Validation | 2h | GF-001 | None |
| **PARTY-003** | Migrate Lots to Use supplierClientId | 8h | GF-002 | PARTY-001 |

### Batch 3.5: UX Polish - Original (24h)

| Task | Description | Est | Golden Flow Impact | Dependencies |
|------|-------------|-----|-------------------|--------------|
| **TERP-0022** | Add Confirmation Dialogs for Destructive Actions | 8h | All GF | None |
| **TERP-0023** | Resolve Backend Placeholders | 16h | Various GF | None |

### Batch 3.6: Schema & Migrations - Original (12h)

| Task | Description | Est | Golden Flow Impact | Dependencies |
|------|-------------|-----|-------------------|--------------|
| **TERP-0006** | Add Cleanup Migrations for Constraints | 8h | All GF | None |
| **SM-003-F** | Add Status Column to Returns Schema | 4h | GF-007 | None |

### Parallel Execution (Phase 3)
```
Wave 3A (3 agents parallel):
  Agent A: DB-006 + ST-059 (10h)  Agent B: DB-007 + ST-061 (6h)  Agent C: TERP-0002+0005+0020 (16h)
         ↓                               ↓                               ↓
         └───────────────────────────────┴───────────────────────────────┘
                                         ↓
                                   SYNC POINT 3A

Wave 3B (3 agents parallel):
  Agent A: ST-060 (4h)  Agent B: TERP-0021+07F (14h)  Agent C: PARTY-003 (8h)
```

### Verification Gate 3
- [ ] All hard deletes converted to soft deletes
- [ ] COGS precision standardized
- [ ] Payment validation trigger active
- [ ] Dashboard widgets show proper error states
- [ ] All 8 Golden Flows functional

---

## Phase 4: Technical Debt & Quality (72h) - Original

> **Goal:** Improve code quality, testing, and observability
> **No new database tasks - original plan preserved**

### Batch 4.1: Testing Infrastructure (22h)

| Task | Description | Est | Priority |
|------|-------------|-----|----------|
| **TERP-0009** | Dashboard vs Sales Inventory Tests | 8h | MEDIUM |
| **TERP-0010** | Refactor getDashboardStats Test Mocks | 4h | LOW |
| **TERP-0011** | Create QA Test Data Seeding Script | 8h | HIGH |
| **TEST-010** | Integration Tests for Order→Invoice→GL | 8h | LOW |
| **TEST-011** | Concurrent Operation Tests | 4h | LOW |
| **TEST-012** | Update Batch Status Transition Test Map | 2h | LOW |

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

## Task ID Mapping (NEW → Roadmap)

New tasks need unique IDs that don't conflict with existing MASTER_ROADMAP tasks:

| This Plan | MASTER_ROADMAP ID | Description |
|-----------|-------------------|-------------|
| DB-001 | BUG-117 | samplesDb.ts race condition |
| DB-002 | BUG-118 | referrals.ts empty array |
| DB-003 | BUG-119 | productCategories.ts validation |
| DB-004 | BUG-120 | RBAC empty array validation |
| DB-005 | SCHEMA-010 | referralSettings duplicate |
| DB-006 | SCHEMA-011 | deletedAt columns for pricing/PO |
| DB-007 | SCHEMA-012 | COGS precision standardization |
| ST-056 | ST-056 | Batch CHECK constraints |
| ST-057 | ST-057 | GL entry constraint |
| ST-058-A/B/C | ST-058 | safeInArray migration (split) |
| ST-059 | ST-059 | Soft delete conversion |
| ST-060 | ST-060 | deletedAt query filters |
| ST-061 | ST-061 | Payment validation trigger |

---

## Complete Task Count by Phase

| Phase | Original Tasks | New DB Tasks | Total | Wall-Clock (Parallel) |
|-------|----------------|--------------|-------|----------------------|
| Phase 0 | 0 | 5 | 5 | 2h |
| Phase 1 | 7 | 5 | 12 | 8h |
| Phase 2 | 12 | 3 | 15 | 14h |
| Phase 3 | 14 | 6 | 20 | 12h |
| Phase 4 | 22 | 0 | 22 | 16h |
| **TOTAL** | **55** | **19** | **74** | **52h** |

---

## Execution Timeline Summary

```
WEEK 1:
├── Day 1 (2h): Phase 0 - DB Pre-requisites (4 agents parallel)
├── Day 1-2 (8h): Phase 1 - Golden Flow Blockers
│   ├── Wave 1A: INV-003, FIN-001, ST-050, ORD-001 (parallel)
│   ├── Wave 1B: ST-056, ST-057, BUG-115, BUG-116 (parallel)
│   └── Wave 1C: ST-051 → ARCH-001 (sequential)
│
WEEK 2:
├── Day 3-5 (14h): Phase 2 - Hardening + safeInArray
│   ├── Wave 2A: Security + Client + safeInArray-A (parallel)
│   ├── Wave 2B: safeInArray-B/C + TERP-0014 + PARTY (parallel)
│   └── Wave 2C: TERP-0017 + ST-053 + Invoice fixes (parallel)
│
WEEK 3:
├── Day 6-8 (12h): Phase 3 - Data Integrity + Enhancement
│   ├── Wave 3A: Soft delete + COGS + Dashboard (parallel)
│   └── Wave 3B: Filters + Inventory UI + Party migration (parallel)
│
WEEK 4-5:
├── Phase 4 - Technical Debt (standard execution)
```

---

## Golden Flow Status Progression

| Phase | GF-001 | GF-002 | GF-003 | GF-004 | GF-005 | GF-006 | GF-007 | GF-008 |
|-------|--------|--------|--------|--------|--------|--------|--------|--------|
| Start | 🔴 | 🔴 | 🔴 | 🟡 | 🔴 | 🟡 | 🔴 | 🔴 |
| After Phase 0 | 🔴 | 🔴 | 🔴 | 🟡 | 🔴 | 🟡 | 🔴 | 🟡 |
| After Phase 1 | 🟡 | 🟡 | 🟡 | ✅ | 🟡 | ✅ | 🟡 | ✅ |
| After Phase 2 | ✅ | 🟡 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| After Phase 3 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

---

## Verification Commands

```bash
# After each phase:
pnpm check
pnpm lint
pnpm test
pnpm build

# Database invariants:
pnpm gate:invariants
pnpm mega:qa:invariants

# Golden Flow E2E:
# Manual testing of each flow after Phase 2
```

---

## Appendix: Complete Task-to-Golden-Flow Matrix

| Task | GF-001 | GF-002 | GF-003 | GF-004 | GF-005 | GF-006 | GF-007 | GF-008 |
|------|--------|--------|--------|--------|--------|--------|--------|--------|
| **Phase 0** |
| DB-001 | - | - | - | - | - | - | - | ✅ |
| DB-002 | - | - | - | - | - | - | - | - |
| DB-003 | ✅ | - | - | - | - | - | ✅ | - |
| DB-004 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| DB-005 | - | - | - | - | - | - | - | - |
| **Phase 1** |
| INV-003 | ✅ | - | ✅ | - | - | - | ✅ | - |
| FIN-001 | - | - | - | ✅ | - | - | - | - |
| ST-050 | ✅ | - | ✅ | ✅ | ✅ | - | - | - |
| ORD-001 | - | - | - | ✅ | - | - | - | - |
| ST-056 | ✅ | - | ✅ | - | ✅ | - | ✅ | ✅ |
| ST-057 | - | - | - | ✅ | - | ✅ | - | - |
| BUG-115 | - | - | ✅ | - | ✅ | - | - | - |
| BUG-116 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| ST-051 | ✅ | - | ✅ | ✅ | ✅ | - | - | - |
| ARCH-001 | ✅ | - | ✅ | ✅ | ✅ | - | - | - |
| **Phase 2** |
| SEC-027-030 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| TERP-0003 | - | - | ✅ | - | - | - | - | - |
| TERP-0014 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| ST-058-A | - | - | ✅ | - | ✅ | - | - | - |
| ST-058-B | ✅ | - | - | - | - | - | ✅ | - |
| ST-058-C | - | - | - | ✅ | - | ✅ | - | - |
| PARTY-001 | - | ✅ | - | - | - | - | - | - |
| PARTY-002 | - | - | - | ✅ | - | - | - | - |
| **Phase 3** |
| DB-006 | - | ✅ | - | - | - | - | - | - |
| ST-059 | ✅ | ✅ | - | - | - | - | ✅ | - |
| ST-060 | - | ✅ | - | - | - | - | - | - |
| DB-007 | - | - | ✅ | ✅ | - | - | - | - |
| ST-061 | - | - | - | ✅ | - | ✅ | - | - |

---

*Golden Flow Execution Plan v2.0 (Integrated)*
*Combines original v1.0 + QA Protocol v3.0 database audit findings*
*Session: claude/database-schema-review-L9yG5*
