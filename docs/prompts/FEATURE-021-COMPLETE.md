<!-- METADATA (for validation) -->
<!-- TASK_ID: FEATURE-021 -->
<!-- TASK_TITLE: Implement Unified Spreadsheet View -->
<!-- PROMPT_VERSION: 1.1 (Self-Contained) -->
<!-- LAST_VALIDATED: 2026-01-02 -->

**Repository:** https://github.com/EvanTenenbaum/TERP  
**Task ID:** FEATURE-021  
**Priority:** P1 (HIGH)  
**Estimated Time:** 40-56 hours  
**Module:** `client/src/pages/`, `server/routers/`

---

## 🤖 UNIVERSAL AGENT PROTOCOLS (MANDATORY)

**You are an AI agent working on TERP, a comprehensive ERP system. Your prime directive is to leave the code in a better state than you found it.**

### Critical Rules (NEVER BREAK)

1.  ❌ **No hallucinations**: Don't invent task IDs or file paths.
2.  ❌ **No placeholders**: Deliver complete, production-ready code.
3.  ❌ **No broken links**: Verify all references exist.
4.  ❌ **No stale sessions**: Archive completed work.
5.  ❌ **No unverified deployments**: Confirm builds succeed.
6.  ❌ **No skipped tests**: All code must have tests.
7.  ❌ **No `any` types**: Use proper TypeScript types.
8.  ❌ **No uncommitted changes**: Push after every phase.
9.  ❌ **No solo decisions on breaking changes**: Get approval first.
10. ❌ **No editing files another agent is working on**: Check sessions first.

### Workflows

-   **Git Workflow:** `git pull` -> `git checkout -b feature/TASK-ID` -> `git commit` -> `git push` -> `git merge`
-   **Testing Workflow:** TDD is mandatory. Write tests first, watch them fail, implement, watch them pass.
-   **Session Management:** Register session in `docs/ACTIVE_SESSIONS.md` before starting, archive it in the SAME commit as your final code.

### Pre-Commit Checklist

1.  [ ] `pnpm typecheck` passes
2.  [ ] `pnpm lint` passes
3.  [ ] `pnpm test` passes
4.  [ ] `pnpm build` passes
5.  [ ] `pnpm roadmap:validate` passes
6.  [ ] `pnpm validate:sessions` passes

---

## 🎯 CONTEXT: FEATURE-021 - UNIFIED SPREADSHEET VIEW

**Background:**
To improve user adoption and reduce friction for users accustomed to spreadsheet-based workflows, we will create a unified **Spreadsheet View** within the TERP ERP. This interface will provide a familiar, grid-based experience for managing **Inventory**, processing new **Intakes**, and handling the **Pick & Pack** fulfillment process.

**Goal:**
Implement the Spreadsheet View feature according to the specification, ensuring it is a pure presentation layer over the existing TERP backend and enforces all existing security and data integrity rules.

**Success Criteria:**
- [ ] All features from the specification are implemented.
- [ ] The spreadsheet view is a pure presentation layer with no new business logic.
- [ ] All data operations use existing tRPC procedures.
- [ ] All validation, permissions, and business rules are enforced.
- [ ] Bidirectional data sync with standard ERP views is working.
- [ ] All actions are logged in the audit trail.
- [ ] All tests pass (unit, integration, E2E, security).
- [ ] Feature is released behind the `spreadsheet-view` feature flag.

---

## 🚨 CRITICAL DESIGN PRINCIPLE: PURE PRESENTATION LAYER

> **The Spreadsheet View is NOT a separate system. It is an alternative UI skin over the existing TERP ERP.**

This principle is non-negotiable and must be enforced throughout the implementation:

| Principle | Requirement |
|-----------|-------------|
| **Same Backend** | All data operations MUST flow through the existing tRPC routers and services. No direct database access. No new business logic. |
| **Same Validation** | All input validation, business rules, and constraints enforced in the standard ERP views MUST apply identically in the spreadsheet view. |
| **Same Permissions** | All role-based access controls (RBAC) and permission checks MUST be enforced. Users cannot access or modify data they couldn't access in the standard view. |
| **Same Audit Trail** | All actions MUST be logged through the existing `auditLogs` system. Every create, update, and delete is traceable. |
| **Bidirectional Sync** | Changes made in the spreadsheet view MUST appear immediately in the standard ERP views, and vice versa. There is ONE source of truth: the database. |

---

## 📝 IMPLEMENTATION PLAN

### Phase 1: Pre-Flight Check & Roadmap Update

**Objective:** Register your session and add this task to the roadmap.

1.  **Register Session (Atomic):**
    -   `git pull origin main`
    -   Check `docs/ACTIVE_SESSIONS.md` for conflicts.
    -   Create session file: `docs/sessions/active/Session-$(date +%Y%m%d)-FEATURE-021-$(openssl rand -hex 4).md`
    -   Add session to `docs/ACTIVE_SESSIONS.md`.
    -   Commit and push **immediately**.
2.  **Add to Roadmap:**
    -   Append the following to `docs/roadmaps/NEW_TASKS_BACKLOG.md`:
        ```markdown
        ---

        ## 🖥️ User Experience Features - Added 2026-01-02

        ### FEATURE-021: Unified Spreadsheet View

        **Priority:** P1 | **Status:** 📋 Spec Complete | **Effort:** 40-56h

        Implement a spreadsheet-like interface for users accustomed to spreadsheet-based workflows. This feature provides a familiar, grid-based experience for managing Inventory, processing new Intakes, and handling Pick & Pack fulfillment, while maintaining full integration with the TERP backend.

        **Architecture:** "Views, Not Modules" - Pure presentation layer over existing services. NO new business logic. All mutations flow through existing tRPC procedures.

        **Specification:** [`docs/specs/FEATURE-SPREADSHEET-VIEW-SPEC.md`](../specs/FEATURE-SPREADSHEET-VIEW-SPEC.md)
        **QA Review:** [`docs/reviews/QA-REVIEW-SPREADSHEET-VIEW-SPEC-V2.md`](../reviews/QA-REVIEW-SPREADSHEET-VIEW-SPEC-V2.md)
        **Mockups:** [`docs/specs/mockups/spreadsheet-view/`](../specs/mockups/spreadsheet-view/)

        ---
        ```
    -   Append the following to `docs/roadmaps/ACTIVE_TASKS_SECTION.md`:
        ```markdown
        ### FEATURE-021: Unified Spreadsheet View

        **Status:** 📋 Ready  
        **Priority:** 🔴 HIGH  
        **Estimate:** 40-56h  
        **Module:** `client/src/pages/`, `server/routers/`  
        **Dependencies:** None  
        **Spec:** [`docs/specs/FEATURE-SPREADSHEET-VIEW-SPEC.md`](../specs/FEATURE-SPREADSHEET-VIEW-SPEC.md)
        **Prompt:** [`docs/prompts/FEATURE-021-COMPLETE.md`](../prompts/FEATURE-021-COMPLETE.md)

        **Objectives:**
        - Implement spreadsheet-like grid interface using AG-Grid
        - Provide familiar workflow for users accustomed to spreadsheets
        - Cover Inventory, Intake, Pick & Pack, and Client views
        - Ensure all operations flow through existing tRPC procedures (no bypasses)
        - Maintain bidirectional data sync with standard ERP views

        **Deliverables:**
        - [ ] Phase 1: Inventory Grid + Client View (16-20h)
        - [ ] Phase 2: Intake Grid (12-16h)
        - [ ] Phase 3: Pick & Pack Grid (12-20h)
        - [ ] Unit tests for cell renderers and data transformers
        - [ ] Integration tests for `spreadsheetRouter` procedures
        - [ ] E2E tests for core workflows
        - [ ] Security tests verifying permission enforcement
        - [ ] All tests passing (no regressions)
        - [ ] Zero TypeScript errors
        - [ ] Feature flag: `spreadsheet-view`
        - [ ] MASTER_ROADMAP updated to ✅ Complete

        ---
        ```
    -   Commit and push the roadmap updates.

### Phase 2: Development (Phased Approach)

**Objective:** Implement the Spreadsheet View feature in three phases, releasing each behind the `spreadsheet-view` feature flag.

1.  **Phase 2.1: Inventory Grid + Client View (16-20h)**
    -   Create `SpreadsheetViewPage.tsx` with tabs.
    -   Create `spreadsheetRouter.ts` with `getInventoryGridData` and `getClientGridData` procedures.
    -   Create `InventoryGrid.tsx` using AG-Grid, calling `inventory.updateBatch` for mutations.
    -   Create `ClientGrid.tsx` with master-detail layout, calling `orders.updateOrderLineItem` for mutations.
2.  **Phase 2.2: Intake Grid (12-16h)**
    -   Create `IntakeGrid.tsx` for new batch entry.
    -   Integrate with `inventoryIntakeService.processIntake`.
3.  **Phase 2.3: Pick & Pack Grid (12-20h)**
    -   Create `PickPackGrid.tsx` for order fulfillment.
    -   Integrate with `pickPack.packItems` and `pickPack.updateOrderStatus`.

### Phase 3: Testing & QA

**Objective:** Ensure the feature is robust, secure, and meets all requirements.

1.  **Unit Tests:** 100% coverage for cell renderers and data transformers.
2.  **Integration Tests:** All `spreadsheetRouter` procedures.
3.  **E2E Tests:** Core workflows (inventory edit, intake submit, pack items).
4.  **Security Tests:** Verify unauthorized actions are blocked.
5.  **Consistency Tests:** Verify bidirectional data sync.

### Phase 4: Completion

**Objective:** Finalize the feature and update the roadmap.

1.  **Final Review:** Perform a final review of the code and functionality.
2.  **Update Roadmap:** Update the `MASTER_ROADMAP.md` to mark FEATURE-021 as ✅ Complete.
3.  **Archive Session:** Move your session file to `docs/sessions/archive/`.
4.  **Commit & Push:** Commit all changes and push to `main`.

---

## 📚 QUICK REFERENCE

-   **Specification:** [`docs/specs/FEATURE-SPREADSHEET-VIEW-SPEC.md`](../specs/FEATURE-SPREADSHEET-VIEW-SPEC.md)
-   **QA Review:** [`docs/reviews/QA-REVIEW-SPREADSHEET-VIEW-SPEC-V2.md`](../reviews/QA-REVIEW-SPREADSHEET-VIEW-SPEC-V2.md)
-   **Mockups:** [`docs/specs/mockups/spreadsheet-view/`](../specs/mockups/spreadsheet-view/)

---

## ❓ TROUBLESHOOTING

-   **Data not appearing?** Check the `spreadsheetRouter` for data transformation errors.
-   **Mutations failing?** Verify that you are calling the correct existing tRPC procedure and that the input matches the Zod schema.
-   **Permissions issues?** Ensure you are using `protectedProcedure` and that the user has the correct role.
