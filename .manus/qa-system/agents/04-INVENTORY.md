# AGENT INVENTORY — Stock, FIFO Costing, Lot Tracking & Traceability

## AGENT IDENTITY
```
Agent Name: INVENTORY
Risk Level: 🔴 RED MODE
Primary Role: qa.inventory@terp.test
Backup Role: qa.superadmin@terp.test
Estimated Time: 40 minutes
Run Order: Phase 3 (after Phase 2)
Matrix Rows: ~50 flows
```

## YOUR MISSION

Test inventory accuracy, FIFO cost flow, lot traceability, and stock level calculations. Every unit must be trackable. Every cost must flow correctly.

**Remember: You are browser automation only. Claude API makes all pass/fail decisions and performs all calculations.**

---

## CLAUDE API SYSTEM PROMPT FOR THIS AGENT

```
You are the QA analyst for TERP inventory management. Manus is executing browser automation and reporting observed values. Your job:

1. VERIFY STOCK CALCULATIONS: Available = OnHand - Allocated - Reserved
2. VALIDATE FIFO COSTING: Oldest lots consumed first, COGS calculated correctly
3. CHECK LOT TRACEABILITY: Every unit traceable to source
4. TEST BATCH LIFECYCLE: Status transitions and side effects

CALCULATION FORMULAS TO VERIFY:

Stock Levels:
  OnHand = Σ(receipts) - Σ(shipments) ± Σ(adjustments)
  Allocated = Σ(confirmed orders not yet shipped)
  Reserved = Σ(quotes with soft hold)
  Available = OnHand - Allocated - Reserved
  
  INVARIANT: Available >= 0 always
  INVARIANT: Allocated + Reserved <= OnHand

FIFO Cost Flow:
  When selling quantity Q:
  1. Sort lots by receivedAt ASC (oldest first)
  2. Consume from oldest lot until depleted or Q satisfied
  3. COGS = Σ(lot_quantity_used × lot_unit_cost)
  
  Example: Lot A (50 @ $10, Jan 1), Lot B (50 @ $12, Jan 15)
  Sell 60: COGS = (50 × $10) + (10 × $12) = $500 + $120 = $620

Movement Types:
  RECEIPT: +OnHand, +Available
  SALE: -OnHand (from allocated)
  ADJUSTMENT_UP: +OnHand, +Available
  ADJUSTMENT_DOWN: -OnHand, -Available
  TRANSFER: -Source, +Destination (net zero)

Repository: https://github.com/EvanTenenbaum/TERP
Focus files: server/services/inventory/*, server/routers/inventory/*
```

---

## TEST CATEGORIES

### CATEGORY 1: Batch Lifecycle

```
TEST INV-BATCH-001: Create new batch (receiving)

ACTION:
1. Login as qa.inventory@terp.test
2. Navigate to /inventory/new (or Inventory > Receive)
3. Fill in:
   - Product: [Select any]
   - Quantity: 100
   - Unit Cost: $10.00
   - Supplier: [Select any]
   - Lot/Batch Number: qa-e2e-[DATE]-inv-001
4. Save

OBSERVE AND REPORT:
- Was batch created?
- Initial status (RECEIVED, AVAILABLE, etc.?)
- Quantities shown (received, current, available)
- Screenshot

SEND TO CLAUDE FOR ANALYSIS
```

```
TEST INV-BATCH-002: Batch status AVAILABLE

ACTION:
1. Find batch created above (or any AVAILABLE batch)
2. Note all status indicators

OBSERVE AND REPORT:
- Status displayed
- Is it showing in "Available" stock lists?
- Can it be selected for orders?

SEND TO CLAUDE FOR ANALYSIS
```

```
TEST INV-BATCH-003: Batch with QC workflow (if applicable)

ACTION:
1. Check if QC workflow exists
2. If yes: Create batch → QC Pending → QC Pass → Available
3. Observe each transition

OBSERVE AND REPORT:
- Does QC workflow exist?
- Status at each stage
- Is batch NOT available until QC passed?

SEND TO CLAUDE FOR ANALYSIS
```

```
TEST INV-BATCH-004: Expired batch handling

ACTION:
1. Find or create a batch with expiration date = yesterday
2. Check if it's marked expired
3. Try to select it for an order

OBSERVE AND REPORT:
- Is batch marked as EXPIRED?
- Can it be selected for sale?
- Any warning if selected?

SEND TO CLAUDE FOR ANALYSIS
Expected: Expired batches should NOT be orderable
```

### CATEGORY 2: Stock Level Calculations

```
TEST INV-STOCK-001: OnHand equals received minus sold

ACTION:
1. Find a batch with known history
2. Sum all receipts
3. Sum all sales/shipments
4. Sum all adjustments
5. Compare to displayed OnHand

OBSERVE AND REPORT:
- Received quantity: ____
- Shipped quantity: ____
- Adjustments: ____
- Calculated OnHand: ____
- Displayed OnHand: ____

SEND TO CLAUDE FOR CALCULATION VERIFICATION
```

```
TEST INV-STOCK-002: Available = OnHand - Allocated - Reserved

ACTION:
1. Find a batch with:
   - OnHand: 100
   - Some allocated to orders
   - Some reserved for quotes
2. Note all quantities

OBSERVE AND REPORT:
- OnHand: ____
- Allocated: ____
- Reserved: ____
- Displayed Available: ____
- Calculated Available (OnHand - Allocated - Reserved): ____

SEND TO CLAUDE FOR CALCULATION VERIFICATION
```

```
TEST INV-STOCK-003: Order confirmation increases Allocated

ACTION:
1. Note batch Available quantity
2. Create order for 20 units from this batch
3. Confirm the order
4. Check batch quantities again

OBSERVE AND REPORT:
- Before: Available=____, Allocated=____
- After confirm: Available=____, Allocated=____
- Did Allocated increase by 20?
- Did Available decrease by 20?
- Did OnHand stay the same?

SEND TO CLAUDE FOR VERIFICATION
Expected: Allocated +20, Available -20, OnHand unchanged
```

```
TEST INV-STOCK-004: Shipment reduces OnHand and Allocated

ACTION:
1. Find a confirmed order with allocated inventory
2. Note batch quantities
3. Ship the order
4. Check batch quantities again

OBSERVE AND REPORT:
- Before ship: OnHand=____, Allocated=____
- After ship: OnHand=____, Allocated=____
- Did OnHand decrease?
- Did Allocated decrease?

SEND TO CLAUDE FOR VERIFICATION
Expected: Both OnHand and Allocated reduced by shipped quantity
```

```
TEST INV-STOCK-005: Order cancellation releases allocation

ACTION:
1. Find a confirmed (allocated) order
2. Note batch quantities
3. Cancel the order
4. Check batch quantities

OBSERVE AND REPORT:
- Before cancel: Available=____, Allocated=____
- After cancel: Available=____, Allocated=____
- Was allocation released?

SEND TO CLAUDE FOR VERIFICATION
Expected: Allocated decreased, Available increased by same amount
```

### CATEGORY 3: FIFO Costing [CRITICAL]

```
TEST INV-FIFO-001: Single lot consumption

ACTION:
1. Ensure one batch exists: Lot A, 50 units @ $10.00, received Jan 1
2. Create and ship order for 30 units
3. Check COGS on the order/invoice

OBSERVE AND REPORT:
- Lot used: ____
- Quantity from lot: ____
- Unit cost: ____
- COGS displayed: ____

SEND TO CLAUDE FOR VERIFICATION
Expected: COGS = 30 × $10 = $300
```

```
TEST INV-FIFO-002: Multi-lot FIFO consumption

ACTION:
1. Create two batches for same product:
   - Lot A: 50 units @ $10.00, received Jan 1
   - Lot B: 50 units @ $12.00, received Jan 15
2. Create and ship order for 60 units
3. Check lot allocation and COGS

OBSERVE AND REPORT:
- Which lots were selected?
- Quantity from Lot A: ____
- Quantity from Lot B: ____
- Was Lot A (older) consumed first?
- COGS displayed: ____

SEND TO CLAUDE FOR VERIFICATION
Expected: 50 from Lot A + 10 from Lot B
COGS = (50 × $10) + (10 × $12) = $500 + $120 = $620
```

```
TEST INV-FIFO-003: Complete lot depletion

ACTION:
1. Create batch: Lot A, 50 units @ $10.00
2. Create and ship order for exactly 50 units
3. Check lot status and remaining quantity

OBSERVE AND REPORT:
- Lot A remaining quantity: ____
- Lot A status (DEPLETED, etc.): ____
- Is lot removed from available selection?

SEND TO CLAUDE FOR ANALYSIS
Expected: Remaining = 0, possibly DEPLETED status
```

```
TEST INV-FIFO-004: Insufficient inventory blocks sale

ACTION:
1. Check available quantity for a product (e.g., 100 units)
2. Try to create order for more than available (e.g., 150 units)
3. Try to confirm the order

OBSERVE AND REPORT:
- Was order creation allowed?
- Was confirmation blocked?
- What error message?
- Screenshot

SEND TO CLAUDE FOR ANALYSIS
Expected: Should be blocked with clear error showing available quantity
```

```
TEST INV-FIFO-005: FIFO with three lots

ACTION:
1. Create three batches:
   - Lot A: 30 units @ $10, received Jan 1
   - Lot B: 30 units @ $12, received Jan 15
   - Lot C: 30 units @ $15, received Jan 30
2. Ship order for 75 units
3. Check allocation

OBSERVE AND REPORT:
- From Lot A: ____ units
- From Lot B: ____ units
- From Lot C: ____ units
- COGS: ____

SEND TO CLAUDE FOR VERIFICATION
Expected: 30 from A + 30 from B + 15 from C
COGS = (30×$10) + (30×$12) + (15×$15) = $300 + $360 + $225 = $885
```

```
TEST INV-FIFO-006: Manual lot selection override

ACTION:
1. If manual lot selection is available:
2. Create order
3. Instead of FIFO, manually select a newer lot
4. Observe if override is allowed and recorded

OBSERVE AND REPORT:
- Is manual lot selection available?
- Can you override FIFO?
- Is override logged/audited?

SEND TO CLAUDE FOR ANALYSIS
Note: P0-002 indicates flexible lot selection is needed
```

### CATEGORY 4: Inventory Adjustments

```
TEST INV-ADJ-001: Positive adjustment

ACTION:
1. Find a batch with OnHand = 50
2. Perform adjustment: +20 units
3. Enter reason: "Found extra units during count"
4. Save

OBSERVE AND REPORT:
- Previous OnHand: ____
- New OnHand: ____
- Was reason required?
- Is movement recorded in history?

SEND TO CLAUDE FOR VERIFICATION
Expected: OnHand = 70
```

```
TEST INV-ADJ-002: Negative adjustment

ACTION:
1. Find a batch with OnHand = 50, Available = 50
2. Perform adjustment: -10 units
3. Enter reason: "Damaged goods"
4. Save

OBSERVE AND REPORT:
- Previous OnHand: ____, Available: ____
- New OnHand: ____, Available: ____
- Movement recorded?

SEND TO CLAUDE FOR VERIFICATION
Expected: OnHand = 40, Available = 40
```

```
TEST INV-ADJ-003: Adjustment cannot exceed available

ACTION:
1. Find batch with OnHand = 50, Allocated = 30, Available = 20
2. Try to adjust down by 30 units

OBSERVE AND REPORT:
- Is this allowed?
- What error?
- If allowed, what is new Available? (should not be negative)

SEND TO CLAUDE FOR ANALYSIS
Expected: Should be blocked or warned (would make Available negative)
```

```
TEST INV-ADJ-004: Adjustment requires reason

ACTION:
1. Try to make adjustment without entering reason
2. Observe

OBSERVE AND REPORT:
- Is reason field required?
- Can you save without it?

SEND TO CLAUDE FOR ANALYSIS
Expected: Reason should be required for audit trail
```

```
TEST INV-ADJ-005: Adjustment creates movement record

ACTION:
1. Make an adjustment
2. Navigate to batch movement history
3. Find the adjustment entry

OBSERVE AND REPORT:
- Is adjustment in history?
- Does it show: type, quantity, reason, who, when?
- Screenshot of movement history

SEND TO CLAUDE FOR ANALYSIS
```

### CATEGORY 5: Inventory Transfers

```
TEST INV-TRANS-001: Transfer between locations

ACTION:
1. If multi-location supported:
2. Find batch at Location A with 50 units
3. Transfer 20 units to Location B
4. Check quantities at both locations

OBSERVE AND REPORT:
- Location A before: ____, after: ____
- Location B before: ____, after: ____
- Net change = 0?

SEND TO CLAUDE FOR VERIFICATION
Expected: A reduced by 20, B increased by 20, total unchanged
```

```
TEST INV-TRANS-002: Cannot transfer to same location

ACTION:
1. Try to transfer from Location A to Location A
2. Observe

OBSERVE AND REPORT:
- Is this blocked?
- What error?

SEND TO CLAUDE FOR ANALYSIS
Expected: Should be blocked (no-op)
```

### CATEGORY 6: Movement Audit Trail

```
TEST INV-AUDIT-001: All movements have actor

ACTION:
1. View movement history for any batch
2. Check each entry for "who performed action"

OBSERVE AND REPORT:
- Do all movements show the user who performed them?
- Is it the actual logged-in user, not spoofed?

SEND TO CLAUDE FOR ANALYSIS
```

```
TEST INV-AUDIT-002: Movements are immutable

ACTION:
1. Find a historical movement
2. Try to edit or delete it

OBSERVE AND REPORT:
- Can movements be edited?
- Can movements be deleted?
- Is there any way to modify history?

SEND TO CLAUDE FOR ANALYSIS
Expected: Movements should be immutable
```

```
TEST INV-AUDIT-003: Movement captures cost at time

ACTION:
1. Create batch at $10/unit
2. Make a sale
3. Check movement record for cost captured

OBSERVE AND REPORT:
- Does movement record show unit cost?
- Is it the cost at time of movement?

SEND TO CLAUDE FOR ANALYSIS
```

### CATEGORY 7: Cannabis Compliance (COA)

```
TEST INV-COA-001: Attach COA to batch

ACTION:
1. Find or create a batch
2. Upload a COA document (PDF)
3. Save

OBSERVE AND REPORT:
- Was upload successful?
- Is COA visible on batch detail?
- Can you download/view the COA?

SEND TO CLAUDE FOR ANALYSIS
```

```
TEST INV-COA-002: COA required for shipment (if configured)

ACTION:
1. Find batch without COA
2. Try to ship an order using this batch

OBSERVE AND REPORT:
- Is shipment blocked?
- What error message?
- Or is it allowed?

SEND TO CLAUDE FOR ANALYSIS
Note: May depend on configuration
```

### CATEGORY 8: Edge Cases

```
TEST INV-EDGE-001: Batch with 0.001 units (decimal)

ACTION:
1. Create batch with quantity 0.5 units
2. Observe

OBSERVE AND REPORT:
- Accepted?
- Displays correctly?

SEND TO CLAUDE FOR ANALYSIS
Note: REL-002 indicates DECIMAL migration needed
```

```
TEST INV-EDGE-002: Concurrent allocation race

ACTION:
1. Find batch with Available = 50
2. Open two browser windows
3. In both, create orders for 50 units
4. Confirm both simultaneously

OBSERVE AND REPORT:
- Did both orders get confirmed?
- What is batch allocation now?
- If both succeeded, is Allocated > OnHand? (BUG)

SEND TO CLAUDE FOR ANALYSIS
Expected: Only one should succeed, other should error
```

```
TEST INV-EDGE-003: Very large batch

ACTION:
1. Create batch with 9,999,999 units
2. Observe

OBSERVE AND REPORT:
- Accepted?
- Displays correctly?
- Performance OK?

SEND TO CLAUDE FOR ANALYSIS
```

---

## KNOWN ISSUES TO SKIP

| ID | Description |
|----|-------------|
| P0-002 | Flexible lot selection needed (not strict FIFO) |
| REL-002 | Quantities need DECIMAL migration |

---

## FINAL REPORT FORMAT

```markdown
## AGENT INVENTORY — Final Report

### Summary
- Total Tests: [N]
- PASS: [N]
- FAIL: [N]
- BLOCKED: [N]

### Stock Calculations
| Test | Formula | Calculated | Displayed | Status |
|------|---------|------------|-----------|--------|
| STOCK-002 | OnHand - Allocated - Reserved | 30 | 30 | PASS |

### FIFO Verification
| Test | Lots | Sale Qty | Expected COGS | Actual COGS | Status |
|------|------|----------|---------------|-------------|--------|
| FIFO-002 | A@$10, B@$12 | 60 | $620 | $620 | PASS |

### Batch Lifecycle
| Status Transition | Works |
|-------------------|-------|
| Create → AVAILABLE | ✅ |
| AVAILABLE → ALLOCATED | ✅ |
| ALLOCATED → SHIPPED | ✅ |
| Expiration handling | ✅ |

### Movement Audit
| Check | Verified |
|-------|----------|
| Actor captured | ✅ |
| Timestamp accurate | ✅ |
| Cost captured | ✅ |
| Immutable | ✅ |

### Findings
| ID | Test | Severity | Description |
|----|------|----------|-------------|

AWAITING CLAUDE FINAL ANALYSIS
```
