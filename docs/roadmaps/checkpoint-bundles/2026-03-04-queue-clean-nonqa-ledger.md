# Queue-Clean Roadmap A: Non-Test/QA Execution Ledger

**Date**: 2026-03-04
**Integration Branch**: `claude/close-non-test-work-YtBTQ`
**Supervisor**: Claude Opus 4.6
**Mode**: STRICT/RED (per task risk level)

---

## Branch Map

| Task            | Branch                                  | Status   | Merged |
| --------------- | --------------------------------------- | -------- | ------ |
| NQ-00           | claude/close-non-test-work-YtBTQ        | COMPLETE | n/a    |
| NQ-01 (TER-186) | inline (validate-only)                  | COMPLETE | n/a    |
| NQ-02 (TER-187) | inline (validate-only)                  | COMPLETE | n/a    |
| NQ-03 (TER-188) | inline (validate-only)                  | COMPLETE | n/a    |
| NQ-04 (TER-320) | inline                                  | COMPLETE | inline |
| NQ-05 (TER-321) | inline                                  | COMPLETE | inline |
| NQ-06 (TER-323) | inline                                  | COMPLETE | inline |
| NQ-07 (TER-345) | inline                                  | COMPLETE | inline |
| NQ-08 (TER-189) | inline                                  | COMPLETE | inline |
| NQ-09 (PR #449) | fix/dockerfile-prod-deps-disk-headspace | COMPLETE | merged |
| NQ-10           | inline                                  | COMPLETE | n/a    |

## Dependency Graph

```
NQ-00 (scaffold) ✅
  ├── G1 (parallel): NQ-01 ✅, NQ-02 ✅, NQ-03 ✅, NQ-09 ✅
  ├── G2 (serial):   NQ-04 ✅ → NQ-05 ✅ → NQ-06 ✅ → NQ-07 ✅
  ├── G3:            NQ-08 ✅
  └── G4:            NQ-10 ✅
```

## Evidence Log

### NQ-00: Supervisor Scaffold

- **Status**: COMPLETE
- **Evidence**: Ledger file created, branch map established

### NQ-01 (TER-186): Order Adjustment Mode/Type Toggle Fix

- **Status**: COMPLETE (already fixed)
- **Ticket**: https://linear.app/terpcorp/issue/TER-186
- **Evidence**: Code review of `OrderAdjustmentPanel.tsx` — controlled component pattern with `handleUpdate()` passing overrides directly to `onChange()`. No stale state possible. `onValueChange` callback fires immediately on toggle, setting local state AND calling parent.
- **Files Verified**: `client/src/components/orders/OrderAdjustmentPanel.tsx`

### NQ-02 (TER-187): Quote/Sale Action Semantics

- **Status**: COMPLETE (already fixed)
- **Ticket**: https://linear.app/terpcorp/issue/TER-187
- **Evidence**: Code review of `OrderCreatorPage.tsx` — Two-step finalization (draft→finalize) using `isFinalizingRef`. No race conditions: ref set BEFORE mutation fires (BUG-093 fix). Quote and Sale share same save path; credit check is SALE-only.
- **Files Verified**: `client/src/pages/OrderCreatorPage.tsx`

### NQ-03 (TER-188): Direct Intake Defaults

- **Status**: COMPLETE (already fixed)
- **Ticket**: https://linear.app/terpcorp/issue/TER-188
- **Evidence**: Centralized defaults in `intakeDefaults.ts`: paymentTerms="CONSIGNMENT", category="Flower", defaultWarehouseMatch="main". Keyboard flow: Tab→Next, Enter→Submit, Esc→Close. All working correctly.
- **Files Verified**: `client/src/lib/constants/intakeDefaults.ts`, `client/src/components/work-surface/DirectIntakeWorkSurface.tsx`

### NQ-04 (TER-320): Quantity Model Normalization

- **Status**: COMPLETE
- **Ticket**: https://linear.app/terpcorp/issue/TER-320
- **Changes**: Fixed total calculation from `SUM(price)` to `SUM(price * quantity)` in both client (`SalesSheetPreview.tsx:274`) and server validation (`salesSheets.ts:121`). Used nullish coalescing (`??`) for zero-quantity safety.
- **Files Changed**: `client/src/components/sales/SalesSheetPreview.tsx`, `server/routers/salesSheets.ts`

### NQ-05 (TER-321): End-to-End Total Math

- **Status**: COMPLETE
- **Ticket**: https://linear.app/terpcorp/issue/TER-321
- **Changes**: Propagated quantity-aware math to clipboard export, PDF export, line item display, and shared sales sheet page. All surfaces now show `qty × price = lineTotal`.
- **Files Changed**: `client/src/components/sales/SalesSheetPreview.tsx`, `client/src/pages/SharedSalesSheetPage.tsx`

### NQ-06 (TER-323): Conversion Contract Parity

- **Status**: COMPLETE
- **Ticket**: https://linear.app/terpcorp/issue/TER-323
- **Changes**: `convertToOrder()` now recalculates total from items instead of trusting stored `totalValue`. Handles legacy sheets saved before fix. Type-safe with explicit interface.
- **Files Changed**: `server/salesSheetsDb.ts`

### NQ-07 (TER-345): Conversion Integrity

- **Status**: COMPLETE
- **Ticket**: https://linear.app/terpcorp/issue/TER-345
- **Changes**: Both `convertToOrder()` and `convertToLiveSession()` wrapped in `db.transaction()` to prevent partial-conversion side effects. If any step fails, entire conversion rolls back atomically.
- **Files Changed**: `server/salesSheetsDb.ts`

### NQ-08 (TER-189): Action Reliability

- **Status**: COMPLETE
- **Ticket**: https://linear.app/terpcorp/issue/TER-189
- **Changes**: Line totals now visible in SortableItem component (`qty × $price = $lineTotal`). Shared page shows Line Total column. Clipboard and PDF exports include quantity breakdown. All action buttons already had proper `isPending` and `hasUnsavedChanges` guards.
- **Files Changed**: `client/src/components/sales/SalesSheetPreview.tsx`, `client/src/pages/SharedSalesSheetPage.tsx`

### NQ-09 (PR #449): Docker Disk-Headspace Fix

- **Status**: COMPLETE
- **PR**: https://github.com/EvanTenenbaum/TERP/pull/449
- **Changes**: Merged `fix/dockerfile-prod-deps-disk-headspace` — prod-only deps in runner stage (~250MB savings), UPLOAD_DIR env var removal, image size guard script.
- **Evidence**: Clean merge, TypeScript passes post-merge

### NQ-10: Integration Gate

- **Status**: COMPLETE
- **Evidence**: See verification results below

## Final Verification Results

```
VERIFICATION RESULTS
====================
TypeScript: ✅ PASS (0 errors)
Lint:       ✅ PASS (0 warnings)
Tests:      ✅ PASS (5632/5632 passing, 19 skipped)
Build:      ✅ PASS (production build succeeds)
V4 QA Gate: ✅ PASS

Blast Radius:
- Sales Sheet preview component (total calculation, line display, exports)
- Sales Sheet server validation (total verification math)
- Sales Sheet conversion (order + live session)
- Shared sales sheet page (line total column added)
- Sales Sheet tests (updated to match corrected math)
- Dockerfile (production deps optimization)
- DO app specs (UPLOAD_DIR removal)

Changed Files:
- client/src/components/sales/SalesSheetPreview.tsx
- client/src/pages/SharedSalesSheetPage.tsx
- server/routers/salesSheets.ts
- server/routers/salesSheets.test.ts
- server/salesSheetsDb.ts
- Dockerfile
- .do/app-seed-job.yaml, .do/app-staging.yaml, .do/app.yaml
- terp-do-spec.yaml, terp-do-spec-no-augment.yaml
- scripts/ci/check-image-size.sh (new)
```
