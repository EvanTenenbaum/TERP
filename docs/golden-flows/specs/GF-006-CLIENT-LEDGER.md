# GF-006: Client Ledger - Specification

**Version:** 1.0
**Created:** 2026-01-27
**Status:** ACTIVE
**Owner Role:** Accounting Manager
**Entry Point:** `/clients/:clientId/ledger` or Dashboard AR/AP widgets

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

| State       | Trigger                  | Display                                                       |
| ----------- | ------------------------ | ------------------------------------------------------------- |
| Loading     | Initial page load        | Skeleton loading animation                                    |
| Data Loaded | API returns successfully | Total Debt Owed To Me (green), Total Debt I Owe Vendors (red) |
| Empty       | No outstanding balances  | "No debt data" empty state                                    |
| Error       | API failure              | Error message with retry option                               |

### Client Ledger Page

| State                        | Trigger                        | Display                                        |
| ---------------------------- | ------------------------------ | ---------------------------------------------- |
| No Client Selected           | Initial load without clientId  | "Select a Client" prompt with client dropdown  |
| Loading                      | Client selected, fetching data | TableSkeleton animation                        |
| Data Loaded                  | API returns transactions       | Summary cards + Ledger table with pagination   |
| Empty (No Transactions)      | No transactions for filters    | "No transactions found" with filter suggestion |
| Empty (No Transactions Ever) | New client with no history     | "This client has no ledger entries yet"        |
| Filtering                    | User changes filters           | Debounced refetch, loading indicator           |
| Exporting                    | Export CSV clicked             | "Exporting..." button state                    |
| Adding Adjustment            | Adjustment dialog open         | Modal with type/amount/notes fields            |
| Confirming Adjustment        | User clicks "Add Adjustment"   | Confirmation dialog with details               |
| Error                        | Any API failure                | Toast notification with error message          |

### Client List Debt Indicators

| State         | Condition             | Display                               |
| ------------- | --------------------- | ------------------------------------- |
| No Debt       | `totalOwed <= 0`      | Muted "$0.00" text                    |
| Has Debt      | `totalOwed > 0`       | Red alert icon + clickable red amount |
| Aging Warning | `oldestDebtDays > 30` | "X days" in red beneath amount        |

---

## API Endpoints

### Dashboard Endpoints

| Endpoint                 | Method | Description                | Permission       |
| ------------------------ | ------ | -------------------------- | ---------------- |
| `dashboard.getTotalDebt` | Query  | Get aggregate AR/AP totals | `dashboard:read` |

**Request Shape:** `undefined` (no input)

**Response Shape:**

```typescript
{
  totalDebtOwedToMe: number; // AR - what clients owe
  totalDebtIOwedToVendors: number; // AP - what we owe suppliers
}
```

### Client Ledger Endpoints

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
  limit?: number;   // default: 100, max: 500
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

In the Client List, aging indicators appear when:

- `oldestDebtDays > 30`: Yellow warning
- `oldestDebtDays > 60`: Orange warning
- `oldestDebtDays > 90`: Red critical warning

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

7. **Adjustment Validation**
   - Amount MUST be positive (> 0)
   - Description is REQUIRED (min 1 character)
   - Client MUST exist

8. **Adjustment Types**
   - `CREDIT`: Reduces what client owes (e.g., discount, error correction)
   - `DEBIT`: Increases what client owes (e.g., fee, returned goods)

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

| Version | Date       | Author      | Changes               |
| ------- | ---------- | ----------- | --------------------- |
| 1.0     | 2026-01-27 | Claude Code | Initial specification |
