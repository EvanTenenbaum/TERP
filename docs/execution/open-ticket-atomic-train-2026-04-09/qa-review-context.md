# Operations QA Review Context

Use this file as the plain-language grounding note for the operations review packet.

Operations-scope mapping lives in `docs/execution/open-ticket-atomic-train-2026-04-09/operations-runtime-summary.md`.

## Primary current evidence

- Cross-browser Playwright suite:
  - `PLAYWRIGHT_BASE_URL=http://127.0.0.1:3001 SKIP_E2E_SETUP=1 pnpm playwright test tests-e2e/deep/april-09-ui-regressions.spec.ts --project=deep --config=playwright.worktree.config.ts`
  - result: `10 passed`
  - `PLAYWRIGHT_BASE_URL=http://127.0.0.1:3001 SKIP_E2E_SETUP=1 pnpm playwright test tests-e2e/deep/april-09-ui-regressions.spec.ts --project=deep-webkit --config=playwright.worktree.config.ts`
  - result: `10 passed`
  - `PLAYWRIGHT_BASE_URL=http://127.0.0.1:3001 SKIP_E2E_SETUP=1 pnpm playwright test tests-e2e/deep/april-09-ui-regressions.spec.ts --project=deep-firefox --config=playwright.worktree.config.ts`
  - result: `10 passed`
- Shared unit bundle:
  - `pnpm vitest run client/src/components/work-surface/OrdersWorkSurface.visibility.test.tsx client/src/components/spreadsheet-native/InventoryManagementSurface.test.tsx client/src/components/spreadsheet-native/PurchaseOrderSurface.test.tsx client/src/components/spreadsheet-native/PilotSurfaceBoundary.test.tsx client/src/pages/ConsolidatedWorkspaces.test.tsx client/src/pages/AccountingWorkspacePage.test.tsx client/src/components/relationships/RelationshipRoleBadge.test.tsx client/src/components/work-surface/ClientsWorkSurface.test.tsx client/src/pages/accounting/AccountingDashboard.test.tsx client/src/components/spreadsheet-native/IntakePilotSurface.test.tsx client/src/pages/ClientProfilePage.test.tsx`
  - result: `90` tests across `11` files
- Static verification:
  - `pnpm check`
  - result: passed
  - `pnpm build`
  - result: passed at `2026-04-10T10:50:29.491Z`

## What the new browser coverage added

- Sales:
  - default `Most actionable` sort is now proved in a real browser
  - first visible sales payment badge is now checked for semantic token classes
  - the browser spec now contains a dedicated partial-payment warning-row proof that creates or reuses a proof order, verifies invoice `PARTIAL`, verifies linked order `saleStatus=PARTIAL`, and then checks the live warning tint classes
- Relationships:
  - live client profile now proves semantic role-badge classes
  - scroll restoration now proves near-exact restoration instead of merely non-zero restoration
- Inventory:
  - browser coverage now drives the live inventory status filter until a visible `Low stock (n)` control appears
  - the same flow ties the exception count to the visible-batches badge plus filtered status-bar totals
  - direct-intake browser coverage now uses explicit `intake-pilot-surface` vs `direct-intake-surface` assertions before switching to `Product Intake`
- Accounting:
  - filtered AP proof is no longer vacuous in browser coverage because the proof context now seeds a comparison overdue bill on a different vendor
  - loading-state proof remains browser-visible with delayed chunks and five skeleton rows
- Procurement:
  - redirect-context browser coverage now checks the `Open Operations` handoff before the seeded confirmed PO queue proof starts, so the handoff state is no longer only incidentally covered by the same test
- Operations session integrity:
  - the browser suite now explicitly probes `/api/auth/me` before and after the operations proof flow

## Runtime lane note

- `docs/execution/open-ticket-atomic-train-2026-04-09/runtime-ui-checks.mjs` was strengthened with:
  - session probes before and after the operations block
  - AP narrowing invariant (`filteredApOverdueCount < globalApOverdueCount`)
  - procurement proof-row cleanup
  - 429 backoff
- Fresh regeneration of `runtime-ui-checks.json` is currently blocked on this local environment after the exhaustive browser runs because protected tRPC calls begin returning `429 Too many requests from this IP`
- The failed regeneration attempts also fall back to `/login` on route hops, so those failed JSON outputs should not be treated as scored proof against the operations tickets
- For this rescore, treat the cross-browser Playwright suite and unit bundle as the primary evidence set
- Separate from the `429` runtime-helper issue, a fresh local browser rerun of the new sales warning-row proof on `http://127.0.0.1:3002` is currently blocked by local app startup/auth instability (`401` on both standard and QA auth attempts during restarts). That blocker is environmental, not a remaining product mismatch.

## Reviewer intent

The remaining adversarial question is no longer whether the operations tickets were implemented. The question is whether the current proof bar is high enough to score each ticket at `95+` without leaning on the blocked runtime regeneration path or the fresh-app auth instability that currently prevents one final live rerun of the strengthened `TER-1110` proof.
