# Milestones

1. Reproduce the duplicate action stack on current `main` and identify the duplicated renderer.
2. Remove the extra top-toolbar save/finalize buttons from `SalesOrderSurface`.
3. Make `OrderAdjustmentsBar` own the only visible action stack and respect disabled states supplied by the surface.
4. Add regression tests for single-action rendering and disabled-state behavior.
5. Run targeted verification, then ship through PR, merge, deploy verification, and live staging QA.

# Verification Plan

- `pnpm vitest run client/src/components/orders/OrderAdjustmentsBar.test.tsx client/src/components/spreadsheet-native/SalesOrderSurface.test.tsx`
- `pnpm eslint client/src/components/orders/OrderAdjustmentsBar.tsx client/src/components/orders/OrderAdjustmentsBar.test.tsx client/src/components/spreadsheet-native/SalesOrderSurface.tsx client/src/components/spreadsheet-native/SalesOrderSurface.test.tsx`
- staging Playwright repro against `/sales?tab=create-order&mode=quote&clientId=<active>` and `/sales?tab=create-order&clientId=1`

# Risks

- Removing the wrong action stack could strand save/finalize controls in the sheet-native composer.
- Disabled-state changes must not break keyboard shortcut flows or handler-based guards.
