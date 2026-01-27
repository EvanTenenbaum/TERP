# QA Session Notes - Golden Flows Audit

**Started:** 2026-01-26T18:13:55Z

## Initial Observations

- Application is already logged in as `admin@terp.test (E2E Admin)`
- Dashboard loads successfully with data
- Navigation sidebar shows all expected modules: SALES, INVENTORY, FINANCE, ADMIN
- Cash Flow shows $5,028,886.76 collected
- Inventory shows 30,572.21 total units valued at $13,010,881

## Test Account Status

Need to log out and log in with appropriate QA test accounts for each flow:
- Sales flows: `qa.salesrep@terp.test`
- Inventory flows: `qa.inventory@terp.test`
- Accounting flows: `qa.accounting@terp.test`
- Fulfillment flows: `qa.fulfillment@terp.test`

## Starting Test: GF-003 Sales Order Happy Path

Will log out and log in as qa.salesrep@terp.test to test sales order creation.


## CRITICAL FINDING #1: Clients Page Fails to Load

**Timestamp:** 2026-01-26T18:16:00Z
**Flow:** GF-003 Sales Order Happy Path
**Scenario:** Pre-requisite check

**Issue:** The Clients page shows "Failed to load clients" error. This is a **BLOCKER** for the entire Sales Order flow since customers cannot be selected.

**Evidence:** Screenshot saved. The page shows Total: 0, With Debt: 0, LTV: $0.00 and a "Retry" button.

**Impact:** Cannot proceed with GF-003 testing until this is resolved.

---


## CRITICAL FINDING #2: Client Creation Fails Silently

**Timestamp:** 2026-01-26T18:18:51Z
**Flow:** GF-003 Sales Order Happy Path
**Scenario:** Pre-requisite - Create test client

**Issue:** The "Add New Client" wizard completes all 3 steps but clicking "Create Client" does nothing. The button appears to be non-responsive. No error message is shown, no loading indicator, and no success feedback.

**Steps to Reproduce:**
1. Navigate to /clients
2. Click "Add Client"
3. Fill in Step 1 (Basic Information) - TERI Code, Company Name, Contact Name, Email, Phone
4. Click Next
5. Fill in Step 2 (Client Types) - Select "Buyer"
6. Click Next
7. Step 3 (Tags) - Skip tags
8. Click "Create Client" - NOTHING HAPPENS

**Impact:** Combined with Finding #1 (Clients fail to load), this completely blocks the Sales Order flow (GF-003). Cannot create orders without clients.

---


## FINDING #3: Clients Load for Super Admin but NOT for Sales Rep

**Timestamp:** 2026-01-26T18:20:02Z
**Flow:** GF-003 Sales Order Happy Path

**Observation:** When logged in as **QA Super Admin**, the Clients page loads successfully showing 100 clients (Total: 100, With Debt: 0, LTV: $0.00). However, when logged in as **QA Sales Rep**, the same page shows "Failed to load clients" error.

**Root Cause Hypothesis:** This appears to be an RBAC (Role-Based Access Control) issue. The Sales Rep role may not have the correct permissions to view clients, OR there's a bug in the API that returns an error for non-admin roles.

**Impact:** Sales Reps cannot create orders because they cannot select clients. This is a **BLOCKER** for the Sales Order flow when using the intended role.

**Workaround:** Use Super Admin role for testing, but this doesn't validate the RBAC system correctly.

---

## Proceeding with GF-003 Testing as Super Admin

Since clients are now visible, I will proceed with the Sales Order flow testing using the Super Admin role.


## CRITICAL FINDING #4: Inventory Fails to Load with SQL Error

**Timestamp:** 2026-01-26T18:21:08Z
**Flow:** GF-003 Sales Order Happy Path
**Scenario:** 1 - Simple single-item order

**Issue:** After selecting a customer (Emerald Naturals), the order creation page shows:

> **Failed to load inventory**
> Failed to load inventory: Failed query: select `batches`.`id`, `batches`.`code`, `batches`.`deleted_at`, `batches`.`version`, `batches`.`sku`, `batches`.`productId`, `batches`.`lotId`, `batches`.`batchStatus`, `batches`.`statusId`, `batches`.`grade`, `batches`.`isSample`, `batches`.`sampleOnly`, `batches`.`sampleAvailable`, `batches`.`cogsMode`, `batches`.`unitCogs`, `batches`.`unitCogsMin`, `batches`.`unitCogsMax`, `batches`.`paymentTerms`, `batches`.`ownership_type`, `batches`.`amountPaid`, `batches`.`metadata`, `batches`.`photo_session_event_id`, `batches`.`onHandQty`, `batches`.`sampleQty`, `batches`.`reservedQty`, `batches`.`quarantineQty`, `batches`.`holdQty`, `batches`.`defectiveQty`, `batches`.`publishEcom`, `batches`.`publishB2b`, `batches`.`createdAt`, `batches`.`updatedAt`, `products`.`id`, `products`.`brandId`, `products`.`strainId`, `products`.`nameCanonical`, `products`.`deleted_at`, `products`.`category`, `products`.`subcategory`, `products`.`uomSellable`, `products`.`description`, `products`.`createdAt`, `products`.`updatedAt`, `lots`.`id`, `lots`.`code`, `lots`.`deleted_at`, `lots`.`supplier_client_id`, `lots`.`vendorId`, `lots`.`date`, `lots`.`notes`, `lots`.`createdAt`, `lots`.`updatedAt`, `vendors`.`id`, `vendors`.`name`, `vendors`.`deleted_at`, `vendors`.`contactName`, `vendors`.`contactEmail`, `vendors`.`contactPhone`, `vendors`.`paymentTerms`, `vendors`.`notes`, `vendors`.`createdAt`, `vendors`.`updatedAt`, `strains`.`id`, `strains`.`name`, `strains`.`deleted_at`, `strains`.`standardizedName`, `strains`.`aliases`, `strains`.`category`, `strains`.`description`, `strains`.`openthcId`, `strains`.`openthcStub`, `strains`.`parentStrainId`, `strains`.`baseStrainName`, `strains`.`createdAt`, `strains`.`updatedAt` from `batches` left join `products` on...

**Root Cause:** This is a database query error. The query is likely too complex or there's a schema mismatch. The error message is being exposed to the user, which is also a security concern.

**Impact:** **COMPLETE BLOCKER** - Cannot add items to orders. The entire Sales Order flow (GF-003) is broken.

**Severity:** P0 - Critical

---


## FINDING #5: Direct Intake Page Missing Form Fields

**Timestamp:** 2026-01-26T18:22:37Z
**Flow:** GF-001 Direct Intake Happy Path

**Observation:** The Direct Intake page shows "Items: 2, Qty: 0, Value: $0.00" but there are no visible form fields to enter intake data. The page only shows:
- "Add Row" button
- "Remove" button
- "Submit All" button

Clicking "Add Row" increments the Items counter but doesn't show any input fields. The form appears to be broken or the UI is not rendering correctly.

**Impact:** Cannot test GF-001 Direct Intake flow.

---


## CRITICAL FINDING #6: Inventory Page Shows 0 Batches Despite Dashboard Showing $13M

**Timestamp:** 2026-01-26T18:22:57Z
**Flow:** GF-007 Inventory Adjustment

**Issue:** The Inventory page shows:
- Batches: 0
- Live: 0
- Value: $0.00
- "No inventory found"

However, the Dashboard showed:
- Total Inventory Value: $13,010,881
- 30,572.21 total units across 7 categories

**Root Cause Hypothesis:** This is likely the same SQL query error that's affecting the Order creation page. The inventory query is failing, causing the page to show no data.

**Impact:** This is a **DATA INTEGRITY ISSUE** or a **QUERY FAILURE**. Either:
1. The inventory data exists but the query is failing (same as Order creation)
2. The dashboard is showing cached/fake data while the actual database is empty

**Severity:** P0 - Critical - This affects the entire system's core functionality.

---


## POSITIVE FINDING #1: Invoices Page Works Correctly

**Timestamp:** 2026-01-26T18:23:20Z
**Flow:** GF-004 Invoice & Payment

**Observation:** The Invoices page loads successfully and shows:
- Total Billed: $1,082,431.78
- Due: $640,592.19
- Overdue: 3
- 401 total invoices with various statuses (PAID, PARTIAL, VIEWED, DRAFT, SENT, VOID, OVERDUE)

This is the first page that has loaded data correctly. The invoices appear to be linked to customers that are different from the clients on the Clients page (e.g., "Golden Wellness Center" vs "Emerald Naturals").

**Next Step:** Click on an invoice to test the full invoice flow.

---


## FINDING #7: PDF Download Caused Browser Timeout

**Timestamp:** 2026-01-26T18:27:15Z
**Flow:** GF-004 Invoice & Payment

**Issue:** Clicking "Download PDF" on an invoice caused the browser to timeout after ~197 seconds and crash to about:blank. This suggests the PDF generation is either:
1. Taking an extremely long time
2. Causing an infinite loop
3. Crashing the server-side PDF generation

**Impact:** Cannot test PDF generation functionality. This is a P1 issue for the Invoice flow.

---

## Summary of Critical Findings So Far

| # | Finding | Severity | Flow Affected |
|---|---------|----------|---------------|
| 1 | Clients fail to load for Sales Rep role | P0 | GF-003 |
| 2 | Client creation fails silently | P0 | GF-003 |
| 3 | Clients load for Super Admin only | P1 | GF-003 |
| 4 | Inventory fails to load with SQL error | P0 | GF-003, GF-007 |
| 5 | Direct Intake form fields not visible | P1 | GF-001 |
| 6 | Inventory page shows 0 batches (data mismatch) | P0 | GF-007 |
| 7 | PDF download causes browser timeout | P1 | GF-004 |

---


## FINDING #8: Purchase Order Product Dropdown Empty

**Timestamp:** 2026-01-26T18:29:19Z
**Flow:** GF-002 Standard PO to Receiving

**Observation:** The Purchase Order creation form opens correctly and allows selecting a supplier (Green Therapeutics). However, the "Select product" dropdown appears to be empty or not loading products.

This is consistent with the inventory issues found earlier - if there are no products in the system, the dropdown would be empty.

**Impact:** Cannot complete GF-002 flow without products to add to the PO.

---

## Testing GF-005 Pick & Pack Flow

Since orders cannot be created, I'll test if the Pick & Pack flow has any existing data to work with.


## FINDING #9: Products Page Works - 150 Products Exist

**Timestamp:** 2026-01-26T18:30:04Z
**Flow:** N/A (Data verification)

**Observation:** The Products page loads correctly and shows **150 active products** across 7 categories:
- Pre-Roll
- Concentrate
- Tincture
- Flower
- Vape
- Topical
- Edible

This is a **POSITIVE** finding. Products exist in the system, which means the issue with the PO product dropdown may be a UI bug, not a data issue.

**Key Insight:** The dashboard shows $13M inventory value, but the Inventory page shows 0 batches. This suggests:
1. Products exist (catalog items)
2. Inventory batches do NOT exist (actual stock)
3. The dashboard may be showing stale/cached data

---

## Testing GF-003 Again with Product Knowledge

Now that I know products exist, let me retry the Sales Order flow.


## FINDING #10: CRITICAL SQL Error Confirmed - Inventory Query Failure

**Timestamp:** 2026-01-26T18:31:10Z
**Flow:** GF-003 Sales Order Happy Path

**Issue:** After selecting customer "Emerald Naturals", the system displays:

> **Failed to load inventory**
> (Content truncated due to size limit. Use line ranges to read remaining content)

## FINDING #11: Add Item Button Blocked by Inventory Failure

**Timestamp:** 2026-01-26T18:31:55Z
**Flow:** GF-003 Sales Order Happy Path

**Observation:** Clicking "Add Item" does not open a product selector or allow manual item entry. The inventory failure error persists and blocks the entire order creation flow.

The "Order has validation errors" message appears, preventing order confirmation.

**Note:** There's also an "Update Available" banner suggesting a new version is available. This may indicate active development.

---

## Testing GF-006: Client Ledger Review

Let me test a flow that doesn't depend on inventory - the Client Ledger.

## FINDING #12: AR/AP Dashboard Works - POSITIVE

**Timestamp:** 2026-01-26T18:32:18Z
**Flow:** GF-006 Client Ledger Review

**Observation:** The AR/AP (Accounting) dashboard loads correctly and displays:
- **Cash Balance:** $0.00
- **Accounts Receivable:** $2,497,288.62
- **Accounts Payable:** $1,753,971.17
- **Net Position:** $743,317.45

**AR Aging Breakdown:**
- Current: $1,036,049
- 30 Days: $694,226
- 60 Days: $316,899
- 90 Days: (not shown)
- 90+ Days: (not shown)

**AP Aging Breakdown:**
- Current: $1,029,535
- 30 Days: $1,071,695
- 60 Days: $548,649
- 90 Days: $291,125
- 90+ Days: (shown)

**Issues Found:**
1. "Top Debtors" shows "No outstanding balances" despite $2.5M in AR - data inconsistency
2. "Top Vendors Owed" shows "Unknown Vendor" for all entries - vendor names not resolving

**Overdue Invoices:** 86 invoices listed with proper details
**Overdue Bills:** 44 bills

**Status:** PARTIAL PASS - Dashboard loads but has data quality issues.

---

## Testing GF-008: Sample Request Flow

## FINDING #13: Sample Request Form - Validation Issues

**Timestamp:** 2026-01-26T18:33:37Z
**Flow:** GF-008 Sample Request

**Observation:** The Create Sample Request form shows validation errors:
- "Product is required" - The product search field accepts text input but doesn't actually select a product from the catalog
- "Client is required" - Despite selecting from dropdown, the client selection may not be persisting

**Issues:**
1. Product field is a text input, not a proper product selector - user can type anything
2. No autocomplete/dropdown for product selection despite the hint "searchable to speed up entry"
3. Form validation fires but the UX doesn't guide user to correct the issues

**Impact:** Cannot complete GF-008 flow - Sample Request creation is broken.

---

## Testing Vendors Page (Supporting GF-002)

## FINDING #14: Vendors Page Works - POSITIVE

**Timestamp:** 2026-01-26T18:34:16Z
**Flow:** Supporting GF-002

**Observation:** The Vendors page loads correctly and displays:
- **Total Vendors:** 20
- **Active:** 20
- **Value:** $0.00

All vendors show:
- Name and registration code
- Type badges (Supplier/Buyer/Brand)
- Contact email
- Value ($0.00 for all)
- Orders (0 for all)

**Note:** All vendors show $0.00 value and 0 orders, which is consistent with the inventory/order issues found earlier. The vendor data exists but hasn't been used in transactions.

**Status:** PASS - Page loads and displays data correctly.

---

## Generating Final QA Report

Based on the testing completed, I will now generate the final QA audit report.
