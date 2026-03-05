# Specification: FEATURE-010 - Accounting-Calendar Integration (Cash Flow Forecasting)

**Status:** Approved  
**Priority:** HIGH  
**Estimate:** 120-180h (4-6 weeks)  
**Module:** Accounting/Finance  
**Dependencies:** WS-001 (Receive Payment), WS-002 (Pay Supplier)
**Spec Author:** Manus AI  
**Spec Date:** 2025-12-30

---

## 1. Problem Statement

The business needs to forecast cash flow based on:

- Expected customer payments (receivables)
- Scheduled supplier payments (payables)
- Recurring expenses
- Seasonal patterns

Currently, this is done manually in spreadsheets. An integrated cash flow forecasting tool would provide real-time visibility into future cash positions.

## 2. User Stories

1. **As a finance manager**, I want to see projected cash flow for the next 30/60/90 days, so that I can plan for shortfalls.

2. **As a manager**, I want to schedule expected payments and receipts, so that the forecast is accurate.

3. **As a manager**, I want to see variance between forecast and actual, so that I can improve predictions.

4. **As a finance manager**, I want to model "what-if" scenarios, so that I can plan for different outcomes.

## 3. Functional Requirements

| ID    | Requirement                             | Priority     |
| ----- | --------------------------------------- | ------------ |
| FR-01 | Cash flow calendar view                 | Must Have    |
| FR-02 | Auto-populate from receivables/payables | Must Have    |
| FR-03 | Manual entry for expected payments      | Must Have    |
| FR-04 | Running balance projection              | Must Have    |
| FR-05 | Recurring expense scheduling            | Should Have  |
| FR-06 | Forecast vs actual variance tracking    | Should Have  |
| FR-07 | What-if scenario modeling               | Should Have  |
| FR-08 | Cash flow alerts (low balance warning)  | Should Have  |
| FR-09 | Export to spreadsheet                   | Nice to Have |
| FR-10 | Integration with external accounting    | Nice to Have |

## 4. Technical Specification

### 4.1 Data Model

```sql
-- Scheduled cash events
CREATE TABLE cash_events (
  id INT PRIMARY KEY AUTO_INCREMENT,
  event_type ENUM('RECEIVABLE', 'PAYABLE', 'EXPENSE', 'INCOME', 'TRANSFER') NOT NULL,

  -- Source reference
  customer_id INT REFERENCES customers(id),
  vendor_id INT REFERENCES suppliers(id),
  order_id INT REFERENCES orders(id),

  -- Event details
  description VARCHAR(255) NOT NULL,
  amount DECIMAL(12,2) NOT NULL, -- Positive for income, negative for expense
  expected_date DATE NOT NULL,
  actual_date DATE,
  actual_amount DECIMAL(12,2),

  -- Status
  status ENUM('SCHEDULED', 'COMPLETED', 'CANCELLED', 'OVERDUE') DEFAULT 'SCHEDULED',
  confidence ENUM('HIGH', 'MEDIUM', 'LOW') DEFAULT 'MEDIUM',

  -- Recurrence
  is_recurring BOOLEAN DEFAULT FALSE,
  recurrence_rule VARCHAR(100), -- RRULE format
  parent_event_id INT REFERENCES cash_events(id),

  -- Metadata
  notes TEXT,
  category VARCHAR(50),
  created_by INT REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_date (expected_date),
  INDEX idx_status (status),
  INDEX idx_type (event_type)
);

-- Cash flow snapshots (for variance tracking)
CREATE TABLE cash_flow_snapshots (
  id INT PRIMARY KEY AUTO_INCREMENT,
  snapshot_date DATE NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,

  -- Projected values at snapshot time
  projected_inflows DECIMAL(12,2),
  projected_outflows DECIMAL(12,2),
  projected_balance DECIMAL(12,2),

  -- Actual values (filled in later)
  actual_inflows DECIMAL(12,2),
  actual_outflows DECIMAL(12,2),
  actual_balance DECIMAL(12,2),

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_period (period_start, period_end)
);

-- Scenarios for what-if modeling
CREATE TABLE cash_flow_scenarios (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  is_baseline BOOLEAN DEFAULT FALSE,
  adjustments JSON, -- Array of adjustments to apply
  created_by INT REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 4.2 API Contracts

```typescript
// Get cash flow forecast
cashFlow.getForecast = adminProcedure
  .input(
    z.object({
      startDate: z.date(),
      endDate: z.date(),
      scenarioId: z.number().optional(),
      includeRecurring: z.boolean().default(true),
    })
  )
  .output(
    z.object({
      startingBalance: z.number(),
      dailyProjections: z.array(
        z.object({
          date: z.date(),
          inflows: z.number(),
          outflows: z.number(),
          netChange: z.number(),
          runningBalance: z.number(),
          events: z.array(
            z.object({
              id: z.number(),
              type: z.string(),
              description: z.string(),
              amount: z.number(),
              confidence: z.string(),
              source: z.string().nullable(),
            })
          ),
        })
      ),
      summary: z.object({
        totalInflows: z.number(),
        totalOutflows: z.number(),
        netChange: z.number(),
        endingBalance: z.number(),
        lowestBalance: z.number(),
        lowestBalanceDate: z.date(),
      }),
    })
  )
  .query(async ({ input }) => {});

// Create/update cash event
cashFlow.createEvent = adminProcedure
  .input(
    z.object({
      eventType: z.enum([
        "RECEIVABLE",
        "PAYABLE",
        "EXPENSE",
        "INCOME",
        "TRANSFER",
      ]),
      description: z.string(),
      amount: z.number(),
      expectedDate: z.date(),
      customerId: z.number().optional(),
      vendorId: z.number().optional(),
      confidence: z.enum(["HIGH", "MEDIUM", "LOW"]).default("MEDIUM"),
      isRecurring: z.boolean().default(false),
      recurrenceRule: z.string().optional(),
      category: z.string().optional(),
      notes: z.string().optional(),
    })
  )
  .output(z.object({ eventId: z.number() }))
  .mutation(async ({ input, ctx }) => {});

// Mark event as completed
cashFlow.completeEvent = adminProcedure
  .input(
    z.object({
      eventId: z.number(),
      actualDate: z.date(),
      actualAmount: z.number(),
    })
  )
  .output(z.object({ success: z.boolean() }))
  .mutation(async ({ input }) => {});

// Auto-generate events from receivables/payables
cashFlow.syncFromAccounting = adminProcedure
  .output(
    z.object({
      eventsCreated: z.number(),
      eventsUpdated: z.number(),
    })
  )
  .mutation(async ({ ctx }) => {
    // 1. Get outstanding receivables
    // 2. Get outstanding payables
    // 3. Create/update cash events
  });

// Get variance report
cashFlow.getVarianceReport = adminProcedure
  .input(
    z.object({
      periodStart: z.date(),
      periodEnd: z.date(),
    })
  )
  .output(
    z.object({
      periods: z.array(
        z.object({
          periodStart: z.date(),
          periodEnd: z.date(),
          projectedInflows: z.number(),
          actualInflows: z.number(),
          inflowVariance: z.number(),
          projectedOutflows: z.number(),
          actualOutflows: z.number(),
          outflowVariance: z.number(),
        })
      ),
      overallAccuracy: z.number(), // Percentage
    })
  )
  .query(async ({ input }) => {});

// Create scenario
cashFlow.createScenario = adminProcedure
  .input(
    z.object({
      name: z.string(),
      description: z.string().optional(),
      adjustments: z.array(
        z.object({
          type: z.enum(["MULTIPLY", "ADD", "DELAY"]),
          target: z.enum(["INFLOWS", "OUTFLOWS", "ALL"]),
          value: z.number(),
          category: z.string().optional(),
        })
      ),
    })
  )
  .output(z.object({ scenarioId: z.number() }))
  .mutation(async ({ input, ctx }) => {});
```

### 4.3 Integration Points

| System             | Integration Type | Description                     |
| ------------------ | ---------------- | ------------------------------- |
| Orders/Receivables | Read             | Auto-populate expected payments |
| Supplier Payments  | Read             | Auto-populate expected payables |
| Journal Entries    | Read/Write       | Record actual transactions      |
| Alerts             | Write            | Low balance warnings            |

## 5. UI/UX Specification

### 5.1 Wireframe: Cash Flow Calendar

```
┌─────────────────────────────────────────────────────────────┐
│  💰 Cash Flow Forecast                        [+ Add Event] │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  View: [Calendar ▼] Period: [Next 30 Days ▼] [Sync Now 🔄] │
│                                                             │
│  Starting Balance: $125,000                                 │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Jan 2025                                            │   │
│  │ ─────────────────────────────────────────           │   │
│  │ Mon 6  │ Tue 7  │ Wed 8  │ Thu 9  │ Fri 10 │       │   │
│  │        │        │        │        │        │       │   │
│  │ +$5K   │        │ -$2K   │ +$15K  │ -$8K   │       │   │
│  │ Acme   │        │ Rent   │ Beta   │ Farm A │       │   │
│  │        │        │        │        │        │       │   │
│  │ Bal:   │ Bal:   │ Bal:   │ Bal:   │ Bal:   │       │   │
│  │ $130K  │ $130K  │ $128K  │ $143K  │ $135K  │       │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ⚠️ Warning: Balance drops below $50K on Jan 25            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 5.2 Wireframe: Cash Flow Chart

```
┌─────────────────────────────────────────────────────────────┐
│  📊 Cash Flow Projection                                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  $200K ┤                                                    │
│        │      ╱╲                                            │
│  $150K ┤     ╱  ╲    ╱╲                                     │
│        │    ╱    ╲  ╱  ╲                                    │
│  $100K ┤───╱──────╲╱────╲───────────────────────            │
│        │                  ╲                                 │
│   $50K ┤───────────────────╲────────────────────            │
│        │                    ╲_____                          │
│    $0K ┼────────────────────────────────────────            │
│        Jan 1    Jan 15    Jan 31    Feb 15                  │
│                                                             │
│  ── Projected   ─ ─ Minimum Threshold ($50K)               │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 5.3 Wireframe: Event Entry

```
┌─────────────────────────────────────────────────────────────┐
│  💰 Add Cash Event                                     [X]  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Type: ○ Income  ● Expense  ○ Receivable  ○ Payable        │
│                                                             │
│  Description: [Monthly Rent Payment__________]              │
│  Amount: [$2,500.00_____]                                  │
│  Expected Date: [Jan 8, 2025  📅]                          │
│  Category: [Operating Expenses ▼]                          │
│  Confidence: [High ▼]                                      │
│                                                             │
│  ☑ Recurring                                               │
│  Frequency: [Monthly ▼] on day [8]                         │
│  End: ○ Never  ● After [12] occurrences  ○ On date         │
│                                                             │
│  Notes: [_________________________________]                 │
│                                                             │
│  [Cancel]                                    [Save Event]   │
└─────────────────────────────────────────────────────────────┘
```

### 5.4 Acceptance Criteria

- [ ] Calendar view shows daily cash events
- [ ] Running balance calculated correctly
- [ ] Events auto-populated from receivables/payables
- [ ] Manual events can be created
- [ ] Recurring events generate future occurrences
- [ ] Low balance alerts triggered
- [ ] Variance tracking works

## 6. Edge Cases & Error Handling

| Scenario                   | Expected Behavior                |
| -------------------------- | -------------------------------- |
| No starting balance set    | Prompt user to set               |
| Negative balance projected | Warning, not error               |
| Receivable paid early      | Update event, recalculate        |
| Recurring event deleted    | Option to delete all or just one |

## 7. Testing Requirements

### 7.1 Unit Tests

- [ ] Balance calculations
- [ ] Recurring event generation
- [ ] Variance calculations
- [ ] Scenario adjustments

### 7.2 Integration Tests

- [ ] Sync from receivables/payables
- [ ] Event completion updates
- [ ] Alert triggering

### 7.3 E2E Tests

- [ ] Full forecast flow
- [ ] What-if scenario comparison
- [ ] Variance report accuracy

## 8. Success Metrics

| Metric                    | Target      | Measurement Method |
| ------------------------- | ----------- | ------------------ |
| Forecast accuracy         | 85%+        | Variance report    |
| Cash shortfall prevention | 100%        | No surprises       |
| Time saved vs spreadsheet | 5+ hrs/week | User feedback      |

---

**Approval:**

- [ ] Product Owner
- [ ] Tech Lead
- [ ] QA Lead
