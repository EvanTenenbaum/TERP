# TER-256: Fix payments.recordPayment Transaction Rollback on Valid SENT Invoices

**Classification**: Medium | **Mode**: RED | **Estimate**: 4h
**Linear**: TER-256 | **Wave**: 6
**Golden Flow**: GF-004 (Invoice & Payment)

---

## MANDATORY RULES — VIOLATION = TASK FAILURE

1. **NO PHANTOM VERIFICATION.** Never write "I verified X" or "I confirmed Y" without showing the ACTUAL COMMAND and its ACTUAL OUTPUT. If you say something works, prove it with terminal output.
2. **NO PREMATURE COMPLETION.** Do not say "Done" or "Complete" until EVERY item in the completion checklist has a checkmark with evidence.
3. **NO SILENT ERROR HANDLING.** If any command fails, if any test doesn't pass, if anything unexpected happens: STOP. Report the exact error. Do not work around it silently.
4. **NO QA SKIPPING.** The QA protocol below is not optional. You MUST run every lens applicable to this task.
5. **PROOF OF WORK.** At every verification gate marked with GATE, you must paste the actual terminal output.
6. **ACTUALLY READ FILES BEFORE EDITING.** Before modifying any file, read it first. Do not assume you know what's in a file from context or memory.
7. **ONE THING AT A TIME.** Complete and verify each task before starting the next. Do not batch-implement and then batch-verify.
8. **NO HAPPY-PATH-ONLY TESTING.** You must test failure cases, edge cases, and adversarial inputs.

---

## Mission Brief

`payments.recordPayment` fails with `INTERNAL_SERVER_ERROR: Payment recording failed - transaction rolled back` when called against valid SENT invoices. The transaction block (lines 300-407 of `server/routers/payments.ts`) rolls back, but the status validation (lines 263-275) correctly accepts SENT invoices. The failure is occurring **inside** the transaction — likely during GL entry creation or account resolution.

**The goal**: Identify the exact failure point inside the transaction, fix it, and ensure `recordPayment` works for all valid invoice statuses (SENT, PARTIAL, OVERDUE). Add regression tests to prevent recurrence.

---

## Pre-Flight: Understand the Current State

### Task 0: Identify the Transaction Failure Point

**What**: Read the full `recordPayment` handler and trace exactly where the transaction fails.
**Files**: `server/routers/payments.ts`

**Steps**:

1. Read `server/routers/payments.ts` lines 233-437 — the full `recordPayment` mutation
2. Specifically investigate lines 287-300 — the account resolution code between amount validation and the transaction block. This is where `cashAccountId`, `arAccountId`, and `fiscalPeriodId` are resolved. If any of these are missing/null, GL entry inserts will fail.
3. Check how `cashAccountId` and `arAccountId` are resolved — are they hard-coded, looked up from DB, or from config?
4. Check if `fiscalPeriodId` resolution can return null/undefined
5. Read the GL entry insert at lines 354-386 — what columns are `.notNull()` in the `ledgerEntries` schema?

**Acceptance Criteria**:

- [ ] Root cause identified with exact line number
- [ ] Explanation of WHY the transaction rolls back on SENT invoices

**GATE**: Before proceeding, paste your root cause analysis with the exact failure point.

---

## Implementation Tasks

### Task 1: Fix the Transaction Failure

**What**: Fix the root cause that causes the transaction to roll back.
**Files**: `server/routers/payments.ts`

**Likely Fixes (investigate before implementing)**:

- If account IDs (cash/AR) are not found: add proper error handling that throws a descriptive TRPCError BEFORE entering the transaction
- If `fiscalPeriodId` is null: ensure a default/current fiscal period is resolved
- If the ledgerEntries insert fails due to column constraints: align the insert values with the schema
- If `generatePaymentNumber()` fails: add error handling

**Acceptance Criteria**:

- [ ] Transaction completes successfully for SENT invoices
- [ ] Transaction completes successfully for PARTIAL invoices (additional payments)
- [ ] Transaction completes successfully for OVERDUE invoices
- [ ] PAID invoices still rejected with descriptive error
- [ ] VOID invoices still rejected with descriptive error
- [ ] DRAFT invoices rejected (should not accept payments on drafts)

**Verification Command**:

```bash
pnpm check && pnpm test -- --reporter=verbose server/routers/payments
```

**GATE**: Paste the verification output.

### Task 2: Add DRAFT Status Rejection

**What**: Add explicit rejection of DRAFT invoice status for payment recording.
**Files**: `server/routers/payments.ts`

Currently only PAID and VOID are rejected (lines 263-275). DRAFT invoices should also be rejected — you can't pay an invoice that hasn't been sent.

**Acceptance Criteria**:

- [ ] DRAFT invoices throw `BAD_REQUEST` with message "Cannot apply payment to a draft invoice"
- [ ] Added AFTER the existing PAID/VOID checks (maintain code readability)

**Verification Command**:

```bash
pnpm check
```

### Task 3: Add/Enable Regression Tests

**What**: Write or enable tests for `recordPayment` covering all invoice statuses.
**Files**: `server/routers/payments.test.ts`

The existing test suite is `.skip()`'d (line 93). Either:

- Un-skip and fix the tests if mock issues are resolvable
- OR add NEW focused unit tests for the status validation and transaction logic

**Test Scenarios Required**:

| #   | Scenario                                  | Expected                           |
| --- | ----------------------------------------- | ---------------------------------- |
| 1   | SENT invoice, valid payment               | Success, invoice → PARTIAL or PAID |
| 2   | PARTIAL invoice, additional payment       | Success, amounts updated           |
| 3   | OVERDUE invoice, payment                  | Success, amounts updated           |
| 4   | PAID invoice, payment attempt             | BAD_REQUEST error                  |
| 5   | VOID invoice, payment attempt             | BAD_REQUEST error                  |
| 6   | DRAFT invoice, payment attempt            | BAD_REQUEST error                  |
| 7   | Payment amount > amountDue                | BAD_REQUEST error                  |
| 8   | Payment exactly equals amountDue          | Success, invoice → PAID            |
| 9   | Payment with rounding (amountDue + 0.005) | Capped to amountDue                |
| 10  | Non-existent invoiceId                    | NOT_FOUND error                    |

**Acceptance Criteria**:

- [ ] All 10 test scenarios pass
- [ ] Tests are NOT skipped

**Verification Command**:

```bash
pnpm test -- --reporter=verbose server/routers/payments
```

**GATE**: Paste the test output showing all scenarios pass.

---

## QA Protocol (5-Lens)

### Lens 1: Static Pattern Scan

```bash
git diff --cached -- server/routers/payments.ts | grep -E "(any|\.id \|\| 1|\.id \?\? 1|createdBy.*input\.|\.delete\()"
```

Must return empty (no forbidden patterns introduced).

### Lens 2: Execution Path Tracing

Trace ALL paths through `recordPayment`:

- Invoice not found → NOT_FOUND
- Invoice PAID → BAD_REQUEST
- Invoice VOID → BAD_REQUEST
- Invoice DRAFT → BAD_REQUEST (NEW)
- Payment > amountDue → BAD_REQUEST
- Account resolution failure → descriptive error
- Transaction success → return payment details + sync balance
- Transaction failure → INTERNAL_SERVER_ERROR with cause

### Lens 3: Data Flow Analysis

- INPUT: `{ invoiceId, amount, paymentMethod, referenceNumber?, notes?, paymentDate? }`
- TRANSFORMS: amount capped at amountDue, newPaid = currentPaid + effectiveAmount
- OUTPUT: `{ paymentId, paymentNumber, invoiceId, customerId, amount, invoiceStatus, amountDue }`
- SIDE EFFECTS: payment row, invoice update, 2 GL entries, client balance sync

### Lens 4: Adversarial Scenarios

Test these edge cases:

1. Invoice with amountDue = "0.00" but status = "SENT" (data inconsistency)
2. Concurrent payments on same invoice (race condition)
3. Payment with amount = 0.01 (minimum)
4. Payment where effectiveAmount rounds to 0.00
5. Invoice with null customerId

### Lens 5: Integration & Blast Radius

- `syncClientBalance()` is called post-transaction — verify it doesn't throw
- GL entries reference `cashAccountId` and `arAccountId` — verify these exist
- `generatePaymentNumber()` uses date-based counting — verify no collisions

---

## Fix Cycle

For each issue found by QA:

1. Fix the issue
2. Re-run the specific verification that failed
3. Paste the new output showing it passes

**Maximum 3 fix cycles.** If issues persist after 3 cycles, STOP and report.

---

## Completion Checklist

Do NOT declare this work complete until every box is checked with evidence:

- [ ] Root cause identified and documented
- [ ] Transaction failure fixed
- [ ] DRAFT status rejection added
- [ ] 10 regression test scenarios pass
- [ ] `pnpm check` passes
- [ ] `pnpm lint` passes (on modified files)
- [ ] `pnpm test` passes (full suite)
- [ ] `pnpm build` passes
- [ ] No `any` types introduced
- [ ] No `console.log` left in production code
- [ ] Actor comes from `getAuthenticatedUserId(ctx)`, not input

---

## MANDATORY RULES REMINDER

1. NO PHANTOM VERIFICATION — show actual output
2. NO PREMATURE COMPLETION — check every box above
3. NO SILENT ERROR HANDLING — report failures immediately
4. PROOF OF WORK at every GATE
