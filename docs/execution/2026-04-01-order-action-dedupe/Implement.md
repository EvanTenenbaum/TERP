# Decision Log

- Reproduced on staging build `build-mng9pliv`: a disabled top toolbar action pair and a working lower draft-status action pair were both visible in sheet-native quote mode.
- Current `main` source of truth is `SalesOrderSurface`, which renders the duplicate top-toolbar buttons directly and also renders `OrderAdjustmentsBar` with its own save/finalize controls.

# Active Changes

- Remove the duplicated top-toolbar `Save Draft` / confirm buttons.
- Route disabled-state ownership into `OrderAdjustmentsBar`.
- Add regression tests to keep a single action stack on sale/quote surfaces.

# Verification Progress

- `codex-risk-verifier` recommended a `ui` bundle for this diff.
- Targeted checks passed:
  - `pnpm vitest run client/src/components/orders/OrderAdjustmentsBar.test.tsx client/src/components/spreadsheet-native/SalesOrderSurface.test.tsx`
  - `pnpm eslint client/src/components/orders/OrderAdjustmentsBar.tsx client/src/components/orders/OrderAdjustmentsBar.test.tsx client/src/components/spreadsheet-native/SalesOrderSurface.tsx client/src/components/spreadsheet-native/SalesOrderSurface.test.tsx`
- Broader repo checks passed:
  - `pnpm check`
  - `pnpm lint`
  - `pnpm build`
- Local browser proof against `http://127.0.0.1:4012` confirmed:
  - sale mode shows exactly one visible `Save Draft` and one `Confirm Order`
  - quote mode shows exactly one visible `Save Draft` and one `Confirm Quote`
  - unavailable customer route shows the warning state and zero visible order action buttons
- Full `pnpm test` is running as the final local confidence pass before PR.
