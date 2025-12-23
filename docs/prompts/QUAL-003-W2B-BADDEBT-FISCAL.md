# QUAL-003 Wave 2B: Bad Debt & Fiscal Period Integration

**Wave:** 2 (Core Business Logic)  
**Agent:** 2B (Bad Debt & Fiscal)  
**Priority:** 🟡 HIGH - Financial data integrity  
**Estimated Time:** 3 hours  
**Dependencies:** Wave 1 complete

---

## Mission

Fix the bad debt module to use actual account IDs from the chart of accounts and properly calculate fiscal periods instead of using hardcoded values.

---

## Files You Own (EXCLUSIVE)

Only you will touch these files. No other agent will modify them.

| File | TODOs |
|------|-------|
| `server/badDebtDb.ts` | Lines 167, 174, 181, 188, 317, 324, 331, 338 |
| `server/accountingHooks.ts` | Line 71 |

---

## Task W2-B1: Fix Account ID References in badDebtDb.ts

**Current Code (Lines 167, 181, 317, 331):**
```typescript
// TODO: Reference actual account IDs from chart of accounts
debitAccountId: 1, // Hardcoded!
creditAccountId: 2, // Hardcoded!
```

**Implementation:**

```typescript
import { getAccountIdByName, ACCOUNT_NAMES } from "../_core/accountLookup";

// In the bad debt write-off function:
async function createBadDebtWriteOff(
  invoiceId: number,
  amount: number,
  ctx: Context
) {
  const userId = getCurrentUserId(ctx);
  
  // Get actual account IDs
  const badDebtExpenseId = await getAccountIdByName(ACCOUNT_NAMES.BAD_DEBT_EXPENSE);
  const accountsReceivableId = await getAccountIdByName(ACCOUNT_NAMES.ACCOUNTS_RECEIVABLE);

  // Create ledger entry
  await db.insert(ledgerEntries).values({
    date: new Date(),
    description: `Bad debt write-off for Invoice #${invoiceId}`,
    debitAccountId: badDebtExpenseId,  // Debit Bad Debt Expense
    creditAccountId: accountsReceivableId,  // Credit Accounts Receivable
    amount,
    createdBy: userId,
    // ... other fields
  });
}
```

**Apply to all 4 locations:**
- Line 167: Bad debt write-off debit account
- Line 181: Bad debt write-off credit account
- Line 317: Bad debt recovery debit account
- Line 331: Bad debt recovery credit account

---

## Task W2-B2: Fix Fiscal Period Calculation in badDebtDb.ts

**Current Code (Lines 174, 188, 324, 338):**
```typescript
// TODO: Calculate fiscal period based on date
fiscalPeriodId: 1, // Hardcoded!
```

**Implementation:**

```typescript
import { getFiscalPeriodId } from "../_core/fiscalPeriod";

// In the bad debt functions:
async function createBadDebtWriteOff(
  invoiceId: number,
  amount: number,
  date: Date,
  ctx: Context
) {
  const userId = getCurrentUserId(ctx);
  
  // Get fiscal period for the transaction date
  const fiscalPeriodId = await getFiscalPeriodId(date);

  await db.insert(ledgerEntries).values({
    date,
    fiscalPeriodId,  // Now properly calculated
    // ... other fields
  });
}
```

**Apply to all 4 locations:**
- Line 174: Write-off fiscal period
- Line 188: Write-off fiscal period (if different entry)
- Line 324: Recovery fiscal period
- Line 338: Recovery fiscal period (if different entry)

---

## Task W2-B3: Fix Fiscal Period in accountingHooks.ts

**File:** `server/accountingHooks.ts`

**Current Code (Line 71):**
```typescript
// TODO: Implement fiscal period lookup
fiscalPeriodId: 1, // Hardcoded!
```

**Implementation:**

```typescript
import { getFiscalPeriodId, getFiscalPeriodIdOrDefault } from "../_core/fiscalPeriod";

// In the accounting hook:
async function createAccountingEntry(
  entry: AccountingEntryInput,
  ctx: Context
) {
  const userId = getCurrentUserId(ctx);
  
  // Get fiscal period, with fallback for historical data
  const fiscalPeriodId = await getFiscalPeriodIdOrDefault(
    entry.date,
    1 // Default to period 1 if not found (for historical data)
  );

  await db.insert(ledgerEntries).values({
    ...entry,
    fiscalPeriodId,
    createdBy: userId,
  });
}
```

---

## Complete Implementation Pattern

Here's the full pattern for `badDebtDb.ts`:

```typescript
import { db } from "./_core/db";
import { ledgerEntries, invoices } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { getCurrentUserId } from "./_core/authHelpers";
import { getFiscalPeriodId } from "./_core/fiscalPeriod";
import { getAccountIdByName, ACCOUNT_NAMES } from "./_core/accountLookup";

export async function writeOffBadDebt(
  invoiceId: number,
  amount: number,
  reason: string,
  ctx: Context
) {
  const userId = getCurrentUserId(ctx);
  const transactionDate = new Date();

  return await db.transaction(async (tx) => {
    // 1. Get account IDs
    const badDebtExpenseId = await getAccountIdByName(ACCOUNT_NAMES.BAD_DEBT_EXPENSE);
    const accountsReceivableId = await getAccountIdByName(ACCOUNT_NAMES.ACCOUNTS_RECEIVABLE);

    // 2. Get fiscal period
    const fiscalPeriodId = await getFiscalPeriodId(transactionDate);

    // 3. Create debit entry (Bad Debt Expense)
    await tx.insert(ledgerEntries).values({
      date: transactionDate,
      description: `Bad debt write-off: ${reason}`,
      debitAccountId: badDebtExpenseId,
      creditAccountId: null,
      amount,
      fiscalPeriodId,
      referenceType: "invoice",
      referenceId: invoiceId,
      createdBy: userId,
    });

    // 4. Create credit entry (Accounts Receivable)
    await tx.insert(ledgerEntries).values({
      date: transactionDate,
      description: `Bad debt write-off: ${reason}`,
      debitAccountId: null,
      creditAccountId: accountsReceivableId,
      amount,
      fiscalPeriodId,
      referenceType: "invoice",
      referenceId: invoiceId,
      createdBy: userId,
    });

    // 5. Update invoice status
    await tx
      .update(invoices)
      .set({
        status: "written_off",
        writtenOffAt: transactionDate,
        writtenOffBy: userId,
        writtenOffAmount: amount,
        writtenOffReason: reason,
      })
      .where(eq(invoices.id, invoiceId));

    return { invoiceId, amount, fiscalPeriodId };
  });
}

export async function recoverBadDebt(
  invoiceId: number,
  amount: number,
  ctx: Context
) {
  const userId = getCurrentUserId(ctx);
  const transactionDate = new Date();

  return await db.transaction(async (tx) => {
    // 1. Get account IDs (reverse of write-off)
    const badDebtExpenseId = await getAccountIdByName(ACCOUNT_NAMES.BAD_DEBT_EXPENSE);
    const accountsReceivableId = await getAccountIdByName(ACCOUNT_NAMES.ACCOUNTS_RECEIVABLE);

    // 2. Get fiscal period
    const fiscalPeriodId = await getFiscalPeriodId(transactionDate);

    // 3. Create debit entry (Accounts Receivable - restore)
    await tx.insert(ledgerEntries).values({
      date: transactionDate,
      description: `Bad debt recovery for Invoice #${invoiceId}`,
      debitAccountId: accountsReceivableId,
      creditAccountId: null,
      amount,
      fiscalPeriodId,
      referenceType: "invoice",
      referenceId: invoiceId,
      createdBy: userId,
    });

    // 4. Create credit entry (Bad Debt Expense - reverse)
    await tx.insert(ledgerEntries).values({
      date: transactionDate,
      description: `Bad debt recovery for Invoice #${invoiceId}`,
      debitAccountId: null,
      creditAccountId: badDebtExpenseId,
      amount,
      fiscalPeriodId,
      referenceType: "invoice",
      referenceId: invoiceId,
      createdBy: userId,
    });

    // 5. Update invoice status
    await tx
      .update(invoices)
      .set({
        status: "open", // or appropriate status
        recoveredAt: transactionDate,
        recoveredBy: userId,
        recoveredAmount: amount,
      })
      .where(eq(invoices.id, invoiceId));

    return { invoiceId, amount, fiscalPeriodId };
  });
}
```

---

## Deliverables Checklist

- [ ] `badDebtDb.ts` - Lines 167, 181 use `getAccountIdByName()` for write-off
- [ ] `badDebtDb.ts` - Lines 317, 331 use `getAccountIdByName()` for recovery
- [ ] `badDebtDb.ts` - Lines 174, 188 use `getFiscalPeriodId()` for write-off
- [ ] `badDebtDb.ts` - Lines 324, 338 use `getFiscalPeriodId()` for recovery
- [ ] `accountingHooks.ts` - Line 71 uses `getFiscalPeriodId()`
- [ ] All TODO comments removed from these files
- [ ] No hardcoded account IDs or fiscal period IDs remain

---

## QA Requirements (Before Merge)

```bash
# 1. TypeScript check
pnpm typecheck

# 2. Lint check
pnpm lint

# 3. Verify no hardcoded IDs remain
grep -n "accountId: [0-9]\|fiscalPeriodId: [0-9]" server/badDebtDb.ts
grep -n "accountId: [0-9]\|fiscalPeriodId: [0-9]" server/accountingHooks.ts
# Should return nothing

# 4. Verify TODOs removed
grep -n "TODO" server/badDebtDb.ts server/accountingHooks.ts
# Should return nothing (or only unrelated TODOs)

# 5. Run tests
pnpm test badDebt accounting

# 6. Integration test
# - Create a bad debt write-off
# - Verify ledger entries have correct account IDs
# - Verify fiscal period is correct for the date
```

---

## Do NOT

- ❌ Touch files not in your ownership list
- ❌ Modify the chart of accounts or fiscal periods tables
- ❌ Skip transaction wrapping
- ❌ Introduce new TODOs
- ❌ Use hardcoded IDs

---

## Dependencies

Use these Wave 0 utilities:
- `getCurrentUserId(ctx)` from `server/_core/authHelpers.ts`
- `getFiscalPeriodId(date)` from `server/_core/fiscalPeriod.ts`
- `getAccountIdByName(name)` from `server/_core/accountLookup.ts`
- `ACCOUNT_NAMES` constants from `server/_core/accountLookup.ts`

---

## Success Criteria

Your work is complete when:

- [ ] All 9 TODOs resolved (8 in badDebtDb.ts, 1 in accountingHooks.ts)
- [ ] Account IDs dynamically looked up from chart of accounts
- [ ] Fiscal periods calculated from transaction dates
- [ ] `pnpm typecheck` passes
- [ ] `pnpm test` passes
- [ ] Code merged to main
