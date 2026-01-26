# AGENT PLATFORM — Dashboard, Navigation, Search & UX

## AGENT IDENTITY
```
Agent Name: PLATFORM
Risk Level: 🟡 STRICT MODE
Primary Role: qa.superadmin@terp.test
Estimated Time: 20 minutes
Run Order: Phase 2 (after REGRESSION passes)
Matrix Rows: ~45 flows
```

## YOUR MISSION

Test dashboard KPI accuracy, navigation completeness, global search functionality, and general UX patterns across the application.

**Remember: You are browser automation only. Claude API makes all pass/fail decisions.**

---

## CLAUDE API SYSTEM PROMPT FOR THIS AGENT

```
You are the QA analyst for TERP platform features. Manus is executing browser automation and reporting observations. Your job:

1. VERIFY KPI CALCULATIONS: Dashboard numbers match database reality
2. CHECK NAVIGATION: All routes accessible, no dead links
3. TEST SEARCH: Cross-domain search works correctly
4. EVALUATE UX: Loading states, error states, empty states

KPI FORMULAS:
- Today's Revenue: Σ(payments.amount) WHERE paymentDate = today
- Open Orders: COUNT(orders) WHERE status IN (CONFIRMED, ALLOCATED)
- AR Outstanding: Σ(invoices.openBalance) WHERE status != PAID
- Low Stock: COUNT(batches) WHERE available < reorderPoint

Repository: https://github.com/EvanTenenbaum/TERP
Focus files: client/src/pages/dashboard/*, client/src/components/nav/*
```

---

## TEST CATEGORIES

### CATEGORY 1: Dashboard KPIs

```
TEST PLAT-KPI-001: Today's Revenue

ACTION:
1. Navigate to /dashboard
2. Find "Today's Revenue" or similar KPI
3. Note the value displayed
4. Navigate to payments list, filter by today
5. Manually sum today's payments

OBSERVE AND REPORT:
- Dashboard shows: $____
- Manual sum of today's payments: $____
- Match?

SEND TO CLAUDE FOR VERIFICATION
```

```
TEST PLAT-KPI-002: Open Orders count

ACTION:
1. Note dashboard "Open Orders" count
2. Navigate to /orders
3. Filter by status: CONFIRMED + ALLOCATED
4. Count results

OBSERVE AND REPORT:
- Dashboard shows: ____
- Filtered count: ____
- Match?

SEND TO CLAUDE FOR VERIFICATION
```

```
TEST PLAT-KPI-003: AR Outstanding

ACTION:
1. Note dashboard AR amount
2. Navigate to /accounting/invoices
3. Filter by unpaid (SENT, PARTIAL)
4. Sum open balances

OBSERVE AND REPORT:
- Dashboard shows: $____
- Manual sum: $____
- Match?

SEND TO CLAUDE FOR VERIFICATION
```

```
TEST PLAT-KPI-004: Low Stock count

ACTION:
1. Note dashboard "Low Stock" or similar
2. Navigate to /inventory
3. Filter by low stock (if filter exists) or manually count

OBSERVE AND REPORT:
- Dashboard shows: ____
- Actual count: ____
- Match?

SEND TO CLAUDE FOR VERIFICATION
```

```
TEST PLAT-KPI-005: KPI click drills down

ACTION:
1. Click on a KPI card (e.g., "Open Orders")
2. Observe navigation

OBSERVE AND REPORT:
- Does it navigate to relevant list?
- Is list pre-filtered appropriately?
- Screenshot

SEND TO CLAUDE FOR ANALYSIS
```

```
TEST PLAT-KPI-006: KPI updates after action

ACTION:
1. Note current "Open Orders" count
2. Create and confirm a new order
3. Return to dashboard
4. Check KPI (without manual refresh if possible)

OBSERVE AND REPORT:
- Count before: ____
- Count after: ____
- Did it increment?
- Required refresh?

SEND TO CLAUDE FOR ANALYSIS
```

### CATEGORY 2: Navigation

```
TEST PLAT-NAV-001: All main routes accessible

ACTION:
Navigate to each route and verify it loads:
1. /dashboard
2. /inventory
3. /clients
4. /orders
5. /quotes
6. /accounting
7. /accounting/invoices
8. /accounting/payments
9. /admin (if accessible)

OBSERVE AND REPORT:
For each route:
- URL: ____
- Loads successfully: Yes/No
- Any error message: ____

SEND TO CLAUDE FOR ANALYSIS
```

```
TEST PLAT-NAV-002: Sidebar navigation links work

ACTION:
1. Click each item in sidebar/nav
2. Verify correct page loads

OBSERVE AND REPORT:
- List all nav items and their destinations
- Any broken links?
- Screenshot of nav

SEND TO CLAUDE FOR ANALYSIS
```

```
TEST PLAT-NAV-003: Breadcrumbs

ACTION:
1. Navigate deep: Dashboard → Orders → Order #123 → Edit
2. Check breadcrumbs at each level
3. Click breadcrumb to navigate back

OBSERVE AND REPORT:
- Breadcrumbs visible?
- Show correct path?
- Clickable and functional?

SEND TO CLAUDE FOR ANALYSIS
```

```
TEST PLAT-NAV-004: Browser back button

ACTION:
1. Navigate: Dashboard → Orders → Order detail
2. Press browser back
3. Observe

OBSERVE AND REPORT:
- Goes to previous page?
- Any state issues?
- Works correctly?

SEND TO CLAUDE FOR ANALYSIS
```

```
TEST PLAT-NAV-005: Invalid route (404)

ACTION:
1. Navigate to /nonexistent-page
2. Observe

OBSERVE AND REPORT:
- 404 page displayed?
- Helpful message?
- Link back to home?
- Screenshot

SEND TO CLAUDE FOR ANALYSIS
```

```
TEST PLAT-NAV-006: Deep link works

ACTION:
1. Copy URL of a specific order (e.g., /orders/123)
2. Open new tab/window
3. Paste and go directly to URL

OBSERVE AND REPORT:
- Page loads correctly?
- No redirect issues?
- Requires re-login? (depends on session)

SEND TO CLAUDE FOR ANALYSIS
```

### CATEGORY 3: Global Search

```
TEST PLAT-SEARCH-001: Search finds clients

ACTION:
1. Use global search (or Cmd+K)
2. Type a known client name
3. Observe results

OBSERVE AND REPORT:
- Client found?
- Result shows name, type, TERI?
- Click navigates to client?

SEND TO CLAUDE FOR ANALYSIS
```

```
TEST PLAT-SEARCH-002: Search finds orders

ACTION:
1. Search for an order number (e.g., "ORD-12345")
2. Observe results

OBSERVE AND REPORT:
- Order found?
- Shows order number, client, status?
- Click navigates to order?

SEND TO CLAUDE FOR ANALYSIS
```

```
TEST PLAT-SEARCH-003: Search finds invoices

ACTION:
1. Search for invoice number
2. Observe results

OBSERVE AND REPORT:
- Invoice found?
- Shows relevant info?

SEND TO CLAUDE FOR ANALYSIS
```

```
TEST PLAT-SEARCH-004: Search finds batches/inventory

ACTION:
1. Search for a batch number or product name
2. Observe results

OBSERVE AND REPORT:
- Inventory items found?
- Shows SKU, quantity, etc.?

SEND TO CLAUDE FOR ANALYSIS
```

```
TEST PLAT-SEARCH-005: Empty search results

ACTION:
1. Search for "xyznonexistent123"
2. Observe

OBSERVE AND REPORT:
- Shows "No results" message?
- Message is helpful?
- Any error?

SEND TO CLAUDE FOR ANALYSIS
```

```
TEST PLAT-SEARCH-006: Search speed

ACTION:
1. Time the search from keystroke to results
2. Search for common term

OBSERVE AND REPORT:
- Time to results: ____ ms
- Feels responsive?

SEND TO CLAUDE FOR ANALYSIS
Expected: < 500ms
```

```
TEST PLAT-SEARCH-007: Special characters in search

ACTION:
1. Search for: test's "quotes" & ampersand
2. Observe

OBSERVE AND REPORT:
- Any errors?
- Results reasonable?
- No security warnings?

SEND TO CLAUDE FOR ANALYSIS
```

### CATEGORY 4: Command Palette (if exists)

```
TEST PLAT-CMD-001: Open with keyboard

ACTION:
1. Press Cmd+K (or Ctrl+K on Windows)
2. Observe

OBSERVE AND REPORT:
- Palette opens?
- Screenshot

SEND TO CLAUDE FOR ANALYSIS
```

```
TEST PLAT-CMD-002: Quick actions

ACTION:
1. Open command palette
2. Type "create order"
3. Select action

OBSERVE AND REPORT:
- Action appears in suggestions?
- Navigates to correct form?

SEND TO CLAUDE FOR ANALYSIS
```

```
TEST PLAT-CMD-003: Navigate via command

ACTION:
1. Command palette
2. Type "clients"
3. Select

OBSERVE AND REPORT:
- Navigation option appears?
- Takes you to clients page?

SEND TO CLAUDE FOR ANALYSIS
```

### CATEGORY 5: Loading & Error States

```
TEST PLAT-LOAD-001: Loading indicators

ACTION:
1. Navigate to a page that loads data
2. Observe loading state

OBSERVE AND REPORT:
- Loading spinner/skeleton shown?
- Graceful transition to content?
- No layout shift?

SEND TO CLAUDE FOR ANALYSIS
```

```
TEST PLAT-LOAD-002: Empty state

ACTION:
1. Find or create scenario with no data (e.g., new filter with no matches)
2. Observe empty state

OBSERVE AND REPORT:
- Helpful empty state message?
- Suggests action? (e.g., "Create your first order")
- Screenshot

SEND TO CLAUDE FOR ANALYSIS
```

```
TEST PLAT-ERROR-001: Error display

ACTION:
1. Trigger an error (e.g., submit invalid form)
2. Observe error handling

OBSERVE AND REPORT:
- Error displayed clearly?
- Message helpful?
- Can user recover?

SEND TO CLAUDE FOR ANALYSIS
```

```
TEST PLAT-ERROR-002: Network error handling

ACTION:
1. Open DevTools > Network
2. Set to Offline mode
3. Try to load a page or submit form
4. Observe

OBSERVE AND REPORT:
- Error shown?
- Clear "offline" message?
- Retry option?

SEND TO CLAUDE FOR ANALYSIS
```

### CATEGORY 6: Notifications & Toasts

```
TEST PLAT-TOAST-001: Success toast

ACTION:
1. Complete an action (save client, etc.)
2. Observe toast notification

OBSERVE AND REPORT:
- Toast appears?
- Green/success color?
- Auto-dismisses?
- Time visible: ____ seconds

SEND TO CLAUDE FOR ANALYSIS
```

```
TEST PLAT-TOAST-002: Error toast

ACTION:
1. Trigger an error
2. Observe toast

OBSERVE AND REPORT:
- Error toast appears?
- Red/error color?
- Persists until dismissed?
- Message helpful?

SEND TO CLAUDE FOR ANALYSIS
```

### CATEGORY 7: Responsive Design (Quick Check)

```
TEST PLAT-RESP-001: Mobile viewport

ACTION:
1. Open DevTools
2. Toggle device toolbar
3. Select iPhone or small viewport
4. Navigate key pages

OBSERVE AND REPORT:
- Layout adapts?
- Navigation becomes hamburger menu?
- Content readable?
- Touch targets adequate?
- Screenshot

SEND TO CLAUDE FOR ANALYSIS
```

```
TEST PLAT-RESP-002: Tablet viewport

ACTION:
1. Set viewport to iPad size
2. Navigate key pages

OBSERVE AND REPORT:
- Layout appropriate?
- Good use of space?

SEND TO CLAUDE FOR ANALYSIS
```

---

## FINAL REPORT FORMAT

```markdown
## AGENT PLATFORM — Final Report

### Summary
- Total Tests: [N]
- PASS: [N]
- FAIL: [N]
- BLOCKED: [N]

### KPI Verification
| KPI | Dashboard Value | Verified Value | Match |
|-----|-----------------|----------------|-------|
| Today's Revenue | $5,420 | $5,420 | ✅ |
| Open Orders | 12 | 12 | ✅ |
| AR Outstanding | $45,000 | $45,000 | ✅ |
| Low Stock | 3 | 3 | ✅ |

### Navigation
| Route | Status |
|-------|--------|
| /dashboard | ✅ |
| /inventory | ✅ |
| /clients | ✅ |
| /orders | ✅ |
| /accounting | ✅ |
| 404 handling | ✅ |

### Search
| Search Type | Works |
|-------------|-------|
| Clients | ✅ |
| Orders | ✅ |
| Invoices | ✅ |
| Empty state | ✅ |
| Speed < 500ms | ✅ |

### UX States
| State | Implemented |
|-------|-------------|
| Loading | ✅ |
| Empty | ✅ |
| Error | ✅ |
| Success toast | ✅ |
| Error toast | ✅ |

### Findings
| ID | Test | Severity | Description |
|----|------|----------|-------------|

AWAITING CLAUDE FINAL ANALYSIS
```
