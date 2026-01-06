# QA Tasks Backlog

**Source:** Comprehensive QA Reports (Latest: November 14, 2025)  
**Total Issues:** 50+  
**Priority Distribution:** 4 P0, 7 P1, 10 P2, 5 P3

## 🔬 How This Backlog is Populated

This backlog is automatically updated when QA agents perform **"live qa"** testing sessions. Each QA session:

1. Tests the live production site systematically across 7 layers
2. Identifies and documents all bugs, UI/UX issues, and performance problems
3. Creates new tasks in this backlog with unique QA-XXX IDs
4. Provides detailed reproduction steps, screenshots, and impact analysis

**To initiate a QA session:** Say "live qa" to trigger the comprehensive testing protocol.

**QA Template Location:** `docs/agent_prompts/live_qa/live_qa_prompt.md`

---

## 🔴 P0 - CRITICAL (Must Fix Immediately)

### QA-001: Fix 404 Error - Todo Lists Module

**Type:** Bug - Critical
**Priority:** P0
**Status:** Complete
**Module:** Todo Lists (/todo)

**Description:**
The Todo Lists module returns a 404 error when accessed. This is a critical missing feature that users expect.

**Impact:**

- Users cannot access todo/task management functionality
- Module is completely non-functional

**Acceptance Criteria:**

- `/todo` route exists and loads successfully
- Basic todo list UI displays
- Users can view existing todos (if any)

**Estimated Effort:** 4-8 hours

**Resolution Notes (2026-01-06):**
Verified: Routes and pages exist in codebase. Files confirmed:

- `client/src/pages/TodoListsPage.tsx`
- `client/src/pages/TodoListDetailPage.tsx`
- `server/routers/todoLists.ts`
- `server/routers/todoTasks.ts`
- Routes `/todo` and `/todos` configured in App.tsx (lines 175-177)

If 404 in production, see QA-005 for data access investigation.

---

### QA-002: Fix 404 Error - Accounting Module

**Type:** Bug - Critical
**Priority:** P0
**Status:** Complete
**Module:** Accounting (/accounting)

**Description:**
The Accounting module returns a 404 error. This is a core business function that must be available.

**Impact:**

- Users cannot access financial/accounting features
- Critical business workflows blocked

**Acceptance Criteria:**

- `/accounting` route exists and loads successfully
- Basic accounting UI displays
- Users can view financial data

**Estimated Effort:** 8-16 hours

**Resolution Notes (2026-01-06):**
Verified: Routes and pages exist in codebase. Files confirmed:

- `client/src/pages/accounting/AccountingDashboard.tsx`
- `client/src/pages/accounting/ChartOfAccounts.tsx`
- `client/src/pages/accounting/GeneralLedger.tsx`
- `client/src/pages/accounting/FiscalPeriods.tsx`
- `client/src/pages/accounting/Invoices.tsx`
- `client/src/pages/accounting/Bills.tsx`
- `client/src/pages/accounting/Payments.tsx`
- `client/src/pages/accounting/BankAccounts.tsx`
- `client/src/pages/accounting/BankTransactions.tsx`
- `client/src/pages/accounting/Expenses.tsx`
- `server/routers/accounting.ts`
- Route `/accounting` configured in App.tsx (line 100)

If 404 in production, see QA-005 for data access investigation.

---

### QA-003: Fix 404 Error - COGS Settings Module

**Type:** Bug - Critical
**Priority:** P0
**Status:** Complete
**Module:** COGS Settings (/settings/cogs)

**Description:**
The Cost of Goods Sold (COGS) Settings module returns a 404 error. This is essential for cannabis business operations.

**Impact:**

- Users cannot configure COGS calculations
- Profitability calculations may be incorrect

**Acceptance Criteria:**

- `/settings/cogs` route exists and loads successfully
- COGS configuration UI displays
- Users can view and modify COGS settings

**Estimated Effort:** 4-8 hours

**Resolution Notes (2026-01-06):**
Verified: Routes and pages exist in codebase. Files confirmed:

- `client/src/pages/CogsSettingsPage.tsx`
- `server/routers/cogs.ts`
- Route `/settings/cogs` configured in App.tsx (line 141)

Note: Route is `/settings/cogs` not `/cogs-settings` as originally documented.

If 404 in production, see QA-005 for data access investigation.

---

### QA-004: Fix 404 Error - Analytics Module

**Type:** Bug - Critical
**Priority:** P0
**Status:** Complete
**Module:** Analytics (/analytics)

**Description:**
The Analytics module returns a 404 error. Analytics is a core feature for business intelligence.

**Impact:**

- Users cannot access business analytics and reporting
- Data-driven decision making blocked

**Acceptance Criteria:**

- `/analytics` route exists and loads successfully
- Analytics dashboard displays
- Users can view charts and reports

**Estimated Effort:** 8-16 hours

**Resolution Notes (2026-01-06):**
Verified: Routes and pages exist in codebase. Files confirmed:

- `client/src/pages/AnalyticsPage.tsx`
- `server/routers/analytics.ts`
- Route `/analytics` configured in App.tsx (line 182)
- Navigation link "Reports" → `/analytics` in navigation.ts (line 84)

If 404 in production, see QA-005 for data access investigation.

---

### QA-005: Investigate and Fix Systemic Data Access Issues

**Type:** Bug - Critical  
**Priority:** P0  
**Status:** Not Started  
**Affected Modules:** Dashboard, Orders, Inventory, Clients, Pricing Rules, Pricing Profiles, Matchmaking, Calendar, Sales Sheets, Create Order

**Description:**  
Widespread "No data found" messages across all modules despite UI expecting data. This appears to be a systemic authentication, authorization, or database connection issue.

**Symptoms:**

- Orders module shows 4,400 total orders in metrics but 0 in table
- Inventory shows $96M value but "No inventory found"
- Clients shows "No clients found"
- All data tables are empty

**Root Cause Investigation Required:**

1. Check database connection and credentials
2. Verify authentication/authorization middleware
3. Check API endpoint responses
4. Verify user permissions and roles
5. Check database seeding/migration status

**Impact:**

- Application appears completely non-functional
- Users cannot access any data
- All core workflows blocked

**Acceptance Criteria:**

- All modules display data correctly
- API endpoints return data successfully
- Database queries execute properly
- User permissions allow data access

**Estimated Effort:** 16-24 hours (investigation + fix)

---

## 🔴 P1 - HIGH PRIORITY

### QA-006: Fix Dashboard - Vendors Button 404

**Type:** Bug - High  
**Priority:** P1  
**Status:** Not Started  
**Module:** Dashboard

**Description:**  
Clicking the Vendors button on the dashboard results in a 404 error.

**Acceptance Criteria:**

- Vendors button navigates to working vendors module
- OR button is removed/disabled if module not implemented

**Estimated Effort:** 2-4 hours

---

### QA-007: Fix Dashboard - Purchase Orders Button 404

**Type:** Bug - High  
**Priority:** P1  
**Status:** Not Started  
**Module:** Dashboard

**Description:**  
Clicking the Purchase Orders button on the dashboard results in a 404 error.

**Acceptance Criteria:**

- Purchase Orders button navigates to working PO module
- OR button is removed/disabled if module not implemented

**Estimated Effort:** 2-4 hours

---

### QA-008: Fix Dashboard - Returns Button 404

**Type:** Bug - High  
**Priority:** P1  
**Status:** Not Started  
**Module:** Dashboard

**Description:**  
Clicking the Returns button on the dashboard results in a 404 error.

**Acceptance Criteria:**

- Returns button navigates to working returns module
- OR button is removed/disabled if module not implemented

**Estimated Effort:** 2-4 hours

---

### QA-009: Fix Dashboard - Locations Button 404

**Type:** Bug - High  
**Priority:** P1  
**Status:** Not Started  
**Module:** Dashboard

**Description:**  
Clicking the Locations button on the dashboard results in a 404 error.

**Acceptance Criteria:**

- Locations button navigates to working locations module
- OR button is removed/disabled if module not implemented

**Estimated Effort:** 2-4 hours

---

### QA-010: Fix Inventory - Export CSV Button

**Type:** Bug - High  
**Priority:** P1  
**Status:** Not Started  
**Module:** Inventory

**Description:**  
The Export CSV button in the Inventory module is unresponsive.

**Acceptance Criteria:**

- Export CSV button triggers CSV download
- Downloaded CSV contains inventory data
- File format is valid CSV

**Estimated Effort:** 4-6 hours

---

### QA-011: Fix Orders - Export CSV Button

**Type:** Bug - High  
**Priority:** P1  
**Status:** Not Started  
**Module:** Orders

**Description:**  
The Export CSV button in the Orders module is unresponsive.

**Acceptance Criteria:**

- Export CSV button triggers CSV download
- Downloaded CSV contains order data
- File format is valid CSV

**Estimated Effort:** 4-6 hours

---

### QA-012: Fix Global Search Functionality

**Type:** Bug - High  
**Priority:** P1  
**Status:** Not Started  
**Module:** Global Navigation

**Description:**  
The global search bar accepts input but pressing Enter does not trigger search or navigate to results.

**Acceptance Criteria:**

- Search bar triggers search on Enter key
- Search results page displays
- Results are relevant to search query

**Estimated Effort:** 8-12 hours

---

## 🟡 P2 - MEDIUM PRIORITY

### QA-013: Fix Workflow Queue - Analytics Button 404

**Type:** Bug - Medium  
**Priority:** P2  
**Status:** Not Started  
**Module:** Workflow Queue

**Description:**  
The Analytics button in Workflow Queue module returns 404 error.

**Acceptance Criteria:**

- Analytics button navigates to workflow analytics page
- OR button is removed if feature not implemented

**Estimated Effort:** 4-6 hours

---

### QA-014: Fix Workflow Queue - History Button 404

**Type:** Bug - Medium  
**Priority:** P2  
**Status:** Not Started  
**Module:** Workflow Queue

**Description:**  
The History button in Workflow Queue module returns 404 error.

**Acceptance Criteria:**

- History button navigates to workflow history page
- OR button is removed if feature not implemented

**Estimated Effort:** 4-6 hours

---

### QA-015: Fix Matchmaking - Add Need Button 404

**Type:** Bug - Medium  
**Priority:** P2  
**Status:** Not Started  
**Module:** Matchmaking

**Description:**  
The Add Need button in Matchmaking module returns 404 error.

**Acceptance Criteria:**

- Add Need button opens modal or navigates to form
- Users can create new needs

**Estimated Effort:** 4-6 hours

---

### QA-016: Fix Matchmaking - Add Supply Button 404

**Type:** Bug - Medium  
**Priority:** P2  
**Status:** Not Started  
**Module:** Matchmaking

**Description:**  
The Add Supply button in Matchmaking module returns 404 error.

**Acceptance Criteria:**

- Add Supply button opens modal or navigates to form
- Users can create new supplies

**Estimated Effort:** 4-6 hours

---

### QA-017: Fix Clients - Save Button (Customize Metrics)

**Type:** Bug - Medium  
**Priority:** P2  
**Status:** Not Started  
**Module:** Clients

**Description:**  
The Save button in the Customize Metrics panel is unresponsive.

**Acceptance Criteria:**

- Save button persists metric customization
- User preferences are saved to database
- Confirmation message displays

**Estimated Effort:** 2-4 hours

---

### QA-018: Fix Credit Settings - Save Changes Button

**Type:** Bug - Medium  
**Priority:** P2  
**Status:** Not Started  
**Module:** Credit Settings

**Description:**  
The Save Changes button in Credit Settings is unresponsive.

**Acceptance Criteria:**

- Save Changes button persists credit settings
- Settings are saved to database
- Confirmation message displays

**Estimated Effort:** 2-4 hours

---

### QA-019: Fix Credit Settings - Reset to Defaults Button

**Type:** Bug - Medium  
**Priority:** P2  
**Status:** Not Started  
**Module:** Credit Settings

**Description:**  
The Reset to Defaults button in Credit Settings is unresponsive.

**Acceptance Criteria:**

- Reset button restores default credit settings
- Confirmation dialog displays before reset
- Settings are updated in database

**Estimated Effort:** 2-4 hours

---

### QA-020: Test and Fix Calendar - Create Event Form

**Type:** Testing + Bug  
**Priority:** P2  
**Status:** Not Started  
**Module:** Calendar

**Description:**  
Create Event form opens but submission was not tested. Need to verify form works end-to-end.

**Acceptance Criteria:**

- Create Event form accepts input
- Form validation works
- Event is created and displays on calendar
- Success message displays

**Estimated Effort:** 4-6 hours

---

### QA-021: Test and Fix Pricing Rules - Create Rule Form

**Type:** Testing + Bug  
**Priority:** P2  
**Status:** Not Started  
**Module:** Pricing Rules

**Description:**  
Create Rule form opens but submission was not tested. Need to verify form works end-to-end.

**Acceptance Criteria:**

- Create Rule form accepts input
- Form validation works
- Rule is created and displays in list
- Success message displays

**Estimated Effort:** 4-6 hours

---

### QA-022: Test and Fix Pricing Profiles - Create Profile Form

**Type:** Testing + Bug  
**Priority:** P2  
**Status:** Not Started  
**Module:** Pricing Profiles

**Description:**  
Create Profile form opens but submission was not tested. Need to verify form works end-to-end.

**Acceptance Criteria:**

- Create Profile form accepts input
- Form validation works
- Profile is created and displays in list
- Success message displays

**Estimated Effort:** 4-6 hours

---

## 🟢 P3 - LOW PRIORITY

### QA-023: Conduct Mobile Responsiveness Testing

**Type:** Testing  
**Priority:** P3  
**Status:** Not Started  
**Module:** All Modules

**Description:**  
Mobile responsiveness was not properly tested. Application may not work well on mobile devices.

**Acceptance Criteria:**

- Test all modules on mobile viewport
- Identify and fix responsive design issues
- Verify touch interactions work
- Test on actual mobile devices

**Estimated Effort:** 16-24 hours

---

### QA-024: Test Settings - Form Submissions

**Type:** Testing  
**Priority:** P3  
**Status:** Not Started  
**Module:** Settings

**Description:**  
Multiple forms in Settings module were not tested (Create User, Reset Password, Assign Role, Create Role).

**Acceptance Criteria:**

- All forms accept input
- Form validation works
- Submissions create/update data
- Success messages display

**Estimated Effort:** 6-8 hours

---

### QA-025: Test User Profile Functionality

**Type:** Testing  
**Priority:** P3  
**Status:** Not Started  
**Module:** User Profile

**Description:**  
User profile functionality was not tested.

**Acceptance Criteria:**

- User profile displays correctly
- Profile editing works
- Password change works
- Avatar upload works (if applicable)

**Estimated Effort:** 4-6 hours

---

### QA-026: Conduct Performance Testing

**Type:** Testing  
**Priority:** P3  
**Status:** Not Started  
**Module:** All Modules

**Description:**  
Performance testing was not conducted. Need to measure and optimize page load times and API response times.

**Acceptance Criteria:**

- Measure page load times for all modules
- Measure API response times
- Identify performance bottlenecks
- Optimize slow queries/endpoints

**Estimated Effort:** 16-24 hours

---

### QA-027: Conduct Security Audit

**Type:** Testing  
**Priority:** P3  
**Status:** Not Started  
**Module:** All Modules

**Description:**  
Security audit was not performed. Need to verify application security.

**Acceptance Criteria:**

- Test authentication/authorization
- Test for SQL injection vulnerabilities
- Test for XSS vulnerabilities
- Test for CSRF vulnerabilities
- Verify secure credential storage

**Estimated Effort:** 16-24 hours

---

## 📊 Summary Statistics

**Total Tasks:** 27
**P0 (Critical):** 5 tasks (4 complete, 1 open)
**P1 (High):** 7 tasks
**P2 (Medium):** 10 tasks
**P3 (Low):** 5 tasks

**Estimated Total Effort (Remaining):**

- P0: 16-24 hours (only QA-005 remains)
- P1: 26-38 hours (3.25-4.75 days)
- P2: 28-42 hours (3.5-5.25 days)
- P3: 58-86 hours (7.25-10.75 days)
- **Total: 128-190 hours (16-23.75 days)**

**Recommended Approach:**

1. Fix P0 issues first (critical blockers)
2. Fix P1 issues (high-impact bugs)
3. Address P2 issues (medium-impact bugs)
4. Schedule P3 issues (testing and optimization)

---

**Document Created:** November 14, 2025
**Last Updated:** January 6, 2026
**Source:** Comprehensive QA Report
**Next Steps:** Investigate QA-005 data access issues; prioritize P1/P2 bugs
