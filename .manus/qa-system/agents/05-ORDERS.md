# AGENT ORDERS — Order Lifecycle, Quotes, Fulfillment & Returns

## AGENT IDENTITY
```
Agent Name: ORDERS
Risk Level: 🔴 RED MODE
Primary Role: qa.salesmanager@terp.test (create), qa.fulfillment@terp.test (ship)
Estimated Time: 40 minutes
Run Order: Phase 3 (after Phase 2)
Matrix Rows: ~55 flows
```

## YOUR MISSION

Test the complete order lifecycle from quote through delivery. Verify state machine transitions, credit limit enforcement, price locking, and fulfillment operations.

**Remember: You are browser automation only. Claude API makes all pass/fail decisions.**

---

## CLAUDE API SYSTEM PROMPT FOR THIS AGENT

```
You are the QA analyst for TERP order management. Manus is executing browser automation and reporting observations. Your job:

1. VALIDATE STATE MACHINE: All transitions follow the allowed paths
2. VERIFY SIDE EFFECTS: Each transition triggers correct inventory/AR changes
3. TEST CREDIT LIMITS: Enforcement at order confirmation
4. CHECK PRICE LOCKING: Quote prices survive catalog changes

STATE MACHINE:
  DRAFT → CONFIRMED → ALLOCATED → SHIPPED → DELIVERED → INVOICED
  
  Any state before SHIPPED can → CANCELLED
  
  Side effects:
  - CONFIRMED: Credit check passes, prices locked
  - ALLOCATED: Inventory lots assigned (batch.allocated increases)
  - SHIPPED: Inventory reduced (batch.onHand decreases)
  - CANCELLED: Releases any allocations
  
CREDIT CHECK:
  AvailableCredit = client.creditLimit - client.totalOwed
  If orderTotal > AvailableCredit → Block confirmation

PRICE LOCKING:
  When quote created → snapshot prices
  When quote converted → use snapshot, NOT current catalog

Repository: https://github.com/EvanTenenbaum/TERP
Focus files: server/services/orders/*, server/routers/orders/*
```

---

## TEST CATEGORIES

### CATEGORY 1: Order Creation

```
TEST ORD-CREATE-001: Create draft order

ACTION:
1. Login as qa.salesmanager@terp.test
2. Navigate to /orders/new
3. Select a client
4. Add line item: Product A, Qty 10, Price $100
5. Save as Draft

OBSERVE AND REPORT:
- Order created?
- Order number assigned?
- Status = DRAFT?
- Line total = $1000?
- Order total = $1000?
- Screenshot

SEND TO CLAUDE FOR ANALYSIS
```

```
TEST ORD-CREATE-002: Order calculation with discount

ACTION:
1. Create order
2. Add line: Qty 10 × $100
3. Apply 10% discount
4. Save

OBSERVE AND REPORT:
- Subtotal: ____
- Discount: ____
- Total: ____

SEND TO CLAUDE FOR VERIFICATION
Expected: Subtotal=$1000, Discount=$100, Total=$900
```

```
TEST ORD-CREATE-003: Order with multiple line items

ACTION:
1. Create order
2. Add lines:
   - Product A: Qty 5 × $100
   - Product B: Qty 3 × $50
3. Save

OBSERVE AND REPORT:
- Line totals
- Subtotal
- Total

SEND TO CLAUDE FOR VERIFICATION
Expected: $500 + $150 = $650
```

```
TEST ORD-CREATE-004: Order with tax

ACTION:
1. Create order
2. Add line: Qty 10 × $100
3. Apply tax: 8.25%
4. Save

OBSERVE AND REPORT:
- Subtotal
- Tax amount
- Total

SEND TO CLAUDE FOR VERIFICATION
Expected: $1000 + $82.50 = $1082.50
```

```
TEST ORD-CREATE-005: Order for non-existent client

ACTION:
1. Try to create order without selecting client
2. Try to save

OBSERVE AND REPORT:
- Is client required?
- What validation error?

SEND TO CLAUDE FOR ANALYSIS
Expected: Client should be required
```

```
TEST ORD-CREATE-006: Order with zero line items

ACTION:
1. Create order
2. Select client
3. Do NOT add any line items
4. Try to save

OBSERVE AND REPORT:
- Is this allowed?
- Can you confirm an empty order?

SEND TO CLAUDE FOR ANALYSIS
Expected: Should require at least one line item
```

### CATEGORY 2: Order State Machine

```
TEST ORD-STATE-001: DRAFT → CONFIRMED

ACTION:
1. Find or create DRAFT order
2. Click "Confirm" button
3. Observe status change

OBSERVE AND REPORT:
- Previous status: DRAFT
- Action available: Confirm button?
- New status after confirm: ____
- confirmedAt timestamp set?
- Any credit check message?

SEND TO CLAUDE FOR ANALYSIS
```

```
TEST ORD-STATE-002: CONFIRMED → ALLOCATED

ACTION:
1. Find CONFIRMED order
2. Click "Allocate" or observe auto-allocation
3. Check batch quantities

OBSERVE AND REPORT:
- New status: ____
- Are lots/batches assigned to line items?
- Did batch.allocated increase?
- allocatedAt timestamp set?

SEND TO CLAUDE FOR ANALYSIS
```

```
TEST ORD-STATE-003: ALLOCATED → SHIPPED

ACTION:
1. Login as qa.fulfillment@terp.test
2. Find ALLOCATED order
3. Click "Ship" 
4. Enter tracking number
5. Confirm shipment

OBSERVE AND REPORT:
- New status: ____
- Tracking number saved?
- Did batch.onHand decrease?
- Did batch.allocated decrease?
- shippedAt timestamp set?

SEND TO CLAUDE FOR ANALYSIS
```

```
TEST ORD-STATE-004: SHIPPED → DELIVERED

ACTION:
1. Find SHIPPED order
2. Mark as Delivered

OBSERVE AND REPORT:
- New status: DELIVERED?
- deliveredAt timestamp set?
- Is invoice automatically created? (depends on config)

SEND TO CLAUDE FOR ANALYSIS
```

```
TEST ORD-STATE-005: DRAFT → CANCELLED

ACTION:
1. Find DRAFT order
2. Cancel it
3. Provide cancellation reason

OBSERVE AND REPORT:
- Is cancellation allowed from DRAFT?
- Is reason required?
- New status: CANCELLED?
- Any side effects? (should be none)

SEND TO CLAUDE FOR ANALYSIS
Expected: Allowed, no side effects
```

```
TEST ORD-STATE-006: CONFIRMED → CANCELLED

ACTION:
1. Find CONFIRMED order (not yet allocated)
2. Cancel it

OBSERVE AND REPORT:
- Is cancellation allowed?
- New status?
- Any soft holds released?

SEND TO CLAUDE FOR ANALYSIS
Expected: Allowed
```

```
TEST ORD-STATE-007: ALLOCATED → CANCELLED

ACTION:
1. Find ALLOCATED order
2. Cancel it
3. Check batch quantities

OBSERVE AND REPORT:
- Is cancellation allowed?
- New status?
- Did batch.allocated decrease? (allocation released)
- Did batch.available increase?

SEND TO CLAUDE FOR ANALYSIS
Expected: Allowed, allocations released
```

```
TEST ORD-STATE-008: SHIPPED → CANCELLED (should be blocked)

ACTION:
1. Find SHIPPED order
2. Try to cancel

OBSERVE AND REPORT:
- Is cancel button visible?
- If clicked, what happens?
- Is it blocked?

SEND TO CLAUDE FOR ANALYSIS
Expected: Should be BLOCKED - cannot cancel shipped order
```

```
TEST ORD-STATE-009: DELIVERED → CANCELLED (should be blocked)

ACTION:
1. Find DELIVERED order
2. Try to cancel

OBSERVE AND REPORT:
- Is it blocked?

SEND TO CLAUDE FOR ANALYSIS
Expected: Should be BLOCKED
```

```
TEST ORD-STATE-010: CANCELLED → any (should be blocked)

ACTION:
1. Find CANCELLED order
2. Try to perform any action (confirm, ship, etc.)

OBSERVE AND REPORT:
- Are any actions available?
- Is CANCELLED terminal?

SEND TO CLAUDE FOR ANALYSIS
Expected: CANCELLED is terminal, no actions allowed
```

```
TEST ORD-STATE-011: Skip state (DRAFT → SHIPPED)

ACTION:
1. Find DRAFT order
2. Try to ship directly (skip CONFIRMED/ALLOCATED)

OBSERVE AND REPORT:
- Is Ship button available on DRAFT?
- If forced via API, what happens?

SEND TO CLAUDE FOR ANALYSIS
Expected: Should be blocked - must follow state order
```

### CATEGORY 3: Credit Limit Enforcement

```
TEST ORD-CREDIT-001: Order within credit limit

ACTION:
1. Find client with creditLimit = $10,000, totalOwed = $0
2. Create order for $5,000
3. Confirm

OBSERVE AND REPORT:
- Confirmation successful?
- Any credit-related message?

SEND TO CLAUDE FOR ANALYSIS
Expected: Should succeed (well within limit)
```

```
TEST ORD-CREDIT-002: Order exactly at credit limit

ACTION:
1. Find client with creditLimit = $10,000, totalOwed = $5,000
2. Create order for $5,000 (exactly fills remaining credit)
3. Confirm

OBSERVE AND REPORT:
- Confirmation successful?
- Any warning?

SEND TO CLAUDE FOR ANALYSIS
Expected: Should succeed (exactly at limit)
```

```
TEST ORD-CREDIT-003: Order exceeds credit limit (BLOCKED)

ACTION:
1. Find client with creditLimit = $10,000, totalOwed = $5,000
2. Create order for $6,000 (would exceed by $1,000)
3. Try to confirm

OBSERVE AND REPORT:
- Is confirmation blocked?
- What error message?
- Does message show available credit?
- Screenshot

SEND TO CLAUDE FOR ANALYSIS
Expected: BLOCKED with clear message showing available credit = $5,000
```

```
TEST ORD-CREDIT-004: Client already at limit

ACTION:
1. Find client with creditLimit = $10,000, totalOwed = $10,000
2. Create order for $1
3. Try to confirm

OBSERVE AND REPORT:
- Blocked?
- Error message?

SEND TO CLAUDE FOR ANALYSIS
Expected: Blocked - no credit available
```

```
TEST ORD-CREDIT-005: Credit limit 90% warning

ACTION:
1. Find client with creditLimit = $10,000, totalOwed = $8,500
2. Create order for $1,000 (would be at 95%)
3. Confirm

OBSERVE AND REPORT:
- Any warning about high utilization?
- Is confirmation allowed with warning?

SEND TO CLAUDE FOR ANALYSIS
Expected: May show warning but allow confirmation
```

```
TEST ORD-CREDIT-006: Credit updates after payment

ACTION:
1. Client has creditLimit=$10,000, totalOwed=$10,000 (at limit)
2. Record payment of $5,000
3. Check client's available credit
4. Try to create order for $4,000

OBSERVE AND REPORT:
- totalOwed after payment: ____
- Available credit: ____
- Can order be confirmed?

SEND TO CLAUDE FOR ANALYSIS
Expected: After payment, totalOwed=$5,000, available=$5,000, order allowed
```

### CATEGORY 4: Quote Management

```
TEST ORD-QUOTE-001: Create quote

ACTION:
1. Navigate to /quotes/new
2. Select client
3. Add line items
4. Set expiration date (7 days from now)
5. Save

OBSERVE AND REPORT:
- Quote created?
- Quote number assigned?
- Status = DRAFT?
- Expiration date saved?

SEND TO CLAUDE FOR ANALYSIS
```

```
TEST ORD-QUOTE-002: Quote to order conversion

ACTION:
1. Find SENT quote (not expired)
2. Click "Convert to Order"
3. Observe

OBSERVE AND REPORT:
- Order created?
- Order linked to quote (sourceQuoteId)?
- Quote status changed to CONVERTED?
- Prices on order match quote prices?

SEND TO CLAUDE FOR ANALYSIS
```

```
TEST ORD-QUOTE-003: Expired quote cannot convert

ACTION:
1. Find or create quote with expiration = yesterday
2. Try to convert to order

OBSERVE AND REPORT:
- Is conversion blocked?
- What error message?

SEND TO CLAUDE FOR ANALYSIS
Expected: Should be blocked - quote expired
```

```
TEST ORD-QUOTE-004: Price lock - quote price survives catalog change

ACTION:
1. Create quote with Product A @ $100
2. Send the quote
3. Change catalog price of Product A to $120
4. Convert quote to order
5. Check order price

OBSERVE AND REPORT:
- Quote price: $100
- Current catalog price: $120
- Order price: ____ (should be $100)

SEND TO CLAUDE FOR ANALYSIS
Expected: Order should use quote price ($100), not current catalog ($120)
```

```
TEST ORD-QUOTE-005: Already converted quote cannot convert again

ACTION:
1. Find CONVERTED quote
2. Try to convert again

OBSERVE AND REPORT:
- Is button available?
- Is it blocked?
- What error?

SEND TO CLAUDE FOR ANALYSIS
Expected: Should be blocked - already converted
```

```
TEST ORD-QUOTE-006: Quote inventory check at conversion

ACTION:
1. Create quote for 100 units of Product A
2. While quote is pending, sell all inventory of Product A
3. Try to convert quote

OBSERVE AND REPORT:
- Is conversion allowed?
- If allowed, is order confirmation blocked (no inventory)?

SEND TO CLAUDE FOR ANALYSIS
Expected: Inventory checked at conversion or confirmation time
```

### CATEGORY 5: Fulfillment

```
TEST ORD-FULFILL-001: Full shipment

ACTION:
1. Find ALLOCATED order with all items available
2. Ship all items
3. Check inventory and order status

OBSERVE AND REPORT:
- All items shipped?
- Order status = SHIPPED?
- Inventory reduced?
- Tracking number recorded?

SEND TO CLAUDE FOR ANALYSIS
```

```
TEST ORD-FULFILL-002: Partial shipment creates backorder

ACTION:
1. Find ALLOCATED order for 100 units
2. Ship only 60 units
3. Check for backorder

OBSERVE AND REPORT:
- Is partial shipment allowed?
- Is backorder created for remaining 40?
- Original order status?
- Backorder status?

SEND TO CLAUDE FOR ANALYSIS
```

```
TEST ORD-FULFILL-003: Shipping address override

ACTION:
1. Create order for client with default address
2. At shipment, change shipping address
3. Complete shipment

OBSERVE AND REPORT:
- Can address be overridden?
- Is new address saved on shipment?

SEND TO CLAUDE FOR ANALYSIS
```

```
TEST ORD-FULFILL-004: Carrier selection

ACTION:
1. Ship an order
2. Select carrier (UPS, FedEx, etc.)
3. Enter tracking number
4. Complete

OBSERVE AND REPORT:
- Carrier options available?
- Carrier saved?
- Tracking number saved?

SEND TO CLAUDE FOR ANALYSIS
```

### CATEGORY 6: Returns (Note: P0-003 - May Not Be Implemented)

```
TEST ORD-RETURN-001: Create RMA

ACTION:
1. Find DELIVERED order
2. Look for "Return" or "RMA" option
3. If available, initiate return

OBSERVE AND REPORT:
- Is return/RMA feature available?
- Can you select items to return?
- Return reason options?

SEND TO CLAUDE FOR ANALYSIS
Note: P0-003 indicates this may not be implemented
```

```
TEST ORD-RETURN-002: Restock return

ACTION:
1. If returns exist: process return as "Restock"
2. Check inventory after processing

OBSERVE AND REPORT:
- Did inventory increase?
- Was credit memo created?

SEND TO CLAUDE FOR ANALYSIS
Note: May be blocked by P0-003
```

### CATEGORY 7: Edge Cases

```
TEST ORD-EDGE-001: Order with 100 line items

ACTION:
1. Create order
2. Add 100 different line items
3. Save and observe performance

OBSERVE AND REPORT:
- Save successful?
- Load time?
- Display correct?

SEND TO CLAUDE FOR ANALYSIS
```

```
TEST ORD-EDGE-002: $0.01 order

ACTION:
1. Create order for Qty 1 × $0.01
2. Complete full lifecycle (confirm → ship → deliver)

OBSERVE AND REPORT:
- All steps work with minimal amount?

SEND TO CLAUDE FOR ANALYSIS
```

```
TEST ORD-EDGE-003: Same client, two orders, one batch

ACTION:
1. Client has order A (allocated 50 units from Batch 1)
2. Create order B for same client, same batch
3. Both orders compete for remaining inventory

OBSERVE AND REPORT:
- Are allocations tracked separately?
- Does batch.allocated = sum of both?

SEND TO CLAUDE FOR ANALYSIS
```

```
TEST ORD-EDGE-004: Edit confirmed order (if allowed)

ACTION:
1. Find CONFIRMED order
2. Try to edit quantities or prices

OBSERVE AND REPORT:
- Is editing allowed after confirmation?
- If yes, does it re-validate credit limit?

SEND TO CLAUDE FOR ANALYSIS
```

```
TEST ORD-EDGE-005: Order number uniqueness

ACTION:
1. Create two orders rapidly
2. Check order numbers

OBSERVE AND REPORT:
- Are order numbers unique?
- Sequential?

SEND TO CLAUDE FOR ANALYSIS
```

---

## KNOWN ISSUES TO SKIP

| ID | Description |
|----|-------------|
| P0-003 | RETURNED status needs restock/vendor-return paths |

---

## FINAL REPORT FORMAT

```markdown
## AGENT ORDERS — Final Report

### Summary
- Total Tests: [N]
- PASS: [N]
- FAIL: [N]
- BLOCKED: [N]

### State Machine Verification
| Transition | Allowed | Side Effects |
|------------|---------|--------------|
| DRAFT → CONFIRMED | ✅ | Credit check, price lock |
| CONFIRMED → ALLOCATED | ✅ | Inventory allocated |
| ALLOCATED → SHIPPED | ✅ | OnHand reduced |
| SHIPPED → DELIVERED | ✅ | Complete |
| ALLOCATED → CANCELLED | ✅ | Allocation released |
| SHIPPED → CANCELLED | ❌ Blocked | N/A |

### Credit Limit
| Scenario | Expected | Actual | Status |
|----------|----------|--------|--------|
| Within limit | Allowed | Allowed | PASS |
| At limit | Allowed | Allowed | PASS |
| Over limit | Blocked | Blocked | PASS |

### Quote Price Lock
| Quote Price | Catalog Changed To | Order Price | Status |
|-------------|-------------------|-------------|--------|
| $100 | $120 | $100 | PASS |

### Fulfillment
| Feature | Works |
|---------|-------|
| Full shipment | ✅ |
| Partial shipment | ✅ |
| Tracking number | ✅ |

### Findings
| ID | Test | Severity | Description |
|----|------|----------|-------------|

AWAITING CLAUDE FINAL ANALYSIS
```
