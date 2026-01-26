# AGENT MONEY — Accounting, Invoices, Payments, AR/AP

## AGENT IDENTITY
```
Agent Name: MONEY
Risk Level: 🔴 RED MODE
Primary Role: qa.accounting@terp.test
Backup Role: qa.superadmin@terp.test
Estimated Time: 45 minutes
Run Order: Phase 2 (after REGRESSION passes)
Matrix Rows: ~65 flows
```

## YOUR MISSION

Test all financial calculations with mathematical precision. Every dollar amount must be verified against manual calculation. Trust killers in accounting destroy the entire system's credibility.

**Remember: You are browser automation only. Claude API makes all pass/fail decisions and performs all calculations.**

---

## CLAUDE API SYSTEM PROMPT FOR THIS AGENT

```
You are the QA analyst for TERP accounting and financial features. Manus is executing browser automation and reporting observed values. Your job:

1. VERIFY CALCULATIONS: Manually calculate expected values and compare to observed
2. CHECK DOUBLE-ENTRY: Every transaction must have balanced debits and credits
3. VALIDATE STATE MACHINES: Invoice status transitions and side effects
4. TEST AR/AP AGING: Bucket calculations based on due dates
5. Assign severity: P0 for any calculation error (even $0.01), P1 for state issues, P2 for UX

CALCULATION FORMULAS TO VERIFY:

Invoice Total:
  LineTotal[i] = quantity[i] × unitPrice[i]
  Subtotal = Σ(LineTotal[i])
  DiscountAmount = IF percent: Subtotal × (discountPercent/100) ELSE: fixed amount
  TaxableAmount = Subtotal - DiscountAmount
  TaxAmount = TaxableAmount × (taxRate/100)
  Total = Subtotal - DiscountAmount + TaxAmount + ShippingAmount
  OpenBalance = Total - Σ(payments) - Σ(credits)

Aging Buckets (based on dueDate vs today):
  Current: dueDate >= today
  1-30: today - 30 <= dueDate < today
  31-60: today - 60 <= dueDate < today - 30
  61-90: today - 90 <= dueDate < today - 60
  90+: dueDate < today - 90

When Manus reports values, YOU calculate expected and compare. Any difference = FAIL.

Repository: https://github.com/EvanTenenbaum/TERP
Focus files: server/services/accounting/*, server/routers/accounting/*
```

---

## TEST CATEGORIES

### CATEGORY 1: Invoice Calculation Tests

```
TEST MONEY-INV-001: Simple invoice, no discount or tax

ACTION:
1. Login as qa.accounting@terp.test
2. Navigate to /accounting/invoices/new
3. Select any client
4. Add line item: Product A, Quantity: 10, Unit Price: $100.00
5. Set discount: None (0)
6. Set tax: 0%
7. Save invoice

OBSERVE AND REPORT:
- Line total displayed
- Subtotal displayed
- Discount displayed
- Tax displayed
- Total displayed
- Open balance displayed
- Screenshot of invoice summary

SEND TO CLAUDE FOR CALCULATION VERIFICATION
Expected: Subtotal=$1000, Discount=$0, Tax=$0, Total=$1000
```

```
TEST MONEY-INV-002: Invoice with percentage discount

ACTION:
1. Create new invoice
2. Add line item: Qty 10 × $100.00
3. Apply 10% discount
4. No tax
5. Save

OBSERVE AND REPORT:
- All calculated values on screen
- Screenshot

SEND TO CLAUDE FOR CALCULATION VERIFICATION
Expected: Subtotal=$1000, Discount=$100, Total=$900
```

```
TEST MONEY-INV-003: Invoice with fixed discount

ACTION:
1. Create new invoice
2. Add line item: Qty 10 × $100.00
3. Apply $50 fixed discount
4. No tax
5. Save

OBSERVE AND REPORT:
- All values

SEND TO CLAUDE FOR CALCULATION VERIFICATION
Expected: Subtotal=$1000, Discount=$50, Total=$950
```

```
TEST MONEY-INV-004: Invoice with tax only

ACTION:
1. Create new invoice
2. Add line item: Qty 10 × $100.00
3. No discount
4. Tax rate: 8.25%
5. Save

OBSERVE AND REPORT:
- Subtotal
- Tax amount
- Total

SEND TO CLAUDE FOR CALCULATION VERIFICATION
Expected: Subtotal=$1000, Tax=$82.50, Total=$1082.50
```

```
TEST MONEY-INV-005: Invoice with discount AND tax

ACTION:
1. Create new invoice
2. Add line item: Qty 10 × $100.00
3. Apply 10% discount
4. Tax rate: 8.25%
5. Save

OBSERVE AND REPORT:
- Subtotal
- Discount amount
- Taxable amount (should be AFTER discount)
- Tax amount
- Total

SEND TO CLAUDE FOR CALCULATION VERIFICATION
Expected: Subtotal=$1000, Discount=$100, Taxable=$900, Tax=$74.25, Total=$974.25
CRITICAL: Tax must be calculated on discounted amount, not original subtotal
```

```
TEST MONEY-INV-006: Invoice with multiple line items

ACTION:
1. Create new invoice
2. Add line items:
   - Product A: Qty 5 × $100.00
   - Product B: Qty 3 × $50.00
   - Product C: Qty 2 × $75.00
3. No discount, no tax
4. Save

OBSERVE AND REPORT:
- Each line total
- Subtotal
- Total

SEND TO CLAUDE FOR CALCULATION VERIFICATION
Expected: Lines=$500+$150+$150=$800, Total=$800
```

```
TEST MONEY-INV-007: Invoice with fractional quantities

ACTION:
1. Create new invoice
2. Add line item: Qty 2.5 × $100.00
3. Save

OBSERVE AND REPORT:
- Line total
- Is decimal quantity accepted?

SEND TO CLAUDE FOR CALCULATION VERIFICATION
Expected: LineTotal=$250.00
```

```
TEST MONEY-INV-008: Penny rounding test

ACTION:
1. Create new invoice
2. Add line item: Qty 3 × $33.33
3. Save

OBSERVE AND REPORT:
- Line total (should be $99.99, not $99.98 or $100.00)

SEND TO CLAUDE FOR CALCULATION VERIFICATION
Expected: $99.99 (verify rounding method)
```

```
TEST MONEY-INV-009: Maximum value test

ACTION:
1. Create new invoice
2. Add line item: Qty 9999 × $9999.99
3. Save (or observe error)

OBSERVE AND REPORT:
- Is this accepted?
- What is the calculated total?
- Any overflow errors?

SEND TO CLAUDE FOR ANALYSIS
```

```
TEST MONEY-INV-010: Zero quantity rejection

ACTION:
1. Create new invoice
2. Try to add line item: Qty 0 × $100.00
3. Observe

OBSERVE AND REPORT:
- Is it accepted?
- Any validation error?

SEND TO CLAUDE FOR ANALYSIS
Expected: Should be rejected or warned
```

```
TEST MONEY-INV-011: Negative quantity rejection

ACTION:
1. Create new invoice
2. Try to add line item: Qty -5 × $100.00
3. Observe

OBSERVE AND REPORT:
- Is it accepted?
- Any validation error?

SEND TO CLAUDE FOR ANALYSIS
Expected: Should be rejected
```

### CATEGORY 2: Invoice Status Lifecycle

```
TEST MONEY-INV-STATUS-001: Draft to Sent

ACTION:
1. Find or create a DRAFT invoice
2. Click "Send" or equivalent action
3. Observe status change

OBSERVE AND REPORT:
- Previous status
- New status
- Any timestamp (sentAt)
- Any email triggered?

SEND TO CLAUDE FOR ANALYSIS
```

```
TEST MONEY-INV-STATUS-002: Void draft invoice

ACTION:
1. Find or create a DRAFT invoice
2. Click "Void" action
3. Observe result

OBSERVE AND REPORT:
- Is void allowed?
- New status
- Any AR impact? (should be none for draft)

SEND TO CLAUDE FOR ANALYSIS
```

```
TEST MONEY-INV-STATUS-003: Void sent invoice

ACTION:
1. Find a SENT invoice (no payments)
2. Click "Void"
3. Observe

OBSERVE AND REPORT:
- Is void allowed?
- New status
- Was AR reversed?

SEND TO CLAUDE FOR ANALYSIS
```

```
TEST MONEY-INV-STATUS-004: Cannot void invoice with payments

ACTION:
1. Find an invoice with partial payment (PARTIAL status)
2. Attempt to void

OBSERVE AND REPORT:
- Is void button visible?
- If clicked, what error?

SEND TO CLAUDE FOR ANALYSIS
Expected: Should be blocked
```

### CATEGORY 3: Payment Recording

```
TEST MONEY-PAY-001: Exact payment clears invoice

ACTION:
1. Find a SENT invoice for exactly $1000
2. Record payment of $1000
3. Observe

OBSERVE AND REPORT:
- Payment recorded?
- Invoice status changed to PAID?
- Open balance now $0?
- Client's total owed reduced?

SEND TO CLAUDE FOR ANALYSIS
```

```
TEST MONEY-PAY-002: Partial payment

ACTION:
1. Find a SENT invoice for $1000
2. Record payment of $400
3. Observe

OBSERVE AND REPORT:
- Invoice status changed to PARTIAL?
- Open balance now $600?
- Payment amount recorded correctly?

SEND TO CLAUDE FOR ANALYSIS
```

```
TEST MONEY-PAY-003: Overpayment handling

ACTION:
1. Find a SENT invoice for $1000
2. Record payment of $1200
3. Observe

OBSERVE AND REPORT:
- Invoice status?
- Open balance?
- Where did the $200 overpayment go? (unapplied credit?)
- Any warning before accepting?

SEND TO CLAUDE FOR ANALYSIS
```

```
TEST MONEY-PAY-004: Multiple partial payments

ACTION:
1. Find a SENT invoice for $1000
2. Record payment of $300
3. Record another payment of $300
4. Record another payment of $400
5. Observe final state

OBSERVE AND REPORT:
- Status after each payment
- Final status (should be PAID)
- Total payments = $1000
- Open balance = $0

SEND TO CLAUDE FOR ANALYSIS
```

```
TEST MONEY-PAY-005: Zero payment rejection

ACTION:
1. Try to record a $0 payment
2. Observe

OBSERVE AND REPORT:
- Is it accepted?
- Any validation error?

SEND TO CLAUDE FOR ANALYSIS
Expected: Should be rejected
```

```
TEST MONEY-PAY-006: Payment method tracking

ACTION:
1. Record a payment
2. Select payment method (Check, Cash, ACH, etc.)
3. Enter reference number
4. Save

OBSERVE AND REPORT:
- Is method saved?
- Is reference saved?
- Visible in payment history?

SEND TO CLAUDE FOR ANALYSIS
```

```
TEST MONEY-PAY-007: Void payment

ACTION:
1. Find a payment on a PARTIAL invoice
2. Void the payment
3. Observe

OBSERVE AND REPORT:
- Is void allowed?
- Invoice status reverted?
- AR balance restored?
- Ledger entry reversed?

SEND TO CLAUDE FOR ANALYSIS
```

### CATEGORY 4: AR Aging

```
TEST MONEY-AGING-001: Current bucket (future due date)

ACTION:
1. Create invoice with due date = today + 7 days
2. Check aging report

OBSERVE AND REPORT:
- Which bucket is the invoice in?
- Screenshot of aging report

SEND TO CLAUDE FOR ANALYSIS
Expected: "Current" bucket
```

```
TEST MONEY-AGING-002: 1-30 days bucket

ACTION:
1. Create invoice with due date = today - 15 days
2. Check aging report

OBSERVE AND REPORT:
- Which bucket?

SEND TO CLAUDE FOR ANALYSIS
Expected: "1-30 Days" bucket
```

```
TEST MONEY-AGING-003: 31-60 days bucket

ACTION:
1. Create invoice with due date = today - 45 days
2. Check aging report

OBSERVE AND REPORT:
- Which bucket?

SEND TO CLAUDE FOR ANALYSIS
Expected: "31-60 Days" bucket
```

```
TEST MONEY-AGING-004: 61-90 days bucket

ACTION:
1. Create invoice with due date = today - 75 days
2. Check aging report

OBSERVE AND REPORT:
- Which bucket?

SEND TO CLAUDE FOR ANALYSIS
Expected: "61-90 Days" bucket
```

```
TEST MONEY-AGING-005: 90+ days bucket

ACTION:
1. Create invoice with due date = today - 120 days
2. Check aging report

OBSERVE AND REPORT:
- Which bucket?

SEND TO CLAUDE FOR ANALYSIS
Expected: "90+ Days" bucket
```

```
TEST MONEY-AGING-006: Aging totals sum correctly

ACTION:
1. View AR aging report
2. Note total for each bucket
3. Note grand total
4. Cross-reference with invoice list

OBSERVE AND REPORT:
- Current: $____
- 1-30: $____
- 31-60: $____
- 61-90: $____
- 90+: $____
- Grand Total: $____
- Does grand total = sum of buckets?

SEND TO CLAUDE FOR VERIFICATION
```

```
TEST MONEY-AGING-007: Aging updates after payment

ACTION:
1. Note aging report totals
2. Record a payment on an overdue invoice
3. Check aging report again WITHOUT refreshing first
4. Then refresh

OBSERVE AND REPORT:
- Did totals update immediately?
- Did totals update after refresh?
- Correct bucket reduced?

SEND TO CLAUDE FOR ANALYSIS
```

### CATEGORY 5: Double-Entry Ledger

```
TEST MONEY-LEDGER-001: Invoice creates balanced entry

ACTION:
1. Create and send an invoice for $1000
2. Navigate to ledger/journal entries
3. Find the entry for this invoice

OBSERVE AND REPORT:
- Debit accounts and amounts
- Credit accounts and amounts
- Are they balanced? (DR = CR)

SEND TO CLAUDE FOR VERIFICATION
Expected: DR Accounts Receivable $1000, CR Revenue $1000
```

```
TEST MONEY-LEDGER-002: Payment creates balanced entry

ACTION:
1. Record a payment of $500
2. Find the ledger entry

OBSERVE AND REPORT:
- Debit accounts and amounts
- Credit accounts and amounts

SEND TO CLAUDE FOR VERIFICATION
Expected: DR Cash/Bank $500, CR Accounts Receivable $500
```

```
TEST MONEY-LEDGER-003: Trial balance

ACTION:
1. Navigate to trial balance or chart of accounts
2. Note total debits and total credits

OBSERVE AND REPORT:
- Total Debits: $____
- Total Credits: $____
- Are they equal?

SEND TO CLAUDE FOR VERIFICATION
```

```
TEST MONEY-LEDGER-004: Invoice void reverses entry

ACTION:
1. Void an invoice
2. Check ledger for reversing entry

OBSERVE AND REPORT:
- Is there a reversing entry?
- Does it offset the original?

SEND TO CLAUDE FOR ANALYSIS
```

### CATEGORY 6: Edge Cases

```
TEST MONEY-EDGE-001: Invoice for $0.01

ACTION:
1. Create invoice with line: Qty 1 × $0.01
2. Save and observe

OBSERVE AND REPORT:
- Accepted?
- Displays correctly?

SEND TO CLAUDE FOR ANALYSIS
```

```
TEST MONEY-EDGE-002: 100% discount = $0 invoice

ACTION:
1. Create invoice for $1000
2. Apply 100% discount
3. Save

OBSERVE AND REPORT:
- Total = $0?
- Is this allowed?
- Status handling?

SEND TO CLAUDE FOR ANALYSIS
```

```
TEST MONEY-EDGE-003: Invoice with same client twice in a row

ACTION:
1. Create invoice for Client A
2. Immediately create another invoice for Client A
3. Both save successfully?

OBSERVE AND REPORT:
- Both created?
- Unique invoice numbers?

SEND TO CLAUDE FOR ANALYSIS
```

```
TEST MONEY-EDGE-004: Invoice number uniqueness

ACTION:
1. Note the last invoice number
2. Create new invoice
3. Check number incremented

OBSERVE AND REPORT:
- Previous number
- New number
- Sequential?

SEND TO CLAUDE FOR ANALYSIS
```

---

## KNOWN ISSUES TO SKIP

If you encounter these, mark as BLOCKED-known-issue:

| ID | Description |
|----|-------------|
| P1-001 | Invoice void needs void reason field |
| REL-003 | Money amounts need DECIMAL migration (may see rounding) |

---

## FINAL REPORT FORMAT

```markdown
## AGENT MONEY — Final Report

### Summary
- Total Tests: [N]
- PASS: [N]
- FAIL: [N]
- BLOCKED: [N]

### Calculation Verification
| Test | Input | Expected | Observed | Status |
|------|-------|----------|----------|--------|
| INV-001 | 10×$100, no tax | $1000 | $1000 | PASS |
| INV-005 | 10×$100, 10% disc, 8.25% tax | $974.25 | $974.24 | P0 FAIL |

### Invoice Lifecycle
| Transition | Works | Side Effects Verified |
|------------|-------|----------------------|
| DRAFT → SENT | ✅ | AR posted |
| SENT → PARTIAL | ✅ | Balance updated |
| PARTIAL → PAID | ✅ | Balance = $0 |
| DRAFT → VOID | ✅ | No AR impact |
| SENT → VOID | ✅ | AR reversed |
| PARTIAL → VOID | ❌ Blocked | N/A |

### AR Aging
| Bucket | Calculation Correct |
|--------|---------------------|
| Current | ✅ |
| 1-30 | ✅ |
| 31-60 | ✅ |
| 61-90 | ✅ |
| 90+ | ✅ |
| Totals sum | ✅ |

### Double-Entry
| Transaction | Balanced |
|-------------|----------|
| Invoice creation | ✅ |
| Payment recording | ✅ |
| Invoice void | ✅ |
| Trial balance | ✅ |

### Findings
| ID | Test | Severity | Description |
|----|------|----------|-------------|
| MONEY-001 | INV-005 | P0 | Tax calculation off by $0.01 |

AWAITING CLAUDE FINAL ANALYSIS
```
