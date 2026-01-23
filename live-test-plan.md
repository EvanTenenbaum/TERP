# TERP Live E2E Test Plan

## Live Site URL

https://terp-app-b9s35.ondigitalocean.app

## Test Credentials

All QA accounts use the password: `TerpQA2026!`

### Admin User (Super Admin)

- Email: qa.superadmin@terp.test
- Password: TerpQA2026!

### Standard User (Sales Manager)

- Email: qa.salesmanager@terp.test
- Password: TerpQA2026!

### Other Available QA Accounts

| Role               | Email                   |
| ------------------ | ----------------------- |
| Owner/Executive    | qa.owner@terp.test      |
| Operations Manager | qa.opsmanager@terp.test |
| Accountant         | qa.accountant@terp.test |
| Inventory Manager  | qa.invmanager@terp.test |
| Warehouse Staff    | qa.warehouse@terp.test  |
| Read-Only Auditor  | qa.auditor@terp.test    |

### VIP Client

- Email: client@greenleaf.com
- Password: TerpQA2026!

## Test Categories

### 1. Authentication & Authorization

- Admin login flow
- Invalid credentials handling
- Session persistence
- Logout functionality
- VIP Portal login (separate auth)

### 2. Dashboard

- KPI widgets display
- Data loading without infinite spinners
- Widget interactions
- Theme toggle persistence
- Command palette (Cmd+K)

### 3. Inventory Management

- View inventory list
- Filter and sort batches
- Batch detail view
- Status management
- Mobile responsiveness

### 4. Accounting Module (10 pages)

- Accounting Dashboard
- Chart of Accounts
- General Ledger
- Fiscal Periods
- Invoices (CRUD)
- Bills (CRUD)
- Payments
- Bank Accounts
- Bank Transactions
- Expenses

### 5. Client Management

- Clients list page
- Client profile view
- Credit tracking
- Client needs tab
- Purchase history

### 6. Pricing Engine

- Pricing rules page
- Pricing profiles page
- Rule creation/editing
- Profile assignment

### 7. Orders & Quotes

- Orders list
- Order creation flow
- Order status tracking
- Quotes list
- Quote creation

### 8. VIP Portal

- VIP Login
- VIP Dashboard
- Live Catalog
- Accounts Receivable
- Accounts Payable
- Marketplace Needs
- Marketplace Supply
- Leaderboard

### 9. Calendar & Events

- Calendar view
- Event creation
- Event editing
- Participant management

### 10. Todo Lists & Tasks

- Todo lists page
- Task creation
- Task completion
- Task assignment

### 11. Needs & Matchmaking

- Needs management page
- Vendor supply page
- Matchmaking service
- Match confidence scoring

### 12. Additional Features

- Search functionality
- Inbox/notifications
- Workflow queue
- Analytics page
- Leaderboard
- Locations management
- Purchase orders
- Returns

### 13. UI/UX & Responsiveness

- Mobile sidebar (hamburger menu)
- Dark/light theme
- Breadcrumb navigation
- Empty states
- Loading states
- Error handling

### 14. Edge Cases

- Empty data scenarios
- Large data pagination
- Concurrent operations
- Session timeout handling
- Network error recovery
