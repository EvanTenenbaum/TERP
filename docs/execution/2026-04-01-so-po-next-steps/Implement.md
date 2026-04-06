# Active Milestone

Milestone 4: Ship-ready local verification completed; PR, merge, deploy, and live QA remain.

# Decisions

- Use the shared `SalesOrderSurface` as the single non-classic sales-order/quote composer unless evidence shows a separate quote-specific fix is required.
- When a route carries a `clientId` that no longer hydrates into an active client, block build/save/finalize flows and surface a clear unavailable-customer state instead of letting the user discover the failure at submit time.
- Keep the new browser regression coverage on the shared sheet-native sales surface so sale mode and quote mode stay covered together.

# Changes

- Initialized long-horizon execution state files for this tranche.
- Claimed `TERP-cg8` in `bd`.
- Updated `ClientCombobox` to preserve a hydrated fallback label while the client list is still loading.
- Updated `SalesOrderSurface` to detect unavailable route clients, show `Unavailable customer #<id>`, hide the grid/actions for blocked routes, and prevent draft/finalization actions until an active customer is selected.
- Added unit coverage for the client-combobox loading-label behavior and the unavailable-customer sales-order state.
- Added and hardened a real Playwright critical-path spec that exercises SO inline qty/price/markup before add, PO inline quantity-before-add, and quote mode on the shared sheet-native surface.
- Installed an isolated worktree-local dependency tree so local typecheck/build/browser runs no longer inherit stale dependencies from another checkout.

# Evidence

- `bd ready --json` and `bd update TERP-cg8 --claim --json`
- Worktree: `/Users/evan/spec-erp-docker/TERP/TERP-so-po-next-steps-20260401`
- Base commit: `02c28b901d26bf1c9f59787ffa0596e816e30f4f`
- Live repro before edit on staging: `/sales?tab=create-order&clientId=1` showed `Customer...` while inventory still loaded for the stale route.
- Root cause isolated to `clients.getById(clientId)` returning `null` while `salesSheets.getInventory(clientId)` still returned priced inventory for that route.
- `pnpm vitest run client/src/components/ui/client-combobox.test.tsx client/src/components/spreadsheet-native/SalesOrderSurface.test.tsx`
- `pnpm eslint client/src/components/spreadsheet-native/SalesOrderSurface.tsx client/src/components/spreadsheet-native/SalesOrderSurface.test.tsx client/src/components/ui/client-combobox.tsx client/src/components/ui/client-combobox.test.tsx tests-e2e/critical-paths/sheet-native-order-inline-controls.spec.ts`
- `pnpm check`
- `pnpm build`
- `QA_AUTH_ENABLED=true JWT_SECRET=terp-local-e2e-jwt-secret-2026-000000000000 CI=1 PLAYWRIGHT_BASE_URL=http://127.0.0.1:4010 pnpm exec playwright test tests-e2e/critical-paths/sheet-native-order-inline-controls.spec.ts --project=chromium --workers=1`

# User-Verifiable Deliverables

- A clean follow-up branch/worktree dedicated to the remaining SO/PO next steps.
- Durable execution docs in `docs/execution/2026-04-01-so-po-next-steps/`.
- A blocked-state UX for unavailable SO route clients instead of a misleading partially-hydrated sales-order screen.
- Green local unit, type, lint, build, and inline-controls browser proof for SO, quote mode, and PO.

# Blockers

- None currently.
