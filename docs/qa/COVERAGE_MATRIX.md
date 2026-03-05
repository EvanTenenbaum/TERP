# Test Coverage Matrix - Work Surfaces (REVISED)

**Generated**: 2026-01-20
**Revised**: 2026-01-20 (Third-Party Expert Review + Product Decisions)
**Testing Suite**: Work Surfaces Exhaustive Testing

---

## Revision Notes

> **IMPORTANT**: This matrix has been revised following a third-party expert review and product decisions.
>
> **Key Corrections**:
>
> - ~~P0-002 (Inventory oversell race condition)~~ - FALSE POSITIVE removed
> - ~~P0-004 (Individual feature flags)~~ - CLOSED (deployment flags sufficient per product)
> - InventoryWorkSurface risk upgraded (locking IS implemented)
> - P0-002 (NEW): Flexible lot selection needed (not strict FIFO/LIFO)
> - P0-003: RETURNED status with restock/supplier-return paths
> - P1-001: Current void logic correct; add void reason field

---

## Work Surface Coverage Overview

| Work Surface              | Static | RBAC | Logic | tRPC | Flags | Flows | Adversarial | Unit Tests |
| ------------------------- | ------ | ---- | ----- | ---- | ----- | ----- | ----------- | ---------- |
| OrdersWorkSurface         | ✅     | ✅   | ⚠️    | ✅   | ✅    | ✅    | ⚠️          | ❌         |
| InvoicesWorkSurface       | ⚠️     | ✅   | ⚠️    | ⚠️   | ✅    | ❌    | ✅          | ❌         |
| InventoryWorkSurface      | ⚠️     | ✅   | ❌    | ⚠️   | ✅    | ✅    | ⚠️          | ❌         |
| ClientsWorkSurface        | ⚠️     | ✅   | ✅    | ✅   | ✅    | ✅    | ✅          | ❌         |
| PurchaseOrdersWorkSurface | ✅     | ✅   | ✅    | ✅   | ✅    | ✅    | ✅          | ❌         |
| PickPackWorkSurface       | ✅     | ✅   | ✅    | ⚠️   | ✅    | ✅    | ✅          | ❌         |
| ClientLedgerWorkSurface   | ✅     | ✅   | ✅    | ✅   | ✅    | ⚠️    | ✅          | ❌         |
| QuotesWorkSurface         | ✅     | ✅   | ✅    | ✅   | ✅    | ✅    | ✅          | ❌         |
| DirectIntakeWorkSurface   | ⚠️     | ✅   | ✅    | ⚠️   | ✅    | ✅    | ✅          | ❌         |

**Legend**: ✅ Pass | ⚠️ Issues Found | ❌ Fail/Missing

---

## Category Details

### Static Analysis

| Work Surface              | TODO/FIXME | @ts-ignore | console.log | any types | Code Duplication |
| ------------------------- | ---------- | ---------- | ----------- | --------- | ---------------- |
| OrdersWorkSurface         | ✅ None    | ✅ None    | ✅ None     | ✅ None   | ✅ OK            |
| InvoicesWorkSurface       | ✅ None    | ✅ None    | ✅ None     | ⚠️ 3      | ✅ OK            |
| InventoryWorkSurface      | ✅ None    | ✅ None    | ✅ None     | ⚠️ 1      | ✅ OK            |
| ClientsWorkSurface        | ✅ None    | ✅ None    | ✅ None     | ⚠️ 2      | ✅ OK            |
| PurchaseOrdersWorkSurface | ✅ None    | ✅ None    | ✅ None     | ✅ None   | ✅ OK            |
| PickPackWorkSurface       | ✅ None    | ✅ None    | ✅ None     | ✅ None   | ✅ OK            |
| ClientLedgerWorkSurface   | ✅ None    | ✅ None    | ✅ None     | ✅ None   | ✅ OK            |
| QuotesWorkSurface         | ✅ None    | ✅ None    | ✅ None     | ✅ None   | ✅ OK            |
| DirectIntakeWorkSurface   | ✅ None    | ✅ None    | ✅ None     | ⚠️ 2      | ✅ OK            |

**Total Issues**: 8 (all P3 - minor type safety)

---

### RBAC Validation

| Work Surface              | Permission Check      | Route Guard | UI Element Control | Backend Enforcement |
| ------------------------- | --------------------- | ----------- | ------------------ | ------------------- |
| OrdersWorkSurface         | ✅ orders:\*          | ✅          | ✅                 | ✅                  |
| InvoicesWorkSurface       | ✅ accounting:\*      | ✅          | ✅                 | ✅                  |
| InventoryWorkSurface      | ✅ inventory:\*       | ✅          | ✅                 | ✅                  |
| ClientsWorkSurface        | ✅ clients:\*         | ✅          | ✅                 | ✅                  |
| PurchaseOrdersWorkSurface | ✅ purchase_orders:\* | ✅          | ✅                 | ✅                  |
| PickPackWorkSurface       | ✅ pick_pack:\*       | ✅          | ✅                 | ✅                  |
| ClientLedgerWorkSurface   | ✅ ledger:\*          | ✅          | ✅                 | ✅                  |
| QuotesWorkSurface         | ✅ quotes:\*          | ✅          | ✅                 | ✅                  |
| DirectIntakeWorkSurface   | ✅ inventory:create   | ✅          | ✅                 | ✅                  |

**Issues Found**: 3 (P1-P2 gaps in related components)

---

### Business Logic

| Work Surface              | Calculations | Status Transitions  | Validation          | Constraints      |
| ------------------------- | ------------ | ------------------- | ------------------- | ---------------- |
| OrdersWorkSurface         | ✅ Correct   | ❌ Missing RETURNED | ⚠️                  | ⚠️               |
| InvoicesWorkSurface       | ✅ Correct   | ✅ Correct          | ⚠️ Need void reason | ✅               |
| InventoryWorkSurface      | ✅ Correct   | ✅ Correct          | ⚠️ Negative avail   | ❌ Lot selection |
| ClientsWorkSurface        | ✅ Correct   | ✅ Correct          | ✅                  | ✅               |
| PurchaseOrdersWorkSurface | ✅ Correct   | ✅ Correct          | ✅                  | ✅               |
| PickPackWorkSurface       | ✅ Correct   | ✅ Correct          | ✅                  | ✅               |
| ClientLedgerWorkSurface   | ✅ Correct   | ✅ Correct          | ✅                  | ✅               |
| QuotesWorkSurface         | ✅ Correct   | ✅ Correct          | ✅                  | ✅               |
| DirectIntakeWorkSurface   | ✅ Correct   | ✅ Correct          | ✅                  | ✅               |

**Critical Issues**: 2 (P0-002: Flexible lot selection needed, P0-003: Order status needs RETURNED with restock/supplier-return paths)

---

### tRPC Integration

| Work Surface              | Procedures Mapped | Error Handling      | Loading States | Cache Invalidation | Optimistic Updates |
| ------------------------- | ----------------- | ------------------- | -------------- | ------------------ | ------------------ |
| OrdersWorkSurface         | 4                 | ✅                  | ✅             | ✅ refetch         | ❌                 |
| InvoicesWorkSurface       | 4                 | ⚠️ No error display | ✅             | ✅ invalidate      | ❌                 |
| InventoryWorkSurface      | 2                 | ⚠️ No error display | ✅             | ✅ refetch         | ❌                 |
| ClientsWorkSurface        | 4                 | ✅                  | ✅             | ✅ dual invalidate | ❌                 |
| PurchaseOrdersWorkSurface | 7                 | ✅                  | ✅             | ✅ refetch         | ❌                 |
| PickPackWorkSurface       | 5                 | ✅                  | ✅             | ⚠️ Race condition  | ❌                 |
| ClientLedgerWorkSurface   | 5                 | ✅                  | ✅             | ✅ invalidate      | ❌                 |
| QuotesWorkSurface         | 3                 | ✅                  | ✅             | ✅ refetch         | ❌                 |
| DirectIntakeWorkSurface   | 4                 | ⚠️ Basic            | ✅             | ✅ refetch         | ❌                 |

**Total Procedures**: 32
**Optimistic Updates**: 0 (none implemented)

---

### Feature Flags

| Work Surface              | Deployment Flag            | Fallback       | Gating |
| ------------------------- | -------------------------- | -------------- | ------ |
| OrdersWorkSurface         | ✅ WORK_SURFACE_ORDERS     | ✅ Legacy page | ✅     |
| InvoicesWorkSurface       | ✅ WORK_SURFACE_ACCOUNTING | ✅ Legacy page | ✅     |
| InventoryWorkSurface      | ✅ WORK_SURFACE_INVENTORY  | ✅ Legacy page | ✅     |
| ClientsWorkSurface        | ✅ WORK_SURFACE_ORDERS     | ✅ Legacy page | ✅     |
| PurchaseOrdersWorkSurface | ✅ WORK_SURFACE_INTAKE     | ✅ Legacy page | ✅     |
| PickPackWorkSurface       | ✅ WORK_SURFACE_INVENTORY  | ✅ Legacy page | ✅     |
| ClientLedgerWorkSurface   | ✅ WORK_SURFACE_ACCOUNTING | ✅ Legacy page | ✅     |
| QuotesWorkSurface         | ✅ WORK_SURFACE_ORDERS     | ✅ Legacy page | ✅     |
| DirectIntakeWorkSurface   | ✅ WORK_SURFACE_INTAKE     | ✅ Legacy page | ✅     |

**Status**: ✅ All deployment flags working. Product decision: individual surface flags not needed.

---

### Golden Flows

| Flow                               | Steps | Implemented | Blocked Steps | Status      |
| ---------------------------------- | ----- | ----------- | ------------- | ----------- |
| Intake → Inventory                 | 10    | 10          | 0             | ✅ Complete |
| Client → Order → Invoice           | 8     | 8           | 0             | ✅ Complete |
| Invoice → Payment → Reconciliation | 7     | 3           | 4             | ❌ Broken   |

**Critical Issue**: Payment recording stub (P0-001)

---

### Adversarial Testing

| Scenario                  | OrdersWS       | InvoicesWS | InventoryWS | ClientsWS | Others |
| ------------------------- | -------------- | ---------- | ----------- | --------- | ------ |
| Concurrent Edit Detection | ⚠️ Optional    | ✅         | ✅          | ✅        | ✅     |
| Rapid State Transitions   | ❌ No debounce | ✅         | ✅          | ✅        | ✅     |
| Privilege Escalation      | ✅ Protected   | ✅         | ✅          | ✅        | ✅     |
| Data Integrity            | ✅ Locked      | ✅         | ⚠️ No FIFO  | ✅        | ✅     |
| Input Validation          | ⚠️ No max len  | ⚠️         | ⚠️          | ⚠️        | ⚠️     |

**Critical Issues**: 1 (rapid transitions - no debounce on OrdersWS confirm button)

> **Note**: Original report claimed "inventory oversell race condition" but code review confirms `ordersDb.ts:290-296` properly implements `.for("update")` row-level locking.

---

### Unit Test Coverage

| Work Surface              | Hook Tests | Component Tests | E2E Tests | Total Coverage |
| ------------------------- | ---------- | --------------- | --------- | -------------- |
| OrdersWorkSurface         | ✅ Shared  | ❌ None         | ✅        | Partial        |
| InvoicesWorkSurface       | ✅ Shared  | ❌ None         | ✅        | Partial        |
| InventoryWorkSurface      | ✅ Shared  | ❌ None         | ✅        | Partial        |
| ClientsWorkSurface        | ✅ Shared  | ❌ None         | ✅        | Partial        |
| PurchaseOrdersWorkSurface | ✅ Shared  | ❌ None         | ❌        | Low            |
| PickPackWorkSurface       | ✅ Shared  | ❌ None         | ✅        | Partial        |
| ClientLedgerWorkSurface   | ✅ Shared  | ❌ None         | ❌        | Low            |
| QuotesWorkSurface         | ✅ Shared  | ❌ None         | ✅        | Partial        |
| DirectIntakeWorkSurface   | ✅ Shared  | ❌ None         | ❌        | Low            |

**Hook Tests**: 6 files (excellent quality)
**Component Tests**: 0 of 9 (critical gap)

---

## Overall Coverage Summary

| Category         | Pass | Warning | Fail | Coverage %            |
| ---------------- | ---- | ------- | ---- | --------------------- |
| Static Analysis  | 9    | 0       | 0    | 100% (clean)          |
| RBAC Validation  | 9    | 0       | 0    | 100%                  |
| Business Logic   | 6    | 1       | 2    | 67%                   |
| tRPC Integration | 5    | 4       | 0    | 79%                   |
| Feature Flags    | 0    | 9       | 0    | 50% (deployment only) |
| Golden Flows     | 2    | 0       | 1    | 67%                   |
| Adversarial      | 5    | 4       | 0    | 78%                   |
| Unit Tests       | 0    | 6       | 3    | 0% (components)       |

---

## Risk Assessment

| Work Surface              | Overall Risk | Key Issues                                                             |
| ------------------------- | ------------ | ---------------------------------------------------------------------- |
| OrdersWorkSurface         | 🔴 HIGH      | Missing RETURNED status, no debounce on confirm                        |
| InvoicesWorkSurface       | 🔴 HIGH      | Payment stub (P0-001), need void reason field, error display missing   |
| InventoryWorkSurface      | 🟡 MEDIUM    | Flexible lot selection needed (concurrency IS protected via row locks) |
| ClientsWorkSurface        | 🟢 LOW       | Type safety only                                                       |
| PurchaseOrdersWorkSurface | 🟢 LOW       | Missing E2E tests only                                                 |
| PickPackWorkSurface       | 🟡 MEDIUM    | Refetch race condition                                                 |
| ClientLedgerWorkSurface   | 🟡 MEDIUM    | Depends on payment flow being fixed                                    |
| QuotesWorkSurface         | 🟢 LOW       | No significant issues                                                  |
| DirectIntakeWorkSurface   | 🟡 MEDIUM    | Deprecated endpoint (suppliers.getAll), type safety                    |

> **Revision Note**: InventoryWorkSurface risk stayed MEDIUM - row-level locking confirmed, but lot selection still needed.

---

## Next Steps

1. **Fix P0 Blockers** (3 issues) - Before production
2. **Fix P1 Critical** (8 issues) - Includes test coverage issue P1-008
3. **Add Component Tests** (9 files) - Critical gap identified
4. **Fix P2 Important** (9 issues) - Includes new E2E/flow coverage issues

> **Updated Counts**: After product decisions: 3 P0, 8 P1, 9 P2, 4 P3 = **24 total**
