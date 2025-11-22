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
