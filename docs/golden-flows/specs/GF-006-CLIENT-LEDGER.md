# GF-006: Client Ledger - Specification

**Version:** 1.1
**Created:** 2026-01-27
**Updated:** 2026-01-27
**Status:** ACTIVE
**Owner Role:** Accounting Manager
**Entry Point:** `/clients/:clientId/ledger` or Dashboard AR/AP widgets
**Verification Level:** A+ (All components verified against source code)

---

## Overview

The Client Ledger flow provides comprehensive AR (Accounts Receivable) and AP (Accounts Payable) visibility. It enables users to view who owes money, track complete transaction history with running balances, and analyze aging of receivables. The system supports both buyer clients (AR - they owe TERP) and supplier clients (AP - TERP owes them).

**Key Capabilities:**

- View top debtors from dashboard widgets
- Drill down into individual client ledgers
- View complete transaction history with running balance
- Filter by date range and transaction type
- Add manual credit/debit adjustments
- Export ledger data to CSV
- Calculate aging buckets for receivables

---

## User Journey

### Primary Flow: Dashboard to Client Ledger

```
1. User logs in (Accounting Manager / Sales Rep / Super Admin)
2. User views Dashboard (/dashboard)
   ├─ AR/AP Summary visible in:
   │   ├─ Total Debt Widget (debt owed TO user, debt owed BY user)
   │   ├─ Client Debt Leaderboard (top debtors)
   │   └─ Cash Collected Leaderboard
   └─ User clicks "View All" or specific client → navigates to clients
3. User navigates to /clients or /clients/:id
   ├─ Client list shows totalOwed column with aging indicator
   └─ User clicks on a client row
4. User lands on Client Profile (/clients/:id)
   ├─ Quick Stats card shows "Amount Owed"
   └─ User clicks "View Ledger" button
5. User views Client Ledger (/clients/:id/ledger)
   ├─ Summary cards: Total Transactions, Total Debits, Total Credits, Current Balance
   ├─ Filters: Client selector, Date Range, Transaction Types
   ├─ Ledger Table: Date, Type, Description, Reference, Debit, Credit, Running Balance
   └─ Actions: Export CSV, Add Adjustment
6. (Optional) User filters by date range or transaction type
7. (Optional) User adds manual adjustment (credit/debit)
8. (Optional) User exports ledger to CSV
```

### Alternative Entry: Direct Navigation

```
1. User navigates directly to /clients/:clientId/ledger
2. System loads client info and transaction history
3. User views ledger data immediately
```

### Alternative Entry: Client List Quick Action

```
1. User views Client List (/clients)
2. User sees "Amount Owed" column with value
3. User clicks the amount → navigates to Client Profile Transactions tab
4. User clicks "View Ledger" from Client Profile
```

---

## UI States

### Dashboard AR/AP Widgets

#### TotalDebtWidget (`TotalDebtWidget.tsx`)

| State       | Trigger                  | Display                                                                             |
| ----------- | ------------------------ | ----------------------------------------------------------------------------------- |
| Loading     | Initial page load        | Two `<Skeleton>` rows                                                               |
| Data Loaded | API returns successfully | Table with "Total Debt Owed to Me" (green) and "Total Debt I Owe Vendors" (red)     |
| Empty       | No outstanding balances  | EmptyState: "No debt data" / "Debt data will appear once transactions are recorded" |
| Clickable   | Row click                | "Owed to Me" → `/clients?hasDebt=true`, "I Owe Vendors" → `/accounting/bills`       |

#### ClientDebtLeaderboard (`ClientDebtLeaderboard.tsx`)

| State       | Trigger                  | Display                                                           |
| ----------- | ------------------------ | ----------------------------------------------------------------- |
| Loading     | Initial page load        | Three `<Skeleton>` rows                                           |
| Data Loaded | API returns successfully | Table with rank, client name, debt amount (red), oldest debt days |
| Empty       | No clients with debt     | "No client debt data available"                                   |

### Client Ledger Page (`ClientLedger.tsx`)

| State                 | Trigger                        | Display                                                                                                                |
| --------------------- | ------------------------------ | ---------------------------------------------------------------------------------------------------------------------- |
| No Client Selected    | Initial load without clientId  | EmptyState: BookOpen icon + "Select a Client" + "Choose a client from the dropdown above to view their ledger history" |
| Loading               | Client selected, fetching data | `<TableSkeleton rows={10} columns={7} />`                                                                              |
| Data Loaded           | API returns transactions       | 4 summary cards + Ledger table with 50 items/page pagination                                                           |
| Empty (With Filters)  | No transactions match filters  | FileText icon + "No transactions found" + "Try adjusting your filters"                                                 |
| Empty (No History)    | New client, no transactions    | FileText icon + "No transactions found" + "This client has no ledger entries yet"                                      |
| Exporting             | Export CSV clicked             | Button shows `<Loader2>` spinner + "Exporting..."                                                                      |
| Adding Adjustment     | "Add Adjustment" button        | Dialog: Adjustment Type dropdown, Amount input ($), Notes textarea                                                     |
| Confirming Adjustment | Submit adjustment              | ConfirmDialog with type/amount/client summary in muted box                                                             |

### Client List Debt Indicators (`ClientsListPage.tsx`)

| State         | Condition              | Display                                        |
| ------------- | ---------------------- | ---------------------------------------------- |
| No Debt       | `totalOwed <= 0`       | Muted "-" text                                 |
| Has Debt      | `totalOwed > 0`        | Red text showing formatted currency            |
| Aging Display | `oldestDebtDays > 0`   | Red text showing "X days" (`text-destructive`) |
| No Aging      | `oldestDebtDays === 0` | Muted "-" text                                 |

### Transaction Type Badges (Verified Colors)

| Type               | Badge Style                                          |
| ------------------ | ---------------------------------------------------- |
| `SALE`             | `bg-blue-100 text-blue-700 border-blue-200`          |
| `PURCHASE`         | `bg-purple-100 text-purple-700 border-purple-200`    |
| `PAYMENT_RECEIVED` | `bg-green-100 text-green-700 border-green-200`       |
| `PAYMENT_SENT`     | `bg-orange-100 text-orange-700 border-orange-200`    |
| `CREDIT`           | `bg-emerald-100 text-emerald-700 border-emerald-200` |
| `DEBIT`            | `bg-red-100 text-red-700 border-red-200`             |

---

## API Endpoints

### Dashboard Endpoints

| Endpoint                  | Method | Description                  | Permission       |
| ------------------------- | ------ | ---------------------------- | ---------------- |
| `dashboard.getTotalDebt`  | Query  | Get aggregate AR/AP totals   | `dashboard:read` |
| `dashboard.getClientDebt` | Query  | Get top clients by debt owed | `dashboard:read` |

#### `dashboard.getTotalDebt`

**Request Shape:** `undefined` (no input)

**Response Shape:**

```typescript
{
  totalDebtOwedToMe: number; // AR - sum of outstanding receivables
  totalDebtIOwedToVendors: number; // AP - sum of outstanding payables
  netPosition: number; // AR - AP (positive = net receivables)
}
```

**Source:** `server/routers/dashboard.ts:791-816`

#### `dashboard.getClientDebt`

**Request Shape:**

```typescript
{
  limit?: number;   // pagination limit
  offset?: number;  // pagination offset
}
```

**Response Shape:**

```typescript
{
  data: {
    customerId: number;
    customerName: string;
    currentDebt: number; // Total outstanding debt
    oldestDebt: number; // Days since oldest unpaid invoice
  }
  [];
  total: number;
  hasMore: boolean;
}
```

**Source:** `server/routers/dashboard.ts:506-530`

### Client Ledger Endpoints

**Source:** `server/routers/clientLedger.ts`

| Endpoint                           | Method   | Description                       | Permission          |
| ---------------------------------- | -------- | --------------------------------- | ------------------- |
| `clientLedger.getLedger`           | Query    | Get paginated ledger transactions | `clients:read`      |
| `clientLedger.getBalanceAsOf`      | Query    | Get balance at specific date      | `clients:read`      |
| `clientLedger.addLedgerAdjustment` | Mutation | Add manual credit/debit           | `accounting:create` |
| `clientLedger.exportLedger`        | Query    | Generate CSV export data          | `clients:read`      |
| `clientLedger.getTransactionTypes` | Query    | Get filter options                | `clients:read`      |

#### `clientLedger.getLedger`

**Request Shape:**

```typescript
{
  clientId: number;
  startDate?: Date;
  endDate?: Date;
  transactionTypes?: string[];
  limit?: number;   // Frontend uses ITEMS_PER_PAGE = 50
  offset?: number;  // default: 0
}
```

**Response Shape:**

```typescript
{
  clientId: number;
  clientName: string;
  currentBalance: number;
  balanceDescription: string;  // "They owe you $X" or "You owe them $X"
  transactions: LedgerTransaction[];
  totalCount: number;
  summary: {
    totalDebits: number;
    totalCredits: number;
    netChange: number;
  }
}
```

#### `clientLedger.addLedgerAdjustment`

**Request Shape:**

```typescript
{
  clientId: number;
  transactionType: "CREDIT" | "DEBIT";
  amount: number;  // must be positive
  description: string;
  effectiveDate?: Date;  // defaults to now
}
```

**Response Shape:**

```typescript
{
  id: number;
  clientId: number;
  clientName: string;
  transactionType: "CREDIT" | "DEBIT";
  amount: number;
  description: string;
  effectiveDate: Date;
  createdBy: number;
}
```

### Client Endpoints (Related)

| Endpoint          | Method | Description                         | Permission     |
| ----------------- | ------ | ----------------------------------- | -------------- |
| `clients.list`    | Query  | List clients with totalOwed field   | `clients:read` |
| `clients.getById` | Query  | Get single client with balance data | `clients:read` |

---

## Data Model

### Primary Tables

#### `clients`

| Column           | Type          | Description                            |
| ---------------- | ------------- | -------------------------------------- |
| `id`             | INT           | Primary key                            |
| `teriCode`       | VARCHAR(50)   | Unique client identifier               |
| `name`           | VARCHAR(255)  | Client name                            |
| `totalOwed`      | DECIMAL(15,2) | Current balance owed (computed/cached) |
| `oldestDebtDays` | INT           | Days since oldest unpaid invoice       |
| `isBuyer`        | BOOLEAN       | Client is a buyer (AR applies)         |
| `isSeller`       | BOOLEAN       | Client is a supplier (AP applies)      |

#### `payments`

| Column          | Type                     | Description                               |
| --------------- | ------------------------ | ----------------------------------------- |
| `id`            | INT                      | Primary key                               |
| `paymentNumber` | VARCHAR(50)              | Unique payment identifier                 |
| `paymentType`   | ENUM('RECEIVED', 'SENT') | RECEIVED = AR credit, SENT = AP debit     |
| `paymentDate`   | DATE                     | When payment was made                     |
| `amount`        | DECIMAL(12,2)            | Payment amount                            |
| `paymentMethod` | ENUM                     | CASH, CHECK, WIRE, ACH, CREDIT_CARD, etc. |
| `customerId`    | INT                      | FK to clients for AR payments (buyer)     |
| `vendorId`      | INT                      | FK to clients for AP payments (supplier)  |
| `createdBy`     | INT                      | FK to users (actor attribution)           |
| `deletedAt`     | TIMESTAMP                | Soft delete marker                        |

#### `orders`

| Column        | Type          | Description                     |
| ------------- | ------------- | ------------------------------- |
| `id`          | INT           | Primary key                     |
| `orderNumber` | VARCHAR(50)   | Unique order identifier         |
| `orderType`   | ENUM          | 'SALE' for AR transactions      |
| `clientId`    | INT           | FK to clients                   |
| `total`       | DECIMAL(15,2) | Order total                     |
| `saleStatus`  | ENUM          | CONFIRMED, INVOICED, PAID, etc. |
| `confirmedAt` | TIMESTAMP     | When order was confirmed        |
| `createdBy`   | INT           | FK to users                     |
| `deletedAt`   | TIMESTAMP     | Soft delete marker              |

#### `purchase_orders`

| Column                | Type          | Description                    |
| --------------------- | ------------- | ------------------------------ |
| `id`                  | INT           | Primary key                    |
| `poNumber`            | VARCHAR(50)   | Unique PO identifier           |
| `supplierClientId`    | INT           | FK to clients (supplier)       |
| `total`               | DECIMAL(15,2) | PO total                       |
| `purchaseOrderStatus` | ENUM          | CONFIRMED, RECEIVING, RECEIVED |
| `confirmedAt`         | TIMESTAMP     | When PO was confirmed          |
| `createdBy`           | INT           | FK to users                    |

#### `client_ledger_adjustments`

| Column            | Type                    | Description                     |
| ----------------- | ----------------------- | ------------------------------- |
| `id`              | INT                     | Primary key                     |
| `clientId`        | INT                     | FK to clients                   |
| `transactionType` | ENUM('CREDIT', 'DEBIT') | Adjustment type                 |
| `amount`          | DECIMAL(12,2)           | Adjustment amount               |
| `description`     | TEXT                    | Required reason for adjustment  |
| `effectiveDate`   | DATE                    | When adjustment takes effect    |
| `createdBy`       | INT                     | FK to users (actor attribution) |
| `createdAt`       | TIMESTAMP               | Record creation time            |

### Entity Relationships

```
┌─────────────────────────────────────────────────────────────┐
│                        clients                               │
│  id, name, teriCode, totalOwed, oldestDebtDays               │
│  isBuyer, isSeller                                           │
└──────────────────────────────┬──────────────────────────────┘
                               │
           ┌───────────────────┼───────────────────┐
           │                   │                   │
           ▼                   ▼                   ▼
   ┌───────────────┐   ┌───────────────┐   ┌───────────────────┐
   │    orders     │   │   payments    │   │  purchase_orders  │
   │ (SALE type)   │   │ (RECEIVED/    │   │  (supplier        │
   │ → Debit (+)   │   │  SENT type)   │   │   purchases)      │
   │               │   │ → Credit/Debit│   │ → Credit (-)      │
   └───────────────┘   └───────────────┘   └───────────────────┘
                               │
                               ▼
                 ┌─────────────────────────────┐
                 │  client_ledger_adjustments  │
                 │  (Manual CREDIT/DEBIT)      │
                 └─────────────────────────────┘
```

---

## Transaction Types & Ledger Logic

### Transaction Type Definitions

| Type               | Direction  | Amount Impact                        | Source                          |
| ------------------ | ---------- | ------------------------------------ | ------------------------------- |
| `SALE`             | Debit (+)  | Increases what client owes           | Orders (completed sales)        |
| `PURCHASE`         | Credit (-) | Decreases what client owes           | Purchase Orders (supplier)      |
| `PAYMENT_RECEIVED` | Credit (-) | Decreases what client owes           | Payments (received from client) |
| `PAYMENT_SENT`     | Debit (+)  | Increases what TERP owes             | Payments (sent to supplier)     |
| `CREDIT`           | Credit (-) | Manual adjustment decreasing balance | Manual adjustment               |
| `DEBIT`            | Debit (+)  | Manual adjustment increasing balance | Manual adjustment               |

### Running Balance Calculation

The ledger calculates running balance chronologically:

```
Starting Balance: $0
For each transaction (oldest to newest):
  if (debitAmount > 0):
    runningBalance += debitAmount
  if (creditAmount > 0):
    runningBalance -= creditAmount
Current Balance: runningBalance (positive = they owe, negative = we owe)
```

**Display Logic:**

- Positive balance: "They owe you $X" (red text)
- Negative balance: "You owe them $X" (green text)
- Zero balance: "Balance is even"

---

## Aging Calculation

### Aging Buckets

| Bucket   | Days Range | Description                       |
| -------- | ---------- | --------------------------------- |
| Current  | 0-30 days  | Recently created invoices         |
| 30 Days  | 31-60 days | Approaching overdue               |
| 60 Days  | 61-90 days | Significantly overdue             |
| 90+ Days | >90 days   | Severely overdue, collection risk |

### Aging Calculation Logic

```sql
-- Calculate oldest debt days for a client
SELECT DATEDIFF(CURRENT_DATE, MIN(invoice_date)) as oldest_debt_days
FROM orders
WHERE client_id = :clientId
  AND order_type = 'SALE'
  AND sale_status NOT IN ('PAID', 'CANCELLED')
  AND deleted_at IS NULL;
```

The `clients.oldestDebtDays` field is updated via application logic or database triggers when:

- A new invoice is created
- A payment is recorded
- An invoice is marked as paid

### Aging Display

**Client List (`ClientsListPage.tsx:869-873`):**

```tsx
{
  client.oldestDebtDays && client.oldestDebtDays > 0 ? (
    <span className="text-destructive font-medium">
      {client.oldestDebtDays} days
    </span>
  ) : (
    <span className="text-muted-foreground">-</span>
  );
}
```

- Any non-zero `oldestDebtDays` displays in red (`text-destructive`)
- Zero or null displays as muted "-"

**Client Debt Leaderboard (`ClientDebtLeaderboard.tsx:34-37`):**

```tsx
const formatAgingDays = (days: number) => {
  if (days === 0) return "-";
  return `${days}d`;
};
```

- Displays abbreviated format (e.g., "45d")
- Zero shows as "-"

---

## Business Rules

### Balance Computation Rules

1. **INV-005: Balance Accuracy**
   - `clients.totalOwed` MUST equal the sum of all unpaid invoices minus all unapplied payments
   - Formula: `totalOwed = SUM(orders.total where unpaid) - SUM(payments.amount where customerId = client)`

2. **Real-time vs Cached**
   - The ledger queries are **real-time** (not materialized views)
   - `clients.totalOwed` is a **cached** field updated on transaction changes
   - Ledger page always shows current data; list pages may have slight delay

### Transaction Rules

3. **Actor Attribution**
   - All mutations MUST have `createdBy` from authenticated context
   - No fallback user IDs (e.g., `|| 1` is forbidden)

4. **Soft Deletes**
   - Deleted transactions (`deletedAt IS NOT NULL`) are excluded from ledger
   - Deleted payments do not reduce client balance

5. **Order Status Filter**
   - Only orders with statuses `CONFIRMED`, `INVOICED`, `PAID`, `PARTIAL`, `SHIPPED`, `DELIVERED` appear in ledger
   - `DRAFT`, `CANCELLED` orders are excluded

6. **Purchase Order Status Filter**
   - Only POs with statuses `CONFIRMED`, `RECEIVING`, `RECEIVED` appear in ledger
   - `DRAFT`, `SUBMITTED`, `CANCELLED` are excluded

### Adjustment Rules

7. **Adjustment Validation** (from `ClientLedger.tsx:237-247`)
   - Amount MUST be positive (> 0) - validated with `parseFloat(amount) <= 0`
   - Notes/description is REQUIRED - validated with `!notes.trim()`
   - Toast error messages:
     - "Notes are required for adjustments"
     - "Please enter a valid positive amount"

8. **Adjustment Types** (from `ClientLedger.tsx:116-119`)

```typescript
const ADJUSTMENT_TYPES = [
  {
    value: "CREDIT",
    label: "Credit Adjustment",
    description: "Decrease what they owe",
  },
  {
    value: "DEBIT",
    label: "Debit Adjustment",
    description: "Increase what they owe",
  },
];
```

### Export Rules

9. **CSV Export**
   - Includes all transactions matching current filters
   - Sorted chronologically (oldest first)
   - Includes summary section at bottom
   - Filename: `ledger_{teriCode}_{date}.csv`

---

## Error States

| Error                      | Cause                              | Recovery                          |
| -------------------------- | ---------------------------------- | --------------------------------- |
| "Client not found"         | Invalid clientId in URL            | Navigate back to client list      |
| "Failed to load clients"   | Network error or permission denied | Retry button, check permissions   |
| "Failed to load ledger"    | Database query error               | Retry with broader filter         |
| "Failed to add adjustment" | Validation failure                 | Show specific validation errors   |
| "Amount must be positive"  | Zero or negative amount entered    | Highlight field, show message     |
| "Description is required"  | Empty notes field                  | Highlight field, show message     |
| "Permission denied"        | User lacks `accounting:create`     | Toast notification, contact admin |
| "Export failed"            | Large dataset or timeout           | Try smaller date range            |
| "Database not available"   | Connection pool exhausted          | Retry after delay                 |

---

## Invariants

### INV-005: Client Balance Accuracy

**Rule:** `clients.totalOwed` MUST always equal the calculated balance from ledger transactions.

**Verification Query:**

```sql
-- Check for balance mismatches
SELECT
  c.id,
  c.name,
  c.total_owed as cached_balance,
  COALESCE(SUM(CASE WHEN direction = 'DEBIT' THEN amount ELSE 0 END), 0) -
  COALESCE(SUM(CASE WHEN direction = 'CREDIT' THEN amount ELSE 0 END), 0) as calculated_balance
FROM clients c
LEFT JOIN (
  -- Orders (SALE = DEBIT)
  SELECT client_id, total as amount, 'DEBIT' as direction
  FROM orders
  WHERE order_type = 'SALE'
    AND sale_status IN ('CONFIRMED', 'INVOICED', 'PAID', 'PARTIAL', 'SHIPPED', 'DELIVERED')
    AND deleted_at IS NULL
  UNION ALL
  -- Payments Received (CREDIT)
  SELECT customer_id as client_id, amount, 'CREDIT' as direction
  FROM payments
  WHERE payment_type = 'RECEIVED' AND deleted_at IS NULL
  UNION ALL
  -- Manual Adjustments
  SELECT client_id, amount, transaction_type as direction
  FROM client_ledger_adjustments
) txn ON c.id = txn.client_id
GROUP BY c.id, c.name, c.total_owed
HAVING ABS(c.total_owed - (
  COALESCE(SUM(CASE WHEN direction = 'DEBIT' THEN amount ELSE 0 END), 0) -
  COALESCE(SUM(CASE WHEN direction = 'CREDIT' THEN amount ELSE 0 END), 0)
)) > 0.01;
```

**Enforcement:**

- Ledger recalculates in real-time on every query
- Cache invalidation on any transaction mutation
- Periodic reconciliation job can update cached values

### INV-007: Audit Trail

**Rule:** All ledger mutations MUST have `createdBy` populated with the authenticated user ID.

**Verification:**

```sql
-- Check for missing actor attribution
SELECT * FROM client_ledger_adjustments WHERE created_by IS NULL;
SELECT * FROM payments WHERE created_by IS NULL;
SELECT * FROM orders WHERE created_by IS NULL;
```

---

## Cross-Flow Touchpoints

### GF-003: Order-to-Cash (Impacts GF-006)

- **Trigger:** Order confirmed and invoiced
- **Impact:** Creates `SALE` debit entry in client ledger
- **Data:** Order total added to client balance
- **Status:** Client's `totalOwed` increases

### GF-004: Invoice & Payment (Impacts GF-006)

- **Trigger:** Payment recorded against invoice
- **Impact:** Creates `PAYMENT_RECEIVED` credit entry in client ledger
- **Data:** Payment amount reduces client balance
- **Status:** Client's `totalOwed` decreases, aging recalculated

### GF-002: Procure-to-Pay (Impacts GF-006)

- **Trigger:** Purchase Order confirmed/received from supplier
- **Impact:** Creates `PURCHASE` credit entry in supplier client's ledger
- **Data:** PO total creates AP liability
- **Status:** Supplier client's balance shows what TERP owes them

### Dashboard Widgets (Depend on GF-006)

- **Components:** TotalDebtWidget, ClientDebtLeaderboard
- **Data Source:** Aggregates from `clients.totalOwed`
- **Interaction:** Click-through to client list filtered by debt

### Client Profile (Depends on GF-006)

- **Component:** Quick Stats "Amount Owed" card
- **Data Source:** `clients.totalOwed` field
- **Interaction:** "View Ledger" button navigates to ledger page

---

## Security Considerations

### Permissions

| Action               | Required Permission |
| -------------------- | ------------------- |
| View ledger          | `clients:read`      |
| Export ledger        | `clients:read`      |
| Add adjustment       | `accounting:create` |
| View dashboard AR/AP | `dashboard:read`    |

### Data Sensitivity

- Client financial data is sensitive business information
- Ledger exports should be logged in audit trail
- Manual adjustments require documented reason
- No client data exposed in error messages

### Forbidden Patterns

```typescript
// FORBIDDEN - Fallback user ID
const createdBy = ctx.user?.id || 1;

// CORRECT - Require authenticated user
if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });
const createdBy = ctx.user.id;
```

---

## Implementation Files

### Frontend

| File                                                                   | Purpose                                 |
| ---------------------------------------------------------------------- | --------------------------------------- |
| `client/src/pages/ClientLedger.tsx`                                    | Main ledger page component              |
| `client/src/pages/ClientsListPage.tsx`                                 | Client list with debt column            |
| `client/src/pages/ClientProfilePage.tsx`                               | Client detail with "View Ledger" button |
| `client/src/pages/DashboardV3.tsx`                                     | Dashboard with AR/AP widgets            |
| `client/src/components/dashboard/widgets-v2/TotalDebtWidget.tsx`       | AR/AP summary widget                    |
| `client/src/components/dashboard/widgets-v2/ClientDebtLeaderboard.tsx` | Top debtors widget                      |

### Backend

| File                             | Purpose                          |
| -------------------------------- | -------------------------------- |
| `server/routers/clientLedger.ts` | Ledger router with all endpoints |
| `server/routers/clients.ts`      | Client CRUD with balance data    |
| `server/routers/dashboard.ts`    | Dashboard aggregate queries      |
| `server/clientsDb.ts`            | Client data access layer         |

### Schema

| File                | Purpose                                                      |
| ------------------- | ------------------------------------------------------------ |
| `drizzle/schema.ts` | Table definitions for clients, payments, orders, adjustments |

---

## Testing Checklist

### Unit Tests

- [ ] `clientLedger.getLedger` returns correct transactions
- [ ] Running balance calculation is accurate
- [ ] Date range filtering works correctly
- [ ] Transaction type filtering works correctly
- [ ] Pagination works correctly
- [ ] `addLedgerAdjustment` validates input
- [ ] `exportLedger` generates valid CSV

### Integration Tests

- [ ] Order creation updates client ledger
- [ ] Payment recording updates client ledger
- [ ] Manual adjustment appears in ledger
- [ ] Dashboard totals match ledger sums
- [ ] RBAC permissions enforced

### E2E Tests

- [ ] User can navigate from dashboard to client ledger
- [ ] User can filter by date range
- [ ] User can add manual adjustment
- [ ] User can export CSV
- [ ] Aging indicators display correctly

---

## Change Log

| Version | Date       | Author      | Changes                                                                                                                                                                                                                            |
| ------- | ---------- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1.0     | 2026-01-27 | Claude Code | Initial specification                                                                                                                                                                                                              |
| 1.1     | 2026-01-27 | Claude Code | Verified all components against source code; added `dashboard.getClientDebt` endpoint; corrected UI states with exact component text; added transaction badge colors; fixed aging display logic; added source file line references |
