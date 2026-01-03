<!-- METADATA (for validation) -->
<!-- TASK_ID: FEATURE-021 -->
<!-- TASK_TITLE: Implement Unified Spreadsheet View -->
<!-- PROMPT_VERSION: 1.0 -->
<!-- LAST_VALIDATED: 2026-01-02 -->

**Repository:** https://github.com/EvanTenenbaum/TERP  
**Task ID:** FEATURE-021  
**Priority:** P1 (HIGH)  
**Estimated Time:** 40-56 hours  
**Module:** `client/src/pages/`, `server/routers/`

---

## 📋 Table of Contents

1. [Context](#context)
2. [Critical Design Principle: Pure Presentation Layer](#critical-design-principle-pure-presentation-layer)
3. [Phase 1: Pre-Flight Check](#phase-1-pre-flight-check)
4. [Phase 2: Development (Phased Approach)](#phase-2-development-phased-approach)
5. [Phase 3: Testing & QA](#phase-3-testing--qa)
6. [Phase 4: Completion](#phase-4-completion)
7. [Quick Reference](#quick-reference)
8. [Troubleshooting](#troubleshooting)

---

## 🎯 Context

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

## 🚨 Critical Design Principle: Pure Presentation Layer

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

## Phase 1: Pre-Flight Check

**Objective:** Verify environment and check for conflicts BEFORE starting work.

### Step 1.1: Register Your Session

1. Create session file: `docs/sessions/active/Session-$(date +%Y%m%d)-FEATURE-021-$(openssl rand -hex 4).md`
2. Use template: `docs/templates/SESSION_TEMPLATE.md`
3. Fill in your session details.

### Step 1.2: Register Session (Atomic) ⚠️ CRITICAL

1. `git pull origin main`
2. Read `docs/ACTIVE_SESSIONS.md` and check for module conflicts.
3. If clear, add your session to the file:
   ```bash
   echo "- FEATURE-021: Session-$(date +%Y%m%d)-FEATURE-021-$(openssl rand -hex 4) ($(date +%Y-%m-%d))" >> docs/ACTIVE_SESSIONS.md
   ```
4. Commit and push **immediately**:
   ```bash
   git add docs/ACTIVE_SESSIONS.md
   git commit -m "Register session for FEATURE-021"
   git push origin main
   ```
5. **If the push fails, another agent registered first.** STOP, pull again, and re-evaluate.

### Step 1.3: Verify Environment

Run these commands:

```bash
npm install
npm run test
npm run build
npm run dev
```

---

## Phase 2: Development (Phased Approach)

**Objective:** Implement the Spreadsheet View feature in three phases, releasing each behind the `spreadsheet-view` feature flag.

### Phase 2.1: Inventory Grid + Client View (16-20h)

1. **Create `SpreadsheetViewPage.tsx`:**
   - Create a new page at `client/src/pages/spreadsheet.tsx`.
   - Add a tabbed interface for Inventory, Intake, Pick & Pack, and Clients.
2. **Create `spreadsheetRouter.ts`:**
   - Create a new router at `server/routers/spreadsheet.ts`.
   - Add `getInventoryGridData` and `getClientGridData` procedures for data transformation only.
3. **Create `InventoryGrid.tsx`:**
   - Use AG-Grid to display inventory data.
   - Implement date grouping, inline editing, and color-coded status cells.
   - All mutations MUST call `inventory.updateBatch`.
4. **Create `ClientGrid.tsx`:**
   - Implement a master-detail layout with a client list and order grid.
   - All mutations MUST call `orders.updateOrderLineItem`.

### Phase 2.2: Intake Grid (12-16h)

1. **Create `IntakeGrid.tsx`:**
   - Create a grid for entering new inventory batches.
   - Use autocomplete for Vendor and Item fields.
2. **Integrate with `inventoryIntakeService`:**
   - The "Submit Intake" button MUST process each row via `inventoryIntakeService.processIntake`.
   - Ensure all validation from the standard intake form is applied.

### Phase 2.3: Pick & Pack Grid (12-20h)

1. **Create `PickPackGrid.tsx`:**
   - Display a real-time queue of orders for fulfillment.
   - Implement multi-select for packing multiple items.
2. **Integrate with `pickPack` router:**
   - "Pack Selected" button MUST call `pickPack.packItems`.
   - Status updates MUST call `pickPack.updateOrderStatus`.

---

## Phase 3: Testing & QA

**Objective:** Ensure the feature is robust, secure, and meets all requirements.

1. **Unit Tests:** Write unit tests for all cell renderers and data transformation functions (100% coverage).
2. **Integration Tests:** Write integration tests for all `spreadsheetRouter` procedures.
3. **E2E Tests:** Write E2E tests for the core user workflows (inventory edit, intake submit, pack items).
4. **Security Tests:** Verify that unauthorized actions are blocked and all permission checks are enforced.
5. **Consistency Tests:** Verify that changes made in the spreadsheet view appear immediately in the standard ERP views, and vice versa.

---

## Phase 4: Completion

**Objective:** Finalize the feature and update the roadmap.

1. **Final Review:** Perform a final review of the code and functionality.
2. **Update Roadmap:** Update the `MASTER_ROADMAP.md` to mark FEATURE-021 as ✅ Complete.
3. **Archive Session:** Move your session file to `docs/sessions/archive/`.
4. **Commit & Push:** Commit all changes and push to `main`.

---

## Quick Reference

- **Specification:** [`docs/specs/FEATURE-SPREADSHEET-VIEW-SPEC.md`](../specs/FEATURE-SPREADSHEET-VIEW-SPEC.md)
- **QA Review:** [`docs/reviews/QA-REVIEW-SPREADSHEET-VIEW-SPEC-V2.md`](../reviews/QA-REVIEW-SPREADSHEET-VIEW-SPEC-V2.md)
- **Mockups:** [`docs/specs/mockups/spreadsheet-view/`](../specs/mockups/spreadsheet-view/)

---

## Troubleshooting

- **Data not appearing?** Check the `spreadsheetRouter` for data transformation errors.
- **Mutations failing?** Verify that you are calling the correct existing tRPC procedure and that the input matches the Zod schema.
- **Permissions issues?** Ensure you are using `protectedProcedure` and that the user has the correct role.
