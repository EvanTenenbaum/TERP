# New Tasks Backlog - November 14, 2025

This backlog contains 23 new tasks identified from the video walkthrough bug report.

---

## 🐞 Bugs (13 tasks)

### QA-028: Fix Old Sidebar Navigation

**Priority:** P1 | **Status:** Not Started | **Effort:** 4-8h
An old, out-of-place sidebar navigation menu appears on the dashboard, most prominently on mobile.

---

### QA-029: Fix Inbox Dropdown Navigation

**Priority:** P2 | **Status:** Not Started | **Effort:** 2-4h
The "Inbox" button in the main navigation acts as a direct link instead of a dropdown menu.

---

### QA-030: Add In-App Back Buttons

**Priority:** P2 | **Status:** Not Started | **Effort:** 8-16h
The application lacks in-app back buttons, forcing reliance on the browser's back button for navigation.

---

### QA-031: Fix Settings Icon Responsiveness

**Priority:** P0 | **Status:** Not Started | **Effort:** 1-2h
The "Settings" icon in the main navigation is unresponsive and does not trigger any action.

---

### QA-032: Fix User Profile Icon Responsiveness

**Priority:** P0 | **Status:** Not Started | **Effort:** 1-2h
The user profile icon in the main navigation is also unresponsive.

---

### QA-033: Fix Custom Layout Blank Dashboard

**Priority:** P1 | **Status:** Not Started | **Effort:** 8-16h
Selecting the "Custom" layout preset from the "Customize" panel results in a blank dashboard.

---

### QA-034: Fix Widget Visibility Disappearing

**Priority:** P1 | **Status:** Not Started | **Effort:** 4-8h
The "Widget Visibility" options disappear when the "Custom" layout is selected.

---

### QA-035: Fix Dashboard Widgets Showing No Data

**Priority:** P0 | **Status:** Not Started | **Effort:** 16-24h
All dashboard widgets show "No data available," even though seed data is expected to be present.

---

### QA-036: Fix Time Period Filters on Widgets

**Priority:** P2 | **Status:** Not Started | **Effort:** 4-8h
The time period filter dropdowns on dashboard widgets do not affect the displayed data.

---

### QA-037: Fix Comments Submission

**Priority:** P1 | **Status:** Not Started | **Effort:** 8-16h
The "Comments" feature is non-functional; users cannot submit comments.

---

### QA-038: Fix @ Tagging in Comments

**Priority:** P2 | **Status:** Not Started | **Effort:** 4-8h
The functionality for tagging users with `@` in comments is untested and likely broken.

---

### QA-039: Add User Selection for Shared Lists

**Priority:** P1 | **Status:** Not Started | **Effort:** 8-16h
When creating a shared list, there is no option to select which users to share the list with.

---

### QA-040: Mark List Name Field as Required

**Priority:** P3 | **Status:** Not Started | **Effort:** 1-2h
The "List Name" field in the "Create New List" modal is required but not visually indicated as such.

---

## ✨ Feature Requests (10 tasks)

### QA-041: Merge Inbox and To-Do List Modules

**Priority:** P2 | **Status:** Not Started | **Effort:** 24-40h
The current "Inbox" and "To-Do List" features should be consolidated into a single, unified system for managing tasks and notifications.

---

### QA-042: Redesign Event Creation Form

**Priority:** P1 | **Status:** Not Started | **Effort:** 16-24h
The "Create Event" form needs a major overhaul. This includes: renaming "Module" to "Meeting Type," consolidating "Task" and "Deadline" into a single "Task" type, reviewing and clarifying the purpose of other event types, removing the "Status" and "Priority" dropdowns, and simplifying the "Visibility" options to "Private" and "Company."

---

### QA-043: Add Event Attendees Functionality

**Priority:** P1 | **Status:** Not Started | **Effort:** 8-16h
The "Create Event" form needs a way to add both internal team members and external contacts as attendees.

---

### QA-044: Implement Event Invitation Workflow

**Priority:** P1 | **Status:** Not Started | **Effort:** 16-24h
A workflow for sending and managing event invitations needs to be designed. This should include options for auto-accepting invitations and admin-level controls.

---

### QA-045: Link Events to Clients

**Priority:** P2 | **Status:** Not Started | **Effort:** 8-16h
Events should be linkable to specific clients to track interactions and history.

---

### QA-046: Add Click-to-Create Event on Calendar

**Priority:** P2 | **Status:** Not Started | **Effort:** 4-8h
Users should be able to create a new calendar event by clicking directly on a day in the calendar view.

---

### QA-047: Set Default Calendar View to Business Hours

**Priority:** P3 | **Status:** Not Started | **Effort:** 1-2h
The week view in the calendar should default to a more standard business day view, such as starting at 7 a.m.

---

### QA-048: Design @ Mention Workflow

**Priority:** P2 | **Status:** Not Started | **Effort:** 8-16h
A clear workflow needs to be defined and implemented for how `@` mentions in comments create tasks or notifications in the user's unified inbox.

---

### QA-049: Conduct Mobile Responsiveness Review

**Priority:** P2 | **Status:** Not Started | **Effort:** 8-16h
The current review is focused on the desktop experience. A separate review should be conducted to assess and address issues on mobile devices.

---

### QA-050: Implement Mobile Responsiveness Fixes

**Priority:** P1 | **Status:** Not Started | **Effort:** 16-24h
Implement the fixes identified in the mobile responsiveness review (QA-049) responsiveness review.

---

## 🔧 Schema & Infrastructure (3 tasks) - Added 2025-12-09

### ST-020: Add Drizzle Schema to TypeScript Checking

**Priority:** P0 | **Status:** ✅ Complete | **Effort:** 5min
The `drizzle/` folder is excluded from `tsconfig.json` includes, meaning schema TypeScript errors are never caught during development or CI. This is the ROOT CAUSE of ST-021 and ST-022.

**Fix:** Add `"drizzle/**/*"` to tsconfig.json includes array.

---

### ST-021: Fix Malformed Soft Delete Column Definitions

**Priority:** P0 | **Status:** ✅ Complete | **Effort:** 1-2h
45+ tables have `deletedAt` columns incorrectly placed inside varchar/decimal/references option objects instead of as sibling columns. This was caused by a botched merge of the ST-013 soft delete feature.

**Impact:** Soft delete columns are NOT actually being created in these tables. Soft delete functionality is broken.

**Example of broken code:**
```typescript
name: varchar("name", { length: 255 ,
    deletedAt: timestamp("deleted_at"), // WRONG - inside options
}).notNull()
```

**Should be:**
```typescript
name: varchar("name", { length: 255 }).notNull(),
deletedAt: timestamp("deleted_at"), // CORRECT - sibling column
```

---

### ST-022: Remove Broken Index Definitions

**Priority:** P0 | **Status:** ✅ Complete | **Effort:** 15min
Three tables have index definitions referencing non-existent columns (copy-paste errors):

| Table | Broken Index | Non-Existent Column |
|-------|-------------|---------------------|
| `creditSystemSettings` | `idx_batch_locations_batch_id` | `batchId` |
| `pricingProfiles` | `idx_product_tags_product_id` | `productId` |
| `tagGroups` | `idx_sales_batch_id` | `batchId` |

**Fix:** Remove or correct these index definitions.


---

## 🖥️ User Experience Features - Added 2026-01-02

### FEATURE-021: Unified Spreadsheet View

**Priority:** P1 | **Status:** 📋 Spec Complete | **Effort:** 40-56h

Implement a spreadsheet-like interface for users accustomed to spreadsheet-based workflows. This feature provides a familiar, grid-based experience for managing Inventory, processing new Intakes, and handling Pick & Pack fulfillment, while maintaining full integration with the TERP backend.

**Architecture:** "Views, Not Modules" - Pure presentation layer over existing services. NO new business logic. All mutations flow through existing tRPC procedures.

**Key Requirements:**
- All data operations use existing tRPC routers (no bypasses)
- All validation, permissions, and business rules enforced
- Bidirectional data sync with standard ERP views
- Full audit trail via existing logging system

**Phases:**
1. Phase 1: Inventory Grid + Client View (16-20h)
2. Phase 2: Intake Grid (12-16h)
3. Phase 3: Pick & Pack Grid (12-20h)

**Specification:** [`docs/specs/FEATURE-SPREADSHEET-VIEW-SPEC.md`](../specs/FEATURE-SPREADSHEET-VIEW-SPEC.md)
**QA Review:** [`docs/reviews/QA-REVIEW-SPREADSHEET-VIEW-SPEC-V2.md`](../reviews/QA-REVIEW-SPREADSHEET-VIEW-SPEC-V2.md)
**Mockups:** [`docs/specs/mockups/spreadsheet-view/`](../specs/mockups/spreadsheet-view/)

---
