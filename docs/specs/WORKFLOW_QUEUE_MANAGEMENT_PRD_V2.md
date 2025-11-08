# Product Requirements Document: Workflow Queue Management

**Version:** 2.0 (QA Revised)  
**Status:** DRAFT  
**Author:** Manus AI  
**Date:** November 7, 2025  
**Initiative:** 1.3 Workflow Queue Management

---

## 1. Introduction

### 1.1. Problem Statement

Operational teams lack a centralized, real-time view of inventory items as they move through various internal workflows (e.g., intake, quality control, photography, pricing, listing). This leads to inefficiencies, delays, and a lack of clarity on what needs to be done next. There is no easy way to see all items at a specific stage or to transition them to the next stage in the process.

### 1.2. Proposed Solution

This document proposes the creation of a **Workflow Queue Management System**. This system will provide a centralized, Kanban-style interface where inventory items (specifically `batches`) are displayed in columns representing their current status. Users will be able to see the status of all items at a glance, filter views based on their role, and easily transition items from one stage to the next. The system will provide real-time updates to all connected users.

### 1.3. Goals & Objectives

-   **Increase Operational Efficiency:** Reduce the time it takes to move items through the workflow.
-   **Improve Visibility:** Provide a clear, real-time view of the entire operational pipeline.
-   **Enhance Accountability:** Clarify which team is responsible for an item at any given stage.
-   **Streamline Status Transitions:** Make it simple and intuitive to update an item's status.

## 2. User Stories

- **As an Inventory Manager,** I want to see all inventory batches in the intake process, grouped by their current status, so I can monitor the overall workflow and identify bottlenecks.
- **As a Warehouse Staff member,** I want to see a queue of batches "Pending Check-in" so I know what to work on next.
- **As a Photographer,** I want to see a queue of batches "Pending Photography" so I can efficiently manage my photography workflow.
- **As a Quality Assurance specialist,** I want to see a queue of batches "Pending Quality Check" so I can perform my inspections.
- **As an Operations Manager,** I want to be able to move a batch from one stage to the next with a simple drag-and-drop action, so I can update its status quickly.

## 3. Functional Requirements

### 3.1. Core Data Model

#### 3.1.1. `batches` Table Integration

A new `statusId` field will be added to the existing **`batches` table** to track the workflow status.

#### 3.1.2. New Tables

Two new tables will be created to support the workflow system:

1.  **`workflow_statuses`**: This table will store the definition of each status.
    -   `id` (INT, PK, AI)
    -   `name` (VARCHAR(100))
    -   `description` (TEXT)
    -   `sort_order` (INT)

2.  **`batch_status_history`**: This table will provide a complete audit trail of all status changes.
    -   `id` (INT, PK, AI)
    -   `batch_id` (INT, FK to `batches.id`)
    -   `old_status_id` (INT, FK to `workflow_statuses.id`)
    -   `new_status_id` (INT, FK to `workflow_statuses.id`)
    -   `user_id` (INT, FK to `users.id`)
    -   `timestamp` (TIMESTAMP)
    -   `notes` (TEXT)

### 3.2. Queue View UI (Kanban Board)

-   **FR-1:** A new full-page view will be created at `/workflow/queues`.
-   **FR-2:** The UI will display columns representing each status defined in the `workflow_statuses` table, ordered by `sort_order`.
-   **FR-3:** Each column will contain cards, with each card representing a single `batch`.
-   **FR-4:** Each batch card will display key information: Batch ID, Product Name, Quantity, Date Created.
-   **FR-5:** The UI must support drag-and-drop functionality using **`dnd-kit`**.

### 3.3. Status Management

-   **FR-6:** An admin interface will be created to manage (CRUD) the `workflow_statuses` table.
-   **FR-7:** Dragging a card to a new column will trigger a backend request to update the `batches.statusId` field.
-   **FR-8:** A modal dialog will appear on status change to allow users to add notes or confirm the transition.
-   **FR-9:** The `batch_status_history` table will be updated with the old status, new status, user who made the change, and a timestamp.

### 3.4. Role-Based Views

-   **FR-10:** The system will leverage the existing RBAC module (Initiative 1.2).
-   **FR-11:** Users will only see the queues (status columns) relevant to their role, controlled by `workflow:view:[status_name]` permissions.
-   **FR-12:** The **Master View** is not a separate page, but the default view for users with the `workflow:view:all` permission, which shows all status columns.

### 3.5. Real-Time Updates

-   **FR-13:** The queue view will update in real-time for all connected users using **Socket.IO**.
-   **FR-14:** After a successful status update in the database, the **backend** will broadcast a `workflow_updated` event to all connected clients.
-   **FR-15:** The event payload will contain `{ batchId, newStatusId }`.
-   **FR-16:** The frontend client will listen for this event and intelligently update its state, ignoring events triggered by its own actions to prevent redundant updates.

### 3.6. Individual Item Page Integration

-   **FR-17:** The existing batch detail page will be updated to display the current workflow status name.
-   **FR-18:** It will include a dropdown menu to allow users with the `workflow:edit` permission to change the status directly from this page.

## 4. Non-Functional Requirements

| Category      | Requirement                                                                                             |
| ------------- | ------------------------------------------------------------------------------------------------------- |
| **Performance** | - The queue view should load in under 2 seconds with up to 1,000 items. <br>- Real-time updates should appear within 500ms. <br>- If performance issues are found with >500 items, **virtual scrolling** must be implemented. |
| **Scalability** | - The system must support up to 50 concurrent users without performance degradation. |
| **Security**    | - All status change operations must be protected by the RBAC permission system. |
| **Usability**   | - The drag-and-drop interface must be intuitive and responsive. <br>- The UI should use optimistic updates for a fluid feel, but revert on backend error. <br>- Keyboard navigation for drag-and-drop must be supported for accessibility. |
| **Error Handling**| - The UI must handle API and WebSocket errors gracefully, providing clear user feedback. |
| **Auditability**| - Every status change must be logged in the `batch_status_history` table. |

## 5. Out of Scope

-   **Customizable Workflows per User/Team:** For V1, the workflow is global.
-   **Automated Status Transitions:** All status changes are manual.
-   **Advanced Reporting:** A dedicated reporting dashboard is out of scope.
-   **Mobile Responsiveness:** The initial implementation will be for desktop only.
-   **Filtering and Searching:** Not included in V1, but planned for a future iteration.

---

## 6. Success Metrics

-   **Time-in-Stage Reduction:** A 20% reduction in the average time a batch spends in each workflow stage.
-   **Adoption Rate:** 90% of operational team members actively using the queue system within one month of launch.
-   **Reduced Manual Queries:** A 50% reduction in managers asking "What is the status of item X?"
