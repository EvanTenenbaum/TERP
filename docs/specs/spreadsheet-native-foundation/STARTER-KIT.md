# Spreadsheet-Native Starter Kit

**Version**: 1.0 | **Created**: 2026-03-20 | **Status**: Active
**Audience**: Coder agents implementing sheet-native surfaces for new modules

This document captures every proven pattern from the Orders pilot so future modules
can reuse them without re-discovery. The Orders pilot passed 7 gates and proved the
PowersheetGrid runtime across queue, document, and handoff contexts.

---

## 1. Required Primitives and Props

### PowersheetGrid

The core wrapper around AG Grid. Lives at `client/src/components/spreadsheet-native/PowersheetGrid.tsx`.

```tsx
import {
  PowersheetGrid,
  type PowersheetAffordance,
} from "@/components/spreadsheet-native/PowersheetGrid";

<PowersheetGrid
  surfaceId="orders-queue" // Unique ID — appears as data-powersheet-surface-id
  requirementIds={["ORD-WF-001"]} // Traceability back to spec requirements
  releaseGateIds={["SALE-ORD-019"]} // Which proof rows this grid covers
  affordances={queueAffordances} // PowersheetAffordance[] — what the grid can do
  title="Orders Queue"
  description="One dominant queue..."
  rows={queueRows}
  columnDefs={orderColumnDefs}
  getRowId={row => row.identity.rowKey}
  selectedRowId={selectedRow?.identity.rowKey ?? null}
  onSelectedRowChange={row => setSelectedOrderId(row?.orderId ?? null)}
  selectionMode="cell-range" // "single-row" | "cell-range"
  enableFillHandle={false} // Queue grids: false. Document grids: true
  enableUndoRedo={false} // Queue grids: false. Document grids: true
  onSelectionSummaryChange={setQueueSelectionSummary}
  isLoading={query.isLoading}
  errorMessage={query.error?.message ?? null}
  emptyTitle="No orders match"
  emptyDescription="Adjust search or create a new draft."
  summary={<span>{rows.length} visible orders</span>}
  antiDriftSummary="Release gates: selection parity..."
  minHeight={360}
/>;
```

**Key props by purpose:**

| Prop               | Purpose                                                                  |
| ------------------ | ------------------------------------------------------------------------ |
| `surfaceId`        | Scopes CSS (`[data-powersheet-surface-id]`) and test selectors           |
| `requirementIds`   | Traceability — connects grid to spec requirement IDs                     |
| `releaseGateIds`   | Traceability — connects grid to proof row IDs                            |
| `affordances`      | Rendered in summary; documents what interactions are available           |
| `selectionMode`    | `"cell-range"` for spreadsheet behavior, `"single-row"` for simple lists |
| `enableFillHandle` | Only `true` on editable document grids with `setFillValue`               |
| `enableUndoRedo`   | Only `true` on editable document grids                                   |
| `antiDriftSummary` | Visible reminder of what this grid must preserve                         |

### SpreadsheetPilotGrid

The AG Grid integration layer (`client/src/components/spreadsheet-native/SpreadsheetPilotGrid.tsx`).
PowersheetGrid delegates to this. You rarely use it directly unless building a custom
wrapper. Full prop list includes clipboard, fill, paste, cut, keyboard suppression,
and navigation callbacks.

### KeyboardHintBar

Platform-aware keyboard shortcut display.

```tsx
import {
  KeyboardHintBar,
  type KeyboardHint,
} from "@/components/work-surface/KeyboardHintBar";

const isMac =
  typeof navigator !== "undefined" &&
  /mac/i.test(navigator.platform || navigator.userAgent);
const mod = isMac ? "\u2318" : "Ctrl";

const hints: KeyboardHint[] = [
  { key: "Click", label: "select row" },
  { key: `${mod}+C`, label: "copy cells" },
  { key: `${mod}+A`, label: "select all" },
];

<KeyboardHintBar hints={hints} className="text-xs" />;
```

### WorkSurfaceStatusBar

Three-zone status bar (left / center / right).

```tsx
import { WorkSurfaceStatusBar } from "@/components/work-surface/WorkSurfaceStatusBar";

<WorkSurfaceStatusBar
  left={
    <span>
      {draftRows.length} drafts · {confirmedRows.length} confirmed
    </span>
  }
  center={<span>Selected {selectedRow.orderNumber}</span>}
  right={<KeyboardHintBar hints={queueKeyboardHints} className="text-xs" />}
/>;
```

### InspectorPanel

Non-modal right-rail detail panel with focus trap, Esc-to-close, and responsive
mobile behavior.

```tsx
import {
  InspectorPanel,
  InspectorSection,
  InspectorField,
} from "@/components/work-surface/InspectorPanel";

<InspectorPanel
  isOpen={selectedRow !== null}
  onClose={() => setSelectedId(null)}
  title={selectedRow?.orderNumber || "Inspector"}
  subtitle={selectedRow?.clientName}
  headerActions={<Badge variant="outline">{selectedRow?.status}</Badge>}
  footer={
    <Button onClick={() => onOpenClassic(selectedRow.id)}>Open Classic</Button>
  }
>
  <InspectorSection title="Details">
    <InspectorField label="Client">
      <p>{selectedRow.clientName}</p>
    </InspectorField>
  </InspectorSection>
</InspectorPanel>;
```

### SheetModeToggle

Toggle between sheet-native and classic surfaces. Wired at the workspace page level.

```tsx
import SheetModeToggle from "@/components/spreadsheet-native/SheetModeToggle";
import { useSpreadsheetSurfaceMode } from "@/lib/spreadsheet-native";

// In the workspace page:
const { surfaceMode, setSurfaceMode } = useSpreadsheetSurfaceMode({
  enabled: sheetPilotEnabled,
  ready: availabilityReady,
});

// In the shell's commandStrip:
<SheetModeToggle
  enabled={sheetPilotEnabled}
  surfaceMode={surfaceMode}
  onSurfaceModeChange={setSurfaceMode}
/>;

// Then conditionally render:
{
  surfaceMode === "sheet-native" ? <SheetNativeSurface /> : <ClassicSurface />;
}
```

The `useSpreadsheetSurfaceMode` hook reads/writes `?surface=sheet-native` in the URL.
When `enabled` is false, it strips the param and returns `"classic"`.

---

## 2. Layout Patterns by Family

Each module maps to one of five proven layout families. The "leader" module builds
the sheet-native surface first and proves the pattern. Followers reuse its layout
with module-specific data and actions.

### Family 1: Queue + Detail

**Pattern**: Dominant queue grid, selected-row detail cards, workflow action bar, support grid, inspector panel.

**Leader**: Orders | **Followers**: Purchase Orders, Intake, Fulfillment

**Layout structure** (from `OrdersSheetPilotSurface`):

1. Search bar + action buttons (New, Refresh)
2. Workflow action bar (contextual: Edit Draft, Delete Draft, Accounting handoff, Shipping handoff, Classic fallback)
3. `PowersheetGrid` — primary queue (`selectionMode="cell-range"`, `enableFillHandle={false}`)
4. Selected-row KPI cards (Client, Stage, Invoice, Next Step)
5. `PowersheetGrid` — support grid for selected-row line items
6. `WorkSurfaceStatusBar` with `KeyboardHintBar`
7. `InspectorPanel` — deep context for selected row

**What leaders must prove**: Queue browse/filter, row selection driving detail, workflow actions scoped to focused row, multi-row selection guardrail blocking workflow actions, handoff buttons to adjacent modules.

### Family 2: Ledger + Inspector

**Pattern**: Client-gated transaction grid, right-rail inspector, KPI summary cards.

**Leader**: Payments | **Followers**: Client Ledger

**Layout structure**:

1. Client/status filter bar
2. `PowersheetGrid` — transaction ledger (`selectionMode="cell-range"`)
3. KPI cards (AR aging, totals, outstanding)
4. `InspectorPanel` — invoice/payment detail with action buttons
5. `WorkSurfaceStatusBar`

**What leaders must prove**: Client-scoped filtering, payment recording flow in inspector, status transitions, AR aging view, GL entry visibility.

### Family 3: Browser + Preview

**Pattern**: Catalog browser grid, preview pane, conversion action buttons.

**Leader**: Sales Sheets | **Followers**: None currently

**Layout structure**:

1. Search/filter bar
2. `PowersheetGrid` — catalog browser
3. Preview pane for selected item
4. Conversion actions (e.g., "Convert to Order")
5. `WorkSurfaceStatusBar`

**What leaders must prove**: Browse/search, preview rendering, conversion action that hands off to another module's sheet-native surface.

### Family 4: Registry + Actions

**Pattern**: Read-only registry grid, row-scoped action buttons, status filtering.

**Leader**: Invoices | **Followers**: Quotes

**Layout structure** (from `InvoicesWorkSurface` / `QuotesWorkSurface`):

1. Status filter tabs/dropdown
2. `PowersheetGrid` — registry (`selectionMode="single-row"` or `"cell-range"`, `enableFillHandle={false}`)
3. Row action buttons (Send, Edit, Convert, Delete)
4. `InspectorPanel` — document detail
5. `WorkSurfaceStatusBar`

**What leaders must prove**: Status filtering, row-scoped actions that don't modify grid data, conversion/handoff actions, print/export.

### Family 5: Table + Support Cards

**Pattern**: Data table, companion cards for exceptions/alerts, dialog-driven actions.

**Leader**: Inventory | **Followers**: Samples, Returns

**Layout structure** (from `SampleManagement` / `ReturnsPage`):

1. Filter/search bar with tab-based lane filtering
2. `PowersheetGrid` — primary data table
3. Exception/alert cards (e.g., Expiring Samples widget, return exceptions)
4. Dialog-driven actions (Create, Update, Return, Location Update)
5. `WorkSurfaceStatusBar`

**What leaders must prove**: Lane/tab filtering, dialog-driven CRUD, exception card rendering, batch operations.

---

## 3. Field Policy Conventions

Field policies control which cells are editable, pasteable, and fillable. Defined via
`PowersheetFieldPolicyMap` from `client/src/lib/powersheet/contracts.ts`.

```tsx
import type { PowersheetFieldPolicyMap } from "@/lib/powersheet/contracts";

const documentFieldPolicies: PowersheetFieldPolicyMap<LineItem> = {
  quantity: {
    copyAllowed: true,
    pasteAllowed: true,
    fillAllowed: true,
    singleEditAllowed: true,
    multiEditAllowed: true,
    surfaceLabel: "Orders document grid",
  },
  // Read-only fields simply have no entry in the map
};
```

**Column definition wiring:**

```tsx
// cellClass — drives CSS styling
cellClass: getFieldPolicy(columnKey) ? "powersheet-cell--editable" : "powersheet-cell--locked",

// headerTooltip — communicates editability to users
headerTooltip: getFieldPolicy(columnKey)
  ? "Editable: spreadsheet-safe quantity."
  : "Read-only: derived from line calculation.",

// editable flag — AG Grid's native edit gate
editable: Boolean(getFieldPolicy(columnKey)?.singleEditAllowed),
```

**Queue grids**: No field policies (all cells read-only, all `powersheet-cell--locked`).

**Document grids**: Define policies for each editable field. Locked columns get
`powersheet-cell--locked` automatically.

---

## 4. Blocked-Edit Toast Pattern

When a user tries to edit a locked cell or pastes invalid data, show a toast. Use a
300ms dedup window via refs to prevent toast spam from rapid AG Grid events.

```tsx
// Refs for dedup
const lastToastKeyRef = useRef<string | null>(null);
const lastToastTimeRef = useRef(0);

const notifyEditToast = (level: "warning" | "error", message: string) => {
  const now = Date.now();
  const toastKey = `${level}:${message}`;
  if (
    toastKey !== lastToastKeyRef.current ||
    now - lastToastTimeRef.current > 300
  ) {
    if (level === "warning") {
      toast.warning(message);
    } else {
      toast.error(message);
    }
    lastToastKeyRef.current = toastKey;
    lastToastTimeRef.current = now;
  }
};

// Usage in blocked-edit handler:
const updateBlockedEdit = (rejection: PowersheetEditRejection) => {
  setLastEditRejection(rejection);
  notifyEditToast("warning", rejection.message);
};
```

**Why 300ms?** AG Grid fires multiple cell events in rapid succession during paste
and fill operations. Without dedup, a single paste across 5 rows with 1 blocked
column would show 5 identical toasts.

---

## 5. Platform-Detected Keyboard Hints

Always detect the platform and show the correct modifier key:

```tsx
const isMac =
  typeof navigator !== "undefined" &&
  /mac/i.test(navigator.platform || navigator.userAgent);
const mod = isMac ? "\u2318" : "Ctrl";
```

Then use `mod` in all keyboard hint definitions:

```tsx
const queueKeyboardHints: KeyboardHint[] = [
  { key: "Click", label: "select row" },
  { key: "Shift+Click", label: "extend range" },
  { key: `${mod}+Click`, label: "add to selection" },
  { key: `${mod}+C`, label: "copy cells" },
  { key: `${mod}+A`, label: "select all" },
];

const documentKeyboardHints: KeyboardHint[] = [
  { key: "Tab", label: "next cell" },
  { key: "Shift+Tab", label: "prev cell" },
  { key: "Enter", label: "next row" },
  { key: "Escape", label: "cancel edit" },
  { key: `${mod}+C`, label: "copy" },
  { key: `${mod}+V`, label: "paste" },
  { key: `${mod}+Z`, label: "undo" },
];
```

**Never hardcode `Cmd` or `Ctrl`** — always derive from `isMac`.

---

## 6. Affordance Matrix

Each grid declares what spreadsheet operations are available via `PowersheetAffordance[]`:

```tsx
export interface PowersheetAffordance {
  label: string;
  available: boolean;
}

// Queue grid — read-only selection + copy + workflow actions
const queueAffordances: PowersheetAffordance[] = [
  { label: "Select", available: true },
  { label: "Multi-select", available: true },
  { label: "Copy", available: true },
  { label: "Paste", available: false },
  { label: "Fill", available: false },
  { label: "Edit", available: false },
  { label: "Workflow actions", available: true },
];

// Document grid — full spreadsheet editing
const documentAffordances: PowersheetAffordance[] = [
  { label: "Select", available: true },
  { label: "Multi-select", available: true },
  { label: "Copy", available: true },
  { label: "Paste", available: true },
  { label: "Fill", available: true },
  { label: "Edit", available: true },
  { label: "Undo/Redo", available: true },
  { label: "Row ops", available: true },
];
```

Unavailable affordances render with `line-through opacity-50` in the grid summary.
This makes the grid's capabilities self-documenting.

---

## 7. SheetModeToggle Wiring

The toggle lives at the **workspace page** level, not inside individual surfaces.

**Pattern from `SalesWorkspacePage`:**

1. Import availability and mode hooks:

   ```tsx
   import {
     useSpreadsheetPilotAvailability,
     useSpreadsheetSurfaceMode,
   } from "@/lib/spreadsheet-native";
   ```

2. Determine which tabs support the pilot:

   ```tsx
   const pilotSurfaceSupported =
     activeTab === "orders" || activeTab === "create-order";
   ```

3. Get availability (feature flag + readiness):

   ```tsx
   const { sheetPilotEnabled, availabilityReady } =
     useSpreadsheetPilotAvailability(pilotSurfaceSupported);
   ```

4. Get mode state:

   ```tsx
   const { surfaceMode, setSurfaceMode } = useSpreadsheetSurfaceMode({
     enabled: sheetPilotEnabled,
     ready: availabilityReady,
   });
   ```

5. Render toggle in the shell's `commandStrip`:

   ```tsx
   <SheetModeToggle
     enabled={sheetPilotEnabled}
     surfaceMode={surfaceMode}
     onSurfaceModeChange={setSurfaceMode}
   />
   ```

6. Conditionally render surfaces in each panel:
   ```tsx
   <LinearWorkspacePanel value="orders">
     {surfaceMode === "sheet-native" ? (
       <OrdersSheetPilotSurface onOpenClassic={...} />
     ) : (
       <OrdersWorkSurface />
     )}
   </LinearWorkspacePanel>
   ```

**Important**: The classic surface must always remain as the fallback. Never remove it
until the module passes G7 retirement with evidence.

---

## 8. What Must NEVER Be Silently Dropped

When building a sheet-native surface, these features from the classic surface
**must be preserved or explicitly documented as accepted limitations**:

1. **Mutations** — Every create, update, delete, and status transition in the classic
   surface must have an equivalent action in the sheet-native surface (button, grid
   edit, or handoff).

2. **Queries** — Every data fetch the classic surface performs must be replicated.
   If the sheet-native surface shows less data, document why.

3. **Keyboard shortcuts** — All keyboard interactions must be mapped. Use
   `KeyboardHintBar` to make them discoverable.

4. **Route handoffs** — Buttons that navigate to other modules (Accounting, Shipping,
   etc.) must be preserved. These are explicit owner handoffs, not optional convenience.

5. **Confirmation dialogs** — Destructive actions (Delete Draft, Cancel Order) must
   keep their confirmation dialogs. Use `ConfirmDialog` from `@/components/ui/confirm-dialog`.

6. **Export actions** — If the classic surface has CSV export, print, or download,
   the sheet-native surface must preserve them or document the gap.

**If you cannot implement a feature**, add it to the proof-row-map as
`limitation` or `accepted-adjacent` with a reason — never silently omit it.

---

## 9. CSS Class Convention

Powersheet cell styling is scoped to the `[data-powersheet-surface-id]` attribute
that `PowersheetGrid` renders automatically. The two classes are defined in
`client/src/index.css`:

```css
/* Editable cells — warm amber left border + subtle background */
[data-powersheet-surface-id] .powersheet-cell--editable {
  border-left: 2px solid oklch(0.53 0.13 44 / 0.35);
  background: oklch(0.53 0.13 44 / 0.04);
}
[data-powersheet-surface-id] .powersheet-cell--editable:hover {
  background: oklch(0.53 0.13 44 / 0.08);
}

/* Locked cells — muted background + not-allowed cursor */
[data-powersheet-surface-id] .powersheet-cell--locked {
  color: var(--muted-foreground);
  background: color-mix(in oklab, var(--muted) 30%, transparent);
}
[data-powersheet-surface-id] .powersheet-cell--locked:hover {
  background: color-mix(in oklab, var(--muted) 45%, transparent);
  cursor: not-allowed;
}
```

Dark mode variants are also defined. **Do not add module-specific cell styles** —
use only these two classes via the `cellClass` colDef property.

---

## 10. Proof Expectations per Module

Every sheet-native surface must produce proof artifacts before it can be considered
for default promotion or classic retirement.

### Required proof artifacts

1. **Staging screenshot** — The surface rendering on a deployed staging build with
   real data visible. Must show the grid, status bar, and keyboard hints.

2. **Classic toggle test** — Demonstrate that `SheetModeToggle` switches between
   sheet-native and classic without data loss or route corruption.

3. **Proof row map** — CSV mapping each feature row to its proof state:
   `proof_row, owner_class, current_state, gate, primary_issue, required_evidence`

4. **Execution metrics** — JSON tracking `live_proven_count`, `code_proven_count`,
   `accepted_limitation_count`, etc.

### Promotion thresholds (from instrumentation)

| Metric                               | Threshold    | Action                               |
| ------------------------------------ | ------------ | ------------------------------------ |
| Fallback rate (classic toggle usage) | < 5%         | Safe to flip default to sheet-native |
| Fallback rate                        | < 1%         | Safe to retire classic (hide toggle) |
| Zero fallbacks for 2 releases        | 0% sustained | Classic surface can be removed       |

### Gate progression

- **G1–G5**: Feature implementation and live proofs
- **G6**: Rollout verdict — all proof rows reconciled
- **G7**: Retirement handoff — classic fallback policy, reopen criteria, named owner

---

## Appendix A: Contracts Reference

| Type                         | Import Path                                      | Purpose                                              |
| ---------------------------- | ------------------------------------------------ | ---------------------------------------------------- |
| `PowersheetAffordance`       | `@/components/spreadsheet-native/PowersheetGrid` | Grid capability declaration                          |
| `PowersheetSelectionSet`     | `@/lib/powersheet/contracts`                     | Full selection state (focused cell, ranges, row IDs) |
| `PowersheetSelectionSummary` | `@/lib/powersheet/contracts`                     | Aggregated selection counts                          |
| `PowersheetFieldPolicy`      | `@/lib/powersheet/contracts`                     | Per-field edit/paste/fill permissions                |
| `PowersheetFieldPolicyMap`   | `@/lib/powersheet/contracts`                     | Map of field name → policy                           |
| `PowersheetEditRejection`    | `@/lib/powersheet/contracts`                     | Structured edit rejection with reason                |
| `KeyboardHint`               | `@/components/work-surface/KeyboardHintBar`      | Keyboard shortcut display                            |
| `SpreadsheetSurfaceMode`     | `@/lib/spreadsheet-native`                       | `"classic" \| "sheet-native"`                        |

## Appendix B: File Reference

| File                                                                   | Purpose                                                        |
| ---------------------------------------------------------------------- | -------------------------------------------------------------- |
| `client/src/components/spreadsheet-native/PowersheetGrid.tsx`          | Core grid wrapper                                              |
| `client/src/components/spreadsheet-native/SpreadsheetPilotGrid.tsx`    | AG Grid integration layer                                      |
| `client/src/components/spreadsheet-native/OrdersSheetPilotSurface.tsx` | Orders queue + document surface (leader)                       |
| `client/src/components/spreadsheet-native/SheetModeToggle.tsx`         | Classic/sheet-native toggle                                    |
| `client/src/components/orders/OrdersDocumentLineItemsGrid.tsx`         | Editable document grid (leader)                                |
| `client/src/components/work-surface/KeyboardHintBar.tsx`               | Keyboard hint display                                          |
| `client/src/components/work-surface/WorkSurfaceStatusBar.tsx`          | Three-zone status bar                                          |
| `client/src/components/work-surface/InspectorPanel.tsx`                | Right-rail inspector                                           |
| `client/src/lib/powersheet/contracts.ts`                               | Selection, field policy, edit rejection types                  |
| `client/src/lib/spreadsheet-native/searchParams.ts`                    | Surface mode hook + selection param hook                       |
| `client/src/index.css`                                                 | `powersheet-cell--editable` / `powersheet-cell--locked` styles |
