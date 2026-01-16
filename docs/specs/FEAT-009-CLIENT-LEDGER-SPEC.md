# FEAT-009: Simple Client Ledger

## Specification for MEET-010

**Status:** ✅ APPROVED (2026-01-12)
**Priority:** CRITICAL (Wave 1)
**Estimate:** 16h (8h Backend + 8h Frontend)
**Source:** Customer Meeting 2026-01-11

### Approval Notes
- **Data Approach:** Real-time query (NOT materialized view) - always current data
- **System Integration:** Must integrate with ALL tracking and calculations system-wide
- **Display:** Keep display simple as per user feedback (in/out with running balance)

---

## Problem Statement

> "His tab is the most annoying... we credit his tab for shipping, products, flowers..."
> "It's kind of a lot of in and out"

Complex client relationships (buyer AND supplier) create confusion:
1. Multiple transaction types (products, shipping, credits, debits)
2. No unified view of "what they owe" vs "what you owe them"
3. Difficult to resolve disputes about historical balances
4. Copy/paste errors when tracking manually

---

## Requirements

### MEET-010: Simple Client Ledger

**User Story:** As a manager, I want a unified ledger showing all transactions with a client so I can see a clear balance.

**Acceptance Criteria:**
- [ ] Single view showing ALL credits and debits for a client
- [ ] Running balance calculation (positive = they owe you)
- [ ] "What they owe" / "What you owe them" in plain language
- [ ] Filter by transaction type, date range
- [ ] Point-in-time balance lookup for disputes
- [ ] Export to CSV/PDF

**UI Wireframe:**
```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Client Ledger: Jesse's Greenhouse                                            │
│                                                                              │
│ ┌──────────────────────────────────────────────────────────────────────────┐│
│ │  THEY OWE YOU: $2,450.00                                                 ││
│ └──────────────────────────────────────────────────────────────────────────┘│
│                                                                              │
│ Filter: [All Types ▼] [Date Range: Last 30 days ▼] [Export ▼]               │
├─────────────────────────────────────────────────────────────────────────────┤
│ Date       │ Type           │ Description            │ Debit   │ Credit │Bal│
│ 01/12/2026 │ SALE           │ Order #1234           │ $500    │        │$2450│
│ 01/11/2026 │ PAYMENT        │ Cash payment received │         │ $300   │$1950│
│ 01/10/2026 │ SALE           │ Order #1233           │ $750    │        │$2250│
│ 01/09/2026 │ CREDIT         │ Shipping refund       │         │ $50    │$1500│
│ 01/08/2026 │ PURCHASE       │ Bought product from   │         │ $200   │$1550│
│ 01/05/2026 │ SALE           │ Order #1230           │ $1000   │        │$1750│
├─────────────────────────────────────────────────────────────────────────────┤
│ Showing 6 of 45 transactions                              [Load More]        │
└─────────────────────────────────────────────────────────────────────────────┘

Point-in-Time Balance: As of [01/08/2026], balance was $1,550.00
```

**Transaction Types:**
| Type | Direction | Description |
|------|-----------|-------------|
| SALE | Debit (+) | You sold to them |
| PURCHASE | Credit (-) | You bought from them |
| PAYMENT_RECEIVED | Credit (-) | They paid you |
| PAYMENT_SENT | Debit (+) | You paid them |
| CREDIT | Credit (-) | Credit applied (refund, compensation) |
| DEBIT | Debit (+) | Charge applied (fee, adjustment) |
| TRANSFER | Either | Internal transfer |

**API Contract:**
```typescript
// New endpoint: clients.getLedger
type GetClientLedgerRequest = {
  clientId: number;
  startDate?: Date;
  endDate?: Date;
  transactionTypes?: string[];
  limit?: number;
  offset?: number;
};

type ClientLedgerResponse = {
  clientId: number;
  clientName: string;
  currentBalance: number;           // Positive = they owe you
  balanceDescription: string;       // "They owe you $X" or "You owe them $X"
  transactions: LedgerTransaction[];
  totalCount: number;
  summary: {
    totalDebits: number;
    totalCredits: number;
    netChange: number;
  };
};

type LedgerTransaction = {
  id: number;
  date: Date;
  type: LedgerTransactionType;
  description: string;
  referenceType?: string;           // 'ORDER', 'PURCHASE', 'PAYMENT', etc.
  referenceId?: number;
  debitAmount?: number;
  creditAmount?: number;
  runningBalance: number;
  createdBy: string;
};

// New endpoint: clients.getBalanceAsOf
type GetBalanceAsOfRequest = {
  clientId: number;
  asOfDate: Date;
};

type BalanceAsOfResponse = {
  clientId: number;
  asOfDate: Date;
  balance: number;
  balanceDescription: string;
};
```

---

## Data Integration

The ledger aggregates data from multiple sources:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           CLIENT LEDGER VIEW                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐            │
│  │   Orders   │  │  Invoices  │  │  Payments  │  │ Purchases  │            │
│  │  (sales)   │  │ (AR items) │  │ (received) │  │(from them) │            │
│  └─────┬──────┘  └─────┬──────┘  └─────┬──────┘  └─────┬──────┘            │
│        │               │               │               │                    │
│        └───────────────┴───────────────┴───────────────┘                    │
│                                │                                             │
│                                ▼                                             │
│                    ┌────────────────────────┐                               │
│                    │ client_ledger_entries  │                               │
│                    │ (materialized view or  │                               │
│                    │  real-time query)      │                               │
│                    └────────────────────────┘                               │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Dependencies

| Dependency | Type | Status |
|------------|------|--------|
| BUG-078 (orders.getAll) | Must be fixed | Sprint 0 |
| Existing invoices system | Integration | Exists |
| Existing payments system | Integration | Exists |

---

## Database Changes

### Option A: Materialized View (NOT SELECTED)

```sql
-- Create a materialized view for fast ledger queries
CREATE MATERIALIZED VIEW client_ledger_entries AS
SELECT
  'ORDER' as source_type,
  o.id as source_id,
  o.client_id,
  o.created_at as transaction_date,
  'SALE' as transaction_type,
  o.total_amount as debit_amount,
  NULL as credit_amount,
  CONCAT('Order #', o.order_number) as description
FROM orders o
WHERE o.status = 'completed'

UNION ALL

SELECT
  'PAYMENT' as source_type,
  p.id as source_id,
  p.client_id,
  p.payment_date as transaction_date,
  'PAYMENT_RECEIVED' as transaction_type,
  NULL as debit_amount,
  p.amount as credit_amount,
  CONCAT('Payment - ', p.payment_method) as description
FROM payments p

UNION ALL

SELECT
  'PURCHASE' as source_type,
  po.id as source_id,
  po.supplier_id as client_id,
  po.completed_at as transaction_date,
  'PURCHASE' as transaction_type,
  NULL as debit_amount,
  po.total_amount as credit_amount,
  CONCAT('Purchase from supplier') as description
FROM purchase_orders po
WHERE po.status = 'completed'

-- Add more UNION ALLs for credits, adjustments, etc.

ORDER BY transaction_date DESC;

-- Create index for fast queries
CREATE INDEX idx_client_ledger_client ON client_ledger_entries(client_id);
CREATE INDEX idx_client_ledger_date ON client_ledger_entries(transaction_date);

-- Refresh strategy: on transaction completion or scheduled
CREATE OR REPLACE FUNCTION refresh_client_ledger()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY client_ledger_entries;
END;
$$ LANGUAGE plpgsql;
```

### Option B: Real-time Query ✅ APPROVED

Use a complex query that joins all sources at runtime. This ensures data is always 100% current.

**Implementation:**
```typescript
// Real-time query approach - joins all source tables live
async function getClientLedger(clientId: number, filters: LedgerFilters): Promise<ClientLedgerResponse> {
  // Query orders, payments, purchases, adjustments in real-time
  // Calculate running balance on the fly
  // Return unified view
}
```

**Trade-offs:**
- ✅ Always 100% accurate (no stale data)
- ✅ No refresh management needed
- ⚠️ Slightly slower queries (500ms-2s depending on transaction volume)
- ⚠️ May need pagination for clients with large transaction history

### Manual Adjustments Table

```sql
-- For manual credits/debits not tied to orders/payments
CREATE TABLE client_ledger_adjustments (
  id SERIAL PRIMARY KEY,
  client_id INTEGER REFERENCES clients(id),
  transaction_type VARCHAR(20) NOT NULL, -- 'CREDIT', 'DEBIT'
  amount DECIMAL(12,2) NOT NULL,
  description TEXT NOT NULL,
  effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## Feature Flags

| Flag | Default | Description |
|------|---------|-------------|
| `client_ledger_enabled` | true | Enable client ledger feature |
| `ledger_export_enabled` | true | Enable CSV/PDF export |

> **Note:** No `ledger_realtime_refresh` flag needed - always using real-time queries per approval.

---

## Test Plan

### Unit Tests
- [ ] Ledger entry aggregation from orders
- [ ] Ledger entry aggregation from payments
- [ ] Ledger entry aggregation from purchases
- [ ] Running balance calculation
- [ ] Point-in-time balance calculation
- [ ] Filter by type/date

### Integration Tests
- [ ] Create order → appears in ledger
- [ ] Record payment → appears in ledger
- [ ] Manual adjustment → appears in ledger
- [ ] Balance updates correctly

### E2E Tests
- [ ] Full ledger view loads
- [ ] Filtering works
- [ ] Export generates correct data
- [ ] Point-in-time lookup accurate

---

## Success Metrics

> **User Quote:** "What they owe" / "What you owe them" in plain language

- [ ] Single source of truth for client balance
- [ ] Balance disputes resolvable in < 5 minutes
- [ ] Zero discrepancies between ledger and actual transactions
- [ ] Export used for month-end reconciliation

---

## System-Wide Integration (CRITICAL)

The client ledger MUST integrate with all existing tracking and calculations:

### Data Sources (All must flow into ledger)
- Orders (sales to client)
- Payments received (from client)
- Invoices (AR items)
- Purchases (from client as supplier)
- Payments sent (to client as supplier)
- Service credits (shipping, consulting)
- Manual adjustments
- Consignment settlements

### Systems That Use Ledger Balance
- Dashboard (Available Money calculation)
- Order creation (credit warnings)
- Payables tracking
- Cash audit reconciliation
- VIP tier calculations (if based on spend)

---

## UI Components

### Integration Points

1. **Client Detail Page**: Add "Ledger" tab
2. **Client List**: Show current balance column
3. **Order Creation**: Show client balance warning if balance exceeds threshold
4. **Dashboard**: Show top debtors widget
5. **Payables Module**: Reference ledger for supplier payments due

### Balance Warning

```typescript
// Show warning when creating order for client with high balance
type BalanceWarning = {
  clientId: number;
  balance: number;
  creditLimit: number;
  warningLevel: 'INFO' | 'WARNING' | 'CRITICAL';
  message: string; // "Client owes $2,450. Credit limit is $3,000."
};
```

---

**Spec Status:** ✅ APPROVED
**Created:** 2026-01-12
**Approved:** 2026-01-12 by Product Owner
