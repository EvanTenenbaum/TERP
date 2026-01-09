# TERP Complete MVP Execution Plan

**Date:** January 9, 2026
**Version:** 2.0
**Philosophy:** Security-First, Maximum Parallelism, Adversarial QA Gates
**Session Branch:** `claude/execution-plan-security-Zq1cj`
**Total Tasks:** 72 MVP Open Tasks

---

## Executive Summary

This execution plan covers **ALL 72 open MVP tasks** organized into **7 phases** with maximum safe parallel execution. Each phase includes:
- **Parallel agent execution** (up to 4 agents) for maximum efficiency
- **Red Hat adversarial QA gates** before phase transitions
- **Strategic dependency ordering** based on blockers and security impact

### Task Inventory

| Category | Open Tasks | Priority |
|----------|------------|----------|
| Security | 6 | P0 (CRITICAL) |
| Critical Bugs | 16 | P0-P1 |
| Stability | 4 | P1 |
| UX | 9 | P1-P2 |
| Features | 25 | P2 |
| Infrastructure | 4 | P2 |
| Quality | 4 | P2 |
| Improvement | 4 | P3 |
| **TOTAL** | **72** | |

### Priority Order Rationale

```
SECURITY → STABILITY → CRITICAL BUGS → UX/QUALITY → FEATURES → INFRASTRUCTURE → POLISH
     ↑
     └── Security gates ALL other work. A vulnerable endpoint renders
         all feature work moot. Fix security first, then everything
         built on top is trustworthy.
```

---

## Complete Phase Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                      PHASE 0: SECURITY HARDENING (6 tasks)                       │
│                         (Foundation - Must Complete First)                        │
├─────────────────────┬─────────────────────┬───────────────────────────────────────┤
│      Wave 0A        │      Wave 0B        │              Wave 0C                  │
│   SEC-005,006,007   │   SEC-008,009,010   │      Security Test Suite              │
│      AGENT 1        │      AGENT 2        │             AGENT 3                   │
└─────────────────────┴─────────────────────┴───────────────────────────────────────┘
                                    ↓
                          ┌─────────────────┐
                          │  RED HAT QA     │
                          │    GATE 1       │
                          └─────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────────────┐
│                    PHASE 1: STABILITY HARDENING (5 tasks)                        │
├─────────────────────┬─────────────────────┬───────────────────────────────────────┤
│      Wave 1A        │      Wave 1B        │              Wave 1C                  │
│   ST-025, ST-026    │      ST-010         │   QUAL-004, ST-024                    │
│      AGENT 1        │      AGENT 2        │             AGENT 3                   │
└─────────────────────┴─────────────────────┴───────────────────────────────────────┘
                                    ↓
                          ┌─────────────────┐
                          │  RED HAT QA     │
                          │    GATE 2       │
                          └─────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────────────┐
│                    PHASE 2: CRITICAL BUGS (16 tasks)                             │
├──────────────┬──────────────┬──────────────┬────────────────────────────────────┤
│   Wave 2A    │   Wave 2B    │   Wave 2C    │           Wave 2D                  │
│  SQL Safety  │  Frontend    │ Data Loading │        Client/Forms                │
│  BUG-043,044 │ BUG-040,041  │ BUG-072,074  │    BUG-070,071,075,077             │
│   AGENT 1    │   AGENT 2    │   AGENT 3    │          AGENT 4                   │
└──────────────┴──────────────┴──────────────┴────────────────────────────────────┘
                                    ↓
                          ┌─────────────────┐
                          │  RED HAT QA     │
                          │    GATE 3       │
                          └─────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────────────┐
│                      PHASE 3: UX & QUALITY (13 tasks)                            │
├──────────────────────────────┬──────────────────────────────────────────────────┤
│          Wave 3A             │                   Wave 3B                         │
│     UX-001,003,006           │        UX-009,010,011,012,013,014                 │
│     QUAL-003,007             │        ROADMAP-001                                │
│         AGENT 1              │                  AGENT 2                          │
└──────────────────────────────┴──────────────────────────────────────────────────┘
                                    ↓
                          ┌─────────────────┐
                          │  RED HAT QA     │
                          │    GATE 4       │
                          └─────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────────────┐
│                      PHASE 4: FEATURES - HIGH PRIORITY (8 tasks)                 │
├──────────────────────────────┬──────────────────────────────────────────────────┤
│          Wave 4A             │                   Wave 4B                         │
│   FEAT-007,011 (Finance)     │        FEAT-001,002,003 (Forms/Tags)              │
│   FEATURE-003 (Live Shop)    │        FEAT-019,020 (VIP/Products)                │
│         AGENT 1              │                  AGENT 2                          │
└──────────────────────────────┴──────────────────────────────────────────────────┘
                                    ↓
                          ┌─────────────────┐
                          │  RED HAT QA     │
                          │    GATE 5       │
                          └─────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────────────┐
│                    PHASE 5: FEATURES - MEDIUM PRIORITY (11 tasks)                │
├──────────────┬──────────────┬──────────────┬────────────────────────────────────┤
│   Wave 5A    │   Wave 5B    │   Wave 5C    │           Wave 5D                  │
│  FEAT-004,   │  FEAT-008,   │ FEAT-021,    │    FEAT-009,010                    │
│  005,006     │  023,024     │ FEAT-005     │    (Products/Warehouse)            │
│   AGENT 1    │   AGENT 2    │   AGENT 3    │          AGENT 4                   │
└──────────────┴──────────────┴──────────────┴────────────────────────────────────┘
                                    ↓
                          ┌─────────────────┐
                          │  RED HAT QA     │
                          │    GATE 6       │
                          └─────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────────────┐
│                    PHASE 6: FEATURES - LOW PRIORITY + INFRA (14 tasks)           │
├──────────────────────────────┬──────────────────────────────────────────────────┤
│          Wave 6A             │                   Wave 6B                         │
│  FEAT-012,013,014,015,016    │  INFRA-004,007,012                                │
│  FEAT-017,018,022            │  CLEANUP-001                                      │
│         AGENT 1              │                  AGENT 2                          │
└──────────────────────────────┴──────────────────────────────────────────────────┘
                                    ↓
                          ┌─────────────────┐
                          │  RED HAT QA     │
                          │    GATE 7       │
                          └─────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         PHASE 7: IMPROVEMENTS (4 tasks)                          │
│                          IMPROVE-001,002,003,004                                 │
│                               AGENT 1                                            │
└─────────────────────────────────────────────────────────────────────────────────┘
                                    ↓
                          ┌─────────────────┐
                          │   FINAL QA      │
                          │     GATE        │
                          └─────────────────┘
```

---

# PHASE 0: SECURITY HARDENING

**Total Tasks:** 6
**Duration:** 6-8 hours (parallel)
**Agents:** 3 parallel
**Blocking:** ALL subsequent phases

## Wave 0A: Router Mutations Protection (Agent 1)

**Duration:** 3-4 hours
**Files:** `server/routers/locations.ts`, `warehouseTransfers.ts`, `orderEnhancements.ts`

| Task ID | Description | File | Est. | Risk |
|---------|-------------|------|------|------|
| SEC-005 | Protect Location Router Mutations | `locations.ts` | 1h | HIGH - Warehouse data manipulation |
| SEC-006 | Protect Warehouse Transfer Mutations | `warehouseTransfers.ts` | 1h | HIGH - Inventory integrity |
| SEC-007 | Protect Order Enhancement Mutations (11 endpoints) | `orderEnhancements.ts` | 2h | CRITICAL - Financial operations |

**Implementation Pattern:**
```typescript
// BEFORE: VULNERABLE
create: publicProcedure.mutation(async ({ input }) => { ... })

// AFTER: PROTECTED
create: protectedProcedure
  .use(requirePermission('inventory:locations:manage'))
  .mutation(async ({ ctx, input }) => { ... })
```

**SEC-007 Endpoints to Protect (11 total):**
1. `createRecurringOrder` → `orders:create`
2. `updateRecurringOrder` → `orders:update`
3. `pauseRecurringOrder` → `orders:update`
4. `resumeRecurringOrder` → `orders:update`
5. `cancelRecurringOrder` → `orders:delete`
6. `reorderFromPrevious` → `orders:create`
7. `updateClientPaymentTerms` → `clients:update_payment_terms`
8. `createAlertConfiguration` → `orders:manage_alerts`
9. `updateAlertConfiguration` → `orders:manage_alerts`
10. `deleteAlertConfiguration` → `orders:manage_alerts`
11. `toggleAlertConfiguration` → `orders:manage_alerts`

---

## Wave 0B: Data Access Protection (Agent 2)

**Duration:** 3-4 hours
**Files:** `server/routers/settings.ts`, `alerts.ts`, `returns.ts`, `refunds.ts`

| Task ID | Description | File | Est. | Risk |
|---------|-------------|------|------|------|
| SEC-008 | Protect Settings Router Mutations (12 endpoints) | `settings.ts` | 1.5h | HIGH - Master data corruption |
| SEC-009 | Protect VIP Portal Needs Data Exposure | `alerts.ts` | 1h | CRITICAL - Business intelligence leak |
| SEC-010 | Protect Returns/Refunds Query Endpoints (6 endpoints) | `returns.ts`, `refunds.ts` | 1.5h | HIGH - Financial data exposure |

**SEC-008 Settings Endpoints (12 total):**
- Grades: create, update, delete (3)
- Categories: create, update, delete (3)
- Subcategories: create, update, delete (3)
- Locations: create, update, delete (3)

**SEC-009 Fix:**
```typescript
// BEFORE: Exposes ALL client needs publicly
getNeedsForVipPortal: publicProcedure.query(...)

// AFTER: Scoped to authenticated VIP client
getNeedsForVipPortal: vipPortalProcedure.query(async ({ ctx }) => {
  return getActiveNeedsForClient(ctx.vipPortalClientId);
})
```

**SEC-010 Endpoints (6 total):**
- `returns.getAll`, `returns.getById`
- `refunds.getAll`, `refunds.getById`, `refunds.getByReturn`, `refunds.getByOriginalTransaction`

---

## Wave 0C: Security Test Suite (Agent 3)

**Duration:** 4-5 hours
**Files:** `tests/security/*.test.ts` (new)

| Task ID | Description | File | Est. |
|---------|-------------|------|------|
| SEC-TEST-001 | Authentication bypass tests | `auth-bypass.test.ts` | 1.5h |
| SEC-TEST-002 | Permission escalation tests | `permission-escalation.test.ts` | 1.5h |
| SEC-TEST-003 | SQL injection prevention | `sql-injection.test.ts` | 1h |
| SEC-TEST-004 | Input sanitization tests | `input-sanitization.test.ts` | 0.5h |

**Required Test Coverage:**
```typescript
// Each SEC task must have:
// 1. Unauthenticated access blocked (401)
// 2. Insufficient permission blocked (403)
// 3. Authorized access works (200)
// 4. Data scoping enforced (no cross-tenant leakage)

describe('SEC-007: Order Enhancement Protection', () => {
  it('blocks unauthenticated recurring order creation', async () => {
    await expect(publicCaller.orderEnhancements.createRecurringOrder({}))
      .rejects.toThrow('UNAUTHORIZED');
  });

  it('blocks user without orders:create permission', async () => {
    const limitedCaller = createCaller(userWithoutOrdersCreate);
    await expect(limitedCaller.orderEnhancements.createRecurringOrder({}))
      .rejects.toThrow('FORBIDDEN');
  });

  it('allows user with orders:create permission', async () => {
    const authorizedCaller = createCaller(userWithOrdersCreate);
    const result = await authorizedCaller.orderEnhancements.createRecurringOrder(validInput);
    expect(result.id).toBeDefined();
  });
});
```

---

## Red Hat QA Gate 1: Security Hardening Verification

**Duration:** 2 hours
**Executor:** Dedicated QA Agent

### Gate 1 Checklist

#### 1.1 Zero Public Procedure Verification
```bash
# Must return NO matches
grep -r "publicProcedure" server/routers/locations.ts
grep -r "publicProcedure" server/routers/warehouseTransfers.ts
grep -r "publicProcedure" server/routers/orderEnhancements.ts
grep -r "publicProcedure" server/routers/settings.ts
grep -r "publicProcedure" server/routers/alerts.ts | grep -i "needs"
grep -r "publicProcedure" server/routers/returns.ts
grep -r "publicProcedure" server/routers/refunds.ts
```

#### 1.2 Penetration Test Simulation
| Endpoint | Unauthenticated (expect 401) | Wrong Permission (expect 403) | Authorized (expect 200) |
|----------|------------------------------|-------------------------------|-------------------------|
| locations.create | [ ] | [ ] | [ ] |
| warehouseTransfers.transfer | [ ] | [ ] | [ ] |
| orderEnhancements.createRecurringOrder | [ ] | [ ] | [ ] |
| settings.grades.create | [ ] | [ ] | [ ] |
| alerts.getNeedsForVipPortal | [ ] | [ ] | [ ] |
| returns.getAll | [ ] | [ ] | [ ] |

#### 1.3 Security Test Suite Validation
- [ ] All SEC-TEST-* files exist
- [ ] Minimum 5 tests per SEC task
- [ ] `pnpm test tests/security` passes
- [ ] No false negatives (removing protection breaks tests)

#### 1.4 Regression Verification
- [ ] `pnpm typecheck` passes
- [ ] `pnpm test` passes
- [ ] No new console errors in browser

### Gate 1 Pass/Fail Criteria
- **PASS:** All items checked, proceed to Phase 1
- **FAIL:** Return to Phase 0, fix issues, re-run gate

---

# PHASE 1: STABILITY HARDENING

**Total Tasks:** 5
**Duration:** 8-10 hours (parallel)
**Agents:** 3 parallel
**Blocking:** Gate 1 passed

## Wave 1A: Error Handling (Agent 1)

| Task ID | Description | File | Est. |
|---------|-------------|------|------|
| ST-025 | Add Error Boundaries to Critical Pages | Multiple page files | 4h |
| ST-026 | Implement Concurrent Edit Detection | `server/_core/optimisticLocking.ts` | 4h |

**ST-025 Pages Requiring Error Boundaries:**
1. `Inventory.tsx` - Complex async operations
2. `ClientProfilePage.tsx` - Multiple data fetches
3. `Orders.tsx` - Critical workflow page
4. `OrderCreatorPage.tsx` - Complex form with queries
5. `BatchDetailDrawer.tsx` - Nested data relationships
6. All dashboard widgets in `components/dashboard/widgets-v2/`

**Implementation:**
```typescript
// client/src/components/common/PageErrorBoundary.tsx
export function PageErrorBoundary({ children, pageName }: Props) {
  return (
    <ErrorBoundary
      FallbackComponent={({ error, resetErrorBoundary }) => (
        <div className="flex flex-col items-center justify-center p-8">
          <AlertTriangle className="h-12 w-12 text-destructive" />
          <h2 className="mt-4 text-lg font-semibold">Something went wrong</h2>
          <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
          <Button onClick={resetErrorBoundary} className="mt-4">
            Try Again
          </Button>
        </div>
      )}
      onError={(error) => {
        // Log to Sentry with page context
        Sentry.captureException(error, { tags: { page: pageName } });
      }}
    >
      {children}
    </ErrorBoundary>
  );
}
```

---

## Wave 1B: Caching Layer (Agent 2)

| Task ID | Description | File | Est. |
|---------|-------------|------|------|
| ST-010 | Implement Caching Layer (Redis) | `server/_core/cache.ts` | 4h |

**Caching Strategy (Security-Aware):**

| Data Type | Cache? | TTL | Invalidation Trigger |
|-----------|--------|-----|---------------------|
| Permission lookups | Yes | 5min | Role/permission change |
| Feature flags | Yes | 1min | Admin toggle |
| Product catalog | Yes | 10min | Product update |
| User sessions | **NO** | - | - |
| Financial data | **NO** | - | - |
| VIP Portal data | **NO** | - | - |

---

## Wave 1C: Data Integrity (Agent 3)

| Task ID | Description | File | Est. |
|---------|-------------|------|------|
| QUAL-004 | Review Referential Integrity (CASCADE Deletes) | Schema-wide | 3h |
| ST-024 | Remove Comments Feature | Multiple | 2h |

**QUAL-004 Critical Audit Points:**

Tables that MUST NOT have CASCADE DELETE:
- `ledgerEntries` - Financial audit trail
- `inventoryMovements` - Inventory audit trail
- `orderStatusHistory` - Order audit trail
- `payments` - Financial records
- `invoices` - Financial records

```sql
-- Audit query
SELECT tc.table_name, rc.delete_rule, kcu.column_name
FROM information_schema.table_constraints tc
JOIN information_schema.referential_constraints rc
  ON tc.constraint_name = rc.constraint_name
WHERE rc.delete_rule = 'CASCADE'
  AND tc.table_name IN ('ledger_entries', 'inventory_movements',
                         'order_status_history', 'payments', 'invoices');
-- Expected: 0 rows
```

---

## Red Hat QA Gate 2: Stability Verification

**Duration:** 2 hours

### Gate 2 Checklist

#### 2.1 Error Boundary Coverage
```bash
# Check all critical pages have ErrorBoundary
grep -rn "PageErrorBoundary" client/src/pages/*.tsx | wc -l
# Expected: >= 10
```

- [ ] Inventory page wrapped
- [ ] Orders page wrapped
- [ ] ClientProfile page wrapped
- [ ] OrderCreator page wrapped
- [ ] All dashboard widgets wrapped

#### 2.2 Concurrent Edit Detection
- [ ] Edit Order → Another user edits → First user saves → Conflict shown
- [ ] Edit Client → Version mismatch → Clear error message
- [ ] Retry option available after conflict

#### 2.3 Cache Security Audit
- [ ] No user sessions in cache
- [ ] No financial data in cache
- [ ] Cache keys include tenant/user context where needed

#### 2.4 CASCADE Delete Audit
- [ ] Zero dangerous cascades on audit tables
- [ ] Migration created for any fixes needed

### Gate 2 Pass/Fail Criteria
- **PASS:** All items checked
- **FAIL:** Fix issues, re-run gate

---

# PHASE 2: CRITICAL BUGS

**Total Tasks:** 16
**Duration:** 10-14 hours (parallel)
**Agents:** 4 parallel
**Blocking:** Gate 2 passed

## Wave 2A: SQL Safety (Agent 1)

| Task ID | Description | File | Est. |
|---------|-------------|------|------|
| BUG-043 | Permission Service empty array SQL crash | `permissionService.ts` | 2h |
| BUG-044 | VIP Portal empty batch IDs crash | `vipPortalBatches.ts` | 1.5h |
| BUG-045 | Order Creator: Retry resets entire form | `OrderCreatorPage.tsx` | 1.5h |
| BUG-046 | Settings Users tab misleading auth error | `SettingsPage.tsx` | 1h |

**SQL Safety Pattern:**
```typescript
// BEFORE: Crashes on empty array
const results = await db.select().from(table)
  .where(inArray(table.id, ids));

// AFTER: Safe
if (ids.length === 0) return [];
const results = await db.select().from(table)
  .where(inArray(table.id, ids));
```

---

## Wave 2B: Frontend Crashes (Agent 2)

| Task ID | Description | File | Est. |
|---------|-------------|------|------|
| BUG-040 | Order Creator: Inventory loading fails | `pricingEngine.ts` | 3h |
| BUG-041 | Batch Detail View crashes app | `BatchDetailDrawer.tsx` | 2h |
| BUG-042 | Global Search returns no results | `search.ts` | 2h |
| BUG-047 | Spreadsheet View shows empty grid | `SpreadsheetViewPage.tsx` | 1.5h |

**BUG-040 Root Cause:** Empty `ruleIds` array in pricing engine
**BUG-041 Root Cause:** `.map()` called on undefined arrays
**BUG-042 Root Cause:** Search only queries batch fields, not products

---

## Wave 2C: Data Loading (Agent 3)

| Task ID | Description | File | Est. |
|---------|-------------|------|------|
| BUG-072 | Fix Inventory Data Not Loading in Dashboard | Dashboard widgets | 2h |
| BUG-073 | Fix Live Shopping Feature Not Accessible | Live shopping routes | 2h |
| BUG-074 | Fix Spreadsheet View Empty Grid | `SpreadsheetViewPage.tsx` | 1.5h |
| BUG-076 | Fix Search and Filter Functionality | Multiple | 2h |

---

## Wave 2D: Client & Forms (Agent 4)

| Task ID | Description | File | Est. |
|---------|-------------|------|------|
| BUG-070 | Fix Client List Click Handlers Not Working | `ClientsListPage.tsx` | 1.5h |
| BUG-071 | Fix Create Client Form Submission Failure | `ClientForm.tsx` | 2h |
| BUG-075 | Fix Settings Users Tab Authentication Error | `UsersTab.tsx` | 1.5h |
| BUG-077 | Fix Notification System Not Working | Notification components | 2h |

---

## Red Hat QA Gate 3: Bug Fix Verification

**Duration:** 2-3 hours

### Gate 3 Checklist

#### 3.1 SQL Safety Audit
```bash
# Find all inArray calls and verify guards exist
grep -rn "inArray(" server/ --include="*.ts" -A 2 | grep -B 2 "length"
```

- [ ] All `inArray()` calls have length guards
- [ ] No SQL errors on empty arrays

#### 3.2 Crash-Free Navigation Test
| Page | Navigates | No Crash | Data Loads |
|------|-----------|----------|------------|
| Order Creator | [ ] | [ ] | [ ] |
| Batch Detail | [ ] | [ ] | [ ] |
| Global Search | [ ] | [ ] | [ ] |
| Spreadsheet View | [ ] | [ ] | [ ] |
| Client List | [ ] | [ ] | [ ] |
| Settings Users | [ ] | [ ] | [ ] |
| Live Shopping | [ ] | [ ] | [ ] |
| Dashboard | [ ] | [ ] | [ ] |

#### 3.3 Form Submission Test
- [ ] Create Client → Submits successfully
- [ ] Order Creator retry → Does NOT reset form
- [ ] Client list click → Opens client detail

### Gate 3 Pass/Fail Criteria
- **PASS:** All pages navigate without crash, all forms submit
- **FAIL:** Fix regressions, re-run gate

---

# PHASE 3: UX & QUALITY

**Total Tasks:** 13
**Duration:** 8-10 hours (parallel)
**Agents:** 2 parallel
**Blocking:** Gate 3 passed

## Wave 3A: Core UX (Agent 1)

| Task ID | Description | Est. |
|---------|-------------|------|
| UX-001 | Implement Form Dirty State Protection | 2h |
| UX-003 | Fix Mobile Kanban Overflow | 1.5h |
| UX-006 | Add Error Recovery UI with Retry | 2h |
| QUAL-003 | Complete Critical TODOs | 3h |
| QUAL-007 | Final TODO Audit & Documentation | 2h |

**UX-001 Implementation:**
```typescript
// Prevent navigation with unsaved changes
const { isDirty } = useFormState();

useEffect(() => {
  const handleBeforeUnload = (e: BeforeUnloadEvent) => {
    if (isDirty) {
      e.preventDefault();
      e.returnValue = '';
    }
  };
  window.addEventListener('beforeunload', handleBeforeUnload);
  return () => window.removeEventListener('beforeunload', handleBeforeUnload);
}, [isDirty]);
```

---

## Wave 3B: Video Testing UX Fixes (Agent 2)

| Task ID | Description | Est. |
|---------|-------------|------|
| UX-009 | Fix Sidebar Slide Animation | 1h |
| UX-010 | Clarify My Account vs User Settings Navigation | 1h |
| UX-011 | Fix Two Export Buttons Issue | 0.5h |
| UX-012 | Fix Period Display Formatting | 0.5h |
| UX-013 | Fix Mirrored Elements Issue | 1h |
| UX-014 | Make Optional Fields Clear | 1h |
| ROADMAP-001 | Process Consolidated Roadmap Update Report | 1h |

---

## Red Hat QA Gate 4: UX Verification

**Duration:** 1.5 hours

### Gate 4 Checklist

#### 4.1 Form Protection Test
- [ ] Edit Order → Navigate away → Confirmation dialog shown
- [ ] Edit Client → Close tab → Browser warning shown
- [ ] Submit form → No double-submit possible

#### 4.2 Mobile/Responsive Test
- [ ] Kanban view on mobile → No horizontal overflow
- [ ] Sidebar collapse animation smooth
- [ ] All buttons accessible on mobile

#### 4.3 UI Consistency
- [ ] Single export button per view
- [ ] Optional fields clearly marked
- [ ] Period display formats consistent
- [ ] No mirrored/flipped elements

### Gate 4 Pass/Fail Criteria
- **PASS:** All UX items verified
- **FAIL:** Fix issues, re-run gate

---

# PHASE 4: HIGH-PRIORITY FEATURES

**Total Tasks:** 8
**Duration:** 12-16 hours (parallel)
**Agents:** 2 parallel
**Blocking:** Gate 4 passed

## Wave 4A: Financial Features (Agent 1)

| Task ID | Description | Est. |
|---------|-------------|------|
| FEAT-007 | Add Payment Recording Against Invoices | 4h |
| FEAT-011 | COGS Logic and Sales Flow Integration | 5h |
| FEATURE-003 | Live Shopping & Price Negotiation System | 6h |

**FEAT-007 Requirements:**
- Record partial payments against invoices
- Track payment history
- Update AR balance automatically
- Generate payment receipt

**FEAT-011 Requirements:**
- Calculate COGS per order line
- Track margin per sale
- Update financial reports
- Integration with accounting module

---

## Wave 4B: Client & Product Features (Agent 2)

| Task ID | Description | Est. |
|---------|-------------|------|
| FEAT-001 | Client Form Field Updates | 2h |
| FEAT-002 | Tag System Revamp for Clients and Products | 4h |
| FEAT-003 | Order Creator Quick Add Quantity Field | 2h |
| FEAT-019 | VIP Status and Tiers Implementation | 3h |
| FEAT-020 | Product Subcategory and Strain Matching | 3h |

---

## Red Hat QA Gate 5: Feature Verification

**Duration:** 2 hours

### Gate 5 Checklist

#### 5.1 Financial Feature Verification
- [ ] Create invoice → Record payment → Balance updates
- [ ] Partial payment → Remaining balance shown
- [ ] COGS calculated → Margin displayed
- [ ] Financial reports accurate

#### 5.2 Client/Product Feature Verification
- [ ] Client tags → Filter works
- [ ] Product tags → Filter works
- [ ] VIP tier assigned → Pricing reflects tier
- [ ] Product subcategories → Filter in catalog

### Gate 5 Pass/Fail Criteria
- **PASS:** All features work end-to-end
- **FAIL:** Fix issues, re-run gate

---

# PHASE 5: MEDIUM-PRIORITY FEATURES

**Total Tasks:** 11
**Duration:** 10-14 hours (parallel)
**Agents:** 4 parallel
**Blocking:** Gate 5 passed

## Wave 5A: Order Workflow (Agent 1)

| Task ID | Description | Est. |
|---------|-------------|------|
| FEAT-004 | Add Dollar Amount Discount Option | 2h |
| FEAT-005 | Merge Draft and Quote Workflows | 3h |
| FEAT-006 | Show Product Name Instead of SKU in Order Creator | 1.5h |

## Wave 5B: Notifications (Agent 2)

| Task ID | Description | Est. |
|---------|-------------|------|
| FEAT-023 | Notification Preferences - System vs User Level | 3h |
| FEAT-024 | Inline Notifications Without Page Navigation | 2.5h |
| FEAT-008 | Invoice Editing from Order View | 2.5h |

## Wave 5C: Settings (Agent 3)

| Task ID | Description | Est. |
|---------|-------------|------|
| FEAT-021 | Settings Changes Apply to Entire Team | 2.5h |

## Wave 5D: Products & Warehouse (Agent 4)

| Task ID | Description | Est. |
|---------|-------------|------|
| FEAT-009 | Add Product Subcategories (Smalls, Trim, etc.) | 2h |
| FEAT-010 | Default Warehouse Selection | 1.5h |

---

## Red Hat QA Gate 6: Medium Feature Verification

**Duration:** 1.5 hours

### Gate 6 Checklist
- [ ] Dollar discount applied correctly
- [ ] Draft/Quote workflow merged
- [ ] Product names shown in order creator
- [ ] Notification preferences work
- [ ] Inline notifications appear
- [ ] Invoice editable from order view
- [ ] Team settings propagate
- [ ] Product subcategories functional
- [ ] Default warehouse saves

---

# PHASE 6: LOW-PRIORITY FEATURES + INFRASTRUCTURE

**Total Tasks:** 14
**Duration:** 10-12 hours (parallel)
**Agents:** 2 parallel
**Blocking:** Gate 6 passed

## Wave 6A: Low-Priority Features (Agent 1)

| Task ID | Description | Est. |
|---------|-------------|------|
| FEAT-012 | Make Grade Field Optional/Customizable | 1h |
| FEAT-013 | Add Packaged Unit Type for Products | 1.5h |
| FEAT-014 | Remove Expected Delivery from Purchases | 0.5h |
| FEAT-015 | Finance Status Customization | 1.5h |
| FEAT-016 | Rename Credits to Credit Settings | 0.5h |
| FEAT-017 | Feature Flags Direct Access | 1h |
| FEAT-018 | Remove Development-Only Features from User-Facing UI | 2h |
| FEAT-022 | Show Role Names Instead of Count in Permissions | 1h |

## Wave 6B: Infrastructure (Agent 2)

| Task ID | Description | Est. |
|---------|-------------|------|
| INFRA-004 | Implement Deployment Monitoring Enforcement | 3h |
| INFRA-007 | Update Swarm Manager | 2h |
| INFRA-012 | Deploy TERP Commander Slack Bot | 2h |
| CLEANUP-001 | Remove LLM/AI from Codebase | 2h |

---

## Red Hat QA Gate 7: Infrastructure Verification

**Duration:** 1 hour

### Gate 7 Checklist
- [ ] All low-priority features work
- [ ] Deployment monitoring active
- [ ] Slack bot responds
- [ ] No LLM/AI code remaining in codebase
- [ ] Development features hidden in production

---

# PHASE 7: IMPROVEMENTS

**Total Tasks:** 4
**Duration:** 4-6 hours
**Agents:** 1
**Blocking:** Gate 7 passed

| Task ID | Description | Est. |
|---------|-------------|------|
| IMPROVE-001 | Fix Backup Script Security | 1.5h |
| IMPROVE-002 | Enhance Health Check Endpoints | 1.5h |
| IMPROVE-003 | Add Composite Database Indexes | 2h |
| IMPROVE-004 | Reduce Rate Limiting Thresholds | 1h |

---

## Final Red Hat QA Gate: Full System Verification

**Duration:** 4 hours

### Complete System Test

#### Security Regression
```bash
# Re-verify no public procedures in protected routers
grep -r "publicProcedure" server/routers/{locations,warehouseTransfers,orderEnhancements,settings,alerts,returns,refunds}.ts
# Expected: 0 matches
```

- [ ] All SEC-TEST-* tests pass
- [ ] Penetration test simulation passes
- [ ] No unprotected endpoints

#### Stability Regression
- [ ] Error boundaries in place
- [ ] `pnpm typecheck` passes
- [ ] `pnpm test` passes

#### Full Workflow Test
1. **Sales Cycle:**
   - [ ] Create Client → Create Order → Generate Invoice → Record Payment

2. **Inventory Cycle:**
   - [ ] Create PO → Receive Goods → Create Batch → Adjust Inventory

3. **VIP Portal:**
   - [ ] Login → Browse Catalog → Place Order → View History

4. **Admin:**
   - [ ] Manage Users → Assign Roles → Configure Settings

#### Performance Baseline
- [ ] All pages load < 3s
- [ ] API responses < 500ms
- [ ] No memory leaks (30min session)

---

# EXECUTION TIMELINE

```
DAY 1 (8 hours) - SECURITY
├── 0:00-4:00  Phase 0: Security (3 agents parallel)
├── 4:00-6:00  Red Hat QA Gate 1
└── 6:00-8:00  Phase 1: Stability start (3 agents parallel)

DAY 2 (8 hours) - STABILITY + BUGS START
├── 0:00-2:00  Phase 1: Complete
├── 2:00-4:00  Red Hat QA Gate 2
└── 4:00-8:00  Phase 2: Critical Bugs (4 agents parallel)

DAY 3 (8 hours) - BUGS + UX
├── 0:00-4:00  Phase 2: Complete
├── 4:00-6:00  Red Hat QA Gate 3
└── 6:00-8:00  Phase 3: UX & Quality start (2 agents parallel)

DAY 4 (8 hours) - UX + FEATURES HIGH
├── 0:00-2:00  Phase 3: Complete
├── 2:00-3:00  Red Hat QA Gate 4
└── 3:00-8:00  Phase 4: High-Priority Features (2 agents parallel)

DAY 5 (8 hours) - FEATURES MEDIUM
├── 0:00-4:00  Phase 4: Complete + Gate 5
└── 4:00-8:00  Phase 5: Medium-Priority Features (4 agents parallel)

DAY 6 (8 hours) - FEATURES LOW + INFRA
├── 0:00-4:00  Phase 5: Complete + Gate 6
└── 4:00-8:00  Phase 6: Low-Priority + Infra (2 agents parallel)

DAY 7 (6 hours) - POLISH + FINAL QA
├── 0:00-2:00  Phase 6: Complete + Gate 7
├── 2:00-4:00  Phase 7: Improvements
└── 4:00-6:00  Final Red Hat QA Gate
```

**Total Estimated Time:** 54 hours over 7 days with parallelism

---

# PARALLEL AGENT ALLOCATION

| Phase | Agents | Tasks | Hours (Parallel) |
|-------|--------|-------|------------------|
| 0 | 3 | 6 | 4-6h |
| 1 | 3 | 5 | 4-5h |
| 2 | 4 | 16 | 6-8h |
| 3 | 2 | 13 | 5-6h |
| 4 | 2 | 8 | 8-10h |
| 5 | 4 | 11 | 4-5h |
| 6 | 2 | 14 | 5-6h |
| 7 | 1 | 4 | 4-6h |
| QA Gates | 1 | - | 14h total |
| **TOTAL** | - | **72** | **~54h** |

---

# SUCCESS METRICS

| Metric | Before | Target | Verification |
|--------|--------|--------|--------------|
| Public endpoints | 20+ | 0 | grep audit |
| Security tests | 0 | 30+ | test count |
| App crashes | Multiple | 0 | QA navigation |
| P0 bugs open | 5 | 0 | roadmap check |
| P1 bugs open | 11 | 0 | roadmap check |
| Error boundary coverage | ~10% | 100% | code audit |
| Feature completion | 56/127 | 127/127 | roadmap |

---

# RISK REGISTER

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Security fix breaks auth | Medium | Critical | Run auth tests after each change |
| Parallel agents conflict | Low | Medium | File domain isolation enforced |
| QA gate finds major issues | Medium | Low | Budget buffer time for rework |
| Database migration needed | Low | High | Test in staging, have rollback |
| Feature scope creep | Medium | Medium | Strict adherence to task definitions |

---

# DOCUMENT CONTROL

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-01-09 | Claude Agent | Initial security-focused plan |
| 2.0 | 2026-01-09 | Claude Agent | Complete MVP coverage (72 tasks) |

---

**Next Action:** Execute Phase 0 with 3 parallel agents (Security Hardening)
