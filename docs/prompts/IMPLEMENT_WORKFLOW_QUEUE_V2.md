# AI Agent Implementation Prompt: Workflow Queue Management

**To:** Next Manus AI Agent  
**From:** Preceding Manus AI Agent  
**Date:** November 7, 2025  
**Subject:** Mission Briefing: Implement Initiative 1.3 - Workflow Queue Management

---

## 1. 🔴 Mission Briefing

Your mission is to implement the **Workflow Queue Management System** for the TERP project. You will execute this mission autonomously, following the provided implementation roadmap and adhering with **absolute strictness** to all development protocols outlined in The Bible. The goal is to deliver a production-ready, fully tested, and documented feature.

---

## 2. 📄 Core Requirements & Roadmap (Version 2.0 - QA Revised)

Your implementation must satisfy all requirements detailed in the following **Version 2.0** documents. You must read and understand them before writing any code.

-   **Product Requirements Document (PRD):** `docs/specs/WORKFLOW_QUEUE_MANAGEMENT_PRD_V2.md`
-   **Implementation Roadmap:** `docs/specs/WORKFLOW_QUEUE_IMPLEMENTATION_ROADMAP_V2.md`

You are to follow the **6 phases** outlined in the implementation roadmap **sequentially**. Do not skip or reorder phases. Each phase must be completed before the next begins.

---

## 3. 🚨 MANDATORY BIBLE PROTOCOLS

**FAILURE TO FOLLOW THESE PROTOCOLS WILL RESULT IN IMMEDIATE REJECTION OF YOUR WORK.** All protocols are detailed in `docs/DEVELOPMENT_PROTOCOLS.md` (The Bible). This is a summary of the most critical, non-negotiable rules.

### 3.1. Test-Driven Development (TDD)

-   **You MUST write tests BEFORE you write implementation code.**
-   Follow the Red-Green-Refactor cycle for every piece of functionality.
-   **100% of all new code MUST be tested.** Use `pnpm test:coverage` to verify.
-   All tests MUST pass before you commit. Bypassing tests with `--no-verify` is strictly forbidden.

### 3.2. No Placeholders or Stubs

-   **Your final deliverable MUST be production-ready.**
-   NO `// TODO`, `// Coming Soon`, or empty function bodies.
-   If technical constraints genuinely require a stub, you MUST STOP, report an `INCOMPLETE IMPLEMENTATION ALERT`, and WAIT for user acknowledgment.

### 3.3. Holistic System Integration

-   **Analyze Impact:** Before any change, identify all affected files and dependencies.
-   **Update Holistically:** Update ALL related files in a single, atomic operation.
-   **Validate System-Wide:** After changes, run `pnpm check` and test navigation, data flows, and rendering to ensure the system remains coherent.

### 3.4. Definition of Done (DoD)

-   Your work is considered **Done** only when it meets all criteria in the DoD checklist (see The Bible, Section 2).
-   When you deliver your work, you **MUST** explicitly include the completed DoD checklist in your final report.

### 3.5. Git & Commit Conventions

-   All commits must follow the Conventional Commits specification.
-   Create a new feature branch for this task: `feature/1.3-workflow-queue`.

---

## 4. 🔑 Key Artifacts & Credentials

### 4.1. Documentation

-   **The Bible:** `docs/DEVELOPMENT_PROTOCOLS.md`
-   **PRD:** `docs/specs/WORKFLOW_QUEUE_MANAGEMENT_PRD_V2.md`
-   **Roadmap:** `docs/specs/WORKFLOW_QUEUE_IMPLEMENTATION_ROADMAP_V2.md`
-   **Schema:** `drizzle/schema.ts`

### 4.2. Credentials

Use these credentials for all database operations and deployment monitoring.

-   **Production Database (MySQL):**
    -   **Host:** `terp-mysql-db-do-user-28175253-0.m.db.ondigitalocean.com`
    -   **Port:** `25060`
    -   **User:** `doadmin`
    -   **Password:** `AVNS_Q_RGkS7-uB3Bk7xC2am`
    -   **Database:** `defaultdb`
    -   **SSL Mode:** `REQUIRED`

-   **Digital Ocean API Key:**
    -   `dop_v1_959274e13a493b3ddbbb95b17e84f521b4ab9274861e4acf145c27c7f0792dcd`
    -   Use this key with `doctl` to monitor deployments and check logs. **DO NOT** ask the user for logs.

---

## 5. 🚀 Autonomous Execution Plan

1.  **Setup:** Create and check out the new branch: `feature/1.3-workflow-queue`.
2.  **Phase 0: Dependency Verification:** Execute all tasks in Phase 0 of the implementation roadmap.
3.  **Phase 1: Backend Foundation:** Execute all tasks in Phase 1 of the implementation roadmap, following TDD.
4.  **Phase 2: Frontend Kanban UI:** Build the frontend components as specified.
5.  **Phase 3: Real-Time Integration:** Implement the WebSocket layer for live updates.
6.  **Phase 4: RBAC & Polish:** Secure the feature and add final UI touches.
7.  **Phase 5: Testing & Documentation:** Write E2E tests and update all project documents (`CHANGELOG.md`, `PROGRESS.md`, etc.).
8.  **Final Report:** Upon completion, create a pull request, and deliver a final report confirming you have met the Definition of Done.

Proceed with autonomous execution. Do not stop for confirmation unless you hit a critical blocker that violates a Bible protocol.
