# Active Milestone

Milestone 5: close the April 9, 2026 48-ticket train with branch-local runtime proof and adversarial review.

# Decisions
- Corrected scope from the 29 still-open subset to all 48 tickets created on April 9, 2026.
- Preserved the notification tranche as completed local work, but moved the canonical next-wave recommendation to Foundation because of explicit dependencies.
- Used the long-horizon shared-first pass to avoid re-solving status, empty, and shell patterns independently in later surfaces.

# Changes
- Replaced the smaller-scope roadmap with a 48-ticket canonical roadmap
- Added a flat ticket manifest covering all 48 tickets
- Updated the supporting long-horizon state files to the same scope
- Added shared operational-state primitives for empty and loading states
- Expanded canonical status token coverage for orders, purchase orders, and relationship roles
- Strengthened `LinearWorkspaceShell` hierarchy and transition skeleton fidelity
- Strengthened `AppHeader` zone separation
- Populated sales, inventory, procurement, relationships, and accounting workspace shell metadata / command strips
- Replaced accounting plain-text workspace loading fallbacks with table-shaped workspace skeletons
- Added visible procurement redirect handoff states instead of silent redirect-only behavior
- Added relationship semantic role badges plus client-table status / last-activity columns and scroll preservation
- Reorganized order inspector quick actions into primary actions plus overflow
- Coupled inventory toolbar / status summaries to the current filtered view instead of always-global totals
- Added reactive inventory exception indicators for low stock and quarantined batches
- Made PO queue ETA column always visible, added receiving-status column, and added overdue row tinting
- Added client-order deep links from the relationships table into filtered Sales orders
- Verified and hardened the accounting dashboard filtered-summary behavior so both AR and AP cards track the active route-filter working set and return to global totals after filters clear
- Added explicit verification coverage for intake/shipping classic vs sheet-native exclusivity
- Added canonical `statusBadge` helper + audit-backed coverage for operational status badges and replaced remaining literal operational `variant="default"` badge usage in the live catalog surfaces
- Added compatibility export for `operational-empty-state` and replaced the remaining shared generic table empty state in `ResponsiveTable`
- Reused the shared display-date formatter on the remaining raw ISO date grid surfaces and wrote a foundation audit artifact classifying the remaining `toISOString()` hits as non-display normalization
- Fixed the Claude-reviewed defects in `AppHeader`, inventory low-stock exception counting, purchase-order receiving badge rendering, and client-table scroll restoration timing
- Tightened the runtime UI audit so procurement column visibility only passes when a real queue row exists and both new columns are visibly rendered in a 1280px viewport
- Added deterministic procurement proof helpers to the branch-local runtime audit and deep Playwright spec so they reuse a tagged proof row when present and only create/confirm a purchase order when the tagged row is missing
- Added a page-level `ClientProfilePage.test.tsx` proving the profile header now renders semantic relationship role badges through `RelationshipRoleBadge`
- Extended the deep browser suite to cover sales quick-action overflow, filtered accounting AR/AP totals and overdue counts, procurement row-level receiving context, and a real inventory tab-switch path
- Added a real browser accounting-skeleton proof by fixing `PilotSurfaceBoundary` to render the passed suspense fallback and instrumenting the workspace skeleton rows for DOM-visible verification
- Added full WebKit and Firefox passes for the ten-test operations browser suite

# Evidence
- User-provided canonical ticket set covers `TER-1092` through `TER-1139`
- Explicit dependencies captured:
  - `TER-1095` <- `TER-1092`
  - `TER-1096` <- `TER-1093`
  - `TER-1109` <- `TER-1092`
- Notifications tranche proof remains:
  - targeted Vitest run
  - `pnpm check`
  - `pnpm build`
- Shared tranche proof:
  - `pnpm vitest run client/src/components/layout/LinearWorkspaceShell.test.tsx client/src/components/layout/AppHeader.test.tsx client/src/pages/ConsolidatedWorkspaces.test.tsx`
  - `pnpm check`
  - `pnpm build`
- Orders / inventory / procurement / accounting tranche proof:
  - `pnpm vitest run client/src/components/spreadsheet-native/InventoryManagementSurface.test.tsx client/src/components/spreadsheet-native/PurchaseOrderSurface.test.tsx client/src/pages/ConsolidatedWorkspaces.test.tsx client/src/components/work-surface/OrdersWorkSurface.visibility.test.tsx`
  - `pnpm check`
  - `pnpm build`
- Foundation / regression fix proof:
  - `pnpm vitest run client/src/lib/statusBadge.test.ts client/src/lib/dateFormat.test.ts client/src/components/ui/responsive-table.test.tsx client/src/components/spreadsheet-native/InventoryManagementSurface.test.tsx client/src/components/spreadsheet-native/PurchaseOrderSurface.test.tsx client/src/components/work-surface/OrdersWorkSurface.visibility.test.tsx`
  - `pnpm check`
  - `pnpm build`
- Foundation skeleton proof:
  - `pnpm vitest run client/src/components/layout/LinearWorkspaceShell.test.tsx client/src/components/ui/operational-states.test.tsx`
  - result: passed
- Updated operations proof bundle:
  - `pnpm vitest run client/src/components/work-surface/OrdersWorkSurface.visibility.test.tsx client/src/components/spreadsheet-native/InventoryManagementSurface.test.tsx client/src/components/spreadsheet-native/PurchaseOrderSurface.test.tsx client/src/components/spreadsheet-native/PilotSurfaceBoundary.test.tsx client/src/pages/ConsolidatedWorkspaces.test.tsx client/src/pages/AccountingWorkspacePage.test.tsx client/src/components/relationships/RelationshipRoleBadge.test.tsx client/src/components/work-surface/ClientsWorkSurface.test.tsx client/src/pages/accounting/AccountingDashboard.test.tsx client/src/components/spreadsheet-native/IntakePilotSurface.test.tsx client/src/pages/ClientProfilePage.test.tsx`
  - result: `90` tests across `11` files
- Foundation audit artifact:
  - `docs/execution/open-ticket-atomic-train-2026-04-09/foundation-audit.md`
- Branch-local runtime proof:
  - `BASE_URL=http://127.0.0.1:3001 PLAYWRIGHT_BROWSERS_PATH=/Users/evan/Library/Caches/ms-playwright node docs/execution/open-ticket-atomic-train-2026-04-09/runtime-ui-checks.mjs`
  - output written to `docs/execution/open-ticket-atomic-train-2026-04-09/runtime-ui-checks.json`
  - runtime helper now records the tagged procurement seed row, the procurement redirect handoff, the accounting financial-period meta, stable filtered-vs-global accounting invariants with non-zero filtered overdue counts, and redacts volatile `clientId` values in relationship-link evidence
  - unrelated later-route failures remain in `TER-1138` and `TER-1139`; they are outside the operations packet scope and should not be used to score `TER-1109` through `TER-1128`
- Expanded operational browser proof:
  - `PLAYWRIGHT_BASE_URL=http://127.0.0.1:3001 SKIP_E2E_SETUP=1 pnpm playwright test tests-e2e/deep/april-09-ui-regressions.spec.ts --project=deep --config=playwright.worktree.config.ts`
  - `PLAYWRIGHT_BASE_URL=http://127.0.0.1:3001 SKIP_E2E_SETUP=1 pnpm playwright test tests-e2e/deep/april-09-ui-regressions.spec.ts --project=deep-webkit --config=playwright.worktree.config.ts`
  - `PLAYWRIGHT_BASE_URL=http://127.0.0.1:3001 SKIP_E2E_SETUP=1 pnpm playwright test tests-e2e/deep/april-09-ui-regressions.spec.ts --project=deep-firefox --config=playwright.worktree.config.ts`
  - result: `10 passed` in Chromium, `10 passed` in WebKit, `10 passed` in Firefox
- Runtime-lane hardening:
  - `runtime-ui-checks.mjs` now includes session probes, AP narrowing invariants, procurement proof-row cleanup, and 429 backoff
  - fresh runtime JSON regeneration is currently blocked by local `429` rate limiting after the exhaustive browser runs, so the browser suite is the primary current proof artifact for adversarial rescoring
- Late-stage self-heal:
  - `tests-e2e/deep/april-09-ui-regressions.spec.ts` now includes a dedicated sales warning-row proof that verifies invoice `PARTIAL`, linked order `saleStatus=PARTIAL`, and the row warning tint
  - `server/routers/payments.ts` now syncs linked order `saleStatus` during payment record, allocation, and void flows after the browser proof exposed invoice/order status drift
  - `pnpm vitest run server/routers/payments.test.ts client/src/components/work-surface/OrdersWorkSurface.visibility.test.tsx client/src/components/work-surface/ClientsWorkSurface.test.tsx`
  - `pnpm lint`
  - `pnpm check`
  - `pnpm build`
- Claude adversarial review:
  - `/Users/evan/.codex-runs/claude-qa/20260410T062533Z-users-evan-spec-erp-docker-terp-worktrees-open-ticket-atomic-tra-a62135/report.md`
  - all concrete findings from that report were addressed before the branch-local runtime recheck
  - `/Users/evan/.codex-runs/claude-qa/20260410T085134Z-users-evan-spec-erp-docker-terp-worktrees-open-ticket-atomic-tra-d252f1/report.md`
  - findings from this pass drove the additional page-level badge test, broader browser coverage, WebKit check, and reviewer-visible runtime context artifact

# User-Verifiable Deliverables
- 48-ticket roadmap with dependency-aware order
- Flat manifest listing all tickets by category
- Notification tranche already implemented locally
- Shared shell polish is visible on sales, inventory, procurement, relationships, and accounting workspaces
- Procurement redirect-only tabs now explain the handoff before moving operators
- Relationships table now shows status and last activity, and profile return preserves the table context better
- Orders inspector now emphasizes the most likely next action and moves secondary actions into an overflow menu
- Inventory now exposes visible exception entry points and filtered-view counts directly in the toolbar / status bar
- Purchase Orders queue now keeps ETA visible, shows receiving progress, and visually distinguishes overdue deliveries
- Accounting dashboard now explicitly tells operators that summary cards stay global even when downstream detail views filter
- Shared table components no longer fall back to the raw `No data` / `No data found` copy called out in the audit
- Cross-cutting workspace audits now have branch-local runtime proof for title dominance, 1280px primary-column visibility, contextual cross-links, <=3 click workflow reachability, and confirmation dialogs

# Blockers
- No known local implementation blockers remain inside the operations tranche.
- April 9 closeout is still not complete: the refreshed operations review packet must clear Claude adversarial rescoring before I can honestly treat this tranche as closed and advance the final train-level closeout.
- One honest remaining local proof gap remains for `TER-1110`: the strengthened browser proof exists and the backend mismatch it exposed is fixed, but a clean fresh-app rerun is still blocked by local auth/startup instability on the dedicated `:3002` app instance.
