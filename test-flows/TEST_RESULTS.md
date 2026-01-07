# TERP User Flow Test Results

**Test Date**: January 6, 2026
**Live Site URL**: https://terp-app-b9s35.ondigitalocean.app
**Tester**: Manus AI Agent

---

## Test Execution Log

### Initial Load Test
| Test ID | Test Description | Status | Notes |
|---------|------------------|--------|-------|
| INIT-001 | Site loads successfully | ✅ PASS | Dashboard loaded with all KPIs visible |
| INIT-002 | Navigation sidebar visible | ✅ PASS | Full navigation with SALES, INVENTORY, FINANCE, ADMIN sections |
| INIT-003 | User logged in | ✅ PASS | "Public Demo User" shown in header |

### Dashboard Tests (DASH)
| Test ID | Test Description | Status | Notes |
|---------|------------------|--------|-------|
| DASH-001 | Dashboard loads with KPIs | ✅ PASS | CashFlow, Sales, Transaction Snapshot, Inventory Snapshot, Total Debt, Sales Comparison all visible |
| DASH-002 | CashFlow widget displays | ✅ PASS | Shows Cash Collected: $619,908.44, Cash Spent: $0.00 |
| DASH-003 | Sales leaderboard displays | ✅ PASS | Top 10 clients listed with sales figures |
| DASH-004 | Time period dropdown works | TESTING | "All Time" dropdown visible |
| DASH-005 | Profitability Analysis | ⚠️ ISSUE | Shows "Loading..." - may be stuck |

---

## Detailed Test Execution

### Test: DASH-001 - Dashboard Initial Load
**Status**: ✅ PASS
**Observations**:
- Dashboard title and subtitle displayed correctly
- "Customize" and "Comments" buttons visible
- All major widgets loaded

### Test: DASH-005 - Profitability Analysis Widget
**Status**: ⚠️ POTENTIAL ISSUE
**Observations**:
- Widget shows "Loading..." text
- May indicate data loading issue or missing data
- Need to verify if this is expected behavior or a bug

---

## Navigation Elements Identified

### Sidebar Navigation
1. **SALES Section**
   - Dashboard
   - Clients
   - Orders
   - Invoices

2. **INVENTORY Section**
   - Products
   - Batches
   - Samples
   - Purchase Orders
   - Spreadsheet View

3. **FINANCE Section**
   - AR/AP
   - Credits
   - Reports

4. **ADMIN Section**
   - Users
   - Settings
   - Calendar

### Header Elements
- Search bar (placeholder: "Search quotes, customers, products...")
- Notifications button
- Theme toggle (dark/light mode)
- Settings button
- User menu ("Public Demo User")
- Logout button

---

## Continuing Tests...


### Test: ACT-001 - Dashboard KPIs Made Actionable
**Status**: ✅ PASS
**Test**: Clicked on "Nolan Distribution" row in Sales leaderboard
**Result**: Successfully navigated to `/clients/29` - Client Profile Page
**Observations**:
- Client profile loaded with full details
- Shows: REG0008 (TERI Code), Nolan Distribution, contact info
- Financial metrics displayed: Total Spent ($1,387,376.39), Total Profit ($0.00), Avg Profit Margin (0.00%), Amount Owed ($692,105.21)
- Multiple tabs available: Overview, Transactions, Payments, Pricing, Needs, Comms, Calendar, Notes, Catalog
- VIP Portal Config and Edit Client buttons visible
- Credit Status section with "Calculate" button
- Purchase Patterns & Predictions section

**UX Issues Noted**:
- Amount Owed shows "Oldest: 665 days" - this is very old debt, should be highlighted more prominently
- Total Profit shows $0.00 despite $1.3M in sales - may indicate COGS not configured

---

### Test: CLI-004 - Client Profile Page
**Status**: ✅ PASS
**Observations**:
- Breadcrumb navigation works (Home > Clients > #29)
- "Back to Clients" button visible
- All client information sections loaded
- Comments section available


### Test: CLI-004b - Client Transactions Tab
**Status**: ✅ PASS
**Observations**:
- Transaction History tab loaded successfully
- Shows table with columns: Transaction #, Type, Date, Amount, Payment Status, Notes, Audit, Actions
- Multiple transactions visible with different statuses:
  - ORD-000072: $172,376.32 - OVERDUE (red badge)
  - ORD-000184: $152,533.64 - PAID (green badge)
  - ORD-000304: $64,788.90 - OVERDUE (red badge)
  - ORD-000032: $73,682.63 - PAID (green badge)
  - ORD-000400: $39,554.37 - PARTIAL
  - ORD-000048: $174,440.55 - PARTIAL
- "Add Transaction" button visible (blue)
- Search transactions input field works
- "Record Payment" action buttons on each row

**UX Observations**:
- Payment status badges are color-coded (good UX)
- OVERDUE items clearly visible in red
- Record Payment buttons readily accessible


### Test: CLI-006 - Edit Client Modal
**Status**: ✅ PASS
**Observations**:
- Edit Client modal opens correctly
- Modal title: "Edit Client - Update client information for REG0008"
- Form fields present and pre-populated:
  - Client Name * (required): "Nolan Distribution"
  - Email: "contact_nolan62@example.com"
  - Phone: "929.468.3076"
  - Address (textarea): "686 Shanahan Club, Los Angeles, CA 96645"
- Client Types checkboxes:
  - Buyer (checked - shown as blue/active)
  - Seller
  - Brand
  - Referee
  - Contractor
- Action buttons: Cancel, Save Changes (blue primary button)
- Close (X) button in top right

**UX Observations**:
- Form is clean and well-organized
- Required field marked with asterisk (*)
- Cancel and Save buttons clearly visible


### Test: ORD-001 - Orders Page Navigation
**Status**: ✅ PASS
**URL**: /orders
**Observations**:
- Orders page loaded successfully
- Page title: "Orders - Manage draft and confirmed orders"
- Two main tabs: Draft Orders (0), Confirmed Orders (0)
- "New Order" button (blue, primary action)
- "Export CSV" button available
- "Configure Display" button for customization

**Order Statistics Cards** (clickable KPIs):
| Metric | Count | Description |
|--------|-------|-------------|
| Total Orders | 400 | all orders |
| Pending | 137 | awaiting fulfillment |
| Packed | 126 | ready to ship |
| Shipped | 137 | in transit |

**Search & Filter**:
- Search input: "Search by order number or client name..."
- Status filter dropdown: "All Statuses"

**Empty State**:
- "No confirmed orders" message displayed
- Helpful text: "Confirmed orders will appear here once you confirm a draft order."

**UX Observations**:
- KPI cards are clickable (hint attributes present)
- Good empty state messaging
- Export functionality available


### Test: ORD-002 - Draft Orders Tab
**Status**: ✅ PASS
**Observations**:
- Draft Orders tab switched successfully
- Shows different KPI cards for drafts:
  - Total Draft Orders: 0
  - Total Value: $0.00
- Search input available for draft orders
- Empty state message: "No draft orders - Create a draft order to save work in progress without reducing inventory."
- "Create Draft Order" button (blue) in empty state
- Good UX: explains what draft orders are for


### Test: ORD-004 - Create New Order Page
**Status**: ✅ PASS
**URL**: /orders/create
**Observations**:
- Order Creator page loaded successfully
- Page title: "Create Sales Order - Build order with COGS visibility and margin management"
- Breadcrumb: Home > Orders > Create
- "Back to Orders" button available
- Order type dropdown: "Sale" (default selected)
- Customer selection: "Select Customer *" (required field)
- Search combobox: "Search for a customer..."
- Empty state: "Select a customer to begin - Choose a customer from the dropdown above"

**UX Observations**:
- Clear workflow - must select customer first
- COGS visibility mentioned (good for margin tracking)
- Required field marked with asterisk


### Test: ORD-004b - Customer Selection Dropdown
**Status**: ✅ PASS
**Observations**:
- Customer dropdown opens correctly
- Search input available: "Search clients..."
- Customers displayed with:
  - Name (e.g., "Lake Kamronport Dispensary")
  - Type badge (e.g., "Buyer")
  - Email (e.g., "contact.lake98@example.com")
- Multiple customers visible in scrollable list
- Customers listed:
  1. Lake Kamronport Dispensary
  2. Nolan Distribution
  3. Sipes Collective
  4. Charleschester Farms
  5. second Supply
  6. Stamm Dispensary
  7. Mayer Cannabis Co
  8. same Gardens
  9. East Electa Wellness

**UX Observations**:
- Good searchable dropdown
- Customer type clearly visible
- Email helps identify correct customer


### Test: ORD-004c - Order Creation After Customer Selection
**Status**: ⚠️ ISSUE FOUND
**Severity**: HIGH

**Issue**: "Failed to load inventory" error displayed in red
- Error message: "Failed to load inventory"
- "Retry" button available but inventory section shows error state

**What Loaded Successfully**:
- Customer selected: "Nolan Distribution" ✅
- "Referred By (Optional)" dropdown available
- Order Totals panel showing:
  - Subtotal: $0.00
  - Total COGS: $0.00
  - Total Margin: $0.00 (0.0%)
  - Total: $0.00
- "No Credit Limit Set" warning: "This client doesn't have a credit limit configured. Calculate one from their profile."
- Line Items section with "Add Item" button
- Empty state: "No items added yet. Click 'Add Item' to get started."
- Order-Level Adjustment section visible
- Client Preview panel: "This is what Nolan Distribution will see"
- **"Order has validation errors"** - red warning banner

**Critical Issues**:
1. ❌ Inventory failed to load - cannot add products to order
2. ⚠️ Validation errors shown before user attempts to submit
3. ⚠️ No credit limit configured for client (business logic gap)


### Test: ORD-004d - Retry Button Behavior
**Status**: ❌ FAIL - UX BUG
**Severity**: MEDIUM

**Issue**: Clicking "Retry" button reset the entire form
- Customer selection was cleared (was "Nolan Distribution", now shows "Search for a customer...")
- User loses all progress when clicking Retry
- Expected behavior: Should only retry loading inventory, not reset form

**Bug Report**:
- **Location**: /orders/create
- **Steps to Reproduce**:
  1. Select a customer from dropdown
  2. Observe "Failed to load inventory" error
  3. Click "Retry" button
- **Expected**: Inventory reloads, customer selection preserved
- **Actual**: Entire form resets, customer selection lost


### Test: PROD-001 - Products Page Navigation
**Status**: ✅ PASS (with data issue)
**URL**: /products
**Observations**:
- Products page loaded successfully
- Page title: "Product Catalogue - Manage your unified product catalogue for sales workflow"
- Table columns: Product Name, Category, Subcategory, Brand, Strain, UOM, Actions
- "Add Product" button (blue, primary)
- "Show Archived" button available
- Search input with "Columns" dropdown for customization
- Pagination: "10 / page" dropdown, Previous/Next buttons

**Data Issue**:
- "No results found" - Products table is empty
- "Showing 0 - 0 of 0"
- This explains why inventory failed to load in Order Creator

**This is a critical data gap**: No products in the system means orders cannot be created.


### Test: PROD-004 - Add New Product Modal
**Status**: ✅ PASS
**Observations**:
- "Add New Product" modal opens correctly
- Subtitle: "Create a new product in the catalogue"
- Form fields:
  - Product Name * (required): text input
  - Brand *: dropdown "Select a brand"
  - Category *: text input with placeholder "e.g., Flower, Concentrate, Edible"
  - Subcategory: text input with placeholder "e.g., Indoor, Outdoor, Live Rosin"
  - Strain: dropdown defaulting to "No Strain"
  - Unit of Measure: dropdown defaulting to "Each (EA)"
  - Description: textarea (optional)
- Action buttons: Cancel, Create Product (blue)
- Close (X) button in top right

**UX Observations**:
- Good placeholder text with examples
- Required fields marked with asterisk
- Cannabis-specific fields (Strain) included
- UOM dropdown for inventory tracking


### Test: ACC-005 - Invoices Page
**Status**: ✅ PASS
**URL**: /accounting/invoices
**Observations**:
- Invoices page loaded successfully with data
- Page title: "Invoices - Manage customer invoices and accounts receivable"
- Breadcrumb: Home > AR/AP > Invoices
- "Back to Accounting" button available

**Summary KPIs**:
| Metric | Value |
|--------|-------|
| Total Invoices | 50 |
| Total Billed | $1,117,509.73 |
| Amount Due | $143,934.90 |

**Action Buttons**:
- "Show AR Aging" - for aging report
- "Export CSV" - data export
- "New Invoice" (blue, primary)

**Filters**:
- Search input: "Search invoices..."
- Status dropdown: "All Statuses"

**Invoice Table Columns**:
Invoice #, Invoice Date, Due Date, Total, Paid, Due, Status, Actions

**Invoice Statuses Observed**:
- Paid (green badge) - majority of invoices
- Sent (yellow/orange badge) - pending payment
- Overdue (red badge) - past due date

**Sample Data**:
- INV-000021: Dec 13, 2025 - $2,109.67 - Paid
- INV-000006: Nov 30, 2025 - $35,283.31 - Sent (unpaid)
- INV-000019: Jul 25, 2025 - $36,663.98 - Overdue

**UX Observations**:
- Good color-coded status badges
- Clear financial summary at top
- Export functionality available
- Data is well-organized


### Test: ACT-002 - Invoice Detail Modal with Quick Actions
**Status**: ✅ PASS
**Feature**: Financials made actionable (per roadmap ACT-002)

**Invoice Detail Modal**:
- Modal title: "Invoice INV-000021" with "Paid" status badge (green)
- Close (X) button in top right

**Invoice Details Section**:
| Field | Value |
|-------|-------|
| Invoice Date | Dec 13, 2025 |
| Due Date | Jan 12, 2026 |

**Amount Summary Section**:
| Field | Value |
|-------|-------|
| Total Amount | $2,109.67 |
| Amount Paid | $2,109.67 (green) |
| Amount Due | $0.00 (green) |

**Quick Actions Section** (ACT-002 Feature):
1. ✅ "Mark as Paid" button (blue, primary) - for recording payments
2. ✅ "Send Payment Reminder" button - for following up on unpaid invoices
3. ✅ "Download PDF" button - for generating invoice PDF

**UX Observations**:
- Quick actions are prominently displayed
- Color coding helps identify payment status
- All three actions from ACT-002 spec are implemented
- Modal is clean and focused on key information


### Test: SET-001 - Settings Page Navigation
**Status**: ⚠️ PARTIAL FAIL - Authentication Issue
**URL**: /settings
**Severity**: MEDIUM

**What Loaded**:
- Settings page structure loaded
- Page title: "Settings - Manage system configurations and master data"
- Multiple tabs visible:
  - Users
  - User Roles
  - Roles
  - Permissions
  - Locations
  - Categories
  - Grades
  - Database
  - Feature Flags
  - VIP Access
  - Notifications
  - Calendars

**Issue Found**:
- Error message: "Failed to load users: Authentication required. Please log in to perform this action."
- "Try Again" button displayed
- Users tab content failed to load due to authentication

**Analysis**:
- User is logged in as "Public Demo User" (visible in header)
- But Settings/Users tab requires additional authentication
- This may be a permissions issue (demo user lacks admin rights)
- Or could be a session/token issue

**UX Issue**:
- Error message is shown but user appears logged in
- Confusing experience - should either hide the tab or show clearer permission denied message


### Test: SET-002 - Feature Flags Tab
**Status**: ✅ PASS
**Observations**:
- Feature Flags tab loaded successfully (no authentication error)
- Title: "Feature Flags - Manage feature availability across the application"
- Description: "Feature flags allow you to enable or disable features for specific users, roles, or the entire system."
- "Open Feature Flags Manager" button (blue) available

**Comparison to Users Tab**:
- Feature Flags tab works without authentication error
- Users tab fails with authentication error
- Inconsistent behavior between tabs


### Test: INV-001 - Batches/Inventory Page
**Status**: ✅ PASS
**URL**: /inventory
**Observations**:
- Inventory page loaded successfully with extensive data
- Page title: "Inventory - Manage batches, track stock levels, and control product lifecycle"

**Summary KPIs** (Clickable):
| Metric | Value | Description |
|--------|-------|-------------|
| Total Inventory Value | $62,318,693.66 | 57,119.27 total units |
| Avg Value per Unit | $1,195.87 | Average COGS per unit |
| Awaiting Intake | 22 | 22 batches pending |
| Low Stock | 37 | ≤100 units available |

**Action Buttons**:
- "Saved Views" dropdown
- "Save View" button
- "Export CSV" for data export
- "New Purchase" (blue, primary)
- "Configure Display" for customization

**Table Columns**:
SKU, Product, Brand, Vendor, Grade, Status, On Hand, Reserved, Available, Actions

**Batch Statuses Observed**:
- Live (active inventory)
- Awaiting Intake (pending processing)
- On Hold (paused)
- Sold Out (depleted)

**Sample Data**:
- SKU-0020-0040-200: Chemdawg - Greenhouse AAA Shake (Awaiting Intake)
- SKU-0019-0039-199: Bubba Kush - Indoor AAA Shake (Live)
- Multiple cannabis strains with proper categorization

**Action Buttons per Row**:
- "View" - view batch details
- "Intake" - for batches awaiting intake

**UX Observations**:
- Rich data table with sorting (column headers are buttons)
- Advanced Filters section (collapsible)
- Search by SKU, batch code, or product name
- Checkbox selection for bulk actions
- Good cannabis-specific fields (Strain, Grade)

**Note**: This page has inventory data, but Products page was empty - data inconsistency issue.


### Test: INV-002 - View Batch Details
**Status**: ❌ CRITICAL FAIL
**Severity**: HIGH

**Issue**: Application crashed when clicking "View" button on a batch
- Error message: "An unexpected error occurred. This error has been automatically reported to our team."
- Error ID: 121a0be04a8540809b3d74d1bb66818
- Full page crash - navigation and sidebar disappeared
- Recovery options: "Try Again" and "Reload Page" buttons

**Bug Report**:
- **Location**: /inventory - View button on batch row
- **Steps to Reproduce**:
  1. Navigate to /inventory (Batches page)
  2. Click "View" button on any batch row
- **Expected**: Batch detail modal or page opens
- **Actual**: Application crashes with error page

**Impact**: Users cannot view batch details, which is a core inventory management function.


### Test: SAMP-001 - Samples Page
**Status**: ✅ PASS (empty state)
**URL**: /samples
**Observations**:
- Samples page loaded successfully
- Page title: "Sample Management - Track sample requests, approvals, and returns."
- "New Sample" button (blue, primary)
- Search input: "Search samples..."

**Tab Filters**:
| Tab | Count |
|-----|-------|
| All Samples | 0 |
| Pending | 0 |
| Approved | 0 |
| Return Requested | - |
| Returned | - |
| Vendor Returns | - |

**Sidebar Widget**:
- "Expiring Samples" section
- Message: "No samples expiring in the next 30 days."

**Empty State**:
- "No samples match the current filters."

**UX Observations**:
- Good tab-based filtering for sample workflow
- Expiring samples alert is useful for cannabis compliance
- Clean empty state message


### Test: SAMP-002 - Create Sample Request Modal
**Status**: ✅ PASS
**Observations**:
- "Create Sample Request" modal opens correctly
- Subtitle: "Enter details for the new sample request. Products and clients are searchable to speed up entry."

**Form Fields**:
| Field | Type | Required | Placeholder/Options |
|-------|------|----------|---------------------|
| Product | Text (searchable) | Yes | "Search product by name or ID" |
| Client | Dropdown | Yes | Select a client, Trinity Alps Cultivation, SoCal Premium Supply, etc. |
| Quantity | Number | Yes | "e.g. 5" |
| Due Date | Date picker | Yes | mm/dd/yyyy |
| Notes | Textarea | No | "Add any extra details or special handling notes" |

**Action Buttons**:
- Cancel
- Create Sample (blue)
- Close (X)

**UX Observations**:
- Good searchable product field
- Client dropdown pre-populated with vendors
- Date picker for due date
- Notes field for special handling (useful for cannabis samples)


### Test: REP-001 - Reports/Analytics Page
**Status**: ✅ PASS
**URL**: /analytics
**Observations**:
- Analytics page loaded successfully with comprehensive data
- Page title: "Analytics - Business intelligence and insights for your operations"
- "Back to Dashboard" button available
- Date range selector: "Last 30 Days" dropdown
- "Export" button for data export

**Report Tabs**:
- Overview (default)
- Sales
- Inventory
- Clients

**Overview KPIs**:
| Metric | Value | Description |
|--------|-------|-------------|
| Total Revenue | $72,583,783.86 | Total from all orders |
| Period Revenue | $1,075,427.66 | -62.0% vs previous period |
| Avg Order Value | $181,459.46 | Average per order |
| Outstanding Balance | $71,963,875.42 | Unpaid invoices |
| Total Orders | 400 | 6 this period |
| Active Clients | 24 | 14 new this period |
| Inventory Items | 200 | Active batches in inventory |
| Payments Received | $619,908.44 | Total collected |

**Revenue Trends Table**:
| Period | Revenue | Orders | Avg Order |
|--------|---------|--------|-----------|
| 2025-01 | $3,696,424.79 | 21 | $176,020.23 |
| 2025-02 | $3,105,046.05 | 20 | $155,252.30 |
| 2025-03 | $4,220,529.46 | 21 | $200,977.59 |
| 2025-04 | $3,675,897.93 | 20 | $183,794.90 |
| 2025-05 | $2,251,539.22 | 15 | $150,102.61 |
| 2025-06 | $4,664,017.64 | 22 | $212,000.80 |

**Action Button**:
- "Export Revenue Data" button at bottom

**UX Observations**:
- Good period comparison (-62.0% indicator)
- Comprehensive KPIs covering all business areas
- Export functionality available
- Clean tabbed interface for different report types


### Test: CRED-001 - Credit Settings Page
**Status**: ✅ PASS
**URL**: /credit-settings
**Observations**:
- Credit Settings page loaded successfully
- Page title: "Credit Settings - Configure credit calculation weights and visibility settings"
- "Back to Dashboard" button available

**Tabs**:
- Signal Weights (default)
- Visibility & Enforcement

**Info Box**:
"How Credit Weights Work: Each signal is scored 0-100. The score is multiplied by its weight to calculate contribution to the credit health score. All weights must sum to 100%."

**Signal Weights Configuration** (with sliders):
| Signal | Weight | Description | Impact |
|--------|--------|-------------|--------|
| Revenue Momentum | 20% | Growth rate of recent vs historical revenue | Rewards clients with increasing order volumes |
| Cash Collection Strength | 25% | Speed and reliability of payment collection | Rewards clients who pay invoices quickly |
| Profitability Quality | 20% | Profit margin quality and stability | Rewards clients with strong margins |
| Debt Aging Risk | 15% | Age and management of outstanding debt | Penalizes clients with old, unpaid invoices |
| Repayment Velocity | 10% | Rate of debt repayment vs new charges | Rewards clients actively paying down balance |
| Tenure & Relationship | 10% | Length and depth of business relationship | Rewards long-term clients |

**Total Weight**: 100% (Valid - green indicator)

**Action Buttons**:
- Save Changes
- Reset
- Reset to Defaults

**UX Observations**:
- Excellent credit scoring system with adjustable weights
- Clear explanations for each signal
- Visual sliders for easy adjustment
- Validation ensures weights sum to 100%
- Cannabis-specific credit management (important for industry)


### Test: CAL-001 - Calendar Page
**Status**: ✅ PASS
**URL**: /calendar
**Observations**:
- Calendar page loaded successfully
- Currently showing: January 2026 (month view)
- "Back to Dashboard" button available

**Navigation Controls**:
- Previous/Next buttons for period navigation
- "Today" button to return to current date
- View toggles: Month, Week, Day, Agenda

**Action Buttons**:
- "Create Event" (blue, primary)
- "Filters" button

**Calendar Tabs**:
- Calendar (default)
- Requests
- Time Off

**Calendar Grid**:
- Full month view displayed
- Days 28-31 (Dec) through Jan 1-31 and into Feb 1-7
- Today (Jan 7, 2026) highlighted with blue circle
- Clean grid layout with clickable dates

**UX Observations**:
- Standard calendar interface
- Multiple view options (Month/Week/Day/Agenda)
- Event creation available
- Time Off tracking (useful for team management)
- Requests tab (likely for PTO or scheduling requests)


### Test: PO-001 - Purchase Orders Page
**Status**: ✅ PASS
**URL**: /purchase-orders
**Observations**:
- Purchase Orders page loaded successfully with data
- Page title: "Purchase Orders - Manage purchase orders for supplier inventory"
- "Back to Dashboard" button available

**Search & Filter**:
- Search input: "Search by PO number or supplier..."
- Status filter dropdown: "All Statuses"

**Action Button**:
- "Create PO" (blue, primary)

**Table Columns**:
PO Number, Supplier, Order Date, Expected Delivery, Status, Total, Actions

**Sample PO Data**:
| PO Number | Supplier | Order Date | Expected Delivery | Status | Total |
|-----------|----------|------------|-------------------|--------|-------|
| PO-2025-0003 | Humboldt Harvest Co | 12/31/2025 | - | DRAFT | $60,000.00 |
| PO-2025-0002 | SoCal Premium Supply | 12/31/2025 | - | DRAFT | $500.00 |
| PO-2025-0001 | SoCal Premium Supply | 12/31/2025 | - | DRAFT | $1,000.00 |

**Row Actions** (icon buttons):
- View/Edit (document icon)
- Delete (trash icon)

**UX Observations**:
- Clean table layout
- All POs currently in DRAFT status
- Expected Delivery shows "-" (not set)
- Good supplier management integration


### Test: SPREAD-001 - Spreadsheet View Page
**Status**: ⚠️ PARTIAL - Empty Grid
**URL**: /spreadsheet-view
**Observations**:
- Spreadsheet View page loaded
- Page title: "Spreadsheet View - Familiar grid workflows backed by existing TERP validations, permissions, and audit logs."
- Feature Flag indicator: "Feature Flag: spreadsheet-view"

**Tabs Available**:
- Inventory (default)
- Intake
- Pick & Pack
- Clients

**Inventory Grid Header**:
- Title: "Inventory Grid"
- Subtitle: "Sorted by Date and Vendor. Click column headers to re-sort."
- Total Available: 28,418.56
- "Refresh" button

**Issue Found**:
- Grid area is completely empty - no data rows displayed
- Despite showing "Total Available: 28,418.56", no inventory items are visible
- This may be a rendering issue or data loading problem

**UX Observations**:
- Feature flag indicator is helpful for beta features
- Grid should show inventory data but appears empty
- Inconsistent with Batches page which shows 200 items


### Test: SPREAD-001b - Spreadsheet View Refresh
**Status**: ❌ FAIL - Grid Not Loading
**Severity**: MEDIUM

**Issue Confirmed**: After clicking Refresh, the grid still shows no data.
- Total Available shows 28,418.56 units
- But no rows are rendered in the grid
- This is a data rendering bug - the data exists but isn't being displayed

**Bug Report**:
- **Location**: /spreadsheet-view (Inventory tab)
- **Steps to Reproduce**:
  1. Navigate to Spreadsheet View
  2. Observe empty grid
  3. Click Refresh button
  4. Grid remains empty
- **Expected**: Grid should display inventory items
- **Actual**: Grid is empty despite showing total available units


### Test: SEARCH-001 - Global Search Functionality
**Status**: ⚠️ UX ISSUE
**URL**: /search?q=OG%20Kush
**Observations**:
- Search navigated to dedicated search page
- URL contains query parameter: ?q=OG%20Kush
- But search was NOT executed automatically

**Issue Found**:
- User typed "OG Kush" and pressed Enter
- Navigated to /search page
- But results show: "Enter a search query to find quotes, customers, and products."
- The query from URL was not used to auto-search
- User must re-enter the search term

**Expected Behavior**:
- Search should execute automatically with the query parameter
- OR the search field should be pre-populated with the query

**Actual Behavior**:
- Search page shows empty state
- Query parameter is ignored
- User must search again

**UX Bug**: Query parameter not being used to execute search


### Test: SEARCH-002 - Search Execution
**Status**: ❌ FAIL - Search Not Finding Data
**Severity**: HIGH

**Issue**: Search returns no results for "OG Kush" despite inventory having this product
- Search executed: "OG Kush"
- Result: "No results found for 'OG Kush' - Try a different search term"

**Data Verification**:
- Batches page shows "OG Kush - Indoor AAA Whole Flower" (SKU-0001-0021-181)
- Product exists in inventory with 390.69 units available
- But global search cannot find it

**Bug Report**:
- **Location**: /search
- **Steps to Reproduce**:
  1. Use global search in header
  2. Search for "OG Kush"
  3. Observe no results
- **Expected**: Should find OG Kush batch/product
- **Actual**: "No results found"

**Impact**: Users cannot use global search to find products, severely limiting usability.


### Test: ACC-001 - AR/AP Accounting Dashboard
**Status**: ✅ PASS
**URL**: /accounting
**Observations**:
- Accounting Dashboard loaded successfully with comprehensive data
- Page title: "Accounting Dashboard - Overview of your financial health and key metrics"
- "Back to Accounting" and "Configure Display" buttons available

**Financial KPIs** (Clickable):
| Metric | Value | Description |
|--------|-------|-------------|
| Cash Balance | $0.00 | cash balance |
| Accounts Receivable | $143,934.90 | accounts receivable |
| Accounts Payable | $0.00 | accounts payable |
| Net Position | $143,934.90 | AR minus AP |

**AR Aging Breakdown**:
| Period | Amount |
|--------|--------|
| Current | - |
| 30 Days | $41,827 |
| 60 Days | - |
| 90 Days | - |
| 90+ Days | $102,108 |

**AP Aging**: All periods show no amounts (no payables)

**Quick Actions** (6 buttons):
1. Receive Payment (green)
2. Pay Vendor (yellow/orange)
3. Post Journal Entry
4. Create Invoice
5. Create Bill
6. Record Expense

**Recent Activity Sections**:
- Recent Invoices (with View All)
- Recent Bills: "No recent bills"
- Recent Payments (with View All)

**Sample Recent Invoices**:
- INV-000021: Dec 13, 2025 - $2,109.67 - Paid
- INV-000006: Nov 30, 2025 - $35,283.31 - Sent

**Sample Recent Payments**:
- PAY-000019: Jan 07, 2026 - $2,109.67 - Received
- PMT-RCV-2025-044553: Dec 31, 2025 - $100.00 - Received

**UX Observations**:
- Excellent dashboard layout with all key financial metrics
- AR Aging visualization helps identify overdue accounts
- Quick actions provide easy access to common tasks
- Color-coded status badges (Paid=green, Sent=yellow)


### Test: UI-001 - Dark Mode Toggle
**Status**: ✅ PASS
**Observations**:
- Dark mode toggle works correctly
- Button hint changed from "Switch to dark mode" to "Switch to light mode"
- UI successfully switched to dark theme:
  - Background changed to dark
  - Text changed to light colors
  - Sidebar changed to dark theme
  - Cards and components properly styled for dark mode
- All content remains readable and functional
- Color-coded elements (green Paid, yellow Sent) still visible

**UX Observations**:
- Smooth transition to dark mode
- Proper contrast maintained
- All UI elements properly themed


### Test: UI-002 - Notifications Dropdown
**Status**: ✅ PASS
**Observations**:
- Notifications dropdown opens correctly
- Shows "Notifications" header
- Empty state message: "No notifications yet"
- Clean dropdown design with icon

**UX Observations**:
- Good empty state messaging
- Dropdown positioned correctly below the bell icon
- Ready to display notifications when they exist


### Test: ACC-002 - Receive Payment Quick Action
**Status**: ✅ PASS
**Observations**:
- "Receive Client Payment" modal opens correctly
- Subtitle: "Quick action for recording client cash drop-offs"
- Form fields:
  - Client: Dropdown "Select a client"
- Action buttons:
  - Cancel
  - "Record Payment & Generate Receipt" (blue, primary with checkmark icon)
- Close (X) button in top right

**UX Observations**:
- Simple, focused modal for quick payment recording
- Receipt generation included in workflow
- Good for cannabis cash transactions (common in industry)


### Test: USER-001 - Users Page
**Status**: ❌ FAIL - Authentication Error
**URL**: /users
**Severity**: MEDIUM

**Issue**: Same authentication error as Settings > Users tab
- Error message: "Failed to load users: Authentication required. Please log in to perform this action."
- "Try Again" button available
- User appears logged in as "Public Demo User" but cannot access user management

**Analysis**:
- This is consistent with the Settings page Users tab error
- Demo user likely lacks admin permissions for user management
- However, the page should either:
  1. Show a "Permission Denied" message instead of "Authentication required"
  2. Hide the Users menu item for non-admin users

**UX Issue**: Confusing error message - user is authenticated but message says "Please log in"


### Test: DASH-001 - Main Dashboard
**Status**: ✅ PASS (with minor issues)
**URL**: / (root)
**Observations**:
- Dashboard loaded successfully with comprehensive business metrics
- Page title: "Dashboard - Overview of your business metrics and activity"
- Version indicator: v1.0.0

**Header Actions**:
- "Customize" button for dashboard customization
- "Comments" button for collaboration

**Dashboard Widgets**:

**1. CashFlow Widget**:
| Metric | Value |
|--------|-------|
| Cash Collected | $619,908.44 |
| Cash Spent | $0.00 |
- Time filter: "All Time" dropdown
- "View All" link

**2. Sales Leaderboard** (ACT-001 Feature):
| Rank | Client | Total Sales |
|------|--------|-------------|
| 1 | Nolan Distribution | $167,795 |
| 2 | Stamm Dispensary | $136,179 |
| 3 | Mayer Cannabis Co | $130,057 |
| 4 | Charleschester Farms | $127,537 |
| 5 | same Gardens | $125,404 |
| 6 | Sipes Collective | $117,673 |
| 7 | Lake Kamronport Dispensary | $108,371 |
| 8 | NorCal Farms | $83,385 |
| 9 | second Supply | $61,459 |
| 10 | East Electa Wellness | $59,650 |
- Rows are clickable (verified earlier - ACT-001)

**3. Transaction Snapshot**:
| Metric | Today | This Week |
|--------|-------|-----------|
| Sales | $0 | $0 |
| Cash Collected | $2,110 | $2,210 |
| Units Sold | 0 | 0 |
- "View Orders" link

**4. Inventory Snapshot**:
- Shows loading bars (appears to be loading)

**5. Total Debt Widget**:
| Metric | Value |
|--------|-------|
| Total Debt Owed to Me | $143,934.90 |
| Total Debt I Owe Vendors | $0.00 |

**6. Sales - Time Period Comparison**:
| Period | Last Period | Prior Period | Variance |
|--------|-------------|--------------|----------|
| Weekly | $0 | $0 | +0% |
| Monthly | $2,110 | $41,827 | -95% |
| 6 Month | $216,018 | $279,314 | -23% |
| Yearly | $495,332 | $598,680 | -17% |

**7. Profitability Analysis**: "Loading..." (may be slow to load)

**8. Matchmaking Opportunities**:
- "0 high-priority opportunities • 0 urgent needs"
- "No matchmaking opportunities at this time"

**Minor Issues**:
- Profitability Analysis shows "Loading..." (may be a slow query)
- Inventory Snapshot appears to be loading


### Test: CLIENT-002 - Client Profile Page (from Dashboard click)
**Status**: ✅ PASS
**URL**: /clients/23
**Feature Verified**: ACT-001 - KPIs are actionable (clicking client in leaderboard navigates to profile)

**Client Header**:
- TERI Code: REG0002
- Type Badge: "Buyer" (blue)
- Name: Mayer Cannabis Co
- Email: contact.mayer@example.com
- Phone: (478) 731-3506 x60133
- "Edit Client" button (blue)
- More options button (three dots)

**Client KPIs**:
| Metric | Value |
|--------|-------|
| Total Spent | $653,935.70 |
| Total Profit | $0.00 |
| Avg Profit Margin | 0.00% |
| Amount Owed | $412,030.19 (Oldest: 653 days) |

**Profile Tabs** (9 tabs):
1. Overview (default)
2. Transactions
3. Payments
4. Pricing
5. Needs
6. Comms
7. Calendar
8. Notes
9. Catalog

**Overview Tab Content**:

**Credit Status Section**:
- "No Credit Limit Set"
- "Calculate a credit limit based on this client's financial history"
- "Calculate" button (blue)

**Purchase Patterns & Predictions Section**:
- Sub-tabs: Purchase History (0), Reorder Predictions (0), Summary
- Empty state: "No purchase history - Purchase patterns will appear after client makes orders"

**VIP Client Portal Section**:
- Status: "Disabled"
- "Portal Access - Enable to give client portal access"
- "Enable" button

**Customer Wishlist Section**:
- "Edit" button
- Empty state: "No wishlist items yet. Click Edit to add products or strains this customer is looking for."

**Client Information Section**:
| Field | Value |
|-------|-------|
| TERI Code | REG0002 |
| Name | Mayer Cannabis Co |
| Email | contact.mayer@example.com |
| Phone | (478) 731-3506 x60133 |
| Address | 3829 Swaniawski Lock, Oakland, CA 99996 |
| Tags | retail, cannabis |

**Recent Activity**: "No activity yet"

**Comments Section**: "Team notes and discussions about this client"

**UX Observations**:
- Comprehensive client profile with all relevant business data
- Good organization with tabs
- Credit calculation feature available
- VIP portal access control
- Wishlist for customer preferences (cannabis-specific)


### Test: CLIENT-003 - Client Transactions Tab
**Status**: ✅ PASS
**Observations**:
- Transactions tab loaded successfully with data
- Title: "Transaction History - All transactions (invoices, quotes, orders, etc.)"
- "Add Transaction" button (blue)
- Search input: "Search transactions..."

**Transaction Table Columns**:
Transaction #, Type, Date, Amount, Payment Status, Notes, Audit, Actions

**Sample Transactions**:
| Transaction # | Type | Date | Amount | Payment Status | Actions |
|---------------|------|------|--------|----------------|---------|
| ORD-000050 | ORDER | Dec 14, 2025 | $282,717.49 | PENDING | Record Payment |
| ORD-000346 | ORDER | Oct 27, 2025 | $34,183.34 | PAID (green) | - |
| ORD-000018 | ORDER | Jan 19, 2025 | $16,535.00 | PAID (green) | - |
| ORD-000090 | ORDER | Dec 14, 2024 | $61,920.61 | PAID (green) | - |
| ORD-000138 | ORDER | Jul 29, 2024 | $72,908.57 | PARTIAL | Record Payment |
| ORD-000378 | ORDER | Apr 23, 2024 | $15,106.07 | PAID (green) | - |
| ORD-000026 | ORDER | Apr 18, 2024 | $17,754.88 | PARTIAL | Record Payment |

**Payment Status Badges**:
- PENDING (yellow/orange)
- PAID (green)
- PARTIAL (yellow)

**Actions**:
- "Record Payment" button available for unpaid/partial transactions
- Audit column for tracking changes

**UX Observations**:
- Good transaction history with all relevant details
- Quick action to record payments directly from transaction list
- Color-coded payment status for easy identification


### Test: CLIENT-004 - Client Pricing Tab
**Status**: ✅ PASS
**Observations**:
- Pricing tab loaded successfully
- Title: "Pricing Configuration - Manage pricing rules and profiles for this client"

**Apply Pricing Profile Section**:
- Dropdown: "Select a pricing profile..."
- "Apply" button (blue)
- Helper text: "Applying a profile will add all its rules to this client's pricing configuration"

**Active Pricing Rules Section**:
- Empty state: "No pricing rules configured for this client"
- Helper text: "Apply a pricing profile to get started"

**COGS Settings** (visible in elements):
- Dropdown: "No Adjustment"
- Input field: "0.00" (number input)
- "Save COGS Settings" button

**UX Observations**:
- Client-specific pricing configuration available
- Can apply pricing profiles for bulk rule application
- COGS (Cost of Goods Sold) adjustment settings available
- Good for cannabis industry where pricing varies by client relationship


### Test: CLIENT-005 - Client Catalog Tab
**Status**: ⚠️ SLOW LOADING
**Observations**:
- Catalog tab shows loading spinner
- Content area is blank with loading indicator
- May be loading live catalog data for this client

**Potential Issue**:
- Catalog tab takes longer to load than other tabs
- No timeout or error message shown yet
- May need performance optimization


### Test: ORDER-002 - Direct Navigation to /orders/new
**Status**: ❌ FAIL - 404 Error
**URL**: /orders/new
**Severity**: HIGH

**Issue**: Direct navigation to /orders/new returns 404 Page Not Found
- Error message: "404 Page Not Found"
- Description: "Sorry, the page you are looking for doesn't exist. It may have been moved or deleted."
- "Go Home" button available

**Analysis**:
- The "New Order" button on /orders page works and navigates to order creator
- But direct URL /orders/new returns 404
- This suggests the order creator may be at a different URL or uses client-side routing only

**Impact**:
- Users cannot bookmark the new order page
- Deep linking to order creation is broken
- Refreshing while on order creator may cause 404

**Bug Report**:
- **Location**: /orders/new
- **Steps to Reproduce**: Navigate directly to https://terp-app-b9s35.ondigitalocean.app/orders/new
- **Expected**: Order creator page loads
- **Actual**: 404 Page Not Found


### Test: ORDER-003 - Order Creator Page
**Status**: ✅ PASS
**URL**: /orders/create (not /orders/new)
**Observations**:
- Order creator page loaded successfully
- Title: "Create Sales Order"
- Subtitle: "Build order with COGS visibility and margin management"
- "Back to Orders" button

**Order Type Selector**:
- Dropdown showing "Sale" (default)
- Other options likely available (Purchase, etc.)

**Customer Selection**:
- Label: "Select Customer *" (required field)
- Searchable dropdown: "Search for a customer..."
- Empty state: "Select a customer to begin - Choose a customer from the dropdown above"

**Note**: The correct URL is /orders/create, not /orders/new. The 404 error earlier was due to wrong URL assumption.


### Test: ORDER-004 - Customer Selection Dropdown
**Status**: ✅ PASS
**Observations**:
- Customer dropdown opens correctly
- Searchable input: "Search clients..."
- Shows list of available customers with details

**Customer List Format**: Each option shows:
- Company Name
- Type (Buyer)
- Email address

**Sample Customers Available**:
| Customer | Type | Email |
|----------|------|-------|
| Lake Kamronport Dispensary | Buyer | contact.lake98@example.com |
| Nolan Distribution | Buyer | contact_nolan62@example.com |
| Sipes Collective | Buyer | contact.sipes@example.com |
| Charleschester Farms | Buyer | contact_charleschester99@example.com |
| second Supply | Buyer | contact.second@example.com |
| Stamm Dispensary | Buyer | contact_stamm@example.com |
| Mayer Cannabis Co | Buyer | contact.mayer@example.com |
| same Gardens | Buyer | contact.same19@example.com |
| East Electa Wellness | Buyer | contact_east@example.com |

**UX Observations**:
- Good searchable dropdown
- Shows relevant customer info for selection
- Type badge helps identify customer relationship


### Test: ORDER-005 - Order Creator After Customer Selection
**Status**: ❌ FAIL - Inventory Loading Error
**Severity**: CRITICAL

**Issue**: After selecting customer, inventory fails to load
- Error message: "Failed to load inventory"
- "Retry" button available
- Order cannot be completed without inventory

**Page State After Customer Selection**:
- Customer selected: "Nolan Distribution"
- "Referred By (Optional)" dropdown: "Select referrer..."
- Inventory section shows error

**Right Sidebar - Credit Status**:
- "No Credit Limit Set"
- "This client doesn't have a credit limit configured. Calculate one from their profile."

**Order Totals Section**:
| Field | Value |
|-------|-------|
| Subtotal | $0.00 |
| Total COGS | $0.00 |
| Total Margin | $0.00 (0.0%) |
| **Total** | **$0.00** |

**Validation Status**: "Order has validation errors" (red button)

**Line Items Section**:
- "Add Item" button (blue)
- Empty state: "No items added yet. Click 'Add Item' to get started."

**Order-Level Adjustment Section**: Visible but not yet tested

**Client Preview Section**:
- "Invoice" link
- "This is what Nolan Distribution will see"

**Bug Report**:
- **Location**: /orders/create
- **Steps to Reproduce**:
  1. Click "New Order" from Orders page
  2. Select any customer (e.g., Nolan Distribution)
  3. Observe "Failed to load inventory" error
- **Expected**: Inventory loads and products can be added to order
- **Actual**: Inventory fails to load, blocking order creation

**Impact**: CRITICAL - Cannot create orders, core business functionality broken


### Test: ORDER-006 - Retry Button Behavior
**Status**: ❌ FAIL - Retry Resets Form
**Severity**: HIGH

**Issue**: Clicking "Retry" button resets the entire form instead of retrying inventory load
- Customer selection was cleared
- Form returned to initial state: "Select a customer to begin"
- User loses all progress

**Expected Behavior**:
- Retry should attempt to reload inventory while preserving customer selection
- Form state should be maintained

**Actual Behavior**:
- Retry clears customer selection
- User must start over from scratch

**UX Bug**: Retry should not reset form state


### Test: INV-001 - Inventory/Batches Page
**Status**: ✅ PASS
**URL**: /inventory
**Observations**:
- Inventory page loads successfully with comprehensive data
- Title: "Inventory - Manage batches, track stock levels, and control product lifecycle"

**Header Actions**:
- "Saved Views" dropdown
- "Save View" button
- "Export CSV" button
- "New Purchase" button (blue)
- "Configure Display" button

**Inventory KPIs** (Clickable):
| Metric | Value | Description |
|--------|-------|-------------|
| Total Inventory Value | $62,318,693.66 | 57,119.27 total units |
| Avg Value per Unit | $1,195.87 | Average COGS per unit |
| Awaiting Intake | 22 | 22 batches pending |
| Low Stock | 37 | ≤100 units available |

**Search**: "Search by SKU, batch code, or product name..."

**Advanced Filters**: Collapsible section

**Table Columns**: SKU, Product, Brand, Vendor, Grade, Status, On Hand, Reserved, Available, Actions

**Sample Inventory Data**:
| SKU | Product | Brand | Vendor | Status | Available |
|-----|---------|-------|--------|--------|-----------|
| SKU-0020-0040-200 | Chemdawg - Greenhouse AAA Shake | TERP House Brand | Pacific Coast Cannabis | Awaiting Intake | 148.99 |
| SKU-0019-0039-199 | Bubba Kush - Indoor AAA Shake | TERP House Brand | NorCal Farms | Live | 117.53 |
| SKU-0001-0021-181 | OG Kush - Indoor AAA Whole Flower | TERP House Brand | Humboldt Harvest Co | Live | 390.69 |

**Status Types Observed**:
- Live (green)
- Awaiting Intake (yellow)
- On Hold
- Sold Out

**Actions per Row**:
- "View" button
- "Intake" button (for Awaiting Intake status)

**Critical Finding**:
- Inventory data EXISTS and loads correctly on /inventory page
- But Order Creator at /orders/create FAILS to load this same inventory
- This is an API/integration bug, not a data issue


### Test: INV-002 - View Batch Details
**Status**: ❌ FAIL - Application Crash
**Severity**: CRITICAL

**Issue**: Clicking "View" button on any batch causes application crash
- Error message: "An unexpected error occurred."
- "This error has been automatically reported to our team."
- Error ID: 7b456ba0c02547678881f77c23e306a2
- Recovery options: "Try Again" and "Reload Page" buttons

**Bug Report**:
- **Location**: /inventory (Batch View action)
- **Steps to Reproduce**:
  1. Navigate to /inventory (Batches page)
  2. Click "View" button on any batch row
  3. Application crashes with unexpected error
- **Expected**: Batch detail modal or page opens
- **Actual**: Full application crash with error boundary

**Impact**: CRITICAL - Cannot view batch details, core inventory management broken


### Test: INV-003 - Batch Intake Functionality
**Status**: ✅ PASS
**Observations**:
- "Intake" button opens "Edit Product" modal successfully
- Modal title: "Edit Product - SKU-0020-0040-200"
- Subtitle: "Update product details, location, and status"

**Product Information Displayed**:
| Field | Value |
|-------|-------|
| SKU | SKU-0020-0040-200 |
| Batch Code | BATCH-000200 |
| Current Status | AWAITING_INTAKE |
| Quantity | 148.99 units |

**Editable Fields**:
- Status: Dropdown "Select status" (required)
- Storage Location:
  - Zone: Dropdown "Select zone"
  - Rack: Text input (e.g., R1)
  - Shelf: Text input (e.g., S3)
  - Bin: Text input (e.g., B12)
- Add Product Media: File upload area "Click to upload images or videos"

**Action Buttons**:
- Cancel
- "Update Product" (blue, primary)
- Close (X)

**UX Observations**:
- Good modal design for intake workflow
- Storage location fields support warehouse organization
- Media upload available for product documentation
- Status change is the key action for intake completion


### Test: INV-004 - Export CSV Functionality
**Status**: ✅ PASS
**Observations**:
- Export CSV button works correctly
- File downloaded: inventory_2026-01-07.csv
- File size: 35,986 bytes (substantial data export)
- Filename includes date for versioning

**UX Observations**:
- Silent download (no confirmation dialog)
- Good filename convention with date


### Test: CLIENT-006 - Client Management Page
**Status**: ✅ PASS
**URL**: /clients
**Observations**:
- Client Management page loads successfully with comprehensive data
- Title: "Client Management - Manage all clients, track transactions, and monitor debt"

**Header Actions**:
- "Add New Client" button (blue)
- "Configure Display" button

**Client KPIs** (Clickable):
| Metric | Value | Description |
|--------|-------|-------------|
| Total Clients | 24 | total clients |
| Active Buyers | 9 | active buyers |
| Clients with Debt | 9 | with outstanding debt |
| New This Month | 0 | new this month |

**Filter Views Section**:
- Quick access buttons: All Clients, Clients with Debt, Buyers Only, Suppliers
- "Save Current View" option

**Search & Filters**:
- Search input: "Search by TERI code, name, email, phone, or address..."
- Filter dropdowns: Client Types, Debt Status

**Table Columns**:
TERI Code, Name, Contact, Client Types, Total Spent, Total Profit, Avg Margin, Amount Owed, Credit, Oldest Debt, Tags, Actions

**Client Types Observed**:
- Supplier (VEND-prefix)
- Buyer (REG-prefix, WHL-prefix)

**Sample Client Data**:
| TERI Code | Name | Type | Total Spent | Amount Owed | Oldest Debt |
|-----------|------|------|-------------|-------------|-------------|
| WHL0001 | Lake Kamronport Dispensary | Buyer | $62,869,120.20 | $29,091,319.23 | 716 days |
| REG0008 | Nolan Distribution | Buyer | $1,387,376.39 | $692,105.21 | 665 days |
| VEND-000005 | Trinity Alps Cultivation | Supplier | $0.00 | $0.00 | - |

**UX Observations**:
- Comprehensive client list with financial metrics
- Filter views for quick access to common segments
- Debt aging visible (Oldest Debt column)
- Credit column available for credit management
- Rows are clickable to navigate to client profile


### Test: CLIENT-007 - Add New Client Modal
**Status**: ✅ PASS
**Observations**:
- "Add New Client" modal opens successfully
- Multi-step wizard: "Step 1 of 3: Basic Information"

**Form Fields (Step 1)**:
| Field | Type | Required | Placeholder | Helper Text |
|-------|------|----------|-------------|-------------|
| TERI Code | text | Yes (*) | Enter unique TERI code | This is the unique identifier for the client (e.g., "KJ", "FC") |
| Client Name | text | Yes (*) | Enter client's full name | Full name is kept private and only visible in the client profile |
| Email | email | No | client@example.com | - |
| Phone | tel | No | +1 (555) 123-4567 | - |
| Address | textarea | No | Enter client's address | - |

**Action Buttons**:
- Cancel
- "Next" (blue, primary) - proceeds to step 2
- Close (X)

**UX Observations**:
- Good multi-step wizard for complex client creation
- Clear field labels with helpful hints
- TERI Code is the unique identifier (cannabis industry specific)
- Privacy note about client name visibility


### Test: CLIENT-008 - Clients with Debt Filter
**Status**: ✅ PASS
**Observations**:
- "Clients with Debt" filter works correctly
- List filtered from 24 to 9 clients (matches KPI "Clients with Debt: 9")
- "Debt Status" filter shows badge "1" indicating active filter
- "Clear Filters" button appears

**Filtered Results** (9 clients with debt):
| TERI Code | Name | Amount Owed | Oldest Debt |
|-----------|------|-------------|-------------|
| WHL0001 | Lake Kamronport Dispensary | $29,091,319.23 | 716 days |
| REG0008 | Nolan Distribution | $692,105.21 | 665 days |
| REG0004 | Sipes Collective | $746,333.75 | 592 days |
| REG0006 | Charleschester Farms | $1,013,934.06 | 692 days |
| REG0007 | second Supply | $634,686.86 | 682 days |
| REG0001 | Stamm Dispensary | $910,924.80 | 709 days |
| REG0002 | Mayer Cannabis Co | $412,030.19 | 653 days |
| REG0005 | same Gardens | $726,506.39 | 602 days |
| REG0003 | East Electa Wellness | $207,855.68 | 717 days |

**UX Observations**:
- Filter buttons work as expected
- Active filter is highlighted (darker background)
- Badge on Debt Status shows filter count
- Clear Filters option available


### Test: SETTINGS-001 - Settings Page Overview
**Status**: ⚠️ PARTIAL - Users Tab Authentication Error
**URL**: /settings
**Observations**:
- Settings page loads with comprehensive configuration options
- Title: "Settings - Manage system configurations and master data"
- "Back to Dashboard" button

**Settings Tabs** (12 tabs):
1. Users (default, has error)
2. User Roles
3. Roles
4. Permissions
5. Locations
6. Categories
7. Grades
8. Database
9. Feature Flags
10. VIP Access
11. Notifications
12. Calendars

**Users Tab Error**:
- Error message: "Failed to load users: Authentication required. Please log in to perform this action."
- "Try Again" button available
- User is logged in as "Public Demo User" but lacks permission

**Analysis**:
- Demo user likely lacks admin permissions for user management
- Error message is misleading - says "Please log in" but user IS logged in
- Should show "Permission denied" instead of "Authentication required"


### Test: SETTINGS-002 - Feature Flags Tab
**Status**: ✅ PASS
**Observations**:
- Feature Flags tab loads successfully
- Title: "Feature Flags - Manage feature availability across the application"
- Description: "Feature flags allow you to enable or disable features for specific users, roles, or the entire system."
- "Open Feature Flags Manager" button (blue) - links to dedicated feature flags page

**UX Observations**:
- Clean, simple interface
- Links to dedicated feature flags manager for more complex configuration


### Test: SETTINGS-003 - Locations Tab
**Status**: ✅ PASS
**Observations**:
- Locations tab loads successfully with data
- Title: "Storage Locations - Define warehouse locations (site, zone, rack, shelf, bin)"

**Add New Location Form**:
| Field | Required | Placeholder |
|-------|----------|-------------|
| Site | Yes (*) | e.g., WH1 |
| Zone | No | e.g., A |
| Rack | No | e.g., R1 |
| Shelf | No | e.g., S1 |
| Bin | No | e.g., B1 |
- "Add Location" button (blue)

**Existing Locations** (sample):
| Site | Location Path | Actions |
|------|---------------|---------|
| Main Warehouse | Zone A > Rack 1 > Shelf 1 > Bin 1 | Edit, Delete |
| Main Warehouse | Zone A > Rack 1 > Shelf 1 > Bin 2 | Edit, Delete |
| Main Warehouse | Zone A > Rack 1 > Shelf 2 > Bin 1 | Edit, Delete |
| Main Warehouse | Zone B > Rack 1 > Shelf 1 > Bin 1 | Edit, Delete |

**UX Observations**:
- Hierarchical location structure (Site > Zone > Rack > Shelf > Bin)
- Good for cannabis warehouse organization
- Edit and Delete actions available per location
- Clear location path display


### Test: SETTINGS-004 - Categories Tab
**Status**: ✅ PASS
**Observations**:
- Categories tab loads successfully with data
- Two-column layout: Categories (left) and Subcategories (right)

**Categories Section**:
- Title: "Categories - Manage product categories"
- Add new category input: "New category name"
- Add button (blue +)

**Existing Categories**:
| Category | Actions |
|----------|---------|
| Flower | Edit, Delete |
| Concentrates | Edit, Delete |
| Vapes | Edit, Delete |
| Bulk Oil | Edit, Delete |
| Manufactured Products | Edit, Delete |

**Subcategories Section**:
- Title: "Subcategories - Manage product subcategories"
- Dropdown: "Select category" to filter subcategories
- Add subcategory input: "Subcategory name"
- Add button (blue +)

**Subcategory Dropdown Options**:
- Flower
- Concentrates
- Vapes
- Bulk Oil
- Manufactured Products

**UX Observations**:
- Cannabis-specific product categories
- Hierarchical category/subcategory structure
- Easy to add and manage categories
- Edit and Delete actions available


### Test: SETTINGS-005 - Grades Tab
**Status**: ✅ PASS
**Observations**:
- Grades tab loads successfully with data
- Title: "Product Grades - Define and manage product quality grades"

**Add New Grade**:
- Input: "New grade (e.g., A, B, Premium)"
- "Add Grade" button (blue)

**Existing Grades**:
| Grade | Actions |
|-------|---------|
| A | Edit, Delete |
| B | Edit, Delete |
| C | Edit, Delete |
| D | Edit, Delete |

**UX Observations**:
- Simple quality grading system for cannabis products
- Standard A-D grading visible
- Can add custom grades (e.g., "Premium", "AAA")
- Edit and Delete actions available

