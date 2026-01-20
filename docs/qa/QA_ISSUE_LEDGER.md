# QA Issue Ledger - Work Surfaces

**Generated**: 2026-01-20
**Testing Suite**: Work Surfaces Exhaustive Testing
**Total Issues Found**: 24

---

## Summary by Severity

| Severity | Count | Description |
|----------|-------|-------------|
| P0 (Blocker) | 5 | Blocks production deployment |
| P1 (Critical) | 8 | Significant impact on functionality |
| P2 (Important) | 7 | Should be fixed but not blocking |
| P3 (Minor) | 4 | Low impact, fix when convenient |

---

## P0 - Blockers

| ID | Component | File:Line | Description | Category | Suggested Fix |
|----|-----------|-----------|-------------|----------|---------------|
| P0-001 | InvoicesWorkSurface | InvoicesWorkSurface.tsx:717-724 | **Payment recording is a stub** - handlePaymentSubmit shows success without calling mutation | Golden Flows | Wire to trpc.payments.recordPayment mutation |
| P0-002 | Orders | orders.ts:1198-1220 | **Inventory oversell race condition** - no lock between availability check and confirmation | Adversarial | Add FOR UPDATE lock on batch rows |
| P0-003 | Inventory | inventoryUtils.ts | **FIFO/LIFO costing not implemented** - only single unitCogs stored per batch | Business Logic | Implement cost layers table and allocation logic |
| P0-004 | Orders | ordersDb.ts, schema.ts | **Order status machine incomplete** - missing DELIVERED and FULFILLED states | Business Logic | Add missing enum values and transition logic |
| P0-005 | Feature Flags | seedFeatureFlags.ts | **Individual surface flags not seeded** - granular control non-functional | Feature Flags | Seed 6 individual flags with dependsOn relationships |

---

## P1 - Critical

| ID | Component | File:Line | Description | Category | Suggested Fix |
|----|-----------|-----------|-------------|----------|---------------|
| P1-001 | Invoices | invoices.ts:392-397 | **Invoice void logic inverted** - allows voiding paid invoices instead of preventing | Business Logic | Invert condition: `if (status === "PAID" && input.status === "VOID") throw error` |
| P1-002 | Orders | OrdersWorkSurface.tsx:613 | **No debounce on rapid state transitions** - allows double-confirm | Adversarial | Add useDebouncedCallback and isPending guard |
| P1-003 | Orders | orders.ts:227 | **Optimistic locking optional** - version check only runs if version provided | Adversarial | Make version check mandatory, remove backward compat |
| P1-004 | Feature Flags | seedFeatureFlags.ts | **Missing flag dependency structure** - deployment flags don't cascade | Feature Flags | Configure dependsOn arrays for individual flags |
| P1-005 | Feature Flags | App.tsx, useWorkSurfaceFeatureFlags.ts | **Mixed flag evaluation patterns** - creates confusion | Feature Flags | Standardize on single pattern |
| P1-006 | tRPC | InvoicesWorkSurface, InventoryWorkSurface | **Query error states not displayed** - users unaware of data load failures | tRPC Integration | Add error state UI components |
| P1-007 | DirectIntake | DirectIntakeWorkSurface.tsx | **Uses deprecated vendors.getAll** - will break when removed | tRPC Integration | Migrate to clients.list with isSeller filter |
| P1-008 | Feature Flags | featureFlags.ts:56 | **getEffectiveFlags missing permission check** - any auth user can query | RBAC | Add requirePermission("system:read") |

---

## P2 - Important

| ID | Component | File:Line | Description | Category | Suggested Fix |
|----|-----------|-----------|-------------|----------|---------------|
| P2-001 | Orders | ordersDb.ts:678-682 | **No manager approval workflow** - blocks all sale order editing permanently | Business Logic | Create approval mechanism instead of permanent block |
| P2-002 | Inventory | inventoryUtils.ts:57 | **Available inventory can go negative** - only onHand validated | Business Logic | Add validation before allocation |
| P2-003 | Alerts | alerts.ts | **Admin-only instead of role-based** - restricts access unnecessarily | RBAC | Convert to requireAnyPermission |
| P2-004 | RBAC | USER_FLOW_MATRIX.csv | **Permission seed gaps** - some WS procedures lack RBAC permissions | RBAC | Audit and add missing permissions |
| P2-005 | Accounting | Payment logic | **No negative balance DB constraint** - could be bypassed | Adversarial | Add CHECK constraint on invoice.amount_due |
| P2-006 | Pick/Pack | PickPackWorkSurface.tsx | **Race condition in multi-query refetch** - inconsistent state on error | tRPC Integration | Use Promise.all with utils.invalidate() |
| P2-007 | Multiple | Input schemas | **No max length on string fields** - allows oversized payloads | Adversarial | Add z.string().max(5000) to schemas |

---

## P3 - Minor

| ID | Component | File:Line | Description | Category | Suggested Fix |
|----|-----------|-----------|-------------|----------|---------------|
| P3-001 | ClientsWorkSurface | ClientsWorkSurface.tsx:418, 421 | **Type cast 'as any'** - reduces type safety | Static Analysis | Replace with proper typed interfaces |
| P3-002 | DirectIntakeWorkSurface | DirectIntakeWorkSurface.tsx:509, 607 | **Type cast 'as any'** - reduces type safety | Static Analysis | Replace with proper typed interfaces |
| P3-003 | InventoryWorkSurface | InventoryWorkSurface.tsx:378 | **Explicit 'any' in sort logic** - reduces type safety | Static Analysis | Replace with proper typed interfaces |
| P3-004 | InvoicesWorkSurface | InvoicesWorkSurface.tsx:452, 540, 547 | **Type cast 'as any'** - reduces type safety | Static Analysis | Replace with proper typed interfaces |

---

## Issues by Category

### Business Logic (6 issues)
- P0-003: FIFO/LIFO not implemented
- P0-004: Order status machine incomplete
- P1-001: Invoice void logic inverted
- P2-001: No manager approval workflow
- P2-002: Available inventory can go negative

### Security/Adversarial (5 issues)
- P0-002: Inventory oversell race condition
- P1-002: No debounce on state transitions
- P1-003: Optimistic locking optional
- P2-005: No negative balance constraint
- P2-007: No max length on strings

### Feature Flags (4 issues)
- P0-005: Individual flags not seeded
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

### Static Analysis (4 issues)
- P3-001 through P3-004: Type safety (any usage)

### Golden Flows (1 issue)
- P0-001: Payment recording stub

---

## Resolution Priority

### Week 1 (P0 - Blockers)
1. P0-001: Wire payment recording mutation
2. P0-002: Add inventory lock on confirm
3. P0-003: Implement cost layers
4. P0-004: Add missing order states
5. P0-005: Seed individual feature flags

### Week 2 (P1 - Critical)
1. P1-001: Fix invoice void logic
2. P1-002: Add debounce to mutations
3. P1-003: Make version check mandatory
4. P1-006: Add query error displays
5. P1-007: Migrate deprecated endpoint

### Week 3 (P2 - Important)
1. P2-001: Create approval workflow
2. P2-002: Add available validation
3. P2-005: Add DB constraints
4. P2-006: Fix refetch pattern
5. P2-007: Add string max lengths

### Backlog (P3 - Minor)
- P3-001 through P3-004: Fix any types

---

## Tracking

| Status | Count |
|--------|-------|
| Open | 24 |
| In Progress | 0 |
| Fixed | 0 |
| Verified | 0 |

**Last Updated**: 2026-01-20
