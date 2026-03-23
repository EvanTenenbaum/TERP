# Capability Ledger Summary: Returns

Snapshot: commit `7514e3e8` (main, 2026-03-20) | Extracted: 2026-03-20 | Checked Against Code: yes

## Module Family

Table + Support Cards — hybrid. Queue is sheet-native, composition dialog stays as guided surface.

## Architecture Decision

**Hybrid: the return composition flow stays as a guided dialog. The queue is the sheet-native surface.**

The composition step requires order-lookup, line-item selection, per-item quantity override, restock decision, and reason code — all depending on runtime order context. The approval workflow (approve/reject/receive/process) belongs as sidecar support cards. Credit/GL follow-up deferred to GF-012.

## Critical Constraints

1. Return composition is multi-step and order-context-dependent — dialog must remain
2. Restock decision is irreversible at create time — must be visible and explicit
3. Approval workflow partially surfaced — approve/reject/receive have pilot UI (ReturnsPilotSurface); process sidecar deferred (DISC-RET-001); cancel procedure not yet in router
4. Vendor return path is API-only — no UI exposes processVendorReturn
5. **DISC-RET-001 (CRITICAL): Double credit risk** — returns.create and returns.process both issue credit memos independently
6. Status stored in notes text via bracket markers — no status column, filtering blocked pending migration

## Capabilities (29 total)

| ID      | Capability                     | Type           | Criticality | Migration Decision                                                                           |
| ------- | ------------------------------ | -------------- | ----------- | -------------------------------------------------------------------------------------------- |
| RET-001 | Return queue browse            | Query          | P0          | Adopt                                                                                        |
| RET-002 | Filter by status               | Query          | P0          | Adopt — blocked (schema migration needed)                                                    |
| RET-003 | Filter by order ID             | Query          | P1          | Adopt                                                                                        |
| RET-004 | Filter by client ID            | Query          | P1          | Adopt — blocked                                                                              |
| RET-005 | Stats summary band             | View           | P1          | Adapt                                                                                        |
| RET-006 | Monthly return trend           | View           | P2          | Adopt                                                                                        |
| RET-007 | Return composition dialog      | Mutation-stage | P0          | Preserve                                                                                     |
| RET-008 | Order context load             | Query          | P0          | Preserve                                                                                     |
| RET-009 | Line-item selection            | Mutation-stage | P0          | Preserve                                                                                     |
| RET-010 | Per-item quantity override     | Mutation-stage | P1          | Preserve                                                                                     |
| RET-011 | Per-item reason text           | Mutation-stage | P2          | Adopt                                                                                        |
| RET-012 | Return reason code             | Mutation-stage | P0          | Preserve                                                                                     |
| RET-013 | Restock decision               | Mutation-stage | P0          | Preserve                                                                                     |
| RET-014 | Return notes                   | Mutation-stage | P2          | Adopt                                                                                        |
| RET-015 | Return create commit           | Mutation       | P0          | Preserve                                                                                     |
| RET-016 | GL status visibility           | View           | P1          | Adapt                                                                                        |
| RET-017 | Approve return                 | Mutation       | P0          | Adopt — pilot UI exists (ReturnsPilotSurface), classic ReturnsPage still lacks these actions |
| RET-018 | Reject return                  | Mutation       | P0          | Adopt — pilot UI exists (ReturnsPilotSurface), classic ReturnsPage still lacks these actions |
| RET-019 | Receive returned items         | Mutation       | P0          | Adopt — pilot UI exists (ReturnsPilotSurface), classic ReturnsPage still lacks these actions |
| RET-020 | Process return + issue credit  | Mutation       | P1          | Adopt — pilot sidecar deferred (DISC-RET-001 double-credit risk unresolved; GF-012)          |
| RET-021 | Cancel return                  | Mutation       | P1          | Adopt — deferred (cancel procedure not yet in router)                                        |
| RET-022 | Return detail view             | Query          | P1          | Adopt — no UI                                                                                |
| RET-023 | Returns by order               | Query          | P1          | Adopt — no UI                                                                                |
| RET-024 | Vendor return path             | Mutation       | P1          | Adopt — no UI                                                                                |
| RET-025 | Vendor return options          | Query          | P1          | Adopt — no UI                                                                                |
| RET-026 | Mark order as returned         | Mutation       | P1          | Preserve                                                                                     |
| RET-027 | Order-based allocation restock | Mutation       | P1          | Preserve                                                                                     |
| RET-028 | Remove item confirmation       | Dialog         | P2          | Preserve                                                                                     |
| RET-029 | Returns dashboard summary      | Query          | P2          | Adopt                                                                                        |

## Discrepancies

| ID           | Description                                                                                                               | Severity |
| ------------ | ------------------------------------------------------------------------------------------------------------------------- | -------- |
| DISC-RET-001 | Double credit: returns.create auto-issues credit + returns.process issues credit independently                            | Critical |
| DISC-RET-002 | Status stored in notes text, no status column, list filter commented out                                                  | High     |
| DISC-RET-003 | Two restock paths (batch-level vs allocation-level) can double-restock same inventory                                     | High     |
| DISC-RET-004 | Approve/reject/receive now have pilot UI (ReturnsPilotSurface); process deferred (DISC-RET-001); cancel not yet in router | High     |
| DISC-RET-005 | Vendor return path has no UI, vendorReturns records never read back                                                       | High     |
| DISC-RET-006 | GL status parsed independently client-side and server-side, no shared code                                                | Medium   |
| DISC-RET-007 | getStats SQL references unmapped reason values, always returns 0                                                          | Medium   |
| DISC-RET-008 | processRestock requires RETURNED status but no UI chains the flow                                                         | Medium   |
| DISC-RET-009 | returns.create uses ctx.user?.id directly — forbidden pattern                                                             | Medium   |
| DISC-RET-010 | expectedCondition field has no UI input in composition dialog                                                             | Low      |

## Classification

- sheet-native: 4 | sheet-plus-sidecar: 8 | dialog-preserved: 10 | adopt-no-ui: 8 | deferred: 1
