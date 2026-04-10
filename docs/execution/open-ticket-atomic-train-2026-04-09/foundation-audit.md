# Foundation Audit

## TER-1093 — Canonical operational empty-state component

Canonical operational empty-state entrypoints:
- `client/src/components/ui/operational-states.tsx`
- `client/src/components/ui/operational-empty-state.tsx`

Shared operational empty-state behavior is now reused in:
- `client/src/components/ui/DataTable.tsx`
- `client/src/components/ui/responsive-table.tsx`
- `client/src/pages/SearchResultsPage.tsx`
- `client/src/pages/ProcurementWorkspacePage.tsx`
- `client/src/components/work-surface/ClientsWorkSurface.tsx`

The component now carries the shared operator-facing shape:
- contextual copy for empty vs filtered/search states
- optional recovery actions
- a consistent dashed operational card shell instead of ad hoc empty copy

## TER-1094 — Workspace transition skeleton fidelity

Transition skeleton implementation:
- `client/src/components/layout/LinearWorkspaceShell.tsx`
- `client/src/components/ui/operational-states.tsx`

The workspace transition path now renders a content-shaped shell instead of abruptly swapping content:
- `LinearWorkspaceShell` shows `WorkspacePanelSkeleton` for `180ms` after tab switches
- the transition shell exposes `data-testid="workspace-transition-skeleton"` for direct verification
- the skeleton uses operational hierarchy cues (`eyebrow`, title, meta/cards/table placeholders) instead of generic spinners or flat bars

Direct verification coverage:
- `client/src/components/layout/LinearWorkspaceShell.test.tsx`
  - proves the transition skeleton appears during tab switches
  - proves it clears after the transition window and reveals the new panel content

## TER-1095 — Canonical operational status badge audit

- Canonical helper: `client/src/lib/statusBadge.ts`
- Active-state mapping intentionally stays on the design-system `default` badge variant; the audit distinguishes routed helper usage from hardcoded `variant="default"` call sites rather than expecting the rendered variant string itself to disappear
- Covered active/working states: `ACTIVE`, `AVAILABLE`, `CONFIRMED`, `IN_PROGRESS`, `LIVE`, `READY`, `READY_FOR_PACKING`, `SENT`, `TRIGGERED`, `VIEWED`, `WORKING`
- Covered planned/passive states: `CANCELLED`, `DRAFT`, `ENDED`, `NEW`, `ON_BREAK`, `PAUSED`, `PENDING`, `SCHEDULED`, `UNSENT`
- Covered risk states: `BLOCKED`, `CRITICAL`, `OVERDUE`, `QUARANTINED`, `VOID`
- Covered completed states: `COMPLETED`, `COMPLETE`, `CONVERTED`, `DELIVERED`, `PAID`, `RECEIVED`

Operational status badge call sites now routed through the helper:
- `client/src/pages/PhotographyPage.tsx`
- `client/src/pages/TimeClockPage.tsx`
- `client/src/pages/LiveShoppingPage.tsx`
- `client/src/components/vip-portal/LiveCatalogConfig.tsx`
- `client/src/components/vip-portal/LiveCatalog.tsx`

Reviewed remaining literal `Badge variant="default"` call sites and classified them as intentionally non-operational:
- numeric or selection tags: `MatchmakingServicePage`, `AddClientWizard`, `MarginInput`
- decorative chips and non-status affordances: `PhotographyModule`, `CreditLimitWidget`
- permission / role taxonomy badges rather than operational state badges: `RoleManagement`, `MobileClientCard`
- discount labels: `CogsClientSettings`

## TER-1096 — Generic empty-state audit

Canonical operational empty-state entrypoints:
- `client/src/components/ui/operational-states.tsx`
- `client/src/components/ui/operational-empty-state.tsx`

Shared empty-state surfaces now use canonical empty-state components:
- `client/src/components/ui/DataTable.tsx`
- `client/src/components/ui/responsive-table.tsx`
- `client/src/pages/SearchResultsPage.tsx`
- `client/src/pages/ProcurementWorkspacePage.tsx`
- `client/src/components/work-surface/ClientsWorkSurface.tsx`

Reviewed remaining raw `"No data"` / `"No results"` strings and classified them as intentional:
- command palette and mention search empty slots
- accounting report copy that explains data absence inside report cards
- export toasts
- analytics helper comments and preset labels inside `empty-state.tsx`

## TER-1097 — Raw ISO display audit

Canonical display formatter already existed and is now the required path:
- `client/src/lib/dateFormat.ts`
- `client/src/lib/utils.ts`

Direct raw-date display fixes landed in visible grid surfaces:
- `client/src/components/spreadsheet-native/BankTransactionsSurface.tsx`
- `client/src/components/spreadsheet/PickPackGrid.tsx`
- `client/src/components/spreadsheet-native/FiscalPeriodsSurface.tsx`

Reviewed remaining `toISOString()` UI hits and classified them as non-display normalization:
- form defaults / input values
- grid row normalization before later formatter application
- exports, downloads, telemetry, local-storage timestamps, and React keys
- server mutation payload shaping
