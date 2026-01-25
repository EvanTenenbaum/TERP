# TERP Full QA Strategy: Claude + Manus Collaboration

**Version:** 1.0
**Created:** 2026-01-25
**Authors:** Claude (Backend QA) + Manus (Frontend QA)
**Target Environment:** Production - https://terp-app-b9s35.ondigitalocean.app

---

## Executive Summary

This document outlines a comprehensive QA strategy for TERP that leverages two AI agents:

| Agent | Role | Focus Area |
|-------|------|------------|
| **Claude** | Backend QA Lead | API testing, database validation, business logic, security audit |
| **Manus** | Frontend QA Lead | Live browser testing, UI/UX verification, E2E user flows |

**Total Estimated QA Time:** 40-60 hours across both agents
**Target Coverage:** All 121 tRPC routers, 72 frontend pages, critical business flows

> **Version 1.1 Update:** Corrected page count, business logic formulas, status flows, and added missing user flows based on thorough codebase verification.

---

## Part 1: Risk-Based Module Prioritization

### Tier 1: CRITICAL (Must Test First) - RED Mode

| Module | Why Critical | Backend Tests | Frontend Tests |
|--------|--------------|---------------|----------------|
| **Inventory & Valuation** | Direct financial impact | Batch COGS, aging calculations, reserves | Inventory page, batch details, aging display |
| **Orders & Fulfillment** | Revenue impact | Order creation, line items, allocations, COGS | Order creation flow, order list, pick/pack |
| **Accounting & AR/AP** | Compliance, audit trail | Invoice creation, payments, aging buckets | Accounting dashboard, invoice UI, payment recording |
| **Authentication & RBAC** | Security | All permission checks, session management | Login flow, permission-gated UI elements |

### Tier 2: HIGH (Test Second) - STRICT Mode

| Module | Why Important | Backend Tests | Frontend Tests |
|--------|---------------|---------------|----------------|
| **Pricing & Margins** | Revenue accuracy | Price calculations, COGS overrides, margin logic | Pricing rules page, price display in orders |
| **Client Management** | Core business entity | Client CRUD, ledger, 360 view | Client list, profile page, ledger UI |
| **VIP Portal** | Customer-facing | VIP auth, session isolation, impersonation | VIP login, dashboard, live shopping |
| **Calendar & Scheduling** | Appointment management | Recurrence, reminders, participants | Calendar page, event creation, scheduling |

### Tier 3: MEDIUM (Test Third) - SAFE Mode

| Module | Backend Tests | Frontend Tests |
|--------|---------------|----------------|
| **Products & Catalog** | CRUD, categories, grades | Products page, catalog UI |
| **Purchase Orders** | PO workflow, receiving | PO page, receiving UI |
| **Notifications** | Delivery, preferences | Notification bell, preferences |
| **Dashboard** | KPI calculations, widgets | Dashboard, widget rendering |
| **Gamification** | Points, achievements, leaderboard | Leaderboard page |

### Tier 4: LOW (Test Last) - SAFE Mode

| Module | Backend Tests | Frontend Tests |
|--------|---------------|----------------|
| **Tags System** | Tag CRUD, automation | Tag management UI |
| **Todos** | List/task CRUD | Todo page |
| **Feature Flags** | Flag evaluation | Feature flag admin |
| **Settings** | Config persistence | Settings pages |

---

## Part 2: Claude's Backend QA Scope

### 2.1 API/tRPC Router Testing

Claude will systematically test all 121 tRPC routers using the following protocol:

#### Testing Categories

```
For each router, test:
1. Happy Path - Normal operation with valid inputs
2. Edge Cases - Boundary conditions, empty data, max values
3. Error Handling - Invalid inputs, missing required fields
4. Authorization - Permission checks, role enforcement
5. Data Integrity - Soft deletes, cascades, foreign keys
6. Business Logic - Calculations, state transitions
```

#### Priority Router Groups

**Group A: Financial/Critical (18 routers)**
```
accounting.ts          - 78 procedures (AR/AP, aging, debtors)
orders.ts              - 45 procedures (order CRUD, fulfillment)
inventory.ts           - 30 procedures (batches, movements, aging)
invoices.ts            - Invoice CRUD, status tracking
payments.ts            - Payment recording, reconciliation
pricing.ts             - 26 procedures (price rules, calculations)
cogs.ts                - 12 procedures (COGS calculations)
credits.ts             - 14 procedures (credit lines)
badDebt.ts             - Bad debt write-offs
cryptoPayments.ts      - Crypto transaction tracking
installmentPayments.ts - Installment plans
transactionFees.ts     - Per-client fees
invoiceDisputes.ts     - Dispute management
paymentTerms.ts        - Payment term config
```

**Group B: Core Business (15 routers)**
```
clients.ts             - 29 procedures (client CRUD)
clientLedger.ts        - Transaction history
client360.ts           - Aggregated client data
purchaseOrders.ts      - PO management
poReceiving.ts         - Goods receipt
returns.ts             - Return processing
quotes.ts              - Sales quotes
salesSheets.ts         - Sales sheet creation
productCatalogue.ts    - Product catalog
intakeReceipts.ts      - Intake verification
```

**Group C: VIP & Live Shopping (6 routers)**
```
vipPortal.ts           - 75 procedures
vipPortalAdmin.ts      - 34 procedures
vipTiers.ts            - 18 procedures
liveShopping.ts        - 45 procedures
vipPortalLiveShopping.ts - 32 procedures
```

**Group D: Calendar & Scheduling (10 routers)**
```
calendar.ts            - Event CRUD
calendarRecurrence.ts  - Recurring events
calendarReminders.ts   - Reminders
calendarParticipants.ts - Attendees
calendarMeetings.ts    - Meetings
calendarFinancials.ts  - Meeting financials
calendarInvitations.ts - Invitations
calendarsManagement.ts - Calendar management
scheduling.ts          - 30 procedures
appointmentRequests.ts - Approval workflow
```

**Group E: Auth & Security (8 routers)**
```
auth.ts                - Authentication
users.ts               - User management
rbac-users.ts          - User roles
rbac-roles.ts          - Role definitions
rbac-permissions.ts    - Permissions
rbacEnhanced.ts        - Advanced RBAC
featureFlags.ts        - 22 procedures
audit.ts               - Audit trail
```

### 2.2 Database Validation Tests

Claude will validate data integrity across all 233 tables:

#### Referential Integrity Checks
```sql
-- Check for orphaned records
-- Verify soft delete cascading
-- Validate foreign key relationships
-- Check index usage for query performance
```

#### Critical Table Audits

| Table | Validation Focus |
|-------|------------------|
| `orders` | Line item totals match header, COGS consistency |
| `order_line_items` | Allocation quantities match, margin calculations |
| `inventory_movements` | Running balance accuracy, movement history |
| `batches` | Reserved + available = total, aging dates |
| `invoices` | Line totals, payment status, AR balance |
| `payments` | Payment application, remaining balance |
| `clients` | isSeller/isBuyer flags, totalOwed accuracy |
| `audit_logs` | Complete trail for sensitive operations |

### 2.3 Business Logic Verification

#### Financial Calculations (VERIFIED FROM CODE)
```typescript
// COGS per Unit (marginCalculationService.ts)
Test: cogsPerUnit = batchCost / batchQuantity
Verify: All order line items use correct COGS

// Margin Calculations (marginCalculationService.ts:105-123)
// Uses safe decimal arithmetic to avoid floating point errors
Test: marginPercent = ((pricePerUnit - cogsPerUnit) / pricePerUnit) * 100
Test: marginDollar = pricePerUnit - cogsPerUnit
Test: priceFromMarginPercent = cogsPerUnit / (1 - marginPercent/100)
Test: priceFromMarginDollar = cogsPerUnit + marginDollar

// AR Aging Buckets (arApDb.ts:254-300)
// Based on DAYS PAST DUE DATE (not invoice date)
Test: current = invoices where dueDate > today (not yet due)
Test: days1to30 = invoices 0-30 days PAST DUE
Test: days31to60 = invoices 31-60 days past due
Test: days61to90 = invoices 61-90 days past due
Test: days90Plus = invoices 90+ days past due
Verify: Sum of buckets = total AR

// Inventory Aging (inventory.ts:43-68)
// Based on RECEIVED DATE, NOT intake date
Test: FRESH = batches received ≤7 days ago
Test: MODERATE = batches received 8-14 days ago
Test: AGING = batches received 15-30 days ago
Test: CRITICAL = batches received >30 days ago

// Stock Level Status (inventory.ts:30-41)
Test: available = onHand - reserved
Test: OUT_OF_STOCK = available ≤ 0
Test: CRITICAL = available ≤ criticalThreshold (default 10)
Test: LOW = available ≤ lowThreshold (default 50)
Test: OPTIMAL = available > lowThreshold
```

#### State Machines (VERIFIED FROM CODE - v1.2 CORRECTED)

```
Order Fulfillment Status (orderStateMachine.ts:22-33)
══════════════════════════════════════════════════════════════
                    CANCELLED ←─────────────┐
                        ↑                   │
DRAFT → CONFIRMED → PENDING → PACKED ⇄ PENDING (can unpack)
    ↓        ↓          ↓         │
CANCELLED CANCELLED CANCELLED     ↓
                              SHIPPED ──→ DELIVERED
                                  │           │
                                  ↓           ↓
                              RETURNED ←──────┘
                             ↙        ↘
                      RESTOCKED    RETURNED_TO_VENDOR
                      (terminal)        (terminal)

IMPORTANT: Once PACKED, can only go to SHIPPED or back to PENDING
IMPORTANT: Once SHIPPED, cannot be CANCELLED (only DELIVERED or RETURNED)
IMPORTANT: Once DELIVERED, cannot be CANCELLED (only RETURNED)

Quote Status (orders table)
══════════════════════════════════════════════════════════════
DRAFT → SENT → VIEWED → ACCEPTED → CONVERTED
  ↓              ↓         ↓
         REJECTED    EXPIRED

Sale/Payment Status (orders table)
══════════════════════════════════════════════════════════════
PENDING → PARTIAL → PAID
    ↓        ↓
 OVERDUE  OVERDUE → CANCELLED

Invoice Status (invoices table)
══════════════════════════════════════════════════════════════
DRAFT → SENT → VIEWED → PARTIAL → PAID
                           ↓        ↓
                        OVERDUE   VOID

Bill Status (bills table)
══════════════════════════════════════════════════════════════
DRAFT → PENDING → APPROVED → PARTIAL → PAID
           ↓                     ↓
         VOID                 OVERDUE

PO Status (validators.ts:151-170)
══════════════════════════════════════════════════════════════
DRAFT → SENT → CONFIRMED → RECEIVING → RECEIVED
  ↓       ↓        ↓           ↓
CANCELLED CANCELLED CANCELLED CANCELLED

Credit Status (schema.ts:3156-3159)
══════════════════════════════════════════════════════════════
ACTIVE → PARTIALLY_USED → FULLY_USED
   ↓
EXPIRED / CANCELLED

Return Status (returns.ts:67-74) - ADDED v1.2
══════════════════════════════════════════════════════════════
PENDING → APPROVED → RECEIVED → PROCESSED
    ↓         ↓
CANCELLED  REJECTED → CANCELLED

NOTE: Status enum exists but transitions are NOT enforced in code.
QA should verify if approval is actually required before receiving.

Sample Status (samples.ts:41) - ADDED v1.2
══════════════════════════════════════════════════════════════
PENDING → FULFILLED → RETURN_REQUESTED → RETURNED
    ↓
CANCELLED

Sample Locations: WAREHOUSE | WITH_CLIENT | WITH_SALES_REP | RETURNED | LOST

Vendor Return Status (schema.ts:2761-2764)
══════════════════════════════════════════════════════════════
PENDING_VENDOR_CREDIT → CREDIT_RECEIVED
         ↓
     DISPUTED → CANCELLED
```

### 2.4 Security Audit Checklist

```
[ ] No fallback user IDs (ctx.user?.id || 1 is FORBIDDEN)
[ ] All mutations use getAuthenticatedUserId(ctx)
[ ] Permission checks on all protected procedures
[ ] VIP portal session isolation verified
[ ] Admin impersonation creates audit trail
[ ] No hard deletes (soft delete only)
[ ] Sensitive data not exposed in error messages
[ ] Rate limiting on auth endpoints
```

### 2.5 Claude's Test Execution Commands

```bash
# Run all backend tests
pnpm test

# Run specific router tests
pnpm test server/routers/orders.test.ts
pnpm test server/routers/inventory.test.ts
pnpm test server/routers/accounting.test.ts

# TypeScript validation
pnpm check

# Lint check
pnpm lint

# Build verification
pnpm build

# Database schema validation
pnpm db:check
```

### 2.6 Claude's Output Format

For each router tested, Claude produces:

```markdown
## Router: [router_name].ts

**Procedures Tested:** X/Y
**Pass Rate:** XX%

### Passing Tests
- procedure1 - Happy path, edge cases, auth
- procedure2 - Happy path, validation

### Failing Tests
| Procedure | Test Case | Error | Severity |
|-----------|-----------|-------|----------|
| procedure3 | Invalid input | Expected error not thrown | P2 |

### Security Findings
- [x] Auth required on all procedures
- [x] Permission checks present
- [ ] ISSUE: procedure4 missing permission check

### Recommendations
1. Add validation for X
2. Fix edge case in Y
```

---

## Part 3: Manus Frontend QA Scope

### 3.1 Page-by-Page Testing

Manus will test all 72 frontend pages with live browser interactions.

#### Testing Protocol Per Page

```
1. Smoke Test
   - Page loads without 404
   - No console errors
   - Main components visible
   - No placeholder text

2. Functional Test
   - All buttons clickable
   - All forms submittable
   - Filters/sorting work
   - CRUD operations succeed
   - Data persists after actions

3. UI/UX Test
   - Consistent with design system
   - No visual glitches
   - Responsive (mobile/tablet/desktop)
   - Keyboard navigation works
   - Focus indicators visible

4. Data Test
   - Tables display correct data
   - Calculations shown correctly
   - "No data" states handled
   - Pagination works

5. Performance Test
   - Page load < 3 seconds
   - No slow API calls (> 1s)
   - Smooth scrolling
   - No memory leaks
```

### 3.2 Priority Pages for Manus

**Critical Pages (Test First)**

| Page | Key Tests |
|------|-----------|
| `Login.tsx` | Auth flow, error states, redirect |
| `DashboardV3.tsx` | Widget loading, KPI accuracy, refresh |
| `Inventory.tsx` | List view, filters, batch details, aging colors |
| `Orders.tsx` | Order list, creation, status changes |
| `OrderCreatorPage.tsx` | Full order creation flow, line items, pricing |
| `AccountingDashboard.tsx` | AR/AP display, aging buckets, top debtors |
| `Invoices.tsx` | Invoice list, creation, status |
| `Payments.tsx` | Payment recording, application |
| `ClientsListPage.tsx` | Client list, search, filtering |
| `ClientProfilePage.tsx` | 360 view, tabs, related data |

**VIP Portal Pages**

| Page | Key Tests |
|------|-----------|
| `VIPLogin.tsx` | VIP authentication flow |
| `VIPDashboard.tsx` | VIP-specific data, session |
| `LiveShoppingPage.tsx` | Live session, cart, pricing |
| `ImpersonatePage.tsx` | Admin impersonation flow |

**High Priority Pages**

| Page | Key Tests |
|------|-----------|
| `CalendarPage.tsx` | Event display, creation, recurrence |
| `SchedulingPage.tsx` | Appointment booking, approval |
| `PurchaseOrdersPage.tsx` | PO list, creation, receiving |
| `VendorsPage.tsx` | Vendor list, profiles |
| `ProductsPage.tsx` | Product catalog, categories |
| `PricingRulesPage.tsx` | Pricing rule configuration |
| `PickPackPage.tsx` | Pick/pack workflow |
| `IntakeReceipts.tsx` | Goods receipt verification |

### 3.3 E2E User Flow Testing

Manus will execute complete user journeys:

#### Flow 1: Complete Order Cycle (CRITICAL)
```
1. Login as sales rep
2. Navigate to Clients
3. Select a client
4. View client 360
5. Navigate to Orders
6. Create new order
7. Add line items from inventory
8. Apply pricing
9. Review margins
10. Submit order
11. Navigate to Pick/Pack
12. Pick items
13. Pack order
14. Mark as shipped
15. Verify inventory reduced
16. Generate invoice
17. Record payment
18. Verify AR updated
```

#### Flow 2: Inventory Intake Cycle
```
1. Login as warehouse manager
2. Navigate to Purchase Orders
3. Create new PO
4. Submit for approval
5. Navigate to Intake
6. Receive goods against PO
7. Verify batch created
8. Check inventory updated
9. Verify COGS calculated
```

#### Flow 3: VIP Customer Experience (CORRECTED v1.2)
```
1. Navigate to /vip-portal/login (NOT /login - separate auth)
2. Login with VIP credentials
3. Verify VIP session token is different from regular auth
4. View VIP dashboard (/vip-portal/dashboard)
5. Browse catalog
6. Add items to interest list
7. Join live shopping session
8. Add items to cart
9. Complete purchase
10. Check points earned (gamification)
11. View order history
12. Logout and verify session destroyed
```

#### Flow 4: Accounting Reconciliation
```
1. Login as accountant
2. View AR aging dashboard
3. Drill into overdue invoices
4. Record customer payment
5. Apply payment to invoices
6. Verify AR balance reduced
7. View top debtors list
8. Generate reports
```

#### Flow 5: Calendar & Scheduling
```
1. Login as sales rep
2. Navigate to Calendar (/calendar)
3. Create new event
4. Set recurrence (daily/weekly/monthly)
5. Add participants
6. Send invitations
7. Check notifications received
8. Navigate to Scheduling (/scheduling)
9. View available slots
10. Book appointment
```

#### Flow 6: Sample Request Cycle (CORRECTED v1.2)
```
1. Login as sales rep
2. Navigate to Samples (/samples)
3. Create sample request for a client
4. Select product(s) and quantities
5. Submit request (status = PENDING)
6. Verify sample request appears in list
7. Login as warehouse manager
8. View pending sample requests
9. Fulfill sample request (status → FULFILLED)
10. Verify sample location = "WITH_CLIENT" or "WITH_SALES_REP"
11. Verify inventory reserved/deducted
12. [LATER] Client requests sample return (status → RETURN_REQUESTED)
13. Process return (status → RETURNED)
14. Update sample location = "RETURNED" or "LOST"
15. Verify inventory restored (if not lost/damaged)
```

#### Flow 7: Return Processing (CORRECTED v1.2)
```
1. Login as sales rep
2. Navigate to Returns (/returns)
3. Create return for existing order
4. Select items to return (with batch IDs)
5. Specify return reason (DEFECTIVE/WRONG_ITEM/NOT_AS_DESCRIBED/CUSTOMER_CHANGED_MIND/OTHER)
6. Submit return (status = PENDING)
7. Login as manager/approver
8. Review pending return
9a. APPROVE return (status → APPROVED) → Continue to step 10
9b. REJECT return (status → REJECTED) → Verify client notified, END
10. Login as warehouse manager
11. Receive returned items (status → RECEIVED)
12. Inspect condition (SELLABLE/DAMAGED/DESTROYED/QUARANTINE)
13. Process return (status → PROCESSED):
    - If SELLABLE: Add back to inventory (RESTOCKED)
    - If DAMAGED/QUARANTINE: Hold for disposition
    - If vendor issue: Create vendor return (RETURNED_TO_VENDOR)
14. Verify inventory updated (if SELLABLE)
15. Verify client credit issued (if applicable)
```

#### Flow 7b: Return Rejection Path (ADDED v1.2)
```
1. Continue from Flow 7, step 9b
2. Verify return status = REJECTED
3. Verify rejection reason recorded
4. Verify no inventory changes
5. Verify no credit issued
6. Verify client notified of rejection
```

#### Flow 8: Credit Management (ADDED)
```
1. Login as accountant
2. Navigate to Credits (/credits)
3. Issue credit to client
4. Specify credit reason and amount
5. Save credit (status = ACTIVE)
6. Navigate to client profile
7. Verify credit balance shown
8. Create order for same client
9. Apply credit to order
10. Verify credit status = PARTIALLY_USED or FULLY_USED
```

#### Flow 9: Quote-to-Order Conversion (ADDED)
```
1. Login as sales rep
2. Navigate to Quotes (/quotes)
3. Create new quote
4. Add line items
5. Set valid until date
6. Submit quote (status = DRAFT → SENT)
7. Mark as VIEWED then ACCEPTED
8. Convert quote to order
9. Verify quote status = CONVERTED
10. Verify order created with same line items
```

#### Flow 10: Employee Time Tracking (ADDED)
```
1. Login as employee
2. Navigate to Time Clock (/time-clock)
3. Clock in
4. Verify timestamp recorded
5. (Later) Clock out
6. Verify hours calculated
7. Login as manager
8. Review timesheet entries
9. Approve timesheet
10. Verify payroll data accurate
```

### 3.4 Edge Case & Error Scenario Tests (ADDED v1.2)

**These tests verify system behavior in abnormal conditions:**

#### Inventory Edge Cases
| Scenario | Expected Behavior | Test Steps |
|----------|-------------------|------------|
| Order exceeds available inventory | Error shown, order not created | Try to order qty > available |
| Concurrent orders for same batch | One succeeds, one fails gracefully | Two users order simultaneously |
| Batch at 0 quantity | Cannot be selected for order | Verify batch not in dropdown |

#### Financial Edge Cases
| Scenario | Expected Behavior | Test Steps |
|----------|-------------------|------------|
| Client over credit limit | Warning shown, manager approval required | Order total > credit limit |
| Apply credit > order total | Credit capped at order total | Apply $500 credit to $200 order |
| Expired credit application | Error: credit expired | Try to apply expired credit |
| Negative margin order | Warning shown, requires override | Set price < COGS |

#### Status Edge Cases
| Scenario | Expected Behavior | Test Steps |
|----------|-------------------|------------|
| Cancel SHIPPED order | Error: cannot cancel | Try to cancel shipped order |
| Re-approve rejected return | Error: invalid transition | Try REJECTED → APPROVED |
| Convert expired quote | Error: quote expired | Try to convert expired quote |
| Clock in while already clocked in | Error: already clocked in | Double clock-in attempt |

#### Concurrent Access Tests
| Scenario | Expected Behavior | Test Steps |
|----------|-------------------|------------|
| Two users approve same return | One succeeds, one gets "already approved" | Parallel approval clicks |
| Session timeout mid-order | Redirect to login, draft saved | Let session expire during order creation |
| Network disconnect during save | Retry mechanism, data not lost | Disconnect network during save |

#### Error State UI Tests
| Scenario | Expected Behavior | Test Steps |
|----------|-------------------|------------|
| API 500 error | User-friendly error message | Trigger server error |
| Network timeout | Loading indicator, retry option | Slow network simulation |
| Empty data | "No results" message, not blank | Filter to 0 results |
| Permission denied | Clear error, redirect if needed | Access page without permission |

### 3.5 Cross-Browser Testing Matrix

| Browser | Desktop | Mobile | Tablet |
|---------|---------|--------|--------|
| Chrome | Primary | Test | Test |
| Firefox | Secondary | - | - |
| Safari | Secondary | Test (iOS) | Test (iPad) |
| Edge | Secondary | - | - |

### 3.5 Manus Test Report Format

```markdown
## Page: [PageName.tsx]

**URL:** /path/to/page
**Test Date:** YYYY-MM-DD
**Browser:** Chrome 120

### Smoke Test
- [x] Page loads
- [x] No console errors
- [x] Main components visible
- [ ] FAIL: Placeholder text found at [location]

### Functional Test Results
| Element | Action | Expected | Actual | Status |
|---------|--------|----------|--------|--------|
| Create Button | Click | Opens modal | Opens modal | PASS |
| Save Form | Submit | Shows success | Error 500 | FAIL |

### UI/UX Issues
| Issue | Location | Severity | Screenshot |
|-------|----------|----------|------------|
| Misaligned button | Header | P3 | ui-001.png |

### Performance Metrics
- Page Load: 2.3s (PASS)
- API Calls:
  - GET /orders: 450ms (PASS)
  - GET /inventory: 1.2s (SLOW)

### Bugs Found
[QA-XXX formatted bug reports]
```

---

## Part 4: Coordination Protocol

### 4.1 Communication Format

Claude and Manus will coordinate via structured handoffs:

**Claude to Manus (Backend Ready Signal)**
```markdown
## Backend Ready: [Module Name]

**Routers Tested:** [list]
**Pass Rate:** XX%
**Known Issues:** [list]

**Ready for Frontend Testing:**
- [ ] API endpoints functional
- [ ] Test data seeded
- [ ] Known edge cases documented

**Manus Action Required:**
Test pages: [PageA, PageB, PageC]
Focus areas: [specific functionality]
```

**Manus to Claude (Frontend Issue Report)**
```markdown
## Frontend Issue: [Issue Title]

**Page:** [PageName]
**Severity:** P1/P2/P3

**Issue:**
[Description]

**Steps to Reproduce:**
1. ...

**Expected API Response:**
[What should happen]

**Actual API Response:**
[What actually happens]

**Claude Investigation Required:**
- Check router: [router_name]
- Check procedure: [procedure_name]
- Check table: [table_name]
```

### 4.2 Test Execution Sequence

```
Phase 1: Infrastructure Validation (Claude)
├── Verify test environment
├── Run pnpm check/lint/build
├── Validate database schema
└── Seed test data if needed

Phase 2: Critical Backend Testing (Claude)
├── Test Tier 1 routers (Financial/Critical)
├── Document all issues
└── Signal ready to Manus

Phase 3: Critical Frontend Testing (Manus)
├── Test Tier 1 pages
├── Execute E2E flows 1-2
├── Report backend issues to Claude
└── Document all UI bugs

Phase 4: High Priority Backend (Claude)
├── Test Tier 2 routers
├── Address issues from Phase 3
└── Signal ready to Manus

Phase 5: High Priority Frontend (Manus)
├── Test Tier 2 pages
├── Execute E2E flows 3-5
└── Complete cross-browser testing

Phase 6: Medium/Low Priority (Both in parallel)
├── Claude: Test Tier 3-4 routers
└── Manus: Test Tier 3-4 pages

Phase 7: Final Verification (Both)
├── Claude: Run full test suite
├── Manus: Smoke test all pages
└── Joint: Review all findings
```

### 4.3 Issue Severity Classification

| Level | Definition | Backend Example | Frontend Example |
|-------|------------|-----------------|------------------|
| **P0** | System down, data loss | Auth bypass, data corruption | App crash, login impossible |
| **P1** | Critical feature broken | Orders fail to save, COGS wrong | Cannot create orders, payment fails |
| **P2** | Feature degraded | Slow query, missing validation | Slow page load, filter broken |
| **P3** | Minor issue | Console warning, style | UI glitch, minor misalignment |

---

## Part 5: Test Artifacts & Deliverables

### 5.1 Claude's Deliverables

```
docs/qa/
├── backend/
│   ├── router-test-results/
│   │   ├── accounting.test-report.md
│   │   ├── orders.test-report.md
│   │   ├── inventory.test-report.md
│   │   └── [all routers]
│   ├── security-audit-report.md
│   ├── database-integrity-report.md
│   ├── business-logic-validation.md
│   └── BACKEND_QA_SUMMARY.md
```

### 5.2 Manus's Deliverables

```
docs/qa/
├── frontend/
│   ├── page-test-results/
│   │   ├── dashboard.test-report.md
│   │   ├── orders.test-report.md
│   │   ├── inventory.test-report.md
│   │   └── [all pages]
│   ├── e2e-flow-results/
│   │   ├── order-cycle.test-report.md
│   │   ├── inventory-intake.test-report.md
│   │   └── [all flows]
│   ├── cross-browser-matrix.md
│   ├── accessibility-audit.md
│   └── FRONTEND_QA_SUMMARY.md
qa_screenshots/
├── [session-id]/
│   ├── bugs/
│   └── evidence/
```

### 5.3 Joint Deliverables

```
docs/qa/
├── QA_CONSOLIDATED_REPORT.md      # Combined findings
├── QA_TASKS_BACKLOG.md           # All bugs as tasks
├── REGRESSION_TEST_CHECKLIST.md  # For future QA runs
└── TEST_COVERAGE_UPDATE.md       # Updated coverage map
```

---

## Part 6: Launch Prompts

### 6.1 Claude Backend QA Launch Prompt

```markdown
# Claude Backend QA Session

You are the Backend QA Lead for TERP. Your mission is to systematically test
all tRPC routers, validate database integrity, and verify business logic.

## Your Scope
- 121 tRPC routers
- 233 database tables
- Financial calculations (COGS, margins, AR/AP aging)
- Security and permission checks

## Execution Order
1. Run infrastructure validation (pnpm check/lint/build)
2. Test Tier 1 routers (accounting, orders, inventory, auth)
3. Test Tier 2 routers (clients, pricing, VIP, calendar)
4. Test Tier 3-4 routers (products, notifications, todos)
5. Generate consolidated report

## Output
For each router, provide:
- Procedures tested
- Pass/fail rate
- Security findings
- Issues in QA-XXX format

## Constraints
- RED Mode for financial routers
- STRICT Mode for business routers
- SAFE Mode for utility routers
- Follow all CLAUDE.md protocols

Start with: pnpm check && pnpm lint && pnpm test
```

### 6.2 Manus Frontend QA Launch Prompt

```markdown
# Manus Frontend QA Session

You are the Frontend QA Lead for TERP using live browser testing. Your mission
is to test all user-facing pages and execute E2E user flows.

## Production URL
https://terp-app-b9s35.ondigitalocean.app

## Your Scope
- 72 frontend pages
- 10 critical E2E user flows
- Cross-browser compatibility
- UI/UX verification

## Execution Order
1. Login and verify test data exists
2. Test Tier 1 pages (Dashboard, Orders, Inventory, Accounting)
3. Execute E2E flows (Order Cycle, Intake, VIP)
4. Test Tier 2-4 pages
5. Cross-browser verification
6. Generate consolidated report

## For Each Page Test
1. Smoke test (loads, no errors)
2. Functional test (all interactions work)
3. UI/UX test (design consistency, responsiveness)
4. Data test (correct data displayed)
5. Performance test (load time < 3s)

## Output Format
- Screenshot evidence for all bugs
- Issues in QA-XXX format with steps to reproduce
- Performance metrics for each page

## Communication
Report backend issues to Claude in the specified format.
Wait for "Backend Ready" signals before testing dependent features.

Start with: Navigate to login page and verify access
```

---

## Part 7: Success Criteria

### QA Complete When:

```
[ ] All 121 routers tested (Claude)
[ ] All 72 pages tested (Manus)
[ ] All 10 E2E flows pass (Manus)
[ ] All P0/P1 issues fixed or documented
[ ] Test coverage > 80% for Tier 1 modules
[ ] Security audit complete with no critical findings
[ ] Cross-browser testing complete
[ ] QA_CONSOLIDATED_REPORT.md published
[ ] QA_TASKS_BACKLOG.md updated with all findings
```

### Quality Gates

| Gate | Claude Criteria | Manus Criteria |
|------|-----------------|----------------|
| **G1** | TypeScript/lint pass | All pages load |
| **G2** | Tier 1 routers >95% pass | Tier 1 pages tested |
| **G3** | Security audit pass | E2E flows pass |
| **G4** | All routers tested | All pages tested |
| **G5** | Consolidated report | Screenshot evidence |

---

## Appendix A: Complete Page URL Reference (VERIFIED)

### Core Navigation (Protected Routes)
| Page | URL | Key Router(s) |
|------|-----|---------------|
| Dashboard | `/` or `/dashboard` | `dashboard.ts`, `dashboardEnhanced.ts` |
| Inventory | `/inventory` | `inventory.ts`, `inventoryMovements.ts` |
| Products | `/products` | `productCatalogue.ts`, `products.ts` |
| Orders | `/orders` | `orders.ts`, `orderEnhancements.ts` |
| Order Creator | `/orders/create` | `orders.ts` |
| Quotes | `/quotes` | `quotes.ts` |
| Pick & Pack | `/pick-pack` | `pickPack.ts` |
| Clients | `/clients` | `clients.ts` |
| Client Profile | `/clients/:id` | `clients.ts`, `client360.ts` |
| Client Ledger | `/clients/:clientId/ledger` | `clientLedger.ts` |
| Vendors | `/vendors` | `vendors.ts` |
| Vendor Supply | `/vendor-supply` | `vendorSupply.ts` |

### Accounting Routes
| Page | URL | Key Router(s) |
|------|-----|---------------|
| Accounting Dashboard | `/accounting` or `/accounting/dashboard` | `accounting.ts` |
| Chart of Accounts | `/accounting/chart-of-accounts` | `accounting.ts` |
| General Ledger | `/accounting/general-ledger` | `accounting.ts` |
| Fiscal Periods | `/accounting/fiscal-periods` | `accounting.ts` |
| Invoices | `/accounting/invoices` | `invoices.ts` |
| Bills | `/accounting/bills` | `accounting.ts` |
| Payments | `/accounting/payments` | `payments.ts` |
| Bank Accounts | `/accounting/bank-accounts` | `accounting.ts` |
| Bank Transactions | `/accounting/bank-transactions` | `accounting.ts` |
| Expenses | `/accounting/expenses` | `accounting.ts` |
| Cash Locations | `/accounting/cash-locations` | `cashAudit.ts` |

### Procurement & Intake Routes
| Page | URL | Key Router(s) |
|------|-----|---------------|
| Purchase Orders | `/purchase-orders` | `purchaseOrders.ts` |
| Intake Receipts | `/intake-receipts` | `intakeReceipts.ts` |
| Direct Intake | `/intake` | `productIntake.ts` |
| Returns | `/returns` | `returns.ts` |
| Samples | `/samples` | `samples.ts` |
| Locations | `/locations` | `locations.ts` |

### Pricing & Sales Routes
| Page | URL | Key Router(s) |
|------|-----|---------------|
| Pricing Rules | `/pricing/rules` | `pricing.ts` |
| Pricing Profiles | `/pricing/profiles` | `pricingDefaults.ts` |
| COGS Settings | `/settings/cogs` | `cogs.ts` |
| Sales Sheets | `/sales-sheets` | `salesSheets.ts` |
| Sales Portal | `/sales-portal` | `unifiedSalesPortal.ts` |
| Live Shopping | `/live-shopping` | `liveShopping.ts` |

### Client Features Routes
| Page | URL | Key Router(s) |
|------|-----|---------------|
| Credits | `/credits` | `credits.ts` |
| Credit Settings | `/credit-settings` | `credit.ts` |
| Needs Management | `/needs` | `clientNeedsEnhanced.ts` |
| Interest List | `/interest-list` | `clientWants.ts` |
| Matchmaking | `/matchmaking` | `matchingEnhanced.ts` |

### Calendar & Scheduling Routes
| Page | URL | Key Router(s) |
|------|-----|---------------|
| Calendar | `/calendar` | `calendar.ts`, `calendarRecurrence.ts` |
| Scheduling | `/scheduling` | `scheduling.ts` |
| Time Clock | `/time-clock` | `hourTracking.ts` |

### Communication & Productivity Routes
| Page | URL | Key Router(s) |
|------|-----|---------------|
| Todos | `/todos` or `/todo` | `todoLists.ts`, `todoTasks.ts` |
| Inbox | `/inbox` | `inbox.ts` |
| Notifications | `/notifications` | `notifications.ts` |
| Workflow Queue | `/workflow-queue` | `workflowQueue.ts` |

### Analytics & Admin Routes
| Page | URL | Key Router(s) |
|------|-----|---------------|
| Analytics | `/analytics` | `analytics.ts` |
| Leaderboard | `/leaderboard` | `leaderboard.ts`, `gamification.ts` |
| Search Results | `/search` | `search.ts` |
| Settings | `/settings` | `settings.ts` |
| Feature Flags | `/settings/feature-flags` | `featureFlags.ts` |
| Notification Preferences | `/settings/notifications` | `notifications.ts` |
| Account | `/account` | `users.ts` |
| Users | `/users` | `users.ts`, `rbac-users.ts` |
| Admin Setup | `/admin-setup` | `adminSetup.ts` |
| Photography | `/photography` | `photography.ts` |

### VIP Portal Routes (Separate Auth Context)
| Page | URL | Key Router(s) |
|------|-----|---------------|
| VIP Login | `/vip-portal/login` | `vipPortal.ts` |
| VIP Dashboard | `/vip-portal/dashboard` or `/vip-portal` | `vipPortal.ts` |
| VIP Live Shopping | VIP-specific | `vipPortalLiveShopping.ts` |
| Admin Impersonate | `/vip-portal/auth/impersonate` | `vipPortalAdmin.ts` |
| Session Ended | `/vip-portal/session-ended` | - |
| VIP Config | `/clients/:clientId/vip-portal-config` | `vipTiers.ts` |

### Public Routes (No Auth Required)
| Page | URL | Key Router(s) |
|------|-----|---------------|
| Login | `/login` | `auth.ts` |
| Shared Sales Sheet | `/shared/sales-sheet/:token` | `salesSheets.ts` |
| Farmer Verification | `/intake/verify/:token` | `intakeReceipts.ts` |

### Legacy Redirects
| Old URL | Redirects To |
|---------|--------------|
| `/invoices` | `/accounting/invoices` |
| `/client-needs` | `/needs` |
| `/ar-ap` | `/accounting` |
| `/reports` | `/analytics` |
| `/pricing-rules` | `/pricing/rules` |
| `/system-settings` | `/settings` |
| `/feature-flags` | `/settings/feature-flags` |
| `/todo-lists` | `/todos` |

---

## Appendix B: Test Data Requirements

For effective QA, ensure the following test data exists:

```
Clients:
- 10+ buyer clients (various credit levels)
- 5+ seller/supplier clients
- 1+ VIP tier clients

Products:
- 20+ active products with batches
- Multiple strains, categories, grades
- Products with images

Inventory:
- 50+ batches across multiple locations
- Batches at various aging levels
- Reserved and available inventory

Orders:
- 10+ orders in various statuses
- Orders with multiple line items
- Orders with margin overrides

Accounting:
- 20+ invoices (paid, partial, overdue)
- Payment records
- AR aging spread across buckets

Calendar:
- 10+ events (single and recurring)
- Events with participants
- Upcoming appointments

Users:
- Admin user (full access)
- Sales rep (limited access)
- Warehouse manager
- Accountant
- VIP customer
```

---

**Document End**

*This QA strategy ensures comprehensive coverage of TERP through coordinated backend and frontend testing, with clear ownership, communication protocols, and deliverables.*
