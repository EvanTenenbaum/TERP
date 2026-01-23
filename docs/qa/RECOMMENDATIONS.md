# QA Recommendations - Work Surfaces (REVISED)

**Generated**: 2026-01-20
**Revised**: 2026-01-20 (Third-Party Expert Review + Product Decisions)
**Testing Suite**: Work Surfaces Exhaustive Testing

---

## Revision Notes

> **IMPORTANT**: This document has been revised following a third-party expert review and product decision clarifications.
>
> **Key Corrections**:
> - ~~P0-002 (Inventory oversell race condition)~~ **REMOVED** - False positive. Code properly implements row-level locking.
> - ~~P0-004 (Individual feature flags)~~ **CLOSED** - Product decision: deployment-level flags sufficient
> - **P1-001 RESOLVED** - Current void logic confirmed correct; add void reason field
> - **P0-002 CLARIFIED** - Flexible lot selection needed (not strict FIFO/LIFO)
> - **P0-003 CLARIFIED** - Add RETURNED status with restocking/vendor-return paths

---

## Product Decisions Applied

| Issue | Decision | Impact |
|-------|----------|--------|
| Invoice void logic | Paid invoices CAN be voided; add reason field | P1-001 becomes simple enhancement |
| Lot costing | Flexible lot selection per customer need | P0-002 implementation clarified |
| Order returns | Add RETURNED → RESTOCKED or RETURNED_TO_VENDOR paths | P0-003 scope expanded |
| Manager approval | Build infrastructure, no rules active yet | P2-001 becomes framework build |
| Feature flags | Deployment-level sufficient | P0-004 + P1-004 CLOSED |

---

## Executive Summary

The Work Surfaces testing suite identified **24 issues** across 9 components:
- 3 P0 Blockers
- 8 P1 Critical
- 9 P2 Important
- 4 P3 Minor

The codebase has excellent foundations (RBAC, static analysis, hook tests, **proper database concurrency control**) but critical gaps in financial flows and component testing.

---

## Immediate Actions Required

### 1. Fix Payment Recording Stub (P0-001)
**Priority**: IMMEDIATE
**Impact**: Accounting flow completely broken

The InvoicesWorkSurface payment handler is a stub that shows success without recording payments. This breaks the entire Invoice → Payment → Reconciliation flow.

**Action**: Wire `handlePaymentSubmit` to `trpc.payments.recordPayment` mutation.

---

### 2. Implement Flexible Lot Selection (P0-002)
**Priority**: HIGH
**Impact**: Users cannot fulfill customer-specific lot requirements

**Product Decision**: Users need to select specific batches/lots per customer needs rather than strict FIFO/LIFO costing. This is a core business workflow.

**Action**:
- Add batch selection UI during order creation
- Create `order_line_item_allocations` table to track batch→order mappings
- Calculate weighted-average COGS from selected batches

---

### 3. Add RETURNED Order Status (P0-003)
**Priority**: HIGH
**Impact**: Cannot process returns properly

**Product Decision**: Add RETURNED status with two terminal paths:
- **RESTOCKED**: Items returned to inventory (increase batch quantities)
- **RETURNED_TO_VENDOR**: Items sent back to vendor (create vendor return record)

**Action**: Add enum values, state transitions, and processing logic for both paths.

---

## Architectural Recommendations

### A. Concurrency Handling Pattern

**Problem**: Client-side lacks protection against rapid operations (double-clicks, etc).

**Good News**: Database-level concurrency IS properly implemented via `.for("update")` row locks in `ordersDb.ts:290-296`.

**Recommendation**: Add client-side debounce to complement existing server-side protection:

```typescript
// 1. Client-side debounce wrapper
const useSafeMutation = <T>(mutation: UseMutationResult<T>) => {
  const handleMutate = useDebouncedCallback(
    (input) => {
      if (mutation.isPending) return;
      mutation.mutate(input);
    },
    300
  );
  return { ...mutation, safeMutate: handleMutate };
};

// 2. Server-side optimistic locking middleware
const withOptimisticLocking = t.middleware(async ({ ctx, next, input }) => {
  if (!input.version) {
    throw new TRPCError({ code: 'BAD_REQUEST', message: 'Version required' });
  }
  return next({ ctx });
});
```

---

### B. Error Display Standard

**Problem**: 3 Work Surfaces don't display query errors, leaving users unaware of failures.

**Recommendation**: Create shared error boundary component:

```typescript
// ErrorStateDisplay.tsx
export const ErrorStateDisplay = ({ error, onRetry }: Props) => (
  <Alert variant="destructive">
    <AlertTriangle className="h-4 w-4" />
    <AlertTitle>Failed to load data</AlertTitle>
    <AlertDescription>{error.message}</AlertDescription>
    <Button onClick={onRetry}>Retry</Button>
  </Alert>
);

// Usage in all Work Surfaces
{error ? (
  <ErrorStateDisplay error={error} onRetry={refetch} />
) : ...}
```

---

### C. Feature Flag Hierarchy

**Problem**: Individual surface flags not seeded, deployment flags don't cascade, mixed patterns.

**Recommendation**: Implement proper flag hierarchy:

```
Deployment Flags (Master switches)
├── WORK_SURFACE_INTAKE
│   ├── work-surface-direct-intake
│   └── work-surface-purchase-orders
├── WORK_SURFACE_ORDERS
│   ├── work-surface-orders
│   ├── work-surface-quotes
│   └── work-surface-clients
├── WORK_SURFACE_INVENTORY
│   ├── work-surface-inventory
│   └── work-surface-pick-pack
└── WORK_SURFACE_ACCOUNTING
    ├── work-surface-invoices
    └── work-surface-client-ledger
```

**Action**: Seed individual flags with `dependsOn` relationships.

---

### D. Test Coverage Strategy

**Problem**: Excellent hook tests (6 files, 2500+ lines) but zero component tests.

**Recommendation**: Implement tiered testing strategy:

| Tier | Type | Target | Priority |
|------|------|--------|----------|
| 1 | Hook Tests | Already excellent | Maintain |
| 2 | Component Unit Tests | 0% → 80% coverage | HIGH |
| 3 | Integration Tests | Cross-surface flows | MEDIUM |
| 4 | E2E Tests | Golden flows | Maintain/Expand |

**Minimum Viable Test Plan**:
```typescript
// Per-component test file structure
describe('OrdersWorkSurface', () => {
  it('renders loading state');
  it('renders data correctly');
  it('handles row selection');
  it('opens inspector on Enter');
  it('closes inspector on Escape');
  it('handles mutation errors');
});
```

---

### E. Business Logic Centralization

**Problem**: Business rules scattered across UI and server, some implemented incorrectly.

**Recommendation**: Create domain services layer:

```typescript
// server/services/domain/orderRules.ts
export const OrderRules = {
  canEdit: (order: Order, user: User): boolean => {
    if (order.status === 'DRAFT') return true;
    if (order.status === 'CONFIRMED') {
      return user.permissions.includes('orders:manage');
    }
    return false;
  },

  validTransitions: {
    DRAFT: ['CONFIRMED', 'CANCELLED'],
    CONFIRMED: ['FULFILLED', 'CANCELLED'],
    FULFILLED: ['SHIPPED'],
    SHIPPED: ['DELIVERED'],
    DELIVERED: [], // Terminal state
  },

  canTransition: (from: Status, to: Status): boolean => {
    return OrderRules.validTransitions[from]?.includes(to) ?? false;
  },
};
```

---

## Security Recommendations

### 1. Input Validation Hardening
Add max length to all string fields:
```typescript
notes: z.string().max(5000).optional(),
name: z.string().min(1).max(500),
```

### 2. Database Constraints
Add CHECK constraints for financial integrity:
```sql
ALTER TABLE invoices ADD CONSTRAINT positive_amount_due CHECK (amount_due >= 0);
ALTER TABLE batches ADD CONSTRAINT positive_quantity CHECK (on_hand_qty >= 0);
```

### 3. Audit Trail Enhancement
Log all financial mutations with before/after state:
```typescript
await auditLog.record({
  action: 'INVOICE_STATUS_CHANGE',
  entity: 'invoice',
  entityId: invoiceId,
  before: { status: oldStatus },
  after: { status: newStatus },
  userId: ctx.user.openId,
});
```

---

## Performance Recommendations

### 1. Implement Optimistic Updates
Current: All updates wait for server confirmation.
Target: Immediate UI feedback with rollback on error.

**High-impact candidates**:
- Status changes (order confirm, invoice mark paid)
- Quick edits (notes, minor updates)

### 2. Add Refetch Intervals
Current: Data only refreshes on mutation or manual refresh.
Target: Background refresh for frequently-changing data.

```typescript
trpc.inventory.list.useQuery({}, { refetchInterval: 30000 });
```

### 3. Implement Request Deduplication
Prevent duplicate API calls from rapid user actions:
```typescript
const dedupeKey = `${endpoint}-${JSON.stringify(input)}`;
if (pendingRequests.has(dedupeKey)) return pendingRequests.get(dedupeKey);
```

---

## Roadmap (REVISED - With Product Decisions)

### Immediate: P0 Blockers
- [ ] P0-001: Wire payment recording mutation (critical financial flow)
- [ ] P0-002: Implement flexible lot selection (core business requirement)
- [ ] P0-003: Add RETURNED status with restocking/vendor-return paths
- [ ] P1-002: Add debounce to mutations (prevents duplicate operations)

### Week 1: P1 Critical
- [ ] P1-001: Add void reason field (confirmed: void logic is correct)
- [ ] P1-003: Make optimistic locking mandatory
- [ ] P1-004: Standardize flag evaluation patterns
- [ ] P1-005: Add query error displays
- [ ] P1-006: Migrate deprecated vendors.getAll endpoint
- [ ] P1-007: Add feature flag permission check

### Week 2: Test Infrastructure
- [ ] P1-008: Create component test infrastructure
- [ ] Write tests for 3 highest-risk surfaces (Orders, Invoices, DirectIntake)
- [ ] P2-008: Add missing golden flow tests
- [ ] P2-009: Add missing E2E coverage

### Week 3-4: P2 Important
- [ ] P2-001: Build approval workflow infrastructure (disabled by default)
- [ ] P2-005: Add database CHECK constraints
- [ ] P2-006: Fix Pick/Pack refetch race condition
- [ ] P2-007: Add max length validation to string fields

### Month 2: Complete Coverage
- [ ] Complete component test coverage (all 9 surfaces)
- [ ] Add integration tests for cross-surface flows
- [ ] Expand E2E coverage to 100%

---

## Success Metrics

| Metric | Current | Target |
|--------|---------|--------|
| P0 Issues | 3 | 0 |
| P1 Issues | 8 | 0 |
| P2 Issues | 9 | 0 |
| Component Test Coverage | 0% | 80% |
| Golden Flow Pass Rate | 67% | 100% |
| Query Error Display | 6/9 | 9/9 |
| Optimistic Updates | 0/32 | 16/32 |

---

## Conclusion

The Work Surfaces implementation is architecturally sound with excellent foundational patterns:
- ✅ RBAC properly enforced
- ✅ Hook tests comprehensive (6 files, 2500+ lines)
- ✅ Keyboard contract well-defined
- ✅ **Database concurrency properly implemented** (row-level locking confirmed)
- ✅ **Feature flag architecture is sufficient** (deployment-level flags adequate)

The critical issues are concentrated in:

1. **Financial flows** (payment recording stub, need void reason field)
2. **Inventory management** (flexible lot selection not implemented)
3. **Order lifecycle** (missing RETURNED status and return processing)
4. **Test coverage** (zero component tests - 9 surfaces untested)

Addressing the P0/P1 issues in the FIX_PATCH_SET.md will resolve the blocking problems. The architectural recommendations will prevent similar issues in future development.

**Estimated Total Effort**: 3-4 weeks for all P0/P1 fixes + test infrastructure.

---

## Third-Party Review + Product Decisions Summary

| Original Finding | Review Result | Product Decision |
|-----------------|---------------|------------------|
| P0-002: Inventory oversell race | **FALSE POSITIVE** - Locking exists | N/A |
| P0-001: Payment stub | **CONFIRMED** - Critical blocker | Fix immediately |
| P0-003: Order status machine | **CONFIRMED** - Missing states | Add RETURNED with restock/vendor paths |
| P0-004: Feature flags not seeded | ~~CONFIRMED~~ | **CLOSED** - Deployment flags sufficient |
| P1-001: Invoice void logic | **CLARIFIED** | Current logic correct; add reason field |
| P0-002 (NEW): Lot selection | N/A | Flexible selection, not strict FIFO/LIFO |
| P2-001: Manager approval | CONFIRMED | Build infrastructure, no rules yet |

**Issues Closed by Product Decision**: 2 (P0-004, P1-004)
**Final Issue Count**: 24 (3 P0, 8 P1, 9 P2, 4 P3)
