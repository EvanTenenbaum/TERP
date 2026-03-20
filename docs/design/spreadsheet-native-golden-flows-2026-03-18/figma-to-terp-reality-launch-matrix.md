# Figma To TERP Reality Launch Matrix

Date: `2026-03-18`

## Purpose

This matrix launches the first applied pass of the Figma-to-reality mapping system against the current spreadsheet-native pack.

It is not a final implementation spec.
It is the product-lead translation layer between the Figma direction and live TERP reality.

## Wave 1: Launch First

### 1. Sales Order Document

Current system truth:

- sales workspace owner: [SalesWorkspacePage.tsx](/Users/evan/spec-erp-docker/TERP/TERP/client/src/pages/SalesWorkspacePage.tsx)
- composer owner: [OrderCreatorPage.tsx](/Users/evan/spec-erp-docker/TERP/TERP/client/src/pages/OrderCreatorPage.tsx)
- draft + finalize contracts: [orders.ts](/Users/evan/spec-erp-docker/TERP/TERP/server/routers/orders.ts)

Figma principle to preserve:

- inventory browser on the left
- sales-order document on the right
- compact support regions below each side
- one focused document-composition workspace, not tab-hopping

Reality constraints:

- must preserve seeded entry modes, including draft load, route seed, and sales-sheet import
- must preserve quote-mode and sales-order branching
- must preserve explicit draft save / finalize behavior
- must preserve inventory pricing pull from sales-sheet inventory logic
- product term must be `Sales Order`, not `Sale`

Mapping decision:

- `Adopt`: split-screen spreadsheet-native composition
- `Adapt`: support regions must reflect real referral / credit / whole-order-change behaviors, not just labeled boxes
- `Preserve`: `fromSalesSheet=true` import path and draft/finalize lifecycle
- `Reject`: any interpretation that removes quote mode, draft state, or seeded imports

### 2. Sales Sheets

Current system truth:

- owner page: [SalesSheetCreatorPage.tsx](/Users/evan/spec-erp-docker/TERP/TERP/client/src/pages/SalesSheetCreatorPage.tsx)
- contracts: [salesSheets.ts](/Users/evan/spec-erp-docker/TERP/TERP/server/routers/salesSheets.ts)

Figma principle to preserve:

- priced inventory browser
- sheet preview beside selection workspace
- lightweight draft behavior
- explicit conversion / sharing actions

Reality constraints:

- current system already supports drafts, autosave, saved views, share links, and history
- convert-to-order is real and can seed order creation
- dirty state must visibly block share / convert until save completes
- quotes are not a separate fake module; they are a conversion mode

Mapping decision:

- `Adopt`: browser + preview split and spreadsheet-native review feel
- `Adapt`: conversion CTA logic must reflect real save/dirty state and current contracts
- `Preserve`: saved views, draft restore, share-link generation, quote conversion path
- `Reject`: any design that implies immediate conversion from unsaved state

### 3. Payments

Current system truth:

- accounting workspace owner: [AccountingWorkspacePage.tsx](/Users/evan/spec-erp-docker/TERP/TERP/client/src/pages/AccountingWorkspacePage.tsx)
- legacy inspector path: [PaymentInspector.tsx](/Users/evan/spec-erp-docker/TERP/TERP/client/src/components/work-surface/PaymentInspector.tsx)
- modern guided payment flow: [InvoiceToPaymentFlow.tsx](/Users/evan/spec-erp-docker/TERP/TERP/client/src/components/work-surface/golden-flows/InvoiceToPaymentFlow.tsx)

Figma principle to preserve:

- spreadsheet review of open invoices
- guided payment review and commit
- audit and impact visibility near the action

Reality constraints:

- payment commit boundary is trust-critical
- sheet edits can stage a payment, but commit must stay explicit
- modern golden-flow path already points to `accounting.payments.create`
- legacy `payments.recordPayment` still exists and must be treated as compatibility, not the new design center

Mapping decision:

- `Adopt`: staged spreadsheet review plus a guided commit surface
- `Adapt`: the commit region must be center-stage, not a dismissible inspector accessory
- `Preserve`: before/after invoice impact and audit trace
- `Reject`: inspector-first payment execution

### 4. Client Ledger

Current system truth:

- standalone route owner: [ClientLedgerWorkSurface.tsx](/Users/evan/spec-erp-docker/TERP/TERP/client/src/components/work-surface/ClientLedgerWorkSurface.tsx)
- adjustment mutation also surfaces in client-profile flows

Figma principle to preserve:

- ledger as a review-first spreadsheet surface
- visible running balance while detail is open
- explicit adjustment gate rather than silent inline mutation

Reality constraints:

- this is not currently an Accounting tab; it remains standalone
- running balance is the core audit signal and cannot be visually sacrificed when detail is open
- row detail and source navigation must stay explicit

Mapping decision:

- `Adopt`: dominant ledger table plus right-rail review support
- `Adapt`: right rail must fit the working viewport while preserving running balance visibility
- `Preserve`: standalone route ownership and explicit adjustment permission gate
- `Reject`: remounting this as a generic accounting workbook tab before shell ownership changes

### 5. Returns

Current system truth:

- owner page: [ReturnsPage.tsx](/Users/evan/spec-erp-docker/TERP/TERP/client/src/pages/ReturnsPage.tsx)
- current flow uses `returns.getAll`, `returns.getStats`, `orders.getOrderWithLineItems`, and `returns.create`

Figma principle to preserve:

- a return-processing surface that feels like an exception queue plus document review
- visible order context while processing returns

Reality constraints:

- current page is still simpler than the target spreadsheet-native flow
- `GF-009` and `GF-012` are not the same thing
- return composition must stay primary, but linked order-state follow-up cannot disappear
- credit behavior must be framed as explicit handoff or follow-up, not magical inline side effect

Mapping decision:

- `Adopt`: queue + compose hybrid structure
- `Adapt`: add a visible GF-012 clarification band or equivalent cross-flow strip
- `Preserve`: explicit restock decision and order-linked context
- `Defer`: anything implying a broader accounting credit workflow that current returns ownership does not yet control directly

## Wave 2: Launch After The Seam Grammar Is Stable

### 6. Intake

Current system truth:

- route owner: [InventoryWorkspacePage.tsx](/Users/evan/spec-erp-docker/TERP/TERP/client/src/pages/InventoryWorkspacePage.tsx)
- direct intake owner: [DirectIntakeWorkSurface.tsx](/Users/evan/spec-erp-docker/TERP/TERP/client/src/components/work-surface/DirectIntakeWorkSurface.tsx)
- submit contract: `inventory.intake`

Figma principle to preserve:

- one dominant intake table
- clear pre-submit review region
- visible batch / validation readiness

Reality constraints:

- product terminology should say `Intake`, not `Receiving`
- direct intake and PO-linked intake are different truths
- submit must be explicit and failure rows must remain visible after attempt

Mapping decision:

- `Adopt`: dominant intake-table layout
- `Adapt`: rename product copy from receiving to intake where it becomes real product language
- `Preserve`: explicit submit boundary and failure-state visibility
- `Reject`: collapsing direct intake and PO receiving into one ambiguous flow

### 7. Purchase Orders

Current system truth:

- work-surface owner: [PurchaseOrdersWorkSurface.tsx](/Users/evan/spec-erp-docker/TERP/TERP/client/src/components/work-surface/PurchaseOrdersWorkSurface.tsx)
- pending-receiving owner: [PurchaseOrdersSlicePage.tsx](/Users/evan/spec-erp-docker/TERP/TERP/client/src/components/uiux-slice/PurchaseOrdersSlicePage.tsx)
- receiving-linked contracts: [poReceiving.ts](/Users/evan/spec-erp-docker/TERP/TERP/server/routers/poReceiving.ts)

Figma principle to preserve:

- PO queue plus selected document detail
- visible transition into intake when goods arrive

Reality constraints:

- PO is a pre-receipt commitment document
- intake remains a separate workflow even when launched from PO context
- the `Launch Receiving` style handoff must remain visible and row-scoped

Mapping decision:

- `Adopt`: queue + selected-document structure
- `Adapt`: launch CTA must map to intake language and PO-receiving reality
- `Preserve`: clear handoff to PO-linked intake

### 8. Fulfillment / Pick & Pack

Current system truth:

- work-surface owner: [PickPackWorkSurface.tsx](/Users/evan/spec-erp-docker/TERP/TERP/client/src/components/work-surface/PickPackWorkSurface.tsx)
- contracts: `pickPack.getPickList`, `pickPack.getOrderDetails`, `pickPack.packItems`, `pickPack.markAllPacked`, `pickPack.unpackItems`, `pickPack.markOrderReady`

Figma principle to preserve:

- one queue plus one active pick context
- visible bag / manifest support
- explicit status movement through the workflow

Reality constraints:

- TERP policy prefers `Fulfillment` as lifecycle language, not `Shipping`
- queue state must remain visible after action
- scope lock matters: operators need to know which order they are packing

Mapping decision:

- `Adopt`: queue + active-pick layout
- `Adapt`: labels should use fulfillment language except where `Shipped` is the specific status
- `Preserve`: explicit ready / packed transitions and manifest export

## Wave 3: Launch After The Core Grammar Is Proven

### 9. Invoices

Current system truth:

- owner surface: [InvoicesWorkSurface.tsx](/Users/evan/spec-erp-docker/TERP/TERP/client/src/components/work-surface/InvoicesWorkSurface.tsx)
- payment handoff already exists through the golden flow component

Mapping decision:

- `Adopt`: review registry structure
- `Adapt`: PDF / payment handoffs should remain visible but not turn the inspector into the main action surface
- `Preserve`: invoice status, document generation, and payment-entry seam

### 10. Samples

Current system truth:

- owner page: [SampleManagement.tsx](/Users/evan/spec-erp-docker/TERP/TERP/client/src/pages/SampleManagement.tsx)
- current flow already includes request, cancel, request return, approve return, complete return, request vendor return, ship to vendor, confirm vendor return

Figma principle to preserve:

- registry-first sample management
- visible support cards for expiring or return-related work

Reality constraints:

- current module already does more than a basic sample-request grid
- support cards must stay visually separate from the dominant table
- sample return and vendor return paths are real and must remain visible in the mapping

Mapping decision:

- `Adopt`: registry plus support-card grammar
- `Adapt`: support regions must reflect actual sample-return and vendor-return capabilities
- `Preserve`: existing return and vendor-return procedures
- `Reject`: shrinking samples down to a simple request-only list

## Launch Output

The next implementation-facing phase should produce one brief per module with this exact structure:

1. `Current TERP truth`
2. `Figma design intent`
3. `Mapping decision: Adopt / Adapt / Preserve / Defer / Reject`
4. `Required route and contract bindings`
5. `Required terminology rewrites`
6. `No-regression checklist`
7. `QA proof needed before acceptance`

## Immediate Recommendation

Launch the actual mapping work in this order:

1. Sales Order document
2. Sales Sheets
3. Payments
4. Client Ledger
5. Returns
6. Intake
7. Purchase Orders
8. Fulfillment / Pick & Pack
9. Invoices
10. Samples

This order is the safest because it defines the seam grammar first, then applies it to the rest of the pack.
