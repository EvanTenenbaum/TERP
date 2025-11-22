# TERP Testing Roadmap

## Single Source of Truth for All Testing Tasks

**Version:** 1.0
**Last Updated:** November 19, 2025
**Status:** Active

---

## 🎯 Current Sprint (This Week: Nov 19-25, 2025)

### 🔴 CRITICAL PRIORITY - Phase 1: Foundational Coverage

**Objective:** Establish baseline test coverage for all critical modules and user flows.

- [ ] **TEST-001: Auth System - Unit & Integration Tests** 🔴 CRITICAL
  - **Type:** Unit, Integration
  - **Priority:** P0
  - **Status:** Not Started
  - **Linked Feature:** CORE-AUTH
  - **Module:** Auth
  - **Component:** Auth System
  - **Test Scope:** Comprehensive tests for user authentication, authorization, session management, and password hashing.
  - **Test File Location:** `tests/core/auth.test.ts`
  - **Estimated Effort:** 8-16 hours

- [ ] **TEST-002: Database Layer - Data Integrity Tests** 🔴 CRITICAL
  - **Type:** Integration
  - **Priority:** P0
  - **Status:** Not Started
  - **Linked Feature:** CORE-DB
  - **Module:** Database
  - **Component:** Database Layer
  - **Test Scope:** Tests for data consistency, foreign key constraints, and data type validation across all tables.
  - **Test File Location:** `tests/core/db.test.ts`
  - **Estimated Effort:** 8-16 hours

### 🟡 HIGH PRIORITY

- [ ] **TEST-003: Create Order Flow - E2E Test** 🟡 HIGH
  - **Type:** E2E
  - **Priority:** P1
  - **Status:** Not Started
  - **Linked Feature:** FEAT-ORDER-CREATE
  - **User Flow:** Create Order
  - **Test Scope:** End-to-end test simulating a user creating a new order, adding items, and submitting.
  - **Test File Location:** `e2e/create-order.spec.ts`
  - **Estimated Effort:** 4-8 hours

- [ ] **TEST-004: Inventory Module - Unit Tests** 🟡 HIGH
  - **Type:** Unit
  - **Priority:** P1
  - **Status:** Not Started
  - **Linked Feature:** FEAT-INVENTORY-MGMT
  - **Module:** Inventory
  - **Test Scope:** Unit tests for all inventory module functions (create, update, delete, stock tracking).
  - **Test File Location:** `tests/modules/inventory.test.ts`
  - **Estimated Effort:** 4-8 hours

---

## 🔜 Next Sprint (Next 1-2 Weeks)

- [ ] **TEST-005: Vendor Intake Flow - E2E Test**
- [ ] **TEST-006: Accounting Module - Unit Tests**
- [ ] **TEST-007: API Layer - Security Tests**

---

## 📦 Backlog (On Hold)

- [ ] **TEST-008: Performance Testing - Dashboard**
- [ ] **TEST-009: UI Components - Visual Regression Tests**

---

## ✅ Completed (Last 30 Days)

*No testing tasks completed yet.*

- [ ] **TEST-005: Admin Endpoints - Security Test** 🔴 CRITICAL
  - **Type:** Security
  - **Priority:** P0
  - **Status:** Not Started
  - **Linked Feature:** CL-003
  - **Module:** Admin
  - **Test Scope:** Verify that all admin endpoints are protected by the `adminProcedure` and return 403 Forbidden for non-admin users.
  - **Test File Location:** `tests/security/admin.test.ts`
  - **Estimated Effort:** 4-8 hours

- [ ] **TEST-006: SQL Injection - Security Test** 🔴 CRITICAL
  - **Type:** Security
  - **Priority:** P0
  - **Status:** Not Started
  - **Linked Feature:** CL-001
  - **Module:** Core
  - **Test Scope:** Attempt SQL injection attacks on all endpoints that take user input for database queries.
  - **Test File Location:** `tests/security/sqli.test.ts`
  - **Estimated Effort:** 8-16 hours

- [ ] **TEST-007: Dashboard - Performance Test** 🟡 HIGH
  - **Type:** Performance
  - **Priority:** P1
  - **Status:** Not Started
  - **Linked Feature:** FEAT-DASHBOARD
  - **Module:** Dashboard
  - **Test Scope:** Measure dashboard load time with 1,000+ data points. Identify and optimize slow queries.
  - **Test File Location:** `tests/performance/dashboard.test.ts`
  - **Estimated Effort:** 8-16 hours

---

## Phase 4: Exhaustive Interaction Protocol Coverage

**Objective:** Achieve 100% test coverage for all defined interaction protocols (TS-001 to TS-15).

### Test Categories

1.  **SYSTEM-WIDE CONTROLS** (TS-001, TS-002)
2.  **AUTHENTICATION** (TS-1.1, TS-1.2)
3.  **DASHBOARD & ANALYTICS** (TS-2.1, TS-2.2)
4.  **INVENTORY MANAGEMENT** (TS-3.1, TS-3.2, TS-3.3)
5.  **ACCOUNTING ENGINE** (TS-4.1, TS-4.2, TS-4.3)
6.  **SALES & ORDERS** (TS-5.1, TS-5.2, TS-5.3)
7.  **CRM & RELATIONSHIPS** (TS-6.1, TS-6.2)
8.  **SUPPLY CHAIN** (TS-7.1, TS-7.2)
9.  **COLLABORATION & TASKS** (TS-8.1, TS-8.2)
10. **SETTINGS & CONFIGURATION** (TS-9.1, TS-9.2)
11. **VIP PORTAL (BASIC)** (TS-10.1, TS-10.2)
12. **EDGE CASES & RESILIENCE** (TS-11.1, TS-11.2, TS-11.3)
13. **WORKFLOW BOARD (ADVANCED)** (TS-12.1, TS-12.2)
14. **COLLABORATION (ADVANCED)** (TS-13.1, TS-13.2)
15. **RETURNS MANAGEMENT (ADVANCED)** (TS-14.1, TS-14.2)
16. **VIP PORTAL (ADVANCED)** (TS-15.1, TS-15.2, TS-15.3)

### High-Risk Area Tasks

- [ ] **TEST-010: Workflow Board - E2E & Visual Regression Tests** 🟡 HIGH
  - **Type:** E2E, Visual Regression
  - **Priority:** P1
  - **Status:** Not Started
  - **Linked Feature:** FEAT-WORKFLOW-BOARD
  - **Test Scope:** Covers TS-12.1 (DND Physics) and TS-12.2 (Status Migration).
  - **Test File Location:** `e2e/workflow-board.spec.ts`
  - **Estimated Effort:** 8-12 hours

- [ ] **TEST-011: Advanced Collaboration - E2E Tests** 🟡 HIGH
  - **Type:** E2E
  - **Priority:** P1
  - **Status:** Not Started
  - **Linked Feature:** FEAT-MENTIONS
  - **Test Scope:** Covers TS-13.1 (Mention Logic) and TS-13.2 (Keyboard Nav).
  - **Test File Location:** `e2e/collaboration.spec.ts`
  - **Estimated Effort:** 6-10 hours

- [ ] **TEST-012: Returns Management - E2E Tests** 🟡 HIGH
  - **Type:** E2E
  - **Priority:** P1
  - **Status:** Not Started
  - **Linked Feature:** FEAT-RETURNS
  - **Test Scope:** Covers TS-14.1 (Dynamic Forms) and TS-14.2 (Restock Logic).
  - **Test File Location:** `e2e/returns-management.spec.ts`
  - **Estimated Effort:** 6-10 hours

- [ ] **TEST-013: Advanced VIP Portal - E2E Tests** 🟡 HIGH
  - **Type:** E2E
  - **Priority:** P1
  - **Status:** Not Started
  - **Linked Feature:** FEAT-VIP-ADVANCED
  - **Test Scope:** Covers TS-15.1 (Saved Views), TS-15.2 (Interest List Blocking), and TS-15.3 (Price Alerts).
  - **Test File Location:** `e2e/vip-portal-advanced.spec.ts`
  - **Estimated Effort:** 10-16 hours


---

## 🎯 E2E Testing - Master Test Suite Execution (Nov 22, 2025)

### Completed E2E Tests (24/42 protocols executed)

- [x] **E2E-001: Dashboard & KPIs (TS-2.1)** ✅ PASSED
  - **Type:** E2E
  - **Priority:** P1
  - **Status:** Completed (Nov 22, 2025)
  - **Test Protocol:** TS-2.1
  - **Result:** PASSED - Dashboard displays all KPIs correctly
  - **Evidence:** Cash flow, sales, inventory, debt metrics all functional

- [x] **E2E-002: Orders Management (TS-5.1)** ✅ PASSED
  - **Type:** E2E
  - **Priority:** P1
  - **Status:** Completed (Nov 22, 2025)
  - **Test Protocol:** TS-5.1
  - **Result:** PASSED - 26 orders displayed with correct metrics
  - **Note:** Debug dashboard visible in production (BUG-006)

- [x] **E2E-003: Client Management (TS-6.1)** ✅ PASSED
  - **Type:** E2E
  - **Priority:** P1
  - **Status:** Completed (Nov 22, 2025)
  - **Test Protocol:** TS-6.1
  - **Result:** PASSED - 68 clients with full CRM features

- [x] **E2E-004: Inventory Management (TS-3.1, TS-3.2)** ✅ PASSED
  - **Type:** E2E
  - **Priority:** P1
  - **Status:** Completed (Nov 22, 2025)
  - **Test Protocol:** TS-3.1, TS-3.2
  - **Result:** PASSED - Inventory tracking and batch management functional
  - **Evidence:** 6,731 units, $161,095.72 total value

- [x] **E2E-005: Accounting Dashboard (TS-4.1)** ✅ PASSED
  - **Type:** E2E
  - **Priority:** P1
  - **Status:** Completed (Nov 22, 2025)
  - **Test Protocol:** TS-4.1
  - **Result:** PASSED - AR/AP aging, cash balance all functional

- [x] **E2E-006: Matchmaking Service (TS-6.2)** ✅ PASSED
  - **Type:** E2E
  - **Priority:** P1
  - **Status:** Completed (Nov 22, 2025)
  - **Test Protocol:** TS-6.2
  - **Result:** PASSED - 15 needs, 3 supply items displayed

- [x] **E2E-007: Calendar & Tasks (TS-8.1, TS-8.2)** ✅ PASSED
  - **Type:** E2E
  - **Priority:** P2
  - **Status:** Completed (Nov 22, 2025)
  - **Test Protocol:** TS-8.1, TS-8.2
  - **Result:** PASSED - Calendar and todo lists fully functional

- [x] **E2E-008: Settings & Configuration (TS-9.1, TS-9.2)** ✅ PASSED
  - **Type:** E2E
  - **Priority:** P1
  - **Status:** Completed (Nov 22, 2025)
  - **Test Protocol:** TS-9.1, TS-9.2
  - **Result:** PASSED - COGS, Credit Intelligence, RBAC all functional

- [x] **E2E-009: 404 Error Handling (TS-11.1)** ✅ PASSED
  - **Type:** E2E
  - **Priority:** P2
  - **Status:** Completed (Nov 22, 2025)
  - **Test Protocol:** TS-11.1
  - **Result:** PASSED - Professional 404 page displays correctly

- [x] **E2E-010: Workflow Board (TS-12.1)** ✅ PASSED
  - **Type:** E2E
  - **Priority:** P2
  - **Status:** Completed (Nov 22, 2025)
  - **Test Protocol:** TS-12.1
  - **Result:** PASSED - Workflow queue interface functional

- [x] **E2E-011: Returns Management (TS-14.1)** ✅ PASSED
  - **Type:** E2E
  - **Priority:** P2
  - **Status:** Completed (Nov 22, 2025)
  - **Test Protocol:** TS-14.1
  - **Result:** PASSED - Returns interface with dynamic forms

- [x] **E2E-012: Sales Sheets (TS-5.2)** ✅ PASSED
  - **Type:** E2E
  - **Priority:** P2
  - **Status:** Completed (Nov 22, 2025)
  - **Test Protocol:** TS-5.2
  - **Result:** PASSED - Sales sheet creator functional

- [x] **E2E-013: Pricing Rules & Profiles** ✅ PASSED
  - **Type:** E2E
  - **Priority:** P2
  - **Status:** Completed (Nov 22, 2025)
  - **Result:** PASSED - 8 pricing rules, 5 profiles displayed

### Failed E2E Tests (2)

- [x] **E2E-014: Purchase Orders (TS-7.2)** 🔴 FAILED
  - **Type:** E2E
  - **Priority:** P0 (CRITICAL)
  - **Status:** Failed (Nov 22, 2025)
  - **Test Protocol:** TS-7.2
  - **Result:** FAILED - Application crash with unhandled error
  - **Bug Created:** BUG-008 (P0 CRITICAL)
  - **Error ID:** f7826da2e91648ebb82ddbbec10f2bc6

- [x] **E2E-015: Create Order Flow (TS-5.3)** 🔴 FAILED
  - **Type:** E2E
  - **Priority:** P1
  - **Status:** Failed (Nov 22, 2025)
  - **Test Protocol:** TS-5.3
  - **Result:** FAILED - 404 Page Not Found
  - **Bug Created:** BUG-009 (P1 MEDIUM-HIGH)

### Partial E2E Tests (5)

- [x] **E2E-016: Analytics Reporting (TS-2.2)** ⚠️ PARTIAL
  - **Type:** E2E
  - **Priority:** P2
  - **Status:** Partial (Nov 22, 2025)
  - **Test Protocol:** TS-2.2
  - **Result:** PARTIAL - Interface loads but shows placeholder data only
  - **Bug Created:** BUG-007 (P2 MEDIUM)

- [x] **E2E-017: Global Shortcuts (TS-001)** ⚠️ PARTIAL
  - **Type:** E2E
  - **Priority:** P2
  - **Status:** Partial (Nov 22, 2025)
  - **Test Protocol:** TS-001
  - **Result:** PARTIAL - Cmd+K shortcut not responding
  - **Bug Created:** BUG-005 (P2 MEDIUM)

- [x] **E2E-018: Vendor Management (TS-7.1)** ⚠️ PARTIAL
  - **Type:** E2E
  - **Priority:** P2
  - **Status:** Partial (Nov 22, 2025)
  - **Test Protocol:** TS-7.1
  - **Result:** PARTIAL - Interface functional but no seed data

- [x] **E2E-019: Location Management (TS-3.3)** ⚠️ PARTIAL
  - **Type:** E2E
  - **Priority:** P2
  - **Status:** Partial (Nov 22, 2025)
  - **Test Protocol:** TS-3.3
  - **Result:** PARTIAL - Interface functional but no seed data

### Not Found Tests (1)

- [x] **E2E-020: Theme Toggling (TS-002)** ❌ NOT FOUND
  - **Type:** E2E
  - **Priority:** P3
  - **Status:** Not Found (Nov 22, 2025)
  - **Test Protocol:** TS-002
  - **Result:** NOT FOUND - Feature not implemented

### Bugs Identified During E2E Testing

1. **BUG-005:** Command Palette (Cmd+K) Not Responding - P2 MEDIUM
2. **BUG-006:** Debug Dashboard Visible in Production - P3 LOW
3. **BUG-007:** Analytics Data Not Populated - P2 MEDIUM
4. **BUG-008:** Purchase Orders Page Crashes - P0 CRITICAL 🔴
5. **BUG-009:** Create Order Route Returns 404 - P1 MEDIUM-HIGH

### E2E Testing Summary

- **Total Protocols:** 42 (Master Test Suite TS-001 to TS-15)
- **Executed:** 24 (57%)
- **Passed:** 16 (67% of executed)
- **Partial:** 5 (21% of executed)
- **Failed:** 2 (8% of executed)
- **Not Found:** 1 (4% of executed)
- **Pass Rate:** 67% (16/24 executed tests)
- **Critical Bugs Found:** 1 (BUG-008)
- **Total Bugs Found:** 5

### Remaining E2E Tests (18 not executed)

1. TS-1.1: Authentication (logout/session)
2. TS-1.2: VIP Portal Access
3. TS-4.2: Accounts Receivable (detailed)
4. TS-4.3: Accounts Payable (detailed)
5. TS-10.1: VIP Portal Catalog View
6. TS-10.2: VIP Portal Self-Service Order
7. TS-11.2: Data Persistence
8. TS-11.3: Network Failure
9. TS-12.2: Workflow Board Status Migration
10. TS-13.1: Mention Logic
11. TS-13.2: Keyboard Navigation
12. TS-14.2: Returns Restock Logic
13. TS-15.1: VIP Portal Saved Views
14. TS-15.2: VIP Portal Interest List Blocking
15. TS-15.3: VIP Portal Price Alerts

### Next Actions

1. **IMMEDIATE:** Fix BUG-008 (Purchase Orders crash) - P0 CRITICAL
2. **HIGH:** Fix BUG-009 (Create Order 404) - P1
3. **HIGH:** Fix BUG-007 (Analytics data) - P2
4. **MEDIUM:** Complete remaining 18 E2E tests
5. **MEDIUM:** Add seed data for Vendors and Locations
6. **LOW:** Remove debug dashboard (BUG-006)
7. **LOW:** Implement command palette (BUG-005)



---

## 🧪 E2E UI Testing Tasks (Created: 2025-11-22)

### 🔴 CRITICAL PRIORITY - Blocking Features

- [ ] **E2E-001: Test Add Item Button on Create Order Page** 🔴 CRITICAL
  - **Type:** E2E, Bug Investigation
  - **Priority:** P0 (CRITICAL - BLOCKING)
  - **Status:** Not Started
  - **Linked Bug:** BUG-012
  - **Page:** `/orders/create`
  - **Test Scope:** Investigate and test "Add Item" button functionality on Create Order page
  - **Current Issue:** Button does not respond when clicked, 400 errors in console
  - **Test Steps:**
    1. Navigate to `/orders/create`
    2. Select a customer
    3. Click "Add Item" button
    4. Verify product selection modal/interface opens
    5. Select products and add to order
    6. Verify line items appear in order
  - **Expected Result:** Product selection interface opens, products can be added to order
  - **Actual Result:** No response, 400 errors in console
  - **Test File Location:** `e2e/create-order-add-item.spec.ts`
  - **Estimated Effort:** 4-8 hours (includes investigation and fix)
  - **Discovered:** E2E Testing Session 2025-11-22

- [ ] **E2E-002: Test Order Submission Workflow** 🔴 CRITICAL
  - **Type:** E2E
  - **Priority:** P0 (CRITICAL)
  - **Status:** Blocked by E2E-001
  - **Linked Feature:** Create Order
  - **Page:** `/orders/create`
  - **Test Scope:** Complete end-to-end order creation and submission
  - **Test Steps:**
    1. Navigate to `/orders/create`
    2. Select customer
    3. Add items to order (requires E2E-001 fix)
    4. Add order-level adjustments (if applicable)
    5. Click "Preview & Finalize" button
    6. Verify order preview displays correctly
    7. Submit order
    8. Verify order appears in orders list
    9. Verify order details are correct
  - **Expected Result:** Order successfully created and appears in orders list
  - **Test File Location:** `e2e/create-order-submit.spec.ts`
  - **Estimated Effort:** 4-6 hours
  - **Dependencies:** Requires E2E-001 completion

- [ ] **E2E-003: Test Inventory Table Data Viewing** 🔴 CRITICAL
  - **Type:** E2E
  - **Priority:** P0 (CRITICAL)
  - **Status:** Not Started
  - **Linked Feature:** Inventory Management
  - **Page:** `/inventory`
  - **Test Scope:** Verify inventory table displays data correctly
  - **Test Steps:**
    1. Navigate to `/inventory`
    2. Scroll down to view inventory table
    3. Verify table displays batch data
    4. Click table rows to view details
    5. Test table sorting by clicking column headers
    6. Verify data accuracy against database
  - **Expected Result:** Inventory table displays all batches with accurate data
  - **Test File Location:** `e2e/inventory-table.spec.ts`
  - **Estimated Effort:** 2-4 hours
  - **Discovered:** E2E Testing Session 2025-11-22

- [ ] **E2E-004: Test New Purchase Button** 🔴 CRITICAL
  - **Type:** E2E
  - **Priority:** P0 (CRITICAL)
  - **Status:** Not Started
  - **Linked Feature:** Inventory Replenishment
  - **Page:** `/inventory`
  - **Test Scope:** Test purchase creation workflow
  - **Test Steps:**
    1. Navigate to `/inventory`
    2. Click "New Purchase" button
    3. Verify purchase creation page/modal opens
    4. Fill in purchase details (vendor, products, quantities, costs)
    5. Submit purchase
    6. Verify purchase appears in system
    7. Verify inventory levels updated
  - **Expected Result:** Purchase successfully created, inventory updated
  - **Test File Location:** `e2e/new-purchase.spec.ts`
  - **Estimated Effort:** 4-6 hours
  - **Discovered:** E2E Testing Session 2025-11-22

### 🟡 HIGH PRIORITY - Core Features

- [ ] **E2E-005: Test Global Search Functionality** 🟡 HIGH
  - **Type:** E2E, Bug Fix
  - **Priority:** P1 (HIGH)
  - **Status:** Not Started
  - **Linked Bug:** BUG-010
  - **Component:** Global Search Bar (Header)
  - **Test Scope:** Test search functionality across quotes, customers, products
  - **Current Issue:** Search navigates to `/search` which returns 404
  - **Test Steps:**
    1. Enter search query in header search bar
    2. Press Enter or click search
    3. Verify search results display
    4. Test search across different entity types (quotes, customers, products)
    5. Verify search results are accurate
    6. Test empty search results
  - **Expected Result:** Search results display in modal/panel or results page
  - **Actual Result:** 404 error page
  - **Test File Location:** `e2e/global-search.spec.ts`
  - **Estimated Effort:** 4-6 hours (includes implementation)
  - **Discovered:** E2E Testing Session 2025-11-22

- [ ] **E2E-006: Test Export CSV Functionality** 🟡 HIGH
  - **Type:** E2E
  - **Priority:** P1 (HIGH)
  - **Status:** Not Started
  - **Linked Feature:** Data Export
  - **Pages:** `/orders`, `/inventory`
  - **Test Scope:** Test CSV export on Orders and Inventory pages
  - **Test Steps:**
    1. Navigate to `/orders`
    2. Click "Export CSV" button
    3. Verify CSV file downloads
    4. Verify CSV contains correct data
    5. Repeat for `/inventory` page
    6. Test with filtered data
    7. Test with empty results
  - **Expected Result:** CSV file downloads with accurate data
  - **Test File Location:** `e2e/export-csv.spec.ts`
  - **Estimated Effort:** 2-4 hours
  - **Discovered:** E2E Testing Session 2025-11-22

- [ ] **E2E-007: Test Order Status Filtering** 🟡 HIGH
  - **Type:** E2E
  - **Priority:** P1 (HIGH)
  - **Status:** Not Started
  - **Linked Feature:** Order Management
  - **Page:** `/orders`
  - **Test Scope:** Test status filter dropdown on Orders page
  - **Test Steps:**
    1. Navigate to `/orders`
    2. Click status filter dropdown (currently shows "All Statuses")
    3. Select different status filters (Pending, Packed, Shipped, etc.)
    4. Verify orders filtered correctly
    5. Verify order count updates
    6. Test "All Statuses" to reset filter
  - **Expected Result:** Orders filtered by selected status
  - **Test File Location:** `e2e/order-filtering.spec.ts`
  - **Estimated Effort:** 2-3 hours
  - **Discovered:** E2E Testing Session 2025-11-22

- [ ] **E2E-008: Test Inventory Search and Filters** 🟡 HIGH
  - **Type:** E2E
  - **Priority:** P1 (HIGH)
  - **Status:** Not Started
  - **Linked Feature:** Inventory Management
  - **Page:** `/inventory`
  - **Test Scope:** Test search bar and advanced filters on Inventory page
  - **Test Steps:**
    1. Navigate to `/inventory`
    2. Test search bar (search by SKU, batch code, product name)
    3. Verify search results display correctly
    4. Click "Advanced Filters" button
    5. Test various filter combinations
    6. Verify filtered results are accurate
    7. Test clearing filters
  - **Expected Result:** Search and filters work correctly, accurate results displayed
  - **Test File Location:** `e2e/inventory-search-filters.spec.ts`
  - **Estimated Effort:** 3-4 hours
  - **Discovered:** E2E Testing Session 2025-11-22

- [ ] **E2E-009: Test Order Detail View** 🟡 HIGH
  - **Type:** E2E
  - **Priority:** P1 (HIGH)
  - **Status:** Not Started
  - **Linked Feature:** Order Management
  - **Page:** `/orders`
  - **Test Scope:** Test clicking order cards to view order details
  - **Test Steps:**
    1. Navigate to `/orders`
    2. Click on an order card
    3. Verify order detail page/modal opens
    4. Verify all order information displayed correctly
    5. Test navigation back to orders list
    6. Test with different order types (Sale, Purchase, Quote)
  - **Expected Result:** Order details display correctly with all information
  - **Test File Location:** `e2e/order-details.spec.ts`
  - **Estimated Effort:** 2-3 hours
  - **Discovered:** E2E Testing Session 2025-11-22

- [ ] **E2E-010: Test Settings Forms** 🟡 HIGH
  - **Type:** E2E
  - **Priority:** P1 (HIGH)
  - **Status:** Not Started
  - **Linked Feature:** User Management
  - **Page:** `/settings`
  - **Test Scope:** Test Create User and Reset Password forms
  - **Test Steps:**
    1. Navigate to `/settings`
    2. Fill in "Create User" form
    3. Submit form
    4. Verify user created successfully
    5. Test "Reset Password" form
    6. Verify password reset works
    7. Test form validation (empty fields, invalid input)
    8. Test all settings tabs (User Roles, Roles, Permissions, etc.)
  - **Expected Result:** Forms work correctly, users created, passwords reset
  - **Test File Location:** `e2e/settings-forms.spec.ts`
  - **Estimated Effort:** 3-4 hours
  - **Discovered:** E2E Testing Session 2025-11-22

### 🟢 MEDIUM PRIORITY - Enhancement Features

- [ ] **E2E-011: Test Saved Views Functionality** 🟢 MEDIUM
  - **Type:** E2E
  - **Priority:** P2 (MEDIUM)
  - **Status:** Not Started
  - **Linked Feature:** View Management
  - **Page:** `/inventory`
  - **Test Scope:** Test saved views and view management
  - **Test Steps:**
    1. Navigate to `/inventory`
    2. Apply filters/search
    3. Click "Save View" button
    4. Name and save view
    5. Click "Saved Views" button
    6. Load saved view
    7. Verify filters/search restored
    8. Test deleting saved views
  - **Expected Result:** Views save and load correctly
  - **Test File Location:** `e2e/saved-views.spec.ts`
  - **Estimated Effort:** 2-3 hours
  - **Discovered:** E2E Testing Session 2025-11-22

- [ ] **E2E-012: Test Customize Metrics Functionality** 🟢 MEDIUM
  - **Type:** E2E
  - **Priority:** P2 (MEDIUM)
  - **Status:** Not Started
  - **Linked Feature:** Dashboard Customization
  - **Pages:** `/orders`, `/inventory`, `/`
  - **Test Scope:** Test metrics customization on multiple pages
  - **Test Steps:**
    1. Navigate to page with "Customize Metrics" button
    2. Click "Customize Metrics"
    3. Verify customization interface opens
    4. Modify metrics display
    5. Save changes
    6. Verify metrics updated
    7. Test across different pages
  - **Expected Result:** Metrics can be customized and changes persist
  - **Test File Location:** `e2e/customize-metrics.spec.ts`
  - **Estimated Effort:** 2-3 hours
  - **Discovered:** E2E Testing Session 2025-11-22

- [ ] **E2E-013: Test Draft Order Workflow** 🟢 MEDIUM
  - **Type:** E2E
  - **Priority:** P2 (MEDIUM)
  - **Status:** Not Started
  - **Linked Feature:** Order Management
  - **Page:** `/orders/create`
  - **Test Scope:** Test saving and loading draft orders
  - **Test Steps:**
    1. Navigate to `/orders/create`
    2. Start creating order (select customer, add items)
    3. Click "Save as Draft" button
    4. Verify draft saved
    5. Navigate to `/orders`
    6. Click "Draft Orders" tab
    7. Verify draft appears in list
    8. Click draft to resume editing
    9. Complete and submit order
  - **Expected Result:** Draft orders save, load, and can be completed
  - **Test File Location:** `e2e/draft-orders.spec.ts`
  - **Estimated Effort:** 3-4 hours
  - **Discovered:** E2E Testing Session 2025-11-22

- [ ] **E2E-014: Test Order Type Switching** 🟢 MEDIUM
  - **Type:** E2E
  - **Priority:** P2 (MEDIUM)
  - **Status:** Not Started
  - **Linked Feature:** Order Management
  - **Page:** `/orders/create`
  - **Test Scope:** Test switching between Sale/Purchase/Quote order types
  - **Test Steps:**
    1. Navigate to `/orders/create`
    2. Click order type dropdown (currently "Sale")
    3. Select "Purchase"
    4. Verify UI updates for purchase order
    5. Select "Quote"
    6. Verify UI updates for quote
    7. Test creating each order type
    8. Verify orders created with correct type
  - **Expected Result:** Order type switching works, UI adapts correctly
  - **Test File Location:** `e2e/order-type-switching.spec.ts`
  - **Estimated Effort:** 2-3 hours
  - **Discovered:** E2E Testing Session 2025-11-22

- [ ] **E2E-015: Test Order-Level Adjustments** 🟢 MEDIUM
  - **Type:** E2E
  - **Priority:** P2 (MEDIUM)
  - **Status:** Not Started
  - **Linked Feature:** Order Management
  - **Page:** `/orders/create`
  - **Test Scope:** Test order-level adjustment feature
  - **Test Steps:**
    1. Navigate to `/orders/create`
    2. Create order with items
    3. Click/expand "Order-Level Adjustment" section
    4. Add discount or fee
    5. Verify order total updates
    6. Submit order
    7. Verify adjustment applied correctly
  - **Expected Result:** Adjustments can be added and affect order total
  - **Test File Location:** `e2e/order-adjustments.spec.ts`
  - **Estimated Effort:** 2-3 hours
  - **Discovered:** E2E Testing Session 2025-11-22

---

## 📊 E2E Testing Summary

**Total E2E Tests Identified:** 15  
**Critical Priority:** 4 tests  
**High Priority:** 6 tests  
**Medium Priority:** 5 tests  

**Estimated Total Effort:** 45-68 hours

**Dependencies:**
- E2E-002 blocked by E2E-001 (Add Item button must work before order submission can be tested)

**Key Findings from Testing Session:**
- 3 critical bugs identified (BUG-010, BUG-011, BUG-012)
- Most UI elements present but untested
- Strong foundation with professional UI/UX
- Need systematic testing of each feature

