# Wave 3: Testing & Validation

**Agent Role**: QA Engineer  
**Duration**: 4-6 hours  
**Priority**: P0  
**Dependencies**: Waves 1-2 PRs merged  
**Deliverable**: Comprehensive test report with all findings

---

## Overview

All Wave 1 and Wave 2 PRs have been merged to main. This wave is about **testing everything on the live site** and **reporting back all issues found**. Do NOT create GitHub issues - instead, compile all findings into a structured report.

---

## Live Site

**URL**: https://terp-app-b9s35.ondigitalocean.app

---

## Part 1: Critical Bug Fix Verification (1.5 hours)

Test each bug that was supposedly fixed in Waves 1-2.

### BUG-040: Order Creator Inventory Loading

**Test Steps**:
1. Navigate to Orders → New Order
2. Select a customer from the dropdown
3. Wait for inventory to load

**Expected**: Inventory loads successfully, products appear in the list

**Record**:
- [ ] PASS / FAIL
- Screenshot if failed
- Error message if any
- Console errors if any

---

### BUG-041: Batch Detail View

**Test Steps**:
1. Navigate to Inventory/Batches
2. Click "View" on any batch
3. Drawer should open with batch details

**Expected**: Drawer opens without crash, shows batch info, locations, audit log

**Record**:
- [ ] PASS / FAIL
- Screenshot if failed
- Error message if any
- Console errors if any

---

### BUG-042: Global Search

**Test Steps**:
1. Click the search icon in the header
2. Type "OG Kush" (or another known product name)
3. Press Enter or click search

**Expected**: Search returns matching products by name, not just by SKU/code

**Record**:
- [ ] PASS / FAIL
- What results appeared (if any)
- What should have appeared
- Console errors if any

---

### BUG-043: Permission Service

**Test Steps**:
1. This is a backend fix - test by accessing Settings → Users tab
2. Also test any permission-restricted areas

**Expected**: No SQL errors, appropriate permission messages

**Record**:
- [ ] PASS / FAIL
- Error messages observed
- Console errors if any

---

### BUG-045: Retry Button

**Test Steps**:
1. Navigate to Order Creator
2. If inventory fails to load, click "Retry"
3. Observe if form data is preserved

**Expected**: Retry should reload inventory WITHOUT losing customer selection

**Record**:
- [ ] PASS / FAIL
- Did form reset?
- Console errors if any

---

### BUG-046: Settings Users Tab

**Test Steps**:
1. Navigate to Settings
2. Click on "Users" tab

**Expected**: Either shows users list OR shows clear permission error (not "Authentication required")

**Record**:
- [ ] PASS / FAIL
- Exact error message shown
- Is the message accurate/helpful?

---

### QA-049: Products Page

**Test Steps**:
1. Navigate to Products page
2. Check if products are displayed

**Expected**: Should show all products (previously showed "No results" despite 121 products)

**Record**:
- [ ] PASS / FAIL
- How many products shown
- Any filters applied by default?
- Console errors if any

---

### QA-050: Samples Page

**Test Steps**:
1. Navigate to Samples page
2. Check if samples are displayed

**Expected**: Should show all samples (previously showed "All 0")

**Record**:
- [ ] PASS / FAIL
- How many samples shown
- Console errors if any

---

## Part 2: Full Navigation Audit (1 hour)

Click through EVERY navigation link and record any issues.

### Sidebar Navigation Checklist

| Link | URL | Status | Notes |
|------|-----|--------|-------|
| Dashboard | / | | |
| Orders | /orders | | |
| Clients | /clients | | |
| Products | /products | | |
| Inventory/Batches | /inventory | | |
| Samples | /samples | | |
| Invoices | /invoices | | |
| Quotes | /quotes | | |
| Calendar | /calendar | | |
| Reports/Analytics | /analytics | | |
| AR/AP | /accounting | | |
| Credits | /credits | | |
| Purchase Orders | /purchase-orders | | |
| Vendors | /vendors | | |
| Returns | /returns | | |
| Locations | /locations | | |
| Todo Lists | /todo | | |
| Settings | /settings | | |

**For each link, record**:
- Does it load? (200 OK vs 404)
- Any console errors?
- Does it show data or empty state?
- Any obvious UI issues?

---

## Part 3: Core Workflow Testing (2 hours)

### Workflow 1: View Client → See Transactions

1. Go to Dashboard
2. Click on a client in the Sales Leaderboard
3. Verify client profile loads
4. Click Transactions tab
5. Verify transactions display

**Record all issues**:

---

### Workflow 2: Create Order (Full Flow)

1. Navigate to Orders → New Order
2. Select a customer
3. (If inventory loads) Add items to order
4. Set quantities and prices
5. Save as draft OR submit order

**Record all issues**:

---

### Workflow 3: View Invoice → Record Payment

1. Navigate to Invoices
2. Click on an invoice row
3. Verify invoice detail modal opens
4. Click "Record Payment" (if available)
5. Verify payment form works

**Record all issues**:

---

### Workflow 4: View Batch → Check Details

1. Navigate to Inventory/Batches
2. Click View on a batch
3. Check all tabs in the drawer
4. Verify photos, locations, audit log display

**Record all issues**:

---

### Workflow 5: Settings Configuration

1. Navigate to Settings
2. Test each tab:
   - General
   - Users (expect permission issue)
   - Locations
   - Categories
   - Grades
   - Feature Flags

**Record all issues**:

---

### Workflow 6: Search Functionality

1. Use global search for:
   - A product name
   - A client name
   - A batch code
   - An invoice number

**Record what works and what doesn't**:

---

### Workflow 7: Export Functionality

1. Go to Inventory/Batches
2. Click "Export CSV"
3. Verify file downloads
4. Open file and verify data

**Record all issues**:

---

## Part 4: UI/UX Issues (30 min)

Look for and document:

1. **Empty States**: Pages that show blank instead of helpful message
2. **Loading States**: Pages that don't show loading indicator
3. **Error Messages**: Unhelpful or confusing error messages
4. **Broken Layouts**: Misaligned elements, overflow issues
5. **Missing Data**: Fields that should have data but are empty
6. **Console Errors**: Any JavaScript errors in browser console

---

## Part 5: Compile Report

Create a comprehensive report with the following structure:

```markdown
# TERP Wave 3 Test Report

**Date**: [Date]
**Tester**: [Agent ID]
**Environment**: https://terp-app-b9s35.ondigitalocean.app

## Executive Summary

- Total Tests: X
- Passed: X
- Failed: X
- Pass Rate: X%

## Critical Issues (Blocking)

### Issue 1: [Title]
- **Location**: [URL/Page]
- **Steps to Reproduce**: 
- **Expected**: 
- **Actual**: 
- **Screenshot**: [if applicable]
- **Console Error**: [if applicable]

## High Priority Issues

### Issue 1: [Title]
...

## Medium Priority Issues

### Issue 1: [Title]
...

## Low Priority Issues (Polish)

### Issue 1: [Title]
...

## Passed Tests

- [x] BUG-040: Order Creator Inventory Loading
- [x] BUG-041: Batch Detail View
...

## Recommendations

1. [Recommendation 1]
2. [Recommendation 2]
...
```

---

## Deliverables

1. **Test Report**: Save to `/home/ubuntu/TERP/test-flows/WAVE_3_TEST_REPORT.md`
2. **Screenshots**: Save to `/home/ubuntu/TERP/test-flows/screenshots/` (if any failures)
3. **Summary**: Post summary in the task response

---

## DO NOT

- ❌ Create GitHub issues
- ❌ Make any code changes
- ❌ Merge anything
- ❌ Skip any test

---

## Success Criteria

- [ ] All critical bug fixes verified (PASS or documented FAIL)
- [ ] All navigation links tested
- [ ] All core workflows tested
- [ ] All issues documented with reproduction steps
- [ ] Report saved to repository
- [ ] Summary provided to user
