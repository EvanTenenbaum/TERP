# PRD: Workflow Queue Management (v2)

**Version:** 2.0  
**Status:** DRAFT  
**Author:** Manus AI  
**Date:** November 7, 2025

---

## 1. Overview

This document outlines the requirements for the **Workflow Queue Management** system. This feature will provide a Kanban-style interface for operational teams to manage the flow of **inventory batches** through various stages of the intake and preparation process.

**Problem:** The current system lacks a centralized view for teams to see what inventory batches are in their queue and to easily move them to the next stage. This leads to inefficiencies, communication overhead, and a lack of clarity on what needs to be done.

**Solution:** A dedicated Workflow Queue page that displays inventory batches grouped by their current status, allowing for easy drag-and-drop transitions between stages.

**Dependencies:** This feature is critically dependent on the **User Roles & Permissions (RBAC)** system (Task 1.2) to provide role-based queue visibility.

---

## 2. User Stories

- **As an Inventory Manager,** I want to see all inventory batches in the intake process, grouped by their current status, so I can monitor the overall workflow and identify bottlenecks.
- **As a Warehouse Staff member,** I want to see a queue of batches "Pending Check-in" so I know what to work on next.
- **As a Photographer,** I want to see a queue of batches "Pending Photography" so I can efficiently manage my photography workflow.
- **As a Quality Assurance specialist,** I want to see a queue of batches "Pending Quality Check" so I can perform my inspections.
- **As an Operations Manager,** I want to be able to move a batch from one stage to the next with a simple drag-and-drop action, so I can update its status quickly.
- **As an Inventory Manager,** I want to be able to customize the workflow stages and the order in which they appear, so I can adapt the system to our evolving processes.

---

## 3. Functional Requirements

### 3.1. Workflow Queue Page

- A new page accessible from the main navigation titled "Workflow Queues".
- The page will display a Kanban-style board with columns representing each batch status.
- Each inventory batch will be represented as a card within its corresponding status column.
- Users will be able to drag and drop batch cards between columns to change their status.

### 3.2. Batch Status

- A new `status` field will be added to the `batches` table.
- The initial set of statuses will be:
  1. `Pending Check-in`
  2. `Pending Photography`
  3. `Pending Quality Check`
  4. `Pending Labeling`
  5. `Ready for Sale`
  6. `Archived`
- The statuses will be configurable by Super Admins in the Settings page.

### 3.3. Role-Based Queue Visibility

- The queues displayed to a user will be determined by their role:
  - **Warehouse Staff:** Sees "Pending Check-in" and "Pending Labeling" queues.
  - **Photographer:** Sees "Pending Photography" queue.
  - **QA Specialist:** Sees "Pending Quality Check" queue.
  - **Inventory Manager, Operations Manager, Super Admin:** Sees all queues.

### 3.4. Batch Card

Each batch card on the Kanban board will display:
- Product Name (from associated product)
- Batch Number
- Quantity
- Thumbnail image (from associated product)
- Key attributes (e.g., Brand, Category)
- Time in current status

### 3.5. Status Transitions

- Dragging a card to a new column will update the batch's `status` in the database.
- The transition will be logged in an audit trail.
- The UI will provide immediate visual feedback of the successful transition.

---

## 4. Technical Specifications

### 4.1. Database Schema

- **`batches` table:**
  - Add `status` (VARCHAR(255), default: 'Pending Check-in')
  - Add `status_updated_at` (DATETIME)
- **`workflow_statuses` table:**
  - `id` (INT, PK)
  - `name` (VARCHAR(255))
  - `order` (INT)
  - `is_active` (BOOLEAN)
- **`workflow_audit_log` table:**
  - `id` (INT, PK)
  - `batch_id` (INT, FK to `batches`)
  - `from_status` (VARCHAR(255))
  - `to_status` (VARCHAR(255))
  - `user_id` (INT, FK to `users`)
  - `timestamp` (DATETIME)

### 4.2. API Endpoints

- **`GET /api/workflow/queues`**: Returns all queues and batches for the current user's role.
- **`PUT /api/workflow/batches/:id/status`**: Updates the status of a batch.
- **`GET /api/workflow/statuses`**: Returns all available workflow statuses.
- **`POST /api/workflow/statuses`**: Creates a new workflow status.
- **`PUT /api/workflow/statuses/:id`**: Updates a workflow status.
- **`DELETE /api/workflow/statuses/:id`**: Deletes a workflow status.

### 4.3. Frontend Implementation

- **Framework:** React with TypeScript
- **UI Library:** shadcn/ui
- **Drag & Drop:** `dnd-kit`
- **State Management:** Zustand
- **Page:** `client/src/pages/WorkflowQueuesPage.tsx`
- **Components:**
  - `WorkflowBoard.tsx`
  - `WorkflowColumn.tsx`
  - `BatchCard.tsx`

---

## 5. UI Mockups

*(This section would typically contain visual mockups of the Kanban board, batch cards, and settings page. For this text-based PRD, we will describe the UI.)*

**Kanban Board:**
- A full-width board with horizontally scrolling columns.
- Each column has a header with the status name and a count of batches in that status.
- Batch cards are stacked vertically within each column.

**Batch Card:**
- A compact card with a thumbnail on the left and batch details on the right.
- A small icon or color-coded border to indicate priority or other flags.

**Settings Page:**
- A new tab under "Settings" called "Workflow".
- A table listing all workflow statuses with options to edit, delete, and reorder.
- A form to create a new status.

---

## 6. Testing Plan

- **Unit Tests:**
  - Test API endpoints for creating, reading, updating, and deleting statuses.
  - Test the logic for determining queue visibility based on user roles.
- **Integration Tests:**
  - Test the full drag-and-drop workflow, including database updates and audit logging.
- **E2E Tests:**
  - Simulate a user logging in, navigating to the workflow page, and moving a batch through the entire workflow.

---

## 7. Success Metrics

- **Reduction in time-to-market:** Measure the average time a batch spends in the intake process before and after implementation.
- **Increased team efficiency:** Survey operational teams to gauge their satisfaction and perceived efficiency gains.
- **Reduced communication overhead:** Monitor the number of internal messages and emails related to batch status.
