# Golden Flow Execution Plan v2.0

**Created:** 2026-01-28
**Updated From:** Golden Flow Execution Plan v1.0 + QA Protocol v3.0 Database Audit
**Purpose:** Achieve full E2E functionality of all 8 Golden Flows with parallel agent optimization
**Total Estimated Hours:** ~80h (reduced from 214h via parallelization)

---

## Executive Summary

This execution plan integrates the database remediation findings with the existing Golden Flow work, organized for **maximum parallel agent utilization** without sacrificing reliability.

### Current State
| Golden Flow | Status | Primary Blockers |
|-------------|--------|------------------|
| GF-001 Direct Intake | 🔴 BLOCKED | BUG-117, ST-058 |
| GF-002 Procure-to-Pay | 🔴 BLOCKED | ST-059, SCHEMA-002 |
| GF-003 Order-to-Cash | 🔴 BLOCKED | BUG-115, ST-058 |
| GF-004 Invoice & Payment | 🟡 PARTIAL | ST-057 |
| GF-005 Pick & Pack | 🔴 BLOCKED | Depends on GF-003 |
| GF-006 Client Ledger | 🟡 PARTIAL | ST-057 |
| GF-007 Inventory Mgmt | 🔴 BLOCKED | ST-056, ST-058 |
| GF-008 Sample Request | 🔴 BLOCKED | BUG-117 |

### Target State (After Execution)
| Golden Flow | Status | Verification |
|-------------|--------|--------------|
| GF-001 Direct Intake | ✅ WORKING | E2E test pass |
| GF-002 Procure-to-Pay | ✅ WORKING | E2E test pass |
| GF-003 Order-to-Cash | ✅ WORKING | E2E test pass |
| GF-004 Invoice & Payment | ✅ WORKING | E2E test pass |
| GF-005 Pick & Pack | ✅ WORKING | E2E test pass |
| GF-006 Client Ledger | ✅ WORKING | E2E test pass |
| GF-007 Inventory Mgmt | ✅ WORKING | E2E test pass |
| GF-008 Sample Request | ✅ WORKING | E2E test pass |

---

## Parallel Execution Strategy

### Agent Allocation Model

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        PARALLEL AGENT EXECUTION MAP                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  WAVE 1 (Hour 0-4): Pre-requisites - 4 AGENTS IN PARALLEL                   │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐                     │
│  │ Agent A  │  │ Agent B  │  │ Agent C  │  │ Agent D  │                     │
│  │ BUG-117  │  │ BUG-118  │  │ BUG-119  │  │ BUG-120  │                     │
│  │ (1h)     │  │ (0.5h)   │  │ (0.5h)   │  │ (1h)     │                     │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘                     │
│       │              │              │              │                         │
│       └──────────────┴──────────────┴──────────────┘                         │
│                              │                                               │
│                        SYNC POINT 1                                          │
│                              │                                               │
│  WAVE 2 (Hour 4-8): Schema + Critical Fixes - 3 AGENTS IN PARALLEL          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                       │
│  │   Agent A    │  │   Agent B    │  │   Agent C    │                       │
│  │  SCHEMA-001  │  │   ST-056     │  │   ST-057     │                       │
│  │  (2h)        │  │   (2h)       │  │   (1h)       │                       │
│  └──────────────┘  └──────────────┘  └──────────────┘                       │
│        │                  │                  │                               │
│        └──────────────────┴──────────────────┘                               │
│                              │                                               │
│                        SYNC POINT 2                                          │
│                              │                                               │
│  WAVE 3 (Hour 8-16): safeInArray Migration - 3 AGENTS IN PARALLEL           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                       │
│  │   Agent A    │  │   Agent B    │  │   Agent C    │                       │
│  │ ST-058 Pt1   │  │ ST-058 Pt2   │  │ ST-058 Pt3   │                       │
│  │ ordersDb     │  │ inventoryDb  │  │ arApDb +     │                       │
│  │ orders.ts    │  │ inventory.ts │  │ samples,     │                       │
│  │ (3h)         │  │ (3h)         │  │ others (2h)  │                       │
│  └──────────────┘  └──────────────┘  └──────────────┘                       │
│        │                  │                  │                               │
│        └──────────────────┴──────────────────┘                               │
│                              │                                               │
│                        SYNC POINT 3                                          │
│                              │                                               │
│  WAVE 4 (Hour 16-28): Data Integrity - 3 AGENTS IN PARALLEL                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                       │
│  │   Agent A    │  │   Agent B    │  │   Agent C    │                       │
│  │ SCHEMA-002   │  │   ST-059     │  │ SCHEMA-003   │                       │
│  │ + ST-060     │  │ soft deletes │  │   ST-061     │                       │
│  │ (6h)         │  │ (8h)         │  │ (6h)         │                       │
│  └──────────────┘  └──────────────┘  └──────────────┘                       │
│        │                  │                  │                               │
│        └──────────────────┴──────────────────┘                               │
│                              │                                               │
│                      VERIFICATION WAVE                                       │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Parallelization Rules

1. **No File Conflicts**: Agents working in parallel MUST NOT modify the same files
2. **Dependency Respect**: Tasks with dependencies wait for sync points
3. **Verification Gates**: Each wave ends with verification before next wave starts
4. **Rollback Ready**: Each agent maintains rollback capability

---

## Wave 1: Pre-Requisites (4 hours wall-clock)

> **Agents Required:** 4 (parallel)
> **Total Work:** 4 hours across 4 agents = 1 hour wall-clock per agent
> **Dependencies:** None - can start immediately

### Agent A: BUG-117 (samplesDb.ts race condition)
**Files:** `server/samplesDb.ts`
**Time:** 1 hour

**Task:**
1. Add transaction wrapper to `fulfillSampleRequest()`
2. Add FOR UPDATE lock on batch row
3. Add validation before quantity decrement
4. Run `pnpm test server/samplesDb.test.ts`

**Verification:**
```bash
pnpm test server/samplesDb.test.ts
# Manual: Concurrent sample fulfillment test
```

---

### Agent B: BUG-118 (referrals.ts empty array)
**Files:** `server/routers/referrals.ts`
**Time:** 30 minutes

**Task:**
1. Fix line 389-391: `input.creditIds?.length` check
2. Add test case for empty creditIds
3. Run verification

**Verification:**
```bash
pnpm check
pnpm test server/routers/referrals.test.ts
```

---

### Agent C: BUG-119 (productCategories.ts validation)
**Files:** `server/routers/productCategories.ts`
**Time:** 30 minutes

**Task:**
1. Add validation before line 378
2. Throw TRPCError for empty productIds
3. Run verification

**Verification:**
```bash
pnpm check
pnpm test server/routers/productCategories.test.ts
```

---

### Agent D: BUG-120 (RBAC empty array validation)
**Files:** `server/routers/rbac-roles.ts`, `server/routers/rbac-users.ts`
**Time:** 1 hour

**Task:**
1. Add length checks before inArray at lines 541, 617 (rbac-roles)
2. Add length checks before inArray at lines 466, 530 (rbac-users)
3. Run verification

**Verification:**
```bash
pnpm check
pnpm test server/routers/rbac-roles.test.ts
pnpm test server/routers/rbac-users.test.ts
```

---

### SYNC POINT 1: Wave 1 Complete

**Gate Criteria:**
- [ ] All 4 agents report success
- [ ] `pnpm check` passes
- [ ] `pnpm test` passes
- [ ] No file conflicts detected
- [ ] Commit all changes with message: `fix(db): complete Wave 1 pre-requisites`

---

## Wave 2: Schema + Constraints (4 hours wall-clock)

> **Agents Required:** 3 (parallel)
> **Total Work:** 5 hours across 3 agents
> **Dependencies:** Wave 1 MUST be complete

### Agent A: SCHEMA-001 (referralSettings duplicate)
**Files:** `drizzle/schema.ts`, `drizzle/schema-gamification.ts`, `server/routers/referrals.ts`, `server/routers/gamification.ts`
**Time:** 2 hours

**Task:**
1. Rename schema.ts `referralSettings` to `referralCreditSettings`
2. Rename schema-gamification.ts `referralSettings` to `referralGamificationSettings`
3. Create migration file to rename database tables
4. Update all imports and references
5. Run verification

**Verification:**
```bash
pnpm check
pnpm db:generate
pnpm test
```

---

### Agent B: ST-056 (Batch CHECK constraints)
**Files:** `drizzle/schema.ts`, new migration file
**Time:** 2 hours
**CRITICAL DEPENDENCY:** BUG-117 MUST be complete (verified at sync point)

**Task:**
1. Create migration: `drizzle/migrations/XXXX_add_batch_quantity_checks.sql`
2. Add CHECK constraints for all quantity columns
3. Update schema.ts with constraint documentation
4. Run migration locally to verify
5. Add rollback script

**Verification:**
```bash
pnpm db:generate
pnpm db:push --dry-run
# Verify constraints in generated SQL
```

---

### Agent C: ST-057 (GL entry constraint)
**Files:** `drizzle/schema.ts`, new migration file
**Time:** 1 hour

**Task:**
1. Create migration: `drizzle/migrations/XXXX_add_gl_entry_constraint.sql`
2. Add CHECK constraint for single-direction entries
3. Add rollback script
4. Run verification

**Verification:**
```bash
pnpm db:generate
pnpm test server/accountingDb.test.ts
```

---

### SYNC POINT 2: Wave 2 Complete

**Gate Criteria:**
- [ ] All 3 agents report success
- [ ] `pnpm check` passes
- [ ] `pnpm build` passes
- [ ] Schema changes validated
- [ ] Commit: `feat(db): add CHECK constraints and resolve schema duplicates`

---

## Wave 3: safeInArray Migration (8 hours wall-clock)

> **Agents Required:** 3 (parallel)
> **Total Work:** 8 hours across 3 agents
> **Dependencies:** Wave 1 and Wave 2 MUST be complete

### Agent A: ST-058 Part 1 (Orders)
**Files:** `server/ordersDb.ts`, `server/routers/orders.ts`
**Time:** 3 hours

**Task:**
1. Add import: `import { safeInArray } from "./lib/sqlSafety";`
2. Replace all 15 `inArray()` calls in ordersDb.ts
3. Replace all 6 `inArray()` calls in orders.ts
4. Run verification

**File Allocation (NO CONFLICTS):**
- `server/ordersDb.ts` - Agent A ONLY
- `server/routers/orders.ts` - Agent A ONLY

**Verification:**
```bash
pnpm check
pnpm test server/ordersDb.test.ts
pnpm test server/routers/orders.test.ts
```

---

### Agent B: ST-058 Part 2 (Inventory)
**Files:** `server/inventoryDb.ts`, `server/routers/inventory.ts`
**Time:** 3 hours

**Task:**
1. Add import: `import { safeInArray } from "./lib/sqlSafety";`
2. Replace all 12 `inArray()` calls in inventoryDb.ts
3. Replace all 8 `inArray()` calls in inventory.ts
4. Run verification

**File Allocation (NO CONFLICTS):**
- `server/inventoryDb.ts` - Agent B ONLY
- `server/routers/inventory.ts` - Agent B ONLY

**Verification:**
```bash
pnpm check
pnpm test server/inventoryDb.test.ts
pnpm test server/routers/inventory.test.ts
```

---

### Agent C: ST-058 Part 3 (Financial + Samples)
**Files:** `server/arApDb.ts`, `server/samplesDb.ts`, `server/routers/payments.ts`, `server/routers/clientLedger.ts`
**Time:** 2 hours

**Task:**
1. Replace 5 `inArray()` calls in arApDb.ts
2. Replace 2 `inArray()` calls in samplesDb.ts
3. Replace 3 `inArray()` calls in payments.ts
4. Replace 2 `inArray()` calls in clientLedger.ts
5. Run verification

**File Allocation (NO CONFLICTS):**
- `server/arApDb.ts` - Agent C ONLY
- `server/samplesDb.ts` - Agent C ONLY
- `server/routers/payments.ts` - Agent C ONLY
- `server/routers/clientLedger.ts` - Agent C ONLY

**Verification:**
```bash
pnpm check
pnpm test server/arApDb.test.ts
pnpm test server/routers/payments.test.ts
```

---

### SYNC POINT 3: Wave 3 Complete

**Gate Criteria:**
- [ ] All 3 agents report success
- [ ] `pnpm check` passes
- [ ] `pnpm lint` passes
- [ ] `pnpm test` passes (full suite)
- [ ] `pnpm build` passes
- [ ] Commit: `fix(db): migrate critical paths to safeInArray`

**Golden Flow Status After Wave 3:**
- GF-001: 🟡 PARTIAL (needs soft delete)
- GF-002: 🟡 PARTIAL (needs soft delete)
- GF-003: ✅ WORKING
- GF-004: ✅ WORKING
- GF-005: ✅ WORKING (unblocked by GF-003)
- GF-006: ✅ WORKING
- GF-007: 🟡 PARTIAL (needs soft delete)
- GF-008: ✅ WORKING

---

## Wave 4: Data Integrity Hardening (12 hours wall-clock)

> **Agents Required:** 3 (parallel)
> **Total Work:** 20 hours across 3 agents
> **Dependencies:** Wave 3 MUST be complete

### Agent A: SCHEMA-002 + ST-060 (deletedAt columns + filters)
**Files:** `drizzle/schema.ts`, migration files, `server/pricingEngine.ts`, `server/routers/poReceiving.ts`
**Time:** 6 hours

**Task:**
1. Add deletedAt columns to: pricingRules, purchaseOrders, purchaseOrderItems, vendorSupply
2. Create migration file
3. Add query filters (9 in pricingEngine, 8 in poReceiving)
4. Run verification

**File Allocation:**
- `drizzle/schema.ts` (coordinate with Agent B via comments)
- `server/pricingEngine.ts` - Agent A ONLY
- `server/routers/poReceiving.ts` - Agent A ONLY

**Verification:**
```bash
pnpm db:generate
pnpm check
pnpm test
```

---

### Agent B: ST-059 (Soft delete conversion)
**Files:** `server/inventoryDb.ts`, `server/routers/purchaseOrders.ts`, `server/vendorSupplyDb.ts`, `server/matchingEngine.ts`
**Time:** 8 hours

**Task:**
1. Replace `db.delete()` with `softDelete()` in inventoryDb.ts (4 locations)
2. Replace `db.delete()` in purchaseOrders.ts (2 locations)
3. Replace `db.delete()` in vendorSupplyDb.ts (1 location)
4. Add deletedAt filters to matchingEngine.ts (2 queries)
5. Run verification

**File Allocation:**
- `server/inventoryDb.ts` - Agent B ONLY (coordinate with Agent B Wave 3)
- `server/routers/purchaseOrders.ts` - Agent B ONLY
- `server/vendorSupplyDb.ts` - Agent B ONLY
- `server/matchingEngine.ts` - Agent B ONLY

**Verification:**
```bash
pnpm check
pnpm test
# Manual: Verify soft delete in each file
```

---

### Agent C: SCHEMA-003 + ST-061 (COGS precision + payment validation)
**Files:** `drizzle/schema.ts`, migration files, `server/cogsCalculator.ts`, `server/services/orderPricingService.ts`
**Time:** 6 hours

**Task:**
1. Create migration to change COGS columns to decimal(15,4)
2. Update calculation code for 4-decimal precision
3. Create payment over-allocation trigger
4. Run verification

**File Allocation:**
- `drizzle/schema.ts` (coordinate with Agent A via comments)
- `server/cogsCalculator.ts` - Agent C ONLY
- `server/services/orderPricingService.ts` - Agent C ONLY

**Verification:**
```bash
pnpm db:generate
pnpm check
pnpm test
```

---

### SYNC POINT 4: Wave 4 Complete

**Gate Criteria:**
- [ ] All 3 agents report success
- [ ] `pnpm check` passes
- [ ] `pnpm lint` passes
- [ ] `pnpm test` passes
- [ ] `pnpm build` passes
- [ ] All migrations tested locally
- [ ] Commit: `feat(db): complete data integrity hardening`

---

## Verification Wave: Golden Flow Testing

> **Agents Required:** 2 (parallel)
> **Total Work:** 4 hours
> **Dependencies:** All previous waves complete

### Agent A: Golden Flows 1-4 E2E Testing
**Time:** 2 hours

**Test Matrix:**
| Flow | Test Case | Expected Result |
|------|-----------|-----------------|
| GF-001 | Create intake with new vendor | Batch created, quantities correct |
| GF-001 | Create intake with empty products | Graceful error |
| GF-002 | Create PO, receive, pay | Full flow complete |
| GF-002 | Delete PO | Soft deleted, queries exclude |
| GF-003 | Create order, confirm, fulfill | Order complete |
| GF-003 | Confirm with empty batches | Graceful error |
| GF-004 | Create invoice, record payment | Invoice PAID |
| GF-004 | Record overpayment | Rejected by trigger |

---

### Agent B: Golden Flows 5-8 E2E Testing
**Time:** 2 hours

**Test Matrix:**
| Flow | Test Case | Expected Result |
|------|-----------|-----------------|
| GF-005 | Pick and pack order | Bags created, quantities decremented |
| GF-005 | Pick more than available | Rejected |
| GF-006 | View client ledger | All transactions shown |
| GF-006 | GL entries balanced | Debit = Credit |
| GF-007 | Adjust inventory | Movement recorded |
| GF-007 | Negative adjustment beyond available | CHECK constraint blocks |
| GF-008 | Create sample request | Allocation tracked |
| GF-008 | Fulfill beyond allocation | Rejected |

---

### FINAL GATE: All Golden Flows Working

**Verification:**
```bash
pnpm gate:invariants
pnpm mega:qa:invariants
pnpm test
pnpm build
```

**Success Criteria:**
- [ ] All 8 Golden Flows pass E2E testing
- [ ] `pnpm gate:invariants` passes
- [ ] `pnpm mega:qa:invariants` passes
- [ ] `pnpm build` succeeds
- [ ] Production deployment verified

---

## Timeline Summary

| Wave | Duration (Wall-Clock) | Agents | Work Hours |
|------|----------------------|--------|------------|
| Wave 1: Pre-requisites | 1h (parallel) | 4 | 4h |
| Wave 2: Schema + Constraints | 2h (parallel) | 3 | 5h |
| Wave 3: safeInArray | 3h (parallel) | 3 | 8h |
| Wave 4: Data Integrity | 8h (parallel) | 3 | 20h |
| Verification | 2h (parallel) | 2 | 4h |
| **TOTAL** | **16h wall-clock** | - | **41h work** |

**Efficiency Gain:** 41h work completed in 16h wall-clock = **2.5x speedup**

---

## Risk Mitigation

### Rollback Procedures

Each wave has atomic rollback capability:

```bash
# Wave 1: Revert bug fixes
git revert <wave1-commit>

# Wave 2: Drop constraints
ALTER TABLE batches DROP CONSTRAINT chk_onHandQty_nonnegative;
ALTER TABLE batches DROP CONSTRAINT chk_reservedQty_nonnegative;
# ... etc

# Wave 3: Revert to inArray (not recommended)
git revert <wave3-commit>

# Wave 4: Drop columns (DATA LOSS WARNING)
ALTER TABLE pricing_rules DROP COLUMN deleted_at;
# ... etc
```

### Conflict Resolution

If agents detect file conflicts:
1. STOP immediately
2. Report conflict to coordinator
3. One agent takes ownership
4. Other agent waits or pivots to different file

### Failure Handling

If an agent fails verification:
1. Other agents continue if no dependency
2. Failed agent retries with fix
3. If critical path blocked, all agents pause at sync point
4. Coordinator decision required to proceed

---

## Appendix: Task-to-Golden-Flow Matrix

| Task | GF-001 | GF-002 | GF-003 | GF-004 | GF-005 | GF-006 | GF-007 | GF-008 |
|------|--------|--------|--------|--------|--------|--------|--------|--------|
| BUG-117 | - | - | - | - | - | - | - | ✅ |
| BUG-118 | - | - | - | - | - | - | - | - |
| BUG-119 | ✅ | - | - | - | - | - | ✅ | - |
| BUG-120 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| SCHEMA-001 | - | - | - | - | - | - | - | - |
| ST-056 | ✅ | - | ✅ | - | ✅ | - | ✅ | ✅ |
| ST-057 | - | - | - | ✅ | - | ✅ | - | - |
| ST-058 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| SCHEMA-002 | - | ✅ | - | - | - | - | - | - |
| ST-059 | ✅ | ✅ | - | - | - | - | ✅ | - |
| ST-060 | - | ✅ | - | - | - | - | - | - |
| SCHEMA-003 | - | - | ✅ | ✅ | - | - | - | - |
| ST-061 | - | - | - | ✅ | - | ✅ | - | - |

---

*Golden Flow Execution Plan v2.0*
*Optimized for parallel agent execution*
*Session: claude/database-schema-review-L9yG5*
