# FORGED PROMPT: BUG-004 — Order Status Lifecycle Fix (PACKED→SHIPPED)

## MANDATORY RULES — VIOLATION = TASK FAILURE

1. **NO PHANTOM VERIFICATION.** Never write "I verified X" without showing ACTUAL COMMAND and ACTUAL OUTPUT.
2. **NO PREMATURE COMPLETION.** Do not say "Done" until EVERY checklist item has evidence.
3. **NO SILENT ERROR HANDLING.** If anything fails: STOP. Report the exact error.
4. **PROOF OF WORK.** At every 🔒 gate, paste actual terminal output.
5. **ACTUALLY READ FILES BEFORE EDITING.** Read every file before modifying it.
6. **ONE THING AT A TIME.** Complete and verify each task before the next.

---

## MISSION BRIEF

**Bug:** Order status transition PACKED→SHIPPED fails with: `Account "Sales Revenue" not found in chart of accounts`
**Impact:** 1 test failure (UJ-010), blocks order fulfillment lifecycle.
**Risk Level:** CRITICAL (RED mode — financial records, revenue recognition)

**Related to BUG-003**: Both bugs share the same root cause pattern — chart of accounts not seeded in production. This bug specifically affects the order orchestrator's `createInvoiceWithGL()` method.

### Error Chain (verified from code)

```
1. server/services/orderOrchestrator.ts:1288-1290
   → getAccountIdByName(ACCOUNT_NAMES.SALES_REVENUE)  // "Sales Revenue"
   → Throws TRPCError NOT_FOUND if account doesn't exist

2. server/_core/accountLookup.ts:14
   → ACCOUNT_NAMES.SALES_REVENUE = "Sales Revenue"

3. server/services/seedDefaults.ts:511-517
   → Account #4000 "Sales Revenue" IS in the seed data
   → But seedDefaults may not have been run on production
```

### All 7 Required Accounts (from accountLookup.ts:10-18)

```typescript
ACCOUNTS_RECEIVABLE: "Accounts Receivable"  // #1100
ACCOUNTS_PAYABLE: "Accounts Payable"        // #2000
BAD_DEBT_EXPENSE: "Bad Debt Expense"        // (not in seedDefaults!)
SALES_REVENUE: "Sales Revenue"              // #4000
COST_OF_GOODS_SOLD: "Cost of Goods Sold"    // #5000
INVENTORY: "Inventory"                      // (not in seedDefaults!)
CASH: "Cash"                                // #1000
```

---

## TASK LIST

### Task 1: Audit seedDefaults Chart of Accounts

**What**: Read `seedDefaults.ts` to verify ALL 7 ACCOUNT_NAMES constants have corresponding entries.
**Files to READ**:
- `server/services/seedDefaults.ts` — full chart of accounts section
- `server/_core/accountLookup.ts` — all ACCOUNT_NAMES constants

**Acceptance Criteria**:
- [ ] Identified which of the 7 ACCOUNT_NAMES are missing from seed data
- [ ] Listed account numbers for all existing seed accounts

🔒 **GATE 1**: List all 7 constants with their seed status (PRESENT/MISSING).

---

### Task 2: Add Missing Accounts to Seed Defaults

**What**: Add any missing accounts from ACCOUNT_NAMES to the seed data in `seedDefaults.ts`.
**Files**: `server/services/seedDefaults.ts`

**Known seed accounts** (from reading lines 470-532):
- ✅ Cash (#1000, ASSET, DEBIT)
- ✅ Accounts Receivable (#1100, ASSET, DEBIT)
- ✅ Accounts Payable (#2000, LIABILITY, CREDIT)
- ✅ Owner's Equity (#3000, EQUITY, CREDIT)
- ✅ Retained Earnings (#3100, EQUITY, CREDIT)
- ✅ Sales Revenue (#4000, REVENUE, CREDIT)
- ✅ Cost of Goods Sold (#5000, EXPENSE, DEBIT)
- ✅ Operating Expenses (#5100, EXPENSE, DEBIT)

**Likely missing** (check):
- ❓ Bad Debt Expense — Used by ACCOUNT_NAMES but may not be in seed
- ❓ Inventory — Used by ACCOUNT_NAMES but may not be in seed

**Acceptance Criteria**:
- [ ] All 7 ACCOUNT_NAMES have corresponding seed entries
- [ ] Account numbers follow existing conventions (1xxx=Asset, 2xxx=Liability, 4xxx=Revenue, 5xxx=Expense)
- [ ] Account types and normal balances are correct

**Verification**:
```bash
pnpm check 2>&1 | tail -5
```

🔒 **GATE 2**: Paste output + show the added accounts.

---

### Task 3: Ensure seedDefaults Runs on Application Start

**What**: Verify that the chart of accounts seed runs automatically. If not, it needs to run when the app starts.
**Files to READ**:
- Find where `seedDefaultChartOfAccounts` is called — grep for the function name
- Check if it runs on app startup or only via manual script

**Acceptance Criteria**:
- [ ] seedDefaultChartOfAccounts is called during app startup
- [ ] If not, add it to the startup sequence (idempotent — uses try/catch for duplicates)

🔒 **GATE 3**: Show where the seed function is called and verify it runs on startup.

---

### Task 4: Add Defensive Error Handling in orderOrchestrator

**What**: Add a clear error message when GL accounts are missing, instead of letting it fail mid-transaction.
**Files**: `server/services/orderOrchestrator.ts` — `createInvoiceWithGL()` method

**The account lookups at lines 1285-1290 throw TRPCError(NOT_FOUND) if accounts are missing.** This is actually correct behavior — the error message is clear: `Account "Sales Revenue" not found in chart of accounts`. The real fix is ensuring the accounts exist (Task 2).

However, add a comment documenting the dependency:
```typescript
// DEPENDENCY: Requires chart of accounts to be seeded (seedDefaults.ts)
// Required accounts: Accounts Receivable (#1100), Sales Revenue (#4000)
```

**Verification**:
```bash
pnpm check 2>&1 | tail -5
```

🔒 **GATE 4**: Paste output.

---

### Task 5: Full Verification Suite

```bash
pnpm check 2>&1 | tail -5
pnpm lint 2>&1 | tail -5
pnpm test 2>&1 | tail -20
pnpm build 2>&1 | tail -10
```

🔒 **GATE 5**: Paste ALL FOUR outputs.

---

## QA PROTOCOL (5-LENS)

### Lens 1: Static Pattern Scan
- [ ] No `any` types
- [ ] New accounts follow existing naming conventions
- [ ] Account types are correct (ASSET/LIABILITY/EQUITY/REVENUE/EXPENSE)
- [ ] Normal balances are correct (DEBIT/CREDIT)

### Lens 2: Execution Path Tracing
Full order lifecycle:
- Create order → PENDING
- Add line items → validate inventory
- Confirm → CONFIRMED
- Pack → PACKED
- Ship → SHIPPED (this calls createInvoiceWithGL which needs Sales Revenue)

### Lens 3: Data Flow
- `getAccountIdByName("Sales Revenue")` → returns account.id (number) → used in ledgerEntries INSERT
- Verify the account ID is used correctly in both debit and credit entries

### Lens 4: Adversarial
1. What if seedDefaults is called twice? (idempotent — uses try/catch for duplicates ✅)
2. What if an account is soft-deleted? (lookup uses `isNull(accounts.deletedAt)`)
3. What if account name has trailing whitespace?

### Lens 5: Blast Radius
- Adding accounts to seedDefaults: no risk (idempotent inserts)
- Other code using these accounts: `payments.ts` (Cash, AR), `orderOrchestrator.ts` (AR, Revenue), `accountingHooks.ts` (COGS)
- Verify all consumers use ACCOUNT_NAMES constants, not hardcoded strings

---

## ✅ COMPLETION CHECKLIST

- [ ] All 7 ACCOUNT_NAMES have seed entries
- [ ] Missing accounts added with correct types/balances
- [ ] seedDefaults runs on startup (verified)
- [ ] Dependency comment added to orderOrchestrator
- [ ] `pnpm check` passes
- [ ] `pnpm lint` passes
- [ ] `pnpm test` passes
- [ ] `pnpm build` passes
- [ ] QA 5-lens completed

---

## MANDATORY RULES REPEATED

1. NO PHANTOM VERIFICATION — show actual output
2. NO PREMATURE COMPLETION — every checkbox needs evidence
3. READ files before editing
4. PROOF OF WORK at every 🔒 gate
