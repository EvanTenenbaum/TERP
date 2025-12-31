# Specification: WS-005 - No Black Box Audit Trail (System-Wide)

**Status:** Approved  
**Priority:** CRITICAL  
**Estimate:** 30h  
**Module:** System Core  
**Dependencies:** None  
**Spec Author:** Manus AI  
**Spec Date:** 2025-12-30  

---

## 1. Problem Statement

Users have expressed concern that calculated values in the system (balances, inventory counts, totals) appear as "black boxes" - they can't see how the numbers were derived. This erodes trust and makes it difficult to identify discrepancies. The system needs to provide **full transparency** into every calculated value, showing the source data and calculation logic on demand.

Key principle: **"No black boxes"** - every number must be explainable.

## 2. User Stories

1. **As a staff member**, I want to click on any calculated value and see how it was derived, so that I can trust the numbers and identify errors.

2. **As a manager**, I want to audit any balance or total by seeing all contributing transactions, so that I can verify accuracy and resolve disputes.

3. **As an accountant**, I want to see the journal entries and transactions behind any financial figure, so that I can reconcile accounts.

4. **As a warehouse worker**, I want to see why inventory shows a specific count, so that I can identify discrepancies with physical counts.

## 3. Functional Requirements

### 3.1 Core Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-01 | "Audit" button/icon next to all calculated fields | Must Have |
| FR-02 | Audit modal shows source data and calculation breakdown | Must Have |
| FR-03 | Audit trail for client tab balance | Must Have |
| FR-04 | Audit trail for inventory quantities | Must Have |
| FR-05 | Audit trail for order totals | Must Have |
| FR-06 | Audit trail for vendor balances | Must Have |
| FR-07 | Timestamps and user attribution for all source data | Must Have |
| FR-08 | Export audit data to CSV/PDF | Should Have |
| FR-09 | Filter audit data by date range | Should Have |
| FR-10 | Link to source records from audit view | Nice to Have |

### 3.2 Calculated Fields Requiring Audit Trail

| Module | Field | Calculation Logic |
|--------|-------|-------------------|
| Client Profile | Tab Balance | Sum(orders) - Sum(payments) + Sum(credits) - Sum(refunds) |
| Client Profile | Credit Limit Used | Sum(unpaid_orders) |
| Vendor Profile | Amount Owed | Sum(bills) - Sum(payments) |
| Inventory | Quantity on Hand | Sum(intake) - Sum(sold) - Sum(adjustments) + Sum(returns) |
| Inventory | Reserved Quantity | Sum(pending_orders) |
| Order | Order Total | Sum(line_items) - Sum(discounts) + Sum(taxes) |
| Order | Amount Paid | Sum(payments) |
| Order | Balance Due | Order Total - Amount Paid |
| Accounting | Account Balance | Sum(debits) - Sum(credits) |

### 3.3 Business Rules

| ID | Rule | Example |
|----|------|---------|
| BR-01 | Audit data must be read-only | Cannot modify from audit view |
| BR-02 | All source records must have created_by and created_at | Attribution requirement |
| BR-03 | Audit queries must not block main operations | Performance requirement |
| BR-04 | Audit data retained indefinitely | No automatic purging |
| BR-05 | Audit access follows existing permissions | Users see only what they can access |

## 4. Technical Specification

### 4.1 Data Model Changes

```sql
-- No new tables required for basic audit
-- Ensure all relevant tables have:
-- - created_at TIMESTAMP
-- - created_by INT REFERENCES users(id)
-- - updated_at TIMESTAMP
-- - updated_by INT REFERENCES users(id)

-- Optional: Audit log table for tracking all changes
CREATE TABLE audit_log (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  table_name VARCHAR(100) NOT NULL,
  record_id INT NOT NULL,
  action ENUM('INSERT', 'UPDATE', 'DELETE') NOT NULL,
  old_values JSON,
  new_values JSON,
  changed_by INT REFERENCES users(id),
  changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_table_record (table_name, record_id),
  INDEX idx_changed_at (changed_at)
);
```

### 4.2 API Contracts

```typescript
// Generic audit endpoint for any calculated field
audit.getCalculationBreakdown = adminProcedure
  .input(z.object({
    entityType: z.enum(['CLIENT', 'VENDOR', 'INVENTORY', 'ORDER', 'ACCOUNT']),
    entityId: z.number(),
    fieldName: z.string(), // e.g., 'tabBalance', 'quantityOnHand'
    dateFrom: z.date().optional(),
    dateTo: z.date().optional()
  }))
  .output(z.object({
    currentValue: z.number(),
    calculationFormula: z.string(), // Human-readable formula
    components: z.array(z.object({
      type: z.string(), // e.g., 'ORDER', 'PAYMENT', 'ADJUSTMENT'
      description: z.string(),
      amount: z.number(),
      date: z.date(),
      createdBy: z.string(),
      sourceId: z.number(),
      sourceType: z.string()
    })),
    runningTotal: z.array(z.object({
      date: z.date(),
      balance: z.number()
    }))
  }))
  .query(async ({ input }) => {
    // Fetch and calculate breakdown based on entityType and fieldName
  });

// Client tab balance audit
audit.getClientTabBreakdown = adminProcedure
  .input(z.object({
    clientId: z.number(),
    dateFrom: z.date().optional(),
    dateTo: z.date().optional()
  }))
  .output(z.object({
    currentBalance: z.number(),
    transactions: z.array(z.object({
      id: z.number(),
      type: z.enum(['ORDER', 'PAYMENT', 'CREDIT', 'REFUND', 'ADJUSTMENT']),
      description: z.string(),
      amount: z.number(),
      runningBalance: z.number(),
      date: z.date(),
      createdBy: z.string(),
      reference: z.string() // Order number, payment ID, etc.
    }))
  }))
  .query(async ({ input }) => {
    // 1. Get all orders for client
    // 2. Get all payments for client
    // 3. Get all credits/refunds
    // 4. Calculate running balance
    // 5. Return sorted by date
  });

// Inventory quantity audit
audit.getInventoryBreakdown = adminProcedure
  .input(z.object({
    batchId: z.number(),
    dateFrom: z.date().optional(),
    dateTo: z.date().optional()
  }))
  .output(z.object({
    currentQuantity: z.number(),
    reservedQuantity: z.number(),
    availableQuantity: z.number(),
    movements: z.array(z.object({
      id: z.number(),
      type: z.enum(['INTAKE', 'SALE', 'ADJUSTMENT', 'TRANSFER', 'RETURN', 'SHRINKAGE']),
      description: z.string(),
      quantity: z.number(), // Positive or negative
      runningTotal: z.number(),
      date: z.date(),
      createdBy: z.string(),
      reference: z.string()
    }))
  }))
  .query(async ({ input }) => {
    // Fetch all inventory movements for batch
  });

// Order total audit
audit.getOrderBreakdown = adminProcedure
  .input(z.object({ orderId: z.number() }))
  .output(z.object({
    orderTotal: z.number(),
    amountPaid: z.number(),
    balanceDue: z.number(),
    lineItems: z.array(z.object({
      productName: z.string(),
      quantity: z.number(),
      unitPrice: z.number(),
      lineTotal: z.number(),
      discounts: z.array(z.object({
        type: z.string(),
        amount: z.number()
      }))
    })),
    payments: z.array(z.object({
      id: z.number(),
      type: z.string(),
      amount: z.number(),
      date: z.date(),
      createdBy: z.string()
    })),
    discounts: z.array(z.object({
      type: z.string(),
      description: z.string(),
      amount: z.number()
    }))
  }))
  .query(async ({ input }) => {
    // Fetch order with all components
  });
```

### 4.3 Integration Points

| System | Integration Type | Description |
|--------|-----------------|-------------|
| All Modules | Read | Fetch source data for calculations |
| Users | Read | Get user names for attribution |
| Export | Write | Generate CSV/PDF exports |

### 4.4 Performance Considerations

```typescript
// Caching strategy for frequently accessed audits
const auditCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 60000; // 1 minute

// Pagination for large audit trails
audit.getClientTabBreakdown = adminProcedure
  .input(z.object({
    clientId: z.number(),
    page: z.number().default(1),
    pageSize: z.number().default(50),
    // ...
  }))
  // ...

// Index recommendations
// - orders: INDEX (client_id, created_at)
// - payments: INDEX (client_id, created_at)
// - inventory_movements: INDEX (batch_id, created_at)
```

## 5. UI/UX Specification

### 5.1 User Flow

```
[View Calculated Field (e.g., Tab Balance)]
    → [Click "ℹ️" Audit Icon]
    → [Audit Modal Opens]
    → [View Calculation Breakdown]
    → [Optionally Filter by Date]
    → [Optionally Export Data]
    → [Close Modal]
```

### 5.2 Wireframe: Audit Icon Placement

```
┌─────────────────────────────────────────────────────────────┐
│  Client: Acme Corp                                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Tab Balance: $50,000.00 [ℹ️]    Credit Limit: $75,000 [ℹ️] │
│                                                             │
│  Recent Orders:                                             │
│  ...                                                        │
└─────────────────────────────────────────────────────────────┘

[ℹ️] = Clickable audit icon (subtle, non-intrusive)
```

### 5.3 Wireframe: Audit Modal

```
┌─────────────────────────────────────────────────────────────┐
│  📊 Tab Balance Breakdown: Acme Corp                   [X]  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Current Balance: $50,000.00                                │
│  Formula: Orders - Payments + Credits - Refunds             │
│                                                             │
│  Date Range: [All Time ▼]  [Export CSV] [Export PDF]        │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Date       │ Type    │ Reference  │ Amount  │ Balance│   │
│  ├────────────┼─────────┼────────────┼─────────┼────────┤   │
│  │ 2024-12-30 │ ORDER   │ ORD-1234   │ +$5,000 │ $50,000│   │
│  │ 2024-12-28 │ PAYMENT │ PAY-5678   │ -$10,000│ $45,000│   │
│  │ 2024-12-25 │ ORDER   │ ORD-1233   │ +$15,000│ $55,000│   │
│  │ 2024-12-20 │ CREDIT  │ CRD-001    │ -$2,000 │ $40,000│   │
│  │ 2024-12-15 │ ORDER   │ ORD-1232   │ +$12,000│ $42,000│   │
│  │ ...        │         │            │         │        │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Showing 1-50 of 127 transactions    [< Prev] [Next >]     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 5.4 Wireframe: Inventory Audit Modal

```
┌─────────────────────────────────────────────────────────────┐
│  📦 Inventory Breakdown: Blue Dream (Batch #BD-2024-001) [X]│
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  On Hand: 45 units | Reserved: 12 units | Available: 33    │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Date       │ Type      │ Reference │ Qty   │ Total  │   │
│  ├────────────┼───────────┼───────────┼───────┼────────┤   │
│  │ 2024-12-30 │ SALE      │ ORD-1234  │ -5    │ 45     │   │
│  │ 2024-12-28 │ ADJUSTMENT│ ADJ-001   │ -2    │ 50     │   │
│  │ 2024-12-25 │ SALE      │ ORD-1233  │ -10   │ 52     │   │
│  │ 2024-12-20 │ TRANSFER  │ TRF-005   │ +12   │ 62     │   │
│  │ 2024-12-15 │ INTAKE    │ INT-100   │ +50   │ 50     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 5.5 Design Requirements

- **Icon:** Small "ℹ️" or "📊" icon, subtle but discoverable
- **Placement:** Immediately after the calculated value
- **Modal:** 600-800px wide, scrollable content
- **Table:** Sortable columns, alternating row colors
- **Links:** Reference column links to source record
- **Export:** Buttons in header, not buried in menu

### 5.6 Acceptance Criteria (UI)

- [ ] Audit icon visible next to all calculated fields
- [ ] Icon does not disrupt layout or readability
- [ ] Modal opens within 500ms
- [ ] Data loads within 2 seconds for typical queries
- [ ] Pagination works for large datasets
- [ ] Date filter updates results without full reload
- [ ] Export generates file within 5 seconds
- [ ] Clicking reference opens source record in new tab

## 6. Edge Cases & Error Handling

| Scenario | Expected Behavior |
|----------|-------------------|
| No transactions for entity | Show "No transactions found" message |
| Very large audit trail (10K+ records) | Paginate, show loading indicator |
| Source record deleted | Show "[Deleted]" with original data if available |
| User lacks permission to view source | Show transaction but hide "View" link |
| Calculation mismatch detected | Show warning: "Calculated value differs from stored value" |
| Network error loading audit | Show retry button, preserve any loaded data |

## 7. Testing Requirements

### 7.1 Unit Tests

- [ ] Tab balance calculation matches sum of components
- [ ] Inventory quantity matches sum of movements
- [ ] Running balance calculated correctly
- [ ] Date filtering works correctly
- [ ] Pagination returns correct records

### 7.2 Integration Tests

- [ ] Audit data matches actual database state
- [ ] All transaction types included in audit
- [ ] User attribution correct for all records
- [ ] Export generates valid CSV/PDF

### 7.3 E2E Tests

- [ ] Click audit icon → modal opens with correct data
- [ ] Filter by date → results update
- [ ] Export CSV → file downloads with correct data
- [ ] Click reference → navigates to source record

## 8. Migration & Rollout

### 8.1 Data Migration

```sql
-- Ensure all existing records have created_by and created_at
-- This may require backfilling with default values

UPDATE orders SET created_by = 1 WHERE created_by IS NULL; -- System user
UPDATE payments SET created_by = 1 WHERE created_by IS NULL;
UPDATE inventory_movements SET created_by = 1 WHERE created_by IS NULL;
-- etc.
```

### 8.2 Feature Flag

`FEATURE_AUDIT_TRAIL` - Enable globally once tested.

### 8.3 Rollback Plan

1. Disable feature flag
2. Audit icons hidden
3. No data changes required
4. Re-enable when issues resolved

## 9. Success Metrics

| Metric | Target | Measurement Method |
|--------|--------|-------------------|
| Audit usage | Track adoption | Count audit modal opens |
| Support tickets re: "wrong numbers" | 50% reduction | Ticket categorization |
| Time to resolve discrepancies | 75% reduction | Support ticket resolution time |
| User trust (qualitative) | Improved | User feedback |

## 10. Open Questions

- [x] Should audit be available to all users or restricted? **Follow existing permissions**
- [x] How long to retain audit data? **Indefinitely**
- [ ] Should we show a visual graph of balance over time? **Nice to have, defer**
- [ ] Should audit changes be logged (audit of audit)? **Defer to future enhancement**

---

**Approval:**
- [ ] Product Owner
- [ ] Tech Lead
- [ ] QA Lead
