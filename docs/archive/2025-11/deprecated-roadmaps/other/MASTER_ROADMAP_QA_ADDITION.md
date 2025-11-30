---

## 🔴 QA-IDENTIFIED CRITICAL BUGS (From Nov 14, 2025 QA Report)

**Source:** Comprehensive End-to-End QA Testing  
**Total Issues:** 27 tasks (5 P0, 7 P1, 10 P2, 5 P3)  
**Full Details:** See `docs/roadmaps/QA_TASKS_BACKLOG.md`

### QA-001: Fix 404 Error - Todo Lists Module
**Priority:** P0 | **Status:** Not Started | **Effort:** 4-8h

Module `/todo` returns 404. Users cannot access task management functionality.

---

### QA-002: Fix 404 Error - Accounting Module

**Priority:** P0 | **Status:** Not Started | **Effort:** 8-16h

Module `/accounting` returns 404. Critical business function unavailable.

---

### QA-003: Fix 404 Error - COGS Settings Module

**Priority:** P0 | **Status:** Not Started | **Effort:** 4-8h

Module `/cogs-settings` returns 404. Cannot configure cost calculations.

---

### QA-004: Fix 404 Error - Analytics Module

**Priority:** P0 | **Status:** Not Started | **Effort:** 8-16h

Module `/analytics` returns 404. Business intelligence features unavailable.

---

### QA-005: Investigate and Fix Systemic Data Access Issues

**Priority:** P0 | **Status:** Not Started | **Effort:** 16-24h

**CRITICAL:** Widespread "No data found" across all modules despite UI expecting data.

**Affected Modules:**

- Dashboard, Orders, Inventory, Clients, Pricing Rules, Pricing Profiles, Matchmaking, Calendar, Sales Sheets, Create Order

**Symptoms:**

- Orders shows 4,400 total in metrics but 0 in table
- Inventory shows $96M value but "No inventory found"
- All data tables empty

**Investigation Required:**

1. Database connection and credentials
2. Authentication/authorization middleware
3. API endpoint responses
4. User permissions and roles
5. Database seeding/migration status

---

## 🔴 QA-IDENTIFIED HIGH PRIORITY BUGS

### QA-006: Fix Dashboard - Vendors Button 404

**Priority:** P1 | **Status:** Not Started | **Effort:** 2-4h

Dashboard Vendors button returns 404.

---

### QA-007: Fix Dashboard - Purchase Orders Button 404

**Priority:** P1 | **Status:** Not Started | **Effort:** 2-4h

Dashboard Purchase Orders button returns 404.

---

### QA-008: Fix Dashboard - Returns Button 404

**Priority:** P1 | **Status:** Not Started | **Effort:** 2-4h

Dashboard Returns button returns 404.

---

### QA-009: Fix Dashboard - Locations Button 404

**Priority:** P1 | **Status:** Not Started | **Effort:** 2-4h

Dashboard Locations button returns 404.

---

### QA-010: Fix Inventory - Export CSV Button

**Priority:** P1 | **Status:** Not Started | **Effort:** 4-6h

Export CSV button in Inventory module is unresponsive.

---

### QA-011: Fix Orders - Export CSV Button

**Priority:** P1 | **Status:** Not Started | **Effort:** 4-6h

Export CSV button in Orders module is unresponsive.

---

### QA-012: Fix Global Search Functionality

**Priority:** P1 | **Status:** Not Started | **Effort:** 8-12h

Global search bar accepts input but doesn't trigger search on Enter.

---

## 🟡 QA-IDENTIFIED MEDIUM PRIORITY BUGS

### QA-013: Fix Workflow Queue - Analytics Button 404

**Priority:** P2 | **Status:** Not Started | **Effort:** 4-6h

---

### QA-014: Fix Workflow Queue - History Button 404

**Priority:** P2 | **Status:** Not Started | **Effort:** 4-6h

---

### QA-015: Fix Matchmaking - Add Need Button 404

**Priority:** P2 | **Status:** Not Started | **Effort:** 4-6h

---

### QA-016: Fix Matchmaking - Add Supply Button 404

**Priority:** P2 | **Status:** Not Started | **Effort:** 4-6h

---

### QA-017: Fix Clients - Save Button (Customize Metrics)

**Priority:** P2 | **Status:** Not Started | **Effort:** 2-4h

Save button in Customize Metrics panel is unresponsive.

---

### QA-018: Fix Credit Settings - Save Changes Button

**Priority:** P2 | **Status:** Not Started | **Effort:** 2-4h

---

### QA-019: Fix Credit Settings - Reset to Defaults Button

**Priority:** P2 | **Status:** Not Started | **Effort:** 2-4h

---

### QA-020: Test and Fix Calendar - Create Event Form

**Priority:** P2 | **Status:** Not Started | **Effort:** 4-6h

Create Event form opens but submission not tested.

---

### QA-021: Test and Fix Pricing Rules - Create Rule Form

**Priority:** P2 | **Status:** Not Started | **Effort:** 4-6h

---

### QA-022: Test and Fix Pricing Profiles - Create Profile Form

**Priority:** P2 | **Status:** Not Started | **Effort:** 4-6h

---

## 🟢 QA-IDENTIFIED LOW PRIORITY TASKS

### QA-023: Conduct Mobile Responsiveness Testing

**Priority:** P3 | **Status:** Not Started | **Effort:** 16-24h

Mobile responsiveness not properly tested. May have responsive design issues.

---

### QA-024: Test Settings - Form Submissions

**Priority:** P3 | **Status:** Not Started | **Effort:** 6-8h

Multiple forms in Settings not tested (Create User, Reset Password, Assign Role, Create Role).

---

### QA-025: Test User Profile Functionality

**Priority:** P3 | **Status:** Not Started | **Effort:** 4-6h

---

### QA-026: Conduct Performance Testing

**Priority:** P3 | **Status:** Not Started | **Effort:** 16-24h

Page load times and API response times not measured.

---

### QA-027: Conduct Security Audit

**Priority:** P3 | **Status:** Not Started | **Effort:** 16-24h

Security audit not performed. Need to verify authentication, authorization, and vulnerability testing.

---

## 📊 QA Tasks Summary

**Total QA Tasks:** 27  
**P0 (Critical):** 5 tasks | 52-72 hours  
**P1 (High):** 7 tasks | 26-38 hours  
**P2 (Medium):** 10 tasks | 28-42 hours  
**P3 (Low):** 5 tasks | 58-86 hours  
**Total Estimated Effort:** 164-238 hours (20.5-29.75 days)

**Recommended Execution Order:**

1. QA-005 (Systemic data access) - Blocks everything
2. QA-001 through QA-004 (404 errors) - Critical missing modules
3. QA-006 through QA-012 (High priority bugs) - User-facing issues
4. QA-013 through QA-022 (Medium priority) - Feature completion
5. QA-023 through QA-027 (Low priority) - Testing and optimization

---
