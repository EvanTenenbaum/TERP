# Implementation Contract Packet

Date: 2026-03-11

This packet turns the remediation blueprint into concrete execution constraints for the remaining backlog.

## Old-vs-new ownership audit

| Area                                                           | Current evidence-backed reading                                                       | Execution consequence                                                                      |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Owner command center dashboard                                 | Built and already defaultable; low-rebuild evidence says this is materially closed.   | Carry forward in ledger; do not rebuild.                                                   |
| Top-level shell nav (`Buy`, `Relationships`, dashboard return) | Already landed in the low-rebuild slice.                                              | Carry forward in ledger; only replay on staging in final wave.                             |
| Quote interaction affordances                                  | UI affordances exist, but seeded browser proof is missing.                            | Treat as `partial`; finish proof and any remaining dead-end cleanup.                       |
| Returns flow                                                   | Logic exists, but the active UI is still not a true transaction-context return flow.  | Continue implementation, not just proof.                                                   |
| Pricing profile propagation                                    | Multiple pricing systems still coexist.                                               | Treat as active reconstruction work.                                                       |
| Relationship quick create                                      | Lightweight component exists, but the main workspace still launches the heavy wizard. | Wire the live entrypoint to the lightweight flow before claiming closure.                  |
| PO-driven receiving                                            | Handoff from PO into receiving draft is already browser-proven.                       | Carry forward the baseline, but keep receiving-lifecycle rows `partial` until full replay. |
| Shipping simplification                                        | Not implemented.                                                                      | Full implementation plus proof required.                                                   |
| Samples simplification                                         | Not implemented.                                                                      | Full implementation plus proof required.                                                   |
| Photography queue simplification                               | Partial queue exists, but still modal-heavy and confusing.                            | Continue implementation, then prove camera fallback.                                       |
| Accounting / credits cleanup                                   | Domain split exists underneath, but IA and language remain dense.                     | Continue implementation in finance lane.                                                   |

## Status vocabulary matrix

This is the canonical operator-facing language to converge toward.

| Domain            | Allowed operator language                                       | Notes                                                  |
| ----------------- | --------------------------------------------------------------- | ------------------------------------------------------ |
| Commercial        | `Quote -> Order -> Invoice -> Payment / Return / Adjustment`    | Remove unclear workflow-era labels and no-op statuses. |
| Shipping          | `pending`, `partial`, `ready`, `shipped`                        | Any more granular internal states stay internal-only.  |
| Samples           | `samples out`, `samples return`                                 | Collapse current state maze.                           |
| Finance / credits | `client credit capacity`, `credits`, `adjustments`, `refunds`   | Do not mix lending power with transaction corrections. |
| Relationships     | `code name`, `username`, `signal`, `ID`, `phone`, `quick notes` | Avoid CRM-style or misleading labels.                  |

## State persistence matrix

| Surface                 | Must reset on page entry                            | May persist only if explicit          | Must never persist implicitly                             |
| ----------------------- | --------------------------------------------------- | ------------------------------------- | --------------------------------------------------------- |
| Sales workspace         | transient search, stale test tokens                 | chosen saved view                     | dead-end search strings after refresh                     |
| Relationships workspace | transient search                                    | explicit saved filters if later added | stale seeded client names in the default search box       |
| Shipping workspace      | search query, status filter, sort if not user-saved | explicit saved shipping view only     | hidden local-storage state that makes the list look empty |
| Inventory workspace     | advanced filters by default                         | saved views                           | first-load advanced-filter sprawl                         |
| Photography queue       | modal state, camera errors                          | none                                  | stale camera failure state after upload fallback          |

## Screen type inventory

| Surface                 | Contract | Reason                                                                         |
| ----------------------- | -------- | ------------------------------------------------------------------------------ |
| Sales workspace         | Queue    | Main job is to browse, inspect, create, and continue sales work.               |
| Order creator           | Record   | It edits one commercial record and its line items.                             |
| Relationships workspace | Queue    | It should be a fast operational list with lightweight create/edit entrypoints. |
| Client profile          | Record   | Detailed relationship editing belongs here, not in the queue shell.            |
| Inventory workspace     | Queue    | It is an execution surface, not a setup screen.                                |
| Receiving               | Queue    | Operators act on open purchase-order work here.                                |
| Shipping                | Queue    | Operators act on ready/partial/shipped work here.                              |
| Samples                 | Queue    | It should represent outbound and return operational work.                      |
| Photography             | Queue    | It should be a scan-friendly intake surface.                                   |
| Accounting landing      | Queue    | The first load should emphasize primary execution actions.                     |
| Credits settings        | Setup    | Policy belongs here, not in the operator queue.                                |

## Merge and deployment contract

- Do implementation work in isolated worktrees only.
- Run targeted checks continuously.
- Run full repo gates before merge.
- Minimize staging churn by batching compatible tickets by lane.
- Do not mark an issue done until staging proof exists for the row it owns.
