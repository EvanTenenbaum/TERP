# Pilot Ledgers Parity Proof Plan

Snapshot:

- Date: `2026-03-15`
- Scope: `Operations -> Inventory` and `Sales -> Orders`
- Purpose: turn the pilot ledgers into parity-proof work without letting current UI structure dictate the spreadsheet-native fork

Date note:

- the proof-plan snapshot was refreshed on March 15, 2026 local time
- the linked staging detection artifact timestamps appear as March 15, 2026 UTC because the JSON stores ISO timestamps

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

For the current additive implementation, the step-5 sheet-native pilot is intentionally narrower than the full workbook:

- `Sales -> Orders` sheet-native mode currently covers queue browse, linked tables, selected-order inspection, and handoffs only
- `Operations -> Inventory` sheet-native mode currently covers browse, inspect, status edit, quantity adjust, and explicit page navigation only
- create-order composition, returns, bulk inventory actions, saved-view writes, export, gallery-heavy work, and intake/media remain preserved as adjacent classic or owner-surface behaviors until later phases

## Proof Status Legend

- `live-proven`: validated in the staging app on March 15, 2026 unless otherwise noted
- `code-proven`: verified in current code, not yet cleanly proven in live staging this pass
- `partial`: some live proof exists, but not enough to close the full parity requirement
- rows with live failures must say so explicitly in the note text even when they remain in `partial`
- `blocked`: cannot be closed until ownership or product decisions are explicit

## Staging Deployment State

Targeted surface detection on March 15, 2026 confirmed that staging now serves the requested Orders and Inventory `surface=sheet-native` routes from the live pilot sheet surfaces.

Artifacts:

- [sheet-native-surface-detection-2026-03-15.json](../../../output/playwright/staging-oracle/sheet-native-surface-detection-2026-03-15.json)
- [pilot-direct-proof-wave-2026-03-15.json](../../../output/playwright/staging-oracle/pilot-direct-proof-wave-2026-03-15.json)
- [sales-adjacent-proof-wave-2026-03-15.json](../../../output/playwright/staging-oracle/sales-adjacent-proof-wave-2026-03-15.json)
- [sales-lifecycle-proof-wave-2026-03-15.json](../../../output/playwright/staging-oracle/sales-lifecycle-proof-wave-2026-03-15.json)
- [inventory-adjacent-proof-wave-2026-03-15.json](../../../output/playwright/staging-oracle/inventory-adjacent-proof-wave-2026-03-15.json)

This means:

- `sheet-native-direct` rows can now be promoted to direct pilot `live-proven` when the live artifact bundle supports it
- current workbook proof still matters for adjacent classic and owner-surface capabilities
- the current workbook remains a functionality oracle only; it is not the future component model
- all direct pilot proofs in this wave depended on the hidden `spreadsheet-native-pilot` staging flag being enabled during verification

## Sales Orders

| Capability ID  | Current Surface                                                | Criticality | Parity Test Requirement                                                 | Current Proof Status | Notes                                                                                                                                                                                                                                                                                                    |
| -------------- | -------------------------------------------------------------- | ----------- | ----------------------------------------------------------------------- | -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `SALE-ORD-001` | `/sales?tab=orders&surface=sheet-native` queue                 | `P0`        | Browse/filter E2E for drafts and confirmed                              | `live-proven`        | March 15, 2026 staging proof confirmed the live sheet-native Orders pilot supports in-place queue browse and filtering.                                                                                                                                                                                  |
| `SALE-ORD-002` | `/sales?tab=orders&surface=sheet-native&orderId=:id` inspector | `P0`        | Inspector and deep-link parity regression                               | `live-proven`        | March 15, 2026 staging proof confirmed live inspector and deep-link behavior on the sheet-native Orders pilot.                                                                                                                                                                                           |
| `SALE-ORD-003` | `/sales?tab=create-order` composer                             | `P0`        | Create-order E2E from workbook tab                                      | `live-proven`        | Real draft save and route reopen were proven in staging.                                                                                                                                                                                                                                                 |
| `SALE-ORD-004` | active draft editor                                            | `P0`        | Draft/quote edit regression including recalculation and undo            | `partial`            | March 15, 2026 staging proof confirmed live draft editing, recalculation, and save-state recovery; quote-specific and undo coverage still need proof.                                                                                                                                                    |
| `SALE-ORD-005` | create-order finalize guardrails                               | `P0`        | Finalize-blocking guardrail regression                                  | `partial`            | March 15, 2026 staging proof confirmed a blank composer keeps finalization unavailable until prerequisites exist; deeper credit and edge-case guardrails still need targeted proof.                                                                                                                      |
| `SALE-ORD-006` | orders draft lifecycle                                         | `P0`        | Draft lifecycle regression                                              | `partial`            | March 15, 2026 staging proof confirmed the classic Orders queue still exposes Edit Draft, Confirm Order, and Delete Draft for live drafts; confirm execution still needs a targeted mutation pass.                                                                                                       |
| `SALE-ORD-007` | confirmed-order actions                                        | `P0`        | Sales-side confirmed-order action-context regression                    | `partial`            | March 15, 2026 staging proof confirmed confirmed-order context still loads in the classic Orders inspector, but no explicit downstream actions were visible on the tested record; this row now tracks the Sales-side confirm context only while shipping handoff is already closed under `SALE-ORD-011`. |
| `SALE-ORD-008` | generate-invoice action                                        | `P1`        | Generate-invoice regression                                             | `partial`            | March 15, 2026 staging proof confirmed the classic Orders surface still exposes the Generate Invoice entry point, but invoice creation execution still needs a separate Accounting-owned proof.                                                                                                          |
| `SALE-ORD-009` | accounting handoff                                             | `P1`        | Route-handoff regression                                                | `live-proven`        | March 15, 2026 staging proof confirmed the live sheet-native Orders pilot hands the selected order into Accounting payment context with `orderId` preserved.                                                                                                                                             |
| `SALE-ORD-010` | returns and restock actions                                    | `P1`        | Return-path regression                                                  | `partial`            | March 15, 2026 staging proof confirmed the Returns owner surface is still live with a `Process Return` entry point; return execution remains a follow-on proof.                                                                                                                                          |
| `SALE-ORD-011` | shipping handoff                                               | `P1`        | Shipping-handoff regression                                             | `live-proven`        | March 15, 2026 staging proof confirmed the live sheet-native Orders pilot hands the selected order into the consolidated shipping workspace at `/inventory?tab=shipping` with `orderId` preserved.                                                                                                       |
| `SALE-ORD-012` | conversion ownership                                           | `P1`        | Conversion regression under Sales-owned workbook contract               | `partial`            | March 15, 2026 staging proof confirmed the adjacent Quotes workbook still exposes the Convert to Sales Order dialog, but executing the conversion mutation still needs a targeted pass.                                                                                                                  |
| `SALE-ORD-013` | recurring orders                                               | `P1`        | Ownership sign-off plus targeted regression once assigned               | `blocked`            | API exists, but there is no verified current workbook UI owner.                                                                                                                                                                                                                                          |
| `SALE-ORD-014` | output and audit expectations                                  | `P1`        | Accounting-owned output execution proof plus audit-access regression    | `blocked`            | `Download Invoice` is currently inert in live staging and cannot be counted as preserved; Accounting output execution still needs a concrete proof surface.                                                                                                                                              |
| `SALE-ORD-015` | draft delete action                                            | `P1`        | Draft delete regression                                                 | `live-proven`        | March 15, 2026 staging proof confirmed a live draft delete from the classic Orders queue and verified that the temporary draft disappeared from the filtered draft list.                                                                                                                                 |
| `SALE-ORD-016` | seeded entry modes                                             | `P1`        | Seeded-entry regression across duplicate, need, and sales-sheet handoff | `partial`            | March 15, 2026 staging proof confirmed quoteId-seeded entry into the current create-order surface; other seed modes still need separate proof.                                                                                                                                                           |
| `SALE-ORD-017` | autosave and nav protection                                    | `P0`        | Autosave and unsaved-changes regression                                 | `partial`            | March 15, 2026 staging proof confirmed the autosave path on an active draft; the unsaved-navigation prompt still needs a separate targeted pass.                                                                                                                                                         |
| `SALE-ORD-018` | customer context drawer                                        | `P1`        | Customer-context and referral regression                                | `live-proven`        | March 15, 2026 staging proof confirmed the clientId-seeded create-order route shows customer, referral, credit, and pricing context in the live composer.                                                                                                                                                |

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
- live create-order draft save and draft reopen
- live active-draft autosave
- live customer credit and pricing drawer entry
- live `Make Payment` handoff into Accounting
- live Quotes-tab `Convert to Sales Order` entry point on `/sales?tab=quotes`
- live quoteId-seeded create-order route
- live clientId-seeded customer/referral/credit/pricing context route
- live draft edit, recalculation, lifecycle controls, and draft delete on the classic Orders workbook
- live Returns owner-surface entry point on `/sales?tab=returns`
- live proof that `Download Invoice` is visually present but functionally inert on the current orders surface
- live proof that staging now serves the requested Orders and Inventory `surface=sheet-native` routes from the pilot surfaces
- live inventory-to-receiving handoff from the classic Inventory workbook
- live proof that inventory bulk delete currently fails with a staging `inventory.bulk.delete` 500 after the confirmation flow

## Next Execution Order

1. Fix `OPS-INV-006` first because it is now a live failing preserved behavior, not just a proof gap.
2. Re-scope and re-run `SALE-ORD-007` so we can separate Sales-side confirm behavior from the already-closed shipping handoff.
3. Resolve the `OPS-INV-003` contract mismatch by either proving the actual Add Inventory modal or renaming/splitting the row to match the receiving handoff that was really tested.
4. Then continue the remaining mutation-heavy `partial` and `code-proven` P0/P1 rows without over-claiming parity closure.
