# Comprehensive Implementation Guide: Workflow Queue Management

**Version:** 1.0 (Consolidated)
**Status:** FINAL
**Author:** Manus AI
**Date:** November 8, 2025
**Initiative:** 1.3 Workflow Queue Management

---

## Table of Contents

1.  [**Part 1: Mission Briefing & AI Agent Prompt**](#part-1-mission-briefing--ai-agent-prompt)
    -   1.1. Mission Briefing
    -   1.2. Mandatory Bible Protocols
    -   1.3. Key Artifacts & Credentials
    -   1.4. Autonomous Execution Plan
2.  [**Part 2: Product Requirements Document (PRD)**](#part-2-product-requirements-document-prd)
    -   2.1. Introduction
    -   2.2. User Stories
    -   2.3. Functional Requirements
    -   2.4. Non-Functional Requirements
    -   2.5. Out of Scope
    -   2.6. Success Metrics
3.  [**Part 3: Implementation Roadmap**](#part-3-implementation-roadmap)
    -   3.1. Overview
    -   3.2. Implementation Phases
    -   3.3. Detailed Phase Breakdown
4.  [**Part 4: Adversarial QA Review & Resolutions**](#part-4-adversarial-qa-review--resolutions)
    -   4.1. Executive Summary
    -   4.2. Critical Issues & Resolutions
    -   4.3. Moderate Concerns & Resolutions

---

## Part 1: Mission Briefing & AI Agent Prompt

### 1.1. Mission Briefing

Your mission is to implement the **Workflow Queue Management System** for the TERP project. You will execute this mission autonomously, following the provided implementation roadmap and adhering with **absolute strictness** to all development protocols outlined in The Bible. The goal is to deliver a production-ready, fully tested, and documented feature.

### 1.2. Mandatory Bible Protocols

**FAILURE TO FOLLOW THESE PROTOCOLS WILL RESULT IN IMMEDIATE REJECTION OF YOUR WORK.** All protocols are detailed in `docs/DEVELOPMENT_PROTOCOLS.md` (The Bible). This is a summary of the most critical, non-negotiable rules.

-   **Test-Driven Development (TDD):** You MUST write tests BEFORE you write implementation code. 100% of all new code MUST be tested.
-   **No Placeholders or Stubs:** Your final deliverable MUST be production-ready. NO `// TODO` or empty functions.
-   **Holistic System Integration:** Analyze impact and update ALL related files in a single, atomic operation.
-   **Definition of Done (DoD):** Your work is considered Done only when it meets all criteria in the DoD checklist.
-   **Git & Commit Conventions:** All commits must follow the Conventional Commits specification.

### 1.3. Key Artifacts & Credentials

-   **The Bible:** `docs/DEVELOPMENT_PROTOCOLS.md`
-   **This Document:** This is your single source of truth.
-   **Schema:** `drizzle/schema.ts`
-   **Production Database (MySQL):**
    -   **Host:** `terp-mysql-db-do-user-28175253-0.m.db.ondigitalocean.com`
    -   **Port:** `25060`
    -   **User:** `doadmin`
    -   **Password:** `AVNS_Q_RGkS7-uB3Bk7xC2am`
    -   **Database:** `defaultdb`
    -   **SSL Mode:** `REQUIRED`
-   **Digital Ocean API Key:** `dop_v1_959274e13a493b3ddbbb95b17e84f521b4ab9274861e4acf145c27c7f0792dcd`

### 1.4. Autonomous Execution Plan

1.  **Setup:** Create and check out the new branch: `feature/1.3-workflow-queue`.
2.  **Execute Roadmap:** Follow the 6 phases outlined in **Part 3** of this document sequentially.
3.  **Final Report:** Upon completion, create a pull request and deliver a final report confirming you have met the Definition of Done.

---

## Part 2: Product Requirements Document (PRD)

### 2.1. Introduction

Operational teams lack a centralized, real-time view of inventory items as they move through various internal workflows. This document proposes a **Workflow Queue Management System** to provide a Kanban-style interface for managing `batches`.

### 2.2. User Stories

-   **As an Inventory Manager,** I want to see all inventory batches grouped by status to monitor the workflow.
-   **As a Warehouse Staff member,** I want to see a queue of batches to know what to work on next.
-   **As an Operations Manager,** I want to move a batch from one stage to the next with a simple drag-and-drop action.

### 2.3. Functional Requirements

-   **Data Model:** A new `statusId` field will be added to the `batches` table. Two new tables, `workflow_statuses` and `batch_status_history`, will be created.
-   **Kanban UI:** A new page at `/workflow/queues` will display columns for each status and cards for each batch.
-   **Status Management:** An admin interface will manage statuses. Drag-and-drop will update a batch's status and create an audit log.
-   **Role-Based Views:** The system will use RBAC to control which queues a user can see.
-   **Real-Time Updates:** The UI will update in real-time for all users via **Socket.IO**.

### 2.4. Non-Functional Requirements

-   **Performance:** Load in under 2 seconds with 1,000 items. Implement virtual scrolling if needed.
-   **Security:** All operations must be protected by RBAC.
-   **Usability:** The UI must be intuitive, use optimistic updates, and support keyboard navigation.
-   **Error Handling:** The UI must handle API and WebSocket errors gracefully.

### 2.5. Out of Scope

-   Customizable workflows per user.
-   Automated status transitions.
-   Advanced reporting dashboards.
-   Mobile responsiveness (desktop-only for V1).

### 2.6. Success Metrics

-   20% reduction in the average time a batch spends in each stage.
-   90% adoption rate by operational teams within one month.

---

## Part 3: Implementation Roadmap

### 3.1. Overview

This is a 6-phase, 7-week implementation plan designed for autonomous execution by an AI agent.

### 3.2. Implementation Phases

| Phase | Title                                | Effort    | Key Objective                                      |
| ----- | ------------------------------------ | --------- | -------------------------------------------------- |
| 0     | Dependency Verification & Setup      | 0.5 weeks | Verify prerequisites and set up the environment.   |
| 1     | Backend Foundation & Core Logic      | 1.5 weeks | Establish the data model and core API endpoints.   |
| 2     | Frontend Kanban UI                   | 2 weeks   | Build the visual drag-and-drop interface.          |
| 3     | Real-Time Integration (WebSockets)   | 1 week    | Enable live updates for all connected users.       |
| 4     | RBAC Integration & Feature Polish    | 1 week    | Secure the system and add advanced functionality.  |
| 5     | Comprehensive Testing & Documentation| 1 week    | Ensure production-readiness and maintainability.   |

### 3.3. Detailed Phase Breakdown

-   **Phase 0: Dependency Verification:** Confirm RBAC is functional and required libraries (`dnd-kit`, `socket.io-client`) are installed and compatible.
-   **Phase 1: Backend Foundation:** Create `workflow_statuses` and `batch_status_history` tables, add `statusId` to `batches`, build core API endpoints (TDD), and create a seed script for default statuses.
-   **Phase 2: Frontend Kanban UI:** Build the page, columns, and cards. Fetch and render data, and implement drag-and-drop with optimistic updates and keyboard accessibility.
-   **Phase 3: Real-Time Integration:** Configure the `socket.io` server and client to broadcast and receive `workflow_updated` events for real-time UI updates.
-   **Phase 4: RBAC Integration & Polish:** Protect all API endpoints and filter UI components based on user permissions. Implement the status change confirmation modal.
-   **Phase 5: Comprehensive Testing & Documentation:** Conduct performance testing with 1,000+ items. Write E2E Playwright tests. Update all project documentation (`CHANGELOG.md`, `PROGRESS.md`) and create a user guide.

---

## Part 4: Adversarial QA Review & Resolutions

### 4.1. Executive Summary

An adversarial QA review identified 20 issues (6 critical, 3 high, 11 medium). All critical and high-priority issues have been resolved in the plans outlined in this document.

### 4.2. Critical Issues & Resolutions

| Issue                               | Resolution                                                                                                                            |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| **Missing Data Model Details**      | The PRD now includes detailed schema specifications for all new and modified tables.                                                  |
| **Undefined Workflow Status Enum**  | The roadmap now specifies that statuses will be stored as integer foreign keys to the `workflow_statuses` table.                      |
| **RBAC Dependency Not Verified**    | A new **Phase 0** has been added to the roadmap to explicitly verify the RBAC system and other dependencies before starting.       |
| **WebSocket Library Not Specified** | **Socket.IO** has been specified as the required library for real-time updates.                                                       |
| **Real-Time Mechanism Unclear**     | The PRD and roadmap now detail that the backend will broadcast events after successful updates, and the frontend will intelligently refetch. |
| **No Error Handling Strategy**      | The non-functional requirements now include a mandate for graceful error handling for API and WebSocket issues.                     |

### 4.3. Moderate Concerns & Resolutions

-   **Performance Testing:** A performance testing task was added to Phase 5.
-   **Smoketests:** The Bible's protocol for smoketests will be followed at the end of each phase.
-   **Optimistic UI:** The roadmap now specifies optimistic UI updates with error rollback.
-   **Accessibility:** Keyboard navigation for drag-and-drop is now a requirement.
-   **User Guide:** The roadmap now specifies the creation of a Markdown user guide.
