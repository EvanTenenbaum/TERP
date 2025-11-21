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
