# Sales Catalogue Unified Surface — Atomic Execution Roadmap

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace `SalesSheetCreatorPage` + `SalesSheetsPilotSurface` with one unified `SalesCatalogueSurface`.

**Architecture:** `useCatalogueDraft` hook + `SalesCatalogueSurface` component + routing change + cleanup.

**Tech Stack:** React 19, TypeScript, AG Grid via PowersheetGrid, tRPC, Tailwind 4, shadcn/ui

**Source plan:** `docs/superpowers/plans/2026-03-27-sales-catalogue-unified-surface.md` (full code + verified appendices)

**Source spec:** `docs/superpowers/specs/2026-03-27-unified-sheet-native-sales-surfaces-design.md`

**Rule:** Before EVERY tRPC call or component prop, cross-reference the Appendix in the source plan. Field names have already been verified — do not guess.

---

## Wave 1: Hook + Tests (no UI yet)

### Task 1: useCatalogueDraft test file

**Files:** Create `client/src/hooks/useCatalogueDraft.test.ts`
**Deliverable:** Test file with 3 test cases (initial state, dirty tracking, gate blocking)
**Code:** Copy VERBATIM from source plan Task 1, Step 1
**Verify:** `pnpm vitest run client/src/hooks/useCatalogueDraft.test.ts` → FAIL (module not found)

- [ ] Create test file with exact code from plan Task 1 Step 1
- [ ] Run test, confirm it fails with "module not found"

### Task 2: useCatalogueDraft implementation

**Files:** Create `client/src/hooks/useCatalogueDraft.ts`
**Deliverable:** Hook that compiles and passes all 3 tests
**Code:** Copy VERBATIM from source plan Task 1, Step 3
**Critical:** `saveDraft` onSuccess uses `data.draftId` (NOT `data.id`). `save` onSuccess captures `sheetId: number` (raw number, not object). `generateShareLink` uses `lastSavedSheetId` (NOT `currentDraftId`).
**Verify:** `pnpm vitest run client/src/hooks/useCatalogueDraft.test.ts` → PASS (3 tests)

- [ ] Create hook file with exact code from plan Task 1 Step 3
- [ ] Run test, confirm all 3 pass
- [ ] `pnpm check` → zero errors

### Task 3: Commit Wave 1

- [ ] `git add client/src/hooks/useCatalogueDraft.ts client/src/hooks/useCatalogueDraft.test.ts`
- [ ] `git commit -m "feat(sales-catalogue): add useCatalogueDraft hook for draft lifecycle"`

---

## Wave 2: SalesCatalogueSurface skeleton + test

### Task 4: SalesCatalogueSurface test file

**Files:** Create `client/src/components/spreadsheet-native/SalesCatalogueSurface.test.tsx`
**Deliverable:** Test file with 3 test cases (badge renders, empty state, handoff buttons)
**Code:** Copy VERBATIM from source plan Task 2, Step 1
**Verify:** `pnpm vitest run client/src/components/spreadsheet-native/SalesCatalogueSurface.test.tsx` → FAIL (module not found)

- [ ] Create test file with exact code from plan Task 2 Step 1
- [ ] Run test, confirm it fails with "module not found"

### Task 5: SalesCatalogueSurface — full component

**Files:** Create `client/src/components/spreadsheet-native/SalesCatalogueSurface.tsx`
**Deliverable:** Component with all 5 layout zones rendering. Tests pass.
**Code:** Copy VERBATIM from source plan Task 2, Step 3 — this is the full ~400 line component.
**Cross-reference:** Verify all imports resolve. Key imports to check:
- `@/hooks/useCatalogueDraft` (created in Task 2)
- `@/components/sales/QuickViewSelector` (existing)
- `@/components/sales/SaveViewDialog` (existing)
- `@/components/spreadsheet-native/PowersheetGrid` (existing)
- `@/components/work-surface/WorkSurfaceStatusBar` (existing)
- `@/components/work-surface/KeyboardHintBar` (existing)
- `@/components/ui/confirm-dialog` (existing — exports `ConfirmDialog`)
- `@/components/ui/client-combobox` (existing — exports `ClientCombobox`)
**Verify:** `pnpm vitest run client/src/components/spreadsheet-native/SalesCatalogueSurface.test.tsx` → PASS (3 tests)
**Verify:** `pnpm check` → zero errors

- [ ] Create component file with exact code from plan Task 2 Step 3
- [ ] Run tests, confirm all 3 pass
- [ ] Run `pnpm check`, confirm zero TS errors

### Task 6: Commit Wave 2

- [ ] `git add client/src/components/spreadsheet-native/SalesCatalogueSurface.tsx client/src/components/spreadsheet-native/SalesCatalogueSurface.test.tsx`
- [ ] `git commit -m "feat(sales-catalogue): add SalesCatalogueSurface unified component"`

---

## Wave 3: Wire missing features into SalesCatalogueSurface

Each sub-task modifies the SAME file (`SalesCatalogueSurface.tsx`). They MUST run sequentially.

### Task 7: Wire AdvancedFilters

**Files:** Modify `client/src/components/spreadsheet-native/SalesCatalogueSurface.tsx`
**Deliverable:** Filters button in action bar opens AdvancedFilters. Inventory grid respects all filter dimensions (category, grade, vendor, price range, in-stock), not just search.
**Code:** Follow source plan Task 2.5, Step 1 exactly.
**Props check:** `AdvancedFilters` requires ALL 7 props: `filters`, `sort`, `onFiltersChange`, `onSortChange`, `inventory: PricedInventoryItem[]`, `isOpen: boolean`, `onOpenChange: (open: boolean) => void`. All required — no optionals.
**Verify:** `pnpm check` → zero errors

- [ ] Add `showAdvancedFilters` state
- [ ] Add Filters button to action bar
- [ ] Render `<AdvancedFilters>` conditionally between action bar and grids
- [ ] Replace `inventoryRows` memo with full filter logic (search + category + grade + vendor + price range + inStockOnly)
- [ ] `pnpm check` → zero errors

### Task 8: Wire DraftDialog + SavedSheetsDialog + getHistory query

**Files:** Modify `client/src/components/spreadsheet-native/SalesCatalogueSurface.tsx`
**Deliverable:** MoreHorizontal dropdown in toolbar with Load Draft / Load Saved Sheet / Delete Draft. Both dialogs render with correct props.
**Code:** Follow source plan Task 2.5, Step 2 exactly.
**Props check:** `DraftDialog` requires `drafts: DraftInfo[]`, `isLoading: boolean`, `onLoadDraft: (draftId: number) => void`, `onDeleteDraft: (draftId: number) => void`, `isDeleting: boolean`. `SavedSheetsDialog` requires `savedSheets: SavedSheetInfo[]`, `isLoading: boolean`, `onLoadSavedSheet: (sheetId: number) => void`.
**Critical:** Add `const utils = trpc.useUtils();` if not already present. Add `salesSheets.getHistory` query. Add `salesSheets.getById.fetch` for loading saved sheets.
**Verify:** `pnpm check` → zero errors

- [ ] Add `showDraftDialog`, `showSavedSheetsDialog` state
- [ ] Add `salesSheets.getHistory` useQuery
- [ ] Add `trpc.useUtils()` for `getById.fetch`
- [ ] Wire MoreHorizontal dropdown in toolbar (Load Draft, Load Saved, Delete)
- [ ] Render `<DraftDialog>` and `<SavedSheetsDialog>` at bottom of component
- [ ] `pnpm check` → zero errors

### Task 9: Wire COGS column (permission-gated) + batch status indicators

**Files:** Modify `client/src/components/spreadsheet-native/SalesCatalogueSurface.tsx`
**Deliverable:** Inventory grid shows COGS column when user has permission. Non-sellable batches show ⚠ warning.
**Code:** Follow source plan Task 2.5, Steps 3 and 4.
**Critical:** Check if `trpc.organizationSettings.getDisplaySettings` exists. If not, use a simpler permission check or hard-code `showCogs = false` with a TODO.
**Verify:** `pnpm check` → zero errors

- [ ] Add display settings query for COGS visibility
- [ ] Add conditional COGS column to `inventoryColumnDefs`
- [ ] Add batch status warning column (⚠ for AWAITING_INTAKE, ON_HOLD, QUARANTINED)
- [ ] `pnpm check` → zero errors

### Task 10: Wire default view auto-load + saved views query

**Files:** Modify `client/src/components/spreadsheet-native/SalesCatalogueSurface.tsx`
**Deliverable:** When client changes, the default saved view is auto-loaded (filters/sort/visibility applied).
**Code:** Follow source plan Task 2.5, Step 5.
**tRPC check:** `salesSheets.getViews` input is `{ clientId?: number }` (entire object optional). Returns `SavedView[]` with `filters`, `sort`, `columnVisibility`, `isDefault`, `id`, `name`.
**Verify:** `pnpm check` → zero errors

- [ ] Add `salesSheets.getViews` useQuery
- [ ] Add `useEffect` that finds default view on client change and applies it
- [ ] `pnpm check` → zero errors

### Task 11: Wire Live Shopping conversion

**Files:** Modify `client/src/components/spreadsheet-native/SalesCatalogueSurface.tsx`
**Deliverable:** Live button calls `salesSheets.convertToLiveSession` mutation instead of showing a toast placeholder.
**Code:** Follow source plan Task 2.5, Step 6.
**tRPC check:** `convertToLiveSession` input is `{ sheetId: number }`, returns `{ sessionId: number }`. Requires a **finalized** sheet ID — draft IDs will fail.
**Verify:** `pnpm check` → zero errors

- [ ] Add `convertToLiveSession` useMutation
- [ ] Replace Live button onClick with actual mutation call
- [ ] Gate behind `draft.lastSavedSheetId` (not `draft.currentDraftId`)
- [ ] `pnpm check` → zero errors

### Task 12: Commit Wave 3

- [ ] `git add client/src/components/spreadsheet-native/SalesCatalogueSurface.tsx`
- [ ] `git commit -m "feat(sales-catalogue): wire AdvancedFilters, DraftDialog, SavedSheetsDialog, COGS, batch status, default views, live shopping"`

---

## Wave 4: Route wiring

### Task 13: Modify SalesWorkspacePage — imports

**Files:** Modify `client/src/pages/SalesWorkspacePage.tsx`
**Deliverable:** Old imports removed, new lazy import added, Suspense imported.
**Exact diff:** See source plan Appendix "SalesWorkspacePage Exact Diff"

- [ ] Line 1: Change `import { lazy } from "react"` → `import { lazy, Suspense } from "react"`
- [ ] Delete lines 10-12 (`SalesSheetsPilotSurface` lazy import)
- [ ] Delete line 21 (`SalesSheetCreatorPage` import)
- [ ] Add after other lazy imports: `const SalesCatalogueSurface = lazy(() => import("@/components/spreadsheet-native/SalesCatalogueSurface"));`
- [ ] `pnpm check` → will show unused variable errors for sales-sheets hooks (expected, fixed in next task)

### Task 14: Modify SalesWorkspacePage — remove sales-sheets hooks + toggle

**Files:** Modify `client/src/pages/SalesWorkspacePage.tsx`
**Deliverable:** Sales-sheets surface mode hooks and SheetModeToggle branch removed. Zero orphaned references.
**Exact diff:** See source plan Appendix "SalesWorkspacePage Exact Diff"

- [ ] Delete lines 93-108 (sales-sheets pilot availability + surface mode hooks — 16 lines)
- [ ] Delete lines 166-171 (SheetModeToggle for sales-sheets in commandStrip — 6 lines)
- [ ] `pnpm check` → should clear the unused variable errors

### Task 15: Modify SalesWorkspacePage — replace panel rendering

**Files:** Modify `client/src/pages/SalesWorkspacePage.tsx`
**Deliverable:** `LinearWorkspacePanel value="sales-sheets"` renders `SalesCatalogueSurface` inside Suspense. No PilotSurfaceBoundary.

Replace lines 226-239 (the entire 14-line block) with:
```tsx
<LinearWorkspacePanel value="sales-sheets">
  <Suspense fallback={<div className="p-4 text-sm text-muted-foreground">Loading catalogue...</div>}>
    <SalesCatalogueSurface />
  </Suspense>
</LinearWorkspacePanel>
```

- [ ] Replace panel block
- [ ] `pnpm check` → zero errors
- [ ] `pnpm lint` → zero warnings

### Task 16: Update SalesWorkspacePage tests

**Files:** Modify `client/src/pages/SalesWorkspacePage.test.tsx`
**Deliverable:** Tests pass with new component mock. No references to deleted components.

- [ ] Replace mocks for `SalesSheetsPilotSurface` and `SalesSheetCreatorPage` with mock for `SalesCatalogueSurface`:
```typescript
vi.mock("@/components/spreadsheet-native/SalesCatalogueSurface", () => ({
  default: () => <div data-testid="sale-catalogue-surface">SalesCatalogueSurface</div>,
}));
```
- [ ] Update assertions that check for old component rendering
- [ ] Check `ConsolidatedWorkspaces.test.tsx` for similar references — update if needed
- [ ] `pnpm test` → all tests pass

### Task 17: Commit Wave 4

- [ ] `git add client/src/pages/SalesWorkspacePage.tsx client/src/pages/SalesWorkspacePage.test.tsx`
- [ ] `git commit -m "feat(sales-catalogue): wire SalesCatalogueSurface into SalesWorkspacePage, retire SheetModeToggle"`

---

## Wave 5: Cleanup

### Task 18: Verify no remaining imports of dead components

- [ ] Run each grep and confirm only the files being deleted reference them:
```bash
rg "SalesSheetCreatorPage" --glob '*.{ts,tsx}' -l
rg "SalesSheetsPilotSurface" --glob '*.{ts,tsx}' -l
rg "SalesSheetPreview" --glob '*.{ts,tsx}' -l
rg "from.*InventoryBrowser" --glob '*.{ts,tsx}' -l
rg "DraftControls" --glob '*.{ts,tsx}' -l
```
- [ ] If any file OUTSIDE the deletion list imports these, fix that file first

### Task 19: Delete retired components

- [ ] `git rm client/src/pages/SalesSheetCreatorPage.tsx`
- [ ] `git rm client/src/components/spreadsheet-native/SalesSheetsPilotSurface.tsx`
- [ ] `git rm client/src/components/spreadsheet-native/SalesSheetsPilotSurface.test.tsx`
- [ ] `git rm client/src/components/sales/SalesSheetPreview.tsx`
- [ ] `git rm client/src/components/sales/InventoryBrowser.tsx`
- [ ] `git rm client/src/components/sales/InventoryBrowser.test.tsx`
- [ ] `git rm client/src/components/sales/DraftControls.tsx`

**DO NOT DELETE:** `types.ts`, `QuickViewSelector.tsx`, `SaveViewDialog.tsx`, `AdvancedFilters.tsx`, `DraftDialog.tsx`, `SavedSheetsDialog.tsx` — these are still used by the new surface.

### Task 20: Full verification suite

- [ ] `pnpm check` → zero errors
- [ ] `pnpm lint` → zero warnings
- [ ] `pnpm test` → all tests pass
- [ ] `pnpm build` → production build succeeds

### Task 21: Commit Wave 5

- [ ] `git add -A`
- [ ] `git commit -m "chore(sales-catalogue): retire SalesSheetCreatorPage, SalesSheetsPilotSurface, and 4 replaced components"`

---

## Wave 6: Final verification

### Task 22: Success criteria check

Verify each criterion from the spec:

- [ ] **No SheetModeToggle** — Confirm `SalesWorkspacePage` sales-sheets panel has no toggle
- [ ] **Dirty-state gating** — Confirm `canShare` and `canConvert` are false when `hasUnsavedChanges === true`
- [ ] **Handoff** — Confirm `handleConvertToOrder` writes to sessionStorage and navigates with `?fromSalesSheet=true`
- [ ] **Filters + views** — Confirm `QuickViewSelector` and `SaveViewDialog` wired with `selectedClientId`
- [ ] **Auto-save** — Confirm 30s timer in `useCatalogueDraft` with stale-closure-safe refs
- [ ] **Share link flow** — Confirm `generateShareLink` uses `lastSavedSheetId` (finalized sheet), not draft ID
- [ ] **Live Shopping** — Confirm `convertToLiveSession` calls actual tRPC mutation with finalized sheet ID

### Task 23: Fix any issues + final commit

- [ ] If any criterion fails, fix the code
- [ ] `pnpm check && pnpm lint && pnpm test && pnpm build` → all pass
- [ ] `git add -A && git commit -m "fix(sales-catalogue): address verification findings"` (only if changes were needed)

---

## Summary

| Wave | Tasks | What ships |
|------|-------|-----------|
| 1 | 1-3 | `useCatalogueDraft` hook + tests |
| 2 | 4-6 | `SalesCatalogueSurface` skeleton + tests |
| 3 | 7-12 | Missing features wired (filters, drafts, COGS, views, live) |
| 4 | 13-17 | SalesWorkspacePage routing + test updates |
| 5 | 18-21 | Dead code cleanup + full verification |
| 6 | 22-23 | Success criteria check + final fixes |

**23 atomic tasks across 6 waves. Each task touches 1 file. Each has an exact verification command.**
