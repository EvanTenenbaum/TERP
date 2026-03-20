# W1B: Sales Sheets Sheet-Native Implementation Brief

## Module

Sales Sheets — lightweight compared to other modules (20KB, 8 extracted capabilities)

## Readiness

- Detailed capability ledger: EXISTS (`docs/specs/spreadsheet-native-ledgers/sales-sheets-capability-ledger.csv`, 6 rows)
- Extraction CSV: EXISTS (`docs/specs/spreadsheet-native-ledgers/extracted/sales-sheets-capabilities.csv`, 8 rows)
- Cross-check: 2/2 mutations, 5/5 queries — 100% extraction accuracy
- Figma golden flow: `docs/design/spreadsheet-native-golden-flows-2026-03-18/sales-sheet.svg`
- Pilot surface: DOES NOT EXIST (new build)

## Classic Capabilities to Preserve

### Mutations (2)

1. `salesSheets.upsertDraft` — Save/update draft sales sheet
2. `salesSheets.deleteDraft` — Delete draft sales sheet

### Queries (5)

1. `salesSheets.getDraft` — Load draft for editing
2. `salesSheets.getSavedViews` — List saved view configurations
3. `salesSheets.getInventory` — Inventory data for browser
4. `salesSheets.getSharedLink` — Get share URL
5. `salesSheets.getHistory` — Version history

### Other

1. Export/download functionality

## Figma Direction (from Launch Matrix)

- `Adopt`: browser + preview split and spreadsheet-native review feel
- `Adapt`: conversion CTA logic must reflect real save/dirty state
- `Preserve`: saved views, draft restore, share-link generation, quote conversion path
- `Reject`: any design that implies immediate conversion from unsaved state

## Implementation Pattern

### Files to Create

- `client/src/components/spreadsheet-native/SalesSheetsPilotSurface.tsx`
- Wire into sales workspace via SheetModeToggle

### Key Design Decisions

- Sales sheets are primarily a READ surface with draft editing — editable fields are limited
- The browser + preview split is the core interaction model
- Dirty-state MUST block share/convert actions (critical preservation)
- Convert-to-order seeds OrderCreatorPage via route params (already proven in Orders)

## Acceptance Criteria

1. Draft create/edit/delete works
2. Inventory browser renders
3. Preview renders alongside browser
4. Saved views load and apply
5. Share link generation works (blocked by dirty state)
6. Convert-to-order navigates to OrderCreatorPage with correct params
7. Export/download works
8. Classic fallback toggle works
9. All verification commands pass

## Risk

- **LOW**: Small surface, well-understood patterns
- **MEDIUM**: The browser + preview split may need a different grid layout than the queue + support pattern from Orders
