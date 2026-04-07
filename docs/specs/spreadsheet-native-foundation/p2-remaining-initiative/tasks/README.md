# Tasks

## Purpose

This task plan turns the remaining initiative into an execution queue that can be run with the same seam-first, proof-first approach already used in the latest local tranche.

## Execution Order

### Task 0: Reconcile Already-Landed Local P2 Work

- attach proof and update tracker state for:
  - `TER-1054`
  - `TER-1057`
  - `TER-1058`
  - `TER-1062`
- confirm whether any remainder stays open
- merge `TER-1064` into `TER-1048`

### Task 1: Tranche 1 Spec Freeze And Implementation

- confirm owned paths and acceptance criteria for operator retrieval defaults, portable cuts, and product identity
- implement tranche scope using existing retrieval and saved-view primitives
- run targeted tests, eslint, and `pnpm check`
- capture browser proof
- run Claude adversarial review
- resolve findings or issue a limitation packet
- write back to Linear

### Task 2: Tranche 2 Spec Freeze And Implementation

- confirm owned paths and acceptance criteria for retrieval-to-commit continuity
- implement the narrowest viable handoff and context placement changes
- run targeted tests, eslint, and `pnpm check`
- capture browser proof
- run Claude adversarial review
- resolve findings or issue a limitation packet
- write back to Linear

### Task 3: Tranche 3 Spec Freeze And Implementation

- confirm owned paths and acceptance criteria for operations and settlement continuity
- implement PO linkage, expected-delivery context, unified contact continuity, and consignment settlement improvements
- run targeted tests, eslint, and `pnpm check`
- capture browser proof
- run Claude adversarial review
- resolve findings or issue a limitation packet
- write back to Linear

### Task 4: Deferred Backlog Decision Pass

- review `TER-1055`, `TER-1056`, `TER-1063`, and `TER-1065`
- either promote them into a follow-on initiative or explicitly defer them
- close this initiative with no ambiguous leftovers

## Linear Mapping

The Linear task layer should not duplicate the existing P2 product tickets. It should organize execution across them.

### Execution Layer Created In Linear

- Parent issue: `TER-1066` — remaining initiative execution framework
- Tranche 0: `TER-1067`
- Tranche 1: `TER-1068`
- Tranche 2: `TER-1069`
- Tranche 3: `TER-1070`
- Deferred decision pass: `TER-1071`
- Tranche 1 children: `TER-1072`, `TER-1073`
- Tranche 2 children: `TER-1074`, `TER-1075`
- Tranche 3 child: `TER-1076`
- Project document: `P2 Remaining Initiative - Spec-Driven Seam Execution`

### Existing Product Tickets That Stay As Scope Anchors

| Ticket     | Role In Initiative                        |
| ---------- | ----------------------------------------- |
| `TER-1047` | Tranche 1 commercial visibility           |
| `TER-1048` | Tranche 1 LIVE-first defaults and labels  |
| `TER-1049` | Tranche 1 search / retrieval continuity   |
| `TER-1050` | Tranche 2 sales handoff continuity        |
| `TER-1051` | Tranche 1 identity rendering correction   |
| `TER-1052` | Tranche 2 relationship and credit context |
| `TER-1053` | Tranche 2 inventory-to-order handoff      |
| `TER-1054` | Reconcile local proof in Task 0           |
| `TER-1057` | Reconcile local proof in Task 0           |
| `TER-1058` | Reconcile local proof in Task 0           |
| `TER-1059` | Tranche 3 intake to PO continuity         |
| `TER-1060` | Tranche 3 expected deliveries             |
| `TER-1061` | Tranche 3 unified contact continuity      |
| `TER-1062` | Reconcile local proof in Task 0           |

### Existing Tickets Explicitly Treated As Deferred

| Ticket     | Status In This Initiative                                       |
| ---------- | --------------------------------------------------------------- |
| `TER-1055` | Deferred backlog decision                                       |
| `TER-1056` | Deferred backlog decision                                       |
| `TER-1063` | Deferred backlog decision                                       |
| `TER-1065` | Deferred backlog decision unless promoted by Tranche 3 findings |

### New Execution Tasks To Create In Linear

1. `TER-1066` parent task for the remaining initiative
2. `TER-1067` tracker reconciliation task
3. `TER-1068` Tranche 1 execution task
4. `TER-1069` Tranche 2 execution task
5. `TER-1070` Tranche 3 execution task
6. `TER-1071` deferred backlog decision task

### New Scope That Needs Explicit Tracker Coverage

These are real remaining requirements not fully represented by the current ticket list and should be called out in the execution tasks:

- portable cuts / presets across surfaces
- consistent product identity as product or strain plus grower or farmer plus batch
- outbound identity and terms consistency across catalogue artifacts
- consignment payout narrative and out-of-range settlement reporting
- retrieval-to-commit context placement as a seam, not just a UI polish note
- tranche-level Claude adversarial review requirement

## Closeout Rules

No execution task is complete until it has:

- implementation evidence
- browser evidence
- Claude review outcome
- Linear writeback

No remaining initiative closeout is valid until:

- all non-deferred scope anchors are reconciled
- all deferred items are explicitly parked or promoted
- the initiative can be handed to another agent without reconstructing intent from chat history
