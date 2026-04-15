# TER-1067 Merge Gate - 2026-04-08

## Goal

Prove whether the canonical TER-1067 recovery branch is safe to land, or whether the local full-suite failures came from the recovery diff itself.

## Recovery Branch Verification

- `pnpm agent:prepare`
  - result: passed
- `pnpm check`
  - result: passed
- `pnpm lint`
  - result: passed
- `pnpm vitest run client/src/components/spreadsheet-native/InvoicesSurface.test.tsx client/src/components/spreadsheet-native/SalesCatalogueSurface.test.tsx client/src/components/accounting/RecordPaymentDialog.test.tsx`
  - result: `31` tests passed across `3` files
- `pnpm build`
  - result: passed

## Full-Suite Attempt

Command run on the recovery branch:

- `pnpm test`

Observed result:

- the suite surfaced failures in untouched files, then hung in a dead tail instead of exiting cleanly
- representative failing files included:
  - `tests/security/permission-escalation.test.ts`
  - `server/inventoryIntakeService.mediaUrls.test.ts`
  - `server/demoMediaStorage.test.ts`
  - `client/src/components/layout/AppSidebar.test.tsx`
  - `client/src/pages/ConsolidatedWorkspaces.test.tsx`
  - `client/src/components/spreadsheet-native/ProductBrowserGrid.test.tsx`
  - `server/routers/purchaseOrders.test.ts`
  - `client/src/pages/SpreadsheetNativePilotRollout.test.tsx`
  - `client/src/components/spreadsheet-native/SheetModeToggle.test.tsx`
  - `server/routers/inventory.test.ts`

## Clean `origin/main` Comparison

Comparison checkout:

- worktree: `/Users/evan/spec-erp-docker/TERP/TERP-main-verify-20260408`
- revision: `origin/main` at `994bbee4`

Command run:

- `./node_modules/.bin/tsx testing/run-with-test-db.ts --scenario=light --reset=always -- ./node_modules/.bin/vitest run tests/security/permission-escalation.test.ts server/inventoryIntakeService.mediaUrls.test.ts server/demoMediaStorage.test.ts client/src/components/layout/AppSidebar.test.tsx client/src/pages/ConsolidatedWorkspaces.test.tsx client/src/components/spreadsheet-native/ProductBrowserGrid.test.tsx server/routers/purchaseOrders.test.ts client/src/pages/SpreadsheetNativePilotRollout.test.tsx client/src/components/spreadsheet-native/SheetModeToggle.test.tsx server/routers/inventory.test.ts`

Result on clean `main`:

- `10` test files failed
- `23` tests failed
- `75` tests passed

The failing file set on clean `main` matched the recovery-branch failure set. This confirms the local repo-wide red baseline is pre-existing and is not introduced by the TER-1067 recovery diff.

## Merge Decision Impact

- The TER-1067 recovery branch remains green on its touched surfaces and build path.
- The local full-suite red baseline must be tracked honestly, but it is not a reason to reject the TER-1067 replacement PR as a regression-causing branch.
- PR messaging should explicitly note that PR 569 is being superseded by the canonical recovery branch, and that the untouched repo-wide red baseline still exists on `main`.
