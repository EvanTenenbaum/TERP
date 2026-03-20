# W1C: Payments Sheet-Native Implementation Brief

## Module

Payments — trust-critical accounting surface. PACK-ONLY ledger, needs architect pass first.

## Readiness

- Detailed capability ledger: DOES NOT EXIST (pack-level only: `ACCT-PAY-001` to `ACCT-PAY-004`)
- Extraction CSV: NOT YET RUN (Payments lives in `client/src/pages/accounting/Payments.tsx` + `InvoiceToPaymentFlow.tsx`)
- Figma golden flow: `docs/design/spreadsheet-native-golden-flows-2026-03-18/payments-sheet.svg`
- Pilot surface: DOES NOT EXIST

## BLOCKER: Needs Architect Pass

Before implementation, an architect agent must:

1. Run capability extraction against `Payments.tsx` and `InvoiceToPaymentFlow.tsx`
2. Cross-reference with pack-level rows `ACCT-PAY-001` through `ACCT-PAY-004`
3. Cross-reference with Feature Preservation Matrix entries (DF-030, DF-031, DF-032)
4. Produce a detailed capability ledger with Adopt/Adapt/Preserve/Reject decisions
5. Verify the ledger covers every mutation, query, and user workflow

## Known Constraints (from Launch Matrix)

- Payment commit is TRUST-CRITICAL — must stay explicit, never inline
- Sheet edits can stage a payment, but commit must be a separate guided flow
- Modern golden-flow path (`InvoiceToPaymentFlow.tsx`) is the design center, not legacy
- Before/after invoice impact and audit trace must be preserved
- `Reject`: inspector-first payment execution

## Risk

- **CRITICAL**: Any bug in payment processing is a financial integrity risk
- **HIGH**: Two code paths exist (legacy `PaymentInspector` + modern `InvoiceToPaymentFlow`). Must unify on modern path.
- **MEDIUM**: Crypto payments and installment payments are API-only with no current UI — may surface during ledger creation
