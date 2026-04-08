# TER-1071 Deferred Decision Pass

## Purpose

Close the remaining initiative without silently reopening dashboard or workflow expansion work that the packet explicitly treated as deferred.

## Inputs Reviewed

- `docs/specs/spreadsheet-native-foundation/p2-remaining-initiative/tasks/README.md`
- `docs/specs/spreadsheet-native-foundation/p2-remaining-initiative/requirements/README.md`
- `docs/specs/spreadsheet-native-foundation/p2-remaining-initiative/design/README.md`
- `client/src/components/dashboard/SimpleDashboard.tsx`
- `client/src/components/spreadsheet-native/FulfillmentPilotSurface.tsx`
- `client/src/components/clients/CommunicationTimeline.tsx`
- `client/src/components/clients/AddCommunicationModal.tsx`
- `server/routers/clients.ts`

## Decision Table

| Ticket | Repo Reality Check | Decision | Tracker Action |
| --- | --- | --- | --- |
| `TER-1055` | The current dashboard already surfaces `Pending Intake` and `Calendar Today`, but not the requested expected-deliveries / pending-fulfillment KPI bundle. See `client/src/components/dashboard/SimpleDashboard.tsx:200-305`. | Keep deferred. This is dashboard expansion, not a continuity blocker for the P2 remaining initiative. | Move to `Backlog` with explicit defer reason. |
| `TER-1056` | No dashboard-level activity feed surface was found in the current dashboard routes/components. The nearest existing primitive is client-scoped communications, not a global since-last-session operational feed. | Keep deferred. This would reopen dashboard / home-surface scope instead of closing continuity seams. | Move to `Backlog` with explicit defer reason. |
| `TER-1063` | The fulfillment surface already has a queue, item locations, and manifest export with location columns. See `client/src/components/spreadsheet-native/FulfillmentPilotSurface.tsx:761-1006`. | Keep deferred, but reframe as a fulfillment follow-on rather than a missing core P2 continuity seam. The remaining gap is proof and workflow framing around confirmed-order handoff, not a missing pick-list engine. | Move to `Backlog` with explicit follow-on note. |
| `TER-1065` | Client communications already exist in the product as a timeline, modal entry flow, and router endpoints. See `client/src/components/clients/CommunicationTimeline.tsx:21-182`, `client/src/components/clients/AddCommunicationModal.tsx:31-173`, and `server/routers/clients.ts:561-595`. | Keep deferred, but reframe as a payments-follow-up workflow built on existing communications primitives instead of a missing foundational capability. | Move to `Backlog` with explicit follow-on note. |

## Why None Of These Reopen P2

- `TER-1055` and `TER-1056` are exactly the dashboard expansion items the requirements packet warned against silently mixing back into core continuity work.
- `TER-1063` already has substantial enabling primitives in the fulfillment surface, which means it belongs in a focused fulfillment follow-on instead of as an ambiguous leftover from this initiative.
- `TER-1065` already has CRUD-style communication primitives, but not the higher-level payment follow-up workflow. That is a separate workflow design problem, not a blocker on the continuity seams that were just closed.

## Result

- No deferred ticket blocks closing the P2 remaining initiative.
- All four deferred items should stay visible in Linear, but as explicitly parked backlog work with written reasons instead of implicit "maybe later" leftovers.
