# QA: Feature-Data Flow Mapping

**Date:** 2025-11-18  
**Purpose:** Map all live TERP features to required data and test data flows

---

## Live Features Inventory

### 1. Dashboard & Analytics

- **DashboardV3** (`/`, `/dashboard`)
  - Widgets: Cash Flow, Sales by Client, Total Debt, Transaction Snapshot, etc.
  - **Data Required:** invoices, payments, orders, clients, batches
- **AnalyticsPage** (`/analytics`)
  - **Data Required:** orders, batches, clients, inventory movements

### 2. Inventory Management

- **Inventory** (`/inventory`, `/inventory/:id`)
  - **Data Required:** batches, lots, products, inventory movements
- **WorkflowQueuePage** (`/workflow-queue`)
  - **Data Required:** batches (by workflow status)

### 3. Sales & Orders

- **Orders** (`/orders`)
  - **Data Required:** orders, order_line_items, clients, batches
- **OrderCreatorPage** (`/orders/create`)
  - **Data Required:** clients, batches, products, pricing_profiles
- **SalesSheetCreatorPage** (`/sales-sheets`)
  - **Data Required:** products, batches, pricing_profiles

### 4. Client Management

- **ClientsListPage** (`/clients`)
  - **Data Required:** clients, client_communications, client_activity
- **ClientProfilePage** (`/clients/:id`)
  - **Data Required:** clients, orders, invoices, payments, client_communications, client_activity, comments, client_price_alerts

### 5. Pricing

- **PricingRulesPage** (`/pricing/rules`)
  - **Data Required:** pricing_rules
- **PricingProfilesPage** (`/pricing/profiles`)
  - **Data Required:** pricing_profiles
- **CreditSettingsPage** (`/credit-settings`)
  - **Data Required:** clients (credit limits)

### 6. Accounting

- **AccountingDashboard** (`/accounting`, `/accounting/dashboard`)
  - **Data Required:** invoices, payments, bills, bank_accounts
- **Invoices** (`/accounting/invoices`)
  - **Data Required:** invoices, clients, payments
- **Bills** (`/accounting/bills`)
  - **Data Required:** bills, vendors, payments
- **Payments** (`/accounting/payments`)
  - **Data Required:** payments, invoices, bills
- **BankAccounts** (`/accounting/bank-accounts`)
  - **Data Required:** bank_accounts
- **BankTransactions** (`/accounting/bank-transactions`)
  - **Data Required:** bank_transactions
- **Expenses** (`/accounting/expenses`)
  - **Data Required:** expenses
- **ChartOfAccounts** (`/accounting/chart-of-accounts`)
  - **Data Required:** accounts
- **GeneralLedger** (`/accounting/general-ledger`)
  - **Data Required:** ledger_entries
- **FiscalPeriods** (`/accounting/fiscal-periods`)
  - **Data Required:** fiscal_periods

### 7. Vendors & Purchasing

- **VendorsPage** (`/vendors`)
  - **Data Required:** vendors
- **VendorProfilePage** (`/vendors/:id`)
  - **Data Required:** vendors, purchase_orders, bills, lots
- **VendorSupplyPage** (`/vendor-supply`)
  - **Data Required:** vendors, products, lots
- **PurchaseOrdersPage** (`/purchase-orders`)
  - **Data Required:** purchase_orders, vendors, products

### 8. Matchmaking & Needs

- **MatchmakingServicePage** (`/matchmaking`)
  - **Data Required:** client_needs, batches, clients
- **NeedsManagementPage** (`/needs`)
  - **Data Required:** client_needs, clients

### 9. Calendar & Tasks

- **CalendarPage** (`/calendar`)
  - **Data Required:** calendar_events, comments
- **TodoListsPage** (`/todo`, `/todos`)
  - **Data Required:** todo_lists, todo_items
- **TodoListDetailPage** (`/todos/:listId`)
  - **Data Required:** todo_lists, todo_items
- **InboxPage** (`/inbox`)
  - **Data Required:** comment_mentions, notifications

### 10. Other Features

- **ReturnsPage** (`/returns`)
  - **Data Required:** returns, orders, clients
- **LocationsPage** (`/locations`)
  - **Data Required:** locations
- **CogsSettingsPage** (`/settings/cogs`)
  - **Data Required:** pricing_defaults
- **VIPPortalConfigPage** (`/clients/:clientId/vip-portal-config`)
  - **Data Required:** vip_portal_configurations

---

## Data Seeding Status vs Feature Requirements

### ✅ Fully Seeded (Features Should Work)

| Feature             | Required Data                                                     | Status                                    |
| ------------------- | ----------------------------------------------------------------- | ----------------------------------------- |
| DashboardV3         | invoices, payments, orders, clients                               | ✅ All seeded                             |
| Inventory           | batches, lots, products, movements                                | ✅ All seeded                             |
| Orders              | orders, line_items, clients, batches                              | ✅ All seeded                             |
| ClientsListPage     | clients, communications, activity                                 | ✅ All seeded                             |
| ClientProfilePage   | clients, orders, invoices, communications, comments, price_alerts | ✅ All seeded                             |
| PricingRulesPage    | pricing_rules                                                     | ✅ Seeded                                 |
| PricingProfilesPage | pricing_profiles                                                  | ✅ Seeded                                 |
| CogsSettingsPage    | pricing_defaults                                                  | ✅ Seeded                                 |
| InboxPage           | comment_mentions                                                  | ✅ Seeded                                 |
| CalendarPage        | calendar_events, comments                                         | ✅ Seeded (events exist, comments seeded) |
| WorkflowQueuePage   | batches                                                           | ✅ Seeded                                 |

### ⚠️ Partially Seeded (Features May Have Gaps)

| Feature                | Required Data                         | Missing Data                 | Impact             |
| ---------------------- | ------------------------------------- | ---------------------------- | ------------------ |
| Invoices (Accounting)  | invoices, clients, payments           | ✅ All exist                 | Should work        |
| VendorsPage            | vendors                               | Only 1 test vendor           | Limited data       |
| VendorProfilePage      | vendors, purchase_orders, bills, lots | No purchase_orders, no bills | Empty sections     |
| MatchmakingServicePage | client_needs, batches, clients        | No client_needs              | Feature won't work |
| NeedsManagementPage    | client_needs                          | No client_needs              | Feature won't work |
| ReturnsPage            | returns                               | No returns                   | Empty page         |
| LocationsPage          | locations                             | Unknown if seeded            | May be empty       |

### ❌ Not Seeded (Features Will Be Empty)

| Feature             | Missing Data              | Impact             |
| ------------------- | ------------------------- | ------------------ |
| Bills (Accounting)  | bills                     | Empty page         |
| BankAccounts        | bank_accounts             | Empty page         |
| BankTransactions    | bank_transactions         | Empty page         |
| Expenses            | expenses                  | Empty page         |
| ChartOfAccounts     | accounts                  | Empty page         |
| GeneralLedger       | ledger_entries            | Empty page         |
| FiscalPeriods       | fiscal_periods            | Empty page         |
| PurchaseOrdersPage  | purchase_orders           | Empty page         |
| TodoListsPage       | todo_lists, todo_items    | Empty page         |
| VIPPortalConfigPage | vip_portal_configurations | May have some data |

---

## Priority Testing Plan

### Phase 1: Core Features (High Priority)

1. ✅ Dashboard widgets
2. ⏳ Inventory page
3. ⏳ Orders page
4. ⏳ Client profile page
5. ⏳ Pricing pages

### Phase 2: Secondary Features (Medium Priority)

6. ⏳ Accounting invoices
7. ⏳ Calendar page
8. ⏳ Inbox page
9. ⏳ Workflow queue
10. ⏳ Analytics page

### Phase 3: Tertiary Features (Low Priority)

11. ⏳ Vendors page
12. ⏳ Matchmaking (needs client_needs data)
13. ⏳ Returns page
14. ⏳ Locations page

---

## Next Steps

1. **Test each feature** in priority order
2. **Document issues** found during testing
3. **Seed missing data** for critical features
4. **Create data seeding tasks** for empty features
5. **Update roadmap** with findings
