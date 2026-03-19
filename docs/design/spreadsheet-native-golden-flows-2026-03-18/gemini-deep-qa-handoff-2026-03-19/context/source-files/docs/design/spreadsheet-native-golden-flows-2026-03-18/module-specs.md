# Spreadsheet-Native Golden Flow Module Specs

Date: `2026-03-18`

## Purpose

This spec pack defines the missing spreadsheet-native golden-flow modules, plus the sales-side module surfaces that were absent or under-labeled in the first expanded pack.

This pack is design guidance first. It is not an implementation-closure claim.

## Research Anchor Set

Foundation and governance:

- `docs/specs/SPREADSHEET-NATIVE-FOUNDATION-BASELINE-V2.md`
- `docs/specs/SPREADSHEET-NATIVE-SHEET-ENGINE-CONTRACT.md`
- `docs/specs/spreadsheet-native-foundation/SPREADSHEET-NATIVE-HANDOFF-2026-03-16.md`
- `docs/specs/spreadsheet-native-foundation/OWNERSHIP-SEAMS-MEMO.md`

Pilot truth and parity ledgers:

- `client/src/lib/spreadsheet-native/pilotContracts.ts`
- `client/src/lib/spreadsheet-native/pilotProofCases.ts`
- `docs/specs/spreadsheet-native-ledgers/pilot-ledgers-parity-proof-plan.md`
- `docs/specs/spreadsheet-native-ledgers/sales-orders-sheet-capability-ledger-summary.md`

Golden-flow and preservation sources:

- `context-pack/golden_flows.csv`
- `context-pack/06_NAVIGATION_AND_ROUTES.md`
- `docs/reference/FLOW_GUIDE.md`
- `docs/reference/USER_FLOW_MATRIX.csv`
- `docs/roadmaps/COMPREHENSIVE_ROADMAP_REVIEW_2026-01-20.md`
- `docs/specs/ui-ux-strategy/FEATURE_PRESERVATION_MATRIX.md`

Current oracle surfaces:

- `client/src/components/work-surface/DirectIntakeWorkSurface.tsx`
- `client/src/components/work-surface/PurchaseOrdersWorkSurface.tsx`
- `client/src/components/work-surface/PickPackWorkSurface.tsx`
- `client/src/components/work-surface/InvoicesWorkSurface.tsx`
- `client/src/components/work-surface/golden-flows/InvoiceToPaymentFlow.tsx`
- `client/src/components/work-surface/ClientLedgerWorkSurface.tsx`
- `client/src/components/work-surface/PaymentInspector.tsx`
- `client/src/pages/SalesWorkspacePage.tsx`
- `client/src/pages/SalesSheetCreatorPage.tsx`
- `client/src/components/sales/SalesSheetPreview.tsx`
- `client/src/components/sales/SalesSheetTemplates.tsx`
- `client/src/pages/ReturnsPage.tsx`
- `client/src/pages/SampleManagement.tsx`
- `server/routers/salesSheets.ts`
- `server/routers/accounting.ts`
- `server/routers/payments.ts`
- `docs/design/spreadsheet-native-golden-flows-2026-03-18/sales-order-creation-direction.md`

Current March pilot artboards already built:

- `docs/design/spreadsheet-native-march-2026/orders-queue.svg`
- `docs/design/spreadsheet-native-march-2026/orders-document.svg`
- `docs/design/spreadsheet-native-march-2026/inventory-sheet.svg`
- `docs/design/spreadsheet-native-march-2026/shared-primitives.svg`

Directional reference newly added for carried-forward Orders document work:

- `docs/design/spreadsheet-native-golden-flows-2026-03-18/sales-order-creation-direction.md`

## Guardrails That Apply To Every Module

- The current UI is a functionality oracle only, not the future component model.
- Every module must preserve the distinction between `final target`, `current pilot`, and `preserved adjacent behavior`.
- Default desktop layouts assume a `1440px` working viewport inside the wider Figma canvas.
- Default desktop layouts must surface the P0 operating columns without routine horizontal scrolling inside that `1440px` working viewport.
- Use these minimum visible-column heuristics when checking fit: `88px` for numeric or status columns, `120px` for short reference columns, `180px` for name or description columns.
- Every sheet has one dominant primary table.
- Supporting regions must justify themselves through a visible relationship to the primary table.
- Inspectors are secondary companions, not the main action surface.
- Spreadsheet edits change data only. Workflow transitions remain explicit actions.
- Adjacent-owned execution must stay visibly adjacent when ownership has already been resolved elsewhere.
- Visible adjacency must use a repeatable layout pattern: a compact summary strip, pinned handoff row, or support card with explicit cross-sheet CTA, not an inspector-only clue.
- Shared spreadsheet-native primitives, selection cues, save state, and keyboard discoverability should be reused rather than reinvented per module.

## Contract Naming Rule

- Contract names in this spec follow the current active tRPC surface rather than a forced rename.
- `inventory.*` refers to the current `inventoryRouter` namespace in `server/routers/inventory.ts`.
- `accounting.*`, `pickPack.*`, `purchaseOrders.*`, `returns.*`, `samples.*`, and `clientLedger.*` refer to namespaced routers currently used by the oracle surfaces.
- `invoices.*`, `payments.*`, and `orders.*` remain bare where the current oracle surface still calls those standalone routers directly.
- If a module mixes namespaced and bare contracts, that mix is intentional and should be treated as a current-state compatibility fact, not a design-system preference.

## Existing Pilot Coverage

Already built in the March 2026 spreadsheet-native pack:

- `Sales -> Orders` queue mode
- `Sales -> Orders` document mode
- `Operations -> Inventory` registry mode
- shared spreadsheet-native primitives

## Pack Reconciliation After First Generation

After reconciling the first generated pack against the current TERP routes, feature matrix, and sales workspace source files:

- explicitly missing from the first generated pack: `Sales -> Sales Sheets`
- under-labeled in the first generated pack: the sales-order document existed only as `orders-document.svg`, which made the module easy to miss in review
- not actually missing after repo reconciliation: orders queue, inventory, receiving, purchase orders, shipping, invoices, payments, client ledger, returns, samples, and shared primitives
- intentionally not added as separate artboards in this pass: `Quotes` and `Live Shopping`

Rationale:

- `Quotes` route seeding and quote-mode preservation are already owned inside the current Sales Order composer contract and should remain visible in the Sales Order document rather than being split into a fake second spreadsheet sheet
- `Live Shopping` is a separate experience family, not one of the spreadsheet-native module sheets in this pack

## Missing Modules In Scope

The remaining modules to spec and design as spreadsheet-native first-pass artboards are:

1. `Operations -> Receiving`
2. `Purchasing -> Purchase Orders`
3. `Operations -> Shipping / Pick & Pack`
4. `Accounting -> Invoices`
5. `Accounting -> Payments`
6. `Accounting -> Client Ledger`
7. `Sales -> Returns`
8. `Operations -> Samples`
9. `Sales -> Sales Sheets`

## Golden Flows Intentionally Not In This Missing-Module Pack

These golden flows are not missing-module targets because their primary spreadsheet-native coverage already lives inside the March pilot artboards:

- `GF-003 Create & Finalize Order (Reserve Inventory)` is already represented inside `orders-document.svg` and the Orders spreadsheet-native contracts.
- `GF-004 Confirm Draft Order (Decrement On-Hand)` is already represented inside the current Orders document workflow and finalize guardrails.
- `GF-011 Inventory Management (List + Status Changes)` is already represented inside `inventory-sheet.svg`.

## Directional Layout Reference For Sales Order Creation

Even though `Sales -> Orders` is already present in the March pilot pack, the expanded full-pack regeneration should update `orders-document.svg` to follow the user-provided directional layout reference.

Directional composition to carry forward:

- large inventory workspace on the left
- large sales-order workspace on the right
- compact referral and credit modules below the inventory region
- wide whole-order-changes module below the sales-order region

Constraint:

- this changes layout direction only
- it does not remove any order-create functionality already captured by the Orders rollout and evaluation contracts

Improved deliverable naming:

- the improved pack exposes this surface explicitly as `sales-order-sheet.svg`
- `orders-document.svg` remains as a compatibility alias for continuity with the earlier pack

## Module Summary Matrix

| Module                 | Golden Flow Anchor         | Current Oracle Route                               | Proposed Sheet-Native Route                     | Archetype                         | Primary Artboard            |
| ---------------------- | -------------------------- | -------------------------------------------------- | ----------------------------------------------- | --------------------------------- | --------------------------- |
| Receiving              | `GF-001`                   | `/inventory?tab=receiving`                         | `/inventory?tab=receiving&surface=sheet-native` | document-registry hybrid          | `receiving-sheet.svg`       |
| Purchase Orders        | `GF-002`                   | `/purchase-orders`                                 | `/purchase-orders?surface=sheet-native`         | conveyor plus document            | `purchase-orders-sheet.svg` |
| Shipping / Pick & Pack | `GF-005`                   | `/inventory?tab=shipping`                          | `/inventory?tab=shipping&surface=sheet-native`  | conveyor                          | `shipping-sheet.svg`        |
| Invoices               | `GF-006`                   | `/accounting?tab=invoices`                         | `/accounting?tab=invoices&surface=sheet-native` | review registry                   | `invoices-sheet.svg`        |
| Payments               | `GF-007`                   | `/accounting?tab=payments`, `/accounting/payments` | `/accounting?tab=payments&surface=sheet-native` | guided transaction + registry     | `payments-sheet.svg`        |
| Client Ledger          | `GF-008`                   | `/client-ledger`, `/clients/:clientId/ledger`      | `/client-ledger?surface=sheet-native`           | review ledger                     | `client-ledger-sheet.svg`   |
| Returns                | `GF-009`, `GF-012`         | `/sales?tab=returns`                               | `/sales?tab=returns&surface=sheet-native`       | exception queue + document        | `returns-sheet.svg`         |
| Samples                | `GF-010`                   | `/inventory?tab=samples`                           | `/inventory?tab=samples&surface=sheet-native`   | lane-based registry               | `samples-sheet.svg`         |
| Sales Sheets           | `DF-021 -> GF-003 handoff` | `/sales?tab=sales-sheets`, `/sales-sheets`         | `/sales?tab=sales-sheets&surface=sheet-native`  | review surface + conversion panel | `sales-sheet.svg`           |

Matrix note:

- `Client Ledger` remains a standalone workbook surface even though it appears in this shared summary matrix; do not remount it into `/accounting?tab=client-ledger` unless that route ownership changes in the product shell first.

## Module Specs

### 1. Operations -> Receiving

Golden-flow anchor:

- `GF-001 Direct Intake (Create Inventory Batch)`

Workbook and sheet:

- workbook: `Operations`
- sheet: `Receiving`

Route truth:

- current oracle route: `/inventory?tab=receiving`
- proposed sheet-native route: `/inventory?tab=receiving&surface=sheet-native`

Sheet archetype:

- `document-registry hybrid`

Owned directly in the sheet:

- intake row drafting
- supplier, brand, category, product, qty, COGS, payment terms, and location entry
- in-grid validation with reward-early / punish-late behavior
- row duplication, fill-down, delete, import/export, and submission state
- bounded media attach cues that support intake submission

Preserved adjacent behavior and handoffs:

- inventory review remains in the Inventory sheet after submit
- deep photography review remains adjacent, not absorbed into Receiving
- supplier master-data administration remains adjacent support, not the main sheet

Final-target layout shape:

- one dominant intake draft table
- one compact summary strip for row count, total qty, and submission readiness
- one validation and upload support region below the draft table
- one secondary inspector for row-level detail, notes, and media context

Width budget and default visible columns:

- `Supplier`
- `Product`
- `Qty`
- `COGS`
- `Terms`
- `Location`
- `Status`

Key data contracts:

- `inventory.intake`
- `inventory.vendors`
- `inventory.brands`
- `inventory.uploadMedia`
- `inventory.deleteMedia`

Authoritative commit rule:

- the spreadsheet-native `Submit Intake` action should call `inventory.intake`
- spreadsheet edits and row-level fixes only prepare the intake payload until that explicit submit action fires

Workflow rules:

- spreadsheet edits only prepare intake payloads
- submit is an explicit action, never an incidental cell side effect
- validation must stay visible at row and sheet level
- failed rows cannot disappear after batch submit attempts

Artboards to generate:

- `receiving-sheet.svg`

### 2. Purchasing -> Purchase Orders

Golden-flow anchor:

- `GF-002 Procure-to-Pay (Purchase Order Lifecycle)`

Workbook and sheet:

- workbook: `Purchasing`
- sheet: `Purchase Orders`

Route truth:

- current oracle route: `/purchase-orders`
- proposed sheet-native route: `/purchase-orders?surface=sheet-native`

Sheet archetype:

- `conveyor plus document`

Owned directly in the sheet:

- PO queue browse and filter
- supplier selection and PO header editing
- line item drafting with quantity and cost rules
- status progression through purchasing lifecycle
- explicit receiving handoff

Preserved adjacent behavior and handoffs:

- supplier setup remains adjacent
- receiving execution stays in the Receiving sheet after launch
- bills and supplier payment execution remain Accounting-owned

Final-target layout shape:

- one dominant PO queue
- one supporting selected-PO items table
- one compact procurement summary strip
- one secondary inspector for supplier notes, ETA, and status evidence

Width budget and default visible columns:

- `Status`
- `PO`
- `Supplier`
- `Items`
- `ETA`
- `Total`
- `Next`

Key data contracts:

- `purchaseOrders.list`
- `purchaseOrders.getById`
- `purchaseOrders.create`
- `purchaseOrders.update`
- `purchaseOrders.updateStatus`

Workflow rules:

- cost edits stay in-grid; status changes stay explicit
- receiving launch remains visible and row-scoped
- supplier notes and payment terms remain discoverable without widening the queue

Artboards to generate:

- `purchase-orders-sheet.svg`

### 3. Operations -> Shipping / Pick & Pack

Golden-flow anchor:

- `GF-005 Pick & Pack (Bagging + Status)`

Workbook and sheet:

- workbook: `Operations`
- sheet: `Shipping`

Route truth:

- current oracle route: `/inventory?tab=shipping`
- proposed sheet-native route: `/inventory?tab=shipping&surface=sheet-native`

Sheet archetype:

- `conveyor`

Owned directly in the sheet:

- shipping queue browse and status filtering
- selected order pick list
- bag assignment and pack completion state
- ready / shipped workflow transitions
- manifest export cues

Preserved adjacent behavior and handoffs:

- Orders continues to own the order workflow before shipping launch
- carrier or delivery-document execution can stay adjacent if not yet fully modeled here
- invoice/payment execution remains outside Shipping

Final-target layout shape:

- one dominant order queue
- one selected-order pick table
- one bag summary support region
- one secondary inspector for client, location, and fulfillment context

Width budget and default visible columns:

- `Status`
- `Order`
- `Client`
- `Items`
- `Packed`
- `Bags`
- `Next`

Key data contracts:

- `pickPack.getPickList`
- `pickPack.getOrderDetails`
- `pickPack.packItems`
- `pickPack.markAllPacked`
- `pickPack.unpackItems`
- `pickPack.markOrderReady`
- `pickPack.getStats`
- `orders.shipOrder`

Workflow rules:

- workflow status remains explicit after any selection or bulk pack action
- queue state must not blank after status changes
- bagging support stays tied to the active order, not a detached modal-first flow

Artboards to generate:

- `shipping-sheet.svg`

### 4. Accounting -> Invoices

Golden-flow anchor:

- `GF-006 Invoice Lifecycle (List / PDF / Create)`

Workbook and sheet:

- workbook: `Accounting`
- sheet: `Invoices`

Route truth:

- current oracle route: `/accounting?tab=invoices`
- proposed sheet-native route: `/accounting?tab=invoices&surface=sheet-native`

Sheet archetype:

- `review registry`

Owned directly in the sheet:

- invoice browse, filter, and search
- status review and aging context
- PDF download and print actions
- invoice generation entry from confirmed order context
- explicit payment handoff

Preserved adjacent behavior and handoffs:

- general-ledger truth stays read-only context here
- full payment execution moves into Payments
- bank reconciliation remains outside the Invoices sheet

Final-target layout shape:

- one dominant invoices table
- one compact aging summary strip
- one selected-invoice detail and line-item support region
- one secondary inspector for GL status, reminders, PDF, and print actions

Width budget and default visible columns:

- `Status`
- `Invoice`
- `Client`
- `Due`
- `Paid`
- `Balance`
- `Aging`

Key data contracts:

- `accounting.invoices.list`
- `accounting.invoices.getById`
- `accounting.invoices.getARAging`
- `accounting.invoices.create`
- `invoices.downloadPdf`
- `invoices.generateFromOrder`
- `accounting.invoices.updateStatus`
- `accounting.ledger.list` as read-only evidence

Workflow rules:

- payment recording is launched explicitly, not embedded into invoice rows by default
- invoice output actions must remain obvious and trustworthy
- overdue and partial-payment cues must stay visible in the default table and summary strip

Artboards to generate:

- `invoices-sheet.svg`

### 5. Accounting -> Payments

Golden-flow anchor:

- `GF-007 Record Payment (Invoice to Payment Flow)`

Workbook and sheet:

- workbook: `Accounting`
- sheet: `Payments`

Route truth:

- current oracle routes: `/accounting?tab=payments` and `/accounting/payments`
- proposed sheet-native route: `/accounting?tab=payments&surface=sheet-native`
- compatibility deep links to preserve during transition: `/accounting/payments?id=:paymentId`, `/accounting?tab=payments&id=:paymentId`

Sheet archetype:

- `guided transaction plus registry`

Owned directly in the sheet:

- outstanding invoice selection
- payment amount and method entry
- payment reference and notes
- payment recording and receipt intent
- recent payment history and quick audit context

Preserved adjacent behavior and handoffs:

- invoice truth remains on the Invoices sheet
- bank reconciliation and treasury workflows remain adjacent
- supplier-payments and AP flows are adjacent, not swallowed into this first-pass sheet

Final-target layout shape:

- one dominant outstanding-invoices table
- one guided step card for review, payment details, and confirm
- one recent-payments support table
- one compact accounting summary strip for received, sent, and unapplied context

Width budget and default visible columns:

- `Invoice`
- `Client`
- `Due`
- `Amount Due`
- `Aging`
- `Selected`
- `Action`

Key data contracts:

- `accounting.payments.list`
- `accounting.payments.generateNumber`
- `accounting.payments.create`
- `accounting.invoices.getById`
- `payments.getClientOutstandingInvoices`

Authoritative commit rule:

- the spreadsheet-native `Record Payment` confirm step should call `accounting.payments.create`
- `payments.getClientOutstandingInvoices` remains valid read-context for outstanding invoice selection in legacy and companion flows
- `payments.recordPayment` and `accounting.invoices.recordPayment` are legacy compatibility references, not the spreadsheet-native confirm contract for this pack

Workflow rules:

- spreadsheet edits only stage payment inputs and invoice selection
- the financial commit happens only through an explicit `Record Payment` action that calls `accounting.payments.create`
- payment execution remains a guided, trust-heavy transaction even inside spreadsheet-native layout
- confirmation must show invoice impact before commit
- receipt and reference behavior stay explicit, not hidden behind defaults
- the guided payment review surface must read as a primary commit stage, not an inspector-only afterthought

Artboards to generate:

- `payments-sheet.svg`

### 6. Accounting -> Client Ledger

Golden-flow anchor:

- `GF-008 Client Ledger Review`

Workbook and sheet:

- workbook: `Standalone Ledger`
- sheet: `Client Ledger`

Route truth:

- current oracle routes: `/client-ledger` and `/clients/:clientId/ledger`
- proposed sheet-native route: `/client-ledger?surface=sheet-native`
- compatibility routes to preserve during transition: `/client-ledger`, `/clients/:clientId/ledger`
- note: this module keeps its standalone path because current TERP routing does not mount Client Ledger as an Accounting workspace tab

Sheet archetype:

- `review ledger`

Owned directly in the sheet:

- client selection
- transaction ledger browse and filter
- running balance review
- export
- adjustment entry with explicit permission gating
- jumps back to source order, invoice, or PO context

Preserved adjacent behavior and handoffs:

- source transaction editing remains in the owning module
- general-ledger journal operations remain outside this sheet

Final-target layout shape:

- one dominant ledger table
- one compact client summary strip
- one filter and date-range support rail above the table
- one secondary inspector for transaction detail and source navigation

Width budget and default visible columns:

- `Date`
- `Type`
- `Description`
- `Reference`
- `Debit`
- `Credit`
- `Running Balance`

Key data contracts:

- `clientLedger.getLedger`
- `clientLedger.getTransactionTypes`
- `clientLedger.addLedgerAdjustment`
- `clientLedger.exportLedger`
- source-route linking back to orders, invoices, payments, and purchase orders

Workflow rules:

- review is the default behavior; adjustments stay explicit and permission-gated
- reference jumps must preserve accounting context and not feel like hidden drill-throughs
- running balance must remain visually legible under filter changes
- the compact client summary strip should still surface running balance when the detail inspector is open

Artboards to generate:

- `client-ledger-sheet.svg`

### 7. Sales -> Returns

Golden-flow anchors:

- `GF-009 Returns Management`
- `GF-012 Order Return Actions`

Workbook and sheet:

- workbook: `Sales`
- sheet: `Returns`

Route truth:

- current oracle route: `/sales?tab=returns`
- proposed sheet-native route: `/sales?tab=returns&surface=sheet-native`
- compatibility route to preserve during transition: `/returns`

Sheet archetype:

- `exception queue plus document`

Golden-flow split and conflict rule:

- `GF-009` governs return record creation, line selection, optional restock, optional credit handoff initiation, and GL reversal visibility.
- `GF-012` governs the order-side lifecycle after a shipped or delivered order is marked returned and follow-up actions such as restock or vendor-return consequences are triggered.
- When both flows apply, the Returns sheet prioritizes the `GF-009` compose-and-review workflow as the primary surface and exposes `GF-012` order-state transitions as linked context plus explicit follow-up actions.
- The sheet must not hide `GF-012` state, but it also must not turn the order-status transition into an implicit side effect of editing return rows.

Owned directly in the sheet:

- return queue browse and stats
- order lookup and line-item selection
- return reason, qty, and notes entry
- restock toggle and return processing
- credit handoff initiation with explicit CTA
- GL reversal status visibility

Preserved adjacent behavior and handoffs:

- order-origin return initiation remains visible from Orders
- inventory correction and vendor-return consequences remain explicit system actions, not implicit cell behavior
- refund and credit execution stay Accounting-owned even when the Returns sheet initiates the handoff

Final-target layout shape:

- one dominant return queue
- one selected-return items table or compose panel
- one exception summary strip
- one linked order-context clarification band for `GF-012` state and explicit follow-up actions
- one secondary inspector for GL status, notes, and restock evidence

Width budget and default visible columns:

- `Status`
- `Return`
- `Order`
- `Client`
- `Reason`
- `Qty`
- `Next`

Key data contracts:

- `returns.getAll`
- `returns.getStats`
- `returns.create`
- `returns.approve`
- `returns.reject`
- `returns.receive`
- `returns.process`
- `returns.getSummary`
- `orders.getOrderWithLineItems`
- `orders.getOrderReturns`

Workflow rules:

- return creation must stay explicit and reviewable before commit
- restock is a visible decision, not a silent consequence
- GL status must remain visible without making the inspector the main workflow surface
- the `GF-012` clarification band must carry an explicit cross-sheet CTA for order-state follow-up and credit handoff

Artboards to generate:

- `returns-sheet.svg`

### 8. Operations -> Samples

Golden-flow anchor:

- `GF-010 Sample Request (Create + Manage)`

Workbook and sheet:

- workbook: `Operations`
- sheet: `Samples`

Route truth:

- current oracle route: `/inventory?tab=samples`
- proposed sheet-native route: `/inventory?tab=samples&surface=sheet-native`
- compatibility route to preserve during transition: `/samples`

Sheet archetype:

- `lane-based registry`

Owned directly in the sheet:

- sample request creation
- sample list browse with operator lanes
- return request and approval workflow
- ship-to-vendor and location updates
- expiring-samples awareness

Preserved adjacent behavior and handoffs:

- live-shopping sample initiation remains an external entry path into this sheet, not a separate spreadsheet surface
- inventory truth for batch quantities remains adjacent read/write support, not user-authored spreadsheet logic

Final-target layout shape:

- one dominant samples table
- one compact lane and status strip
- one expiring-samples support card
- one secondary inspector or action tray for return, vendor, and location flows

Width budget and default visible columns:

- `Lane`
- `Request`
- `Client`
- `Products`
- `Status`
- `Location`
- `Due`

Key data contracts:

- `samples.getAll`
- `samples.createRequest`
- `samples.cancelRequest`
- `samples.requestReturn`
- `samples.approveReturn`
- `samples.completeReturn`
- `samples.shipToVendor`
- `samples.updateLocation`
- `samples.getExpiring`
- `samples.productOptions`

Workflow rules:

- create, return, vendor shipment, and location updates stay explicit and permission-aware
- lane state must remain legible even when search and status filters are active
- expiring samples stay visible without taking over the main table width budget

Artboards to generate:

- `samples-sheet.svg`

### 9. Sales -> Sales Sheets

Preservation anchor:

- `DF-021 Sales Sheets`
- explicit seeded handoff into `GF-003 Create & Finalize Order`

`DF-021` definition:

- `DF-021` is the current Sales Sheets capability cluster: client-priced inventory browse, save/share history, public shared-sheet output, and explicit conversion into downstream sales workflows
- grounding sources: `docs/roadmaps/COMPREHENSIVE_ROADMAP_REVIEW_2026-01-20.md`, `docs/reference/USER_FLOW_MATRIX.csv`, `client/src/pages/SalesSheetCreatorPage.tsx`, `client/src/components/sales/SalesSheetPreview.tsx`, `server/routers/salesSheets.ts`

Workbook and sheet:

- workbook: `Sales`
- sheet: `Sales Sheets`

Route truth:

- current oracle route: `/sales?tab=sales-sheets`
- legacy compatibility route: `/sales-sheets`
- proposed sheet-native route: `/sales?tab=sales-sheets&surface=sheet-native`

Sheet archetype:

- `review surface + conversion panel`

Owned directly in the sheet:

- client-specific priced inventory browse
- item selection and reorder
- draft naming, save, autosave, load, and delete
- saved views and default-view recall
- saved-sheet history reopen
- template and branding controls remain visible as customer-facing output settings
- export and share prep
- explicit order, quote, and live-session conversion entry

Preserved adjacent behavior and handoffs:

- final order composition remains in the Sales Order document after explicit handoff
- client-facing shared sheet view remains a distinct share surface
- live shopping execution remains adjacent, not absorbed into the sales-sheet builder

Final-target layout shape:

- one dominant priced inventory browser on the left
- one sticky preview and conversion panel on the right
- one compact draft and client-context strip above the main split view
- one visible handoff strip below the split view for share, route-seeded order conversion, and live-session ownership

Width budget and default visible columns:

- `Product`
- `Category`
- `Qty`
- `Retail`
- `COGS`
- `Selected`

Key data contracts:

- `salesSheets.getInventory`
- `salesSheets.save`
- `salesSheets.generateShareLink`
- `salesSheets.getById`
- `salesSheets.saveDraft`
- `salesSheets.getDrafts`
- `salesSheets.getDraftById`
- `salesSheets.deleteDraft`
- `salesSheets.getViews`
- `salesSheets.loadView`
- `salesSheets.saveView`
- `salesSheets.setDefaultView`
- `salesSheets.getHistory`
- `salesSheets.convertToOrder`
- `salesSheets.convertToLiveSession`

Conversion rule:

- `To Order` and `To Quote` both use `salesSheets.convertToOrder`
- quote conversion is the same mutation with `orderType=QUOTE`
- order creation can stay route-seeded from the resulting sheet/order context without inventing a second quote-only endpoint
- current router evidence: `server/routers/salesSheets.ts` defines `convertToOrder` with `orderType: z.enum(["DRAFT", "QUOTE", "ORDER"]).default("DRAFT")`

Workflow rules:

- spreadsheet edits curate a customer-facing sheet and preview only
- share and convert actions must stay blocked while unsaved changes remain
- conversion into Sales Order or Quote remains an explicit user action
- selected items and client context must survive route-seeded handoff into the Sales Order document
- the artboard must show a visible dirty-state treatment where conversion buttons are blocked until save completes

### 9.1 Orders -> Sales Order Document

Golden-flow anchors:

- `GF-003 Sales Order Creation`
- `GF-004 Sales Order Review + Whole Order Changes`

Workbook and sheet:

- workbook: `Orders`
- sheet: `Sales Order`

Route truth:

- current oracle routes: `/orders/create`, `/orders`, route-seeded entry from Sales Sheets and other create surfaces
- proposed sheet-native route: `/orders/create?surface=sheet-native`

Owned directly in the sheet:

- seeded entry context from draft, quote, client, need, and sales-sheet routes
- dominant inventory browser and add-item workspace
- dominant sales-order header and line-item grid
- referral and credit support modules
- whole-order changes support region
- autosave, unsaved-change trust cues, pricing, validation, and finalize guardrails

Preserved adjacent behavior and handoffs:

- layout follows the directional reference in `sales-order-creation-direction.md`
- the screenshot direction is layout guidance only and cannot remove order-create functionality
- `orders-document.svg` remains a compatibility alias for the canonical `sales-order-sheet.svg` artboard

Final-target layout shape:

- one dominant left inventory region
- one dominant right sales-order region
- compact referral and credit support modules below the left region
- one whole-order-changes support region below the right region
- save state and finalize actions anchored without collapsing P0 columns

Workflow rules:

- default desktop view assumes inspectors stay collapsed until needed so P0 inventory and order columns remain legible
- support modules must stay compact enough that they do not steal the main table budgets
- directional layout cannot reduce seeded-entry coverage, pricing trust cues, or finalize clarity

Artboards to generate:

- `sales-order-sheet.svg`
- `orders-document.svg`

Artboards to generate:

- `sales-sheet.svg`

## Pack Definition

The complete Figma import pack for this turn should include:

- `orders-queue.svg`
- `orders-document.svg`
- `sales-order-sheet.svg`
- `inventory-sheet.svg`
- `receiving-sheet.svg`
- `purchase-orders-sheet.svg`
- `shipping-sheet.svg`
- `invoices-sheet.svg`
- `payments-sheet.svg`
- `client-ledger-sheet.svg`
- `returns-sheet.svg`
- `samples-sheet.svg`
- `sales-sheet.svg`
- `shared-primitives.svg`

Specific note for `orders-document.svg`:

- regenerate it using the directional composition documented in `sales-order-creation-direction.md`
- preserve all previously documented order-create functionality even when the visual hierarchy changes

Pack QA rule:

- every artboard named in an `Artboards to generate` block or called out as an explicit deliverable must also appear in this Pack Definition list
- every artboard named in this Pack Definition list must also be confirmed present in `docs/design/spreadsheet-native-golden-flows-2026-03-18/` before the pack is declared complete

## Pre-Build QA Questions For Claude Review

The adversarial QA pass should specifically try to break this pack by asking:

- did any module quietly absorb adjacent-owned execution
- did any module lose a golden-flow capability by compressing layout
- did any module violate the width-discipline rules already set for Orders and Inventory
- did any proposed sheet-native route drift away from the current TERP shell conventions
- did any module overuse inspectors or modal thinking instead of sheet-native grammar
- did the payment, returns, or receiving specs hide trust-critical transitions behind generic spreadsheet language

## Clarifications Added After Adversarial QA

- Shipping now names the current pick-pack contracts explicitly instead of referring to vague assignment mutations.
- Payments now states the staging-versus-commit rule directly so spreadsheet edits prepare a payment but never post one by themselves.
- Client Ledger now preserves the current standalone path shape rather than silently moving into an Accounting tab that does not exist today.
- Returns now distinguishes the `GF-009` create-and-process workflow from the `GF-012` order-return status workflow so artboards do not collapse two different truths into one ambiguous screen.
- The guardrails now define a concrete viewport-width assumption and a reusable visible-adjacency pattern so the layout rules can actually be tested during artboard review.
