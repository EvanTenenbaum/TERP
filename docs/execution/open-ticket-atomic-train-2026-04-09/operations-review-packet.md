# Operations Review Packet

Review scope: `TER-1109` through `TER-1128`

## Ticket list

- `TER-1109` Wire badge map into OrdersWorkSurface payment status badges
- `TER-1110` Add overdue/blocked row-level visual distinction
- `TER-1111` Consolidate inspector Quick Actions into primary + overflow
- `TER-1112` Add Due Date column and verify orders table columns at 1280px
- `TER-1113` Set default sort to prioritize actionable orders
- `TER-1114` Add exception indicator to inventory view
- `TER-1115` Couple summary/status bar to active tab state
- `TER-1116` Verify intake rows show direct vs PO-linked distinction
- `TER-1117` Verify classic/sheet-native modes not both visible
- `TER-1118` Make ETA column always visible in PO table
- `TER-1119` Add receiving status column to PO table
- `TER-1120` Add overdue PO row-level visual distinction
- `TER-1121` Handle redirect tabs visibly in Procurement workspace
- `TER-1122` Fix ClientProfilePage role badges to use semantic colors
- `TER-1123` Add "last activity" column to client table
- `TER-1124` Add "status" column to client table
- `TER-1125` Verify scroll/filter preservation on table→profile navigation
- `TER-1126` Add financial period to workspace header meta
- `TER-1127` Replace plain-text loading states with table-shaped skeletons
- `TER-1128` Verify summary dashboard cards reflect active filters

## Shared verification evidence

- `pnpm vitest run client/src/components/work-surface/OrdersWorkSurface.visibility.test.tsx client/src/components/spreadsheet-native/InventoryManagementSurface.test.tsx client/src/components/spreadsheet-native/PurchaseOrderSurface.test.tsx client/src/components/spreadsheet-native/PilotSurfaceBoundary.test.tsx client/src/pages/ConsolidatedWorkspaces.test.tsx client/src/pages/AccountingWorkspacePage.test.tsx client/src/components/relationships/RelationshipRoleBadge.test.tsx client/src/components/work-surface/ClientsWorkSurface.test.tsx client/src/pages/accounting/AccountingDashboard.test.tsx client/src/components/spreadsheet-native/IntakePilotSurface.test.tsx client/src/pages/ClientProfilePage.test.tsx`
  - result: passed (`90` tests across `11` files)
- `pnpm vitest run client/src/components/work-surface/ClientsWorkSurface.test.tsx client/src/pages/accounting/AccountingDashboard.test.tsx client/src/pages/ConsolidatedWorkspaces.test.tsx`
  - result: passed (`35` tests across `3` files)
- `pnpm lint`
  - result: passed
- `pnpm check`
  - result: passed
- `pnpm build`
  - result: passed
- `PLAYWRIGHT_BASE_URL=http://127.0.0.1:3001 SKIP_E2E_SETUP=1 pnpm playwright test tests-e2e/deep/april-09-ui-regressions.spec.ts --project=deep --config=playwright.worktree.config.ts`
  - result: passed (`10` tests across `1` file)
- `PLAYWRIGHT_BASE_URL=http://127.0.0.1:3001 SKIP_E2E_SETUP=1 pnpm playwright test tests-e2e/deep/april-09-ui-regressions.spec.ts --project=deep-webkit --config=playwright.worktree.config.ts`
  - result: passed (`10` tests across `1` file)
- `PLAYWRIGHT_BASE_URL=http://127.0.0.1:3001 SKIP_E2E_SETUP=1 pnpm playwright test tests-e2e/deep/april-09-ui-regressions.spec.ts --project=deep-firefox --config=playwright.worktree.config.ts`
  - result: passed (`10` tests across `1` file)
- `pnpm vitest run server/routers/payments.test.ts client/src/components/work-surface/OrdersWorkSurface.visibility.test.tsx client/src/components/work-surface/ClientsWorkSurface.test.tsx`
  - result: passed (`25` passed, `11` skipped across `3` files)
- `pnpm vitest run server/routers/payments.test.ts --reporter=verbose`
  - result: the `11` skipped tests are all inside `describe.skip("Payments Router - Transaction Rollback", ...)` at `server/routers/payments.test.ts:98`
  - reviewer note: the skipped cases are rollback/error-path coverage, not the active status-validation assertions that cover `recordPayment`; there is still no explicit unit coverage yet for the new linked-order sync in the void and multi-invoice flows
- `docs/execution/open-ticket-atomic-train-2026-04-09/runtime-ui-checks.mjs`
  - reviewer note: helper is hardened with session probes, AP narrowing, procurement proof-row cleanup, and 429 backoff, but fresh `runtime-ui-checks.json` regeneration is currently environment-blocked by local 429 pressure and should not be used as scored proof for this packet
- dedicated post-fix `TER-1110` note:
  - the sales warning-row Playwright proof now asserts invoice `PARTIAL`, linked order `saleStatus=PARTIAL`, and live row warning classes, but a clean rerun against the fresh local `:3002` app is still environment-blocked by auth/startup instability during restart windows

## Per-ticket browser assertion index

- `TER-1109`: `defaults sales to most actionable sorting with semantic payment badges` (`tests-e2e/deep/april-09-ui-regressions.spec.ts:650-710`) proves the live first-row payment badge uses the semantic status token class.
- `TER-1110`: `renders partial-payment sales rows with a warning tint in the live table` (`tests-e2e/deep/april-09-ui-regressions.spec.ts:923-965`) is the dedicated browser proof path; it creates or reuses a warning-state order, verifies invoice `PARTIAL`, verifies linked order `saleStatus=PARTIAL`, and checks the live row warning classes. The fresh-app rerun of this strengthened proof is currently blocked by local `:3002` auth/startup instability, so the packet still weighs the existing unit proof heavily.
- `TER-1111`: `keeps sales quick actions split between primary buttons and overflow` (`tests-e2e/deep/april-09-ui-regressions.spec.ts:629-648`) proves the live inspector still splits primary actions and overflow.
- `TER-1112`: `keeps actionable sales columns visible at 1280px` (`tests-e2e/deep/april-09-ui-regressions.spec.ts:599-627`) proves `Due Date` and `Payment` stay visible without horizontal overflow.
- `TER-1113`: `defaults sales to most actionable sorting with semantic payment badges` (`tests-e2e/deep/april-09-ui-regressions.spec.ts:650-710`) proves the live first visible order matches computed actionable priority.
- `TER-1114`: `shows live inventory exception counts and preserves the direct intake vs PO split` (`tests-e2e/deep/april-09-ui-regressions.spec.ts:729-782`) proves a visible `Low stock (n)` exception control appears in the live inventory workspace.
- `TER-1115`: `shows live inventory exception counts and preserves the direct intake vs PO split` (`tests-e2e/deep/april-09-ui-regressions.spec.ts:729-782`) proves the visible-batches badge and filtered status-bar totals stay coupled after the low-stock filter is applied.
- `TER-1116`: `shows live inventory exception counts and preserves the direct intake vs PO split` (`tests-e2e/deep/april-09-ui-regressions.spec.ts:729-782`) proves `Direct Intake` and `PO-linked receiving` stay visually distinct across the intake/receiving tabs.
- `TER-1117`: `keeps direct-intake surfaces mutually exclusive in the live runtime` (`tests-e2e/deep/april-09-ui-regressions.spec.ts:784-816`) proves direct-intake mutual exclusion with explicit `intake-pilot-surface` vs `direct-intake-surface` browser assertions.
- `TER-1118`: `shows procurement row-level receiving context when the queue has a confirmed PO` (`tests-e2e/deep/april-09-ui-regressions.spec.ts:997-1042`) proves `Est. Delivery` stays visible on a live receiving row.
- `TER-1119`: `shows procurement row-level receiving context when the queue has a confirmed PO` (`tests-e2e/deep/april-09-ui-regressions.spec.ts:997-1042`) proves the live receiving queue renders the `Receiving` status column.
- `TER-1120`: `shows procurement row-level receiving context when the queue has a confirmed PO` (`tests-e2e/deep/april-09-ui-regressions.spec.ts:997-1042`) proves the seeded overdue PO row renders warning styling in the live queue.
- `TER-1121`: `shows procurement row-level receiving context when the queue has a confirmed PO` (`tests-e2e/deep/april-09-ui-regressions.spec.ts:996-1041`) proves `/purchase-orders?tab=receiving` renders the visible `Open Operations` handoff before any confirmed PO seed is created.
- `TER-1122`: `renders semantic relationship role badge classes on a live client profile` (`tests-e2e/deep/april-09-ui-regressions.spec.ts:815-835`) proves live client-profile role badges use semantic token classes.
- `TER-1123`: `preserves relationships search and scroll after profile navigation` (`tests-e2e/deep/april-09-ui-regressions.spec.ts:713-812`) proves the live relationships table shows the `Last Activity` column before navigation.
- `TER-1124`: `preserves relationships search and scroll after profile navigation` (`tests-e2e/deep/april-09-ui-regressions.spec.ts:713-812`) proves the live relationships table shows the `Status` column before navigation.
- `TER-1125`: `preserves relationships search and scroll after profile navigation` (`tests-e2e/deep/april-09-ui-regressions.spec.ts:713-812`) proves search persistence plus near-exact scroll restoration after browser back navigation.
- `TER-1126`: `keeps the authenticated session healthy across the operations browser proof flow` (`tests-e2e/deep/april-09-ui-regressions.spec.ts:1167-1189`) proves `Financial period` is visible in the live accounting workspace header.
- `TER-1127`: `shows a table-shaped accounting skeleton while finance surfaces are still loading` (`tests-e2e/deep/april-09-ui-regressions.spec.ts:1130-1161`) proves the live accounting surface renders a table-shaped skeleton with five rows.
- `TER-1128`: `returns accounting dashboard to global state after filtered navigation clears` (`tests-e2e/deep/april-09-ui-regressions.spec.ts:838-994`) proves filtered AR/AP cards reflect route filters and includes the inline narrowing assertion that filtered overdue AP bills stay below the global overdue total before filters clear.

## Key code evidence

### TER-1109 through TER-1113

- `client/src/components/work-surface/OrdersWorkSurface.tsx`
  - lines 856-860: inspector quick actions are sorted by priority and split into primary vs overflow groups
  - lines 1031-1087: inspector renders primary actions first and moves remaining actions into `More Actions`
  - lines 1165-1166: default `sortKey` initializes to `actionable`
  - lines 1376-1416: actionable sort prioritizes overdue and partial-payment orders before older/newer fallbacks
  - lines 2109-2124: confirmed-order rows gain destructive/warning tinting for overdue and partial-payment states
  - lines 2137-2144: table renders `Due Date` and semantic payment badge cells
  - lines 2063-2070: confirmed-order table headers include `Due Date` and `Payment`
- `client/src/components/work-surface/OrdersWorkSurface.visibility.test.tsx`
  - lines 305-311: direct assertion for `Due Date`, semantic overdue payment badge, and formatted due date visibility
  - lines 313-334: direct assertion for overdue and partial-payment row-level warning styling
  - lines 336-368: direct assertion that only two primary quick actions stay visible while additional actions move into overflow
  - lines 370-390: direct assertion that the default confirmed-orders sort keeps the most actionable order first
- `tests-e2e/deep/april-09-ui-regressions.spec.ts`
  - lines 599-627: real-browser proof that `Due Date` and `Payment` stay visible at `1280px` with no horizontal overflow
  - lines 629-648: real-browser proof that sales inspector actions still split into primary buttons plus `More Actions` overflow
  - lines 650-710: real-browser proof that the first visible confirmed order matches the computed `Most actionable` priority and that its payment badge uses the semantic status token class
  - lines 620-679: proof helper now creates a real partial-payment sales order, verifies the linked invoice becomes `PARTIAL`, and verifies the linked order `saleStatus` also becomes `PARTIAL`
  - lines 923-965: dedicated live-row warning-tint assertion for the partial-payment order
- `server/routers/payments.ts`
  - lines 120-154: helper maps invoice payment status back onto linked order `saleStatus`
  - lines 426-434: single-invoice payment recording now syncs linked orders
  - lines 940-948: multi-invoice allocations now sync linked orders
  - lines 1417-1425 and 1461-1469: payment void flows now sync linked orders back to their correct post-void state

### TER-1114 through TER-1117

- `client/src/components/spreadsheet-native/InventoryManagementSurface.tsx`
  - lines 878-889: visible-unit / visible-value / low-stock / quarantine counts derive from the currently filtered rows
  - lines 925-978: toolbar exposes visible-batch metrics plus low-stock and quarantine exception indicators
  - lines 893-914: status bar reports the active view and filtered row counts instead of global-only totals
- `client/src/components/spreadsheet-native/InventoryManagementSurface.test.tsx`
  - lines 252-258: direct assertion that only low-stock rows surface the low-stock exception control
  - lines 307-313: direct assertion that reactive exception indicators render in the toolbar
  - lines 361-372: direct assertion that status-bar row counts update when the low-stock exception filter becomes active
- `tests-e2e/deep/april-09-ui-regressions.spec.ts`
  - lines 729-782: real-browser proof that the inventory workspace cycles live status filters until a visible `Low stock (n)` exception control appears, asserts the visible-batches badge and filtered status-bar totals stay coupled, then switches from `Direct Intake` to `Product Intake` to keep `PO-linked receiving` separate from direct intake
  - lines 784-816: dedicated real-browser proof that exactly one direct-intake surface is present in the live runtime by asserting `intake-pilot-surface` vs `direct-intake-surface`
- `client/src/pages/InventoryWorkspacePage.tsx`
  - lines 129-156: workspace metadata distinguishes active lane and direct-intake vs PO-linked receiving split
  - lines 190-197: direct intake sheet-native surface is isolated to the `intake` panel
- `client/src/pages/ConsolidatedWorkspaces.test.tsx`
  - lines 242-249: direct assertions for inventory metadata including `Receiving split`
  - lines 273-283: direct assertion that switching from `intake` to `receiving` updates the workspace metadata from `Direct intake` to `PO-linked receiving`
  - lines 298-305: direct DOM exclusion proof that classic intake renders without `Intake Pilot Surface`
  - lines 307-313: direct DOM exclusion proof that sheet-native intake renders without `Direct Intake Surface`
  - lines 252-261: direct assertion that the unified inventory surface remains singular when pilot mode is enabled
  - lines 285-300: direct assertion that classic direct-intake and sheet-native intake do not render together
  - lines 303-311: direct assertion that shipping only renders the sheet-native fulfillment pilot when enabled
- `client/src/components/spreadsheet-native/IntakePilotSurface.tsx`
  - line 2372: root sheet-native intake surface now exposes `data-testid="intake-pilot-surface"` for direct browser mutual-exclusion checks
  - lines 1688-1702: direct-intake rows now carry a read-only `Source` column that labels them `Direct intake`, keeping them visually distinct from the PO-linked receiving queue
- `client/src/components/work-surface/DirectIntakeWorkSurface.tsx`
  - line 2242: root classic intake surface now exposes `data-testid="direct-intake-surface"` for direct browser mutual-exclusion checks
- `client/src/components/spreadsheet-native/IntakePilotSurface.test.tsx`
  - lines 416-425: direct assertion that intake rows render the `Source` marker as `Direct intake`

### TER-1118 through TER-1121

- `client/src/components/spreadsheet-native/PurchaseOrderSurface.tsx`
  - lines 1638-1658: export and queue column model keep `Est. Delivery` in the operational column set
  - lines 1819-1830: supplier queue cell now labels rows `PO-linked receiving`, keeping the PO queue distinct from direct intake
  - lines 1838-1846: receiving-status column renders semantic badge chrome
  - lines 1858-1867: ETA column is labeled `Est. Delivery` and formats empty vs populated states explicitly
  - lines 2084-2086: overdue purchase orders receive the warning row class `bg-red-50/60 border-l-2 border-red-300`
  - lines 2321-2337: inspector supplier action safely deep-links to the supplier profile when a supplier client id exists
- `client/src/components/spreadsheet-native/PurchaseOrderSurface.test.tsx`
  - lines 782-818: direct assertion that queue columns include ETA and receiving-status fields
  - lines 820-862: direct assertion that receiving status renders as a React badge instead of raw HTML
  - lines 864-899: direct assertion that PO queue rows render `PO-linked receiving` and not `Direct intake`
  - lines 902-928: direct assertion that overdue PO rows get warning styling
  - lines 930-958: direct assertion that inspector links navigate to the supplier profile
- `tests-e2e/deep/april-09-ui-regressions.spec.ts`
  - lines 996-1041: real-browser proof first asserts the redirect-context `/purchase-orders?tab=receiving` handoff before any queue seed is created, then separately reuses or creates a tagged confirmed PO and proves the procurement queue renders `Receiving`, `Est. Delivery`, `PO-linked receiving`, and an overdue row class
- `client/src/pages/ProcurementWorkspacePage.tsx`
  - lines 58-95: procurement workspace adds populated meta items and command strip for purchase orders, product intake, and inventory
  - lines 99-116: redirect-context tabs render a visible handoff empty state with `Open Operations`
- `client/src/pages/ConsolidatedWorkspaces.test.tsx`
  - lines 425-442: direct assertions for procurement description, meta items, and command strip
  - lines 445-457: direct assertions for the visible redirect handoff state

### TER-1122 through TER-1125

- `client/src/components/relationships/RelationshipRoleBadge.tsx`
  - lines 10-27: shared relationship role badge routes profile badges through `RELATIONSHIP_ROLE_TOKENS`
- `client/src/components/relationships/RelationshipRoleBadge.test.tsx`
  - lines 7-20: direct assertion that customer and supplier badges render with semantic token classes
- `client/src/pages/ClientProfilePage.tsx`
  - lines 539-542: role badges now render through `RelationshipRoleBadge` instead of generic badge styling
- `client/src/pages/ClientProfilePage.test.tsx`
  - lines 198-210: direct page-level assertion that `Customer` and `Supplier` role badges render with `RELATIONSHIP_ROLE_TOKENS` semantic classes inside the profile header
- `client/src/components/work-surface/ClientsWorkSurface.tsx`
  - lines 216-257: relationship role badges use semantic token classes
  - lines 570-589: relationships surface resolves the actual scrollable ancestor instead of assuming the immediate table wrapper is the scrolling element
  - lines 696-759: table scroll restoration re-applies saved scroll after rows load and retries on history restore events
  - lines 1003-1008: profile navigation stores table scroll state before route change
  - lines 1099-1102: clients table now includes `Status` and `Last Activity` columns
  - lines 1162-1175: status badge and last-activity cell render per row
  - lines 1193-1203: orders-count action deep-links into Sales orders filtered by `clientId`
- `client/src/components/work-surface/ClientsWorkSurface.test.tsx`
  - lines 165-176: direct assertion that the relationships table renders `Status` and `Last Activity` with formatted values and semantic badge styling
  - lines 179-192: direct assertion that profile navigation stores the current table scroll position before route change
  - lines 195-206: direct assertion that table scroll is restored from session storage after load
  - lines 209-239: direct assertion that scroll restoration retries when the first restore attempt lands before rows are ready
  - lines 245-266: direct assertion that an active search filter persists after profile navigation and component remount
- `tests-e2e/deep/april-09-ui-regressions.spec.ts`
  - lines 713-810: real-browser proof that relationships search survives profile navigation, saved scroll state is persisted in `sessionStorage`, the same scroll container is recovered after browser back navigation, and its `scrollTop` restores within `8px` of the saved value
  - lines 813-833: real-browser proof that a live client profile renders the semantic `Customer` role-badge token class instead of generic badge chrome
- `PLAYWRIGHT_BASE_URL=http://127.0.0.1:3001 SKIP_E2E_SETUP=1 pnpm playwright test tests-e2e/deep/april-09-ui-regressions.spec.ts --project=deep-webkit --config=playwright.worktree.config.ts`
  - WebKit compatibility proof now covers the full ten-test operations browser suite, including live role-badge validation and the tightened default-sort/browser-session checks
- `PLAYWRIGHT_BASE_URL=http://127.0.0.1:3001 SKIP_E2E_SETUP=1 pnpm playwright test tests-e2e/deep/april-09-ui-regressions.spec.ts --project=deep-firefox --config=playwright.worktree.config.ts`
  - Firefox compatibility proof now covers the same ten-test operations browser suite

### TER-1126 through TER-1128

- `client/src/pages/AccountingWorkspacePage.tsx`
  - lines 61-79: workspace metadata includes `Financial period`, `Active lane`, and `Flow`
  - lines 115-173: accounting tabs now use `WorkspacePanelSkeleton` fallbacks instead of plain-text loading copy, with browser-visible skeleton test ids on invoices, bills, and payments
- `client/src/components/spreadsheet-native/PilotSurfaceBoundary.tsx`
  - lines 53-60: suspense loading now renders the passed operational fallback instead of a hardcoded plain-text state, so accounting workspace skeletons actually show at runtime
- `client/src/components/spreadsheet-native/PilotSurfaceBoundary.test.tsx`
  - lines 17-27: direct assertion that the boundary renders the provided fallback while the lazy pilot surface is unresolved
- `client/src/components/ui/operational-states.tsx`
  - lines 126-139: workspace skeleton rows expose stable `data-testid` hooks so browser proof can verify a real table-shaped loading shell instead of static text
- `client/src/pages/accounting/AccountingDashboard.tsx`
  - lines 220-224: dashboard invoice, bill, and payment list queries now inherit active route filters
  - lines 321-346: summary cards recompute AR/AP totals and overdue counts from the filtered working set when filters are active
  - lines 365-386: dashboard header switches between `All accounting activity` and `Filtered accounting activity` and explains which route filters are driving the summary cards
- `client/src/pages/ConsolidatedWorkspaces.test.tsx`
  - lines 460-477: direct assertions for accounting workspace operational metadata and command strip actions
- `client/src/pages/AccountingWorkspacePage.test.tsx`
  - lines 43-68: direct assertions that invoices, bills, and payments loading states all render `WorkspacePanelSkeleton` status shells instead of plain text
- `client/src/pages/accounting/AccountingDashboard.test.tsx`
  - lines 247-253: direct assertions that summary cards stay global with no filters
  - lines 255-266: direct assertions that `clientId` and `status` route filters switch the dashboard into filtered totals
  - lines 268-280: direct assertions that stacked `clientId`, `vendorId`, `status`, `from`, and `to` filters keep the dashboard in filtered mode
  - lines 282-296: direct assertions that the dashboard returns to global totals once route filters clear
- `tests-e2e/deep/april-09-ui-regressions.spec.ts`
  - lines 836-993: real-browser proof that accounting derives filtered AR/AP totals from the same live working-set queries the dashboard uses, seeds a deterministic AP bill, and then matches both filtered and global overdue-count/card states in the live UI after filters clear
  - lines 1163-1183: the accounting browser proof explicitly asserts `filteredApOverdueCount >= 1`, distinct vendors for the proof bills, `overdueBills.pagination.total > 1`, and strict inequality `filteredApOverdueCount < overdueBills.pagination.total`
  - lines 1127-1158: real-browser proof that accounting invoices render a table-shaped skeleton with five visible placeholder rows while the finance surface chunk is intentionally delayed
  - lines 1164-1180: real-browser session-health proof revisits `/accounting` and directly asserts that `Financial period` is visible in the live workspace header

## Reviewer context

- Pre-merge environment note:
  - staging verification is intentionally deferred until this branch lands, because staging tracks `main` directly and cannot truthfully validate unmerged worktree code
  - the next environment gate after local adversarial closure is a staging pass against the deployed main commit
  - staging approver: Evan
  - gate-fail rule:
    - failures on `TER-1117`, `TER-1127`, or `TER-1128` block sprint closure and should trigger revert-or-hotfix triage before the branch is considered closed
    - failures isolated to `TER-1121` or `TER-1125` can be hotfixed without reverting the full tranche if the rest of the staging spot-check remains green
  - mandatory post-merge staging spot-check set: `TER-1110`, `TER-1117`, `TER-1121`, `TER-1125`, `TER-1127`, `TER-1128`
  - local runtime note for `TER-1117`: the latest deep-browser run observed the intake workspace in `classic` mode when no surface toggle was rendered; the live browser proof now asserts mutual exclusion with explicit `direct-intake-surface` vs `intake-pilot-surface` selectors in that state
  - feature-flag explanation for `TER-1117`: `useSpreadsheetPilotAvailability()` returns `sheetPilotEnabled: false` whenever the spreadsheet-native pilot flag is off or not yet supported for the active tab, so the acceptable fallback state is classic-only intake with no pilot surface rendered
  - local fresh-app note for `TER-1110`: while tightening the dedicated browser proof, the fresh local app exposed a real mismatch where invoice payment state advanced to `PARTIAL` but the linked order remained `PENDING`; this is now fixed in `server/routers/payments.ts`, but a clean rerun on the fresh local app is still blocked by restart/auth instability rather than by the sales UI logic itself

- `docs/execution/open-ticket-atomic-train-2026-04-09/operations-runtime-summary.md`
  - explicit mapping from the strengthened ten-test Playwright suite and the current runtime-lane limitation into the operations tickets `TER-1109` through `TER-1128`
- `docs/execution/open-ticket-atomic-train-2026-04-09/runtime-ui-checks.mjs`
  - runtime helper now contains the missing hardening Claude asked for: session probes around the operations block, AP narrowing checks, procurement proof-row cleanup, and 429 backoff
  - fresh runtime JSON regeneration is currently blocked by local `429` rate limiting after the exhaustive browser runs, so the failed regenerated JSON should not be used as a scored proof artifact for this pass
  - until regeneration is unblocked, treat `TER-1110`, `TER-1117`, and `TER-1128` as requiring the mandatory post-merge staging spot-check above rather than relying on runtime-json corroboration
- `docs/execution/open-ticket-atomic-train-2026-04-09/runtime-ui-checks.mjs`
  - lines 130-189: runtime script now uses authenticated tRPC helpers to reuse or create a tagged confirmed overdue procurement row and redact volatile relationship client IDs
  - lines 352-415: runtime helper now establishes a real browser session, probes `/api/auth/me`, and retries protected tRPC calls under 429 pressure
  - lines 839-948: runtime pass now requires AP narrowing instead of allowing vacuous filtered-vs-global equality
  - lines 1001-1068: runtime pass now cleans up stale tagged procurement proof rows before queue assertions

## Reviewer instructions

- Score each of `TER-1109` through `TER-1128`
- Be skeptical when a ticket only has code evidence and lacks direct browser or unit assertions
- Weigh direct browser proof and direct unit assertions most heavily; treat the hardened runtime helper as secondary corroboration until fresh JSON regeneration is unblocked
- Return exactly one entry per ticket
- If any ticket is below `95`, list only the atomic upgrade actions needed to reach `95`
