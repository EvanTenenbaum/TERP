# Pilot Ledgers Parity Proof Plan

Snapshot:

- Date: `2026-03-14`
- Scope: `Operations -> Inventory` and `Sales -> Orders`
- Purpose: turn the pilot ledgers into parity-proof work without letting current UI structure dictate the spreadsheet-native fork

Date note:

- the proof-plan snapshot was refreshed on March 14, 2026 local time
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

- `live-proven`: validated in the staging app on March 13, 2026
- `code-proven`: verified in current code, not yet cleanly proven in live staging this pass
- `partial`: some live proof exists, but not enough to close the full parity requirement
- `blocked`: cannot be closed until ownership or product decisions are explicit

## Staging Deployment Gate

Targeted surface detection on March 14, 2026 showed that staging still resolves the requested Orders and Inventory `surface=sheet-native` routes to the classic workbook surfaces rather than the pilot sheet surfaces.

Artifacts:

- [sheet-native-surface-detection-2026-03-14.json](../../../output/playwright/staging-oracle/sheet-native-surface-detection-2026-03-14.json)
- [sales-orders-sheet-pilot-2026-03-14.png](../../../output/playwright/staging-oracle/sales-orders-sheet-pilot-2026-03-14.png)
- [inventory-sheet-pilot-2026-03-14.png](../../../output/playwright/staging-oracle/inventory-sheet-pilot-2026-03-14.png)

This means:

- `sheet-native-direct` rows can still use staging to validate the underlying business behavior
- those rows cannot be promoted to direct pilot `live-proven` status from staging artifacts alone until the pilot surface is actually deployed
- current workbook proof remains valid only as a functionality oracle, not as proof that the pilot UI is live

## Sales Orders

| Capability ID  | Current Surface                                                | Criticality | Parity Test Requirement                                                 | Current Proof Status | Notes                                                                                                                                                                                                                  |
| -------------- | -------------------------------------------------------------- | ----------- | ----------------------------------------------------------------------- | -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `SALE-ORD-001` | `/sales?tab=orders&surface=sheet-native` queue                 | `P0`        | Browse/filter E2E for drafts and confirmed                              | `partial`            | The base Orders sheet request still resolves to the classic workbook surface in staging, so direct pilot live proof is deployment-gated while queue behavior can still be checked against the current workbook oracle. |
| `SALE-ORD-002` | `/sales?tab=orders&surface=sheet-native&orderId=:id` inspector | `P0`        | Inspector and deep-link parity regression                               | `partial`            | The base Orders sheet request still resolves to the classic workbook surface in staging, so direct pilot live proof for inspector and deep-link behavior remains deployment-gated.                                     |
| `SALE-ORD-003` | `/sales?tab=create-order` composer                             | `P0`        | Create-order E2E from workbook tab                                      | `live-proven`        | Real draft save and route reopen were proven in staging.                                                                                                                                                               |
| `SALE-ORD-004` | active draft editor                                            | `P0`        | Draft/quote edit regression including recalculation and undo            | `partial`            | Active-draft editing and autosave are proven; quote-specific and undo coverage still need proof.                                                                                                                       |
| `SALE-ORD-005` | create-order finalize guardrails                               | `P0`        | Finalize-blocking guardrail regression                                  | `partial`            | Credit-check code path is verified; full live finalize-block proof still needs targeted coverage.                                                                                                                      |
| `SALE-ORD-006` | orders draft lifecycle                                         | `P0`        | Draft lifecycle regression                                              | `code-proven`        | Queue-side confirm/delete logic is in current workbook code; no clean live proof yet.                                                                                                                                  |
| `SALE-ORD-007` | confirmed-order actions                                        | `P0`        | Confirm/ship regression                                                 | `partial`            | Surface is proven live, but state-transition execution still needs explicit proof.                                                                                                                                     |
| `SALE-ORD-008` | generate-invoice action                                        | `P1`        | Generate-invoice regression                                             | `partial`            | Action is visible on the current Sales orders surface; resulting-invoice proof is still needed and should not be substituted with the payment handoff.                                                                 |
| `SALE-ORD-009` | accounting handoff                                             | `P1`        | Route-handoff regression                                                | `partial`            | Accounting remains the owner, but the base Orders sheet request still resolves to the classic workbook surface in staging, so direct pilot handoff proof remains deployment-gated.                                     |
| `SALE-ORD-010` | returns and restock actions                                    | `P1`        | Return-path regression                                                  | `code-proven`        | Current staged returns actions are code-grounded; live workbook proof still needed.                                                                                                                                    |
| `SALE-ORD-011` | shipping handoff                                               | `P1`        | Shipping-handoff regression                                             | `partial`            | Operations remains the shipping owner, but the base Orders sheet request still resolves to the classic workbook surface in staging, so direct pilot handoff proof remains deployment-gated.                            |
| `SALE-ORD-012` | conversion ownership                                           | `P1`        | Conversion regression under Sales-owned workbook contract               | `partial`            | Ownership is resolved in the March 14, 2026 ownership seams memo, and the Quotes tab is now verified as a live Sales-owned conversion entry point; execution proof still needs a targeted pass.                        |
| `SALE-ORD-013` | recurring orders                                               | `P1`        | Ownership sign-off plus targeted regression once assigned               | `blocked`            | API exists, but there is no verified current workbook UI owner.                                                                                                                                                        |
| `SALE-ORD-014` | output and audit expectations                                  | `P1`        | Accounting-owned output execution proof plus audit-access regression    | `blocked`            | `Download Invoice` is currently inert in live staging and cannot be counted as preserved; Accounting output execution still needs a concrete proof surface.                                                            |
| `SALE-ORD-015` | draft delete action                                            | `P1`        | Draft delete regression                                                 | `code-proven`        | Queue-side delete is present in current workbook logic; live proof still needed.                                                                                                                                       |
| `SALE-ORD-016` | seeded entry modes                                             | `P1`        | Seeded-entry regression across duplicate, need, and sales-sheet handoff | `partial`            | Live draft-route reopen is proven; other seed modes still need explicit proof.                                                                                                                                         |
| `SALE-ORD-017` | autosave and nav protection                                    | `P0`        | Autosave and unsaved-changes regression                                 | `partial`            | Autosave is live-proven; unsaved-navigation prompt is still only code-proven in this pass.                                                                                                                             |
| `SALE-ORD-018` | customer context drawer                                        | `P1`        | Customer-context and referral regression                                | `partial`            | Credit and pricing drawer entry are live-proven; referral coverage still needs proof.                                                                                                                                  |

## Inventory

| Capability ID | Current Surface                                                        | Criticality | Parity Test Requirement                                             | Current Proof Status | Notes                                                                                                                                                                                                                                 |
| ------------- | ---------------------------------------------------------------------- | ----------- | ------------------------------------------------------------------- | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `OPS-INV-001` | `/operations?tab=inventory&surface=sheet-native` browse                | `P0`        | Targeted browse and filter E2E plus role proof                      | `partial`            | The base Inventory sheet request still resolves to the classic workbook surface in staging, so direct pilot live proof is deployment-gated while browse and filter behavior can still be checked against the current workbook oracle. |
| `OPS-INV-002` | `/operations?tab=inventory&surface=sheet-native&batchId=:id` inspector | `P0`        | E2E row selection plus deep-link parity                             | `partial`            | The base Inventory sheet request still resolves to the classic workbook surface in staging, so direct pilot live proof for inspector and deep-link behavior remains deployment-gated.                                                 |
| `OPS-INV-003` | Add Inventory modal                                                    | `P0`        | Golden flow style intake proof from inventory surface               | `code-proven`        | Current workbook and modal dependencies are mapped; live intake proof still needed.                                                                                                                                                   |
| `OPS-INV-004` | status edit                                                            | `P0`        | State transition E2E plus undo and audit proof                      | `partial`            | Status edit remains an intended direct pilot mutation, but the base Inventory sheet request still resolves to the classic workbook surface in staging, so direct pilot live proof remains deployment-gated.                           |
| `OPS-INV-005` | adjust quantity                                                        | `P0`        | Golden flow inventory adjustment plus race-condition regression     | `partial`            | Quantity adjustment remains an intended direct pilot mutation, but the base Inventory sheet request still resolves to the classic workbook surface in staging, so direct pilot live proof remains deployment-gated.                   |
| `OPS-INV-006` | bulk actions                                                           | `P1`        | Bulk action regression pass                                         | `code-proven`        | Eligibility, restore, and partial-failure behavior are mapped but not live-proven.                                                                                                                                                    |
| `OPS-INV-007` | movement history                                                       | `P1`        | History and reversal regression                                     | `code-proven`        | Review-side functionality exists; keep it in a sheet-native pattern or bounded sidecar.                                                                                                                                               |
| `OPS-INV-008` | valuation context                                                      | `P1`        | Linked-surface regression under Accounting-owned valuation contract | `blocked`            | Ownership is resolved; this remains intentionally outside first inventory-sheet ownership.                                                                                                                                            |
| `OPS-INV-009` | transfer handoff                                                       | `P1`        | Cross-surface transfer regression                                   | `blocked`            | Ownership is resolved to Locations / Storage; first inventory sheet preserves handoff only.                                                                                                                                           |
| `OPS-INV-010` | locations admin                                                        | `P1`        | Route preservation and linked-owner proof                           | `blocked`            | Ownership is resolved to Locations / Storage and remains outside first inventory-sheet ownership.                                                                                                                                     |
| `OPS-INV-011` | views, gallery, export                                                 | `P2`        | Toolbar regression including saved views, gallery, and export       | `partial`            | Gallery and export are live-proven; save-view creation is not yet fully proven in staging.                                                                                                                                            |
| `OPS-INV-012` | intake media support                                                   | `P2`        | Add-inventory media smoke test                                      | `code-proven`        | Keep lightweight media support; do not let this expand into photography-review ownership.                                                                                                                                             |

## Current Ownership Blocking Set

- `none` — ownership blockers were resolved on March 14, 2026 in [OWNERSHIP-SEAMS-MEMO.md](../spreadsheet-native-foundation/OWNERSHIP-SEAMS-MEMO.md)

## Non-Blocking But Still Open

- `INV-D006`
- `ORD-D010`
- recurring-order UI ownership remains unverified even though the contradiction in the source docs is resolved

## Evidence Already Captured

- live inventory workbook load, gallery toggle, and CSV export
- live orders queue and selected-order inspector
- live create-order draft save and draft reopen
- live active-draft autosave
- live customer credit and pricing drawer entry
- live `Make Payment` handoff into Accounting
- live Quotes-tab `Convert to Sales Order` entry point on `/sales?tab=quotes`
- live proof that `Download Invoice` is visually present but functionally inert on the current orders surface
- live proof that staging still resolves requested Orders and Inventory `surface=sheet-native` routes to the classic workbook surfaces

## Next Execution Order

1. Separate `sheet-native-direct` proof from current workbook oracle proof and keep direct rows `partial` until the pilot surface is deployed to staging.
2. Convert the remaining `partial` and `code-proven` classic-adjacent, adjacent-owned, and oracle-backed P0/P1 rows into targeted live proof.
3. Keep linked-owner capabilities explicit where the pilot sheet does not absorb execution ownership.
4. Only after that, start the actual pilot blueprints.
