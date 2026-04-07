# TER-1067 Evidence Index

## Verification Commands

- Focused tests:
  - `pnpm vitest run client/src/components/spreadsheet-native/SalesCatalogueSurface.test.tsx client/src/components/accounting/RecordPaymentDialog.test.tsx client/src/components/spreadsheet-native/InvoicesSurface.test.tsx client/src/components/CommandPalette.search.test.tsx`
  - result: `33` tests passed across `4` files
- Focused eslint:
  - `pnpm exec eslint client/src/components/spreadsheet-native/InvoicesSurface.tsx client/src/components/spreadsheet-native/SalesCatalogueSurface.tsx client/src/components/accounting/RecordPaymentDialog.tsx client/src/components/spreadsheet-native/InvoicesSurface.test.tsx client/src/components/spreadsheet-native/SalesCatalogueSurface.test.tsx client/src/components/accounting/RecordPaymentDialog.test.tsx client/src/components/CommandPalette.search.test.tsx`
  - result: passed
- Type check:
  - `pnpm check`
  - result: passed

## Runtime Proof Bundle

Primary proof files live under:

- `output/playwright/ter-1067-recovery-2026-04-07/summary.md`

Key screenshots:

- `output/playwright/ter-1067-recovery-2026-04-07/copy-for-chat-proof.png`
- `output/playwright/ter-1067-recovery-2026-04-07/invoices-overdue-focus.png`
- `output/playwright/ter-1067-recovery-2026-04-07/command-palette-search.png`
- `output/playwright/ter-1067-recovery-2026-04-07/orders-queue-client-search.png`
- `output/playwright/ter-1067-recovery-2026-04-07/record-payment-dialog-open.png`
- `output/playwright/ter-1067-recovery-2026-04-07/record-payment-success.png`

## Local Harness Notes

Two local test-DB mutations were used strictly to unblock runtime proof:

- a local batch-status flip to `LIVE` so copy-for-chat had a priced, selectable inventory row
- a local partial payment on invoice `INV-000019` to prove the remaining-balance confirmation toast

These mutations are proof-harness actions only. They are not product code changes.

## Evidence Limits

- `main`'s old `output/playwright/final-merge-main/summary.json` was too thin to justify later tranche-complete claims.
- TER-1054 and TER-1057 now have strong local proof, but they still need mainline landing before they can be treated as merged truth.
