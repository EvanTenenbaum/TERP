# Pilot Ledgers Parity Proof Plan

Snapshot:

- Date: `2026-03-17`
- Scope: `Operations -> Inventory` and `Sales -> Orders`
- Purpose: turn the pilot ledgers into parity-proof work without letting current UI structure dictate the spreadsheet-native fork

Date note:

- the proof-plan snapshot was refreshed on March 17, 2026 local time
- the linked staging detection artifact timestamps still reflect the March 15, 2026 staging-oracle capture until a new live proof wave is recorded

## Rule

The current TERP app is being used here as a **functionality and flow oracle only**.

It is **not** the component model for the spreadsheet-native fork.

That means each proof below answers only:

- does this user job exist today
- what data or transition does it rely on
- what evidence must survive migration

It does **not** answer:

- should the future sheet look like the current page
- should the future sheet keep the same layout, visual hierarchy, or widget composition

For the current additive implementation, the pilot shape is now split between local implementation truth and staging proof truth:

- `Sales -> Orders` sheet-native mode now covers queue browse, linked tables, selected-order inspection, handoffs, and a document-mode create/edit flow in local code
- `Sales -> Orders` staging proof still only closes the queue, selection, and handoff subset until a new live proof wave is captured for the document mode
- `Operations -> Inventory` sheet-native mode currently covers browse, inspect, status edit, quantity adjust, and explicit page navigation only
- returns, bulk inventory actions, saved-view writes, export, gallery-heavy work, and intake/media remain preserved as adjacent classic or owner-surface behaviors until later phases

## Proof Status Legend

- `live-proven`: validated in the staging app on March 15, 2026 unless otherwise noted
- `code-proven`: verified in current code, not yet cleanly proven in live staging this pass
- `implemented-not-surfaced`: code exists, but the user-facing affordance or visibility proof is still incomplete
- `partial`: some live proof exists, but not enough to close the full parity requirement
- rows with live failures must say so explicitly in the note text even when they remain in `partial`
- `blocked`: cannot be closed until ownership or product decisions are explicit

Anti-drift rule:

- any Orders row that is built but not visibly surfaced must remain open as `implemented-not-surfaced` or `blocked`
- spreadsheet interaction and surfacing rows are now release gates, not optional polish
- the extended Orders release-gate set now runs through `SALE-ORD-035`, including conversion parity, edit navigation, cut/clear/delete-cell, row operations, sort/filter-safe targeting, workflow ambiguity, and failure-mode proof

## Staging Deployment State

Targeted surface detection on March 15, 2026 confirmed that staging now serves the requested Orders and Inventory `surface=sheet-native` routes from the live pilot sheet surfaces.

Checked-in evidence:

- [sheet-native-surface-detection-2026-03-15.json](./sheet-native-surface-detection-2026-03-15.json)
- [ORDERS-FULL-PARITY-PILOT-EVALUATION-PACK-2026-03-17.md](../spreadsheet-native-foundation/ORDERS-FULL-PARITY-PILOT-EVALUATION-PACK-2026-03-17.md)
- [sales-orders-sheet-capability-ledger-summary.md](./sales-orders-sheet-capability-ledger-summary.md)
- [sales-orders-sheet-capability-ledger.csv](./sales-orders-sheet-capability-ledger.csv)

Historical local-only captures:

- prior March 15 proof-wave JSON captures under `output/playwright/staging-oracle/` were local operator artifacts, not required checked-in closeout evidence
- any future tracker writeback must cite the checked-in ledgers and evaluation pack first, then attach local-only captures only as supplemental evidence

This means:

- `sheet-native-direct` rows can now be promoted to direct pilot `live-proven` when the live artifact bundle supports it
- current workbook proof still matters for adjacent classic and owner-surface capabilities
- the current workbook remains a functionality oracle only; it is not the future component model
- all direct pilot proofs in this wave depended on the hidden `spreadsheet-native-pilot` staging flag being enabled during verification

## Sales Orders

| Capability ID  | Current Surface                                                | Criticality | Parity Test Requirement                                                                      | Current Proof Status       | Notes                                                                                                                                                                                                                                                                                      |
| -------------- | -------------------------------------------------------------- | ----------- | -------------------------------------------------------------------------------------------- | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `SALE-ORD-001` | `/sales?tab=orders&surface=sheet-native` queue                 | `P0`        | Browse/filter E2E for drafts and confirmed                                                   | `live-proven`              | March 15, 2026 staging proof confirmed the live sheet-native Orders pilot supports in-place queue browse and filtering.                                                                                                                                                                    |
| `SALE-ORD-002` | `/sales?tab=orders&surface=sheet-native&orderId=:id` inspector | `P0`        | Inspector and deep-link parity regression                                                    | `live-proven`              | March 15, 2026 staging proof confirmed live inspector and deep-link behavior on the sheet-native Orders pilot.                                                                                                                                                                             |
| `SALE-ORD-003` | `/sales?tab=orders&surface=sheet-native&ordersView=document`   | `P0`        | Create-order E2E from the sheet-native Orders document surface                               | `code-proven`              | March 17, 2026 local implementation moved new-draft entry into the sheet-native Orders document mode; live staging proof is still required before this row can close as `live-proven`.                                                                                                     |
| `SALE-ORD-004` | sheet-native draft editor                                      | `P0`        | Draft/quote edit regression including recalculation and undo                                 | `code-proven`              | March 17, 2026 local implementation routes draft editing through the sheet-native Orders document mode with the existing recalculation and undo logic preserved; live staging proof is still pending.                                                                                      |
| `SALE-ORD-005` | sheet-native finalize guardrails                               | `P0`        | Finalize-blocking guardrail regression                                                       | `code-proven`              | March 17, 2026 local implementation keeps credit checks, validation, and finalize guardrails inside the sheet-native Orders document mode; live staging proof is still pending.                                                                                                            |
| `SALE-ORD-006` | sheet-native draft lifecycle                                   | `P0`        | Draft lifecycle regression                                                                   | `code-proven`              | March 17, 2026 local implementation keeps draft edit entry and draft delete on the sheet-native Orders queue, while confirm/finalize stays inside the sheet-native document mode; live staging proof is still pending.                                                                     |
| `SALE-ORD-007` | sheet-native confirmed-order context                           | `P0`        | Sales-side confirmed-order action-context regression                                         | `code-proven`              | March 17, 2026 local implementation returns finalized orders to the sheet-native queue with confirmed-order context preserved; shipping and accounting remain explicit handoffs while live staging proof is still pending.                                                                 |
| `SALE-ORD-008` | generate-invoice action                                        | `P1`        | Generate-invoice regression                                                                  | `partial`                  | March 15, 2026 staging proof confirmed the classic Orders surface still exposes the Generate Invoice entry point, but invoice creation execution still needs a separate Accounting-owned proof.                                                                                            |
| `SALE-ORD-009` | accounting handoff                                             | `P1`        | Route-handoff regression                                                                     | `live-proven`              | March 15, 2026 staging proof confirmed the live sheet-native Orders pilot hands the selected order into Accounting payment context with `orderId` preserved.                                                                                                                               |
| `SALE-ORD-010` | returns and restock actions                                    | `P1`        | Return-path regression                                                                       | `partial`                  | March 15, 2026 staging proof confirmed the Returns owner surface is still live with a `Process Return` entry point; return execution remains a follow-on proof.                                                                                                                            |
| `SALE-ORD-011` | shipping handoff                                               | `P1`        | Shipping-handoff regression                                                                  | `live-proven`              | March 15, 2026 staging proof confirmed the live sheet-native Orders pilot hands the selected order into the consolidated shipping workspace at `/inventory?tab=shipping` with `orderId` preserved.                                                                                         |
| `SALE-ORD-012` | conversion ownership                                           | `P1`        | Conversion regression under Sales-owned workbook contract                                    | `partial`                  | March 15, 2026 staging proof confirmed the adjacent Quotes workbook still exposes the Convert to Sales Order dialog, but executing the conversion mutation still needs a targeted pass.                                                                                                    |
| `SALE-ORD-013` | recurring orders                                               | `P1`        | Ownership sign-off plus targeted regression once assigned                                    | `blocked`                  | API exists, but there is no verified current workbook UI owner.                                                                                                                                                                                                                            |
| `SALE-ORD-014` | output and audit expectations                                  | `P1`        | Accounting-owned output execution proof plus audit-access regression                         | `blocked`                  | `Download Invoice` is currently inert in live staging and cannot be counted as preserved; Accounting output execution still needs a concrete proof surface.                                                                                                                                |
| `SALE-ORD-015` | sheet-native draft delete action                               | `P1`        | Draft delete regression                                                                      | `code-proven`              | March 17, 2026 local implementation adds draft deletion directly to the sheet-native Orders queue; live staging proof is still required before this row can close.                                                                                                                         |
| `SALE-ORD-016` | sheet-native seeded entry modes                                | `P1`        | Seeded-entry regression across duplicate, need, and sales-sheet handoff                      | `code-proven`              | March 17, 2026 local implementation preserves quote, client, need, and sales-sheet seeded entry in the sheet-native Orders document mode; live staging proof is still pending.                                                                                                             |
| `SALE-ORD-017` | sheet-native autosave and nav protection                       | `P0`        | Autosave and unsaved-changes regression                                                      | `code-proven`              | March 17, 2026 local implementation keeps autosave, save-state, keyboard save/finalize, and unsaved-navigation protection inside the sheet-native Orders document mode; live staging proof is still pending.                                                                               |
| `SALE-ORD-018` | sheet-native customer context drawer                           | `P1`        | Customer-context and referral regression                                                     | `code-proven`              | March 17, 2026 local implementation keeps client-seeded customer, referral, credit, and pricing context inside the sheet-native Orders document mode; live staging proof is still pending.                                                                                                 |
| `SALE-ORD-019` | sheet-native selection grammar                                 | `P0`        | Drag-range, Shift-range, Cmd discontiguous, and scope-selection proof                        | `partial`                  | March 17, 2026 runtime work landed the first shared PowersheetGrid selection slice for queue and support grids, including focused-row sync and range-summary plumbing. Full parity proof is still required.                                                                                |
| `SALE-ORD-020` | sheet-native multi-cell editing                                | `P0`        | Multi-cell edit proof with pricing, validation, autosave, and undo                           | `partial`                  | March 17, 2026 local implementation moved approved line-item editing onto the shared document-grid runtime without replacing Orders orchestration. Live staging proof is still required before this row can close.                                                                         |
| `SALE-ORD-021` | sheet-native clipboard parity                                  | `P0`        | Copy and rectangular paste proof on approved fields                                          | `partial`                  | March 17, 2026 local implementation wired clipboard hooks through the shared grid adapter and added document-grid paste validation plus blocked-field messaging. Staging proof is still required across queue, support, and document surfaces.                                             |
| `SALE-ORD-022` | sheet-native fill parity                                       | `P1`        | Fill-handle or equivalent safe fill proof                                                    | `partial`                  | March 17, 2026 local implementation enabled fill-handle behavior on the shared Orders document grid for approved fields. Safe live proof is still required.                                                                                                                                |
| `SALE-ORD-023` | queue/document/support-grid interaction consistency            | `P0`        | One-grammar consistency proof across all required Orders surfaces                            | `partial`                  | March 17, 2026 runtime work moved queue, support grids, and the document grid onto the shared adapter, but full cross-surface staging proof is still required before this row can close.                                                                                                   |
| `SALE-ORD-024` | spreadsheet affordance visibility                              | `P0`        | Visible focus, range, selection summary, save state, and blocked feedback proof              | `partial`                  | March 17, 2026 runtime work surfaced selection summary, release gates, anti-drift context, and status-bar visibility. Full focus/range/save/blocked feedback proof is still pending.                                                                                                       |
| `SALE-ORD-025` | field-state visibility                                         | `P0`        | Visible locked, editable, and workflow-owned field-state proof                               | `partial`                  | March 17, 2026 local implementation added document-grid editable versus locked field-state classes and guidance. Cross-surface staging proof is still required before this gate can close.                                                                                                 |
| `SALE-ORD-026` | spreadsheet discoverability                                    | `P1`        | Keyboard-hint and reachability proof across queue, support grids, and document               | `partial`                  | March 17, 2026 runtime work surfaced the Orders sheet/classic toggle and early queue discoverability, but cross-surface discoverability proof is still required.                                                                                                                           |
| `SALE-ORD-027` | explicit workflow actions after spreadsheet interaction        | `P1`        | Finalize and handoff visibility proof after spreadsheet edits                                | `implemented-not-surfaced` | New March 17, 2026 anti-drift release gate. Queue and document actions already exist, but they are not yet explicitly proven as visibly separate from spreadsheet editing.                                                                                                                 |
| `SALE-ORD-028` | sheet-native conversion parity                                 | `P1`        | Explicit quote-to-order ownership and proof inside sheet-native Orders                       | `blocked`                  | New March 17, 2026 rollout gate. This row remains blocked until quote-to-order conversion is explicitly owned inside the Orders rollout contract and proven on the sheet-native flow or reclassified with evidence.                                                                        |
| `SALE-ORD-029` | cut / clear / delete-cell parity                               | `P1`        | Cut, clear, and delete-cell proof on approved editable fields                                | `partial`                  | March 17, 2026 local implementation added clear-style document-grid actions plus structured edit rejection for locked or invalid edits. Live proof is still required.                                                                                                                      |
| `SALE-ORD-030` | edit-navigation parity                                         | `P0`        | Tab, Shift+Tab, Enter, Shift+Enter, and Escape proof                                         | `partial`                  | March 17, 2026 local implementation added document-grid edit-navigation settings, but complete live key-behavior proof is still pending.                                                                                                                                                   |
| `SALE-ORD-031` | sort/filter-safe targeting                                     | `P0`        | Selection, paste, and fill targeting remain safe after sort/filter                           | `partial`                  | March 17, 2026 local implementation hardened the document grid against silent retargeting by disabling sort/filter controls there and validating full paste rectangles before accepting data. Cross-surface staging proof is still required.                                               |
| `SALE-ORD-032` | row insert / duplicate / delete parity                         | `P1`        | Document-grid row operation proof                                                            | `partial`                  | March 17, 2026 local implementation added duplicate/delete row actions plus sheet-native add-item insertion through the inventory browser. Live document-grid proof is still required.                                                                                                     |
| `SALE-ORD-033` | per-surface discoverability                                    | `P1`        | Queue/support/document discoverability matrix proof                                          | `blocked`                  | New March 17, 2026 anti-drift gate. Spreadsheet behavior must be independently discoverable on every required Orders surface, not just globally present in code.                                                                                                                           |
| `SALE-ORD-034` | workflow ambiguity resolution                                  | `P0`        | Active-row vs focused-cell vs selected-range proof before workflow actions                   | `blocked`                  | New March 17, 2026 trust gate. Finalize and handoff behavior must stay visibly unambiguous relative to spreadsheet selection state.                                                                                                                                                        |
| `SALE-ORD-035` | failure-mode spreadsheet proof bundle                          | `P0`        | Negative/trust proof for blocked fill, mixed paste, autosave undo, and hidden-row protection | `partial`                  | March 17, 2026 local implementation added document-grid blocked-paste validation and structured invalid-edit rejection messaging through the shared runtime. Full staging proof is still required for mixed editable/locked paste, blocked fill, autosave undo, and hidden-row protection. |

## Inventory

| Capability ID | Current Surface                                                        | Criticality | Parity Test Requirement                                             | Current Proof Status | Notes                                                                                                                                                                                                                                   |
| ------------- | ---------------------------------------------------------------------- | ----------- | ------------------------------------------------------------------- | -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `OPS-INV-001` | `/operations?tab=inventory&surface=sheet-native` browse                | `P0`        | Targeted browse and filter E2E plus role proof                      | `live-proven`        | March 15, 2026 staging proof confirmed the live sheet-native Inventory pilot supports browse and in-grid filtering.                                                                                                                     |
| `OPS-INV-002` | `/operations?tab=inventory&surface=sheet-native&batchId=:id` inspector | `P0`        | E2E row selection plus deep-link parity                             | `live-proven`        | March 15, 2026 staging proof confirmed live inspector and `batchId` deep-link behavior on the sheet-native Inventory pilot.                                                                                                             |
| `OPS-INV-003` | Add Inventory modal                                                    | `P0`        | Golden flow style intake proof from inventory surface               | `partial`            | March 15, 2026 staging proof only confirmed the classic inventory surface still exposes the `Open Receiving Queue` intake handoff; the actual Add Inventory modal flow in this row remains unproven.                                    |
| `OPS-INV-004` | status edit                                                            | `P0`        | State transition E2E plus undo and audit proof                      | `partial`            | March 15, 2026 staging proof confirmed live status mutation on the sheet-native Inventory pilot and reverted the test change after capture; undo, audit, and conflict parity still need proof.                                          |
| `OPS-INV-005` | adjust quantity                                                        | `P0`        | Golden flow inventory adjustment plus race-condition regression     | `partial`            | March 15, 2026 staging proof confirmed live quantity adjustment on the sheet-native Inventory pilot and reverted the test change after capture; undo, audit, and race-condition coverage remain open.                                   |
| `OPS-INV-006` | bulk actions                                                           | `P1`        | Bulk action regression pass                                         | `partial`            | `[live-failing]` March 15, 2026 staging proof confirmed live delete-eligibility gating and the confirmation flow, but the actual `inventory.bulk.delete` mutation currently fails with a staging 500, so this row is not preserved yet. |
| `OPS-INV-007` | movement history                                                       | `P1`        | History and reversal regression                                     | `code-proven`        | Review-side functionality exists; keep it in a sheet-native pattern or bounded sidecar.                                                                                                                                                 |
| `OPS-INV-008` | valuation context                                                      | `P1`        | Linked-surface regression under Accounting-owned valuation contract | `blocked`            | Ownership is resolved; this remains intentionally outside first inventory-sheet ownership.                                                                                                                                              |
| `OPS-INV-009` | transfer handoff                                                       | `P1`        | Cross-surface transfer regression                                   | `blocked`            | Ownership is resolved to Locations / Storage; first inventory sheet preserves handoff only.                                                                                                                                             |
| `OPS-INV-010` | locations admin                                                        | `P1`        | Route preservation and linked-owner proof                           | `blocked`            | Ownership is resolved to Locations / Storage and remains outside first inventory-sheet ownership.                                                                                                                                       |
| `OPS-INV-011` | views, gallery, export                                                 | `P2`        | Toolbar regression including saved views, gallery, and export       | `partial`            | Gallery and export are live-proven; save-view creation is not yet fully proven in staging.                                                                                                                                              |
| `OPS-INV-012` | intake media support                                                   | `P2`        | Add-inventory media smoke test                                      | `code-proven`        | Keep lightweight media support; do not let this expand into photography-review ownership.                                                                                                                                               |

## Current Ownership Blocking Set

- `none` — ownership blockers were resolved on March 14, 2026 in [OWNERSHIP-SEAMS-MEMO.md](../spreadsheet-native-foundation/OWNERSHIP-SEAMS-MEMO.md)

## Non-Blocking But Still Open

- `INV-D006`
- `ORD-D010`
- recurring-order UI ownership remains unverified even though the contradiction in the source docs is resolved

## Evidence Already Captured

- live sheet-native Orders pilot queue browse, inspector, accounting handoff, and shipping handoff
- live sheet-native Inventory pilot browse, inspector, and reversible mutation evidence for status edit and quantity adjustment
- live inventory workbook load, gallery toggle, and CSV export
- local code-proven create-order draft save and draft reopen
- local code-proven active-draft autosave
- local code-proven customer credit and pricing drawer entry
- live `Make Payment` handoff into Accounting
- live Quotes-tab `Convert to Sales Order` entry point on `/sales?tab=quotes`
- local code-proven quoteId-seeded create-order route
- local code-proven clientId-seeded customer/referral/credit/pricing context route
- live draft edit, recalculation, lifecycle controls, and draft delete on the classic Orders workbook
- live Returns owner-surface entry point on `/sales?tab=returns`
- live proof that `Download Invoice` is visually present but functionally inert on the current orders surface
- live proof that staging now serves the requested Orders and Inventory `surface=sheet-native` routes from the pilot surfaces
- live inventory-to-receiving handoff from the classic Inventory workbook
- live proof that inventory bulk delete currently fails with a staging `inventory.bulk.delete` 500 after the confirmation flow

## Next Execution Order

1. Lock the AG Grid Enterprise runtime decision and shared PowersheetGrid adapter path before any rollout-closeout claims.
2. Complete the shared runtime tranche so selection, clipboard, edit policy, row operations, and navigation are truly shared rather than per-surface.
3. Re-run `SALE-ORD-003` through `SALE-ORD-018` on staging so the current sheet-native document implementation stops living only in `code-proven`.
4. Treat existing queue and support-grid evidence as pre-gate pilot evidence until the document-first gate closes and the shared runtime is in place.
5. Only after queue and support-grid rollout closes may `SALE-ORD-024` through `SALE-ORD-027` and `SALE-ORD-033` through `SALE-ORD-035` be promoted with explicit screenshot-based visibility and trust proof.
6. Then return to remaining non-Orders pilot gaps, starting with `OPS-INV-006`, without over-claiming Orders rollout completion.
