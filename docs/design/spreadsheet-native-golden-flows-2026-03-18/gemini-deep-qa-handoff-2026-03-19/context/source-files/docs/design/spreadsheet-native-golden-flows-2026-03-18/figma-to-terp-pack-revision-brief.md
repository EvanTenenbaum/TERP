# Figma To TERP Pack Revision Brief

Date: `2026-03-19`

## Purpose

This brief is the next execution step after the pack-wide reality audit.

Its job is to turn the audit into an actionable revision pass for the spreadsheet-native artboard pack without reopening product truth questions that are already settled.

## Revision Objective

The next pack revision should do three things at once:

1. close the four highest-risk artboards where hidden loss is most likely
2. normalize terminology and ownership seams across the full pack
3. make the currently missing TERP system areas visible either through explicit artboard changes or explicit non-goal notes

## Revision Order

### Wave 1. Highest-Risk Artboards

Revise these first because they carry seeded-entry, draft, or trust-critical commit risk:

1. `sales-order-sheet.svg`
2. `orders-document.svg`
3. `sales-sheet.svg`
4. `payments-sheet.svg`
5. `receiving-sheet.svg`

### Wave 2. Under-Modeled Lifecycle Sheets

Revise after Wave 1 locks the grammar:

1. `returns-sheet.svg`
2. `samples-sheet.svg`
3. `shipping-sheet.svg`
4. `inventory-sheet.svg`
5. `purchase-orders-sheet.svg`

### Wave 3. Consistency Cleanup

Use this wave to align the remaining pack-wide grammar:

1. `invoices-sheet.svg`
2. `client-ledger-sheet.svg`
3. `shared-primitives.svg`
4. `README.md` and pack notes

## Exact Revision Changes By Artboard

### `sales-order-sheet.svg` and `orders-document.svg`

These are one real owner surface and should be revised together.

Required changes:

- rewrite all product copy from `Sale` to `Sales Order`
- keep the inventory-left / sales-order-right composition
- make the lower support regions real and named: `Referral`, `Credit`, and `Whole Order Changes`
- add visible trust cues for seeded entry, draft save, and finalize boundaries
- make quote mode explicit in the document surface rather than leaving it implied

Must preserve:

- `fromSalesSheet=true`
- `sessionStorage["salesSheetToQuote"]`
- `orders.createDraftEnhanced`
- `orders.updateDraftEnhanced`
- `orders.finalizeDraft`
- quote-versus-sales-order branching

Reject in revision:

- any simplification that removes draft restore, quote mode, or seeded imports

### `sales-sheet.svg`

Required changes:

- add a visible dirty-state / save-complete strip
- surface saved views and history as real support regions instead of hidden capabilities
- keep share and convert actions gated by save state
- add explicit output grammar for share, export, and print behavior
- add a visible bridge to Live Shopping so `convertToLiveSession` is not invisible

Must preserve:

- `getInventory`
- `getHistory`
- `saveDraft`
- `getDraftById`
- `generateShareLink`
- `convertToOrder`
- `saveView`
- `getViews`
- `setDefaultView`

Reject in revision:

- any artboard state that suggests users can share or convert from unsaved work

### `payments-sheet.svg`

Required changes:

- make the guided payment commit surface the design center
- keep invoice impact visible before commit
- keep audit trace and allocation context visible after commit
- demote legacy inspector-first payment behavior to compatibility context, not the main story

Must preserve:

- explicit payment commit boundary
- `trpc.accounting.payments.create`
- invoice impact review near the commit action

Reject in revision:

- payment execution hidden inside a secondary inspector with no clear commit moment

### `receiving-sheet.svg`

Required changes:

- introduce an explicit branch clarifier for `Direct Intake` versus `PO Receiving`
- use `Intake` as the product term where the sheet is about intake
- keep PO-linked receiving as a visible branch, not an invisible implementation detail
- make submit and receive boundaries explicit
- keep failure rows visible after submit attempts

Must preserve:

- `inventory.intake`
- PO-linked receiving draft behavior
- `poReceiving` ownership for purchase-order receipt flow

Reject in revision:

- a single ambiguous `Receiving` story that makes direct intake and PO receiving look identical

### `returns-sheet.svg`

Required changes:

- add a staged lifecycle strip that shows approval, rejection, receipt, processing, and refund follow-up
- make the orders-workbook returns path visibly adjacent, not hidden
- keep order context and restock / vendor-return choices visible

Must preserve:

- `returns.approve`
- `returns.reject`
- `returns.receive`
- `returns.process`
- `refunds.create`
- `orders.markAsReturned`
- `orders.processRestock`
- `orders.processVendorReturn`
- `orders.getVendorReturnOptions`

### `samples-sheet.svg`

Required changes:

- add monthly allocation support as a real operating signal
- add expiring-samples support card or strip
- make sample return and vendor-return lifecycle visible
- keep summary counts near the main registry

Must preserve:

- `getMonthlyAllocation`
- `setMonthlyAllocation`
- `approveReturn`
- `completeReturn`
- `requestVendorReturn`
- `shipToVendor`
- `confirmVendorReturn`
- expiry monitoring

### `shipping-sheet.svg`

Required changes:

- rewrite lifecycle framing from `Shipping` to `Fulfillment` except where the specific ship step is intended
- keep queue plus active pick context
- make manifest/output behavior visibly adjacent to packing actions

Must preserve:

- `packItems`
- `markAllPacked`
- `unpackItems`
- `markOrderReady`
- manifest export behavior

### `inventory-sheet.svg`

Required changes:

- rewrite `Receiving Queue` references so the pack treats Intake as the adjacent workflow
- make any quantity-change behavior visibly governed, not generic spreadsheet editing
- preserve inventory registry as the primary owner surface

### `purchase-orders-sheet.svg`

Required changes:

- rewrite receiving handoff copy to reflect `Intake` / `PO Receiving` truth
- keep the selected document plus row-scoped handoff pattern
- keep export and pending-receiving behavior visible enough to avoid being dropped later

### `invoices-sheet.svg`

Required changes:

- keep PDF, print, and payment handoffs visibly first-class
- do not let the registry-only read dominate so much that output actions vanish

### `client-ledger-sheet.svg`

Required changes:

- keep the running balance visible while detail is open
- keep export behavior and explicit adjustment gate visible
- preserve standalone-route identity

### `shared-primitives.svg`

Required changes:

- add or standardize a reusable support-strip pattern for output actions and lifecycle clarifiers
- keep save-state, selection, and keyboard grammar shared
- avoid baking module-specific terminology into primitives

## System Areas Outside The Current Pack

These areas were identified by the audit and now need an explicit revision decision.

| Area                                    | Revision decision                                                                                     | Why                                                                       |
| --------------------------------------- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| Live Shopping                           | keep out of pack, but add explicit bridge note from `sales-sheet.svg`                                 | it is a real TERP surface and current sales-sheet contracts can launch it |
| Quotes surface                          | keep out of pack as a separate surface, but add explicit quote-mode coverage in the Sales Order pair  | quote behavior is real both as a tab and as composer state                |
| Returns / refunds deeper lifecycle      | add lifecycle strip inside `returns-sheet.svg`                                                        | too much real behavior is currently hidden                                |
| Samples allocation / expiry             | add support cards and summary strip inside `samples-sheet.svg`                                        | current artboard understates real operating signals                       |
| Intake branch split                     | add explicit branch clarifier inside `receiving-sheet.svg`                                            | direct intake and PO receiving are separate truths                        |
| Reporting / printing / output contracts | add a reusable output-strip grammar, then apply it to Sales Sheets, Fulfillment, Invoices, and Ledger | these are real TERP contracts, not optional polish                        |
| Terminology drift                       | global pack rewrite before the next SVG export                                                        | this should be fixed once, not artboard by artboard later                 |

## Terminology Rewrite Checklist

These rewrites should happen before the next export pass:

- `Sale` -> `Sales Order`
- `Receiving` -> `Intake` when the sheet is about intake rather than PO receipt status
- `Shipping` -> `Fulfillment` when the artboard refers to the broader lifecycle
- `Launch Receiving` -> `Start Intake` or `Open PO Receiving`, depending on the real branch
- `Receiving Queue` -> `Intake Queue` when the queue is not specifically the PO receiving branch

## Exit Criteria For The Next Pack Revision

Do not call the next revision ready until all of these are true:

1. No artboard uses `Sale`, `Receiving`, or lifecycle `Shipping` where TERP terminology forbids it.
2. The Sales Order pair visibly preserves seeded entry, quote mode, draft save, and finalize trust cues.
3. `sales-sheet.svg` visibly preserves dirty-state gating, share/output actions, and live-session bridge behavior.
4. `payments-sheet.svg` clearly centers the guided payment commit flow rather than the legacy inspector path.
5. `receiving-sheet.svg` visibly distinguishes direct intake from PO receiving.
6. `returns-sheet.svg` and `samples-sheet.svg` both show their deeper lifecycle reality rather than just a basic registry view.
7. Output contracts are visible somewhere repeatable in the shared grammar, not left to implementation guesswork.
8. Every area still left out of the pack is named explicitly as an intentional non-goal, not simply absent.

## Recommended Execution Prompt For The Next Pass

Use this as the operating brief for the next artboard revision pass:

> Revise the existing TERP spreadsheet-native Figma pack using the pack-wide reality audit and revision brief as hard constraints. Keep the current pack structure, but update the highest-risk artboards first: `sales-order-sheet.svg`, `orders-document.svg`, `sales-sheet.svg`, `payments-sheet.svg`, and `receiving-sheet.svg`. Enforce terminology rewrites (`Sales Order`, `Intake`, `Fulfillment`), preserve seeded entry and draft/commit trust cues, and make currently missing system areas visible either through explicit artboard changes or explicit non-goal notes. Do not simplify away quotes, live-shopping bridge behavior, returns/refunds lifecycle depth, samples allocation/expiry signals, intake branch clarity, or output/export contracts. Reuse shared spreadsheet-native primitives wherever possible and keep workflow ownership explicit.
