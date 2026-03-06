# Wave 1: Sales-Sheet Linear Closeout Evidence Packets

**Date**: 2026-03-05
**Source ledger**: `docs/roadmaps/checkpoint-bundles/2026-03-04-queue-clean-nonqa-ledger.md`
**Verification baseline**: TS PASS | Lint PASS | 5860/5860 tests PASS | Build PASS

All four tickets below are complete in code. Evidence packets are ready to attach in Linear.

---

## TER-189 — Action Reliability

**Status**: Done
**Linear**: https://linear.app/terpcorp/issue/TER-189

**Summary**: Line totals now visible in SortableItem (`qty × $price = $lineTotal`). Shared sales sheet page shows a dedicated Line Total column. Clipboard and PDF exports include quantity breakdown. All action buttons already had proper `isPending` and `hasUnsavedChanges` guards.

**Files changed**:

- `client/src/components/sales/SalesSheetPreview.tsx`
- `client/src/pages/SharedSalesSheetPage.tsx`

**Verification**:

```
TypeScript: PASS (0 errors)
Lint:       PASS
Tests:      PASS (5860/5860)
Build:      PASS
```

**Key commit**: `2026-03-04` batch — ledger reference NQ-08

---

## TER-320 — Quantity Model Normalization

**Status**: Done
**Linear**: https://linear.app/terpcorp/issue/TER-320

**Summary**: Fixed total calculation from `SUM(price)` to `SUM(price * quantity)` in both client (`SalesSheetPreview.tsx:274`) and server validation (`salesSheets.ts:121`). Used nullish coalescing (`??`) for zero-quantity safety.

**Files changed**:

- `client/src/components/sales/SalesSheetPreview.tsx`
- `server/routers/salesSheets.ts`

**Verification**:

```
TypeScript: PASS (0 errors)
Lint:       PASS
Tests:      PASS (salesSheets.test.ts updated to match corrected math, all pass)
Build:      PASS
```

**Key commit**: `2026-03-04` batch — ledger reference NQ-04

---

## TER-323 — Conversion Contract Parity

**Status**: Done
**Linear**: https://linear.app/terpcorp/issue/TER-323

**Summary**: `convertToOrder()` now recalculates total from items (`SUM(price * qty)`) instead of trusting the stored `totalValue`. Handles legacy sheets saved before the math fix. Type-safe with explicit interface.

**Files changed**:

- `server/salesSheetsDb.ts`

**Verification**:

```
TypeScript: PASS (0 errors)
Lint:       PASS
Tests:      PASS
Build:      PASS
```

**Key commit**: `2026-03-04` batch — ledger reference NQ-06

---

## TER-345 — Conversion Integrity

**Status**: Done
**Linear**: https://linear.app/terpcorp/issue/TER-345

**Summary**: Both `convertToOrder()` and `convertToLiveSession()` wrapped in `db.transaction()`. If any step fails, the entire conversion rolls back atomically — no partial-conversion side effects.

**Files changed**:

- `server/salesSheetsDb.ts`

**Verification**:

```
TypeScript: PASS (0 errors)
Lint:       PASS
Tests:      PASS
Build:      PASS
```

**Key commit**: `2026-03-04` batch — ledger reference NQ-07

---

## Action Required (Evan)

Open each Linear ticket and:

1. Set **Status** = Done
2. Paste the relevant evidence block above into the ticket description or a comment
3. Close the ticket

No code changes needed. All verification already passed.
