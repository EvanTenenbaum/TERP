# Holistic Regression Test: Two-Week Development Sprint

**Agent Role**: QA Lead / Full Stack Tester  
**Duration**: 6-8 hours  
**Priority**: P0 - Critical before any further development  
**Live Site**: https://terp-app-b9s35.ondigitalocean.app

---

## Mission

Perform a comprehensive holistic test of ALL work completed in the last two weeks. This is not a feature-by-feature test - it's a **system-wide validation** ensuring:

1. **Technical Correctness**: All fixes actually work, no regressions introduced
2. **Logical Integrity**: Business logic flows correctly end-to-end
3. **User Experience**: The app feels cohesive, responsive, and professional
4. **Data Integrity**: No data corruption, orphaned records, or inconsistent states
5. **Integration Health**: All components work together harmoniously

---

## Work Completed in Last Two Weeks

### Critical Bug Fixes (Wave 1A)

| ID      | Fix                             | Expected Impact                        |
| ------- | ------------------------------- | -------------------------------------- |
| BUG-040 | Order Creator inventory loading | Can create orders for any client       |
| BUG-041 | Batch Detail View crash         | Can view any batch without app crash   |
| BUG-042 | Global Search                   | Search finds products by name/strain   |
| BUG-043 | Permission Service SQL          | No crashes for users without roles     |
| BUG-045 | Retry button behavior           | Retry reloads data, doesn't reset form |
| BUG-046 | Settings Users tab              | Shows permission error, not auth error |

### Data Display Fixes (Wave 1B)

| ID     | Fix                 | Expected Impact         |
| ------ | ------------------- | ----------------------- |
| QA-049 | Products page empty | Shows all 121+ products |
| QA-050 | Samples page empty  | Shows all samples       |

### SQL Safety (Wave 4A)

| ID      | Fix                     | Expected Impact                  |
| ------- | ----------------------- | -------------------------------- |
| BUG-044 | VIP Portal empty arrays | No SQL errors with empty carts   |
| BUG-049 | Live Catalog SQL        | No injection vulnerabilities     |
| BUG-052 | Tag Management          | No crashes with empty tag arrays |
| BUG-053 | Credit Engine           | No crashes with empty sessions   |

### UX Improvements

| Feature               | Expected Impact                    |
| --------------------- | ---------------------------------- |
| Loading skeletons     | Smooth loading states on all pages |
| Mobile responsiveness | All dialogs/modals work on mobile  |
| Skeleton loaders      | Perceived performance improvement  |
| Empty states          | Helpful messaging when no data     |

### Infrastructure

| Feature             | Expected Impact             |
| ------------------- | --------------------------- |
| Sentry integration  | Errors tracked and reported |
| Database backups    | Automated backup system     |
| Health endpoint     | `/health` returns status    |
| Memory optimization | No OOM crashes on basic-xs  |

### Features

| Feature                   | Expected Impact              |
| ------------------------- | ---------------------------- |
| Spreadsheet View          | AG-Grid inventory management |
| Intake/Pick-Pack grids    | Warehouse operations         |
| Order draft auto-save     | No lost work on orders       |
| Unified Product Catalogue | CRUD for products            |
| Admin setup scripts       | Easy admin account creation  |
| Notification center       | User notifications work      |

### Navigation Fixes

| Page            | Expected Impact           |
| --------------- | ------------------------- |
| Todo Lists      | Loads without 404         |
| Accounting      | Full AR/AP dashboard      |
| Suppliers       | Supplier management works |
| Purchase Orders | PO workflow works         |
| Returns         | Returns processing works  |
| Locations       | Location management works |

---

## Part 1: Technical Verification (2 hours)

### 1.1 Critical Bug Fix Verification

**Test each fix on the LIVE site:**

```
BUG-040: Order Creator Inventory Loading
├── Navigate to /orders/create
├── Select customer: "Nolan Distribution"
├── VERIFY: Inventory loads (not "Failed to load inventory")
├── VERIFY: Can add products to order
├── VERIFY: Can complete order creation
└── RECORD: Pass/Fail + any errors

BUG-041: Batch Detail View
├── Navigate to /inventory
├── Click "View" on any batch
├── VERIFY: Drawer opens without crash
├── VERIFY: Batch details display correctly
├── VERIFY: Locations tab works
├── VERIFY: Audit log tab works
└── RECORD: Pass/Fail + any errors

BUG-042: Global Search
├── Click search icon in header
├── Search for "OG Kush" (known product)
├── VERIFY: Results appear (not "No results found")
├── Search for partial match "OG"
├── VERIFY: Multiple results appear
├── Click a result
├── VERIFY: Navigates to correct page
└── RECORD: Pass/Fail + any errors

BUG-043: Permission Service
├── (Requires test user without roles)
├── VERIFY: App doesn't crash
├── VERIFY: Appropriate permission errors shown
└── RECORD: Pass/Fail + any errors

BUG-045: Retry Button
├── Navigate to /orders/create
├── Select customer
├── If inventory fails, click "Retry"
├── VERIFY: Form data preserved
├── VERIFY: Only inventory reloads
└── RECORD: Pass/Fail + any errors

BUG-046: Settings Users Tab
├── Navigate to /settings
├── Click "Users" tab
├── VERIFY: Shows "Permission denied" or similar
├── VERIFY: Does NOT say "Authentication required"
└── RECORD: Pass/Fail + any errors
```

### 1.2 SQL Safety Verification

**These are harder to test directly - verify via behavior:**

```
SQL Safety Tests
├── VIP Portal (if accessible)
│   ├── Empty cart scenario
│   └── VERIFY: No errors, graceful empty state
├── Live Catalog
│   ├── Browse catalog with various filters
│   └── VERIFY: No SQL errors in console
├── Tag Management
│   ├── View items with no tags
│   └── VERIFY: No crashes
└── Credit Engine
    ├── View client with no credit sessions
    └── VERIFY: No crashes
```

### 1.3 Infrastructure Verification

```
Infrastructure Tests
├── Health Endpoint
│   ├── Visit /health or /api/health
│   └── VERIFY: Returns 200 with status
├── Error Tracking
│   ├── Check browser console for Sentry init
│   └── VERIFY: No Sentry errors on load
├── Performance
│   ├── Navigate through 10 pages quickly
│   └── VERIFY: No memory warnings, no crashes
└── RECORD: All findings
```

---

## Part 2: Logical Integrity Testing (2 hours)

### 2.1 Sales Workflow End-to-End

```
Complete Sales Flow
├── Step 1: Find Client
│   ├── Navigate to /clients
│   ├── Search for existing client
│   └── VERIFY: Client found and clickable
├── Step 2: View Client Profile
│   ├── Click client row
│   ├── VERIFY: Profile loads with all tabs
│   ├── Check Transactions tab
│   ├── Check Pricing tab
│   └── VERIFY: All data loads
├── Step 3: Create Order
│   ├── Click "New Order" or navigate to /orders/create
│   ├── Select the client
│   ├── VERIFY: Inventory loads
│   ├── Add 2-3 products
│   ├── VERIFY: Totals calculate correctly
│   ├── Save as draft
│   └── VERIFY: Draft saved successfully
├── Step 4: View Order
│   ├── Navigate to /orders
│   ├── Find the draft order
│   ├── VERIFY: Order appears in list
│   └── VERIFY: Can open and edit
├── Step 5: Invoice (if applicable)
│   ├── Navigate to /invoices
│   ├── VERIFY: Page loads
│   └── VERIFY: Can view invoice details
└── RECORD: Complete flow success/failure + issues
```

### 2.2 Inventory Workflow End-to-End

```
Complete Inventory Flow
├── Step 1: View Inventory
│   ├── Navigate to /inventory
│   ├── VERIFY: Batches load
│   ├── VERIFY: Filters work
│   └── VERIFY: Search works
├── Step 2: Batch Detail
│   ├── Click "View" on a batch
│   ├── VERIFY: All tabs load
│   ├── Check quantity display
│   └── VERIFY: Edit button works
├── Step 3: Products
│   ├── Navigate to /products
│   ├── VERIFY: Products load (121+)
│   ├── Click a product
│   └── VERIFY: Product detail works
├── Step 4: Spreadsheet View
│   ├── Navigate to /spreadsheet (or via sidebar)
│   ├── VERIFY: Grid loads with data
│   ├── Try sorting/filtering
│   └── VERIFY: Grid is interactive
└── RECORD: Complete flow success/failure + issues
```

### 2.3 Accounting Workflow

```
Accounting Flow
├── Step 1: AR/AP Dashboard
│   ├── Navigate to /accounting or /ar-ap
│   ├── VERIFY: Dashboard loads
│   ├── VERIFY: Aging analysis displays
│   └── VERIFY: Totals appear correct
├── Step 2: Invoices
│   ├── Navigate to /invoices
│   ├── VERIFY: Invoice list loads
│   ├── Click an invoice
│   ├── VERIFY: Detail modal opens
│   └── VERIFY: Payment recording available
├── Step 3: Credits
│   ├── Navigate to /credits
│   ├── VERIFY: Page loads
│   └── VERIFY: Credit rules display
└── RECORD: Complete flow success/failure + issues
```

### 2.4 Data Consistency Checks

```
Data Consistency
├── Client Totals
│   ├── View client with known transactions
│   ├── VERIFY: Balance matches transactions
│   └── VERIFY: No negative balances (unless expected)
├── Inventory Quantities
│   ├── View batch with known quantity
│   ├── VERIFY: Available = Total - Reserved
│   └── VERIFY: No negative quantities
├── Order Totals
│   ├── View order with multiple line items
│   ├── Calculate expected total manually
│   └── VERIFY: Displayed total matches
└── RECORD: Any discrepancies
```

---

## Part 3: User Experience Audit (1.5 hours)

### 3.1 Loading States

**Visit each page and verify loading experience:**

```
Loading State Audit
├── Dashboard
│   ├── Refresh page
│   ├── VERIFY: Skeleton loaders appear
│   └── VERIFY: Smooth transition to content
├── Clients List
│   ├── Refresh page
│   └── VERIFY: Loading state before data
├── Orders List
│   └── VERIFY: Loading state
├── Inventory
│   └── VERIFY: Loading state
├── Products
│   └── VERIFY: Loading state
├── Invoices
│   └── VERIFY: Loading state
├── Settings
│   └── VERIFY: Loading state
└── RECORD: Pages missing loading states
```

### 3.2 Empty States

**Test pages with no data (or filter to show none):**

```
Empty State Audit
├── Search with no results
│   ├── Search for "xyznonexistent123"
│   └── VERIFY: Helpful empty message (not blank)
├── Filtered lists with no matches
│   ├── Apply filter that returns 0 results
│   └── VERIFY: "No results" message
├── New user experience
│   └── VERIFY: Empty states guide user
└── RECORD: Pages with poor/missing empty states
```

### 3.3 Error States

**Intentionally trigger errors:**

```
Error State Audit
├── Network error simulation
│   ├── Open DevTools > Network > Offline
│   ├── Try to load data
│   └── VERIFY: Error message shown (not blank/crash)
├── Invalid navigation
│   ├── Visit /nonexistent-page
│   └── VERIFY: 404 page shown
├── Permission errors
│   ├── Try restricted action
│   └── VERIFY: Clear error message
└── RECORD: Poor error handling locations
```

### 3.4 Mobile Responsiveness

**Test on mobile viewport (DevTools > Toggle Device):**

```
Mobile Audit
├── Navigation
│   ├── VERIFY: Sidebar collapses/hamburger menu
│   └── VERIFY: Can access all pages
├── Dialogs/Modals
│   ├── Open any modal
│   ├── VERIFY: Full width on mobile
│   ├── VERIFY: Can scroll content
│   └── VERIFY: Can close modal
├── Forms
│   ├── Open order creator
│   ├── VERIFY: Form fields usable
│   └── VERIFY: Dropdowns work
├── Tables
│   ├── View any data table
│   ├── VERIFY: Horizontal scroll works
│   └── VERIFY: Data readable
└── RECORD: Mobile issues found
```

### 3.5 Navigation Completeness

**Click every sidebar link:**

```
Navigation Audit
├── Dashboard → VERIFY: Loads
├── Clients → VERIFY: Loads
├── Orders → VERIFY: Loads
├── Inventory → VERIFY: Loads
├── Products → VERIFY: Loads
├── Samples → VERIFY: Loads
├── Invoices → VERIFY: Loads
├── Accounting/AR-AP → VERIFY: Loads
├── Purchase Orders → VERIFY: Loads
├── Suppliers → VERIFY: Loads
├── Returns → VERIFY: Loads
├── Calendar → VERIFY: Loads
├── Todo → VERIFY: Loads
├── Reports/Analytics → VERIFY: Loads
├── Settings → VERIFY: Loads
├── Spreadsheet View → VERIFY: Loads
└── RECORD: Any 404s or errors
```

---

## Part 4: Regression Detection (1 hour)

### 4.1 Feature Interaction Testing

**Test that new features don't break existing ones:**

```
Interaction Tests
├── Search + Navigation
│   ├── Search for item
│   ├── Click result
│   ├── Use back button
│   └── VERIFY: Search state preserved
├── Filters + Pagination
│   ├── Apply filter on list
│   ├── Go to page 2
│   └── VERIFY: Filter still applied
├── Modal + Form
│   ├── Open edit modal
│   ├── Make changes
│   ├── Close without saving
│   └── VERIFY: Confirmation prompt (if expected)
├── Draft + Navigation
│   ├── Start creating order
│   ├── Navigate away
│   ├── Come back
│   └── VERIFY: Draft preserved (auto-save)
└── RECORD: Any broken interactions
```

### 4.2 Console Error Scan

**Monitor browser console throughout testing:**

```
Console Monitoring
├── Open DevTools Console
├── Clear console
├── Navigate through ALL pages
├── RECORD: Any errors (not warnings)
│   ├── React errors
│   ├── Network errors
│   ├── TypeScript/JS errors
│   └── Unhandled promise rejections
└── Categorize by severity
```

### 4.3 Network Request Audit

**Monitor network tab for issues:**

```
Network Audit
├── Open DevTools Network
├── Navigate through app
├── RECORD:
│   ├── Failed requests (4xx, 5xx)
│   ├── Slow requests (>3s)
│   ├── Duplicate requests
│   └── Missing requests (expected but not made)
```

---

## Part 5: Integration Health (30 min)

### 5.1 API Response Validation

**Spot-check API responses:**

```
API Validation
├── Open Network tab
├── Filter by "trpc" or "api"
├── Check response shapes:
│   ├── clients.getAll → Array of clients
│   ├── inventory.getAll → Array of batches
│   ├── orders.getAll → Array of orders
│   └── VERIFY: No null where array expected
└── RECORD: Malformed responses
```

### 5.2 State Management

**Verify app state stays consistent:**

```
State Tests
├── Login state
│   ├── Refresh page
│   └── VERIFY: Still logged in
├── Theme state
│   ├── Toggle dark mode
│   ├── Refresh
│   └── VERIFY: Theme preserved
├── Filter state
│   ├── Set filters
│   ├── Navigate away and back
│   └── VERIFY: Filters preserved (or reset appropriately)
└── RECORD: State issues
```

---

## Deliverable: Holistic Test Report

Create `/home/ubuntu/TERP/test-flows/HOLISTIC_REGRESSION_REPORT.md`:

```markdown
# Holistic Regression Test Report

**Date**: [DATE]
**Tester**: [AGENT]
**Duration**: [X hours]
**Live Site**: https://terp-app-b9s35.ondigitalocean.app

## Executive Summary

- Overall Health: [GOOD/FAIR/POOR]
- Critical Issues: [COUNT]
- Regressions Found: [COUNT]
- UX Issues: [COUNT]

## Part 1: Technical Verification

### Bug Fix Status

| Bug ID  | Status | Notes |
| ------- | ------ | ----- |
| BUG-040 | ✅/❌  |       |
| BUG-041 | ✅/❌  |       |
| ...     |        |       |

### SQL Safety

[Findings]

### Infrastructure

[Findings]

## Part 2: Logical Integrity

### Sales Workflow

- Status: [PASS/FAIL]
- Issues: [List]

### Inventory Workflow

- Status: [PASS/FAIL]
- Issues: [List]

### Accounting Workflow

- Status: [PASS/FAIL]
- Issues: [List]

### Data Consistency

[Findings]

## Part 3: User Experience

### Loading States

- Coverage: [X/Y pages]
- Missing: [List]

### Empty States

- Coverage: [X/Y scenarios]
- Missing: [List]

### Error States

- Quality: [GOOD/FAIR/POOR]
- Issues: [List]

### Mobile Responsiveness

- Status: [PASS/FAIL]
- Issues: [List]

### Navigation

- Working: [X/Y links]
- Broken: [List]

## Part 4: Regressions

### Feature Interactions

[Findings]

### Console Errors

[List with severity]

### Network Issues

[List]

## Part 5: Integration Health

### API Responses

[Findings]

### State Management

[Findings]

## Issue Summary

### P0 - Critical (Blocks Usage)

1. [Issue]

### P1 - High (Degrades Experience)

1. [Issue]

### P2 - Medium (Should Fix)

1. [Issue]

### P3 - Low (Nice to Have)

1. [Issue]

## Recommendations

1. [Recommendation]
2. [Recommendation]

## Conclusion

[Overall assessment and next steps]
```

---

## Git Workflow

```bash
# Create branch for test report
git checkout -b qa/holistic-regression-test

# Add report
git add test-flows/HOLISTIC_REGRESSION_REPORT.md
git commit -m "qa: Add holistic regression test report for two-week sprint

Tests completed:
- Technical verification of all bug fixes
- End-to-end workflow testing (Sales, Inventory, Accounting)
- UX audit (loading, empty, error states, mobile)
- Regression detection
- Integration health check

Findings: [SUMMARY]"

git push origin qa/holistic-regression-test
```

---

## Success Criteria

- [ ] All P0 bug fixes verified working
- [ ] All navigation links work (no 404s)
- [ ] Core workflows complete end-to-end
- [ ] No new console errors introduced
- [ ] Mobile experience functional
- [ ] Loading states present on key pages
- [ ] No data inconsistencies found
- [ ] Report delivered with prioritized issues

---

## Time Allocation

| Part           | Duration    | Focus                          |
| -------------- | ----------- | ------------------------------ |
| 1. Technical   | 2 hours     | Bug fixes, SQL safety, infra   |
| 2. Logical     | 2 hours     | End-to-end workflows           |
| 3. UX          | 1.5 hours   | Loading, empty, error, mobile  |
| 4. Regression  | 1 hour      | Interactions, console, network |
| 5. Integration | 30 min      | API, state                     |
| **Total**      | **7 hours** |                                |

---

## Notes for Agent

1. **Be thorough but efficient** - Don't spend 30 min on one test
2. **Document everything** - Screenshots for critical issues
3. **Prioritize correctly** - P0 = blocks users, P3 = minor polish
4. **Test like a user** - Not just happy path, try edge cases
5. **Check the console** - Many issues only visible there
6. **Mobile matters** - Test at least key flows on mobile
7. **Report is the deliverable** - Comprehensive, organized, actionable
