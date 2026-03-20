# W1A: Inventory Sheet-Native Implementation Brief

## Module

Operations Inventory — the largest classic WorkSurface (97KB, 52 extracted capabilities)

## Readiness

- Detailed capability ledger: EXISTS (`docs/specs/spreadsheet-native-ledgers/operations-inventory-sheet-capability-ledger.csv`, 12 rows)
- Extraction CSV: EXISTS (`docs/specs/spreadsheet-native-ledgers/extracted/inventory-capabilities.csv`, 52 rows)
- Cross-check: 5/5 unique mutations, 3/3 queries — 100% extraction accuracy
- Figma golden flow: `docs/design/spreadsheet-native-golden-flows-2026-03-18/inventory-sheet.svg`
- Pilot surface: EXISTS (`client/src/components/spreadsheet-native/InventorySheetPilotSurface.tsx`)
- Launch matrix decision: Wave 2 in launch matrix, but moved to Wave 1 because pilot already exists

## Classic Capabilities to Preserve

### Mutations (5 unique)

1. `inventory.updateStatus` — Change batch status (available/quarantine/hold/etc.)
2. `inventory.adjustQty` — Adjust batch quantity with reason
3. `inventory.bulk.restore` — Undo bulk delete
4. `inventory.bulk.updateStatus` — Bulk status change
5. `inventory.bulk.delete` — Bulk soft delete

### Queries (3)

1. `inventory.getEnhanced` — Primary inventory data with filters
2. `inventory.list` — Simple inventory list
3. `inventory.dashboardStats` — Dashboard statistics

### Actions (5)

1. Search inventory (Cmd+K)
2. Filter by status
3. Filter by bulk status
4. Export CSV
5. Update product dialog

### Other

1. Keyboard navigation (useWorkSurfaceKeyboard)
2. Export hook (useExport)
3. Delete confirmation dialog
4. Route navigation to operations workspace

## Figma Direction (from Launch Matrix)

- `Adopt`: dominant inventory table with spreadsheet-native interaction
- `Adapt`: batch detail must show real data, not placeholder boxes
- `Preserve`: status change, quantity adjustment, bulk operations, export
- `Reject`: any design that hides the batch-level granularity behind summary views

## Implementation Pattern (from Orders)

### Files to Create/Modify

- Extend `client/src/components/spreadsheet-native/InventorySheetPilotSurface.tsx`
- Create field policy map for editable inventory fields
- Add CSS cues for editable/locked cells (reuse pattern from `index.css`)
- Add affordances array and keyboard hints
- Wire into `InventoryWorkspacePage.tsx` via SheetModeToggle

### Reusable from Orders

- `PowersheetGrid` with surfaceId, requirementIds, affordances
- `WorkSurfaceStatusBar` + `KeyboardHintBar`
- `PowersheetFieldPolicy` pattern for editable/locked fields
- Platform-detected keyboard hints (`isMac` pattern)
- Toast feedback for blocked edits

### Inventory-Specific Concerns

- Status changes need a dropdown cell editor, not direct text edit
- Quantity adjustments need a reason — this may need a dialog, not inline edit
- Bulk operations need multi-row selection → action bar pattern
- Dashboard stats should stay visible (not hidden in a collapsed section)
- The inspector panel pattern from Orders applies to batch detail

## Acceptance Criteria (G2 Gate)

1. All 5 mutations are reachable from the sheet-native surface
2. All 3 queries render data in the grid
3. Search, filter, sort all work
4. Bulk select + bulk status change works
5. Export CSV works
6. Keyboard navigation works (arrow keys, Cmd+K)
7. Editable/locked cell CSS cues visible
8. Affordance matrix renders correctly
9. Classic fallback toggle works via SheetModeToggle
10. `pnpm check`, `pnpm lint`, `pnpm test`, `pnpm build` all pass

## Verification Commands

```bash
pnpm vitest run client/src/components/spreadsheet-native/InventorySheetPilotSurface.test.tsx
pnpm check
pnpm lint
pnpm test
pnpm build
```

## Risk

- **HIGH**: InventoryWorkSurface is 97KB. Many capabilities are deeply nested in conditional rendering. The extraction found 52 items but there may be edge cases in batch detail views, transfer dialogs, etc.
- **MEDIUM**: Status change UX differs between classic (dropdown in inspector) and sheet-native (inline cell editor). Need to decide which pattern to use.
- **LOW**: Dashboard stats display may need a separate summary section above the grid.
