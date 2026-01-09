# TERP Security-First Execution Plan

**Date:** January 9, 2026
**Version:** 1.0
**Philosophy:** Security-First, Parallel Agents, Adversarial QA Gates
**Session Branch:** `claude/execution-plan-security-Zq1cj`

---

## Executive Summary

This execution plan prioritizes **security hardening** as the foundation, followed by stability and feature work. Each phase includes:
- **Parallel agent execution** for maximum efficiency
- **Red Hat adversarial QA gates** before phase transitions
- **Strategic blocking dependencies** to prevent regressions

### Priority Order Rationale

```
SECURITY → STABILITY → BUGS → FEATURES → POLISH
     ↑
     └── Security gates ALL other work. A vulnerable endpoint renders
         all feature work moot. Fix security first, then everything
         built on top is trustworthy.
```

---

## Phase Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          PHASE 0: SECURITY HARDENING                         │
│                         (Foundation - Must Complete First)                   │
├───────────────────┬───────────────────┬───────────────────────────────────────┤
│    Wave 0A        │    Wave 0B        │           Wave 0C                     │
│ ┌──────────────┐  │ ┌──────────────┐  │  ┌──────────────────────────────────┐ │
│ │ SEC-005      │  │ │ SEC-008      │  │  │ Security Test Suite Creation     │ │
│ │ SEC-006      │  │ │ SEC-009      │  │  │ - Auth bypass tests              │ │
│ │ SEC-007      │  │ │ SEC-010      │  │  │ - Permission escalation tests    │ │
│ │ (Locations,  │  │ │ (Settings,   │  │  │ - Input sanitization tests       │ │
│ │  Transfers,  │  │ │  VIP Portal, │  │  │ - SQL injection prevention       │ │
│ │  Orders)     │  │ │  Returns)    │  │  └──────────────────────────────────┘ │
│ └──────────────┘  │ └──────────────┘  │                                       │
│     AGENT 1       │     AGENT 2       │              AGENT 3                  │
└───────────────────┴───────────────────┴───────────────────────────────────────┘
                              ↓
                    ┌─────────────────┐
                    │   RED HAT QA    │
                    │   GATE 1        │
                    └─────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│                        PHASE 1: STABILITY HARDENING                          │
├───────────────────┬───────────────────┬───────────────────────────────────────┤
│    Wave 1A        │    Wave 1B        │           Wave 1C                     │
│ ┌──────────────┐  │ ┌──────────────┐  │  ┌──────────────────────────────────┐ │
│ │ ST-025       │  │ │ ST-010       │  │  │ QUAL-004                         │ │
│ │ Error        │  │ │ Caching      │  │  │ CASCADE Delete Review            │ │
│ │ Boundaries   │  │ │ Layer        │  │  │ Referential Integrity Audit      │ │
│ │ ST-026       │  │ │              │  │  │                                  │ │
│ │ Concurrent   │  │ │              │  │  │                                  │ │
│ │ Edit Detect  │  │ │              │  │  │                                  │ │
│ └──────────────┘  │ └──────────────┘  │  └──────────────────────────────────┘ │
│     AGENT 1       │     AGENT 2       │              AGENT 3                  │
└───────────────────┴───────────────────┴───────────────────────────────────────┘
                              ↓
                    ┌─────────────────┐
                    │   RED HAT QA    │
                    │   GATE 2        │
                    └─────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│                         PHASE 2: CRITICAL BUGS                               │
├───────────────────┬───────────────────┬───────────────────────────────────────┤
│    Wave 2A        │    Wave 2B        │           Wave 2C                     │
│    SQL Safety     │    Frontend       │          Data Loading                 │
│    AGENT 1        │    AGENT 2        │          AGENT 3                      │
└───────────────────┴───────────────────┴───────────────────────────────────────┘
                              ↓
                    ┌─────────────────┐
                    │   RED HAT QA    │
                    │   GATE 3        │
                    └─────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│                         PHASE 3: FEATURES & UX                               │
├───────────────────┬───────────────────────────────────────────────────────────┤
│    Wave 3A        │              Wave 3B                                      │
│    Backend        │              Frontend                                     │
│    AGENT 1        │              AGENT 2                                      │
└───────────────────┴───────────────────────────────────────────────────────────┘
                              ↓
                    ┌─────────────────┐
                    │   FINAL QA      │
                    │   GATE          │
                    └─────────────────┘
```

---

## Phase 0: Security Hardening (CRITICAL FOUNDATION)

**Total Duration:** 8-12 hours (parallel execution)
**Agents:** 3 parallel
**Blocking:** ALL subsequent phases

### Wave 0A: Router Mutations Protection (Agent 1)

**Duration:** 4-5 hours
**Files:** Backend routers (no overlap with 0B)

| Task ID | Description | File | Est. | Priority |
|---------|-------------|------|------|----------|
| SEC-005 | Protect Location Router Mutations | `server/routers/locations.ts` | 1h | P0 |
| SEC-006 | Protect Warehouse Transfer Mutations | `server/routers/warehouseTransfers.ts` | 1h | P0 |
| SEC-007 | Protect Order Enhancement Mutations (11 endpoints) | `server/routers/orderEnhancements.ts` | 2h | P0 |

**Implementation Pattern:**
```typescript
// Before: VULNERABLE
export const locationsRouter = createTRPCRouter({
  create: publicProcedure.mutation(...)
});

// After: PROTECTED
export const locationsRouter = createTRPCRouter({
  create: protectedProcedure
    .use(requirePermission('inventory:locations:manage'))
    .mutation(...)
});
```

**Exit Criteria:**
- [ ] Zero `publicProcedure` in locations.ts
- [ ] Zero `publicProcedure` in warehouseTransfers.ts
- [ ] Zero `publicProcedure` in orderEnhancements.ts
- [ ] All 14 endpoints require authentication
- [ ] Unit tests pass

---

### Wave 0B: Data Access Protection (Agent 2)

**Duration:** 4-5 hours
**Files:** Settings, VIP Portal, Returns routers (no overlap with 0A)

| Task ID | Description | File | Est. | Priority |
|---------|-------------|------|------|----------|
| SEC-008 | Protect Settings Router Mutations | `server/routers/settings.ts` | 1.5h | P0 |
| SEC-009 | Protect VIP Portal Needs Data Exposure | `server/routers/vipPortalNeeds.ts` | 1.5h | P0 |
| SEC-010 | Protect Returns and Refunds Query Endpoints | `server/routers/returns.ts` | 1.5h | P0 |

**Data Exposure Risk Assessment:**
- VIP Portal: Client pricing, inventory visibility → HIGH RISK
- Settings: System configuration → HIGH RISK
- Returns: Financial data → MEDIUM-HIGH RISK

**Exit Criteria:**
- [ ] All sensitive endpoints require authentication
- [ ] Data filtering enforced per user context
- [ ] No unprotected sensitive data queries

---

### Wave 0C: Security Test Suite (Agent 3)

**Duration:** 4-6 hours
**Files:** Test infrastructure (no overlap with 0A/0B)

| Task ID | Description | File | Est. |
|---------|-------------|------|------|
| SEC-TEST-001 | Authentication bypass test suite | `tests/security/auth-bypass.test.ts` | 2h |
| SEC-TEST-002 | Permission escalation tests | `tests/security/permission-escalation.test.ts` | 2h |
| SEC-TEST-003 | SQL injection prevention verification | `tests/security/sql-injection.test.ts` | 1h |
| SEC-TEST-004 | Input sanitization tests | `tests/security/input-sanitization.test.ts` | 1h |

**Test Pattern:**
```typescript
describe('SEC-005: Location Router Protection', () => {
  it('should reject unauthenticated create request', async () => {
    const result = await caller.settings.locations.create({...});
    expect(result).toThrow('UNAUTHORIZED');
  });

  it('should reject user without inventory:locations:manage permission', async () => {
    const limitedCaller = createCallerWithUser(userWithoutPermission);
    await expect(limitedCaller.settings.locations.create({...}))
      .rejects.toThrow('FORBIDDEN');
  });
});
```

**Exit Criteria:**
- [ ] Test file for each SEC task exists
- [ ] Minimum 5 test cases per SEC task
- [ ] All tests pass
- [ ] CI integration configured

---

## Red Hat QA Gate 1: Security Hardening Verification

**Duration:** 2-3 hours
**Executor:** Dedicated QA Agent

### Gate 1 Checklist

#### 1.1 Authentication Verification
```bash
# Verify no publicProcedure remains in security-critical routers
grep -r "publicProcedure" server/routers/locations.ts
grep -r "publicProcedure" server/routers/warehouseTransfers.ts
grep -r "publicProcedure" server/routers/orderEnhancements.ts
grep -r "publicProcedure" server/routers/settings.ts
grep -r "publicProcedure" server/routers/vipPortalNeeds.ts
grep -r "publicProcedure" server/routers/returns.ts
# Expected: No matches
```

#### 1.2 Penetration Test Simulation
- [ ] Attempt all SEC-005/006/007/008/009/010 endpoints without auth token
- [ ] Verify 401 response for all
- [ ] Attempt with valid token but insufficient permissions
- [ ] Verify 403 response for all

#### 1.3 Permission Matrix Verification
| Endpoint | Required Permission | Verified |
|----------|---------------------|----------|
| locations.create | inventory:locations:manage | [ ] |
| locations.update | inventory:locations:manage | [ ] |
| locations.delete | inventory:locations:manage | [ ] |
| warehouseTransfers.transfer | inventory:transfer | [ ] |
| orderEnhancements.createRecurringOrder | orders:create | [ ] |
| ... (all 14 endpoints) | | |

#### 1.4 Regression Testing
- [ ] Run full test suite: `pnpm test`
- [ ] Run type check: `pnpm typecheck`
- [ ] Verify no new TypeScript errors introduced

#### 1.5 Security Test Suite Validation
- [ ] All SEC-TEST-* tests pass
- [ ] Coverage includes all protected endpoints
- [ ] No false negatives (tests should fail if protection removed)

### Gate 1 Pass Criteria
- **MUST PASS ALL** items to proceed to Phase 1
- **FAIL**: Any unprotected endpoint discovered → Return to Phase 0
- **FAIL**: Any security test failure → Fix before proceeding

---

## Phase 1: Stability Hardening

**Total Duration:** 8-10 hours (parallel execution)
**Agents:** 3 parallel
**Blocking:** Phase 0 complete, Gate 1 passed

### Wave 1A: Error Handling (Agent 1)

| Task ID | Description | File | Est. |
|---------|-------------|------|------|
| ST-025 | Add Error Boundaries to Critical Pages | `client/src/components/ErrorBoundary.tsx` | 3h |
| ST-026 | Implement Concurrent Edit Detection | `server/_core/optimisticLocking.ts` | 4h |

**Error Boundary Implementation:**
```typescript
// Wrap all critical pages
<ErrorBoundary fallback={<CriticalErrorFallback />}>
  <OrderCreatorPage />
</ErrorBoundary>
```

---

### Wave 1B: Performance & Caching (Agent 2)

| Task ID | Description | File | Est. |
|---------|-------------|------|------|
| ST-010 | Implement Caching Layer (Redis) | `server/_core/cache.ts` | 4h |

**Caching Targets (Security-Aware):**
- Permission lookups (cache per user, invalidate on role change)
- Feature flags (cache globally, invalidate on admin change)
- **Never cache:** User sessions, sensitive financial data

---

### Wave 1C: Data Integrity (Agent 3)

| Task ID | Description | File | Est. |
|---------|-------------|------|------|
| QUAL-004 | Review Referential Integrity (CASCADE Deletes) | Schema-wide | 4h |

**CASCADE Delete Security Audit:**
```sql
-- Identify dangerous cascades
SELECT
  tc.table_name,
  rc.delete_rule,
  kcu.column_name,
  ccu.table_name AS foreign_table
FROM information_schema.table_constraints tc
JOIN information_schema.referential_constraints rc ON tc.constraint_name = rc.constraint_name
WHERE rc.delete_rule = 'CASCADE';
```

**Critical Tables (No CASCADE allowed):**
- `ledgerEntries` (financial audit trail)
- `inventoryMovements` (inventory audit trail)
- `orderStatusHistory` (order audit trail)
- `payments` (financial records)

---

## Red Hat QA Gate 2: Stability Verification

**Duration:** 2 hours

### Gate 2 Checklist

#### 2.1 Error Boundary Coverage
- [ ] All pages in `/pages/` wrapped with ErrorBoundary
- [ ] Error boundary renders user-friendly fallback
- [ ] Errors logged to Sentry with context

#### 2.2 Concurrent Edit Protection
- [ ] Optimistic locking implemented for critical entities
- [ ] Conflict detection returns clear error
- [ ] UI prompts user to refresh on conflict

#### 2.3 Caching Security
- [ ] No sensitive data cached without TTL
- [ ] Cache keys include user context where needed
- [ ] Cache invalidation triggers verified

#### 2.4 Referential Integrity
- [ ] No dangerous CASCADE on audit tables
- [ ] Soft delete used for financial/audit data
- [ ] FK constraints verified in production

### Gate 2 Pass Criteria
- 100% error boundary coverage on critical pages
- Zero dangerous CASCADE deletes on audit tables
- All tests pass

---

## Phase 2: Critical Bug Fixes

**Total Duration:** 8-12 hours (parallel execution)
**Agents:** 3 parallel

### Wave 2A: SQL Safety (Agent 1)

| Task ID | Description | File | Est. |
|---------|-------------|------|------|
| BUG-043 | Permission Service empty array SQL crash | `server/services/permissionService.ts` | 2h |
| BUG-044 | VIP Portal empty batch IDs crash | `server/routers/vipPortalBatches.ts` | 2h |

**SQL Safety Pattern:**
```typescript
// BEFORE: Crashes on empty array
const rules = await db.select().from(pricingRules)
  .where(inArray(pricingRules.id, ruleIds));

// AFTER: Safe
if (ruleIds.length === 0) return [];
const rules = await db.select().from(pricingRules)
  .where(inArray(pricingRules.id, ruleIds));
```

---

### Wave 2B: Frontend Crashes (Agent 2)

| Task ID | Description | File | Est. |
|---------|-------------|------|------|
| BUG-040 | Order Creator: Inventory loading fails | `server/pricingEngine.ts` | 3h |
| BUG-041 | Batch Detail View crashes app | `client/src/components/inventory/BatchDetailDrawer.tsx` | 2h |
| BUG-042 | Global Search returns no results | `server/routers/search.ts` | 2h |

---

### Wave 2C: Data Loading (Agent 3)

| Task ID | Description | File | Est. |
|---------|-------------|------|------|
| BUG-072 | Fix Inventory Data Not Loading in Dashboard | Multiple | 2h |
| BUG-074 | Fix Spreadsheet View Empty Grid | `client/src/pages/SpreadsheetViewPage.tsx` | 2h |
| BUG-076 | Fix Search and Filter Functionality | Multiple | 2h |

---

## Red Hat QA Gate 3: Bug Fix Verification

**Duration:** 2 hours

### Gate 3 Checklist

#### 3.1 SQL Safety Verification
```bash
# Audit all inArray calls
grep -rn "inArray(" server/ --include="*.ts" | head -50
# Each must have length guard
```

#### 3.2 Crash-Free Navigation
- [ ] Navigate to Order Creator → No crash
- [ ] Navigate to Batch Detail → No crash
- [ ] Use Global Search → Returns results
- [ ] Open Spreadsheet View → Shows data

#### 3.3 Data Loading Verification
- [ ] Dashboard loads inventory data
- [ ] Products page shows products
- [ ] Search finds by product name, client name, order number

### Gate 3 Pass Criteria
- Zero crashes on any navigation
- All data pages load correctly
- Search returns relevant results

---

## Phase 3: Features & UX

**Total Duration:** 10-15 hours (parallel execution)
**Agents:** 2 parallel

### Wave 3A: Backend Features (Agent 1)

| Task ID | Description | Est. |
|---------|-------------|------|
| FEAT-007 | Add Payment Recording Against Invoices | 3h |
| FEAT-011 | COGS Logic and Sales Flow Integration | 4h |
| IMPROVE-003 | Add Composite Database Indexes | 2h |

---

### Wave 3B: Frontend Features (Agent 2)

| Task ID | Description | Est. |
|---------|-------------|------|
| UX-001 | Implement Form Dirty State Protection | 2h |
| UX-003 | Fix Mobile Kanban Overflow | 2h |
| UX-006 | Add Error Recovery UI with Retry | 2h |
| BUG-070 through BUG-077 | Remaining UI bugs | 4h |

---

## Final Red Hat QA Gate: Full System Verification

**Duration:** 4 hours

### Final Gate Checklist

#### Security Regression Check
- [ ] Re-run all SEC-TEST-* tests
- [ ] Verify no new publicProcedure usage
- [ ] Audit logs capture all mutations

#### Stability Regression Check
- [ ] Error boundaries still in place
- [ ] No new TypeScript errors
- [ ] Full test suite passes

#### Functional Verification
- [ ] Complete end-to-end workflow: Client → Order → Invoice → Payment
- [ ] VIP Portal: Login → Browse → Order
- [ ] Admin: Settings → User Management → Role Assignment

#### Performance Baseline
- [ ] Page load < 3s for all pages
- [ ] API response < 500ms for standard queries
- [ ] No memory leaks in 30-min session

---

## Parallel Agent Execution Matrix

### Phase 0 (Security) - 3 Agents Parallel

| Agent | Wave | Files | Est. Time | Dependencies |
|-------|------|-------|-----------|--------------|
| Agent 1 | 0A | locations.ts, warehouseTransfers.ts, orderEnhancements.ts | 4-5h | None |
| Agent 2 | 0B | settings.ts, vipPortalNeeds.ts, returns.ts | 4-5h | None |
| Agent 3 | 0C | tests/security/*.test.ts | 4-6h | None |

**No Conflicts:** Each agent works on completely separate files.

### Phase 1 (Stability) - 3 Agents Parallel

| Agent | Wave | Files | Est. Time | Dependencies |
|-------|------|-------|-----------|--------------|
| Agent 1 | 1A | ErrorBoundary.tsx, optimisticLocking.ts | 7h | Gate 1 |
| Agent 2 | 1B | cache.ts, redis config | 4h | Gate 1 |
| Agent 3 | 1C | Schema audit (read-only) | 4h | Gate 1 |

### Phase 2 (Bugs) - 3 Agents Parallel

| Agent | Wave | Files | Est. Time | Dependencies |
|-------|------|-------|-----------|--------------|
| Agent 1 | 2A | permissionService.ts, vipPortalBatches.ts | 4h | Gate 2 |
| Agent 2 | 2B | pricingEngine.ts, BatchDetailDrawer.tsx, search.ts | 7h | Gate 2 |
| Agent 3 | 2C | SpreadsheetViewPage.tsx, dashboard components | 6h | Gate 2 |

### Phase 3 (Features) - 2 Agents Parallel

| Agent | Wave | Files | Est. Time | Dependencies |
|-------|------|-------|-----------|--------------|
| Agent 1 | 3A | Backend routers (payments, accounting) | 9h | Gate 3 |
| Agent 2 | 3B | Frontend pages and components | 8h | Gate 3 |

---

## Execution Timeline

```
DAY 1 (8 hours)
├── 0:00-4:00  Phase 0: Waves 0A, 0B, 0C (3 agents parallel)
├── 4:00-6:00  Red Hat QA Gate 1
└── 6:00-8:00  Phase 1: Waves 1A, 1B, 1C start (3 agents parallel)

DAY 2 (8 hours)
├── 0:00-4:00  Phase 1: Complete
├── 4:00-6:00  Red Hat QA Gate 2
└── 6:00-8:00  Phase 2: Waves 2A, 2B, 2C start (3 agents parallel)

DAY 3 (8 hours)
├── 0:00-4:00  Phase 2: Complete
├── 4:00-6:00  Red Hat QA Gate 3
└── 6:00-8:00  Phase 3: Waves 3A, 3B start (2 agents parallel)

DAY 4 (6 hours)
├── 0:00-4:00  Phase 3: Complete
└── 4:00-6:00  Final Red Hat QA Gate
```

**Total Estimated Time:** 30 hours (spread across 4 days with parallelism)

---

## Success Metrics

| Metric | Current | Target | Verification |
|--------|---------|--------|--------------|
| Public endpoints | 6+ | 0 | grep audit |
| Security tests | 0 | 20+ | test count |
| App crashes | Multiple | 0 | QA navigation |
| SQL injection surface | Unknown | 0 | Security audit |
| Error boundary coverage | Partial | 100% | Code review |

---

## Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Security fix breaks auth flow | Medium | Critical | Run full auth test suite after each change |
| Parallel agents conflict | Low | Medium | File domain isolation enforced |
| QA gate finds major issues | Medium | Low | Budget buffer time for rework |
| Database migration needed | Low | High | Test in staging, have rollback ready |

---

## Appendix: Agent Spawn Commands

### Phase 0 Parallel Launch

```markdown
**Agent 1 (Wave 0A - Router Protection):**
Implement SEC-005, SEC-006, SEC-007. Protect all mutations in:
- server/routers/locations.ts
- server/routers/warehouseTransfers.ts
- server/routers/orderEnhancements.ts
Replace publicProcedure with protectedProcedure + requirePermission.

**Agent 2 (Wave 0B - Data Access Protection):**
Implement SEC-008, SEC-009, SEC-010. Protect all endpoints in:
- server/routers/settings.ts
- server/routers/vipPortalNeeds.ts
- server/routers/returns.ts
Add proper authentication and data scoping.

**Agent 3 (Wave 0C - Security Tests):**
Create security test suite in tests/security/:
- auth-bypass.test.ts
- permission-escalation.test.ts
- sql-injection.test.ts
Test all SEC-* tasks with negative cases.
```

### Phase 1 Parallel Launch

```markdown
**Agent 1 (Wave 1A - Error Handling):**
Implement ST-025 (Error Boundaries) and ST-026 (Concurrent Edit Detection).

**Agent 2 (Wave 1B - Caching):**
Implement ST-010 (Redis Caching Layer) with security-aware caching patterns.

**Agent 3 (Wave 1C - Data Integrity):**
Execute QUAL-004 audit and fix any dangerous CASCADE deletes.
```

---

## Document Control

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-01-09 | Claude Agent | Initial creation |

---

**Next Action:** Execute Phase 0 with 3 parallel agents
