# Orders Full-Parity Pilot Evaluation Pack

Date: `2026-03-17`

## Purpose

This pack tracks whether `Sales -> Orders` is actually complete enough to assess the final spreadsheet-native direction.

It separates:

- `code-proven`: implemented locally and covered by local tests
- `live-proven`: verified on staging with route, persona, record-state, and screenshot evidence
- `implemented-not-surfaced`: code exists, but the user-facing affordance or visibility proof is still incomplete
- `blocked`: cannot close until the runtime, ownership, or proof prerequisites exist

Orders is not complete until all Orders-owned `P0` and `P1` rows are either `live-proven` or explicitly reclassified with evidence.

## Current State

- Queue-mode sheet-native Orders is live-proven from the March 15 staging wave.
- Document-mode sheet-native Orders was implemented locally on March 17, 2026.
- Document-mode create/edit/finalize/autosave/seeded-entry paths are currently `code-proven`, not yet `live-proven`.
- Existing queue and support-grid proof remains valid as pre-gate pilot evidence, but it does not satisfy the document-first rollout gate by itself.
- Anti-drift rollout control now lives in [ORDERS-ROLLOUT-CONTRACT-2026-03-17.md](./ORDERS-ROLLOUT-CONTRACT-2026-03-17.md), which makes spreadsheet interaction and surfacing rows explicit release gates.
- Accounting, shipping, returns, and invoice-output execution remain adjacent-owned.

## Capability Closure Snapshot

| Capability ID  | Owner Classification   | Current State              | Required Live Proof                                                                                                       |
| -------------- | ---------------------- | -------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `SALE-ORD-001` | Orders-owned           | `live-proven`              | none                                                                                                                      |
| `SALE-ORD-002` | Orders-owned           | `live-proven`              | none                                                                                                                      |
| `SALE-ORD-003` | Orders-owned           | `code-proven`              | new draft from `/sales?tab=orders&surface=sheet-native&ordersView=document`                                               |
| `SALE-ORD-004` | Orders-owned           | `code-proven`              | draft edit with recalculation and undo evidence                                                                           |
| `SALE-ORD-005` | Orders-owned           | `code-proven`              | finalize guardrail + credit warning evidence                                                                              |
| `SALE-ORD-006` | Orders-owned           | `code-proven`              | edit draft + delete draft + queue return evidence                                                                         |
| `SALE-ORD-007` | Orders-owned           | `code-proven`              | confirmed-order queue return and post-confirm context evidence                                                            |
| `SALE-ORD-008` | adjacent-owned         | `partial`                  | explicit Accounting launch proof if kept in Orders                                                                        |
| `SALE-ORD-009` | adjacent-owned handoff | `live-proven`              | none                                                                                                                      |
| `SALE-ORD-010` | adjacent-owned         | `partial`                  | Returns owner-surface proof refresh                                                                                       |
| `SALE-ORD-011` | adjacent-owned handoff | `live-proven`              | none                                                                                                                      |
| `SALE-ORD-012` | Orders-owned           | `partial`                  | quote-to-order initiation and mutation proof                                                                              |
| `SALE-ORD-013` | ownership-blocked      | `blocked`                  | explicit owner decision                                                                                                   |
| `SALE-ORD-014` | adjacent-owned         | `blocked`                  | Accounting output proof or explicit reclassification                                                                      |
| `SALE-ORD-015` | Orders-owned           | `code-proven`              | sheet-native queue draft delete proof                                                                                     |
| `SALE-ORD-016` | Orders-owned           | `code-proven`              | quote/client/need/sales-sheet seeded-entry proof                                                                          |
| `SALE-ORD-017` | Orders-owned           | `code-proven`              | autosave + unsaved-nav + keyboard shortcut proof                                                                          |
| `SALE-ORD-018` | Orders-owned           | `code-proven`              | client-seeded credit/pricing/referral context proof                                                                       |
| `SALE-ORD-019` | Orders-owned           | `partial`                  | document-mode Shift-range proof landed on staging; queue drag, Cmd, and scope-selection proof still required              |
| `SALE-ORD-020` | Orders-owned           | `partial`                  | document-grid editing plus live duplicate/range proof landed on staging; full multi-cell pricing/autosave proof remains   |
| `SALE-ORD-021` | Orders-owned           | `partial`                  | local clipboard hooks and document-grid paste validation landed; staging clipboard proof on approved fields               |
| `SALE-ORD-022` | Orders-owned           | `partial`                  | local document-grid fill handle enabled on approved fields; staging fill proof still required                             |
| `SALE-ORD-023` | Orders-owned           | `partial`                  | queue, support grids, and document grid now share the adapter; full cross-surface consistency proof still required        |
| `SALE-ORD-024` | Orders-owned           | `partial`                  | document-mode selection summary and blocked-edit surfacing are live-proven; queue/support visibility proof still required |
| `SALE-ORD-025` | Orders-owned           | `partial`                  | document-mode locked/editable field cues are live-proven; cross-surface staging proof still required                      |
| `SALE-ORD-026` | Orders-owned           | `partial`                  | Orders sheet toggle and early queue discoverability landed; cross-surface discoverability proof is still required         |
| `SALE-ORD-027` | Orders-owned           | `implemented-not-surfaced` | explicit workflow-action visibility proof after spreadsheet edits                                                         |
| `SALE-ORD-028` | Orders-owned           | `blocked`                  | explicit sheet-native conversion ownership and proof                                                                      |
| `SALE-ORD-029` | Orders-owned           | `partial`                  | local clear-style actions and structured edit rejection landed; staging proof still required                              |
| `SALE-ORD-030` | Orders-owned           | `partial`                  | local document-grid edit-navigation settings landed; full key-behavior proof still required                               |
| `SALE-ORD-031` | Orders-owned           | `partial`                  | local document-grid targeting safeguards landed; cross-surface sort/filter-safe targeting proof still required            |
| `SALE-ORD-032` | Orders-owned           | `partial`                  | live duplicate-row proof landed on staging; delete-row and add-item row-operation proof still required                    |
| `SALE-ORD-033` | Orders-owned           | `blocked`                  | per-surface discoverability proof                                                                                         |
| `SALE-ORD-034` | Orders-owned           | `blocked`                  | active-row vs focused-cell workflow ambiguity proof                                                                       |
| `SALE-ORD-035` | Orders-owned           | `partial`                  | staging now proves invalid-edit rejection reverts immediately; the rest of the failure-mode bundle still remains          |

## Required Staging Evidence Bundle

- Build ID and commit SHA
- Persona used for each proof row
- Route used for each proof row
- Record ID or seeded context used for each proof row
- Screenshots for:
  - queue mode
  - selected order
  - document mode blank new draft
  - document mode draft edit
  - finalize/confirm state
  - visible range selection and discontiguous selection
  - visible locked/editable field states
  - blocked paste/fill feedback
  - cut / clear / delete-cell behavior
  - row insert / duplicate / delete behavior
  - sort/filter-safe targeting before and after edit
  - active-row vs focused-cell targeting before workflow actions
  - accounting handoff launch
  - shipping handoff launch
- Negative/trust proof bundle covering:
  - mixed editable/locked paste
  - blocked fill
  - invalid multi-cell partial failure
  - undo/redo across autosave boundaries
  - filtered/hidden-row protection from paste/fill
- Explicit note for any remaining adjacent-owned behaviors still outside the pilot

## Completion Verdict

Current verdict: `not yet sufficient`

Reason:

- The Orders pilot now includes the required document-mode implementation in local code.
- The pilot is still missing a full live staging proof wave for the newly moved document-owned rows.
- Until that proof exists, Orders is stronger and more representative, but not yet closure-complete as the first full-parity assessment pilot.
