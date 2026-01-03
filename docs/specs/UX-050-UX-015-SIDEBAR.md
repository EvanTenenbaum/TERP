# Specification: UX-050 & UX-015 - Sidebar Navigation Improvements

## Task: UX-050 & UX-015: Spreadsheet Access + Grouped Sidebar

**Status:** Draft  
**Priority:** HIGH  
**Estimate:** 6h  
**Module:** client navigation (DashboardLayout + AppSidebar)  
**Dependencies:** Feature flag `spreadsheet-view`; existing navigation config  
**Spec Author:** ChatGPT  
**Spec Date:** 2026-01-03

---

## 1. Problem Statement

Users cannot access the spreadsheet view from the primary navigation, and the current sidebar lists dozens of destinations without hierarchy. This makes discovery hard and slows navigation for sales, fulfillment, and finance workflows.

## 2. User Stories

1. **As an operations lead**, I want a clear "Spreadsheet" entry in the sidebar so I can jump into bulk editing workflows without remembering URLs.
2. **As a salesperson**, I want navigation items grouped by workflow (Core, Sales, Fulfillment, Finance, Settings) so I can quickly find the right tools without scanning an unstructured list.
3. **As a keyboard/assistive tech user**, I need predictable grouping labels and focus order so the sidebar remains accessible when collapsed or expanded.

## 3. Functional Requirements

### 3.1 Core Requirements

| ID    | Requirement                                                                                               | Priority    |
| ----- | --------------------------------------------------------------------------------------------------------- | ----------- |
| FR-01 | Add a "Spreadsheet" sidebar item pointing to `/spreadsheet-view` with an appropriate icon                 | Must Have   |
| FR-02 | Respect the `spreadsheet-view` feature flag for visibility or clearly indicate when disabled              | Must Have   |
| FR-03 | Group navigation items under labeled sections: Core, Sales, Fulfillment, Finance, Settings                | Must Have   |
| FR-04 | Preserve active/hover states and keyboard navigation for all grouped items                                | Must Have   |
| FR-05 | Sidebar behavior must remain responsive (collapse/expand, mobile sheet) with groups visible when expanded | Should Have |

### 3.2 Business Rules

| ID    | Rule                                                                                               | Example                                                                    |
| ----- | -------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| BR-01 | Group ordering is fixed: Core → Sales → Fulfillment → Finance → Settings                           | Core items should always appear first                                      |
| BR-02 | Feature-flagged destinations should not present a dead-end; show gated state or hide when disabled | Hide Spreadsheet entry if flag is off, or show disabled state with tooltip |
| BR-03 | Login/Logout control stays available and should not be nested under workflow groups                | Sign out remains a dedicated action near menu items                        |

## 4. Technical Specification

### 4.1 Data Model Changes

No schema changes required.

### 4.2 API Contracts

No new APIs. Uses existing `/api/auth/me` for user display and `spreadsheet-view` feature flag via `useFeatureFlag` where applicable.

### 4.3 Integration Points

| System        | Integration Type | Description                                                                  |
| ------------- | ---------------- | ---------------------------------------------------------------------------- |
| Feature Flags | Read             | Use `useFeatureFlag("spreadsheet-view")` to gate sidebar visibility or state |
| Wouter Router | Read/Write       | `useLocation` drives active state and navigation for menu buttons            |

## 5. UI/UX Specification

### 5.1 User Flow

`Sidebar open → Scan group labels → Select "Spreadsheet" (Core) → Routed to /spreadsheet-view`

### 5.2 Wireframe Description

- Sidebar shows section labels (e.g., "Core", "Sales") using subdued typography.
- Each section lists relevant menu buttons with icons; active item highlighted with primary color.
- Spreadsheet entry placed within the Core group near Dashboard/Tasks/Calendar with File Spreadsheet icon.
- Mobile: groups render inside the Sheet; collapse mode hides labels but keeps tooltips.

### 5.3 Acceptance Criteria (UI)

- [ ] Sidebar displays labeled groups in the defined order.
- [ ] "Spreadsheet" link appears under Core and navigates to `/spreadsheet-view`.
- [ ] Active route highlights the corresponding menu item.
- [ ] Feature flag gating prevents exposing a broken spreadsheet link (hidden or clearly disabled).
- [ ] Collapse and mobile states retain accessible tooltips/labels.

## 6. Edge Cases & Error Handling

| Scenario                   | Expected Behavior                                                                   |
| -------------------------- | ----------------------------------------------------------------------------------- |
| Feature flag service fails | Sidebar hides Spreadsheet entry or shows a safe disabled control without navigation |
| Sidebar collapsed          | Tooltips still expose group items; labels animate out without breaking layout       |
| Mobile sidebar             | Group labels and items render in sheet; spreadsheet link works with touch           |

## 7. Testing Requirements

### 7.1 Unit Tests

- [ ] Sidebar renders a "Spreadsheet" button with correct path.
- [ ] Group labels render in order and wrap the correct items.
- [ ] Clicking Spreadsheet triggers navigation callback.

### 7.2 Integration Tests

- [ ] Feature flag off hides or disables Spreadsheet entry (if gating logic implemented).
- [ ] Sidebar collapse retains access to grouped items via tooltips.

### 7.3 E2E Tests

- [ ] (Future) Navigation from sidebar to spreadsheet page works in browser and shows gated/active states.

## 8. Migration & Rollout

### 8.1 Data Migration

No migration required.

### 8.2 Feature Flag

Use existing `spreadsheet-view` flag to gate visibility or interaction.

### 8.3 Rollback Plan

Revert navigation config and layout grouping changes; remove Spreadsheet nav item if issues occur.

## 9. Success Metrics

| Metric                                 | Target                                                         | Measurement Method                |
| -------------------------------------- | -------------------------------------------------------------- | --------------------------------- |
| Sidebar navigation time to Spreadsheet | < 3 clicks                                                     | User flow observation / analytics |
| Navigation comprehension               | Users can locate Spreadsheet via sidebar without URL knowledge | Qualitative QA notes              |

## 10. Open Questions

- [ ] Should Spreadsheet entry be hidden or disabled when the feature flag is off? (Draft approach: hide to avoid dead link.)
- [ ] Should login/logout live inside a dedicated "Account" group or remain standalone?

---

**Approval:**

- [ ] Product Owner
- [ ] Tech Lead
- [ ] QA Lead
