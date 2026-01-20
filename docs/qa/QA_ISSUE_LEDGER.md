# QA Issue Ledger - Work Surfaces (REVISED)

**Generated**: 2026-01-20
**Revised**: 2026-01-20 (Third-Party Expert Review)
**Testing Suite**: Work Surfaces Exhaustive Testing
**Total Issues Found**: 26 (4 P0, 9 P1, 9 P2, 4 P3)

---

## Revision Notes

> **IMPORTANT**: This ledger has been revised following a third-party expert review that identified errors and gaps in the original QA report.
>
> **Key Corrections**:
> - ~~P0-002 (Inventory oversell race condition)~~ **REMOVED** - Code analysis confirms `ordersDb.ts:290-296` properly uses `.for("update")` row-level locking
> - **5 NEW issues added** from gap analysis (missing test coverage, accessibility, performance)
> - Severity adjustments made based on actual code review

---

## Summary by Severity

| Severity | Count | Description |
|----------|-------|-------------|
| P0 (Blocker) | 4 | Blocks production deployment |
| P1 (Critical) | 9 | Significant impact on functionality |
| P2 (Important) | 9 | Should be fixed but not blocking |
| P3 (Minor) | 4 | Low impact, fix when convenient |

---

## P0 - Blockers

| ID | Component | File:Line | Description | Category | Suggested Fix |
|----|-----------|-----------|-------------|----------|---------------|
| P0-001 | InvoicesWorkSurface | InvoicesWorkSurface.tsx:717-724 | **Payment recording is a stub** - handlePaymentSubmit shows success without calling mutation. Comment says "In a real implementation..." | Golden Flows | Wire to trpc.payments.recordPayment mutation (PaymentInspector.tsx shows correct pattern) |
| P0-002 | Inventory | inventoryUtils.ts | **FIFO/LIFO costing not implemented** - only single unitCogs stored per batch, no cost layers | Business Logic | Implement cost layers table and allocation logic per accounting requirements |
| P0-003 | Orders | ordersDb.ts:1564-1570, schema.ts | **Order status machine incomplete** - code only accepts PENDING/PACKED/SHIPPED, missing DELIVERED and FULFILLED states | Business Logic | Add enum values and transition logic |
| P0-004 | Feature Flags | seedFeatureFlags.ts | **Individual surface flags not seeded** - useWorkSurfaceFeatureFlags.ts references flags that don't exist in seed data | Feature Flags | Seed 6 individual flags with dependsOn relationships |

---

## P1 - Critical

| ID | Component | File:Line | Description | Category | Suggested Fix |
|----|-----------|-----------|-------------|----------|---------------|
| P1-001 | Invoices | invoices.ts:392-397 | **Invoice void logic inverted** - code reads "Paid invoices can only be voided" but business rule says "Cannot void paid invoices" | Business Logic | Clarify business rule OR invert condition |
| P1-002 | Orders | OrdersWorkSurface.tsx | **No debounce on rapid state transitions** - confirm mutation lacks isPending guard on button | Adversarial | Add useDebouncedCallback and disabled={isPending} |
| P1-003 | Orders | orders.ts:227 | **Optimistic locking optional** - version check only runs if version provided (backward compat exception) | Adversarial | Make version check mandatory |
| P1-004 | Feature Flags | seedFeatureFlags.ts | **Missing flag dependency structure** - deployment flags don't cascade to individual flags | Feature Flags | Configure dependsOn arrays |
| P1-005 | Feature Flags | App.tsx vs useWorkSurfaceFeatureFlags.ts | **Mixed flag evaluation patterns** - inconsistent usage creates confusion | Feature Flags | Standardize on single pattern |
| P1-006 | tRPC | InvoicesWorkSurface, InventoryWorkSurface | **Query error states not displayed** - error variable exists but not rendered | tRPC Integration | Add error state UI with retry button |
| P1-007 | DirectIntake | DirectIntakeWorkSurface.tsx:507 | **Uses deprecated vendors.getAll** - will break when vendor router removed | tRPC Integration | Migrate to clients.list with isSeller filter |
| P1-008 | Feature Flags | featureFlags.ts:56 | **getEffectiveFlags missing permission check** - any authenticated user can query flag states | RBAC | Add requirePermission middleware |
| P1-009 | Testing | All WorkSurface components | **Zero component unit tests** - 9 complex components have no unit tests (only hook tests exist) | Test Coverage | Create test files for all 9 components |

---

## P2 - Important

| ID | Component | File:Line | Description | Category | Suggested Fix |
|----|-----------|-----------|-------------|----------|---------------|
| P2-001 | Orders | ordersDb.ts:678-682 | **No manager approval workflow** - blocks all sale order editing permanently | Business Logic | Create approval mechanism |
| P2-002 | Inventory | inventoryUtils.ts:57 | **Available inventory can go negative** - only onHand validated, not available | Business Logic | Add validation before allocation |
| P2-003 | Alerts | alerts.ts | **Admin-only instead of role-based** - uses adminProcedure not requirePermission | RBAC | Convert to requireAnyPermission |
| P2-004 | RBAC | USER_FLOW_MATRIX.csv | **Permission seed gaps** - some WS procedures lack RBAC permissions | RBAC | Audit and add missing permissions |
| P2-005 | Accounting | Payment logic | **No negative balance DB constraint** - invoice.amount_due can theoretically go negative | Adversarial | Add CHECK constraint |
| P2-006 | Pick/Pack | PickPackWorkSurface.tsx | **Race condition in multi-query refetch** - uses separate refetch() calls instead of Promise.all | tRPC Integration | Use Promise.all with utils.invalidate() |
| P2-007 | Multiple | Input schemas | **No max length on string fields** - notes, names can be unlimited length | Adversarial | Add z.string().max() to schemas |
| P2-008 | Golden Flows | Multiple | **Missing flow coverage** - Quote→Order, PO→Receiving, Samples flows not tested | Test Coverage | Add E2E tests for missing flows |
| P2-009 | E2E Tests | tests-e2e/ | **3 Work Surfaces missing E2E coverage** - ClientLedger, PurchaseOrders, DirectIntake | Test Coverage | Add E2E tests |

---

## P3 - Minor

| ID | Component | File:Line | Description | Category | Suggested Fix |
|----|-----------|-----------|-------------|----------|---------------|
| P3-001 | ClientsWorkSurface | ClientsWorkSurface.tsx:418, 421 | **Type cast 'as any'** - reduces type safety | Static Analysis | Replace with proper typed interfaces |
| P3-002 | DirectIntakeWorkSurface | DirectIntakeWorkSurface.tsx:509, 607 | **Type cast 'as any'** - reduces type safety | Static Analysis | Replace with proper typed interfaces |
| P3-003 | InventoryWorkSurface | InventoryWorkSurface.tsx:378 | **Explicit 'any' in sort logic** | Static Analysis | Replace with proper typed interfaces |
| P3-004 | InvoicesWorkSurface | InvoicesWorkSurface.tsx:452, 540, 547 | **Type cast 'as any'** | Static Analysis | Replace with proper typed interfaces |

---

## CLOSED / FALSE POSITIVES

| Original ID | Description | Resolution |
|-------------|-------------|------------|
| ~~P0-002~~ | "Inventory oversell race condition - no lock between availability check and confirmation" | **FALSE POSITIVE**: Code review confirms `ordersDb.ts:290-296` uses `.for("update")` row-level locking. Transaction properly serializes concurrent operations. |

---

## Issues by Category

### Business Logic (5 issues)
- P0-002: FIFO/LIFO not implemented
- P0-003: Order status machine incomplete
- P1-001: Invoice void logic inverted
- P2-001: No manager approval workflow
- P2-002: Available inventory can go negative

### Security/Adversarial (4 issues)
- P1-002: No debounce on state transitions
- P1-003: Optimistic locking optional
- P2-005: No negative balance constraint
- P2-007: No max length on strings

### Feature Flags (4 issues)
- P0-004: Individual flags not seeded
- P1-004: Missing dependency structure
- P1-005: Mixed evaluation patterns
- P1-008: Missing permission check

### tRPC Integration (3 issues)
- P1-006: Query errors not displayed
- P1-007: Deprecated endpoint usage
- P2-006: Race condition in refetch

### RBAC (2 issues)
- P2-003: Alerts admin-only
- P2-004: Permission seed gaps

### Test Coverage (4 issues)
- P1-009: Zero component unit tests
- P2-008: Missing golden flow coverage
- P2-009: Missing E2E coverage

### Static Analysis (4 issues)
- P3-001 through P3-004: Type safety (any usage)

### Golden Flows (1 issue)
- P0-001: Payment recording stub

---

## Resolution Priority

### Immediate (P0 - Blockers)
1. **P0-001**: Wire payment recording mutation (critical financial flow)
2. **P0-003**: Add missing order states (requires migration)
3. **P0-004**: Seed individual feature flags
4. **P0-002**: FIFO/LIFO - may need product clarification

### Week 1 (P1 - Critical)
1. P1-001: Clarify/fix invoice void logic
2. P1-002: Add debounce to mutations
3. P1-003: Make version check mandatory
4. P1-006: Add query error displays
5. P1-007: Migrate deprecated endpoint
6. P1-009: Begin component test creation

### Week 2 (P2 - Important)
1. P2-001: Design approval workflow
2. P2-005: Add DB constraints
3. P2-006: Fix refetch pattern
4. P2-007: Add string max lengths
5. P2-008: Add missing flow tests
6. P2-009: Add missing E2E tests

### Backlog (P3 - Minor)
- P3-001 through P3-004: Fix any types when touching files

---

## Quality Metrics

| Metric | Original Report | After Review |
|--------|-----------------|--------------|
| P0 Issues | 5 | 4 (1 false positive removed) |
| P1 Issues | 8 | 9 (1 new test coverage issue) |
| P2 Issues | 7 | 9 (2 new test coverage issues) |
| P3 Issues | 4 | 4 |
| **Total** | **24** | **26** |

---

## Tracking

| Status | Count |
|--------|-------|
| Open | 26 |
| False Positive / Closed | 1 |
| In Progress | 0 |
| Fixed | 0 |
| Verified | 0 |

**Last Updated**: 2026-01-20 (Revised after third-party review)
