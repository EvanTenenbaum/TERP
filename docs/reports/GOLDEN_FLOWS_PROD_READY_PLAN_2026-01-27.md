# Golden Flows Production Readiness Report & AI Execution Plan (2026-01-27)

## Purpose

Establish a single execution plan for production-ready golden flows by synthesizing open roadmap work with the Jan 26 QA checkpoint findings. This plan is optimized for a single human coordinating AI agents.

## Source Inputs Reviewed

- Jan 26 QA Checkpoint summary, findings, and session notes (`jan-26-checkpoint/`).
- Master roadmap open work and QA audit tasks (`docs/roadmaps/MASTER_ROADMAP.md`).
- QA auth and deterministic RBAC testing flow (`docs/qa/QA_PLAYBOOK.md`).

## Current Reality: Golden Flow Status (Jan 26 QA Checkpoint)

The QA checkpoint marks the system **RED** and core golden flows are blocked. The golden flow status from the checkpoint:

| Flow                        | Status     | Blocker                               |
| --------------------------- | ---------- | ------------------------------------- |
| GF-003 Order-to-Cash        | BLOCKED    | P0 SQL error on inventory load        |
| GF-002 Procure-to-Pay       | BLOCKED    | P0 Product dropdown empty             |
| GF-007 Inventory Management | BLOCKED    | P0 Inventory page shows 0 batches     |
| GF-001 Direct Intake        | BLOCKED    | P1 Form fields not visible            |
| GF-008 Sample Request       | BLOCKED    | P1 Product selector broken            |
| GF-004 Invoice & Payment    | PARTIAL    | P1 PDF download timeout               |
| GF-006 Client Ledger Review | PARTIAL    | P2 Data inconsistencies (Top Debtors) |
| GF-005 Pick & Pack          | NOT TESTED | Blocked by inability to create orders |

## Open Roadmap Tasks That Directly Map to Golden Flow Readiness

The roadmap now includes a Jan 26 QA audit section with new tasks that align directly to the blockers above. These are the **first-order** execution items for production readiness:

### P0/P1 Blockers (Immediate)

- **BUG-110**: Critical SQL error on inventory load (blocks order creation, inventory visibility).
- **BUG-111**: Sales Rep cannot view clients (RBAC failure).
- **BUG-112**: Direct Intake form not rendering.
- **BUG-113**: Invoice PDF generation timeout.
- **BUG-114**: Purchase Order product dropdown empty.
- **BUG-115**: Sample Request product selector broken.
- **DATA-026**: Dashboard vs Inventory data mismatch.

### P2/P3 Supporting Risks

- TEST-INFRA issues: test stability and mocks (TEST-INFRA-07/08/09, TEST-020).
- INFRA-015: idempotency cache migration (multi-instance safety).

## Non-Negotiable Readiness Criteria

These criteria define when a golden flow is production-ready:

1. **Role-correct access**: Each golden flow must pass with its owning role via QA Auth (Sales Rep, Inventory, Accounting, Fulfillment) as defined in QA Playbook.
2. **No P0/P1 blockers**: No blocking bugs for flow entry, data load, or core action completion.
3. **Data integrity**: Dashboard and detail pages match (Inventory counts, AR/AP totals).
4. **Golden flow E2E coverage**: Each golden flow must have at least one E2E test that verifies the core happy path.
5. **UX integrity**: Forms render and inputs are usable; no raw SQL errors or silent failures.

---

# Execution Roadmap (Agent-Friendly)

## Phase 0 — Triage & Unblock (0–2 days)

**Goal:** Remove the P0 blockers and enable core flow execution.  
**Blocking for all subsequent work.**

### Workstream 0A — Inventory Query + Data Mismatch (P0)

**Tasks:** BUG-110 + DATA-026  
**Primary modules:** `server/routers/orders.ts`, `server/inventoryDb.ts`, `server/routers/inventory.ts`  
**Why first:** Inventory query failure blocks GF-003, GF-007, and cascades into PO and Pick & Pack.

**Agent checklist:**

- Reproduce SQL failure from Jan 26 (order creation inventory load).
- Identify query shape and failure point (joins, indexes, or schema mismatch).
- Fix query and add guardrails to prevent raw SQL errors from surfacing in UI.
- Verify inventory list and dashboard values now align.

**Verification:**

- QA auth role login (Sales Rep and Inventory Manager) can view inventory.
- Inventory page lists batches and matches dashboard value.

### Workstream 0B — RBAC Client Access (P0)

**Tasks:** BUG-111  
**Primary modules:** `server/routers/clients.ts`, `server/_core/rbac.ts`

**Agent checklist:**

- Verify Sales Rep role permissions to list clients via QA auth.
- Fix permission check or query path that blocks non-admin roles.
- Confirm `/api/trpc/clients.list` returns success for Sales Rep.

### Workstream 0C — Order State Machine Test Failures (P0 QA)

**Tasks:** Fix failing tests in `server/ordersDb.stateMachine.test.ts` and `server/services/orderStateMachine.test.ts` (current test failures prevent release confidence).

**Agent checklist:**

- Investigate missing export or incorrect function wiring for `getTransitionError`.
- Ensure ORD-003 restrictions enforced in transitions (PACKED → PENDING invalid).
- Update tests or implementation to align with expected state machine contract.

---

## Phase 1 — Flow Restoration (2–5 days)

**Goal:** Restore blocked flow UIs and minimum functionality for golden flows.

### Workstream 1A — Direct Intake (GF-001)

**Tasks:** BUG-112  
**Primary modules:** `client/src/pages/intake/index.tsx` and work-surface intake components.

**Agent checklist:**

- Ensure form rows render for intake fields.
- Verify "Add Row" creates visible inputs and submission persists data.

### Workstream 1B — Procure-to-Pay (GF-002)

**Tasks:** BUG-114  
**Primary modules:** `client/src/components/po/CreatePO.tsx`

**Agent checklist:**

- Ensure product dropdown queries the catalog and is populated.
- Validate that the dropdown aligns with expected inventory/product availability.

### Workstream 1C — Sample Request (GF-008)

**Tasks:** BUG-115  
**Primary modules:** `client/src/components/samples/CreateSampleRequest.tsx`

**Agent checklist:**

- Replace raw text input with searchable product selector.
- Confirm selection populates form state and submits successfully.

### Workstream 1D — Invoice PDF Generation (GF-004)

**Tasks:** BUG-113  
**Primary modules:** PDF generation service.

**Agent checklist:**

- Identify performance bottleneck or loop in PDF generation.
- Ensure PDF download completes under 10 seconds.

### Workstream 1E — AR/AP Data Consistency (GF-006)

**Tasks:** BUG-116  
**Primary modules:** `server/routers/accounting.ts`

**Agent checklist:**

- Ensure Top Debtors and Top Vendors resolve correct names and values.

---

## Phase 2 — QA Automation & Release Gates (2–4 days)

**Goal:** Make golden flow readiness measurable and repeatable.

### Workstream 2A — Role-Correct E2E Coverage

**Task:** Expand/repair golden flow E2E tests to include role-based QA auth.

**Agent checklist:**

- Ensure each golden flow has at least one happy-path E2E test.
- Use QA roles (Sales Rep, Accounting, Inventory, Fulfillment) in tests.
- Add clear pass/fail outputs in CI for golden flow suite.

### Workstream 2B — Test Infra Stability

**Task:** Fix known test infra issues that mask real failures (TEST-INFRA-07/08/09, TEST-020).

**Agent checklist:**

- Update test mocks and fix environment issues.
- Make sure golden flow tests are not blocked by unrelated test infra failures.

---

# AI Agent Execution Structure (Recommended)

## Agent Pool (One Human Orchestrator + AI Agents)

- **Agent A (Backend):** Inventory SQL + data mismatch (BUG-110/DATA-026)
- **Agent B (RBAC):** Sales Rep client access (BUG-111)
- **Agent C (Frontend):** Direct Intake + PO dropdown + Sample selector (BUG-112/114/115)
- **Agent D (Infra/QA):** State machine test failures + admin security test failure
- **Agent E (Accounting):** PDF generation + AR/AP consistency (BUG-113/116)

## Cross-Agent Rules

- Each agent must run role-appropriate QA tests using QA Auth after fix.
- No agent may close a task without verifying golden flow entry works end-to-end.

---

# Deployment & Validation Workflow (for the orchestrator)

1. **Fix P0s in Phase 0 first** and verify locally.
2. **Deploy to QA or staging** and re-run Jan 26 checklist.
3. **Verify RBAC role access** per QA Playbook.
4. **Run golden flow E2E test suite** for the 8 golden flows.
5. **Confirm dashboard and detail page consistency** (Inventory + AR/AP).

---

# Readiness Checklist (Use to Declare Production-Ready)

- [ ] GF-003 Order-to-Cash: Sales Rep can select clients, inventory loads, order created.
- [ ] GF-002 Procure-to-Pay: PO product dropdown populated; PO creation flows end-to-end.
- [ ] GF-007 Inventory: Inventory list loads; dashboard matches inventory data.
- [ ] GF-001 Direct Intake: Form fields render and submission creates batches.
- [ ] GF-008 Sample Request: Product selector usable and request creation works.
- [ ] GF-004 Invoice & Payment: PDF generation completes quickly and payments recorded.
- [ ] GF-006 Client Ledger: Top Debtors/Vendors show correct names and values.
- [ ] GF-005 Pick & Pack: Flow tested end-to-end after order creation restored.
- [ ] E2E tests pass for each golden flow with owning roles.
- [ ] No P0/P1 bugs open.

---

# Immediate Next Actions (Order of Operations)

1. Fix inventory SQL query + data mismatch (BUG-110/DATA-026).
2. Fix Sales Rep client list access (BUG-111).
3. Resolve state machine test failures that block confidence in order transitions.
4. Restore Direct Intake form rendering (BUG-112).
5. Fix PO product dropdown and Sample Request selector (BUG-114/115).
6. Fix invoice PDF generation (BUG-113).
7. Validate AR/AP dashboard consistency (BUG-116).
8. Expand golden flow E2E tests with QA roles.
