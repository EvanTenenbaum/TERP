# QA Issue Ledger - Work Surfaces (REVISED)

**Generated**: 2026-01-20
**Revised**: 2026-01-20 (Third-Party Expert Review + Product Decisions)
**Testing Suite**: Work Surfaces Exhaustive Testing
**Total Issues Found**: 24 (3 P0, 8 P1, 9 P2, 4 P3)

---

## Revision Notes

> **IMPORTANT**: This ledger has been revised following a third-party expert review and product decision clarifications.
>
> **Key Corrections**:
> - ~~P0-002 (Inventory oversell race condition)~~ **REMOVED** - Code analysis confirms `ordersDb.ts:290-296` properly uses `.for("update")` row-level locking
> - ~~P0-004 (Individual feature flags not seeded)~~ **CLOSED** - Product decision: Deployment-level flags are sufficient
> - **P1-001 CLARIFIED** - Current void logic is correct; need to add void reason field
> - **P0-002 (FIFO/LIFO) CLARIFIED** - Need flexible lot selection, not strict FIFO/LIFO
> - **P0-003 CLARIFIED** - Need RETURNED status with restocking/vendor-return paths
> - **P2-001 CLARIFIED** - Build approval infrastructure for future use, no immediate rules

---

## Product Decisions Log

| Issue | Question | Decision | Date |
|-------|----------|----------|------|
| P1-001 | Can paid invoices be voided? | **YES** - Current implementation correct. Add void reason field. | 2026-01-20 |
| P0-002 | FIFO or LIFO costing? | **Neither** - Users select specific lots per customer need. Implement flexible lot selection. | 2026-01-20 |
| P0-003 | What order states are missing? | Add **RETURNED** status with paths to: (a) back to inventory, (b) returned to vendor | 2026-01-20 |
| P2-001 | What requires manager approval? | **None for now** - Build infrastructure with configurable rules for future use | 2026-01-20 |
| P0-004 | Individual or deployment flags? | **Deployment-level sufficient** - No individual flags needed | 2026-01-20 |

---

## Summary by Severity

| Severity | Count | Description |
|----------|-------|-------------|
| P0 (Blocker) | 3 | Blocks production deployment |
| P1 (Critical) | 8 | Significant impact on functionality |
| P2 (Important) | 9 | Should be fixed but not blocking |
| P3 (Minor) | 4 | Low impact, fix when convenient |

---

## P0 - Blockers

| ID | Component | File:Line | Description | Category | Suggested Fix |
|----|-----------|-----------|-------------|----------|---------------|
| P0-001 | InvoicesWorkSurface | InvoicesWorkSurface.tsx:717-724 | **Payment recording is a stub** - handlePaymentSubmit shows success without calling mutation. Comment says "In a real implementation..." | Golden Flows | Wire to trpc.payments.recordPayment mutation (PaymentInspector.tsx shows correct pattern) |
| P0-002 | Inventory | inventoryUtils.ts | **Flexible lot selection not implemented** - only single unitCogs stored per batch. Users need to select specific lots per customer requirements (not strict FIFO/LIFO). | Business Logic | Implement lot selection UI and allocation logic allowing user to choose specific batches |
| P0-003 | Orders | ordersDb.ts:1564-1570, schema.ts | **Order status machine incomplete** - code only accepts PENDING/PACKED/SHIPPED, missing **RETURNED** state with paths to (a) restocking or (b) vendor return | Business Logic | Add RETURNED enum value, create returned_to_inventory and returned_to_vendor transitions |

---

## P1 - Critical

| ID | Component | File:Line | Description | Category | Suggested Fix |
|----|-----------|-----------|-------------|----------|---------------|
| P1-001 | Invoices | invoices.ts:392-397 | **Missing void reason field** - Paid invoices CAN be voided (confirmed correct), but no field to capture reason for voiding | Business Logic | Add `voidReason: z.string().min(1).max(500)` to void mutation input and store in invoice record |
| P1-002 | Orders | OrdersWorkSurface.tsx | **No debounce on rapid state transitions** - confirm mutation lacks isPending guard on button | Adversarial | Add useDebouncedCallback and disabled={isPending} |
| P1-003 | Orders | orders.ts:227 | **Optimistic locking optional** - version check only runs if version provided (backward compat exception) | Adversarial | Make version check mandatory |
| P1-004 | Feature Flags | App.tsx vs useWorkSurfaceFeatureFlags.ts | **Mixed flag evaluation patterns** - inconsistent usage creates confusion | Feature Flags | Standardize on single pattern (deployment-level only) |
| P1-005 | tRPC | InvoicesWorkSurface, InventoryWorkSurface | **Query error states not displayed** - error variable exists but not rendered | tRPC Integration | Add error state UI with retry button |
| P1-006 | DirectIntake | DirectIntakeWorkSurface.tsx:507 | **Uses deprecated vendors.getAll** - will break when vendor router removed | tRPC Integration | Migrate to clients.list with isSeller filter |
| P1-007 | Feature Flags | featureFlags.ts:56 | **getEffectiveFlags missing permission check** - any authenticated user can query flag states | RBAC | Add requirePermission middleware |
| P1-008 | Testing | All WorkSurface components | **Zero component unit tests** - 9 complex components have no unit tests (only hook tests exist) | Test Coverage | Create test files for all 9 components |

---

## P2 - Important

| ID | Component | File:Line | Description | Category | Suggested Fix |
|----|-----------|-----------|-------------|----------|---------------|
| P2-001 | Orders | ordersDb.ts:678-682 | **No approval workflow infrastructure** - need configurable approval rules for future use (none active now). Actions to support: large orders, discounts, credit overrides, invoice voids | Business Logic | Build approval framework with configurable rules (disabled by default) |
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
| ~~P0-004~~ | "Individual surface flags not seeded" | **CLOSED - BY DESIGN**: Product decision (2026-01-20) confirms deployment-level flags are sufficient. Individual flags not needed. |
| ~~P1-004~~ | "Missing flag dependency structure" | **CLOSED - BY DESIGN**: Merged with P0-004 closure. Deployment-level flags don't require dependency cascading. |

---

## Issues by Category

### Business Logic (5 issues)
- P0-002: Flexible lot selection not implemented
- P0-003: Order status machine incomplete (need RETURNED status)
- P1-001: Missing void reason field
- P2-001: No approval workflow infrastructure
- P2-002: Available inventory can go negative

### Security/Adversarial (4 issues)
- P1-002: No debounce on state transitions
- P1-003: Optimistic locking optional
- P2-005: No negative balance constraint
- P2-007: No max length on strings

### Feature Flags (2 issues)
- P1-004: Mixed evaluation patterns
- P1-007: Missing permission check

### tRPC Integration (3 issues)
- P1-005: Query errors not displayed
- P1-006: Deprecated endpoint usage
- P2-006: Race condition in refetch

### RBAC (2 issues)
- P2-003: Alerts admin-only
- P2-004: Permission seed gaps

### Test Coverage (3 issues)
- P1-008: Zero component unit tests
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
2. **P0-002**: Implement flexible lot selection UI and allocation
3. **P0-003**: Add RETURNED status with restock/vendor-return paths

### Week 1 (P1 - Critical)
1. P1-001: Add void reason field to invoice void mutation
2. P1-002: Add debounce to mutations
3. P1-003: Make version check mandatory
4. P1-004: Standardize flag evaluation patterns
5. P1-005: Add query error displays
6. P1-006: Migrate deprecated endpoint
7. P1-007: Add permission check to getEffectiveFlags
8. P1-008: Begin component test creation

### Week 2 (P2 - Important)
1. P2-001: Build approval workflow infrastructure (disabled by default)
2. P2-005: Add DB constraints
3. P2-006: Fix refetch pattern
4. P2-007: Add string max lengths
5. P2-008: Add missing flow tests
6. P2-009: Add missing E2E tests

### Backlog (P3 - Minor)
- P3-001 through P3-004: Fix any types when touching files

---

## Quality Metrics

| Metric | Original Report | After Review | After Product Decisions |
|--------|-----------------|--------------|-------------------------|
| P0 Issues | 5 | 4 | **3** (P0-004 closed) |
| P1 Issues | 8 | 9 | **8** (P1-004 merged/closed) |
| P2 Issues | 7 | 9 | **9** |
| P3 Issues | 4 | 4 | **4** |
| **Total** | **24** | **26** | **24** |

---

## Tracking

| Status | Count |
|--------|-------|
| Open | 24 |
| Closed (By Design) | 2 |
| False Positive | 1 |
| In Progress | 0 |
| Fixed | 0 |
| Verified | 0 |

**Last Updated**: 2026-01-20 (Revised with product decisions)
