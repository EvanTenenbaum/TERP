# AGENT STRESS — Concurrency, Load & Edge Cases

## AGENT IDENTITY
```
Agent Name: STRESS
Risk Level: 🔴 RED MODE
Primary Role: qa.superadmin@terp.test (+ multiple sessions)
Estimated Time: 45 minutes
Run Order: Phase 4 (after core domain testing)
Matrix Rows: ~40 flows
```

## YOUR MISSION

Test the application under stress conditions: race conditions, concurrent operations, boundary values, and extreme edge cases. These tests find bugs that normal testing misses.

**Remember: You are browser automation only. Claude API makes all pass/fail decisions.**

---

## CLAUDE API SYSTEM PROMPT FOR THIS AGENT

```
You are the QA analyst for TERP stress testing. Manus is executing browser automation and reporting observations. Your job:

1. DETECT RACE CONDITIONS: Concurrent operations on same resource
2. TEST BOUNDARIES: Minimum, maximum, zero, negative values
3. CHECK DATA INTEGRITY: No orphans, no double-counting
4. EVALUATE RECOVERY: Error handling, rollback behavior

CRITICAL CONCURRENCY SCENARIOS:
- Two users allocating same inventory = only one should succeed
- Payment recorded twice = idempotent or rejected
- Same quote converted twice = second blocked
- Credit limit check with concurrent orders = only valid one succeeds

INVARIANTS THAT MUST HOLD:
- Inventory: Available >= 0 always
- Inventory: Allocated + Reserved <= OnHand
- Accounting: Trial balance debits = credits
- Orders: State transitions follow allowed paths

Repository: https://github.com/EvanTenenbaum/TERP
```

---

## TEST CATEGORIES

### CATEGORY 1: Inventory Concurrency [CRITICAL]

```
TEST STRESS-INV-001: Race condition - two orders for same stock

SETUP:
1. Find batch with exactly 50 units available
2. Open TWO browser windows, both logged in

ACTION:
Window A:
1. Create order for 50 units
2. Navigate to confirm button, WAIT

Window B:
1. Create order for 50 units
2. Navigate to confirm button, WAIT

SIMULTANEOUSLY:
1. Click confirm in Window A
2. Immediately click confirm in Window B (within 1 second)

OBSERVE AND REPORT:
- Window A result: Success/Fail?
- Window B result: Success/Fail?
- Batch allocation now: ____ (should be 50, not 100)
- Batch available now: ____ (should be 0, not -50)
- Screenshot of both results

SEND TO CLAUDE FOR ANALYSIS
Expected: ONE succeeds, one fails. Never both succeed if only 50 available.
```

```
TEST STRESS-INV-002: Concurrent adjustments to same batch

ACTION:
Window A: Adjust batch +20 units
Window B: Adjust batch -10 units
Execute simultaneously

OBSERVE AND REPORT:
- Final quantity
- Both adjustments recorded?
- Net change correct (+10)?

SEND TO CLAUDE FOR ANALYSIS
```

```
TEST STRESS-INV-003: Order allocation during inventory adjustment

ACTION:
1. Batch has 100 available
2. Window A: Create order for 80, start confirming
3. Window B: Adjust batch -50, submit
4. Complete Window A confirmation

OBSERVE AND REPORT:
- Order confirmed?
- Final available quantity
- Any negative available?

SEND TO CLAUDE FOR ANALYSIS
```

### CATEGORY 2: Payment Concurrency

```
TEST STRESS-PAY-001: Double payment submission

ACTION:
1. Find invoice for $1000
2. Fill payment form for $1000
3. Click submit rapidly twice (double-click)

OBSERVE AND REPORT:
- How many payments created?
- Invoice balance (should be $0, not -$1000)
- Is this idempotent or does it duplicate?

SEND TO CLAUDE FOR ANALYSIS
Expected: Only one payment recorded
```

```
TEST STRESS-PAY-002: Concurrent payments to same invoice

ACTION:
Window A: Record $500 payment to Invoice X
Window B: Record $500 payment to Invoice X (same invoice)
Execute simultaneously

OBSERVE AND REPORT:
- Both succeed?
- Total payments on invoice
- Invoice balance

SEND TO CLAUDE FOR ANALYSIS
Expected: Both should succeed (legitimate scenario)
```

```
TEST STRESS-PAY-003: Payment while voiding invoice

ACTION:
Window A: Start voiding invoice
Window B: Record payment to same invoice
Execute simultaneously

OBSERVE AND REPORT:
- Which operation won?
- Final invoice status
- Payment recorded or rejected?

SEND TO CLAUDE FOR ANALYSIS
Expected: One should fail, consistent state
```

### CATEGORY 3: Order Concurrency

```
TEST STRESS-ORD-001: Confirm while cancelling

ACTION:
1. Find DRAFT order
2. Window A: Click Confirm
3. Window B: Click Cancel
4. Execute simultaneously

OBSERVE AND REPORT:
- Final order status
- Consistent state?

SEND TO CLAUDE FOR ANALYSIS
```

```
TEST STRESS-ORD-002: Credit limit race

SETUP:
Client has creditLimit=$10,000, totalOwed=$0

ACTION:
Window A: Create order for $8,000, confirm
Window B: Create order for $8,000, confirm
Execute simultaneously

OBSERVE AND REPORT:
- Window A result
- Window B result
- Both confirmed? (would exceed limit)
- Client total owed after

SEND TO CLAUDE FOR ANALYSIS
Expected: One should succeed, one should fail (combined would exceed limit)
```

```
TEST STRESS-ORD-003: Same quote converted twice

ACTION:
Window A: Convert quote to order
Window B: Convert same quote to order
Execute simultaneously

OBSERVE AND REPORT:
- Window A result
- Window B result
- How many orders created?
- Quote status

SEND TO CLAUDE FOR ANALYSIS
Expected: Only one order created, second attempt blocked
```

### CATEGORY 4: Numeric Boundaries

```
TEST STRESS-NUM-001: Zero quantity

ACTION:
Try to create order/invoice/adjustment with quantity = 0

OBSERVE AND REPORT:
- Accepted or rejected?
- Error message if rejected?

SEND TO CLAUDE FOR ANALYSIS
Expected: Rejected
```

```
TEST STRESS-NUM-002: Negative quantity

ACTION:
Try to enter quantity = -10 in:
- Order line item
- Invoice line item
- Inventory adjustment (as positive)

OBSERVE AND REPORT:
- Accepted or rejected for each?
- How is negative handled?

SEND TO CLAUDE FOR ANALYSIS
Expected: Rejected or properly handled
```

```
TEST STRESS-NUM-003: Decimal precision

ACTION:
1. Create order with quantity = 1.001
2. Set price = $10.005
3. Calculate expected total
4. Compare to displayed

OBSERVE AND REPORT:
- Quantity accepted: ____
- Price accepted: ____
- Calculation correct?
- How many decimal places stored?

SEND TO CLAUDE FOR ANALYSIS
```

```
TEST STRESS-NUM-004: Maximum values

ACTION:
Try entering maximum values:
- Quantity: 999999999
- Price: $99999999.99
- Credit limit: $999999999

OBSERVE AND REPORT:
- Each accepted?
- Any overflow errors?
- Displayed correctly?

SEND TO CLAUDE FOR ANALYSIS
```

```
TEST STRESS-NUM-005: Discount over 100%

ACTION:
1. Create invoice for $1000
2. Apply 110% discount
3. Observe

OBSERVE AND REPORT:
- Accepted?
- Results in negative total?
- Validation error?

SEND TO CLAUDE FOR ANALYSIS
Expected: Should be rejected (negative total)
```

### CATEGORY 5: String Boundaries

```
TEST STRESS-STR-001: Empty required field

ACTION:
Submit forms with empty required fields:
- Client name = ""
- Order without line items
- Invoice without amount

OBSERVE AND REPORT:
- Each rejected?
- Clear validation messages?

SEND TO CLAUDE FOR ANALYSIS
```

```
TEST STRESS-STR-002: Very long strings

ACTION:
Enter 10,000 characters in:
- Client name
- Notes field
- Description field

OBSERVE AND REPORT:
- Accepted or truncated?
- Any errors?
- Display issues?

SEND TO CLAUDE FOR ANALYSIS
```

```
TEST STRESS-STR-003: Special characters

ACTION:
Enter: `<script>alert('xss')</script> & "quotes" 'apostrophe' \backslash`
In various text fields

OBSERVE AND REPORT:
- Saved correctly?
- Displayed correctly (escaped)?
- Any XSS execution?

SEND TO CLAUDE FOR ANALYSIS
```

```
TEST STRESS-STR-004: Unicode and emoji

ACTION:
Enter: `日本語 中文 العربية 🎉 👍 💰`
In name and notes fields

OBSERVE AND REPORT:
- Saved correctly?
- Displayed correctly?
- Searchable?

SEND TO CLAUDE FOR ANALYSIS
```

### CATEGORY 6: Date Boundaries

```
TEST STRESS-DATE-001: Far future date

ACTION:
Set dates to year 2100:
- Invoice due date
- Quote expiration
- Order date

OBSERVE AND REPORT:
- Accepted?
- Displays correctly?
- Any calculation issues?

SEND TO CLAUDE FOR ANALYSIS
```

```
TEST STRESS-DATE-002: Far past date

ACTION:
Set dates to year 1900 or 2000

OBSERVE AND REPORT:
- Accepted?
- Any issues?

SEND TO CLAUDE FOR ANALYSIS
```

```
TEST STRESS-DATE-003: Invalid date

ACTION:
Try to enter:
- February 30
- Month 13
- Invalid formats

OBSERVE AND REPORT:
- How does date picker handle?
- Any validation?

SEND TO CLAUDE FOR ANALYSIS
```

### CATEGORY 7: Load Testing

```
TEST STRESS-LOAD-001: Large list (1000+ items)

ACTION:
1. If possible, ensure 1000+ clients exist
2. Load /clients page
3. Measure time

OBSERVE AND REPORT:
- Load time: ____ seconds
- Pagination working?
- Any timeout?

SEND TO CLAUDE FOR ANALYSIS
```

```
TEST STRESS-LOAD-002: Large form (100 line items)

ACTION:
1. Create order
2. Add 100 line items
3. Save

OBSERVE AND REPORT:
- Performance during adding?
- Save time?
- All items saved?

SEND TO CLAUDE FOR ANALYSIS
```

```
TEST STRESS-LOAD-003: Rapid navigation

ACTION:
1. Click through pages rapidly (click before previous loads)
2. Navigate: Dashboard → Clients → Orders → Inventory → back
3. Repeat quickly

OBSERVE AND REPORT:
- Any errors?
- Race conditions in UI?
- Memory issues?

SEND TO CLAUDE FOR ANALYSIS
```

```
TEST STRESS-LOAD-004: Long session (simulate)

ACTION:
1. Login
2. Perform 50+ actions over time
3. Check for memory leaks in DevTools

OBSERVE AND REPORT:
- Memory usage stable?
- Any slowdown over time?
- Session still valid?

SEND TO CLAUDE FOR ANALYSIS
```

### CATEGORY 8: Error Recovery

```
TEST STRESS-ERR-001: Network failure mid-submit

ACTION:
1. Fill out a form
2. Before clicking submit, go offline (DevTools > Network > Offline)
3. Click submit
4. Go back online

OBSERVE AND REPORT:
- Error shown?
- Form data preserved?
- Can retry?

SEND TO CLAUDE FOR ANALYSIS
```

```
TEST STRESS-ERR-002: Server error (500)

ACTION:
1. If possible, trigger a 500 error
2. Observe UI handling

OBSERVE AND REPORT:
- Error displayed?
- Can user recover?
- Data not corrupted?

SEND TO CLAUDE FOR ANALYSIS
```

```
TEST STRESS-ERR-003: Session expiry mid-action

ACTION:
1. Start filling a form
2. Wait for session to expire (or manually clear token)
3. Try to submit

OBSERVE AND REPORT:
- Redirected to login?
- Form data lost or preserved?
- Clear message?

SEND TO CLAUDE FOR ANALYSIS
```

### CATEGORY 9: Data Integrity Checks

```
TEST STRESS-INT-001: Orphan prevention - client with orders

ACTION:
1. Find client with existing orders
2. Try to hard delete

OBSERVE AND REPORT:
- Deletion blocked?
- Error message explains why?

SEND TO CLAUDE FOR ANALYSIS
```

```
TEST STRESS-INT-002: Orphan prevention - batch with movements

ACTION:
1. Find batch with movement history
2. Try to delete

OBSERVE AND REPORT:
- Blocked or allowed?
- If allowed, what happens to movements?

SEND TO CLAUDE FOR ANALYSIS
```

```
TEST STRESS-INT-003: Cascade check - void invoice with payments

ACTION:
1. Invoice has payments applied
2. Try to void

OBSERVE AND REPORT:
- Blocked?
- If allowed, what happens to payments?

SEND TO CLAUDE FOR ANALYSIS
```

---

## FINAL REPORT FORMAT

```markdown
## AGENT STRESS — Final Report

### Summary
- Total Tests: [N]
- PASS: [N]
- FAIL: [N]
- BLOCKED: [N]

### Concurrency Issues Found
| Test | Scenario | Expected | Actual | Severity |
|------|----------|----------|--------|----------|
| INV-001 | Two orders for 50 units | One fails | Both succeeded | P0 |
| PAY-001 | Double payment | One payment | Two payments | P0 |

### Boundary Violations
| Test | Input | Expected | Actual |
|------|-------|----------|--------|
| NUM-005 | 110% discount | Reject | Accepted, negative total |

### Load Test Results
| Scenario | Result | Target |
|----------|--------|--------|
| 1000 clients | 2.5s | < 3s ✅ |
| 100 line items | 1.8s | < 2s ✅ |

### Data Integrity
| Check | Status |
|-------|--------|
| Client deletion blocked if has orders | ✅ |
| Batch deletion blocked if has movements | ✅ |
| Invoice void blocked if has payments | ✅ |

### Findings
| ID | Test | Severity | Description |
|----|------|----------|-------------|
| STRESS-001 | INV-001 | P0 | Race condition allows over-allocation |
| STRESS-002 | PAY-001 | P0 | Double-click creates duplicate payment |

AWAITING CLAUDE FINAL ANALYSIS
```
