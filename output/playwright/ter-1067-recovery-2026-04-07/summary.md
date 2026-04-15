# TER-1067 Recovery Proof Bundle

## Screenshots

- `smoke-sales-sheets.png`
  - sales workspace shell loads successfully after QA auth
- `sales-sheets-after-client.png`
  - seed limitation proof: selected client had no priced LIVE rows before local bootstrap
- `sales-sheets-after-live-batch.png`
  - local proof bootstrap exposed a selectable LIVE row
- `copy-for-chat-proof.png`
  - runtime proof that copy-for-chat now copies the curated selected catalogue row
- `invoices-overdue-focus.png`
  - overdue invoices render client phone and email inline
- `command-palette-search.png`
  - Cmd+K search returns order hits for client-name query `Emerald Valley Collective`
- `orders-queue-client-search.png`
  - orders queue filters by the same client-name query
- `record-payment-dialog-open.png`
  - selecting an overdue invoice enables the action and opens the dialog with balance context
- `record-payment-success.png`
  - runtime proof of remaining-balance confirmation after a local partial payment

## Local Harness Actions

- Local test DB batch `id=7` was flipped to `LIVE` to unlock copy-for-chat proof.
- Invoice `INV-000019` received a local partial payment of `$100.00` to prove the remaining-balance confirmation toast.

These actions were limited to the local test harness and are documented so the proof is honest about how it was obtained.
