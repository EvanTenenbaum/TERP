# TER-41 Verification - GL Entries on Invoice/Payment

## Scope

Validate that invoice generation and payment posting create ledger entries and no silent failures occur.

## Code-Level Verification

- Reviewed `server/accountingHooks.ts` for explicit error bubbling via `GLPostingError`.
- Reviewed invoice routes for PDF and payment related accounting flow behavior.
- Confirmed logging paths and non-silent error handling conventions remain in place.

## Manual QA Procedure (Staging)

1. Login as `qa.salesrep@terp.test`.
2. Create order and generate invoice.
3. Record partial and full payment.
4. Validate corresponding GL entries in accounting views.
5. Check logs for errors around invoice/payment hooks.

## Evidence Notes

- In this execution environment, direct staging auth + DB log tail are not available.
- Added deterministic checklist for QA sign-off and issue triage.

## Outcome

- No code-level silent failure pattern introduced in this wave.
- Ready for QA to execute live verification steps and attach evidence.
