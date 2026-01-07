# TERP Comprehensive User Flow Tests

## Test Execution Plan

**Live Site URL**: https://terp-app-b9s35.ondigitalocean.app
**Test Date**: January 6, 2026
**Tester**: Manus AI Agent

---

## Test Categories

### 1. Authentication & Login Flows
- [ ] **AUTH-001**: Navigate to login page
- [ ] **AUTH-002**: Login with valid credentials
- [ ] **AUTH-003**: Login with invalid credentials (error handling)
- [ ] **AUTH-004**: Session persistence after page refresh
- [ ] **AUTH-005**: Logout functionality

### 2. Dashboard (DashboardV3)
- [ ] **DASH-001**: Dashboard loads with KPIs
- [ ] **DASH-002**: KPI cards are clickable and navigate correctly
- [ ] **DASH-003**: Recent activity displays correctly
- [ ] **DASH-004**: Quick action buttons work
- [ ] **DASH-005**: Dashboard data refreshes

### 3. Inventory Management
- [ ] **INV-001**: Navigate to inventory page
- [ ] **INV-002**: View inventory list with pagination
- [ ] **INV-003**: Search/filter inventory items
- [ ] **INV-004**: Click on inventory item to view details
- [ ] **INV-005**: Add new inventory item
- [ ] **INV-006**: Edit existing inventory item
- [ ] **INV-007**: Delete inventory item
- [ ] **INV-008**: Bulk actions on inventory items
- [ ] **INV-009**: Export inventory data (CSV/Excel)

### 4. Products Management
- [ ] **PROD-001**: Navigate to products page
- [ ] **PROD-002**: View products list
- [ ] **PROD-003**: Search/filter products
- [ ] **PROD-004**: Add new product
- [ ] **PROD-005**: Edit existing product
- [ ] **PROD-006**: Delete product
- [ ] **PROD-007**: Product categories work correctly

### 5. Clients Management
- [ ] **CLI-001**: Navigate to clients list page
- [ ] **CLI-002**: View clients list with pagination
- [ ] **CLI-003**: Search/filter clients
- [ ] **CLI-004**: Click on client to view profile
- [ ] **CLI-005**: Add new client
- [ ] **CLI-006**: Edit client information
- [ ] **CLI-007**: Delete client
- [ ] **CLI-008**: Client credit settings work
- [ ] **CLI-009**: VIP Portal config for client

### 6. Orders Management
- [ ] **ORD-001**: Navigate to orders page
- [ ] **ORD-002**: View orders list
- [ ] **ORD-003**: Search/filter orders
- [ ] **ORD-004**: Create new order (full flow)
- [ ] **ORD-005**: Edit existing order
- [ ] **ORD-006**: Delete/cancel order
- [ ] **ORD-007**: Order status updates work
- [ ] **ORD-008**: Order details modal/page
- [ ] **ORD-009**: Bulk actions on orders

### 7. Quotes Management
- [ ] **QUO-001**: Navigate to quotes page
- [ ] **QUO-002**: View quotes list
- [ ] **QUO-003**: Create new quote
- [ ] **QUO-004**: Edit existing quote
- [ ] **QUO-005**: Convert quote to order
- [ ] **QUO-006**: Delete quote

### 8. Vendors Management
- [ ] **VEN-001**: Navigate to vendors page
- [ ] **VEN-002**: View vendors list
- [ ] **VEN-003**: Add new vendor
- [ ] **VEN-004**: Edit vendor
- [ ] **VEN-005**: Delete vendor
- [ ] **VEN-006**: Vendor supply page works

### 9. Purchase Orders
- [ ] **PO-001**: Navigate to purchase orders page
- [ ] **PO-002**: View PO list
- [ ] **PO-003**: Create new PO
- [ ] **PO-004**: Edit PO
- [ ] **PO-005**: Delete/cancel PO
- [ ] **PO-006**: PO status updates

### 10. Accounting Module
- [ ] **ACC-001**: Navigate to accounting dashboard
- [ ] **ACC-002**: Chart of accounts displays
- [ ] **ACC-003**: General ledger works
- [ ] **ACC-004**: Fiscal periods management
- [ ] **ACC-005**: Invoices - view list
- [ ] **ACC-006**: Invoices - create new
- [ ] **ACC-007**: Invoices - mark as paid
- [ ] **ACC-008**: Invoices - send reminder
- [ ] **ACC-009**: Invoices - download PDF
- [ ] **ACC-010**: Bills management
- [ ] **ACC-011**: Payments management
- [ ] **ACC-012**: Bank accounts
- [ ] **ACC-013**: Bank transactions
- [ ] **ACC-014**: Expenses management

### 11. Interest List (ACT-003)
- [ ] **INT-001**: Navigate to interest list page
- [ ] **INT-002**: View interest list items
- [ ] **INT-003**: Add item to interest list
- [ ] **INT-004**: Edit interest list item
- [ ] **INT-005**: Convert interest to order
- [ ] **INT-006**: Delete from interest list

### 12. Samples Management
- [ ] **SAM-001**: Navigate to samples page
- [ ] **SAM-002**: View samples list
- [ ] **SAM-003**: Add new sample
- [ ] **SAM-004**: Edit sample
- [ ] **SAM-005**: Track sample status
- [ ] **SAM-006**: Delete sample

### 13. Returns Management
- [ ] **RET-001**: Navigate to returns page
- [ ] **RET-002**: View returns list
- [ ] **RET-003**: Create new return
- [ ] **RET-004**: Process return
- [ ] **RET-005**: Delete return

### 14. Locations Management
- [ ] **LOC-001**: Navigate to locations page
- [ ] **LOC-002**: View locations list
- [ ] **LOC-003**: Add new location
- [ ] **LOC-004**: Edit location
- [ ] **LOC-005**: Delete location

### 15. Users Management
- [ ] **USR-001**: Navigate to users page
- [ ] **USR-002**: View users list
- [ ] **USR-003**: Add new user
- [ ] **USR-004**: Edit user
- [ ] **USR-005**: Delete/deactivate user
- [ ] **USR-006**: User permissions work

### 16. Settings
- [ ] **SET-001**: Navigate to settings page
- [ ] **SET-002**: General settings save correctly
- [ ] **SET-003**: COGS settings work
- [ ] **SET-004**: Notification preferences save
- [ ] **SET-005**: Feature flags management
- [ ] **SET-006**: Credit settings work

### 17. Pricing
- [ ] **PRI-001**: Navigate to pricing rules page
- [ ] **PRI-002**: View pricing rules
- [ ] **PRI-003**: Add new pricing rule
- [ ] **PRI-004**: Edit pricing rule
- [ ] **PRI-005**: Delete pricing rule
- [ ] **PRI-006**: Pricing profiles work

### 18. Todo Lists
- [ ] **TODO-001**: Navigate to todo lists page
- [ ] **TODO-002**: View todo lists
- [ ] **TODO-003**: Create new todo list
- [ ] **TODO-004**: Add task to list
- [ ] **TODO-005**: Mark task complete
- [ ] **TODO-006**: Edit task
- [ ] **TODO-007**: Delete task
- [ ] **TODO-008**: Quick add task (Ctrl+Shift+T)

### 19. Calendar
- [ ] **CAL-001**: Navigate to calendar page
- [ ] **CAL-002**: View calendar events
- [ ] **CAL-003**: Create new event
- [ ] **CAL-004**: Edit event
- [ ] **CAL-005**: Delete event

### 20. Notifications & Inbox
- [ ] **NOT-001**: Navigate to notifications page
- [ ] **NOT-002**: View notifications list
- [ ] **NOT-003**: Mark notification as read
- [ ] **NOT-004**: Clear notifications
- [ ] **NOT-005**: Inbox functionality

### 21. Analytics
- [ ] **ANA-001**: Navigate to analytics page
- [ ] **ANA-002**: Charts/graphs load correctly
- [ ] **ANA-003**: Date range filters work
- [ ] **ANA-004**: Export analytics data

### 22. Search Functionality
- [ ] **SRC-001**: Global search (Ctrl+K)
- [ ] **SRC-002**: Search results display correctly
- [ ] **SRC-003**: Click search result navigates correctly
- [ ] **SRC-004**: Search filters work

### 23. Keyboard Shortcuts (ENH-001)
- [ ] **KEY-001**: Ctrl+K opens command palette
- [ ] **KEY-002**: Ctrl+N creates new order
- [ ] **KEY-003**: Ctrl+Shift+T opens quick add task
- [ ] **KEY-004**: ? shows keyboard shortcuts modal

### 24. Bulk Actions (ENH-002)
- [ ] **BULK-001**: Select multiple items in data table
- [ ] **BULK-002**: Bulk actions bar appears
- [ ] **BULK-003**: Bulk delete works
- [ ] **BULK-004**: Bulk status update works

### 25. Export Functionality (ENH-003)
- [ ] **EXP-001**: Export button visible on data tables
- [ ] **EXP-002**: CSV export works
- [ ] **EXP-003**: Excel export works
- [ ] **EXP-004**: Exported file contains correct data

### 26. VIP Portal
- [ ] **VIP-001**: Navigate to VIP portal login
- [ ] **VIP-002**: VIP login works
- [ ] **VIP-003**: VIP dashboard displays
- [ ] **VIP-004**: Admin impersonation works
- [ ] **VIP-005**: Session ended page displays

### 27. Pick & Pack
- [ ] **PP-001**: Navigate to pick pack page
- [ ] **PP-002**: View pick pack queue
- [ ] **PP-003**: Process pick pack item
- [ ] **PP-004**: Mark as complete

### 28. Photography
- [ ] **PHO-001**: Navigate to photography page
- [ ] **PHO-002**: View photography queue
- [ ] **PHO-003**: Upload photos
- [ ] **PHO-004**: Associate photos with products

### 29. Live Shopping
- [ ] **LS-001**: Navigate to live shopping page
- [ ] **LS-002**: Create live shopping session
- [ ] **LS-003**: Join live shopping session
- [ ] **LS-004**: End live shopping session

### 30. Matchmaking Service
- [ ] **MM-001**: Navigate to matchmaking page
- [ ] **MM-002**: View matchmaking results
- [ ] **MM-003**: Run matchmaking algorithm
- [ ] **MM-004**: Apply matchmaking suggestions

### 31. Sales Portal
- [ ] **SP-001**: Navigate to unified sales portal
- [ ] **SP-002**: Sales portal loads correctly
- [ ] **SP-003**: Sales sheet creator works

### 32. Spreadsheet View
- [ ] **SS-001**: Navigate to spreadsheet view
- [ ] **SS-002**: Data displays in spreadsheet format
- [ ] **SS-003**: Edit cells
- [ ] **SS-004**: Save changes

### 33. Leaderboard
- [ ] **LB-001**: Navigate to leaderboard page
- [ ] **LB-002**: Leaderboard data displays
- [ ] **LB-003**: Time period filters work

### 34. Workflow Queue
- [ ] **WF-001**: Navigate to workflow queue
- [ ] **WF-002**: View pending workflows
- [ ] **WF-003**: Process workflow item
- [ ] **WF-004**: Workflow status updates

### 35. Needs Management
- [ ] **NEED-001**: Navigate to needs management page
- [ ] **NEED-002**: View needs list
- [ ] **NEED-003**: Add new need
- [ ] **NEED-004**: Edit need
- [ ] **NEED-005**: Delete need

### 36. Help Page
- [ ] **HELP-001**: Navigate to help page
- [ ] **HELP-002**: Help content displays
- [ ] **HELP-003**: Search help topics

### 37. Account Page
- [ ] **ACCT-001**: Navigate to account page
- [ ] **ACCT-002**: View account details
- [ ] **ACCT-003**: Edit account settings
- [ ] **ACCT-004**: Change password

### 38. Error Handling & Edge Cases
- [ ] **ERR-001**: 404 page displays for invalid routes
- [ ] **ERR-002**: API error handling (toast notifications)
- [ ] **ERR-003**: Form validation errors display
- [ ] **ERR-004**: Empty state displays correctly
- [ ] **ERR-005**: Loading states display correctly

### 39. Mobile Responsiveness
- [ ] **MOB-001**: Sidebar collapses on mobile
- [ ] **MOB-002**: Tables are scrollable on mobile
- [ ] **MOB-003**: Modals are mobile-friendly
- [ ] **MOB-004**: Touch targets are adequate size

### 40. Data Persistence
- [ ] **DATA-001**: Created items persist after refresh
- [ ] **DATA-002**: Edited items save correctly
- [ ] **DATA-003**: Deleted items are removed
- [ ] **DATA-004**: Settings persist after logout/login

---

## Test Results Template

| Test ID | Status | Notes | Screenshot |
|---------|--------|-------|------------|
| AUTH-001 | | | |
| AUTH-002 | | | |
| ... | | | |

---

## Issue Severity Levels

- **CRITICAL**: Application crash, data loss, security issue
- **HIGH**: Feature completely broken, blocking workflow
- **MEDIUM**: Feature partially broken, workaround exists
- **LOW**: Minor UX issue, cosmetic problem
- **INFO**: Observation, suggestion for improvement

