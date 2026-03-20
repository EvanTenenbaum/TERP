# Spreadsheet-Native Full Rollout — Master Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Roll out PowersheetGrid sheet-native surfaces to all applicable TERP modules, retire classic WorkSurface components, and prove zero capability regression — coordinated across multiple agent sessions.

**Architecture:** Each module gets a `*PilotSurface.tsx` component that wraps PowersheetGrid with module-specific queries, mutations, affordances, and field policies. A SheetModeToggle on each workspace page lets users switch between classic and sheet-native during transition. Classic surfaces are removed after a 30-day transition period once parity proof passes.

**Tech Stack:** React 19, AG Grid Enterprise (PowersheetGrid wrapper), tRPC queries/mutations, Tailwind 4, shadcn/ui, Vitest for unit tests, Playwright for staging proofs.

---

## North Star

**TERP becomes a spreadsheet-first ERP.** Every data-dense surface renders through PowersheetGrid with:

- Consistent selection, clipboard, fill, and keyboard behavior
- Visible affordance matrix showing what's available per surface
- Editable/locked cell visual cues
- Platform-detected keyboard shortcuts
- Classic fallback during transition, then sunset

**Definition of Done:** Every module with a classic WorkSurface component has a sheet-native PilotSurface that passes the 3-gate verification (capability ledger → implementation → parity proof), and the classic component is removed.

---

## Current State (2026-03-20)

### Completed

| Module       | Surface                          | Lines | Status                                        |
| ------------ | -------------------------------- | ----- | --------------------------------------------- |
| Orders       | `OrdersSheetPilotSurface.tsx`    | 741   | G5 closed, G6 partial (5 rows need attention) |
| Inventory    | `InventorySheetPilotSurface.tsx` | ~800  | Implemented, toggle wired                     |
| Sales Sheets | `SalesSheetsPilotSurface.tsx`    | 1057  | Implemented, toggle wired                     |

### Capability Ledgers Ready (implementation unblocked)

| Module        | Ledger Rows | Discrepancies                                    | Classic Lines |
| ------------- | ----------- | ------------------------------------------------ | ------------- |
| Payments      | 20          | 6 (incl. dead toggle switch, missing void UI)    | 1,263         |
| Client Ledger | 12          | 3 (export filter mismatch, permissions docs gap) | 1,225         |

### Detailed Ledger Exists (from prior work, implementation ready)

| Module          | Classic Lines |
| --------------- | ------------- |
| Direct Intake   | 2,600         |
| Purchase Orders | 2,909         |

### Pack-Level Only (need architect pass before implementation)

| Module                    | Pack Rows | Classic Lines |
| ------------------------- | --------- | ------------- |
| Fulfillment / Pick & Pack | 4         | 1,642         |
| Invoices                  | 3         | 1,308         |
| Quotes                    | 0         | 931           |
| Returns                   | 4         | 577           |
| Samples                   | 4         | 839           |

---

## Multi-Session Execution Plan

### Phase 0: Foundation Cleanup (1 session)

**Owner:** Coordinator agent
**Goal:** Clean Linear, close stale work, establish tracking

- [ ] **Step 1:** Audit all Linear projects and issues
- [ ] **Step 2:** Close/archive completed or stale issues
- [ ] **Step 3:** Create Linear project: "Spreadsheet-Native Rollout" with milestones per wave
- [ ] **Step 4:** Create parent issues for each wave (SNR-W1 through SNR-W4)
- [ ] **Step 5:** Create child issues per module per gate (e.g., SNR-W1-PAY-G1, SNR-W1-PAY-G2, SNR-W1-PAY-G3)
- [ ] **Step 6:** Close Orders G6 remaining items or document as accepted limitations
- [ ] **Step 7:** Commit updated roadmap with Linear issue IDs

### Phase 1: Wave 1 Completion (2-3 sessions)

**Owner:** 2 parallel coder agents + 1 QA agent
**Goal:** All 4 Wave 1 modules have sheet-native surfaces with parity proof

**Session 1A: Payments implementation**

- Agent type: `terp-implementer` in worktree
- Input: `docs/specs/spreadsheet-native-ledgers/payments-capability-ledger-summary.md`
- Output: `PaymentsPilotSurface.tsx` with guided commit flow sidecar
- Key constraint: Payment commit MUST stay explicit (never inline)
- Key fix: Wire `previewPaymentBalance` into confirm step, add void UI, fix dead sendReceipt toggle
- Toggle: Wire into AccountingWorkspacePage payments tab

**Session 1B: Client Ledger implementation**

- Agent type: `terp-implementer` in worktree
- Input: `docs/specs/spreadsheet-native-ledgers/client-ledger-capability-ledger-summary.md`
- Output: `ClientLedgerPilotSurface.tsx`
- Key constraint: Running balance MUST stay visible when inspector is open
- Key constraint: 5-source balance calculation must use all sources (orders, payments received, payments sent, POs, manual adjustments)
- Toggle: Wire into standalone client-ledger route

**Session 1C: Wave 1 QA + parity proof**

- Agent type: `terp-qa-reviewer`
- Adversarial review of all 4 Wave 1 surfaces
- Verify each capability in the ledger has a working sheet-native path
- Staging proof screenshots
- Classic fallback toggle verification

### Phase 2: Wave 2 Implementation (2-3 sessions)

**Owner:** 2-3 parallel coder agents + 1 QA agent
**Prerequisite:** Wave 1 QA passes
**Goal:** Direct Intake, Purchase Orders, and Fulfillment have sheet-native surfaces

**Session 2A: Direct Intake implementation**

- Agent type: `terp-implementer` in worktree
- Input: existing detailed ledger at `docs/specs/spreadsheet-native-ledgers/direct-intake-capability-ledger.csv`
- Output: `IntakePilotSurface.tsx`
- Key constraint: Direct intake vs PO-linked intake are different workflows — must not collapse
- Toggle: Wire into InventoryWorkspacePage intake tab

**Session 2B: Purchase Orders implementation**

- Agent type: `terp-implementer` in worktree
- Input: existing detailed ledger at `docs/specs/spreadsheet-native-ledgers/purchase-orders-capability-ledger.csv`
- Output: `PurchaseOrdersPilotSurface.tsx`
- Key constraint: Intake handoff must stay visible and row-scoped
- Toggle: Wire into PurchaseOrdersWorkspacePage

**Session 2C: Fulfillment architect + implementation**

- Agent type: `feature-dev:code-architect` → `terp-implementer`
- First: Build detailed capability ledger from PickPackWorkSurface.tsx (1,642 lines)
- Then: Build `FulfillmentPilotSurface.tsx`
- Key constraint: Mobile-friendly — sheet-native must not regress touch usability
- Toggle: Wire into fulfillment route

**Session 2D: Wave 2 QA**

- Same pattern as 1C

### Phase 3: Wave 3 Implementation (2-3 sessions)

**Owner:** Architect agents (for ledgers) + coder agents + QA
**Prerequisite:** Wave 2 QA passes
**Goal:** Invoices, Returns, Quotes, Samples have sheet-native surfaces

**Session 3A: Architect pass for 4 remaining modules**

- 4 parallel architect agents build detailed capability ledgers for:
  - Invoices (from InvoicesWorkSurface.tsx, 1,308 lines)
  - Returns (from ReturnsPage.tsx, 577 lines)
  - Quotes (from QuotesWorkSurface.tsx, 931 lines — NO existing ledger)
  - Samples (from SampleManagement.tsx, 839 lines)

**Session 3B: Implementation (parallel)**

- 4 parallel coder agents build surfaces from the ledgers

**Session 3C: Wave 3 QA**

- Same pattern as 1C

### Phase 4: Classic Sunset (1 session)

**Owner:** Coordinator agent
**Prerequisite:** All Wave 1-3 QA passes, all parity proofs green
**Goal:** Sheet-native becomes default, classic enters 30-day sunset

- [ ] **Step 1:** Set `surface=sheet-native` as default for all modules
- [ ] **Step 2:** Keep `?surface=classic` accessible for 30-day transition
- [ ] **Step 3:** Remove SheetModeToggle components
- [ ] **Step 4:** After 30 days: remove classic WorkSurface components
- [ ] **Step 5:** Update all documentation
- [ ] **Step 6:** Close Linear project

---

## Per-Module Gate Structure

Every module follows 3 gates:

| Gate | Name              | Exit Criteria                                                                                                                                                   | Owner           |
| ---- | ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------- |
| G1   | Capability Ledger | Detailed CSV/MD exists. Every capability classified as preserved/adapted/deferred/rejected. Zero unclassified.                                                  | Architect agent |
| G2   | Implementation    | PilotSurface renders. All preserved/adapted capabilities work. Affordances, keyboard hints, editable/locked cues. `pnpm check && lint && test && build` passes. | Coder agent     |
| G3   | Parity Proof      | Staging proof shows every preserved capability works. Classic toggle verified. Adversarial review passes. No P0/P1 features missing.                            | QA agent        |

---

## Capability Regression Prevention Protocol

For EVERY module, BEFORE implementation:

1. **Extract** — `pnpm capability:extract <ClassicSurface.tsx>` → CSV
2. **Diff** — Compare CSV against detailed capability ledger
3. **Classify** — Each capability gets: preserved | adapted | deferred | rejected
4. **Gate** — Zero unclassified capabilities before code starts

---

## Linear Project Structure

```
Project: Spreadsheet-Native Rollout
├── Milestone: Wave 1 — Core Business
│   ├── SNR-W1-INV — Inventory (G1✓ G2✓ G3 pending)
│   ├── SNR-W1-SHT — Sales Sheets (G1✓ G2✓ G3 pending)
│   ├── SNR-W1-PAY — Payments (G1✓ G2 pending G3 pending)
│   └── SNR-W1-LED — Client Ledger (G1✓ G2 pending G3 pending)
├── Milestone: Wave 2 — Operations & Procurement
│   ├── SNR-W2-INT — Direct Intake (G1✓ G2 pending G3 pending)
│   ├── SNR-W2-POS — Purchase Orders (G1✓ G2 pending G3 pending)
│   └── SNR-W2-FUL — Fulfillment (G1 pending G2 pending G3 pending)
├── Milestone: Wave 3 — Sales Extensions & Accounting
│   ├── SNR-W3-INV — Invoices (G1 pending G2 pending G3 pending)
│   ├── SNR-W3-RET — Returns (G1 pending G2 pending G3 pending)
│   ├── SNR-W3-QUO — Quotes (G1 pending G2 pending G3 pending)
│   └── SNR-W3-SMP — Samples (G1 pending G2 pending G3 pending)
└── Milestone: Wave 4 — Classic Sunset
    ├── SNR-W4-DEFAULT — Set sheet-native as default
    ├── SNR-W4-TOGGLE — Remove SheetModeToggle
    └── SNR-W4-CLEANUP — Remove classic WorkSurface components
```

---

## Agent Session Delegation Rules

1. **Each session gets ONE wave or sub-wave** — never mix waves
2. **Coder agents work in worktrees** — isolation prevents conflicts
3. **Architect agents produce ledgers, not code** — clear boundary
4. **QA agents review after implementation, never during**
5. **Coordinator (this agent) owns Linear writeback and gate promotion**
6. **Each coder agent gets:**
   - The capability ledger for its module
   - The extraction CSV for cross-check
   - The Figma golden flow reference
   - The launch matrix Adopt/Adapt/Preserve/Reject decisions
   - The Orders implementation as the pattern reference
   - Exact acceptance criteria from the gate structure
7. **Each QA agent gets:**
   - All surfaces built in that wave
   - The capability ledgers for cross-reference
   - The adversarial review prompt template from the Orders initiative

---

## Risk Register

| Risk                                                                 | Probability | Impact   | Mitigation                                                     |
| -------------------------------------------------------------------- | ----------- | -------- | -------------------------------------------------------------- |
| Capability regression (users lose functionality)                     | High        | Critical | 4-step prevention protocol + adversarial QA per wave           |
| AG Grid license issues on staging                                    | Medium      | High     | Already fixed in Dockerfile + app spec; monitor on each deploy |
| Large surfaces (PO: 2,909 lines, Intake: 2,600) exceed agent context | Medium      | Medium   | Break into sub-tasks; use focused agents per capability group  |
| Mobile regression on Fulfillment                                     | Medium      | High     | Explicit touch-target testing in G3 for fulfillment            |
| Cross-surface navigation breaks                                      | Medium      | High     | Test all deep-link and handoff routes in G3                    |
| Classic sunset removes functionality someone still uses              | Low         | Critical | 30-day transition with `?surface=classic` escape hatch         |

---

## Timeline Estimate (Sessions, Not Calendar)

| Phase            | Sessions          | Parallel Agents                | Output                                        |
| ---------------- | ----------------- | ------------------------------ | --------------------------------------------- |
| Phase 0: Cleanup | 1                 | 1                              | Clean Linear, tracking issues                 |
| Phase 1: Wave 1  | 2-3               | 2 coders + 1 QA                | Payments + Client Ledger surfaces             |
| Phase 2: Wave 2  | 2-3               | 3 coders + 1 QA                | Intake + POs + Fulfillment surfaces           |
| Phase 3: Wave 3  | 2-3               | 4 architects + 4 coders + 1 QA | Invoices + Returns + Quotes + Samples         |
| Phase 4: Sunset  | 1                 | 1                              | Default switch, classic removal               |
| **Total**        | **8-11 sessions** | —                              | **All modules sheet-native, classic removed** |
