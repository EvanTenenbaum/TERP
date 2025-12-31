# Accounting Router

**Path:** `trpc.accounting`  
**File:** `server/routers/accounting.ts`  
**Permission Required:** `accounting:read`, `accounting:create`, `accounting:update`

---

## Overview

The Accounting router provides comprehensive financial management capabilities including Chart of Accounts, General Ledger, Fiscal Periods, Invoices (AR), Bills (AP), Payments, and Cash Expenses. It implements double-entry bookkeeping principles.

---

## Sub-Routers

| Sub-Router      | Description                             |
| --------------- | --------------------------------------- |
| `accounts`      | Chart of Accounts management            |
| `ledger`        | General Ledger entries                  |
| `fiscalPeriods` | Fiscal period management                |
| `invoices`      | Accounts Receivable (customer invoices) |
| `bills`         | Accounts Payable (vendor bills)         |
| `payments`      | Payment recording                       |
| `cashExpenses`  | Cash expense tracking                   |
| `quickActions`  | Quick payment actions (WS-001, WS-002)  |

---

## Chart of Accounts (`accounts`)

### accounts.list

List accounts with optional filtering.

**Type:** Query  
**Permission:** `accounting:read`

**Input:**

```typescript
{
  accountType?: "ASSET" | "LIABILITY" | "EQUITY" | "REVENUE" | "EXPENSE";
  isActive?: boolean;
  parentAccountId?: number;
  limit?: number;   // Default: 50, max: 200
  offset?: number;  // Default: 0
}
```

**Output:**

```typescript
{
  items: Array<{
    id: number;
    accountNumber: string;
    accountName: string;
    accountType: string;
    normalBalance: "DEBIT" | "CREDIT";
    description: string | null;
    parentAccountId: number | null;
    isActive: boolean;
    createdAt: Date;
  }>;
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}
```

---

### accounts.getById

Get a single account by ID.

**Type:** Query  
**Permission:** `accounting:read`

**Input:** `{ id: number }`

---

### accounts.getByNumber

Get account by account number.

**Type:** Query  
**Permission:** `accounting:read`

**Input:** `{ accountNumber: string }`

---

### accounts.create

Create a new account.

**Type:** Mutation  
**Permission:** `accounting:create`

**Input:**

```typescript
{
  accountNumber: string;
  accountName: string;
  accountType: "ASSET" | "LIABILITY" | "EQUITY" | "REVENUE" | "EXPENSE";
  normalBalance: "DEBIT" | "CREDIT";
  description?: string;
  parentAccountId?: number;
  isActive?: boolean;
}
```

---

### accounts.update

Update an existing account.

**Type:** Mutation  
**Permission:** `accounting:update`

**Input:**

```typescript
{
  id: number;
  accountName?: string;
  description?: string;
  isActive?: boolean;
}
```

---

### accounts.getBalance

Get account balance as of a specific date.

**Type:** Query  
**Permission:** `accounting:read`

**Input:**

```typescript
{
  accountId: number;
  asOfDate: Date;
}
```

**Output:**

```typescript
{
  accountId: number;
  balance: number;
  asOfDate: Date;
}
```

---

### accounts.getChartOfAccounts

Get the complete chart of accounts in hierarchical structure.

**Type:** Query  
**Permission:** `accounting:read`

**Input:** None

---

## General Ledger (`ledger`)

### ledger.list

List ledger entries with filtering.

**Type:** Query  
**Permission:** `accounting:read`

**Input:**

```typescript
{
  accountId?: number;
  startDate?: Date;
  endDate?: Date;
  fiscalPeriodId?: number;
  isPosted?: boolean;
  referenceType?: string;
  referenceId?: number;
  limit?: number;
  offset?: number;
}
```

---

### ledger.create

Create a ledger entry.

**Type:** Mutation  
**Permission:** `accounting:create`

**Input:**

```typescript
{
  entryNumber: string;
  entryDate: Date;
  accountId: number;
  debit: string;      // Decimal as string
  credit: string;     // Decimal as string
  description: string;
  fiscalPeriodId: number;
  referenceType?: string;
  referenceId?: number;
  isManual?: boolean;
}
```

---

### ledger.postJournalEntry

Post a balanced journal entry (debit and credit).

**Type:** Mutation  
**Permission:** `accounting:read`

**Input:**

```typescript
{
  entryDate: Date;
  debitAccountId: number;
  creditAccountId: number;
  amount: number;
  description: string;
  fiscalPeriodId: number;
  referenceType?: string;
  referenceId?: number;
}
```

---

### ledger.getTrialBalance

Get trial balance for a fiscal period.

**Type:** Query  
**Permission:** `accounting:read`

**Input:** `{ fiscalPeriodId: number }`

**Output:**

```typescript
Array<{
  accountId: number;
  accountNumber: string;
  accountName: string;
  debitBalance: number;
  creditBalance: number;
}>;
```

---

## Fiscal Periods (`fiscalPeriods`)

### fiscalPeriods.list

List fiscal periods.

**Type:** Query  
**Permission:** `accounting:read`

**Input:**

```typescript
{
  status?: "OPEN" | "CLOSED" | "LOCKED";
  year?: number;
}
```

---

### fiscalPeriods.getCurrent

Get the current open fiscal period.

**Type:** Query  
**Permission:** `accounting:read`

---

### fiscalPeriods.create

Create a new fiscal period.

**Type:** Mutation  
**Permission:** `accounting:create`

**Input:**

```typescript
{
  periodName: string;
  startDate: Date;
  endDate: Date;
  fiscalYear: number;
}
```

---

### fiscalPeriods.close

Close a fiscal period (prevents new entries).

**Type:** Mutation  
**Permission:** `accounting:read`

**Input:** `{ id: number }`

---

### fiscalPeriods.lock

Lock a fiscal period (prevents any modifications).

**Type:** Mutation  
**Permission:** `accounting:read`

**Input:** `{ id: number }`

---

### fiscalPeriods.reopen

Reopen a closed (not locked) fiscal period.

**Type:** Mutation  
**Permission:** `accounting:read`

**Input:** `{ id: number }`

---

## Invoices - Accounts Receivable (`invoices`)

### invoices.list

List customer invoices.

**Type:** Query  
**Permission:** `accounting:read`

**Input:**

```typescript
{
  customerId?: number;
  status?: "DRAFT" | "SENT" | "VIEWED" | "PARTIAL" | "PAID" | "OVERDUE" | "VOID";
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
  searchTerm?: string;
}
```

---

### invoices.create

Create a new invoice.

**Type:** Mutation  
**Permission:** `accounting:create`

**Input:**

```typescript
{
  invoiceNumber: string;
  customerId: number;
  invoiceDate: Date;
  dueDate: Date;
  subtotal: string;
  taxAmount?: string;
  discountAmount?: string;
  totalAmount: string;
  paymentTerms?: string;
  notes?: string;
  referenceType?: string;
  referenceId?: number;
  lineItems: Array<{
    productId?: number;
    batchId?: number;
    description: string;
    quantity: string;
    unitPrice: string;
    taxRate?: string;
    discountPercent?: string;
    lineTotal: string;
  }>;
}
```

---

## Quick Actions (`quickActions`)

These endpoints implement the WS-001 and WS-002 features for rapid payment processing.

### quickActions.receivePayment

**WS-001:** Quick action to receive a client payment (cash drop-off).

**Type:** Mutation  
**Permission:** `accounting:create`

**Input:**

```typescript
{
  clientId: number;
  amount: number;
  paymentMethod: "CASH" | "CHECK" | "WIRE" | "ACH" | "CREDIT_CARD";
  reference?: string;
  notes?: string;
  applyToInvoices?: Array<{
    invoiceId: number;
    amount: number;
  }>;
}
```

**Output:**

```typescript
{
  success: boolean;
  paymentId: number;
  receiptNumber: string;
  appliedAmount: number;
  remainingCredit: number;
}
```

---

### quickActions.payVendor

**WS-002:** Quick action to pay a vendor (cash out).

**Type:** Mutation  
**Permission:** `accounting:create`

**Input:**

```typescript
{
  vendorId: number;
  amount: number;
  paymentMethod: "CASH" | "CHECK" | "WIRE" | "ACH";
  reference?: string;
  notes?: string;
  applyToBills?: Array<{
    billId: number;
    amount: number;
  }>;
}
```

**Output:**

```typescript
{
  success: boolean;
  paymentId: number;
  checkNumber?: string;
  appliedAmount: number;
  remainingBalance: number;
}
```

---

## Usage Examples

### Create and Post Journal Entry

```typescript
// Post a sales revenue entry
const entry = await trpc.accounting.ledger.postJournalEntry.mutate({
  entryDate: new Date(),
  debitAccountId: 1100, // Accounts Receivable
  creditAccountId: 4000, // Sales Revenue
  amount: 5000.0,
  description: "Sale to Client #42",
  fiscalPeriodId: 1,
  referenceType: "ORDER",
  referenceId: 12345,
});
```

### Receive Client Payment

```typescript
// Quick receive payment from client
const payment = await trpc.accounting.quickActions.receivePayment.mutate({
  clientId: 42,
  amount: 2500.0,
  paymentMethod: "CASH",
  notes: "Cash drop-off",
  applyToInvoices: [
    { invoiceId: 101, amount: 1500.0 },
    { invoiceId: 102, amount: 1000.0 },
  ],
});

console.log(`Receipt #${payment.receiptNumber} created`);
```

### Get Trial Balance

```typescript
const trialBalance = await trpc.accounting.ledger.getTrialBalance.query({
  fiscalPeriodId: 1,
});

// Verify debits equal credits
const totalDebits = trialBalance.reduce((sum, a) => sum + a.debitBalance, 0);
const totalCredits = trialBalance.reduce((sum, a) => sum + a.creditBalance, 0);
console.log(`Debits: ${totalDebits}, Credits: ${totalCredits}`);
```

---

## Account Types Reference

| Type      | Normal Balance | Examples                             |
| --------- | -------------- | ------------------------------------ |
| ASSET     | Debit          | Cash, Accounts Receivable, Inventory |
| LIABILITY | Credit         | Accounts Payable, Loans Payable      |
| EQUITY    | Credit         | Owner's Equity, Retained Earnings    |
| REVENUE   | Credit         | Sales Revenue, Service Income        |
| EXPENSE   | Debit          | Cost of Goods Sold, Wages, Rent      |

---

## Related Routers

- [Credit](./credit.md) - Client credit management
- [COGS](./cogs.md) - Cost of goods sold calculations
- [Receipts](./receipts.md) - Receipt generation (WS-006)
- [Clients](./clients.md) - Client/customer data

---

_Documentation generated as part of the Documentation & Testing Infrastructure Sprint_
