# FORGED PROMPT: BUG-003 — Payment Recording Transaction Rollback Fix

## MANDATORY RULES — VIOLATION = TASK FAILURE

1. **NO PHANTOM VERIFICATION.** Never write "I verified X" without showing ACTUAL COMMAND and ACTUAL OUTPUT.
2. **NO PREMATURE COMPLETION.** Do not say "Done" until EVERY checklist item has evidence.
3. **NO SILENT ERROR HANDLING.** If anything fails: STOP. Report the exact error.
4. **PROOF OF WORK.** At every 🔒 gate, paste actual terminal output.
5. **ACTUALLY READ FILES BEFORE EDITING.** Read every file before modifying it.
6. **ONE THING AT A TIME.** Complete and verify each task before the next.

---

## MISSION BRIEF

**Bug:** `payments.recordPayment` transaction rolls back during GL entry creation. Error: "Payment recording failed - transaction rolled back"
**Impact:** 3 test failures (UJ-014, UJ-015, UJ-017), blocks ALL payment operations.
**Risk Level:** CRITICAL (RED mode — financial transactions, accounting entries)

### Error Chain (verified from code)

```
1. server/routers/payments.ts:306-310
   → Resolves Cash and AR account IDs via getAccountIdByName()
   → If either account missing: throws TRPCError NOT_FOUND

2. server/routers/payments.ts:310
   → getFiscalPeriodIdOrDefault(new Date(), 1)
   → If no fiscal period: may return null or throw

3. server/routers/payments.ts:315-419
   → Transaction: INSERT payment → UPDATE invoice → INSERT 2 ledgerEntries
   → Any failure rolls back entire transaction

4. server/routers/payments.ts:435-437
   → Catch wraps error as "Payment recording failed - transaction rolled back"
   → Real cause hidden
```

### Most Likely Root Cause

The chart of accounts may be missing "Cash" and/or "Accounts Receivable" accounts in production.
OR the `ledgerEntries` INSERT may have a column mismatch.
OR `fiscalPeriodId` may be null.

---

## TASK LIST

### Task 1: Investigate the Failure Point

**What**: Read the payment recording code and all dependencies to identify exact failure.
**Files to READ (do NOT edit yet)**:
- `server/routers/payments.ts` — lines 250-450 (full recordPayment mutation)
- `server/_core/accountLookup.ts` — full file (account resolution)
- `server/_core/fiscalPeriod.ts` or wherever `getFiscalPeriodIdOrDefault` is defined
- `drizzle/schema.ts` — find `ledgerEntries` table definition
- `drizzle/schema.ts` — find `payments` table definition
- `server/services/seedDefaults.ts` — lines 470-552 (chart of accounts seed)

**Acceptance Criteria**:
- [ ] Identified which accounts are required (Cash, Accounts Receivable)
- [ ] Verified if `ledgerEntries` INSERT has all required columns
- [ ] Verified if `payments` INSERT has all required columns
- [ ] Checked `getFiscalPeriodIdOrDefault` behavior when no fiscal period exists

🔒 **GATE 1**: Report which specific operation fails and why, with evidence from the code.

---

### Task 2: Fix the Root Cause

**What**: Fix the failing operation(s) identified in Task 1.
**Files**: Based on Task 1 findings. Likely one or more of:
- `server/routers/payments.ts` — fix INSERT column values
- `server/services/seedDefaults.ts` — ensure accounts are seeded on startup
- Schema — verify column defaults

**Possible fixes depending on root cause**:

**If accounts missing**: Ensure `seedDefaults` runs and creates all 7 ACCOUNT_NAMES. Add defensive pre-check before transaction:
```typescript
// Before the transaction, validate all required accounts exist
const cashAccountId = await getAccountIdByName(ACCOUNT_NAMES.CASH);
const arAccountId = await getAccountIdByName(ACCOUNT_NAMES.ACCOUNTS_RECEIVABLE);
// These already exist at lines 306-309 — if they throw, the error is
// already a TRPCError NOT_FOUND which should propagate... unless it's being
// caught and wrapped. Check if the catch at line 420 is re-wrapping it.
```

**If ledgerEntries INSERT missing columns**: Add explicit null values for nullable columns.

**If fiscalPeriodId is null**: Ensure `getFiscalPeriodIdOrDefault` returns a valid ID or creates one.

**Acceptance Criteria**:
- [ ] The root cause is fixed
- [ ] Error messages are descriptive (not generic "transaction rolled back")
- [ ] TRPCErrors from account lookup propagate with original message (check line 422: `if (error instanceof TRPCError) { throw error; }`)

**Verification**:
```bash
pnpm check 2>&1 | tail -5
```

🔒 **GATE 2**: Paste output.

---

### Task 3: Improve Error Reporting

**What**: Make the catch block at `payments.ts:420-440` preserve useful error context.
**Files**: `server/routers/payments.ts`

**Current**: Line 435 throws generic "Payment recording failed - transaction rolled back"
**Fix**: Include the actual error message:
```typescript
throw new TRPCError({
  code: "INTERNAL_SERVER_ERROR",
  message: `Payment recording failed: ${error instanceof Error ? error.message : "Unknown error"}`,
  cause: error,
});
```

**CRITICAL**: Line 422 already re-throws TRPCErrors — verify this is working correctly. The `getAccountIdByName` throws TRPCError(NOT_FOUND), which should be caught at line 420 and re-thrown at line 423. If this path works, the "transaction rolled back" message means the error is NOT a TRPCError — it's a raw database error.

🔒 **GATE 3**: Paste `pnpm check` output.

---

### Task 4: Full Verification Suite

```bash
pnpm check 2>&1 | tail -5
pnpm lint 2>&1 | tail -5
pnpm test 2>&1 | tail -20
pnpm build 2>&1 | tail -10
```

🔒 **GATE 4**: Paste ALL FOUR outputs.

---

## QA PROTOCOL (5-LENS)

### Lens 1: Static Pattern Scan
- [ ] No `any` types
- [ ] No fallback user IDs
- [ ] Uses `getAuthenticatedUserId(ctx)` for actor
- [ ] No hard deletes

### Lens 2: Execution Path Tracing
Full path: `recordPayment` → validate invoice exists → validate amount → resolve accounts → transaction { INSERT payment → UPDATE invoice → INSERT 2 ledger entries } → sync client balance
- What if invoice doesn't exist? (handled at line ~280)
- What if amount > amountDue? (handled at line ~290 with overpayment rejection)
- What if accounts don't exist? (should throw NOT_FOUND)
- What if fiscal period doesn't exist? (needs investigation)

### Lens 3: Data Flow
- `input.amount` (number) → `effectiveAmount` (number) → `.toFixed(2)` (string) → stored
- Verify all decimal arithmetic uses proper precision
- Verify `amountPaid` and `amountDue` calculations are correct

### Lens 4: Adversarial
1. Full payment (amount = amountDue)
2. Partial payment (amount < amountDue)
3. Overpayment (amount > amountDue) — should be rejected
4. Zero payment
5. Payment on already-paid invoice

### Lens 5: Blast Radius
- `syncClientBalance` called after transaction (line 444-446) — does this affect other clients?
- Does fixing this affect `payments.voidPayment`?
- Any other code that inserts into `ledgerEntries`?

---

## ✅ COMPLETION CHECKLIST

- [ ] Root cause identified with evidence
- [ ] Root cause fixed (INSERT, accounts, or fiscal period)
- [ ] Error reporting improved (descriptive messages)
- [ ] TRPCErrors propagate correctly through catch blocks
- [ ] `pnpm check` passes
- [ ] `pnpm lint` passes
- [ ] `pnpm test` passes
- [ ] `pnpm build` passes
- [ ] QA 5-lens completed
- [ ] No new `any`, console.log, or TODO/FIXME

---

## MANDATORY RULES REPEATED

1. NO PHANTOM VERIFICATION — show actual output
2. NO PREMATURE COMPLETION — every checkbox needs evidence
3. READ files before editing — especially the payment router (450+ lines)
4. PROOF OF WORK at every 🔒 gate
