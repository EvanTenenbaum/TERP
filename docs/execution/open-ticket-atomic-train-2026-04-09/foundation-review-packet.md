# Foundation Review Packet

Review scope: `TER-1092` through `TER-1097`

## Ticket list

- `TER-1092` Create canonical status→badge-variant map
- `TER-1093` Create operational empty state component
- `TER-1094` Improve workspace transition skeleton
- `TER-1095` Audit and fix all `variant="default"` on operational status badges
- `TER-1096` Audit and fix generic empty states
- `TER-1097` Audit for raw ISO timestamp display

## Shared implementation summary

- Canonical status helper exists in `client/src/lib/statusBadge.ts`
- Helper coverage tests exist in `client/src/lib/statusBadge.test.ts`
- Canonical operational empty/loading primitives exist in:
  - `client/src/components/ui/operational-states.tsx`
  - `client/src/components/ui/operational-empty-state.tsx`
- Shared `ResponsiveTable` now renders `OperationalEmptyState` instead of a plain `<p>` fallback
- Raw display-date cleanup now relies on the existing shared formatter in:
  - `client/src/lib/dateFormat.ts`
  - `client/src/lib/dateFormat.test.ts`
- Remaining raw operational `Badge variant="default"` status usages in live catalog surfaces were routed through the helper

## Key code evidence

### TER-1092

- `client/src/lib/statusBadge.ts`
  - maps active states to `default`
  - now explicitly documents that audits should distinguish routed helper usage from hardcoded literal `variant="default"` call sites
  - maps passive states to `secondary`
  - maps risk states to `destructive`
  - maps completed states to `outline`
  - includes `TRIGGERED`
- `client/src/lib/statusBadge.test.ts`
  - verifies `active`, `READY_FOR_PACKING`, `triggered`, `draft`, `scheduled`, `overdue`, `blocked`, `completed`, `paid`, unknown fallback

### TER-1093

- `client/src/components/ui/operational-states.tsx`
  - exports `OperationalEmptyState`
  - supports `searchActive`, `filterActive`, action buttons, and canonical dashed-card empty state shell
- `client/src/components/ui/operational-empty-state.tsx`
  - compatibility export entrypoint
- `client/src/components/ui/operational-states.test.tsx`
  - verifies contextual filter badge rendering and action handling
- `docs/execution/open-ticket-atomic-train-2026-04-09/foundation-audit.md`
  - documents the canonical empty-state entrypoints plus the shared operational surfaces now using them

### TER-1094

- `client/src/components/layout/LinearWorkspaceShell.tsx`
  - lines 33-50: workspace tab transitions now render a content-shaped `WorkspacePanelSkeleton` via `LinearWorkspaceTransitionSkeleton`
  - lines 102-114: active-tab changes hold the transition skeleton for `180ms` instead of hard-swapping content
- `client/src/components/layout/LinearWorkspaceShell.test.tsx`
  - lines 14-61: direct assertion that the transition skeleton appears while switching tabs and then clears to reveal the new panel content
  - the test uses `vi.useFakeTimers()` plus `vi.advanceTimersByTime(181)` to make the 180ms transition deterministic instead of relying on real-time waits
- `client/src/components/ui/operational-states.tsx`
  - exports `WorkspacePanelSkeleton`
  - provides structured header/meta/cards/table skeleton
- `docs/execution/open-ticket-atomic-train-2026-04-09/foundation-audit.md`
  - documents the specific transition-shell improvements and their direct verification path
- `client/src/components/ui/operational-states.test.tsx`
  - verifies structured workspace loading shell renders with `role="status"`

### TER-1095

- `docs/execution/open-ticket-atomic-train-2026-04-09/foundation-audit.md`
  - classifies remaining literal `Badge variant=\"default\"` call sites into operational vs non-operational
  - paired with `docs/execution/open-ticket-atomic-train-2026-04-09/foundation-grep-audit.md` for exact grep command output and classifications
  - operational status badge call sites routed through helper:
    - `client/src/pages/PhotographyPage.tsx`
    - `client/src/pages/TimeClockPage.tsx`
    - `client/src/pages/LiveShoppingPage.tsx`
    - `client/src/components/vip-portal/LiveCatalogConfig.tsx`
    - `client/src/components/vip-portal/LiveCatalog.tsx`
- `client/src/components/vip-portal/LiveCatalogConfig.tsx`
  - `New`, `Reviewed`, `Converted`, `Archived`, `Available`, `Triggered`, and `Active` now call `getStatusBadgeVariant(...)`
- `client/src/components/vip-portal/LiveCatalog.tsx`
  - draft-state and price-drop badges now call `getStatusBadgeVariant(...)`
- `client/src/components/vip-portal/LiveCatalogConfig.test.tsx`
  - verifies submitted interest-list statuses render with semantic badge variants (`New` as secondary, `Converted` as outline)

### TER-1096

- `client/src/components/ui/responsive-table.tsx`
  - empty branch now renders `OperationalEmptyState`
  - includes `data-testid=\"responsive-table-empty-state\"`
- `client/src/components/ui/responsive-table.test.tsx`
  - verifies canonical empty-state rendering and copy
- `docs/execution/open-ticket-atomic-train-2026-04-09/foundation-audit.md`
  - classifies remaining `"No data"` / `"No results"` strings as intentional command-palette, report, toast, or preset copy
  - paired with `docs/execution/open-ticket-atomic-train-2026-04-09/foundation-grep-audit.md` for the exact string sweep

### TER-1097

- Existing shared display formatter:
  - `client/src/lib/dateFormat.ts`
  - `client/src/lib/utils.ts`
- `client/src/lib/dateFormat.test.ts`
  - verifies ISO timestamps are formatted for display and invalid values return `N/A`
- `client/src/components/spreadsheet-native/BankTransactionsSurface.tsx`
  - date column now uses `valueFormatter: formatDate(...)`
- `client/src/components/spreadsheet/PickPackGrid.tsx`
  - date column now uses `valueFormatter: formatDate(...)`
- `client/src/components/spreadsheet-native/FiscalPeriodsSurface.tsx`
  - local formatter now defers to shared `formatDate`
- `docs/execution/open-ticket-atomic-train-2026-04-09/foundation-audit.md`
  - classifies remaining `toISOString()` hits as form defaults, export names, telemetry, normalization, or mutation payload shaping rather than raw display
- `docs/execution/open-ticket-atomic-train-2026-04-09/foundation-grep-audit.md`
  - records the exact grep command and the hit-family classification for the remaining `toISOString()` references

## Verification evidence

- `pnpm vitest run client/src/lib/statusBadge.test.ts client/src/lib/dateFormat.test.ts client/src/components/ui/responsive-table.test.tsx client/src/components/spreadsheet-native/InventoryManagementSurface.test.tsx client/src/components/spreadsheet-native/PurchaseOrderSurface.test.tsx client/src/components/work-surface/OrdersWorkSurface.visibility.test.tsx`
  - result: 6 files passed, 45 tests passed
- `pnpm vitest run client/src/components/ui/operational-states.test.tsx client/src/lib/statusBadge.test.ts client/src/lib/dateFormat.test.ts client/src/components/ui/responsive-table.test.tsx`
  - result: 4 files passed, 11 tests passed
- `pnpm vitest run client/src/components/layout/LinearWorkspaceShell.test.tsx client/src/components/ui/operational-states.test.tsx`
  - result: passed (`4` tests across `2` files)
- `pnpm vitest run client/src/components/vip-portal/LiveCatalogConfig.test.tsx client/src/components/ui/operational-states.test.tsx client/src/lib/statusBadge.test.ts client/src/lib/dateFormat.test.ts client/src/components/ui/responsive-table.test.tsx`
  - result: 5 files passed, 12 tests passed
- `pnpm check`
  - result: passed
- `pnpm build`
  - result: passed

## Reviewer instructions

- Score each of `TER-1092` through `TER-1097`
- Be conservative if the audit note feels weaker than code-and-test proof
- Return exactly one entry per ticket
- If any ticket is below `95`, list only the atomic upgrade actions needed to reach `95`
