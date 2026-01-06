# Spreadsheet View QA Analysis Report

**Date:** 2026-01-06  
**Reviewer:** AI Agent (root)  
**Tooling:** Gemini Pro 2.5 (code and UI configuration analysis)

## Executive Summary

- The Spreadsheet View presents baseline inventory and client grids, but critical UX and data-integrity gaps remain. Loading/empty/error feedback is either missing or misconfigured, producing blank states that hide failures.
- The inventory “Available” editor applies deltas directly to `onHandQty` without accounting for reserved/quarantine/hold quantities, yielding incorrect availability values and potential data integrity regressions.
- Client-side and service-layer pagination/limits are inconsistent (UI requests 200 rows while service caps at 100) and the client grid fetches all orders without pagination, risking severe performance and memory issues on larger accounts.
- Accessibility and mobile responsiveness are minimal: no keyboard/focus handling in grids, no mobile row sizing, no column pruning, and no horizontal scroll affordances.
- Mutations fully refetch grid data, causing jarring re-renders, lost scroll/focus, and unnecessary load; AG-Grid performance features (transaction updates, `getRowId`, overlay templates) are unused.

## 1. UI/UX Analysis

### 1.1 Findings

- Inventory grid suppresses the loading overlay while `isLoading` is true (`suppressLoadingOverlay={!isLoading}`), leaving the grid blank during fetches.
- No custom empty or error overlays inside AG-Grid; errors render above the grid and can be missed.
- Both grids rely on full `refetch()` after mutations, causing flicker, scroll loss, and focus loss.
- Client list selection briefly renders no detail grid, producing a flicker before the first client auto-selects.
- Column headers and layout are clear, but status, loading, and empty affordances are weak.

### 1.2 Issues

1. **Missing/hidden loading state** (Inventory grid overlay suppressed).
2. **No contextual empty/error overlays** inside grids.
3. **Jarring data refreshes** due to full refetch after edits.
4. **Initial selection flicker** in Client grid.

### 1.3 Recommendations

- Use AG-Grid overlays: provide `overlayLoadingTemplate`, `overlayNoRowsTemplate`, and show an error overlay via the grid API. Remove the `suppressLoadingOverlay` inversion.
- Add `loading`/`empty`/`error` messaging inside both grids; keep refresh/CTA buttons near overlays.
- Preserve scroll/focus by using transactional updates (`applyTransaction`) or row-level updates on mutation success; add `getRowId` to stabilize row identity.
- Default-select the first client with a derived initial state before render (or render a skeleton) to remove flicker.

## 2. Logic & Data Integrity Analysis

### 2.1 Findings

- **Availability adjustment bug:** In `InventoryGrid.handleCellValueChanged`, editing “Available” computes `delta = newAvailable - oldAvailable` and sends that delta to `adjustQty` for `onHandQty`. Because “Available” is derived (`onHand - reserved - quarantine - hold`), this over-adjusts when any non-zero holds/quarantine/reserved exist.
- **Limit mismatch:** UI asks for `limit: 200` but the service caps at 100 (`DEFAULT_LIMIT`), creating inconsistent pagination expectations.
- **Client grid unbounded fetch:** `getClientGridData` fetches all client orders with no limit/pagination, risking timeouts and memory pressure for large clients.
- **Type-safety gaps:** Service code uses broad `as` casting when mapping order items, risking runtime errors if shapes drift.
- **Numeric parsing tolerates invalid input:** `parseNumber` collapses any falsy/NaN to `0`, hiding malformed data.
- **No validation for negative/absurd edits** on Available; UI only checks numeric shape, not domain rules.

### 2.2 Issues

1. **Incorrect availability adjustments** (derived field written as if it were base field).
2. **Pagination inconsistency** (UI 200 vs service 100).
3. **Unbounded client order fetch** (performance & stability risk).
4. **Unsafe type assertions** in service mapping.
5. **Weak numeric validation** (NaN → 0, negatives allowed).

### 2.3 Recommendations

- Recompute target `onHandQty` when editing “Available”: `targetOnHand = newAvailable + reserved + quarantine + hold`; send delta against current `onHandQty`. Reject edits that would produce negative `onHandQty`.
- Align limits: either cap UI at 100 or raise `DEFAULT_LIMIT` to match schema (`z.max(200)`) with benchmarks.
- Add pagination to `getClientGridData` and surface `nextCursor/hasMore`; gate UI queries behind pagination controls.
- Replace `as` casting with typed DTO transforms and schema validation for order items.
- Strengthen numeric validation: reject NaN/Infinity, enforce >= 0, and show inline errors.

## 3. Mobile Optimization Analysis

### 3.1 Current State

- Desktop-first layout; no mobile/touch-specific grid tuning.
- Default AG-Grid row heights/padding; no horizontal scroll hints or column reduction for narrow viewports.

### 3.2 Issues

1. **No touch-friendly sizing** (row height, padding, hit targets).
2. **No responsive column strategy** (all columns rendered on small screens).
3. **No horizontal scroll affordance** or sticky headers.
4. **No mobile editing aids** (bottom sheet/editor form).

### 3.3 Recommended Improvements

- Increase row/header height on small screens; enlarge padding/touch targets (≥44px).
- Add `getRowId`, disable unnecessary animations, and enable horizontal scroll. Hide low-priority columns (e.g., Notes/Sub) below `md`.
- Add sticky headers and visible horizontal scrollbar on mobile; consider a summary bar above the grid for key metrics.
- For edits on mobile, consider a bottom-sheet editor or form modal instead of in-cell editing.

## 4. Performance Analysis

### 4.1 Metrics (theoretical; runtime checks not executed in this environment)

- Initial load and edits are synchronous with full refetch; expected to exceed targets on large datasets.
- No server-side pagination for client orders; risk of >1s fetch and high memory usage.

### 4.2 Issues

1. **Full refetch after mutations** (both grids) → unnecessary re-renders and lost UI state.
2. **No `getRowId`** → grid cannot efficiently reconcile updates.
3. **`animateRows` enabled** → extra repaint cost without UX benefit.
4. **Service limit mismatch** → UI requests more than service returns, confusing pagination and caching.
5. **No client-grid pagination/cursor** → unbounded queries.

### 4.3 Recommendations

- Use AG-Grid transaction updates for mutations and polling; keep data locally in sync without full refetch.
- Provide `getRowId` for both grids to preserve row identity.
- Disable row animations for density/performance.
- Implement pagination/cursor for client orders; consider server-side pagination for inventory if datasets grow.
- Add debounce to Refresh and column filters to reduce request churn.

## 5. Priority Fix List

| #   | Issue                                                   | Severity | Effort | Recommendation                                                                                                                 |
| --- | ------------------------------------------------------- | -------- | ------ | ------------------------------------------------------------------------------------------------------------------------------ |
| 1   | Available edits over-adjust `onHandQty` (derived field) | Critical | M      | Recompute target `onHandQty` using reserved/quarantine/hold; validate non-negative; return updated row for transaction update. |
| 2   | Missing/misconfigured loading & error overlays          | High     | S      | Add AG-Grid overlays for loading/empty/error; fix `suppressLoadingOverlay` logic.                                              |
| 3   | Unbounded client order fetch                            | High     | M      | Add pagination/cursor to `getClientGridData` and UI.                                                                           |
| 4   | Limit mismatch (UI 200 vs service 100)                  | Medium   | S      | Harmonize limits and document expected page size.                                                                              |
| 5   | Type assertions in service mapping                      | Medium   | M      | Introduce validated DTOs and zod schemas when mapping orders/items.                                                            |
| 6   | Mobile/touch ergonomics missing                         | Medium   | M      | Increase row height/padding on mobile, hide low-priority columns, add scroll affordances.                                      |
| 7   | Full refetch on mutation                                | Medium   | M      | Use `applyTransaction` with `getRowId`, disable `animateRows`.                                                                 |

## 6. Improvement Roadmap

### Phase 1: Critical Fixes

- Correct Available → onHand adjustment logic with validation.
- Add loading/empty/error overlays and restore proper loading overlay behavior.
- Align pagination limits between client and service.

### Phase 2: UX Enhancements

- Introduce transactional grid updates, `getRowId`, and disable costly animations.
- Improve client selection UX (initial selection, skeletons, persistent scroll/focus).
- Add richer empty/error messaging and inline toasts.

### Phase 3: Mobile Optimization

- Add responsive column sets, increased touch targets, sticky headers, and bottom-sheet editor for mobile edits.
- Enable horizontal scroll hints and ensure grid containers avoid overflow clipping.

## Appendix

- **Gemini Pro 2.5 analyses executed:**
  - Service logic review for `server/services/spreadsheetViewService.ts` (findings on type safety, pagination, and numeric handling).
  - UI code review for `SpreadsheetViewPage`, `InventoryGrid`, and `ClientGrid` (findings on overlays, performance, accessibility, and mobile).
- **Environment note:** UI was not executed in-browser in this session; findings are from code and Gemini analysis. Run-time metrics and feature-flag UI checks should be validated in an interactive environment.
