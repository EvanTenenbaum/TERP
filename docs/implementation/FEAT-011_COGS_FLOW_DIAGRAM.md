# COGS Flow Diagram - TERP System

## High-Level COGS Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         COGS CALCULATION FLOW                           │
└─────────────────────────────────────────────────────────────────────────┘

┌──────────────┐
│  BATCH DATA  │
│              │
│ cogsMode:    │
│ • FIXED      │──┐
│ • RANGE      │  │
│              │  │
│ unitCogs     │  │
│ unitCogsMin  │  │
│ unitCogsMax  │  │
└──────────────┘  │
                  │
                  ├───────────────────────────────────────────┐
                  │                                           │
                  ▼                                           ▼
         ┌────────────────┐                          ┌───────────────┐
         │ BASE COGS CALC │                          │ CLIENT CONFIG │
         │                │                          │               │
         │ FIXED:         │                          │ Adjustment:   │
         │  = unitCogs    │                          │ • NONE        │
         │                │                          │ • PERCENTAGE  │
         │ RANGE:         │                          │ • FIXED_AMT   │
         │  = (min+max)/2 │                          │               │
         └────────────────┘                          └───────────────┘
                  │                                           │
                  │                                           │
                  └───────────────┬───────────────────────────┘
                                  │
                                  ▼
                         ┌────────────────────┐
                         │ APPLY CLIENT ADJ   │
                         │                    │
                         │ If PERCENTAGE:     │
                         │  cogs × (1 - pct)  │
                         │                    │
                         │ If FIXED_AMOUNT:   │
                         │  cogs - amount     │
                         └────────────────────┘
                                  │
                                  ▼
                         ┌────────────────────┐
                         │ MANUAL OVERRIDE?   │
                         │                    │
                         │ If yes:            │
                         │  Use override COGS │
                         │  Mark as MANUAL    │
                         └────────────────────┘
                                  │
                                  ▼
                         ┌────────────────────┐
                         │  FINAL UNIT COGS   │
                         │                    │
                         │  Calculate:        │
                         │  • unitMargin      │
                         │  • marginPercent   │
                         │  • lineCogs        │
                         │  • lineMargin      │
                         └────────────────────┘
                                  │
                                  ▼
                         ┌────────────────────┐
                         │ ORDER LEVEL TOTALS │
                         │                    │
                         │ totalCogs = Σ      │
                         │ totalMargin = Σ    │
                         │ avgMarginPercent   │
                         └────────────────────┘
                                  │
                                  ▼
                         ┌────────────────────┐
                         │  STORE IN DATABASE │
                         │                    │
                         │ orders.totalCogs   │
                         │ orders.totalMargin │
                         │ orders.items (JSON)│
                         └────────────────────┘
```

---

## Order Lifecycle & COGS

```
ORDER CREATION                DRAFT FINALIZATION            FULFILLMENT
     │                              │                          │
     ▼                              ▼                          ▼
┌─────────┐                  ┌─────────┐                ┌─────────┐
│ DRAFT   │                  │FINALIZED│                │ SHIPPED │
│         │                  │         │                │         │
│ COGS:   │                  │ COGS:   │                │ COGS:   │
│ ✓ Calc  │──────────────▶  │ ✓ Lock  │───────────▶   │ ✓ Post  │
│ ✓ Store │   Confirm        │ ✓ Audit │   Ship         │   to GL │
│ □ Lock  │                  │ ✓ Lock  │                │         │
└─────────┘                  └─────────┘                └─────────┘
     │                              │                          │
     │                              │                          │
     └──────────────────────────────┴──────────────────────────┘
                                    │
                                    ▼
                         ┌─────────────────────┐
                         │  ACCOUNTING ENTRIES │
                         │                     │
                         │  Dr: COGS (Expense) │
                         │  Cr: Inventory      │
                         │                     │
                         │  Amount: totalCogs  │
                         └─────────────────────┘
```

---

## COGS Display Flow

```
┌────────────────────────────────────────────────────────────────┐
│                         USER INTERFACE                          │
└────────────────────────────────────────────────────────────────┘

ORDER CREATION SCREEN
┌─────────────────────────────────────────────────────────────┐
│                         ORDER PREVIEW                        │
│                                                              │
│  Line Items:                                                 │
│  ┌────────────────────────────────────────────────────┐    │
│  │ Batch ABC-123              Qty: 100                │    │
│  │ Unit Price: $50.00         Unit COGS: $30.00       │    │
│  │ Line Total: $5,000.00      Line Margin: $2,000.00  │    │
│  │                            Margin: 40.0%  🟢       │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │                    ORDER TOTALS                     │    │
│  ├─────────────────────────────────────────────────────┤   │
│  │ Subtotal                            $5,000.00       │    │
│  │ Total COGS              📦          $3,000.00       │    │
│  │ Total Margin            📈          $2,000.00       │    │
│  │                                     40.0%  🟢       │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  [Click to expand COGS breakdown] ▼                         │
│  ┌────────────────────────────────────────────────────┐    │
│  │ COGS Details:                                       │    │
│  │ • Base COGS (FIXED):        $30.00                 │    │
│  │ • Client Adjustment (10%):  -$3.00                 │    │
│  │ • Final Unit COGS:          $27.00                 │    │
│  │ • Source: CLIENT_ADJUSTMENT                         │    │
│  └────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘


DASHBOARD WIDGETS
┌─────────────────────────────────────────────────────────────┐
│                    SALES PERFORMANCE                         │
│                                                              │
│  Total Revenue:              $50,000.00                     │
│  Total COGS:                 $30,000.00                     │
│  Total Margin:               $20,000.00                     │
│  Avg Margin %:               40.0%  🟢                       │
│                                                              │
│  [View COGS Breakdown by Product] →                         │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                  PRODUCT PROFITABILITY                       │
│                                                              │
│  Product A:                                                  │
│    Revenue:    $10,000    COGS: $6,000    Margin: 40% 🟢   │
│                                                              │
│  Product B:                                                  │
│    Revenue:    $8,000     COGS: $5,600    Margin: 30% 🟡   │
│                                                              │
│  Product C:                                                  │
│    Revenue:    $5,000     COGS: $4,500    Margin: 10% 🟠   │
└─────────────────────────────────────────────────────────────┘
```

---

## COGS Management Flow

```
BATCH COGS UPDATE WORKFLOW
────────────────────────────

Step 1: Calculate Impact
┌─────────────────────────────────────────────────┐
│ Batch: ABC-123                                  │
│                                                 │
│ Current COGS:        $30.00                     │
│ New COGS:            $32.00                     │
│ Change:              +$2.00 (+6.7%)             │
│                                                 │
│ Impact Analysis:                                │
│ • Affected Orders:         5                    │
│ • Affected Quantity:       500 units            │
│ • Total Impact:            +$1,000.00           │
│                                                 │
│ Apply to:                                       │
│ ○ Past Sales Only                               │
│ ○ Future Sales Only                             │
│ ● Both                                          │
│                                                 │
│ Reason: [Supplier price increase               ]│
│                                                 │
│ [Cancel]              [Apply COGS Change]       │
└─────────────────────────────────────────────────┘

Step 2: Execute Update
┌─────────────────────────────────────────────────┐
│ ✓ Batch COGS updated: $30.00 → $32.00          │
│ ✓ 5 pending orders recalculated                 │
│ ✓ Margins updated automatically                 │
│ ✓ Audit log entry created                       │
│                                                 │
│ [View COGS History] →                           │
└─────────────────────────────────────────────────┘

Step 3: Audit Trail
┌─────────────────────────────────────────────────┐
│               COGS CHANGE HISTORY                │
│                                                 │
│ Date        Old      New      By        Reason  │
│ ──────────  ───────  ───────  ────────  ──────  │
│ 2026-01-14  $30.00   $32.00   User123   Price   │
│                                          increase│
│ 2025-12-10  $28.00   $30.00   User456   Landed  │
│                                          cost    │
│ 2025-11-05  $25.00   $28.00   User789   Freight │
│                                          added   │
└─────────────────────────────────────────────────┘
```

---

## Color Coding Legend

```
MARGIN % INDICATORS
───────────────────

🔴 < 0%      NEGATIVE (Loss - Red)
🟠 0-15%     LOW (Orange/Yellow)
🟡 15-30%    FAIR (Yellow/Light Green)
🟢 30-50%    GOOD (Green)
🟢 50%+      EXCELLENT (Dark Green)

Used in:
• Order line items
• Order totals
• Dashboard widgets
• Product profitability reports
```

---

## Integration Points

```
┌─────────────────────────────────────────────────────────────┐
│                    SYSTEM INTEGRATIONS                       │
└─────────────────────────────────────────────────────────────┘

COGS connects to:

1. GENERAL LEDGER (GL)
   ├─ COGS expense account (Dr)
   ├─ Inventory asset account (Cr)
   └─ Posted on order shipment

2. ACCOUNTS RECEIVABLE (AR)
   ├─ Invoice includes margin data
   ├─ Credit limit checks consider margin
   └─ Bad debt reserve calculated on margin

3. ACCOUNTS PAYABLE (AP)
   ├─ Vendor payables tracked by batch
   ├─ COGS includes vendor cost
   └─ Update payable on sale

4. INVENTORY MANAGEMENT
   ├─ Batch unit COGS
   ├─ Inventory valuation (Qty × COGS)
   └─ COGS modes (FIXED/RANGE)

5. SALES ANALYTICS
   ├─ Revenue vs COGS
   ├─ Margin analysis
   ├─ Product profitability
   └─ Dashboard metrics

6. CLIENT MANAGEMENT
   ├─ Client-specific COGS adjustments
   ├─ Margin policies by client
   └─ Profitability by customer
```

---

## Data Flow Architecture

```
┌────────────┐
│   CLIENT   │
│  REQUEST   │
└──────┬─────┘
       │
       │ Create Order
       ▼
┌────────────────┐
│ ordersRouter   │
│ .create()      │
└──────┬─────────┘
       │
       ▼
┌─────────────────────────────────────────┐
│ ordersDb.createOrder()                  │
│                                         │
│ 1. Lock batches (FOR UPDATE)            │
│ 2. Get batch COGS                        │
│ 3. Get client adjustments                │
│ 4. Calculate line item COGS              │
│ 5. Calculate order totals                │
│ 6. Store in database                     │
│ 7. Reduce inventory                      │
└─────────┬───────────────────────────────┘
          │
          ├──────────────┐
          │              │
          ▼              ▼
┌───────────────┐  ┌────────────────┐
│cogsCalculator │  │ cogsCalculation│
│.calculateCogs │  │.calculateSale  │
│               │  │     COGS       │
│ Returns:      │  │                │
│ • unitCogs    │  │ Returns:       │
│ • cogsSource  │  │ • totalCOGS    │
│ • margin      │  │ • lineItems[]  │
│ • marginPct   │  │                │
└───────────────┘  └────────────────┘
          │
          │
          ▼
┌─────────────────────────────────────────┐
│          DATABASE (orders table)         │
│                                         │
│ {                                       │
│   orderNumber: "O-123",                 │
│   items: [                               │
│     {                                    │
│       batchId: 1,                       │
│       quantity: 100,                    │
│       unitCogs: 30.00,                  │
│       lineCogs: 3000.00,                │
│       unitMargin: 20.00,                │
│       marginPercent: 40.0,              │
│       cogsSource: "FIXED"               │
│     }                                    │
│   ],                                     │
│   totalCogs: "3000.00",                 │
│   totalMargin: "2000.00",               │
│   avgMarginPercent: "40.00"             │
│ }                                        │
└─────────────────────────────────────────┘
```

---

## Key Takeaways

1. **COGS is calculated immediately** when order is created
2. **COGS is locked** when order is finalized (draft → confirmed)
3. **COGS is posted to GL** when order is shipped
4. **Multiple COGS sources** supported (FIXED, RANGE, adjustments, overrides)
5. **Full audit trail** for all COGS changes
6. **Real-time margin calculation** at line and order level
7. **Color-coded UI** for quick margin assessment
8. **Integrated with accounting** (GL, AR, AP)
9. **Dashboard analytics** for profitability analysis
10. **Production-ready** with robust validation and error handling
