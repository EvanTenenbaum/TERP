# Work Surface Execution Plan - Phase 2

> **Purpose**: Complete all remaining UXS roadmap tasks with validation gates
> **Created**: 2026-01-20
> **Status**: EXECUTING

## Sprint Overview

| Sprint | Tasks | Focus | Gate |
|--------|-------|-------|------|
| Sprint 4 | UXS-302, UXS-402, UXS-502 | Remaining Work Surfaces | Gate 4 |
| Sprint 5 | UXS-601, UXS-602, UXS-603 | Hardening + Regression | Gate 5 |
| Sprint 6 | UXS-701, UXS-707 | Infrastructure | Gate 6 |
| Sprint 7 | UXS-801, UXS-802, UXS-803 | Quality + Performance | Gate 7 |
| Sprint 8 | UXS-901, UXS-902, UXS-903, UXS-904 | Polish | Gate 8 |

---

## Sprint 4: Remaining Work Surfaces

### UXS-302 — Quotes + Sales Sheet Work Surface
- **Goal**: Align quotes/sales sheets with Work Surface primitives
- **Scope**: Keyboard contract, save state, inspector panel
- **Files**: `SalesSheetCreatorPage.tsx`, `Quotes.tsx`

### UXS-402 — Pick & Pack Work Surface
- **Goal**: Apply Work Surface to fulfillment module
- **Scope**: Bulk selection, action bar, inspector, keyboard
- **Files**: `PickPackPage.tsx`, `PickPackGrid.tsx`

### UXS-502 — Client Ledger Work Surface
- **Goal**: Align Client Ledger with Work Surface contracts
- **Scope**: Keyboard navigation, status bar, entry inspector
- **Files**: `ClientLedger.tsx`

### Gate 4 Validation
- [ ] All 3 Work Surfaces use `useWorkSurfaceKeyboard`
- [ ] All 3 Work Surfaces use `useSaveState`
- [ ] All 3 Work Surfaces have `InspectorPanel`
- [ ] Keyboard contract compliance (arrows, Enter, Esc)
- [ ] Exports updated in index.ts

---

## Sprint 5: Hardening + Regression

### UXS-601 — Modal Audit + Retirement
- **Goal**: Replace core-flow modals with inspector/inline patterns
- **Scope**: Audit modals, create replacement components
- **Target**: VendorCreateDialog, LineItemEditDialog, AdjustmentDialog

### UXS-602 — Golden Flow Regression Suite
- **Goal**: Automated tests for critical flows
- **Scope**: E2E test files for 8 golden flows
- **Files**: `tests-e2e/golden-flows/*.spec.ts`

### UXS-603 — Command Palette Scope Enforcement
- **Goal**: Ensure Cmd+K only performs actions/navigation
- **Scope**: Audit command palette, add tests
- **Files**: `CommandPalette.tsx`, tests

### Gate 5 Validation
- [ ] Modal audit document created
- [ ] At least 3 modals replaced with inspector
- [ ] Golden flow test files exist
- [ ] Cmd+K test coverage

---

## Sprint 6: Infrastructure

### UXS-701 — Responsive Breakpoint System
- **Goal**: Work Surfaces adapt to screen sizes
- **Scope**: Breakpoint hook, responsive shell
- **Breakpoints**: Desktop ≥1280px, Tablet 768-1279px, Mobile <768px

### UXS-707 — Undo Infrastructure
- **Goal**: Consistent undo for destructive actions
- **Scope**: Undo queue, toast with countdown
- **Window**: 10 seconds

### Gate 6 Validation
- [ ] `useBreakpoint` hook exists
- [ ] Work Surface shell responds to breakpoints
- [ ] `useUndo` hook exists
- [ ] Undo toast component exists

---

## Sprint 7: Quality + Performance

### UXS-801 — Accessibility Audit
- **Goal**: WCAG 2.1 AA compliance
- **Scope**: Focus indicators, accessible names, keyboard nav

### UXS-802 — Performance Monitoring
- **Goal**: Track performance budgets
- **Targets**: Grid <100ms, Inspector <50ms, Keystroke <50ms

### UXS-803 — Bulk Operation Limits
- **Goal**: Prevent UI freeze from large operations
- **Limits**: Selection 500, Update 100 per request

### Gate 7 Validation
- [ ] Accessibility checklist documented
- [ ] Performance marks added
- [ ] Bulk limits implemented

---

## Sprint 8: Polish

### UXS-901 — Empty State Components
- **Goal**: Consistent empty states
- **Variants**: No data, no results, error

### UXS-902 — Toast Standardization
- **Goal**: Consistent toast behavior
- **Rules**: Position, stacking, duration

### UXS-903 — Print Stylesheet
- **Goal**: Print-friendly output
- **Scope**: Print media styles

### UXS-904 — Export Functionality
- **Goal**: Consistent export from grids
- **Format**: CSV, with row limits

### Gate 8 Validation
- [ ] Empty state component exists
- [ ] Toast rules documented/implemented
- [ ] Print styles exist
- [ ] Export button component exists

---

## Execution Tracking

| Sprint | Status | Gate Passed |
|--------|--------|-------------|
| Sprint 4 | COMPLETED | ✅ |
| Sprint 5 | PENDING | ⏳ |
| Sprint 6 | PENDING | ⏳ |
| Sprint 7 | PENDING | ⏳ |
| Sprint 8 | PENDING | ⏳ |

---

## Gate 4 Validation Results (2026-01-20)

### UXS-302 — QuotesWorkSurface ✅
- [x] Uses `useWorkSurfaceKeyboard`
- [x] Uses `useSaveState`
- [x] Has `InspectorPanel`
- [x] Keyboard contract compliance
- [x] Exported in index.ts

### UXS-402 — PickPackWorkSurface ✅
- [x] Uses `useWorkSurfaceKeyboard`
- [x] Uses `useSaveState`
- [x] Has `InspectorPanel`
- [x] Keyboard contract compliance
- [x] Exported in index.ts

### UXS-502 — ClientLedgerWorkSurface ✅
- [x] Uses `useWorkSurfaceKeyboard`
- [x] Uses `useSaveState`
- [x] Has `InspectorPanel`
- [x] Keyboard contract compliance
- [x] Exported in index.ts
