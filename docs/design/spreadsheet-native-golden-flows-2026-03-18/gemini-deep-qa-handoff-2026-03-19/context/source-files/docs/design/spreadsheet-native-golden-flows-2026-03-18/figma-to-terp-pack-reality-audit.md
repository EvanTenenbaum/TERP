# Figma To TERP Pack Reality Audit

Date: `2026-03-18`

## Purpose

This audit applies the upgraded Figma-to-TERP mapping method across the full spreadsheet-native artboard pack.

It answers three questions for every artboard:

1. What TERP route and code owner actually own this surface today?
2. How faithfully does the artboard represent current TERP reality?
3. What real TERP areas are still absent or under-modeled even after the pack is reviewed as a whole?

## Status Key

- `Aligned` - the artboard already fits the owning TERP surface and mainly needs normal implementation binding
- `Adapt` - the design principle is right, but the sheet needs route, terminology, or adjacency correction
- `Under-modeled` - the artboard covers the right module but omits meaningful lifecycle, seam, or output reality
- `Missing` - TERP has a real area but this pack does not yet give it a meaningful artboard

## Pack Summary

| Artboard                    | Route                                                        | Status          | Primary reason                                                                                                  |
| --------------------------- | ------------------------------------------------------------ | --------------- | --------------------------------------------------------------------------------------------------------------- |
| `orders-queue.svg`          | `/sales?tab=orders&surface=sheet-native`                     | `Aligned`       | queue-first pilot already maps well to the orders owner surface                                                 |
| `orders-document.svg`       | `/sales?tab=orders&surface=sheet-native&ordersView=document` | `Adapt`         | same surface as Sales Order sheet, but terminology and no-loss guardrails must be enforced                      |
| `sales-order-sheet.svg`     | `/sales?tab=orders&surface=sheet-native&ordersView=document` | `Adapt`         | canonical artboard for the order composer, but seeded entry and quote/draft behavior must stay explicit         |
| `sales-sheet.svg`           | `/sales?tab=sales-sheets&surface=sheet-native`               | `Under-modeled` | current artboard does not surface dirty-state gating, live-session handoff, or output contracts strongly enough |
| `inventory-sheet.svg`       | `/inventory?tab=inventory&surface=sheet-native`              | `Adapt`         | core registry is strong, but terminology and adjustment governance need cleanup                                 |
| `receiving-sheet.svg`       | `/inventory?tab=receiving&surface=sheet-native`              | `Under-modeled` | direct intake and PO-linked receiving are separate truths that the artboard currently compresses                |
| `purchase-orders-sheet.svg` | `/purchase-orders?surface=sheet-native`                      | `Adapt`         | queue-plus-document model is correct, but the handoff must reconcile to intake reality                          |
| `shipping-sheet.svg`        | `/inventory?tab=shipping&surface=sheet-native`               | `Adapt`         | fulfillment workflow is real, but the artboard uses shipping language for the wider lifecycle                   |
| `invoices-sheet.svg`        | `/accounting?tab=invoices&surface=sheet-native`              | `Aligned`       | registry + document review shape matches the current invoice owner surface                                      |
| `payments-sheet.svg`        | `/accounting?tab=payments&surface=sheet-native`              | `Adapt`         | payment commit boundary is right, but guided flow must outrank the legacy inspector path                        |
| `client-ledger-sheet.svg`   | `/client-ledger?surface=sheet-native`                        | `Aligned`       | review-first ledger shape fits the standalone owner surface                                                     |
| `returns-sheet.svg`         | `/sales?tab=returns&surface=sheet-native`                    | `Under-modeled` | deeper returns, refund, and orders-workbook actions are real but not visible enough                             |
| `samples-sheet.svg`         | `/inventory?tab=samples&surface=sheet-native`                | `Under-modeled` | monthly allocation, expiry, and vendor-return depth are real but mostly absent from the artboard                |
| `shared-primitives.svg`     | `shared`                                                     | `Aligned`       | the pack-level spreadsheet grammar already matches the pilot primitives                                         |

## Pack-Wide Findings

- The pack is directionally strong on spreadsheet-native composition, dominant-table grammar, and visible support regions.
- The highest-risk no-loss areas are Sales Order composition, Sales Sheets conversion and output behavior, guided Payments, and Receiving / Intake branching.
- Terminology drift is still visible in the artboards and must be treated as a product-mapping problem, not a cosmetic cleanup.
- No artboard inside the pack is fully `Missing`, but multiple real TERP areas remain `Missing` at the system level because they are not represented anywhere in the artboard set.

## Artboard Audit

### `orders-queue.svg`

- Route owner and code anchor: `/sales?tab=orders&surface=sheet-native`; [SalesWorkspacePage.tsx](/Users/evan/spec-erp-docker/TERP/TERP/client/src/pages/SalesWorkspacePage.tsx), [OrdersSheetPilotSurface.tsx](/Users/evan/spec-erp-docker/TERP/TERP/client/src/components/spreadsheet-native/OrdersSheetPilotSurface.tsx)
- Figma intent: a queue-first spreadsheet registry that keeps order review fast while still opening document detail from the same operating context.
- TERP reality: the orders tab already hosts the sheet-native pilot, with classic fallback preserved through the sales workspace shell.
- Status bucket: `Aligned`
- Mapping decision:
  - `Adopt`: dominant order table, spreadsheet-native queue grammar, and document drill-in behavior.
  - `Adapt`: preserve classic-open fallback and current deep-link handling when sheet-native is not the active surface.
  - `Preserve`: downstream invoice, payment, return, and fulfillment adjacencies that still originate from the selected order context.
  - `Defer`: none inside the queue artboard itself.
  - `Reject`: turning status transitions into silent inline mutations that bypass current explicit workflow actions.
- Missing or under-modeled areas: this artboard should not pretend to own Quotes or Live Shopping; those are real sibling sales surfaces.

### `orders-document.svg`

- Route owner and code anchor: `/sales?tab=orders&surface=sheet-native&ordersView=document`; [SalesWorkspacePage.tsx](/Users/evan/spec-erp-docker/TERP/TERP/client/src/pages/SalesWorkspacePage.tsx), [OrderCreatorPage.tsx](/Users/evan/spec-erp-docker/TERP/TERP/client/src/pages/OrderCreatorPage.tsx), [OrdersDocumentLineItemsGrid.tsx](/Users/evan/spec-erp-docker/TERP/TERP/client/src/components/orders/OrdersDocumentLineItemsGrid.tsx)
- Figma intent: inventory-left, document-right composition with compact support regions below, optimized for one focused order-building workspace.
- TERP reality: this is the same real owner surface as the canonical Sales Order sheet and it must preserve `fromSalesSheet=true`, `salesSheetToQuote`, draft save/update/finalize, and quote-versus-order branching.
- Status bucket: `Adapt`
- Mapping decision:
  - `Adopt`: split-screen spreadsheet-native order composition and compact support-module pattern.
  - `Adapt`: relabel `Sale` to `Sales Order` and turn placeholder support boxes into real referral, credit, and whole-order-change behaviors.
  - `Preserve`: draft lifecycle, seeded entry modes, and explicit finalize boundaries.
  - `Defer`: none that would erase existing composer truth.
  - `Reject`: any interpretation that removes quote mode, draft restore, or seeded imports.
- Missing or under-modeled areas: the artboard alone does not prove quote conversion, seeded imports, or downstream invoice/payment seams; those must stay explicit in implementation.

### `sales-order-sheet.svg`

- Route owner and code anchor: `/sales?tab=orders&surface=sheet-native&ordersView=document`; [SalesWorkspacePage.tsx](/Users/evan/spec-erp-docker/TERP/TERP/client/src/pages/SalesWorkspacePage.tsx), [OrderCreatorPage.tsx](/Users/evan/spec-erp-docker/TERP/TERP/client/src/pages/OrderCreatorPage.tsx), [OrdersDocumentLineItemsGrid.tsx](/Users/evan/spec-erp-docker/TERP/TERP/client/src/components/orders/OrdersDocumentLineItemsGrid.tsx)
- Figma intent: the explicit review-facing Sales Order deliverable for the spreadsheet-native order composer.
- TERP reality: this is the canonical pack artboard for the same surface as `orders-document.svg`, so it inherits the same route seeds, quote mode, draft lifecycle, and trust-critical finalize boundary.
- Status bucket: `Adapt`
- Mapping decision:
  - `Adopt`: this should be treated as the pack’s primary order-composer artboard.
  - `Adapt`: product copy must say `Sales Order`, not `Sale`, and the support regions must map to real TERP modules rather than generic placeholders.
  - `Preserve`: `fromSalesSheet=true`, `salesSheetToQuote`, `orders.createDraftEnhanced`, `orders.updateDraftEnhanced`, and `orders.finalizeDraft`.
  - `Defer`: any broader quote registry redesign belongs to the quotes surface, not this document artboard.
  - `Reject`: any design cut that collapses quote and sales-order behavior into one ambiguous document type.
- Missing or under-modeled areas: the artboard still needs explicit no-loss notes for draft save, restore, and finalize.

### `sales-sheet.svg`

- Route owner and code anchor: `/sales?tab=sales-sheets&surface=sheet-native`; [SalesWorkspacePage.tsx](/Users/evan/spec-erp-docker/TERP/TERP/client/src/pages/SalesWorkspacePage.tsx), [SalesSheetCreatorPage.tsx](/Users/evan/spec-erp-docker/TERP/TERP/client/src/pages/SalesSheetCreatorPage.tsx), [SalesSheetPreview.tsx](/Users/evan/spec-erp-docker/TERP/TERP/client/src/components/sales/SalesSheetPreview.tsx), [salesSheets.ts](/Users/evan/spec-erp-docker/TERP/TERP/server/routers/salesSheets.ts)
- Figma intent: a priced inventory browser plus a parallel sheet preview, with lightweight drafting and clear conversion actions.
- TERP reality: TERP already owns drafts, restore, saved views, history, share links, convert-to-order, and live-session handoff from the sales sheet preview.
- Status bucket: `Under-modeled`
- Mapping decision:
  - `Adopt`: browser-plus-preview split and spreadsheet-native review feel.
  - `Adapt`: share, convert, and start-live-session CTAs must obey dirty-state and save-complete rules.
  - `Preserve`: `getInventory`, `getHistory`, `saveDraft`, `getDraftById`, `generateShareLink`, `convertToOrder`, `saveView`, `getViews`, and `setDefaultView`.
  - `Defer`: none of the current owned contracts should be treated as optional extras.
  - `Reject`: any design that implies conversion or sharing from unsaved state.
- Missing or under-modeled areas: saved views, history, share-link generation, export/print outputs, and `convertToLiveSession` are all real but not strong enough in the current artboard.

### `inventory-sheet.svg`

- Route owner and code anchor: `/inventory?tab=inventory&surface=sheet-native`; [InventoryWorkspacePage.tsx](/Users/evan/spec-erp-docker/TERP/TERP/client/src/pages/InventoryWorkspacePage.tsx), [InventorySheetPilotSurface.tsx](/Users/evan/spec-erp-docker/TERP/TERP/client/src/components/spreadsheet-native/InventorySheetPilotSurface.tsx)
- Figma intent: a registry-first spreadsheet inventory surface with adjacent operational signals.
- TERP reality: the inventory tab already hosts the sheet-native pilot, but intake remains an adjacent workflow and quantity adjustments are governed actions, not generic cell edits.
- Status bucket: `Adapt`
- Mapping decision:
  - `Adopt`: dominant inventory registry and spreadsheet-native navigation grammar.
  - `Adapt`: reconcile copy that currently says `Receiving Queue` and ensure any quantity-change affordance maps to explicit TERP adjustment controls.
  - `Preserve`: open-intake adjacency, current inventory ownership, and status-driven review behavior.
  - `Defer`: none that erase the inventory pilot’s existing operating grammar.
  - `Reject`: generic spreadsheet edits that bypass inventory adjustment or audit rules.
- Missing or under-modeled areas: the inventory artboard should reference Intake as an adjacent workflow, not blur inventory and intake into one product term.

### `receiving-sheet.svg`

- Route owner and code anchor: `/inventory?tab=receiving&surface=sheet-native`; [InventoryWorkspacePage.tsx](/Users/evan/spec-erp-docker/TERP/TERP/client/src/pages/InventoryWorkspacePage.tsx), [DirectIntakeWorkSurface.tsx](/Users/evan/spec-erp-docker/TERP/TERP/client/src/components/work-surface/DirectIntakeWorkSurface.tsx), [PurchaseOrdersSlicePage.tsx](/Users/evan/spec-erp-docker/TERP/TERP/client/src/components/uiux-slice/PurchaseOrdersSlicePage.tsx), [poReceiving.ts](/Users/evan/spec-erp-docker/TERP/TERP/server/routers/poReceiving.ts), [inventory.ts](/Users/evan/spec-erp-docker/TERP/TERP/server/routers/inventory.ts)
- Figma intent: one dominant intake/receiving table with visible readiness, validation, and review support.
- TERP reality: the receiving tab is already split between PO-linked receiving drafts and the actual receiving page, while direct intake separately commits through `inventory.intake`.
- Status bucket: `Under-modeled`
- Mapping decision:
  - `Adopt`: dominant intake-table layout and visible validation/readiness strip.
  - `Adapt`: terminology must reconcile from `Receiving` to `Intake` where the module is really about intake, while still showing PO-receiving as a separate linked branch.
  - `Preserve`: explicit submit / receive boundaries, row-level failure visibility, and PO-linked draft flow.
  - `Defer`: any “single unified intake” story that TERP does not yet actually own.
  - `Reject`: collapsing direct intake and PO receiving into one ambiguous sheet with no branch clarity.
- Missing or under-modeled areas: the artboard does not currently separate direct intake from PO receiving strongly enough to guide implementation safely.

### `purchase-orders-sheet.svg`

- Route owner and code anchor: `/purchase-orders?surface=sheet-native`; [PurchaseOrdersWorkSurface.tsx](/Users/evan/spec-erp-docker/TERP/TERP/client/src/components/work-surface/PurchaseOrdersWorkSurface.tsx), [PurchaseOrdersSlicePage.tsx](/Users/evan/spec-erp-docker/TERP/TERP/client/src/components/uiux-slice/PurchaseOrdersSlicePage.tsx), [poReceiving.ts](/Users/evan/spec-erp-docker/TERP/TERP/server/routers/poReceiving.ts)
- Figma intent: a queue-plus-selected-document purchase-order surface with a visible transition into receiving.
- TERP reality: the PO work surface owns the commitment document, while receiving remains a linked workflow with pending-receiving state and explicit launch behavior.
- Status bucket: `Adapt`
- Mapping decision:
  - `Adopt`: queue plus selected-document structure.
  - `Adapt`: rewrite the handoff as Intake / PO Receiving reality instead of generic “launch receiving” shorthand.
  - `Preserve`: row-scoped handoff to PO-linked receiving and pre-receipt document ownership.
  - `Defer`: none of the receiving handoff truth should be hidden behind inspector-only affordances.
  - `Reject`: any design that treats PO and intake as one surface with no ownership seam.
- Missing or under-modeled areas: export behavior and the pending-receiving slice remain secondary but real.

### `shipping-sheet.svg`

- Route owner and code anchor: `/inventory?tab=shipping&surface=sheet-native`; [InventoryWorkspacePage.tsx](/Users/evan/spec-erp-docker/TERP/TERP/client/src/pages/InventoryWorkspacePage.tsx), [PickPackWorkSurface.tsx](/Users/evan/spec-erp-docker/TERP/TERP/client/src/components/work-surface/PickPackWorkSurface.tsx)
- Figma intent: a queue plus active pick/pack context with visible support output.
- TERP reality: this is the current pick-pack / fulfillment owner surface, with explicit pack, unpack, and ready transitions plus manifest export behavior.
- Status bucket: `Adapt`
- Mapping decision:
  - `Adopt`: queue-plus-active-context layout and visible bag/manifest support.
  - `Adapt`: reconcile lifecycle language from `Shipping` to `Fulfillment` except where a specific shipped status is intended.
  - `Preserve`: explicit `packItems`, `markAllPacked`, `unpackItems`, `markOrderReady`, and manifest export behavior.
  - `Defer`: none of the current fulfillment grammar should be collapsed into a generic shipping checklist.
  - `Reject`: turning ready/packed transitions into silent status edits.
- Missing or under-modeled areas: manifest/output contracts exist and should stay visible as fulfillment support, not disappear into a hidden menu.

### `invoices-sheet.svg`

- Route owner and code anchor: `/accounting?tab=invoices&surface=sheet-native`; [AccountingWorkspacePage.tsx](/Users/evan/spec-erp-docker/TERP/TERP/client/src/pages/AccountingWorkspacePage.tsx), [InvoicesWorkSurface.tsx](/Users/evan/spec-erp-docker/TERP/TERP/client/src/components/work-surface/InvoicesWorkSurface.tsx)
- Figma intent: an invoice registry that keeps document review and payment progress close to the selected record.
- TERP reality: the invoice work surface already exposes detail review, line items, record-payment handoff, reminder actions, PDF download, and print behaviors.
- Status bucket: `Aligned`
- Mapping decision:
  - `Adopt`: review-registry structure and selected-document detail surface.
  - `Adapt`: keep PDF, print, and payment handoffs visible without turning the invoice inspector into a hidden utility panel.
  - `Preserve`: invoice status, payment progress, PDF download, print, and record-payment actions.
  - `Defer`: none required to keep the current owner truthful.
  - `Reject`: any design that downgrades invoice output actions to invisible secondary chrome.
- Missing or under-modeled areas: output actions are real and should remain first-class in future implementation briefs even if the artboard currently emphasizes registry over controls.

### `payments-sheet.svg`

- Route owner and code anchor: `/accounting?tab=payments&surface=sheet-native`; [AccountingWorkspacePage.tsx](/Users/evan/spec-erp-docker/TERP/TERP/client/src/pages/AccountingWorkspacePage.tsx), [Payments.tsx](/Users/evan/spec-erp-docker/TERP/TERP/client/src/pages/accounting/Payments.tsx), [InvoiceToPaymentFlow.tsx](/Users/evan/spec-erp-docker/TERP/TERP/client/src/components/work-surface/golden-flows/InvoiceToPaymentFlow.tsx), [PaymentInspector.tsx](/Users/evan/spec-erp-docker/TERP/TERP/client/src/components/work-surface/PaymentInspector.tsx)
- Figma intent: staged spreadsheet review of open invoices with a clear payment-commit surface and visible impact.
- TERP reality: the new guided path uses `trpc.accounting.payments.create`, while legacy payment execution still exists through `payments.recordPayment`.
- Status bucket: `Adapt`
- Mapping decision:
  - `Adopt`: staged review plus guided commit surface.
  - `Adapt`: make the guided commit region the clear design center and demote the legacy inspector path to compatibility.
  - `Preserve`: explicit payment commit boundary, before/after invoice impact, and audit trace.
  - `Defer`: removal of legacy payment plumbing is a separate modernization task, not a Figma mapping decision.
  - `Reject`: inspector-first execution that hides the real commit boundary.
- Missing or under-modeled areas: the artboard should explicitly call out the guided-versus-legacy split so engineering does not re-center the wrong payment path.

### `client-ledger-sheet.svg`

- Route owner and code anchor: `/client-ledger?surface=sheet-native`; [ClientLedgerWorkSurface.tsx](/Users/evan/spec-erp-docker/TERP/TERP/client/src/components/work-surface/ClientLedgerWorkSurface.tsx)
- Figma intent: a review-first ledger with visible running balance and a companion detail rail.
- TERP reality: the ledger remains a standalone route, not an accounting workbook tab, and it already exposes adjustment gating and export behavior.
- Status bucket: `Aligned`
- Mapping decision:
  - `Adopt`: dominant ledger table and support-rail review layout.
  - `Adapt`: ensure the right rail never steals the running-balance visibility that makes the ledger trustworthy.
  - `Preserve`: standalone route ownership, explicit adjustment gate, source navigation, and `exportLedger`.
  - `Defer`: any shell move into Accounting belongs to a future route-ownership change, not this pack.
  - `Reject`: remounting ledger as a generic accounting sheet before the product shell changes.
- Missing or under-modeled areas: export behavior is real and should remain visible enough in implementation briefs.

### `returns-sheet.svg`

- Route owner and code anchor: `/sales?tab=returns&surface=sheet-native`; [SalesWorkspacePage.tsx](/Users/evan/spec-erp-docker/TERP/TERP/client/src/pages/SalesWorkspacePage.tsx), [ReturnsPage.tsx](/Users/evan/spec-erp-docker/TERP/TERP/client/src/pages/ReturnsPage.tsx), [FLOW_GUIDE.md](/Users/evan/spec-erp-docker/TERP/TERP/docs/reference/FLOW_GUIDE.md), [USER_FLOW_MATRIX.csv](/Users/evan/spec-erp-docker/TERP/TERP/docs/reference/USER_FLOW_MATRIX.csv)
- Figma intent: a return-processing surface that feels like an exception queue plus document review with order context kept nearby.
- TERP reality: TERP owns both dedicated returns-router actions and a staged returns lane inside the orders workbook, plus explicit refund creation.
- Status bucket: `Under-modeled`
- Mapping decision:
  - `Adopt`: queue-plus-document hybrid and visible order-context review.
  - `Adapt`: add a visible cross-flow strip or equivalent grammar that distinguishes dedicated returns from the orders-workbook staged returns actions.
  - `Preserve`: `returns.approve`, `returns.reject`, `returns.receive`, `returns.process`, `refunds.create`, `orders.markAsReturned`, `orders.processRestock`, `orders.processVendorReturn`, and `orders.getVendorReturnOptions`.
  - `Defer`: broader accounting-credit orchestration beyond the owning returns surface.
  - `Reject`: magical inline refunds or restock behavior with no explicit user-owned action.
- Missing or under-modeled areas: deeper returns lifecycle, refunds, and orders-workbook returns actions are all real and currently underrepresented.

### `samples-sheet.svg`

- Route owner and code anchor: `/inventory?tab=samples&surface=sheet-native`; [InventoryWorkspacePage.tsx](/Users/evan/spec-erp-docker/TERP/TERP/client/src/pages/InventoryWorkspacePage.tsx), [SampleManagement.tsx](/Users/evan/spec-erp-docker/TERP/TERP/client/src/pages/SampleManagement.tsx), [samples.ts](/Users/evan/spec-erp-docker/TERP/TERP/server/routers/samples.ts), [ExpiringSamplesWidget.tsx](/Users/evan/spec-erp-docker/TERP/TERP/client/src/components/samples/ExpiringSamplesWidget.tsx)
- Figma intent: a registry-first sample management surface with visible support cards for return-related work.
- TERP reality: the current samples module already owns sample returns, vendor-return steps, monthly allocation contracts, status summaries, and expiry monitoring.
- Status bucket: `Under-modeled`
- Mapping decision:
  - `Adopt`: registry-first sample workbook and support-card grammar.
  - `Adapt`: support regions should reflect actual sample-return, vendor-return, and expiry workflows instead of generic “extra info” cards.
  - `Preserve`: `getMonthlyAllocation`, `setMonthlyAllocation`, `approveReturn`, `completeReturn`, `requestVendorReturn`, `shipToVendor`, `confirmVendorReturn`, and expiring-samples support.
  - `Defer`: any separate analytics-only experience that TERP does not yet own as a distinct page.
  - `Reject`: shrinking Samples down to a request-only list.
- Missing or under-modeled areas: monthly allocation, expiry, vendor-return depth, and summary signals are real TERP behaviors that the artboard does not yet show strongly enough.

### `shared-primitives.svg`

- Route owner and code anchor: `shared`; [SpreadsheetPilotGrid.tsx](/Users/evan/spec-erp-docker/TERP/TERP/client/src/components/spreadsheet-native/SpreadsheetPilotGrid.tsx), [PowersheetGrid.tsx](/Users/evan/spec-erp-docker/TERP/TERP/client/src/components/spreadsheet-native/PowersheetGrid.tsx), [SheetModeToggle.tsx](/Users/evan/spec-erp-docker/TERP/TERP/client/src/components/spreadsheet-native/SheetModeToggle.tsx)
- Figma intent: the reusable spreadsheet grammar for tables, state cues, selection, and surface switching.
- TERP reality: these primitives already anchor the March pilot and are the right reuse layer for the rest of the pack.
- Status bucket: `Aligned`
- Mapping decision:
  - `Adopt`: table grammar, sheet-mode toggle pattern, and shared pilot primitives.
  - `Adapt`: none beyond making sure module-specific terminology and support-region grammar are layered on top instead of baked into the primitives.
  - `Preserve`: reuse of shared save-state, keyboard-discoverability, and surface-mode behavior.
  - `Defer`: module-specific workflow language belongs in each module brief, not in shared primitives.
  - `Reject`: duplicating one-off spreadsheet behaviors per module when the pilot primitives already own them.
- Missing or under-modeled areas: primitives do not encode terminology policy or module ownership seams by themselves; those still belong in each module mapping.

## Areas Not Yet Identified By Figma

### 1. Live Shopping

- TERP evidence: [SalesWorkspacePage.tsx](/Users/evan/spec-erp-docker/TERP/TERP/client/src/pages/SalesWorkspacePage.tsx), [LiveShoppingPage.tsx](/Users/evan/spec-erp-docker/TERP/TERP/client/src/pages/LiveShoppingPage.tsx), [SalesSheetPreview.tsx](/Users/evan/spec-erp-docker/TERP/TERP/client/src/components/sales/SalesSheetPreview.tsx)
- Why it is missing: the sales workspace has a real `live-shopping` tab and sales sheets can launch a live session, but the pack treats sales-sheet conversion mostly as an order pathway.
- Needed follow-up: add a bridge spec or a dedicated artboard if Live Shopping is supposed to inherit spreadsheet-native grammar instead of staying a separate experience family.

### 2. Quotes Surface

- TERP evidence: [SalesWorkspacePage.tsx](/Users/evan/spec-erp-docker/TERP/TERP/client/src/pages/SalesWorkspacePage.tsx), [QuotesWorkSurface.tsx](/Users/evan/spec-erp-docker/TERP/TERP/client/src/components/work-surface/QuotesWorkSurface.tsx), [OrderCreatorPage.tsx](/Users/evan/spec-erp-docker/TERP/TERP/client/src/pages/OrderCreatorPage.tsx)
- Why it is missing: Quotes are real as both a dedicated sales tab and an order-composer mode, but the pack only represents quote behavior indirectly through the Sales Order document.
- Needed follow-up: either keep Quotes intentionally out of the pack with an explicit non-goal note or add a quote-registry artboard so the surface does not disappear from planning.

### 3. Returns Lifecycle, Refunds, And Orders-Workbook Returns Actions

- TERP evidence: [FLOW_GUIDE.md](/Users/evan/spec-erp-docker/TERP/TERP/docs/reference/FLOW_GUIDE.md), [USER_FLOW_MATRIX.csv](/Users/evan/spec-erp-docker/TERP/TERP/docs/reference/USER_FLOW_MATRIX.csv)
- Why it is missing: the current returns artboard captures a broad queue-plus-document feel but does not make the staged lifecycle, refund creation, and orders-workbook branch visible enough.
- Needed follow-up: future briefs should add an explicit staged-returns strip or lifecycle band so implementers do not assume Returns is a single linear document flow.

### 4. Samples Monthly Allocation, Expiring Samples, And Summary Signals

- TERP evidence: [samples.ts](/Users/evan/spec-erp-docker/TERP/TERP/server/routers/samples.ts), [SampleManagement.tsx](/Users/evan/spec-erp-docker/TERP/TERP/client/src/pages/SampleManagement.tsx), [ExpiringSamplesWidget.tsx](/Users/evan/spec-erp-docker/TERP/TERP/client/src/components/samples/ExpiringSamplesWidget.tsx)
- Why it is missing: the samples artboard mainly reads like a registry plus return support, while TERP already owns allocation rules, expiry alerts, and operational status counts.
- Needed follow-up: add allocation and expiry support cards or a summary strip so the sheet reflects the actual operating surface.

### 5. Intake Branch Split: Direct Intake Versus PO Receiving

- TERP evidence: [InventoryWorkspacePage.tsx](/Users/evan/spec-erp-docker/TERP/TERP/client/src/pages/InventoryWorkspacePage.tsx), [DirectIntakeWorkSurface.tsx](/Users/evan/spec-erp-docker/TERP/TERP/client/src/components/work-surface/DirectIntakeWorkSurface.tsx), [PurchaseOrdersSlicePage.tsx](/Users/evan/spec-erp-docker/TERP/TERP/client/src/components/uiux-slice/PurchaseOrdersSlicePage.tsx), [poReceiving.ts](/Users/evan/spec-erp-docker/TERP/TERP/server/routers/poReceiving.ts)
- Why it is missing: the receiving artboard still reads like one intake concept even though TERP has distinct direct-intake and PO-linked receiving paths.
- Needed follow-up: split the visual grammar or add an explicit branch clarifier before implementation planning begins.

### 6. Reporting, Printing, And Document-Output Contracts

- TERP evidence: [SalesSheetPreview.tsx](/Users/evan/spec-erp-docker/TERP/TERP/client/src/components/sales/SalesSheetPreview.tsx), [OrdersWorkSurface.tsx](/Users/evan/spec-erp-docker/TERP/TERP/client/src/components/work-surface/OrdersWorkSurface.tsx), [InvoicesWorkSurface.tsx](/Users/evan/spec-erp-docker/TERP/TERP/client/src/components/work-surface/InvoicesWorkSurface.tsx), [PickPackWorkSurface.tsx](/Users/evan/spec-erp-docker/TERP/TERP/client/src/components/work-surface/PickPackWorkSurface.tsx), [ClientLedgerWorkSurface.tsx](/Users/evan/spec-erp-docker/TERP/TERP/client/src/components/work-surface/ClientLedgerWorkSurface.tsx)
- Why it is missing: TERP already owns share links, PDF downloads, print actions, manifest export, and ledger export, but the pack mostly emphasizes operating-table layouts.
- Needed follow-up: add a repeatable output strip or support-card grammar so implementation does not drop document-output contracts while simplifying the surfaces.

### 7. Terminology Drift

- TERP evidence: [TERMINOLOGY_BIBLE.md](/Users/evan/spec-erp-docker/TERP/TERP/docs/terminology/TERMINOLOGY_BIBLE.md)
- Why it is missing: multiple artboards still use draft shorthand like `Sale`, `Receiving`, or `Shipping` in places where TERP product language requires `Sales Order`, `Intake`, and `Fulfillment`.
- Needed follow-up: treat terminology reconciliation as a mandatory mapping gate before engineering work starts, not as post-design cleanup.

## Recommended Next Move

Use this audit and the upgraded mapping system together:

1. Treat `sales-order-sheet.svg`, `sales-sheet.svg`, `payments-sheet.svg`, and `receiving-sheet.svg` as the highest-risk implementation briefs because they carry the biggest no-loss burden.
2. Carry the `Areas Not Yet Identified By Figma` list into the next pack revision so the team does not accidentally scope TERP down to only what the current SVGs show.
3. Enforce terminology reconciliation before any implementation tickets are written from this pack.
