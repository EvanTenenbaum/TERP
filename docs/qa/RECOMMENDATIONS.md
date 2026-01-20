# QA Recommendations - Work Surfaces

**Generated**: 2026-01-20
**Testing Suite**: Work Surfaces Exhaustive Testing

---

## Executive Summary

The Work Surfaces testing suite identified **24 issues** across 9 components:
- 5 P0 Blockers
- 8 P1 Critical
- 7 P2 Important
- 4 P3 Minor

The codebase has excellent foundations (RBAC, static analysis, hook tests) but critical gaps in financial flows, concurrency handling, and component testing.

---

## Immediate Actions Required

### 1. Fix Payment Recording Stub (P0-001)
**Priority**: IMMEDIATE
**Impact**: Accounting flow completely broken

The InvoicesWorkSurface payment handler is a stub that shows success without recording payments. This breaks the entire Invoice → Payment → Reconciliation flow.

**Action**: Wire `handlePaymentSubmit` to `trpc.payments.recordPayment` mutation.

---

### 2. Add Inventory Concurrency Protection (P0-002)
**Priority**: IMMEDIATE
**Impact**: Potential oversells in high-traffic scenarios

Race condition between availability check and order confirmation allows multiple orders to confirm for same inventory.

**Action**: Add `FOR UPDATE` row locks in `confirmOrder` transaction.

---

### 3. Implement FIFO/LIFO Cost Tracking (P0-003)
**Priority**: HIGH
**Impact**: COGS calculations incorrect, compliance risk

Current implementation stores single `unitCogs` per batch without cost layer tracking. FIFO/LIFO costing is a stated business requirement but not implemented.

**Action**: Design and implement cost layers table and allocation logic.

---

## Architectural Recommendations

### A. Concurrency Handling Pattern

**Problem**: Multiple surfaces lack protection against rapid operations and concurrent edits.

**Recommendation**: Implement standardized concurrency control:

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

## Roadmap

### Week 1: P0 Blockers
- [ ] P0-001: Wire payment recording mutation
- [ ] P0-002: Add inventory concurrency locks
- [ ] P1-001: Fix invoice void logic
- [ ] P1-002: Add debounce to mutations

### Week 2: P1 Critical
- [ ] P0-004: Add missing order states (requires migration)
- [ ] P0-005: Seed individual feature flags
- [ ] P1-003: Make optimistic locking mandatory
- [ ] P1-006: Add error displays

### Week 3: Infrastructure
- [ ] P1-007: Migrate deprecated endpoint
- [ ] P1-008: Add feature flag permission
- [ ] Create component test infrastructure
- [ ] Write tests for 3 highest-risk surfaces

### Week 4: P2 Important
- [ ] P2-001: Manager approval workflow design
- [ ] P2-005: Add database constraints
- [ ] P2-006: Fix Pick/Pack refetch pattern
- [ ] P2-007: Add max length validation

### Month 2: Complete Coverage
- [ ] P0-003: FIFO/LIFO implementation
- [ ] Complete component test coverage
- [ ] Add integration tests
- [ ] Expand E2E coverage

---

## Success Metrics

| Metric | Current | Target |
|--------|---------|--------|
| P0 Issues | 5 | 0 |
| P1 Issues | 8 | 0 |
| Component Test Coverage | 0% | 80% |
| Golden Flow Pass Rate | 67% | 100% |
| Query Error Display | 6/9 | 9/9 |
| Optimistic Updates | 0/32 | 16/32 |

---

## Conclusion

The Work Surfaces implementation is architecturally sound with excellent foundational patterns (RBAC, hooks, keyboard contract). The critical issues are concentrated in:

1. **Financial flows** (payment recording, invoice logic)
2. **Concurrency** (inventory race conditions, rapid clicks)
3. **Test coverage** (zero component tests)

Addressing the P0/P1 issues in the FIX_PATCH_SET.md will resolve the blocking problems. The architectural recommendations will prevent similar issues in future development.

**Estimated Total Effort**: 3-4 weeks for all P0/P1 fixes + test infrastructure.
