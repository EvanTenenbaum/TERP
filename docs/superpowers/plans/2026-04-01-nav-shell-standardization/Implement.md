# Implementation Log

## Current Focus

Refactor the shared shell first, then tighten the Sales catalogue surface so the staging page feedback is resolved at the root instead of patched locally.

## Decisions

- Use one omnibox entry point in the global header instead of separate search input + command button
- Keep notifications visible in the header, move theme/settings/version into the account menu
- Use one compact workspace strip for title, tabs, and workspace controls
- Remove the duplicate Sales catalogue handoff bar by moving those actions into the existing output panel

## Checkpoints

- 2026-04-01: Audit confirmed stacked chrome across Sales, Inventory, and Accounting with roughly 257-292px consumed before main work content on key screens
- 2026-04-01: Clean worktree created at `/Users/evan/spec-erp-docker/TERP/worktrees/nav-shell-standard-20260401` on branch `codex/nav-shell-standard-20260401`
- 2026-04-01: Human-QA packet generator unavailable in this worktree before dependency/tooling confirmation, so manual live browser QA remains part of closeout
- 2026-04-01: Local production-style server verified healthy on `http://127.0.0.1:4173/health` for browser validation
- 2026-04-01: Live browser validation captured updated Sales, Inventory, and Accounting shell screenshots under `output/playwright/`
- 2026-04-01: Updated `tests-e2e/critical-paths/sales-sheets-workflow.spec.ts` to match the standardized Sales Catalogue UI; focused Playwright run passed `13/13`
- 2026-04-01: Ship-point verification passed locally: `pnpm check`, `pnpm lint`, targeted Vitest, and `pnpm build`

## Evidence

- `pnpm check`
- `pnpm lint`
- `pnpm exec vitest run client/src/components/layout/AppHeader.test.tsx client/src/components/spreadsheet-native/SalesCatalogueSurface.test.tsx client/src/pages/SpreadsheetNativePilotRollout.test.tsx client/src/pages/SalesWorkspacePage.test.tsx`
- `PLAYWRIGHT_BASE_URL=http://127.0.0.1:4173 pnpm exec playwright test tests-e2e/critical-paths/sales-sheets-workflow.spec.ts --config /tmp/playwright.nav-shell.local.config.ts --project=chromium --workers=1`
- `pnpm build`
- Browser artifacts:
  - `output/playwright/nav-shell-sales-final.png`
  - `output/playwright/nav-shell-accounting-final.png`
  - `output/playwright/sales-after-select-debug.png`
