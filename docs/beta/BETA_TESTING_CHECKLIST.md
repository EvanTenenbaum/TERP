# TER-57 Beta Testing Checklist

> **Version:** 2.0
> **Updated:** 2026-02-06
> **Purpose:** Comprehensive guide for beta testers evaluating TERP Golden Flows

---

## 1) Beta Tester Onboarding

### Getting Started

1. Open staging URL: `https://terp-app-b9s35.ondigitalocean.app`
2. Log in with your assigned role account (see section 2).
3. Confirm dashboard loads and sidebar navigation is visible.
4. Read the Golden Flows Runbook: `docs/golden-flows/GOLDEN_FLOWS_RUNBOOK.md`
5. Bookmark the staging URL for easy access.

### Browser Requirements

- **Recommended:** Chrome 120+ or Firefox 120+
- **Supported:** Safari 17+, Edge 120+
- JavaScript must be enabled
- Cookies must be enabled (session-based auth)
- Screen resolution: 1280x720 minimum

### What to Test

Each golden flow (GF-001 through GF-008) represents a critical business workflow. Your goal is to:
- Complete each flow end-to-end following the step-by-step instructions
- Note any errors, confusing UI, or unexpected behavior
- Measure perceived performance (is it faster than a spreadsheet?)
- Verify data integrity (do numbers add up?)

### What NOT to Do

- Do not test in production - only use the staging URL above
- Do not share credentials outside the testing group
- Do not attempt destructive operations (mass deletion, DB access)
- Do not rely on data persisting between test sessions (staging may be reset)

---

## 2) Test Accounts and Credentials

| Role | Email | Password | Primary Flows |
|------|-------|----------|---------------|
| Super Admin | `qa.superadmin@terp.test` | `TerpQA2026!` | All flows (full access) |
| Sales Manager | `qa.salesmanager@terp.test` | `TerpQA2026!` | GF-003, GF-008 |
| Sales Rep / CS | `qa.salesrep@terp.test` | `TerpQA2026!` | GF-003, GF-008 |
| Inventory Manager | `qa.inventory@terp.test` | `TerpQA2026!` | GF-001, GF-002, GF-007 |
| Warehouse Staff | `qa.fulfillment@terp.test` | `TerpQA2026!` | GF-005 |
| Accountant | `qa.accounting@terp.test` | `TerpQA2026!` | GF-004, GF-006 |
| Read-Only Auditor | `qa.auditor@terp.test` | `TerpQA2026!` | View-only access to all |

### Role-Based Access Summary

| Module | Super Admin | Sales Mgr | Sales Rep | Inventory | Warehouse | Accountant | Auditor |
|--------|:-----------:|:---------:|:---------:|:---------:|:---------:|:----------:|:-------:|
| Dashboard | Full | Full | Full | Full | Full | Full | Read |
| Orders | Full | Full | Full | View | View | View | Read |
| Clients | Full | Full | Full | View | - | View | Read |
| Inventory | Full | View | View | Full | View | View | Read |
| Purchase Orders | Full | - | - | Full | View | View | Read |
| Invoices | Full | View | View | - | - | Full | Read |
| Payments | Full | - | - | - | - | Full | Read |
| Fulfillment | Full | - | - | View | Full | - | Read |
| Samples | Full | Full | Full | View | - | - | Read |
| Accounting | Full | - | - | - | - | Full | Read |
| Audit Logs | Full | - | - | - | - | - | Read |

---

## 3) Expected Behavior Checklist by Golden Flow

### GF-001: Direct Intake
- [ ] Login as Inventory Manager
- [ ] Navigate to `/intake` - work surface loads
- [ ] AG Grid table and inspector panel are visible
- [ ] Add Row button creates a new intake line
- [ ] Vendor/Supplier dropdown is searchable and populated
- [ ] Category dropdown shows all options
- [ ] Quantity and COGS fields accept numeric input
- [ ] Summary bar updates in real-time (Items, Qty, Value)
- [ ] Submit All creates batches with AWAITING_INTAKE status
- [ ] Success toast appears after submission

### GF-002: Procure to Pay (Purchase Order)
- [ ] Login as Inventory Manager
- [ ] Navigate to Purchase Orders page
- [ ] Create PO button opens creation form
- [ ] Supplier dropdown is populated with suppliers
- [ ] Product dropdown shows active products (150+ items)
- [ ] PO can be submitted (Draft status)
- [ ] PO can be approved (Draft -> Approved)
- [ ] Goods can be received against PO
- [ ] AP balance updates for supplier

### GF-003: Order to Cash (Sales Order)
- [ ] Login as Sales Rep
- [ ] Navigate to `/orders`
- [ ] Create order with multiple line items
- [ ] Customer dropdown populated with buyers
- [ ] Product selection works
- [ ] Order submits as Draft
- [ ] Order can be confirmed (Draft -> Confirmed)
- [ ] Invoice generated from confirmed order
- [ ] Invoice amounts match order totals
- [ ] Partial payment recorded successfully
- [ ] Full payment completes invoice (status: PAID)

### GF-004: Invoice and Payment
- [ ] Login as Accountant
- [ ] Navigate to `/accounting/invoices`
- [ ] Invoice list loads with status filters
- [ ] Invoice detail shows in inspector panel
- [ ] PDF download completes in <10 seconds
- [ ] PDF content matches invoice details
- [ ] Record Payment dialog opens correctly
- [ ] Payment posts to GL (Cash debit, AR credit)
- [ ] Invoice balance updates after payment

### GF-005: Pick-Pack (Fulfillment)
- [ ] Login as Warehouse Staff
- [ ] Navigate to fulfillment/pick queue
- [ ] Pick queue shows orders awaiting fulfillment
- [ ] Start Pick begins the workflow
- [ ] Quantities can be entered per line item
- [ ] Packing step completes successfully
- [ ] Shipment can be marked as shipped

### GF-006: Client Ledger / AR-AP
- [ ] Login as Accountant
- [ ] Dashboard shows Top Debtors widget with data
- [ ] Dashboard shows Top Vendors Owed with proper names
- [ ] Client list shows totalOwed column
- [ ] Client ledger shows transaction history
- [ ] Running balance calculates correctly
- [ ] Date range filter works
- [ ] CSV export works (if available)

### GF-007: Inventory Management
- [ ] Login as Inventory Manager
- [ ] Navigate to `/inventory`
- [ ] Batch list loads with correct values (not $0.00)
- [ ] Status filter works (LIVE, AWAITING_INTAKE, etc.)
- [ ] Search by product name works
- [ ] Valuation totals are correct
- [ ] Batch detail drawer opens on click
- [ ] Batch details are complete and accurate

### GF-008: Sample Request
- [ ] Login as Sales Rep
- [ ] Navigate to `/samples`
- [ ] Status filter tabs work
- [ ] New Sample button opens form
- [ ] Product field is a searchable combobox (not text input)
- [ ] Client dropdown is populated
- [ ] Quantity accepts decimal values
- [ ] Submit creates request in PENDING status
- [ ] Request shows correct product name (not text ID)
- [ ] Monthly allocation is tracked

---

## 4) Bug Reporting

Use the template at `docs/beta/BUG_REPORT_TEMPLATE.md` for all bugs.

### Severity Guide

| Severity | Definition | Example |
|----------|-----------|---------|
| **Critical** | Flow is completely blocked, data corruption | Cannot submit any orders, payments double-posting |
| **High** | Major functionality broken but workaround exists | PDF takes 3 minutes but eventually works |
| **Medium** | Feature works incorrectly but doesn't block flow | Totals show wrong decimal places |
| **Low** | Cosmetic or minor UX issue | Button alignment off, typo in label |

### How to Report

1. Fill out the bug report template completely.
2. Include browser console errors (screenshot or copy-paste).
3. Include network tab details for API failures.
4. Include the exact steps you took (not "I clicked around and it broke").
5. Submit via the designated channel (GitHub issue, Slack, or email to PM).

---

## 5) Feedback Collection

Use the template at `docs/beta/FEEDBACK_FORM_TEMPLATE.md` for structured feedback.

### Key Questions to Consider

While testing each flow, reflect on:

1. **Speed:** Is this workflow faster than doing it in a spreadsheet?
2. **Clarity:** Did you know what to do at each step without instructions?
3. **Accuracy:** Did the numbers (totals, balances, quantities) add up?
4. **Recovery:** When you made a mistake, could you easily fix it?
5. **Trust:** Would you trust this system for daily financial operations?

### Feedback Timeline

- **Week 1:** Focus on GF-001, GF-002, GF-007 (Inventory flows)
- **Week 2:** Focus on GF-003, GF-004, GF-005 (Order-to-Cash flows)
- **Week 3:** Focus on GF-006, GF-008 (Accounting and Samples)
- **Week 4:** End-to-end cross-flow testing

---

## 6) Known Issues (As of 2026-02-06)

These issues are being actively worked on. Do not report them as new bugs:

| Issue | Flow | Status | Description |
|-------|------|--------|-------------|
| TER-33 | GF-001 | In Progress | Intake form fields not rendering |
| TER-34 | GF-002 | In Progress | PO product dropdown empty |
| TER-35 | GF-008 | In Progress | Sample form uses text input instead of product selector |
| TER-36 | GF-004 | In Progress | PDF generation timeout (~197s) |
| TER-37 | GF-006 | In Progress | Top Debtors empty, "Unknown Vendor" in AP |
