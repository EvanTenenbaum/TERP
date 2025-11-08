# Implementation Roadmap: Workflow Queue Management

**Version:** 2.0 (QA Revised)  
**Status:** DRAFT  
**Author:** Manus AI  
**Date:** November 7, 2025  
**Initiative:** 1.3 Workflow Queue Management

---

## 1. Overview

This document provides a detailed, phased implementation plan for the Workflow Queue Management System, as defined in the corresponding Product Requirements Document (PRD). The roadmap is designed to be executed by an AI agent, with clear, atomic tasks and a focus on iterative, test-driven development in full accordance with all Bible protocols.

## 2. Implementation Phases

The project is broken down into six sequential phases:

| Phase | Title                                | Estimated Effort | Key Objective                                      |
| ----- | ------------------------------------ | ---------------- | -------------------------------------------------- |
| 0     | Dependency Verification & Setup      | 0.5 weeks        | Verify prerequisites and set up the environment.   |
| 1     | Backend Foundation & Core Logic      | 1.5 weeks        | Establish the data model and core API endpoints.   |
| 2     | Frontend Kanban UI                   | 2 weeks          | Build the visual drag-and-drop interface.          |
| 3     | Real-Time Integration (WebSockets)   | 1 week           | Enable live updates for all connected users.       |
| 4     | RBAC Integration & Feature Polish    | 1 week           | Secure the system and add advanced functionality.  |
| 5     | Comprehensive Testing & Documentation| 1 week           | Ensure production-readiness and maintainability.   |

**Total Estimated Effort:** 7 weeks

---

## 3. Detailed Phase Breakdown

### Phase 0: Dependency Verification & Setup (0.5 weeks)

**Goal:** Ensure all prerequisites are met before starting implementation.

| Task ID | Task                                      | Effort    | Deliverables                                                                                                                                                             |
| ------- | ----------------------------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **0.1** | **Verify RBAC System**                    | 0.25 weeks| - Confirmation that the RBAC system (Initiative 1.2) is functional. <br>- Confirmation that `permissionService` and middleware are available. <br>- Confirmation that test users with different roles exist in the database.                                                                                                                                                           |
| **0.2** | **Verify Library Compatibility**          | 0.25 weeks| - Confirmation that `dnd-kit` and `socket.io-client` are installed and compatible with the React/TypeScript setup. <br>- Installation of libraries if they are missing.                                                                                                                                                           |

### Phase 1: Backend Foundation & Core Logic (1.5 weeks)

**Goal:** Create the necessary database schema and API endpoints to support the core functionality.

| Task ID | Task                                      | Effort    | Deliverables                                                                                                                                                             |
| ------- | ----------------------------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **1.1** | **Database Schema Implementation**        | 0.5 weeks | - **New Table:** `workflow_statuses` (id, name, description, sort_order) <br>- **New Table:** `batch_status_history` (id, batch_id, old_status_id, new_status_id, user_id, timestamp, notes) <br>- **Schema Update:** Add `statusId` foreign key to `batches` table. <br>- Drizzle migration files with rollback scripts.                                                                                                                                                                  |
| **1.2** | **Core API Endpoint Development (TDD)**   | 0.5 weeks | - **New Router:** `server/routers/workflow.ts` <br>- **Endpoint:** `getStatuses` <br>- **Endpoint:** `getBatchesByStatus` <br>- **Endpoint:** `updateBatchStatus` <br>- Corresponding test files with 100% coverage.                                                                                                                                                           |
| **1.3** | **Seed Script for Default Statuses**      | 0.5 weeks | - A new seed script (`scripts/seed-workflow.ts`) <br>- Populates `workflow_statuses` with default stages. <br>- Integrated into `pnpm db:seed` command.                                                                                                                                                                  |

### Phase 2: Frontend Kanban UI (2 weeks)

**Goal:** Build the interactive, client-side interface for viewing and managing the workflow queues.

| Task ID | Task                                      | Effort    | Deliverables                                                                                                                                                             |
| ------- | ----------------------------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **2.1** | **Component & Page Scaffolding**          | 0.5 weeks | - **New Page:** `/workflow/queues` <br>- **Component:** `WorkflowQueuePage.tsx` <br>- **Component:** `StatusColumn.tsx` <br>- **Component:** `BatchCard.tsx`                                                                                                                                                                  |
| **2.2** | **Data Fetching and Rendering**           | 0.5 weeks | - Use `trpc.workflow.getBatchesByStatus.useQuery()` to fetch data. <br>- Implement loading states (using design system spinner) and empty states. <br>- Render columns and cards.                                                                                                                                                           |
| **2.3** | **Drag-and-Drop (DnD) Implementation**    | 1 week    | - Integrate `dnd-kit` library. <br>- Implement DnD logic with optimistic UI updates and error rollback. <br>- Ensure keyboard accessibility for all DnD actions.                                                                                                                                                           |

### Phase 3: Real-Time Integration (WebSockets) (1 week)

**Goal:** Ensure the UI updates automatically for all users in real-time.

| Task ID | Task                                      | Effort    | Deliverables                                                                                                                                                             |
| ------- | ----------------------------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **3.1** | **WebSocket Server Configuration**        | 0.5 weeks | - Integrate `socket.io` into the Node.js server. <br>- After a successful status update, the backend broadcasts a `workflow_updated` event with `{ batchId, newStatusId }`.                                                                                                                                                           |
| **3.2** | **Frontend WebSocket Client**             | 0.5 weeks | - The `WorkflowQueuePage` component establishes a WebSocket connection. <br>- The client listens for `workflow_updated` events and intelligently refetches data. <br>- Implement error handling for WebSocket connection issues.                                                                                                                                                           |

### Phase 4: RBAC Integration & Feature Polish (1 week)

**Goal:** Secure the system with role-based permissions and add required usability features.

| Task ID | Task                                      | Effort    | Deliverables                                                                                                                                                             |
| ------- | ----------------------------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **4.1** | **RBAC Permission Implementation**        | 0.5 weeks | - **New Permissions:** `workflow:view:all`, `workflow:view:[status_name]`, `workflow:edit`. <br>- Protect all `workflow.ts` router endpoints. <br>- Filter visible status columns on the frontend based on user permissions.                                                                                                                                                           |
| **4.2** | **Status Change Modal & Item Page UI**    | 0.5 weeks | - A modal dialog that appears on status change to confirm and add notes. <br>- Update the batch detail page to display and change the workflow status.                                                                                                                                                           |

### Phase 5: Comprehensive Testing & Documentation (1 week)

**Goal:** Finalize testing, update all relevant documentation, and ensure the feature is production-ready.

| Task ID | Task                                      | Effort    | Deliverables                                                                                                                                                             |
| ------- | ----------------------------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **5.1** | **Performance & E2E Testing**             | 0.5 weeks | - **Performance Test:** Load the queue with 1,000+ items and verify performance requirements. Implement virtual scrolling if needed. <br>- **E2E Tests:** Write Playwright tests covering the entire user flow.                                                                                                                                                           |
| **5.2** | **Documentation Finalization**            | 0.5 weeks | - Update this roadmap and the PRD to `Status: COMPLETE`. <br>- Update `CHANGELOG.md` and `PROGRESS.md`. <br>- Create a user guide in `docs/user-guides/workflow-queue.md` with screenshots and instructions.                                                                                                                                                           |
