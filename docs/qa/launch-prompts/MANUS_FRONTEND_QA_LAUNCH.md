# Manus Frontend QA Launch Prompt

**Copy this entire prompt to launch Manus's live browser QA session**

---

## Mission Briefing

You are the **Frontend QA Lead** for TERP using live browser testing. Your mission is to systematically test all user-facing pages, execute E2E user flows, and verify UI/UX quality on the production site.

## Environment

- **Production URL:** https://terp-app-b9s35.ondigitalocean.app
- **Browser:** Chrome (primary), Firefox/Safari (secondary)
- **DevTools:** Keep Console and Network tabs open at all times

## Test Credentials

Ask Evan for test credentials for these roles:
- Admin user (full access)
- Sales rep (limited access)
- Warehouse manager
- VIP customer

## Your Scope

| Category | Count | Priority |
|----------|-------|----------|
| Frontend Pages | 60 | Test all |
| E2E User Flows | 5 | Critical |
| Cross-Browser | 4 browsers | After main testing |

## Phase 1: Pre-Flight Checklist

Before testing, verify:

```
[ ] Production site accessible (no 503/maintenance)
[ ] Can login with test credentials
[ ] Test data exists (clients, products, orders visible)
[ ] DevTools open (Console for errors, Network for API calls)
[ ] Screenshot folder ready: ~/terp-qa-screenshots/
```

**If any check fails, STOP and report before proceeding.**

## Phase 2: Tier 1 Page Testing (Critical)

### 2.1 Login Page
**URL:** /login

| Test | Action | Expected | Status |
|------|--------|----------|--------|
| Load | Navigate | Login form visible | |
| Valid login | Enter credentials, submit | Redirect to dashboard | |
| Invalid login | Wrong password | Error message shown | |
| Empty submit | Click login with empty fields | Validation errors | |
| Keyboard | Tab through fields | Focus indicators visible | |

### 2.2 Dashboard
**URL:** /dashboard

| Test | Action | Expected | Status |
|------|--------|----------|--------|
| Load | Navigate | Dashboard loads < 3s | |
| Widgets | Check all widgets | Data displayed, no errors | |
| KPIs | Check numbers | Match expected values | |
| Refresh | Click refresh | Data updates | |
| Mobile | Resize to 375px | Responsive layout | |

### 2.3 Inventory Page
**URL:** /inventory

| Test | Action | Expected | Status |
|------|--------|----------|--------|
| Load | Navigate | Inventory list visible | |
| Filters | Apply strain filter | List filters correctly | |
| Search | Search by batch ID | Correct results | |
| Sorting | Sort by aging | Correct order | |
| Batch detail | Click a batch | Modal/drawer opens | |
| Aging colors | Check aging indicators | Colors match aging status | |
| Pagination | Navigate pages | Works correctly | |

### 2.4 Orders Page
**URL:** /orders

| Test | Action | Expected | Status |
|------|--------|----------|--------|
| Load | Navigate | Order list visible | |
| Filters | Filter by status | Correct filtering | |
| New order | Click "New Order" | Creator opens | |
| Order detail | Click an order | Details shown | |
| Status badge | Check status colors | Match status | |

### 2.5 Order Creator
**URL:** /orders/new

| Test | Action | Expected | Status |
|------|--------|----------|--------|
| Load | Navigate | Form visible | |
| Client select | Choose client | Client info loads | |
| Add line item | Select product/batch | Line added with pricing | |
| Quantity | Enter quantity | Price updates | |
| COGS display | Check COGS column | Shows cost per unit | |
| Margin | Check margin | Calculates correctly | |
| Submit | Submit order | Success, redirects | |
| Invalid submit | Empty required fields | Validation errors | |

### 2.6 Accounting Dashboard
**URL:** /accounting

| Test | Action | Expected | Status |
|------|--------|----------|--------|
| Load | Navigate | Dashboard loads | |
| AR aging | Check buckets | Current/30/60/90 shown | |
| AP aging | Check buckets | Current/30/60/90 shown | |
| Top debtors | Check list | Ranked correctly | |
| Drill down | Click a debtor | Details shown | |

### 2.7 Invoices Page
**URL:** /accounting/invoices

| Test | Action | Expected | Status |
|------|--------|----------|--------|
| Load | Navigate | Invoice list visible | |
| Filters | Filter by status | Correct filtering | |
| Create | Create new invoice | Success | |
| View | Click invoice | Details shown | |

### 2.8 Payments Page
**URL:** /accounting/payments

| Test | Action | Expected | Status |
|------|--------|----------|--------|
| Load | Navigate | Payment list visible | |
| Record payment | Click record | Form opens | |
| Apply to invoice | Select invoice | Applied correctly | |
| Submit | Submit payment | Success, AR updates | |

### 2.9 Clients List
**URL:** /clients

| Test | Action | Expected | Status |
|------|--------|----------|--------|
| Load | Navigate | Client list visible | |
| Search | Search by name | Correct results | |
| Filters | Filter by type | Buyers/sellers filter | |
| Client profile | Click client | Profile page opens | |

### 2.10 Client Profile
**URL:** /clients/:id

| Test | Action | Expected | Status |
|------|--------|----------|--------|
| Load | Navigate | Profile visible | |
| Tabs | Click all tabs | Content loads | |
| 360 view | Check summary | Data accurate | |
| Edit | Click edit | Form opens | |
| Save | Save changes | Success, data updates | |

## Phase 3: E2E User Flow Testing

### Flow 1: Complete Order Cycle (CRITICAL)

```
Step 1: Login as sales rep
Step 2: Navigate to Clients (/clients)
Step 3: Click a client with credit
Step 4: Note client's current AR balance
Step 5: Navigate to Orders (/orders)
Step 6: Click "New Order"
Step 7: Select the client from Step 3
Step 8: Add 2-3 line items from available inventory
Step 9: Verify COGS and margin calculations
Step 10: Submit the order
Step 11: Verify order appears in list with correct status
Step 12: Navigate to Pick/Pack (/pick-pack)
Step 13: Find the order
Step 14: Mark items as picked
Step 15: Mark as packed
Step 16: Mark as shipped
Step 17: Navigate to Inventory (/inventory)
Step 18: Verify quantities reduced
Step 19: Navigate to Invoices (/accounting/invoices)
Step 20: Create invoice from order
Step 21: Navigate to Payments (/accounting/payments)
Step 22: Record payment for invoice
Step 23: Navigate back to Client profile
Step 24: Verify AR balance updated

PASS CRITERIA: All 24 steps complete without errors
```

### Flow 2: VIP Customer Experience

```
Step 1: Login as VIP customer
Step 2: Land on VIP Dashboard
Step 3: Verify VIP tier badge displayed
Step 4: Browse catalog
Step 5: Add items to interest list
Step 6: View interest list
Step 7: Check points balance
Step 8: View order history
Step 9: Logout

PASS CRITERIA: All steps complete, VIP-specific features work
```

### Flow 3: Inventory Intake

```
Step 1: Login as warehouse manager
Step 2: Navigate to Purchase Orders
Step 3: Create new PO for a supplier
Step 4: Submit PO
Step 5: Navigate to Intake (/intake)
Step 6: Select the PO
Step 7: Record goods receipt
Step 8: Enter actual quantities
Step 9: Complete intake
Step 10: Navigate to Inventory
Step 11: Verify new batch created
Step 12: Check COGS calculated

PASS CRITERIA: All steps complete, batch created with correct COGS
```

### Flow 4: Calendar & Scheduling

```
Step 1: Login as sales rep
Step 2: Navigate to Calendar
Step 3: Create new event
Step 4: Set as recurring (weekly)
Step 5: Add participants
Step 6: Save event
Step 7: Verify recurrence shows
Step 8: Navigate to Scheduling
Step 9: View available slots
Step 10: Book appointment
Step 11: Check notification received

PASS CRITERIA: All steps complete, recurrence works, notifications sent
```

### Flow 5: Accounting Reconciliation

```
Step 1: Login as accountant
Step 2: View Accounting Dashboard
Step 3: Note AR aging totals
Step 4: Click into 90+ days bucket
Step 5: Select an overdue invoice
Step 6: Record partial payment
Step 7: Verify AR updated
Step 8: Navigate to Top Debtors
Step 9: Verify ranking updated
Step 10: Export report (if available)

PASS CRITERIA: All financial calculations accurate
```

## Phase 4: Cross-Browser Testing

After main testing complete, verify critical pages on:

| Browser | Pages to Test |
|---------|---------------|
| Chrome (done) | Already tested |
| Firefox | Login, Dashboard, Orders, Inventory |
| Safari | Login, Dashboard, Orders, Inventory |
| Edge | Login, Dashboard |

**Report any browser-specific issues.**

## Phase 5: Performance Checks

For each critical page, record:

| Page | Load Time | Largest API Call | Status |
|------|-----------|------------------|--------|
| Dashboard | Xs | GET /api/... (Xms) | OK/SLOW |
| Inventory | Xs | GET /api/... (Xms) | OK/SLOW |
| Orders | Xs | GET /api/... (Xms) | OK/SLOW |

**Target:** Page load < 3s, API calls < 1s

## Bug Reporting Format

For EVERY bug found, use this format:

```markdown
### QA-FE-XXX: [Bug Title]

**Type:** Bug / UI / UX / Performance
**Severity:** P0 / P1 / P2 / P3
**Page:** [URL]
**Browser:** Chrome 120

**Description:**
[Clear description of the issue]

**Steps to Reproduce:**
1. Navigate to [URL]
2. Click [element]
3. Observe [issue]

**Expected Behavior:**
[What should happen]

**Actual Behavior:**
[What actually happens]

**Screenshot:**
![Description](./screenshots/qa-fe-xxx.png)

**Console Errors:**
```
[Paste any console errors]
```

**Network Issues:**
[Note any failed API calls]

**Estimated Fix Effort:** Small / Medium / Large
```

## Screenshot Naming Convention

```
~/terp-qa-screenshots/
├── pages/
│   ├── dashboard-desktop.png
│   ├── dashboard-mobile.png
│   ├── inventory-filters.png
│   └── ...
├── bugs/
│   ├── qa-fe-001-broken-button.png
│   ├── qa-fe-002-alignment-issue.png
│   └── ...
└── flows/
    ├── order-flow-step-5.png
    ├── order-flow-step-10.png
    └── ...
```

## Communication with Claude

When you find backend-related issues, report to Claude:

```markdown
## Frontend → Backend Issue: [Title]

**Page:** [PageName]
**API Endpoint:** [endpoint from Network tab]

**Issue:**
[Description]

**API Request:**
```json
[Request payload from Network tab]
```

**API Response:**
```json
[Response from Network tab]
```

**Expected Response:**
[What the API should return]

**Claude Action Required:**
- [ ] Investigate router: [router_name]
- [ ] Check procedure: [procedure_name]
```

## Final Report Template

```markdown
# Frontend QA Summary Report

**Date:** YYYY-MM-DD
**Agent:** Manus
**Production URL:** https://terp-app-b9s35.ondigitalocean.app

## Overall Results

| Metric | Value |
|--------|-------|
| Pages Tested | X/60 |
| E2E Flows Passed | Y/5 |
| Total Bugs Found | Z |
| P0 Issues | A |
| P1 Issues | B |
| P2 Issues | C |
| P3 Issues | D |

## Page Coverage

| Tier | Pages | Tested | Pass Rate |
|------|-------|--------|-----------|
| 1 - Critical | 10 | 10 | 95% |
| 2 - High | 15 | 15 | 90% |
| 3 - Medium | 20 | 18 | 88% |
| 4 - Low | 15 | 10 | 92% |

## E2E Flow Results

| Flow | Status | Notes |
|------|--------|-------|
| Order Cycle | PASS/FAIL | [issues] |
| VIP Experience | PASS/FAIL | [issues] |
| Inventory Intake | PASS/FAIL | [issues] |
| Calendar | PASS/FAIL | [issues] |
| Accounting | PASS/FAIL | [issues] |

## Cross-Browser Results

| Browser | Issues |
|---------|--------|
| Chrome | Baseline |
| Firefox | X issues |
| Safari | Y issues |
| Edge | Z issues |

## Performance Summary

| Page | Load Time | Status |
|------|-----------|--------|
| Dashboard | 2.1s | OK |
| Inventory | 3.5s | SLOW |
| Orders | 1.8s | OK |

## Critical Bugs (P0/P1)

[List all critical bugs with screenshots]

## UI/UX Issues

[List all UI/UX issues]

## Backend Issues for Claude

[List issues that need backend investigation]

## Recommendations

1. [Priority fixes]
2. [UX improvements]
3. [Performance optimizations]

## Screenshots Attached

[List of all screenshots taken]
```

## Start Your Session

1. Open Chrome
2. Open DevTools (F12)
3. Navigate to https://terp-app-b9s35.ondigitalocean.app
4. Create screenshot folder
5. Begin with login page testing

Report your pre-flight checklist completion, then proceed to Tier 1 page testing.

---

**Remember:** Be skeptical. Assume things are broken. Your job is to find every issue, not to confirm things work.
