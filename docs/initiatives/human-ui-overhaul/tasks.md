# Human UI Overhaul Tasks

## Phase 0: Baseline and Benchmarks

- [ ] Capture TERP baseline screenshots across key journeys
- [ ] Build comparative benchmark set from spreadsheet-like ERP and operations products
- [ ] Map TERP vs benchmark differences by journey and UI dimension

## Phase 1: UX Roadmap

- [ ] Produce surface-by-surface roadmap
- [x] Define shared UI primitives and consistency rules
- [x] Identify enabling refactors, components, and tokens

## Phase 2: Implementation

- [x] Create dedicated branch
- [x] Improve shell, headers, spacing, and navigation consistency
- [x] Improve orders queue and workflow surfaces
- [x] Improve inventory, intake, and procurement table-heavy surfaces
- [ ] Improve CRM and profile composition
- [x] Improve accounting clarity and action patterns
- [ ] Improve notifications, inbox, and attention surfacing

## Phase 3: QA and Iteration

- [x] Run harsh UX QA on changed surfaces
- [ ] Compare updated UI against third-party benchmarks
- [ ] Iterate until quality bar is convincingly higher
- [ ] Prepare final before and after summary with branch and artifacts

## Execution log

- 2026-04-09 18:40 UTC: Follow-up verified the TERP repo is live on the Mac Mini at `/Users/evantenenbaum/spec-erp-docker/TERP/TERP`. Branch `human-ui-overhaul` already existed with substantial in-progress UI changes across shell, sales, inventory, procurement, and accounting surfaces.
- 2026-04-09 19:35 UTC: Targeted tranche verification rerun on Mac Mini:
  - `pnpm exec vitest run client/src/components/layout/AppHeader.test.tsx client/src/components/layout/LinearWorkspaceShell.test.tsx client/src/pages/SalesWorkspacePage.test.tsx client/src/components/spreadsheet-native/SalesCatalogueSurface.test.tsx client/src/components/spreadsheet-native/InventoryManagementSurface.test.tsx client/src/components/spreadsheet-native/PurchaseOrderSurface.test.tsx client/src/components/spreadsheet-native/SalesOrderSurface.test.tsx client/src/components/spreadsheet-native/InvoicesSurface.test.tsx client/src/components/spreadsheet-native/BillsSurface.test.tsx client/src/components/spreadsheet-native/PaymentsSurface.test.tsx client/src/components/spreadsheet-native/GeneralLedgerSurface.test.tsx client/src/components/spreadsheet-native/ChartOfAccountsSurface.test.tsx client/src/components/spreadsheet-native/ExpensesSurface.test.tsx client/src/components/spreadsheet-native/BankAccountsSurface.test.tsx client/src/components/spreadsheet-native/BankTransactionsSurface.test.tsx client/src/components/spreadsheet-native/FiscalPeriodsSurface.test.tsx` → 16 files passed, 126 tests passed.
  - `pnpm exec eslint $(git diff --name-only -- client/src | grep -E "\\.(ts|tsx)$")` → passed for touched TypeScript/TSX tranche files.
  - `pnpm -s tsc --noEmit` and `pnpm -s build` are still blocked by pre-existing staging import failures in `client/src/components/staging/StagingAgentation.tsx` (`agentation` unresolved), not by this overhaul tranche.
- 2026-04-09 19:36 UTC: Rendered proof attempt blocked. Local dev startup failed while loading `vite.config.ts` because `@domscribe/react/package.json` could not be resolved, and the configured local DB (`terp-test`) is missing on the Mac Mini. See `docs/initiatives/human-ui-overhaul/qa-pass-2026-04-09.md` for command evidence and blocker details.
