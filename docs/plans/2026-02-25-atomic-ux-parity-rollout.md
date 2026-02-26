# Atomic UX Parity Rollout — Implementation Plan (V4)

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Bring the 4 core transaction flows (Direct Intake, Order Creator, Inventory, PO Creation) to full Atomic UX Strategy parity — every production-ready hook wired in, every WorkSurface primitive applied consistently, matching the quality bar set by DirectIntakeWorkSurface.

**Architecture:** Incremental hook wiring and feature porting, NOT full rewrites. The infrastructure (9 hooks, 9 WorkSurface implementations) is already built. The gap is adoption: hooks exist but aren't imported, features exist in dead legacy code but haven't been ported to WorkSurface components. Each tier is independently shippable.

**Tech Stack:** React 19, AG Grid, Tailwind CSS 4, shadcn/ui, tRPC, Zod, sonner (toasts), dnd-kit

**Branch:** Work on `staging` branch. All work deploys to `https://terp-staging-yicld.ondigitalocean.app`.

---

## V4 QA Errata — Critical API Corrections

These corrections were validated against the actual staging source code. Any implementer MUST read this section before starting any task.

### E1: `useUndo` API — NO `pushUndo()`

The correct method is `registerAction()`, not `pushUndo()`.

```typescript
const { registerAction, undoLast, state } = useUndo({ enableKeyboard: false });
// enableKeyboard: false to avoid double-firing with useWorkSurfaceKeyboard

registerAction({
  description: "Removed 3 rows",
  undo: () => restoreRows(capturedRows),
  onConfirm: () => {}, // called when 10s expires without undo
  duration: 10000, // optional, defaults to 10000
});
```

The hook uses `sonner` toasts automatically on `registerAction()`. There is NO `UndoToastContainer` to render. The exported `UndoToast` is a presentational component for custom rendering — the hook doesn't use it internally.

### E2: `useSaveState` — `SaveStateIndicator` is a ReactNode, NOT a component

```typescript
const { setSaving, setSaved, setError, SaveStateIndicator } = useSaveState();
// CORRECT:
{SaveStateIndicator}
// WRONG:
<SaveStateIndicator />
<saveState.SaveStateIndicator />
```

### E3: `usePowersheetSelection` — requires `visibleIds`, `toggle` takes 2 params

```typescript
const selection = usePowersheetSelection<string>({
  visibleIds: currentRowIds, // REQUIRED — scopes select-all
});

selection.toggle("row-123", true); // 2 params required: (id, checked)
selection.toggleAll(true); // selects ALL visibleIds
selection.toggleAll(false); // clears all
// NOT: selection.toggle("row-123")      // WRONG — missing checked param
// NOT: selection.toggleAll(rowIds)       // WRONG — takes boolean, not array
```

### E4: Cmd+Z dual-listener risk

Both `useUndo` and `useWorkSurfaceKeyboard` register Cmd+Z listeners independently. ALWAYS use:

```typescript
const undo = useUndo({ enableKeyboard: false }); // disable useUndo's listener
const keyboard = useWorkSurfaceKeyboard({
  onUndo: () => undo.undoLast(), // let keyboard hook own Cmd+Z
});
```

### E5: `useValidationTiming` — Zod schema is REQUIRED

```typescript
const validation = useValidationTiming({
  schema: myZodSchema, // REQUIRED — not optional
  initialValues: { clientId: null, orderType: "SALE" },
});
```

### E6: Powersheet contracts use `Set<string>` — type alignment needed

`fillDownSelectedRows`, `duplicateSelectedRows`, `deleteSelectedRows` all expect `selectedRowIds: Set<string>`. If using numeric IDs from `usePowersheetSelection<number>`, convert with:

```typescript
const stringIds = new Set([...selection.selectedIds].map(String));
```

Recommendation: use `usePowersheetSelection<string>` throughout to avoid conversion.

### E7: `customHandlers` key format in `useWorkSurfaceKeyboard`

Keys are formatted as: `${ctrlKey ? "ctrl+" : ""}${metaKey ? "cmd+" : ""}${shiftKey ? "shift+" : ""}${key.toLowerCase()}`

```typescript
customHandlers: {
  'cmd+s': (e) => { e.preventDefault(); performAutoSave(); },     // Mac
  'ctrl+s': (e) => { e.preventDefault(); performAutoSave(); },    // Windows/Linux
  'cmd+enter': (e) => { e.preventDefault(); handleFinalize(); },
  'ctrl+enter': (e) => { e.preventDefault(); handleFinalize(); },
}
// NOT: 'mod+s' — there is no 'mod' prefix
```

### E8: IntakeGrid is ORPHANED — not used anywhere

IntakeGrid (803 lines) is not imported by any route or component on staging. Task 1.5 is eliminated. The file can be deleted as dead code cleanup.

### E9: `useExport` exists and provides `exportCSV` and `exportExcel`

```typescript
const { state, exportCSV, cancel, limits } = useExport<InventoryRow>();
await exportCSV(rows, {
  columns: [{ key: "name", label: "Product Name" }, ...],
  filename: "intake-export",
  addTimestamp: true,
  onProgress: (pct) => console.log(`${pct}%`),
});
```

There is NO ExportProgress component — only the type `ExportProgressProps` is exported. Build a simple progress UI if needed.

### E10: `WorkSurfaceStatusBarProps` is NOT exported

The interface is internal to the component file. Pass props directly:

```tsx
<WorkSurfaceStatusBar left={...} center={...} right={...} />
```

Do not try to import `WorkSurfaceStatusBarProps` as a type.

---

## QA-Validated State of the World (Feb 25, 2026)

### What's Built and Production-Ready

| Hook/Component                                     | Location                      | Status                            |
| -------------------------------------------------- | ----------------------------- | --------------------------------- |
| `useWorkSurfaceKeyboard`                           | `hooks/work-surface/`         | Used by 4 surfaces                |
| `useSaveState` + `SaveStateIndicator`              | `hooks/work-surface/`         | Used by 4 surfaces                |
| `useValidationTiming`                              | `hooks/work-surface/`         | Used by 1 surface (Direct Intake) |
| `usePowersheetSelection` (rich, Set-based)         | `hooks/work-surface/`         | Used by 3 surfaces                |
| `usePowersheetSelection` (simple, array-based)     | `hooks/powersheet/`           | Used by 2 surfaces (DEPRECATED)   |
| `useUndo` + `UndoProvider`                         | `hooks/work-surface/`         | **Built, ZERO consumers**         |
| `useExport`                                        | `hooks/work-surface/`         | **Built, ZERO consumers**         |
| `useBulkOperationLimits`                           | `hooks/work-surface/`         | **Built, ZERO consumers**         |
| `usePerformanceMonitor`                            | `hooks/work-surface/`         | **Built, ZERO consumers**         |
| `useConcurrentEditDetection`                       | `hooks/work-surface/`         | Used by 3 surfaces                |
| `useInspectorPanel` + `InspectorPanel`             | `components/work-surface/`    | Used by 4 surfaces                |
| `WorkSurfaceStatusBar`                             | `components/work-surface/`    | Used by 1 surface (PickPack)      |
| `LinearWorkspaceShell`                             | `components/layout/`          | Used by 7 workspace pages         |
| Powersheet lib (`fillDown`, `duplicate`, `delete`) | `lib/powersheet/contracts.ts` | **Built, ZERO consumers**         |

### Routing (validated)

| Route                           | Component                                                | Wrapper                         |
| ------------------------------- | -------------------------------------------------------- | ------------------------------- |
| `/inventory`                    | `InventoryWorkspacePage` → `InventoryWorkSurface`        | `LinearWorkspaceShell` (3 tabs) |
| `/orders/create`, `/orders/new` | `OrderCreatorPage`                                       | None (standalone)               |
| `/direct-intake`, `/receiving`  | `DirectIntakeWorkSurface`                                | None (manual CSS classes)       |
| `/purchase-orders`              | `ProcurementWorkspacePage` → `PurchaseOrdersWorkSurface` | `LinearWorkspaceShell` (3 tabs) |
| `/pick-pack`                    | `PickPackWorkSurface`                                    | None (standalone)               |

### Gap Matrix (validated by code audit)

| Primitive                       |   Direct Intake   |         Order Creator          | Inventory WS |    PO WS    |   Pick & Pack    |
| ------------------------------- | :---------------: | :----------------------------: | :----------: | :---------: | :--------------: |
| WorkSurface shell               | YES (manual CSS)  |             **NO**             | YES (Shell)  | YES (Shell) | YES (manual CSS) |
| `useWorkSurfaceKeyboard`        |        YES        |             **NO**             |     YES      |     YES     |       YES        |
| `useSaveState`                  |        YES        |     partial (hand-rolled)      |     YES      |     YES     |       YES        |
| `useValidationTiming`           |        YES        |             **NO**             |    **NO**    |   **NO**    |      **NO**      |
| `usePowersheetSelection` (rich) | **NO** (uses old) | **NO** (LineItemTable has own) |     YES      |     YES     |       YES        |
| `InspectorPanel`                |        YES        |             **NO**             |     YES      |     YES     |       YES        |
| `useUndo`                       |      **NO**       |             **NO**             |    **NO**    |   **NO**    |      **NO**      |
| `WorkSurfaceStatusBar`          |      **NO**       |             **NO**             |    **NO**    |   **NO**    |       YES        |
| `useExport`                     |      **NO**       |             **NO**             |    **NO**    |   **NO**    |      **NO**      |
| `useConcurrentEditDetection`    |      **NO**       |             **NO**             |     YES      |     YES     |       YES        |
| Powersheet lib functions        |      **NO**       |             **NO**             |    **NO**    |   **NO**    |      **NO**      |

---

## Tier 1: Polish Direct Intake to Reference Quality

**Rationale:** Smallest delta to "done." DirectIntakeWorkSurface (2,093 lines) already has keyboard contract, save state, validation timing, inspector panel, and bulk actions. It needs 5 hook wirings to reach full parity.

**Files:**

- Modify: `client/src/components/work-surface/DirectIntakeWorkSurface.tsx`
- Reference: `client/src/hooks/work-surface/useUndo.tsx`
- Reference: `client/src/hooks/work-surface/usePowersheetSelection.ts` (Set-based)
- Reference: `client/src/lib/powersheet/contracts.ts`
- Reference: `client/src/components/work-surface/WorkSurfaceStatusBar.tsx`
- Reference: `client/src/hooks/work-surface/useExport.ts`

### Task 1.1: Wire `useUndo` into Direct Intake

**Step 1:** Import `useUndo` from `@/hooks/work-surface`

**Step 2:** Initialize with keyboard disabled (see Errata E4):

```typescript
const undo = useUndo({ enableKeyboard: false });
```

**Step 3:** Find the existing `useWorkSurfaceKeyboard` call and add `onUndo`:

```typescript
const keyboard = useWorkSurfaceKeyboard({
  // ...existing options...
  onUndo: () => undo.undoLast(),
});
```

**Step 4:** Wrap `handleRemoveSelected` (and any row delete logic) to register undo before removing:

```typescript
const capturedRows = [...rowsToRemove];
undo.registerAction({
  description: `Removed ${capturedRows.length} row(s)`,
  undo: () => setRows(prev => [...prev, ...capturedRows]),
});
// then proceed with removal
```

**Step 5:** Sonner toasts fire automatically on `registerAction()` — no need to render any container.

**Step 6:** Test: Delete a row, see 10s countdown toast, press Cmd+Z, row restored.

**Step 7:** Commit: `feat(intake): wire useUndo for row deletion with 10s recovery window`

### Task 1.2: Swap to rich `usePowersheetSelection`

**Step 1:** Change import from `@/hooks/powersheet/usePowersheetSelection` to `@/hooks/work-surface`

**Step 2:** Initialize with `visibleIds` (see Errata E3):

```typescript
const selection = usePowersheetSelection<string>({
  visibleIds: gridRowIds, // array of currently displayed row IDs
});
```

**Step 3:** Update all call sites to new API:

- `selectedRowIds` (array) → `selection.selectedIds` (Set)
- `toggleRow(id)` → `selection.toggle(id, !selection.isSelected(id))`
- `isSelected(id)` → `selection.isSelected(id)`
- `selectedCount` → `selection.selectedCount`
- `clearSelection()` → `selection.clear()`
- Header checkbox: `selection.toggleAll(!selection.allSelected)`

**Step 4:** Verify bulk actions (Submit Selected, Duplicate Selected, Remove Selected) still work

**Step 5:** Commit: `refactor(intake): migrate to rich usePowersheetSelection hook`

### Task 1.3: Wire powersheet lib functions

**Step 1:** Import from `@/lib/powersheet/contracts`:

```typescript
import {
  fillDownSelectedRows,
  duplicateSelectedRows,
  deleteSelectedRows,
} from "@/lib/powersheet/contracts";
```

**Step 2:** Since contracts expect `Set<string>`, use string row IDs (aligned with Task 1.2). Each function takes a single object argument (see Errata E6):

```typescript
const newRows = duplicateSelectedRows({
  rows: currentRows,
  selectedRowIds: selection.selectedIds,
  getRowId: row => row.id,
  duplicateRow: row => ({ ...row, id: generateId(), status: "pending" }),
});
```

**Step 3:** Replace inline `handleDuplicateSelected` with `duplicateSelectedRows` call

**Step 4:** Add "Fill Down" bulk action button to the command strip:

```typescript
const newRows = fillDownSelectedRows({
  rows: currentRows,
  selectedRowIds: selection.selectedIds,
  getRowId: row => row.id,
  field: selectedField, // e.g., "vendor" or "cogs"
});
```

**Step 5:** Commit: `feat(intake): wire powersheet contracts for fill-down and unified duplicate`

### Task 1.4: Add `WorkSurfaceStatusBar` with keyboard hints

**Step 1:** Import `WorkSurfaceStatusBar` from `@/components/work-surface/WorkSurfaceStatusBar`

**Step 2:** Add below the AG Grid (inside the `linear-workspace-shell` div, after the grid):

```tsx
<WorkSurfaceStatusBar
  left={`${pendingCount} pending · ${submittedCount} submitted`}
  center={
    selection.selectedCount > 0
      ? `${selection.selectedCount} selected`
      : undefined
  }
  right="Tab: Next field · Enter: Commit · Esc: Cancel · ⌘Z: Undo"
/>
```

**Step 3:** Commit: `feat(intake): add WorkSurfaceStatusBar with keyboard hints`

### Task 1.5: Wire `useExport` for CSV

**Step 1:** Import `useExport` from `@/hooks/work-surface`:

```typescript
const { exportCSV, state: exportState } = useExport<IntakeRow>();
```

**Step 2:** Define columns for export:

```typescript
const exportColumns: ExportColumn<IntakeRow>[] = [
  { key: "vendor", label: "Vendor" },
  { key: "product", label: "Product" },
  { key: "strain", label: "Strain" },
  { key: "quantity", label: "Qty" },
  {
    key: "cogsPerUnit",
    label: "COGS/Unit",
    formatter: v => Number(v).toFixed(2),
  },
  { key: "location", label: "Location" },
  { key: "status", label: "Status" },
  { key: "notes", label: "Notes" },
];
```

**Step 3:** Add "Export CSV" button to command strip:

```tsx
<Button
  variant="outline"
  size="sm"
  onClick={() =>
    exportCSV(allRows, {
      columns: exportColumns,
      filename: "intake-session",
      addTimestamp: true,
    })
  }
>
  <Download className="h-4 w-4 mr-1" /> Export
</Button>
```

**Step 4:** Commit: `feat(intake): add CSV export for intake sessions`

### Task 1.6: Delete orphaned IntakeGrid

IntakeGrid (803 lines) is not imported by any route or component (confirmed by V4 QA grep).

**Step 1:** Delete `client/src/components/spreadsheet/IntakeGrid.tsx`

**Step 2:** Delete any orphaned imports or test files for IntakeGrid

**Step 3:** Commit: `chore(intake): delete orphaned IntakeGrid.tsx (803 lines, zero consumers)`

---

## Tier 2: Wrap Order Creator with WorkSurface Primitives

**Rationale:** OrderCreatorPage (945 lines) has ZERO Work Surface primitives, but LineItemTable already has powersheet parity (its own `usePowersheetSelection` + `PowersheetBulkActionContract`). Strategy is INCREMENTAL: wire hooks into the existing page structure. Do NOT rewrite the page or break the auto-save/credit-check/finalization flow.

**Critical things to preserve:**

- Auto-save (2s debounce → `createDraftEnhanced` mutation)
- Credit limit check + CreditWarningDialog two-step flow
- FloatingOrderPreview dual-mode (mobile Sheet + desktop Card)
- SalesSheetCreator → OrderCreator bridge (sessionStorage `salesSheetToQuote` + `?fromSalesSheet=true` URL param)
- InventoryBrowser (shared with SalesSheetCreatorPage — do NOT change its props/contract)
- Finalization flow (draft → credit check → finalize draft) with `isFinalizingRef`
- ReferralCreditsPanel + ReferredBySelector

**Files:**

- Modify: `client/src/pages/OrderCreatorPage.tsx`
- Reference: all `hooks/work-surface/` hooks
- Reference: `components/work-surface/WorkSurfaceStatusBar.tsx`

### Task 2.1: Replace hand-rolled auto-save indicator with `useSaveState`

**Step 1:** Import `useSaveState` from `@/hooks/work-surface`

**Step 2:** Initialize: `const { setSaving, setSaved, setError, SaveStateIndicator } = useSaveState()`

**Step 3:** Replace `autoSaveStatus` state management:

- `setAutoSaveStatus("saving")` → `setSaving()`
- `setAutoSaveStatus("saved")` → `setSaved()`
- `setAutoSaveStatus("error")` → `setError("Auto-save failed")`
- Remove the manual 3-second reset timeout (`autoSaveTimeoutRef`) — `useSaveState` auto-resets after `errorResetDelay` (default 5000ms)

**Step 4:** Replace the Cloud/CloudOff/Loader2 UI block (lines 564-590) with: `{SaveStateIndicator}` (it's a ReactNode, see Errata E2)

**Step 5:** Remove `autoSaveTimeoutRef`, `autoSaveStatus` state, and related cleanup

**Step 6:** Verify auto-save still works: change an item → 2s debounce → saving indicator → saved indicator

**Step 7:** Commit: `refactor(orders): replace hand-rolled save indicator with useSaveState`

### Task 2.2: Wire `useWorkSurfaceKeyboard`

**Step 1:** Import `useWorkSurfaceKeyboard` from `@/hooks/work-surface`

**Step 2:** Initialize with `gridMode: false` and platform-aware shortcuts (see Errata E7):

```typescript
const keyboard = useWorkSurfaceKeyboard({
  gridMode: false,
  onUndo: () => undo.undoLast(), // from Task 2.3
  customHandlers: {
    "cmd+s": e => {
      e.preventDefault();
      performAutoSave();
    },
    "ctrl+s": e => {
      e.preventDefault();
      performAutoSave();
    },
    "cmd+enter": e => {
      e.preventDefault();
      handleFinalize();
    },
    "ctrl+enter": e => {
      e.preventDefault();
      handleFinalize();
    },
  },
});
```

**Step 3:** Add `ref` and `onKeyDown` to page container:

```tsx
<div ref={keyboard.keyboardProps.ref} onKeyDown={keyboard.keyboardProps.onKeyDown}
     tabIndex={keyboard.keyboardProps.tabIndex} className="container mx-auto ...">
```

**Step 4:** Commit: `feat(orders): wire useWorkSurfaceKeyboard with Cmd+S save and Cmd+Enter finalize`

### Task 2.3: Wire `useUndo` for line item operations

**Step 1:** Import `useUndo` from `@/hooks/work-surface`

**Step 2:** Initialize with keyboard disabled:

```typescript
const undo = useUndo({ enableKeyboard: false });
```

**Step 3:** Wrap item removal from LineItemTable:

```typescript
// In the onChange handler that removes items:
const removedItems = items.filter(
  (_, i) => !newItems.some(n => n.batchId === items[i].batchId)
);
if (removedItems.length > 0) {
  undo.registerAction({
    description: `Removed ${removedItems.length} item(s)`,
    undo: () => setItems(prev => [...prev, ...removedItems]),
  });
}
```

**Step 4:** Wrap `onRemoveItem` from FloatingOrderPreview similarly

**Step 5:** Wire `onUndo` into the `useWorkSurfaceKeyboard` call from Task 2.2

**Step 6:** Commit: `feat(orders): wire useUndo for item removal with 10s recovery`

### Task 2.4: Add `WorkSurfaceStatusBar`

**Step 1:** Import and add at the bottom of the page container:

```tsx
<WorkSurfaceStatusBar
  left={`${items.length} items · ${orderType}`}
  center={clientDetails?.name || "No client selected"}
  right="⌘S: Save · ⌘Enter: Finalize · ⌘Z: Undo"
/>
```

**Step 2:** Commit: `feat(orders): add WorkSurfaceStatusBar with keyboard hints`

### Task 2.5: Apply `linear-workspace-*` CSS classes

Apply the visual convention without restructuring the layout:

**Step 1:** Add `linear-workspace-shell` class to the outer container div

**Step 2:** Restructure the header Card into a `linear-workspace-header` div:

- Move ShoppingCart icon + "Create Sales Order" title into `linear-workspace-title-wrap`
- Move `SaveStateIndicator` into header right side
- Move ClientCombobox + ReferredBySelector into `linear-workspace-meta` row

**Step 3:** Keep the existing 2/3 + 1/3 grid layout inside `linear-workspace-content`

**Step 4:** Preserve FloatingOrderPreview's position and sticky behavior

**Step 5:** Commit: `style(orders): apply linear-workspace CSS classes for visual consistency`

### Task 2.6: Wire `useValidationTiming` for order-level validation

**Step 1:** Import `useValidationTiming` and `z` from `@/hooks/work-surface` and `zod`

**Step 2:** Create Zod schema (see Errata E5 — schema is required):

```typescript
const orderSchema = z.object({
  clientId: z.number().positive("Select a client"),
  orderType: z.enum(["SALE", "QUOTE"]),
});
```

**Step 3:** Initialize:

```typescript
const validation = useValidationTiming({
  schema: orderSchema,
  initialValues: { clientId: null, orderType: "SALE" },
});
```

**Step 4:** Wire `handleChange` and `handleBlur` to ClientCombobox and OrderType selector

**Step 5:** Use `getFieldState("clientId")` to show progressive feedback (green check when valid, red only on blur)

**Step 6:** Keep `useOrderCalculations` for financial validation — `useValidationTiming` handles UX timing only

**Step 7:** Commit: `feat(orders): wire useValidationTiming for progressive order validation`

---

## Tier 3: Enrich Inventory WorkSurface with Legacy Features

**Rationale:** Legacy `Inventory.tsx` (1,462 lines) is DEAD CODE — not imported anywhere. The `/inventory` route serves `InventoryWorkspacePage` → `InventoryWorkSurface`. The WorkSurface version dropped features during migration. Port them back.

**Context:** InventoryWorkSurface lives inside `LinearWorkspaceShell` with 3 tabs (Operations, Browse, Products). Changes must work within this tab structure.

**Features to port from legacy:**

| Feature                            | Priority | Complexity |
| ---------------------------------- | -------- | ---------- |
| Advanced Filters (10+ dimensions)  | HIGH     | MEDIUM     |
| Filter Chips with remove/clear     | HIGH     | LOW        |
| Saved Views                        | HIGH     | MEDIUM     |
| CSV Export via `useExport`         | HIGH     | LOW        |
| Aging Badges + row highlighting    | MEDIUM   | LOW        |
| Stock Status Badges per row        | MEDIUM   | LOW        |
| Additional Sort Columns (10+ vs 3) | MEDIUM   | LOW        |
| Mobile Responsive Cards            | MEDIUM   | MEDIUM     |
| Search Highlighting                | LOW      | LOW        |

**Files:**

- Modify: `client/src/components/work-surface/InventoryWorkSurface.tsx`
- Reference: `client/src/pages/Inventory.tsx` (dead code, feature source)

### Task 3.1: Port Advanced Filters + Filter Chips

**Step 1:** Read `AdvancedFilters` and `FilterChips` components from the legacy page's imports

**Step 2:** Either reuse those components directly or use `FilterSortSearchPanel` (already production-ready, used by 9 pages) — choose whichever provides more filter dimensions

**Step 3:** Replace current 2-dropdown filter system with multi-dimensional filtering (Status, Category, Vendor, Brand, Grade, Location, Strain, Date Range, Price Range, Stock Level)

**Step 4:** Add filter chips below the filter bar showing active filters with individual remove buttons

**Step 5:** Wire filter state to the `trpc.inventory.getEnhanced` query params

**Step 6:** Commit: `feat(inventory): port advanced multi-dimensional filters from legacy`

### Task 3.2: Port Saved Views

**Step 1:** Read `SavedViewsDropdown` and `SaveViewModal` from legacy

**Step 2:** Add saved views to the header area (next to filters)

**Step 3:** Wire save/load to localStorage

**Step 4:** Commit: `feat(inventory): port saved filter views from legacy`

### Task 3.3: Wire `useExport` for CSV

**Step 1:** Initialize `useExport` and define columns matching legacy's 19-column export

**Step 2:** Add "Export CSV" button to the command area

**Step 3:** Commit: `feat(inventory): wire useExport for CSV download`

### Task 3.4: Port visual enrichments

**Step 1:** Port `AgingBadge` component and `getAgingRowClass` function for row highlighting

**Step 2:** Port `StockStatusBadge` for per-row status indicators

**Step 3:** Add additional sortable columns (Brand, Vendor, Grade, SKU, Reserved, Available, Status) to match legacy

**Step 4:** Commit: `feat(inventory): port aging badges, stock status, and extended columns`

### Task 3.5: Port mobile responsive cards

**Step 1:** Read `InventoryCard` from legacy, or create a new card component using `useBreakpoint` hook (already in barrel)

**Step 2:** Below `md` breakpoint, show card list instead of AG Grid

**Step 3:** Wire card click to open inspector panel

**Step 4:** Commit: `feat(inventory): port mobile responsive card view`

### Task 3.6: Wire universally missing hooks

**Step 1:** Wire `useUndo` (with `enableKeyboard: false`) — make status changes and qty adjustments undoable

**Step 2:** Wire `useValidationTiming` with Zod schema for qty adjustment dialog fields

**Step 3:** Add `WorkSurfaceStatusBar` with keyboard hints

**Step 4:** Commit: `feat(inventory): wire useUndo, useValidationTiming, WorkSurfaceStatusBar`

### Task 3.7: Delete legacy Inventory.tsx

After all features ported and verified:

**Step 1:** Delete `client/src/pages/Inventory.tsx` (1,462 lines)

**Step 2:** Delete any orphaned imports/components only used by legacy

**Step 3:** Commit: `chore(inventory): remove dead legacy Inventory.tsx (1,462 lines)`

---

## Tier 4: Polish PO and Pick-Pack WorkSurfaces

**Rationale:** PurchaseOrdersWorkSurface (1,520 lines) and PickPackWorkSurface are already fully built with most primitives. They just need the 3 universally missing pieces.

**Context:** PO lives inside `ProcurementWorkspacePage` with `LinearWorkspaceShell` (3 tabs). PickPack is standalone.

**Files:**

- Modify: `client/src/components/work-surface/PurchaseOrdersWorkSurface.tsx`
- Modify: `client/src/components/work-surface/PickPackWorkSurface.tsx`

### Task 4.1: Wire `useUndo` into PO WorkSurface

**Step 1:** Import `useUndo` with `{ enableKeyboard: false }`

**Step 2:** Wire `undo.undoLast` to existing `useWorkSurfaceKeyboard`'s `onUndo`

**Step 3:** Register undo actions for draft row deletion, status changes

**Step 4:** Commit: `feat(po): wire useUndo for draft operations`

### Task 4.2: Wire `useUndo` into Pick-Pack WorkSurface

**Step 1:** Import `useUndo` with `{ enableKeyboard: false }`

**Step 2:** Wire `undo.undoLast` to existing `useWorkSurfaceKeyboard`'s `onUndo`

**Step 3:** Register undo actions for pack/unpack operations

**Step 4:** Commit: `feat(pick-pack): wire useUndo for pack operations`

### Task 4.3: Wire `useValidationTiming` into PO WorkSurface

**Step 1:** Create Zod schema for PO line item fields:

```typescript
const poLineSchema = z.object({
  supplierId: z.number().positive("Select a supplier"),
  productId: z.number().positive("Select a product"),
  quantity: z.number().positive("Quantity must be > 0"),
  unitCost: z.number().nonnegative("Cost must be >= 0"),
});
```

**Step 2:** Wire `handleChange` and `handleBlur` to inline edit fields

**Step 3:** Commit: `feat(po): wire useValidationTiming for line item fields`

### Task 4.4: Add `WorkSurfaceStatusBar` to PO WorkSurface

**Step 1:** Add status bar with PO-specific keyboard hints

**Step 2:** Commit: `feat(po): add WorkSurfaceStatusBar with keyboard hints`

### Task 4.5: Wire `useExport` into PO and Pick-Pack

**Step 1:** Add CSV export for PO line items

**Step 2:** Add CSV export for pick-pack manifests

**Step 3:** Commit: `feat(po,pick-pack): add CSV export capability`

---

## Cross-Cutting: Quick Wins (apply across all surfaces)

### Task X.1: Create reusable `KeyboardHintBar` component

Create a component that renders keyboard shortcut hints for the `right` slot of `WorkSurfaceStatusBar`:

```tsx
function KeyboardHintBar({
  hints,
}: {
  hints: { key: string; label: string }[];
}) {
  return (
    <span className="text-xs text-muted-foreground">
      {hints.map((h, i) => (
        <span key={i}>
          {i > 0 && " · "}
          <kbd>{h.key}</kbd> {h.label}
        </span>
      ))}
    </span>
  );
}
```

Use it in all 5 status bars instead of hardcoded strings.

### Task X.2: Ship 10 quick polish wins from 85-issue UX report

| Fix                                             | Files                           | Impact    |
| ----------------------------------------------- | ------------------------------- | --------- |
| `toFixed(2)` on all currency displays           | Grep for floating point display | App-wide  |
| Replace `window.confirm()` with `ConfirmDialog` | Grep for `confirm(`             | App-wide  |
| Empty states for all tables                     | Each WorkSurface                | App-wide  |
| "Lifetime" filter label → "All Time"            | Filter configs                  | Inventory |
| Standardize "Supplier" vs "Seller" vs "Vendor"  | Labels and headings             | App-wide  |

---

## Execution Order and Dependencies

```
Tier 1 (Direct Intake polish) — 5 tasks, mostly independent
  1.1 useUndo ← do first (establishes pattern)
  1.2 rich usePowersheetSelection ← must complete before 1.3
  1.3 powersheet lib functions ← depends on 1.2
  1.4 WorkSurfaceStatusBar ← independent
  1.5 useExport ← independent
  1.6 delete IntakeGrid ← independent

Tier 2 (Order Creator) — 6 tasks, sequential
  2.1 useSaveState ← first (removes old state)
  2.2 useWorkSurfaceKeyboard ← after 2.1 and 2.3
  2.3 useUndo ← after 2.1 (needed by 2.2's onUndo)
  2.4 WorkSurfaceStatusBar ← independent
  2.5 CSS classes ← independent
  2.6 useValidationTiming ← independent

Tier 3 (Inventory enrichment) — 7 tasks
  3.1 Advanced Filters ← prerequisite for 3.2
  3.2 Saved Views ← depends on 3.1
  3.3-3.6 all independent
  3.7 Delete legacy ← depends on ALL above

Tier 4 (PO + Pick-Pack) — 5 tasks, all independent

Cross-cutting (X.1-X.2) — after Tier 1 establishes pattern
```

## What This Preserves

- All existing auto-save logic on Order Creator (2s debounce mechanism)
- Credit limit checking + CreditWarningDialog two-step flow
- FloatingOrderPreview dual-mode (mobile Sheet + desktop Card)
- SalesSheetCreator → OrderCreator bridge (sessionStorage + URL params)
- InventoryBrowser shared component (props/contract untouched)
- IntakeReceipts verification flow (separate business process, untouched)
- LineItemTable's existing powersheet parity (its own selection + bulk actions)
- PO creation with inline powersheet-style line items
- All `linear-workspace-*` CSS classes and `LinearWorkspaceShell` component

## What This Kills

- Orphaned IntakeGrid.tsx (803 lines, zero consumers → deleted)
- Legacy Inventory.tsx (1,462 lines, dead code → deleted after feature port)
- Hand-rolled auto-save indicators in OrderCreator (replaced by `useSaveState`)
- Old array-based `usePowersheetSelection` in Direct Intake (replaced by Set-based)
- Inline duplicate/delete implementations in Direct Intake (replaced by powersheet lib contracts)

## Success Criteria

After all 4 tiers, every core flow should have:

- [ ] `useWorkSurfaceKeyboard` with discoverable shortcuts
- [ ] `useSaveState` + `SaveStateIndicator` (ReactNode)
- [ ] `useValidationTiming` with Zod schemas
- [ ] `usePowersheetSelection` (rich, Set-based) or equivalent
- [ ] `InspectorPanel` for detail editing (where applicable)
- [ ] `useUndo` with 10-second recovery window (via `registerAction`)
- [ ] `WorkSurfaceStatusBar` with keyboard hints
- [ ] `useExport` for CSV download
- [ ] `useConcurrentEditDetection` where applicable
- [ ] `linear-workspace-*` CSS classes for visual consistency
