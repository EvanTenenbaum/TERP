# Codex Handoff: Atomic UX Parity Rollout

## Mission

Execute the **Atomic UX Parity Rollout** plan — wire all production-ready but unused hooks into the 5 core WorkSurface flows so every page reaches the UX quality bar set by DirectIntakeWorkSurface.

## Required Reading

1. **CLAUDE.md** at repo root — read in full before any work
2. **Implementation Plan (V4):** `docs/plans/2026-02-25-atomic-ux-parity-rollout.md` — the single source of truth. Contains:
   - V4 QA Errata (10 critical API corrections — **read these before writing ANY code**)
   - Gap matrix showing exactly which primitives each flow is missing
   - 25 tasks across 4 tiers + cross-cutting, with exact file paths, code snippets, and commit messages
   - Execution order and dependency graph

## Branch & Deployment

- **Work on branch:** `staging`
- **Auto-deploys to:** `https://terp-staging-yicld.ondigitalocean.app`
- **Base from:** `staging` (NOT `main`)

## Linear Issues

All 25 tasks are tracked in Linear under project **"TERP - Golden Flows Beta"**:

| Tier                                 | Issues                  | Scope   |
| ------------------------------------ | ----------------------- | ------- |
| **Tier 1** (Direct Intake polish)    | TER-426 through TER-431 | 6 tasks |
| **Tier 2** (Order Creator migration) | TER-432 through TER-437 | 6 tasks |
| **Tier 3** (Inventory enrichment)    | TER-438 through TER-444 | 7 tasks |
| **Tier 4** (PO + Pick-Pack polish)   | TER-445 through TER-449 | 5 tasks |
| **Cross-cutting**                    | TER-450, TER-451        | 2 tasks |

Mark each issue "In Progress" when starting, "Done" when complete.

## Execution Strategy

Use **subagent-driven development** (skill: `superpowers:subagent-driven-development`):

1. Set up a git worktree from `staging` branch
2. Execute tasks sequentially within each tier (respect dependency graph below)
3. Each task: fresh subagent implements → spec compliance review → code quality review
4. Commit after each task with the commit message specified in the plan

### Dependency Graph (must respect ordering)

```
Tier 1: 1.1 first (establishes undo pattern)
        1.2 before 1.3 (Set-based selection needed for powersheet contracts)
        1.4, 1.5, 1.6 independent

Tier 2: 2.1 first (removes old save state)
        2.3 after 2.1
        2.2 after 2.1 and 2.3 (needs both save state and undo)
        2.4, 2.5, 2.6 independent

Tier 3: 3.1 before 3.2 (filters before saved views)
        3.3–3.6 independent
        3.7 LAST (delete legacy only after all ports done)

Tier 4: All 5 tasks independent (can parallelize)

Cross-cutting: After Tier 1 (needs pattern established)
```

## Critical API Gotchas (from V4 Errata)

These are the 10 most dangerous mistakes an agent will make. They are all validated against actual source:

1. **`useUndo`**: Call `registerAction()`, NOT `pushUndo()`. Always use `{ enableKeyboard: false }` to prevent Cmd+Z dual-listener with `useWorkSurfaceKeyboard`.
2. **`SaveStateIndicator`**: It's a `ReactNode`, NOT a component. Use `{SaveStateIndicator}` in JSX, NOT `<SaveStateIndicator />`.
3. **`usePowersheetSelection`**: REQUIRES `visibleIds` option. `toggle(id, checked)` takes TWO params. `toggleAll(checked)` takes boolean, NOT array.
4. **`useValidationTiming`**: Zod schema is REQUIRED, not optional.
5. **`customHandlers` keys**: Format is `'cmd+s'` / `'ctrl+s'`. There is NO `'mod+s'` prefix.
6. **Powersheet contracts**: All use `Set<string>` for `selectedRowIds`. Use `usePowersheetSelection<string>` throughout.
7. **`WorkSurfaceStatusBarProps`**: NOT exported. Pass props directly to the component.
8. **`useExport`**: No `ExportProgress` component exists — only the type. Build simple progress UI if needed.
9. **IntakeGrid**: ORPHANED (zero imports) — just delete, don't deprecate.
10. **Legacy Inventory.tsx**: DEAD CODE — `/inventory` already routes to `InventoryWorkSurface` via `InventoryWorkspacePage`.

## Key File Map

### Files You'll Modify

| File                                                               | Lines | Tier   |
| ------------------------------------------------------------------ | ----- | ------ |
| `client/src/components/work-surface/DirectIntakeWorkSurface.tsx`   | 2,093 | Tier 1 |
| `client/src/pages/OrderCreatorPage.tsx`                            | 945   | Tier 2 |
| `client/src/components/work-surface/InventoryWorkSurface.tsx`      | ~800  | Tier 3 |
| `client/src/components/work-surface/PurchaseOrdersWorkSurface.tsx` | 1,520 | Tier 4 |
| `client/src/components/work-surface/PickPackWorkSurface.tsx`       | ~600  | Tier 4 |

### Files You'll Delete

| File                                               | Lines | Why                           |
| -------------------------------------------------- | ----- | ----------------------------- |
| `client/src/components/spreadsheet/IntakeGrid.tsx` | 803   | Zero imports (orphaned)       |
| `client/src/pages/Inventory.tsx`                   | 1,462 | Dead code (after Tier 3 port) |

### Hook Reference (all in `client/src/hooks/work-surface/`)

| Hook                         | Key Export                                            | Current Consumers |
| ---------------------------- | ----------------------------------------------------- | ----------------- |
| `useUndo.tsx`                | `useUndo`, `UndoProvider`, `UndoToast`                | 0                 |
| `useSaveState.tsx`           | `useSaveState` → `{ SaveStateIndicator }` (ReactNode) | 4                 |
| `useValidationTiming.ts`     | `useValidationTiming`                                 | 1                 |
| `usePowersheetSelection.ts`  | `usePowersheetSelection<T>` (Set-based)               | 3                 |
| `useExport.ts`               | `useExport<T>` → `{ exportCSV, exportExcel }`         | 0                 |
| `useWorkSurfaceKeyboard.tsx` | `useWorkSurfaceKeyboard`                              | 4                 |
| `useBulkOperationLimits.tsx` | `useBulkOperationLimits`, `BulkProgress`              | 0                 |
| `usePerformanceMonitor`      | `usePerformanceMonitor`                               | 0                 |
| `useConcurrentEditDetection` | `useConcurrentEditDetection`                          | 3                 |

### Shared Components

| Component                | Location                                           | Notes                  |
| ------------------------ | -------------------------------------------------- | ---------------------- |
| `WorkSurfaceStatusBar`   | `components/work-surface/WorkSurfaceStatusBar.tsx` | Props NOT exported     |
| `InspectorPanel`         | `components/work-surface/InspectorPanel.tsx`       | Used by 4 surfaces     |
| `LinearWorkspaceShell`   | `components/layout/LinearWorkspaceShell.tsx`       | 107 lines, wraps pages |
| `linear-workspace-*` CSS | `index.css` lines 218-387                          | Custom CSS convention  |

### Powersheet Library

| Function                | Location                                 |
| ----------------------- | ---------------------------------------- |
| `fillDownSelectedRows`  | `client/src/lib/powersheet/contracts.ts` |
| `duplicateSelectedRows` | `client/src/lib/powersheet/contracts.ts` |
| `deleteSelectedRows`    | `client/src/lib/powersheet/contracts.ts` |

All take single object arg: `{ rows, selectedRowIds: Set<string>, getRowId, ... }`

## Routing Map (validated)

| Route                           | Component                                                | Shell                           |
| ------------------------------- | -------------------------------------------------------- | ------------------------------- |
| `/inventory`                    | `InventoryWorkspacePage` → `InventoryWorkSurface`        | `LinearWorkspaceShell` (3 tabs) |
| `/orders/create`, `/orders/new` | `OrderCreatorPage`                                       | None (standalone)               |
| `/direct-intake`, `/receiving`  | `DirectIntakeWorkSurface`                                | None (manual CSS)               |
| `/purchase-orders`              | `ProcurementWorkspacePage` → `PurchaseOrdersWorkSurface` | `LinearWorkspaceShell` (3 tabs) |
| `/pick-pack`                    | `PickPackWorkSurface`                                    | None (standalone)               |

## Things to NEVER Touch

- **InventoryBrowser** — shared between OrderCreatorPage and SalesSheetCreatorPage. Do NOT change its props/contract.
- **LineItemTable** internal powersheet — it has its own `usePowersheetSelection` + `PowersheetBulkActionContract`. Leave it alone.
- **IntakeReceipts** — separate business process (receipt verification with farmer tokens). NOT part of this plan.
- **SalesSheet bridge** — `sessionStorage.getItem("salesSheetToQuote")` + `?fromSalesSheet=true` URL param in OrderCreator. Preserve exactly.
- **Credit check flow** — `CreditWarningDialog` two-step in OrderCreator. Preserve exactly.
- **Finalization flow** — `isFinalizingRef` in OrderCreator. Preserve exactly.

## Success Criteria

After all 4 tiers, every core flow should have:

- `useWorkSurfaceKeyboard` with discoverable shortcuts
- `useSaveState` + `SaveStateIndicator` (ReactNode)
- `useValidationTiming` with Zod schemas
- `usePowersheetSelection` (rich, Set-based) or equivalent
- `InspectorPanel` for detail editing (where applicable)
- `useUndo` with 10-second recovery window (via `registerAction`)
- `WorkSurfaceStatusBar` with keyboard hints
- `useExport` for CSV download
- `useConcurrentEditDetection` where applicable
- `linear-workspace-*` CSS classes for visual consistency

## Start Here

1. Read `CLAUDE.md`
2. Read the full plan at `docs/plans/2026-02-25-atomic-ux-parity-rollout.md`
3. Check out the `staging` branch
4. Start with **TER-426 (Task 1.1): Wire useUndo into Direct Intake**
5. Follow the subagent-driven-development pattern: implement → spec review → quality review → commit → next task
