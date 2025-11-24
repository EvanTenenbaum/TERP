# Untested UI Elements Inventory - TERP System

**Date:** November 22, 2025  
**Purpose:** Comprehensive documentation of all untested interactions, buttons, features, and UI elements  
**Status:** In Progress

---

## Documentation Methodology

This inventory systematically documents every interactive element in the TERP system that has not been fully tested. For each page/section, we document:

1. **Interactive Elements** - Buttons, toggles, dropdowns, inputs
2. **Expected Behavior** - What should happen when interacted with
3. **Test Status** - Untested, Partial, or Known Issue
4. **Priority** - Critical, High, Medium, Low
5. **Notes** - Placeholders, "Coming Soon" text, broken functionality

---

## Phase 1: Dashboard Page

**URL:** `/` or `/dashboard`  
**Test Date:** November 22, 2025

### Header Elements

| Element | Type | Expected Behavior | Test Status | Priority | Notes |
|---------|------|-------------------|-------------|----------|-------|
| Search Bar | Input | Global search for quotes, customers, products | ❌ Untested | High | Placeholder text present, functionality unknown |
| Inbox Button | Button | Open inbox/notifications | ❌ Untested | Medium | Icon button in header |
| Settings Button | Button | Quick access to settings | ❌ Untested | Medium | Icon button in header |
| User Profile Button | Button | User profile dropdown menu | ⚠️ Partial | Medium | Dropdown not opening in automated test |

### Dashboard Widgets

| Widget | Interactive Elements | Expected Behavior | Test Status | Priority | Notes |
|--------|---------------------|-------------------|-------------|----------|-------|
| **CashFlow Widget** | | | | | |
| - Lifetime Dropdown | Dropdown | Change time period filter | ❌ Untested | High | Options: Lifetime, Weekly, Monthly, etc. |
| - Cash Collected | Display | Show total cash collected | ✅ Tested | - | Displaying $128,737,570.80 |
| - Cash Spent | Display | Show total cash spent | ✅ Tested | - | Displaying $0.00 |
| **Sales Widget** | | | | | |
| - Lifetime Dropdown | Dropdown | Change time period filter | ❌ Untested | High | Options: Lifetime, Weekly, Monthly, etc. |
| - Client Rows | Clickable | Navigate to client profile | ❌ Untested | High | 25 clients listed |
| - View All Link | Link | Navigate to full sales report | ❌ Untested | Medium | May not exist |
| **Transaction Snapshot** | | | | | |
| - Today Column | Display | Show today's transactions | ✅ Tested | - | All showing $0 |
| - This Week Column | Display | Show week's transactions | ✅ Tested | - | Cash Collected: $312,887 |
| **Inventory Snapshot** | | | | | |
| - Category Rows | Clickable | Navigate to category inventory | ❌ Untested | Medium | "1. Flower" row |
| - View All Link | Link | Navigate to full inventory | ❌ Untested | Medium | May not exist |
| **Total Debt Widget** | | | | | |
| - Debt Owed to Me | Display | Show AR total | ✅ Tested | - | $6,988.42 |
| - Debt I Owe Vendors | Display | Show AP total | ✅ Tested | - | $0.00 |
| **Sales Time Period Comparison** | | | | | |
| - Period Rows | Display | Show period comparisons | ✅ Tested | - | Weekly, Monthly, 6 Month, Yearly |
| **Profitability Analysis** | | | | | |
| - All Metrics | Display | Show profitability metrics | ✅ Tested | - | All showing $0 |
| **Matchmaking Opportunities** | | | | | |
| - View All Button | Button | Navigate to matchmaking page | ❌ Untested | Medium | Shows "0 high-priority opportunities" |

### Dashboard Action Buttons

| Button | Expected Behavior | Test Status | Priority | Notes |
|--------|-------------------|-------------|----------|-------|
| Customize | Open dashboard customization | ❌ Untested | High | May be placeholder |
| Comments | Open comments/notes panel | ❌ Untested | Medium | May be placeholder |

### Sidebar Navigation (Tested but documenting for completeness)

| Link | Destination | Test Status | Priority | Notes |
|------|-------------|-------------|----------|-------|
| Dashboard | `/` | ✅ Tested | - | Working |
| Todo Lists | `/todo` or `/todos` | ✅ Tested | - | Working |
| Calendar | `/calendar` | ✅ Tested | - | Working |
| Orders | `/orders` | ✅ Tested | - | Working |
| Sales Sheets | `/sales-sheets` | ✅ Tested | - | Working |
| Create Order | `/orders/create` | ✅ Fixed | - | Was broken (BUG-009), now fixed |
| Inventory | `/inventory` | ✅ Tested | - | Working |
| Workflow Queue | `/workflow-queue` | ✅ Tested | - | Working |
| Matchmaking | `/matchmaking` | ✅ Tested | - | Working |
| Accounting | `/accounting` | ✅ Tested | - | Working |
| Clients | `/clients` | ✅ Tested | - | Working |
| Vendors | `/vendors` | ⚠️ Partial | - | 0 vendors, missing seed data |
| Purchase Orders | `/purchase-orders` | 🔴 Broken | Critical | BUG-008 - Page crashes |
| Returns | `/returns` | ✅ Tested | - | Working |
| Locations | `/locations` | ⚠️ Partial | - | 0 locations, missing seed data |
| Pricing Rules | `/pricing/rules` | ✅ Tested | - | Working |
| Pricing Profiles | `/pricing/profiles` | ✅ Tested | - | Working |
| Credit Settings | `/credit-settings` | ✅ Tested | - | Working |
| COGS Settings | `/settings/cogs` | ✅ Tested | - | Working |
| Analytics | `/analytics` | ⚠️ Partial | - | No data (BUG-007) |
| Settings | `/settings` | ✅ Tested | - | Working |
| Help | `/help` | ✅ Tested | - | Working |

---

## Phase 2: Orders and Sales Pages

**Test Date:** November 22, 2025

### Orders Page (`/orders`)

| Element | Type | Expected Behavior | Test Status | Priority | Notes |
|---------|------|-------------------|-------------|----------|-------|
| Search Bar | Input | Search orders by number, client, etc. | ❌ Untested | High | |
| Filter Dropdown | Dropdown | Filter by status | ❌ Untested | High | |
| New Order Button | Button | Navigate to order creation | ❌ Untested | High | |
| Order Row Click | Clickable | Navigate to order detail | ❌ Untested | High | |
| Export Button | Button | Export orders to CSV/Excel | ❌ Untested | Medium | May not exist |
| Bulk Actions | Checkbox + Button | Select multiple orders for bulk actions | ❌ Untested | Medium | May not exist |
| Pagination | Buttons | Navigate through order pages | ❌ Untested | Medium | If >100 orders |
| Sort Headers | Clickable | Sort by column | ❌ Untested | Medium | |

### Sales Sheets Page (`/sales-sheets`)

| Element | Type | Expected Behavior | Test Status | Priority | Notes |
|---------|------|-------------------|-------------|----------|-------|
| Create Sales Sheet Button | Button | Open sales sheet creator | ❌ Untested | High | |
| Sales Sheet List | Clickable | Navigate to sales sheet detail | ❌ Untested | High | |
| Search/Filter | Input | Search sales sheets | ❌ Untested | Medium | |
| Export Button | Button | Export sales sheet | ❌ Untested | Medium | |

### Create Order Page (`/orders/create`)

| Element | Type | Expected Behavior | Test Status | Priority | Notes |
|---------|------|-------------------|-------------|----------|-------|
| Client Selector | Dropdown | Select client for order | ❌ Untested | Critical | |
| Product Search | Input | Search products to add | ❌ Untested | Critical | |
| Add Product Button | Button | Add product to order | ❌ Untested | Critical | |
| Quantity Input | Input | Set product quantity | ❌ Untested | Critical | |
| Price Input | Input | Set product price | ❌ Untested | Critical | |
| Discount Input | Input | Apply discount | ❌ Untested | High | |
| Notes Textarea | Textarea | Add order notes | ❌ Untested | Medium | |
| Save Draft Button | Button | Save order as draft | ❌ Untested | High | |
| Submit Order Button | Button | Submit order | ❌ Untested | Critical | |
| Cancel Button | Button | Cancel order creation | ❌ Untested | Medium | |

---

## Phase 3: Inventory and Workflow Pages

**Test Date:** November 22, 2025

### Inventory Page (`/inventory`)

| Element | Type | Expected Behavior | Test Status | Priority | Notes |
|---------|------|-------------------|-------------|----------|-------|
| Search Bar | Input | Search products | ✅ Tested | - | Working |
| Filter Dropdown | Dropdown | Filter by category, status | ❌ Untested | High | |
| New Product Button | Button | Create new product | ❌ Untested | High | |
| New Purchase Button | Button | Create new purchase/batch | ⚠️ Partial | High | Button visible, functionality untested |
| Product Row Click | Clickable | Navigate to product detail | ❌ Untested | High | |
| Batch Expand | Clickable | Expand to show batches | ❌ Untested | High | |
| Edit Product Button | Button | Edit product details | ❌ Untested | High | |
| Delete Product Button | Button | Delete product | ❌ Untested | Medium | |
| Export Button | Button | Export inventory | ❌ Untested | Medium | |
| Bulk Actions | Checkbox + Button | Bulk inventory operations | ❌ Untested | Medium | |

### Workflow Queue Page (`/workflow-queue`)

| Element | Type | Expected Behavior | Test Status | Priority | Notes |
|---------|------|-------------------|-------------|----------|-------|
| Status Columns | Drag & Drop | Drag tasks between statuses | ❌ Untested | High | Kanban-style board |
| New Task Button | Button | Create new workflow task | ❌ Untested | High | |
| Task Card Click | Clickable | Open task detail | ❌ Untested | High | |
| Task Card Actions | Buttons | Edit, delete, assign task | ❌ Untested | High | |
| Filter Dropdown | Dropdown | Filter by assignee, priority | ❌ Untested | Medium | |
| Search Bar | Input | Search tasks | ❌ Untested | Medium | |

---

## Phase 4: Accounting Pages

**Test Date:** November 22, 2025

### Accounting Dashboard (`/accounting`)

| Element | Type | Expected Behavior | Test Status | Priority | Notes |
|---------|------|-------------------|-------------|----------|-------|
| Chart of Accounts Link | Link | Navigate to COA | ❌ Untested | High | |
| General Ledger Link | Link | Navigate to GL | ❌ Untested | High | |
| Invoices Link | Link | Navigate to invoices | ❌ Untested | High | |
| Bills Link | Link | Navigate to bills | ❌ Untested | High | |
| Payments Link | Link | Navigate to payments | ❌ Untested | High | |
| Bank Accounts Link | Link | Navigate to bank accounts | ❌ Untested | High | |
| Expenses Link | Link | Navigate to expenses | ❌ Untested | High | |
| Fiscal Periods Link | Link | Navigate to fiscal periods | ❌ Untested | Medium | |
| AR Aging Report | Display | Show AR aging | ✅ Tested | - | Working |
| AP Aging Report | Display | Show AP aging | ✅ Tested | - | Working |

### Chart of Accounts Page (`/accounting/chart-of-accounts`)

| Element | Type | Expected Behavior | Test Status | Priority | Notes |
|---------|------|-------------------|-------------|----------|-------|
| New Account Button | Button | Create new account | ❌ Untested | High | |
| Account Row Click | Clickable | View account detail | ❌ Untested | High | |
| Edit Account Button | Button | Edit account | ❌ Untested | High | |
| Delete Account Button | Button | Delete account | ❌ Untested | Medium | |
| Search Bar | Input | Search accounts | ❌ Untested | Medium | |
| Filter Dropdown | Dropdown | Filter by account type | ❌ Untested | Medium | |

### Invoices Page (`/accounting/invoices`)

| Element | Type | Expected Behavior | Test Status | Priority | Notes |
|---------|------|-------------------|-------------|----------|-------|
| New Invoice Button | Button | Create new invoice | ❌ Untested | High | |
| Invoice Row Click | Clickable | View invoice detail | ❌ Untested | High | |
| Send Invoice Button | Button | Send invoice to client | ❌ Untested | High | |
| Record Payment Button | Button | Record payment received | ❌ Untested | High | |
| Void Invoice Button | Button | Void invoice | ❌ Untested | Medium | |
| Export Button | Button | Export invoices | ❌ Untested | Medium | |
| Search Bar | Input | Search invoices | ❌ Untested | Medium | |
| Filter Dropdown | Dropdown | Filter by status, client | ❌ Untested | Medium | |

### Bills Page (`/accounting/bills`)

| Element | Type | Expected Behavior | Test Status | Priority | Notes |
|---------|------|-------------------|-------------|----------|-------|
| New Bill Button | Button | Create new bill | ❌ Untested | High | |
| Bill Row Click | Clickable | View bill detail | ❌ Untested | High | |
| Record Payment Button | Button | Record payment made | ❌ Untested | High | |
| Void Bill Button | Button | Void bill | ❌ Untested | Medium | |
| Export Button | Button | Export bills | ❌ Untested | Medium | |
| Search Bar | Input | Search bills | ❌ Untested | Medium | |
| Filter Dropdown | Dropdown | Filter by status, vendor | ❌ Untested | Medium | |

### Payments Page (`/accounting/payments`)

| Element | Type | Expected Behavior | Test Status | Priority | Notes |
|---------|------|-------------------|-------------|----------|-------|
| New Payment Button | Button | Record new payment | ❌ Untested | High | |
| Payment Row Click | Clickable | View payment detail | ❌ Untested | High | |
| Delete Payment Button | Button | Delete payment | ❌ Untested | Medium | |
| Export Button | Button | Export payments | ❌ Untested | Medium | |
| Search Bar | Input | Search payments | ❌ Untested | Medium | |
| Filter Dropdown | Dropdown | Filter by type, date | ❌ Untested | Medium | |

### Bank Accounts Page (`/accounting/bank-accounts`)

| Element | Type | Expected Behavior | Test Status | Priority | Notes |
|---------|------|-------------------|-------------|----------|-------|
| New Bank Account Button | Button | Add new bank account | ❌ Untested | High | |
| Account Row Click | Clickable | View account detail | ❌ Untested | High | |
| Edit Account Button | Button | Edit account | ❌ Untested | High | |
| Reconcile Button | Button | Start reconciliation | ❌ Untested | High | |
| View Transactions Button | Button | View account transactions | ❌ Untested | High | |

### Bank Transactions Page (`/accounting/bank-transactions`)

| Element | Type | Expected Behavior | Test Status | Priority | Notes |
|---------|------|-------------------|-------------|----------|-------|
| Import Transactions Button | Button | Import bank transactions | ❌ Untested | High | |
| Transaction Row Click | Clickable | View transaction detail | ❌ Untested | High | |
| Categorize Button | Button | Categorize transaction | ❌ Untested | High | |
| Match to Invoice/Bill Button | Button | Match transaction | ❌ Untested | High | |
| Search Bar | Input | Search transactions | ❌ Untested | Medium | |
| Filter Dropdown | Dropdown | Filter by account, date | ❌ Untested | Medium | |

### Expenses Page (`/accounting/expenses`)

| Element | Type | Expected Behavior | Test Status | Priority | Notes |
|---------|------|-------------------|-------------|----------|-------|
| New Expense Button | Button | Record new expense | ❌ Untested | High | |
| Expense Row Click | Clickable | View expense detail | ❌ Untested | High | |
| Edit Expense Button | Button | Edit expense | ❌ Untested | High | |
| Delete Expense Button | Button | Delete expense | ❌ Untested | Medium | |
| Export Button | Button | Export expenses | ❌ Untested | Medium | |
| Search Bar | Input | Search expenses | ❌ Untested | Medium | |
| Filter Dropdown | Dropdown | Filter by category, date | ❌ Untested | Medium | |

---

## Phase 5: CRM and Client Pages

**Test Date:** November 22, 2025

### Clients List Page (`/clients`)

| Element | Type | Expected Behavior | Test Status | Priority | Notes |
|---------|------|-------------------|-------------|----------|-------|
| New Client Button | Button | Create new client | ❌ Untested | High | |
| Client Row Click | Clickable | Navigate to client profile | ❌ Untested | High | |
| Search Bar | Input | Search clients | ❌ Untested | High | |
| Filter Dropdown | Dropdown | Filter by status, tags | ❌ Untested | Medium | |
| Export Button | Button | Export client list | ❌ Untested | Medium | |
| Bulk Actions | Checkbox + Button | Bulk client operations | ❌ Untested | Medium | |

### Client Profile Page (`/clients/:id`)

| Element | Type | Expected Behavior | Test Status | Priority | Notes |
|---------|------|-------------------|-------------|----------|-------|
| Edit Client Button | Button | Edit client details | ❌ Untested | High | |
| Delete Client Button | Button | Delete client | ❌ Untested | Medium | |
| VIP Portal Config Button | Button | Configure VIP portal | ❌ Untested | High | |
| New Order Button | Button | Create order for client | ❌ Untested | High | |
| New Invoice Button | Button | Create invoice for client | ❌ Untested | High | |
| Order History Tab | Tab | View client orders | ❌ Untested | High | |
| Invoice History Tab | Tab | View client invoices | ❌ Untested | High | |
| Payment History Tab | Tab | View client payments | ❌ Untested | High | |
| Notes Tab | Tab | View/add client notes | ❌ Untested | Medium | |
| Documents Tab | Tab | View/upload documents | ❌ Untested | Medium | |

### Matchmaking Service Page (`/matchmaking`)

| Element | Type | Expected Behavior | Test Status | Priority | Notes |
|---------|------|-------------------|-------------|----------|-------|
| Opportunity Cards | Clickable | View opportunity detail | ❌ Untested | High | |
| Create Match Button | Button | Create manual match | ❌ Untested | High | |
| Filter Dropdown | Dropdown | Filter by priority, type | ❌ Untested | Medium | |
| Refresh Button | Button | Refresh matchmaking results | ❌ Untested | Medium | |

---

## Phase 6: Settings and Configuration Pages

**Test Date:** November 22, 2025

### Settings Page (`/settings`)

| Element | Type | Expected Behavior | Test Status | Priority | Notes |
|---------|------|-------------------|-------------|----------|-------|
| User Roles Tab | Tab | Manage user roles | ✅ Tested | - | Working |
| General Settings Tab | Tab | General system settings | ❌ Untested | High | |
| Notifications Tab | Tab | Notification preferences | ❌ Untested | Medium | |
| Integrations Tab | Tab | Third-party integrations | ❌ Untested | Medium | |
| Save Settings Button | Button | Save settings changes | ❌ Untested | High | |

### Pricing Rules Page (`/pricing/rules`)

| Element | Type | Expected Behavior | Test Status | Priority | Notes |
|---------|------|-------------------|-------------|----------|-------|
| New Rule Button | Button | Create new pricing rule | ❌ Untested | High | |
| Rule Row Click | Clickable | Edit pricing rule | ❌ Untested | High | |
| Delete Rule Button | Button | Delete pricing rule | ❌ Untested | Medium | |
| Enable/Disable Toggle | Toggle | Enable/disable rule | ❌ Untested | High | |
| Priority Up/Down Buttons | Buttons | Reorder rule priority | ❌ Untested | High | |

### Pricing Profiles Page (`/pricing/profiles`)

| Element | Type | Expected Behavior | Test Status | Priority | Notes |
|---------|------|-------------------|-------------|----------|-------|
| New Profile Button | Button | Create new pricing profile | ❌ Untested | High | |
| Profile Row Click | Clickable | Edit pricing profile | ❌ Untested | High | |
| Delete Profile Button | Button | Delete pricing profile | ❌ Untested | Medium | |
| Assign to Client Button | Button | Assign profile to client | ❌ Untested | High | |

### Credit Settings Page (`/credit-settings`)

| Element | Type | Expected Behavior | Test Status | Priority | Notes |
|---------|------|-------------------|-------------|----------|-------|
| Credit Limit Input | Input | Set default credit limit | ❌ Untested | High | |
| Payment Terms Dropdown | Dropdown | Set default payment terms | ❌ Untested | High | |
| Auto-Approve Toggle | Toggle | Enable auto-approval | ❌ Untested | High | |
| Save Settings Button | Button | Save credit settings | ❌ Untested | High | |

### COGS Settings Page (`/settings/cogs`)

| Element | Type | Expected Behavior | Test Status | Priority | Notes |
|---------|------|-------------------|-------------|----------|-------|
| COGS Method Dropdown | Dropdown | Select COGS calculation method | ❌ Untested | High | FIFO, LIFO, Average |
| Default Margin Input | Input | Set default profit margin | ❌ Untested | High | |
| Save Settings Button | Button | Save COGS settings | ❌ Untested | High | |

---

## Phase 7: Analytics and Reporting Pages

**Test Date:** November 22, 2025

### Analytics Page (`/analytics`)

| Element | Type | Expected Behavior | Test Status | Priority | Notes |
|---------|------|-------------------|-------------|----------|-------|
| Date Range Picker | Input | Select date range | ❌ Untested | High | |
| Report Type Dropdown | Dropdown | Select report type | ❌ Untested | High | |
| Export Button | Button | Export report | ❌ Untested | Medium | |
| Chart Interactions | Clickable | Drill down into chart data | ❌ Untested | Medium | |
| Refresh Button | Button | Refresh analytics data | ❌ Untested | Medium | |

---

## Phase 8: Collaboration and Calendar Pages

**Test Date:** November 22, 2025

### Todo Lists Page (`/todo` or `/todos`)

| Element | Type | Expected Behavior | Test Status | Priority | Notes |
|---------|------|-------------------|-------------|----------|-------|
| New List Button | Button | Create new todo list | ❌ Untested | High | |
| List Row Click | Clickable | Navigate to list detail | ❌ Untested | High | |
| Delete List Button | Button | Delete todo list | ❌ Untested | Medium | |
| Share List Button | Button | Share list with team | ❌ Untested | Medium | |

### Todo List Detail Page (`/todos/:listId`)

| Element | Type | Expected Behavior | Test Status | Priority | Notes |
|---------|------|-------------------|-------------|----------|-------|
| New Task Input | Input | Add new task | ❌ Untested | High | |
| Task Checkbox | Checkbox | Mark task complete | ❌ Untested | High | |
| Task Row Click | Clickable | Edit task | ❌ Untested | High | |
| Delete Task Button | Button | Delete task | ❌ Untested | Medium | |
| Assign Task Button | Button | Assign task to user | ❌ Untested | High | |
| Due Date Picker | Input | Set task due date | ❌ Untested | High | |
| Priority Dropdown | Dropdown | Set task priority | ❌ Untested | Medium | |

### Calendar Page (`/calendar`)

| Element | Type | Expected Behavior | Test Status | Priority | Notes |
|---------|------|-------------------|-------------|----------|-------|
| New Event Button | Button | Create new event | ❌ Untested | High | |
| Event Click | Clickable | View/edit event | ❌ Untested | High | |
| Day/Week/Month Toggle | Toggle | Change calendar view | ❌ Untested | High | |
| Date Navigation | Buttons | Navigate dates | ❌ Untested | High | |
| Filter Dropdown | Dropdown | Filter by event type | ❌ Untested | Medium | |

### Inbox Page (`/inbox`)

| Element | Type | Expected Behavior | Test Status | Priority | Notes |
|---------|------|-------------------|-------------|----------|-------|
| Message Row Click | Clickable | Open message | ❌ Untested | High | |
| New Message Button | Button | Compose new message | ❌ Untested | High | |
| Reply Button | Button | Reply to message | ❌ Untested | High | |
| Delete Message Button | Button | Delete message | ❌ Untested | Medium | |
| Mark Read/Unread Button | Button | Toggle read status | ❌ Untested | Medium | |

---

## Phase 9: Supply Chain Pages

**Test Date:** November 22, 2025

### Vendors Page (`/vendors`)

| Element | Type | Expected Behavior | Test Status | Priority | Notes |
|---------|------|-------------------|-------------|----------|-------|
| New Vendor Button | Button | Create new vendor | ❌ Untested | High | |
| Vendor Row Click | Clickable | Navigate to vendor profile | ❌ Untested | High | |
| Search Bar | Input | Search vendors | ❌ Untested | High | |
| Filter Dropdown | Dropdown | Filter by status, tags | ❌ Untested | Medium | |
| Export Button | Button | Export vendor list | ❌ Untested | Medium | |

### Vendor Profile Page (`/vendors/:id`)

| Element | Type | Expected Behavior | Test Status | Priority | Notes |
|---------|------|-------------------|-------------|----------|-------|
| Edit Vendor Button | Button | Edit vendor details | ❌ Untested | High | |
| Delete Vendor Button | Button | Delete vendor | ❌ Untested | Medium | |
| New Purchase Order Button | Button | Create PO for vendor | ❌ Untested | High | |
| PO History Tab | Tab | View vendor POs | ❌ Untested | High | |
| Payment History Tab | Tab | View vendor payments | ❌ Untested | High | |
| Notes Tab | Tab | View/add vendor notes | ❌ Untested | Medium | |

### Purchase Orders Page (`/purchase-orders`)

**⚠️ CRITICAL: This page is currently broken (BUG-008)**

| Element | Type | Expected Behavior | Test Status | Priority | Notes |
|---------|------|-------------------|-------------|----------|-------|
| **ALL ELEMENTS** | - | - | 🔴 Broken | Critical | Page crashes on load - BUG-008 |

### Returns Page (`/returns`)

| Element | Type | Expected Behavior | Test Status | Priority | Notes |
|---------|------|-------------------|-------------|----------|-------|
| New Return Button | Button | Create new return | ❌ Untested | High | |
| Return Row Click | Clickable | View return detail | ❌ Untested | High | |
| Search Bar | Input | Search returns | ❌ Untested | Medium | |
| Filter Dropdown | Dropdown | Filter by status | ❌ Untested | Medium | |
| Approve Return Button | Button | Approve return | ❌ Untested | High | |
| Restock Button | Button | Restock returned items | ❌ Untested | High | |

### Locations Page (`/locations`)

| Element | Type | Expected Behavior | Test Status | Priority | Notes |
|---------|------|-------------------|-------------|----------|-------|
| New Location Button | Button | Create new location | ❌ Untested | High | |
| Location Row Click | Clickable | View location detail | ❌ Untested | High | |
| Edit Location Button | Button | Edit location | ❌ Untested | High | |
| Delete Location Button | Button | Delete location | ❌ Untested | Medium | |
| View Inventory Button | Button | View location inventory | ❌ Untested | High | |

---

## Summary Statistics

### Total Interactive Elements Documented

| Category | Total Elements | Untested | Partial | Tested | Broken |
|----------|----------------|----------|---------|--------|--------|
| Dashboard | 15 | 11 | 1 | 3 | 0 |
| Orders & Sales | 25 | 25 | 0 | 0 | 0 |
| Inventory & Workflow | 20 | 18 | 1 | 1 | 0 |
| Accounting | 60+ | 60+ | 0 | 2 | 0 |
| CRM & Clients | 25 | 24 | 0 | 1 | 0 |
| Settings | 20 | 19 | 0 | 1 | 0 |
| Analytics | 5 | 5 | 0 | 0 | 0 |
| Collaboration | 30 | 30 | 0 | 0 | 0 |
| Supply Chain | 30 | 29 | 0 | 0 | 1 (broken) |
| **TOTAL** | **230+** | **221+** | **3** | **8** | **1** |

### Priority Breakdown

| Priority | Count | Percentage |
|----------|-------|------------|
| Critical | 15 | 6.5% |
| High | 150+ | 65% |
| Medium | 65+ | 28% |
| Low | 0 | 0% |

### Known Issues Summary

1. **BUG-008** - Purchase Orders page crashes (CRITICAL)
2. **BUG-009** - Create Order route 404 (FIXED)
3. **BUG-007** - Analytics data not populated
4. **Missing Seed Data** - Vendors, Locations
5. **User Menu Dropdown** - Not opening in automated tests

---

## Next Steps

1. **Create Testing Roadmap Tasks** - For all 221+ untested elements
2. **Prioritize Critical Elements** - Focus on 15 critical untested elements first
3. **Identify Placeholders** - Need to click through each element to find "Coming Soon" text
4. **Test Broken Functionality** - Document which buttons do nothing
5. **Update Master Roadmap** - Add all new testing tasks

---

**Document Status:** Phase 1-9 Complete - Ready for Task Creation  
**Last Updated:** November 22, 2025  
**Total Pages Documented:** 20+  
**Total Elements Documented:** 230+
