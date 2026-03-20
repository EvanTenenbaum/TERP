# Capability Ledger Summary: Accounting -> Payments

Snapshot:

- Commit: `9544782f` (main, 2026-03-20)
- Extracted: `2026-03-20`
- Checked Against Code: `yes`
- Scope Owner: `Accounting pilot team`
- Brief: `docs/roadmaps/spreadsheet-native-full-rollout/briefs/W1C-payments.md`

## Scope

Included current surfaces:

- `client/src/pages/accounting/Payments.tsx` — payment registry and list view
- `client/src/components/work-surface/golden-flows/InvoiceToPaymentFlow.tsx` — modern guided commit flow (design center)
- `client/src/components/work-surface/PaymentInspector.tsx` — legacy inspector (deprecated path)

Adjacent but not absorbed: Invoices sheet, Client Ledger, Crypto payments (API-only), Installment payments (API-only).

## Critical Constraints

1. **Payment commit is TRUST-CRITICAL.** Sheet edits can stage but commit must be explicit. Never inline.
2. **Design center is InvoiceToPaymentFlow.tsx, not PaymentInspector.tsx.**
3. **Before/after invoice impact must be preserved** in confirm step.
4. **Crypto (DF-030) and installment (DF-031) payments are API-only.** No UI in Wave 1.
5. **payments.void has a concurrency lock (TER-581).** Must not bypass.

## Capabilities Table

| ID      | Capability                                        | Type           | Criticality | Migration Decision     | Notes                                           |
| ------- | ------------------------------------------------- | -------------- | ----------- | ---------------------- | ----------------------------------------------- |
| PAY-001 | Payment registry browse and search                | Query          | P0          | Adopt                  | Sheet row = one payment                         |
| PAY-002 | Filter payments by type (RECEIVED/SENT)           | Query          | P0          | Adopt                  |                                                 |
| PAY-003 | Sort payments by date/amount/type/number          | Query          | P1          | Adopt                  | Client-side sort on list result                 |
| PAY-004 | Deep-link to payment by id/invoiceId/orderId      | Query          | P1          | Preserve               | URL seed from other surfaces                    |
| PAY-005 | Summary cards (count, total received, total sent) | View           | P1          | Adapt                  | Header metrics band                             |
| PAY-006 | Review invoice before committing (Step 1)         | Query          | P0          | Preserve               | TRUST-CRITICAL context                          |
| PAY-007 | Payment amount with quick presets                 | Mutation-stage | P0          | Preserve               | Full/50%/25%/custom presets                     |
| PAY-008 | Select payment method                             | Mutation-stage | P0          | Preserve               | 6 of 7 methods shown (DEBIT_CARD excluded)      |
| PAY-009 | Set payment date and reference                    | Mutation-stage | P1          | Preserve               | Date capped to today; drives fiscal period      |
| PAY-010 | Add payment notes                                 | Mutation-stage | P2          | Adopt                  | Optional free-text                              |
| PAY-011 | Confirm step: before/after invoice impact         | View           | P0          | Preserve               | TRUST-CRITICAL. Non-skippable.                  |
| PAY-012 | Record payment commit (Record Only)               | Mutation       | P0          | Preserve               | Explicit commit via accounting.payments.create  |
| PAY-013 | Record with receipt (Record & Send Receipt)       | Mutation       | P1          | Adapt                  | Two commit variants                             |
| PAY-014 | Void a payment                                    | Mutation       | P0          | Preserve               | TER-581 concurrency lock; NO current UI surface |
| PAY-015 | Legacy inspector payment                          | Mutation       | P1          | Reject-with-evidence   | Per launch matrix                               |
| PAY-016 | Quick receive client payment                      | Mutation       | P1          | Intentionally deferred | API-only, no UI                                 |
| PAY-017 | Preview payment balance                           | Query          | P1          | Adapt                  | Should wire into confirm step                   |
| PAY-018 | Multi-invoice allocation (FEAT-007)               | Mutation       | P1          | Intentionally deferred | Defer to Wave 2                                 |
| PAY-019 | Crypto payment tracking (DF-030)                  | Mutation/Query | P2          | Intentionally deferred | API-only                                        |
| PAY-020 | Installment payment plans (DF-031)                | Mutation/Query | P2          | Intentionally deferred | API-only                                        |

## Classification Summary

- sheet-native: 3 (PAY-001, PAY-002, PAY-003)
- sheet-plus-sidecar: 12 (PAY-004 through PAY-014, PAY-017)
- rejected-with-evidence: 1 (PAY-015)
- intentionally-deferred: 4 (PAY-016, PAY-018, PAY-019, PAY-020)

## Discrepancies

| ID           | Description                                                                                         | Severity |
| ------------ | --------------------------------------------------------------------------------------------------- | -------- |
| DISC-PAY-001 | sendReceipt toggle switch has dead onCheckedChange; two-button pattern works correctly bypassing it | Medium   |
| DISC-PAY-002 | Two payment routers have different input schemas (amount: string vs number)                         | High     |
| DISC-PAY-003 | BANK_TRANSFER label may not map to valid enum; DEBIT_CARD missing from guided flow                  | Medium   |
| DISC-PAY-004 | previewPaymentBalance exists but not wired to any UI; credit-creation risk invisible                | High     |
| DISC-PAY-005 | payments.void has no UI surface; API-only, inaccessible to staff                                    | High     |
| DISC-PAY-006 | crypto and installment routers use sprint5-trackd schema; migration status unconfirmed              | Medium   |

## Hidden Dependencies

- Chart of accounts must be seeded (CASH + ACCOUNTS_RECEIVABLE accounts)
- Fiscal periods must be configured for the payment date
- payments.recordPayment (legacy) uses different schema than accounting.payments.create (modern)
- TER-581: invoice rows locked in ascending ID order during void to prevent deadlocks
- clientLedger balance and payment balance are related but separately calculated
