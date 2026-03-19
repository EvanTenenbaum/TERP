# Spreadsheet-Native Build Source of Truth

Date: `2026-03-19`  
Status: `active implementation planning baseline`

## Blocked Status

No row in this packet is cleared for implementation yet.

This packet is the gate-zero implementation source of truth, but every row in the pack-level ledger remains `pack-only / blocked` until the prerequisite module-specific detailed ledger exists and is verified.

## Decision

Yes, now is the time to pivot from mock-first iteration to literal capability preservation planning.

The governing spreadsheet-native contracts already say:

- no module should be redesigned without a capability ledger
- no blueprint should proceed on intuition alone
- current code is the top source of truth when docs and mocks drift

That means the most efficient next step is not more broad Figma revision. It is a reality-first implementation packet that turns the existing TERP behavior into a build contract and treats the Figma work as directional UI reference only.

## What This Packet Is

This folder is the implementation-first handoff for the March spreadsheet-native work.

It provides:

- the source appendix for the current spreadsheet-native pack
- the pack-level capability ledger for modules that do not yet have detailed ledgers
- the discrepancy log and exception framing needed to avoid accidental feature loss
- the next-step execution order for turning remaining pack areas into build-ready module ledgers

## What This Packet Is Not

- It is not a claim that spreadsheet-native parity is complete.
- It is not a replacement for the existing detailed Orders or Inventory ledgers.
- It is not permission to literalize placeholder controls from the Figma pack.
- It is not evidence that any module is ready to implement without checking the stop rules below.

## Source Appendix

Snapshot:

- Commit: `0e2bb8ba5edfb9c9b1e1b836acb50a8c9348cfae`
- Extracted: `2026-03-19`
- Owner: `Codex`
- Checked against: `targeted current-code procedure confirmation + current docs + review artifacts`
- Unresolved discrepancy count:
- `P0: 0`
- `P1: 5`
- `P2: 5`

Verification mode:

- targeted `rg` confirmation of named procedures, routes, and components on `2026-03-19`
- not a full line-by-line extracted code appendix
- enough to confirm that the named anchors in this packet are real current code surfaces, but not enough to replace future module-specific source appendices

Primary sources used here:

- `docs/specs/SPREADSHEET-NATIVE-INTERACTION-SOURCE-OF-TRUTH-CONTRACT.md`
- `docs/specs/SPREADSHEET-NATIVE-CAPABILITY-LEDGER-TEMPLATE.md`
- `docs/specs/spreadsheet-native-foundation/OWNERSHIP-SEAMS-MEMO.md`
- `docs/specs/ui-ux-strategy/FEATURE_PRESERVATION_MATRIX.md`
- `docs/reference/FLOW_GUIDE.md`
- `docs/reference/USER_FLOW_MATRIX.csv`
- `docs/features/USER_FLOWS.md`
- `docs/design/spreadsheet-native-golden-flows-2026-03-18/figma-to-terp-pack-reality-audit.md`
- `docs/design/spreadsheet-native-golden-flows-2026-03-18/figma-to-terp-pack-revision-brief.md`
- `artifacts/video-feedback/2026-03-19-figma-review/deep_pass_review.md`
- `artifacts/video-feedback/2026-03-19-figma-review/05_tasks/actionable_tasks.md`
- `artifacts/video-feedback/2026-03-19-figma-review/06_prds/prd_draft.md`

Current code anchors checked for this packet:

- `client/src/pages/SalesWorkspacePage.tsx`
- `client/src/pages/OrderCreatorPage.tsx`
- `client/src/pages/SalesSheetCreatorPage.tsx`
- `client/src/components/sales/SalesSheetPreview.tsx`
- `client/src/components/sales/SalesSheetTemplates.tsx`
- `server/routers/salesSheets.ts`
- `client/src/components/work-surface/DirectIntakeWorkSurface.tsx`
- `client/src/components/work-surface/PurchaseOrdersWorkSurface.tsx`
- `client/src/components/uiux-slice/PurchaseOrdersSlicePage.tsx`
- `server/routers/poReceiving.ts`
- `client/src/components/work-surface/PickPackWorkSurface.tsx`
- `server/routers/pickPack.ts`
- `client/src/components/work-surface/InvoicesWorkSurface.tsx`
- `client/src/components/work-surface/golden-flows/InvoiceToPaymentFlow.tsx`
- `client/src/components/work-surface/PaymentInspector.tsx`
- `client/src/components/accounting/RecordPaymentDialog.tsx`
- `client/src/pages/accounting/Payments.tsx`
- `server/routers/accounting.ts`
- `server/routers/payments.ts`
- `client/src/components/work-surface/ClientLedgerWorkSurface.tsx`
- `server/routers/clientLedger.ts`
- `client/src/pages/ReturnsPage.tsx`
- `server/routers/returns.ts`
- `server/routers/refunds.ts`
- `server/routers/orders.ts`
- `client/src/pages/SampleManagement.tsx`
- `client/src/components/samples/ExpiringSamplesWidget.tsx`
- `server/routers/samples.ts`
- `client/src/lib/spreadsheet-native/SpreadsheetPilotGrid.tsx`
- `client/src/components/spreadsheet/PowersheetGrid.tsx`
- `client/src/components/spreadsheet-native/SheetModeToggle.tsx`

Representative confirmed procedures and exports:

- Sales Sheets: `salesSheets.getInventory`, `salesSheets.saveDraft`, `salesSheets.getDraftById`, `salesSheets.convertToOrder`, `salesSheets.convertToLiveSession`
- Intake and PO Receiving: `inventory.intake`, `inventory.uploadMedia`, `inventory.deleteMedia`, `poReceiving.getPendingReceiving`, `poReceiving.receiveGoodsWithBatch`
- Purchase Orders: `purchaseOrders.submit`, `createProductIntakeDraftFromPO`
- Fulfillment: `pickPack.getPickList`, `pickPack.getOrderDetails`, `pickPack.packItems`, `pickPack.markOrderReady`
- Payments: `accounting.payments.create`, `accounting.receiveClientPayment`, `accounting.paySupplier`, `payments.recordPayment`, `payments.void`
- Ledger and financial outputs: `clientLedger.exportLedger`, invoice PDF and print actions, payment receipt route
- Returns: `returns.approve`, `returns.reject`, `returns.receive`, `returns.process`, `refunds.create`, `orders.processRestock`, `orders.processVendorReturn`
- Samples: `samples.requestReturn`, `samples.approveReturn`, `samples.requestVendorReturn`, `samples.getMonthlyAllocation`, `samples.getExpiring`

## Source Precedence And Stop Rule

Use this order when anything disagrees:

1. current code and verified current behavior
2. `USER_FLOW_MATRIX.csv`
3. `FLOW_GUIDE.md`
4. `USER_FLOWS.md`
5. `FEATURE_PRESERVATION_MATRIX.md`
6. Figma pack and related review artifacts

Stop rule:

- if a `P0` or `P1` capability conflicts between code and this packet, code wins and the packet must be updated before build work continues
- if a module has only pack-level coverage here and not its own detailed ledger yet, do not declare that module build-ready
- `Preservation Entry Status = verified` is only allowed when the referenced prerequisite artifact already exists at a resolvable path in the repo
- use the CSV `Build Readiness` column as the machine-readable backstop for that rule

Decomposition rule:

- pack-level rows are a floor, not a ceiling
- when a detailed ledger uncovers additional distinct capabilities, preserve them as net-new detailed rows instead of forcing a fake 1:1 row count with the pack CSV

## Existing Authoritative Ledgers Reused

These are already stronger than anything a new pack-level summary should try to replace:

- `docs/specs/spreadsheet-native-ledgers/sales-orders-sheet-capability-ledger.csv`
- `docs/specs/spreadsheet-native-ledgers/sales-orders-sheet-capability-ledger-summary.md`
- `docs/specs/spreadsheet-native-ledgers/operations-inventory-sheet-capability-ledger.csv`
- `docs/specs/spreadsheet-native-ledgers/operations-inventory-sheet-capability-ledger-summary.md`
- `docs/specs/spreadsheet-native-ledgers/sales-sheets-capability-ledger.csv`
- `docs/specs/spreadsheet-native-ledgers/sales-sheets-capability-ledger-summary.md`
- `docs/specs/spreadsheet-native-ledgers/direct-intake-capability-ledger.csv`
- `docs/specs/spreadsheet-native-ledgers/direct-intake-capability-ledger-summary.md`
- `docs/specs/spreadsheet-native-ledgers/purchase-orders-capability-ledger.csv`
- `docs/specs/spreadsheet-native-ledgers/purchase-orders-capability-ledger-summary.md`

Interpretation:

- `Orders` and `Inventory` are already in the detailed-ledger phase.
- This new packet should point to them, not paraphrase them into weaker prose.

## Temporary Preservation Stubs Introduced Here

Two areas did not have enough existing preservation coverage to leave as `none found` safely at pack level.

- `STUB-PAY-001`
  - temporary pack-level preservation stub for Payments
  - anchored to `DF-003` plus `ACCT-008`, `ACCT-009`, and `ACCT-010`
  - exists to prevent the accounting tranche from proceeding with zero preservation backstop
- `STUB-CROSS-001`
  - temporary pack-level preservation stub for shared spreadsheet-native primitives
  - anchored to `DF-073`, `DF-074`, and `DF-076`
  - exists to prevent the foundation layer from remaining formally unprotected

These are not a substitute for future dedicated preservation rows. They are an explicit safety bridge until the next detailed module-ledger pass.

## Workbook Coverage Map

| Surface                       | Implementation truth artifact                                                 | Current readiness                                   |
| ----------------------------- | ----------------------------------------------------------------------------- | --------------------------------------------------- |
| Sales -> Orders               | existing Orders detailed ledger                                               | detailed ledger already exists                      |
| Operations -> Inventory       | existing Inventory detailed ledger                                            | detailed ledger already exists                      |
| Sales -> Sales Sheets         | `docs/specs/spreadsheet-native-ledgers/sales-sheets-capability-ledger.csv`    | detailed ledger now exists                          |
| Operations -> Intake          | `docs/specs/spreadsheet-native-ledgers/direct-intake-capability-ledger.csv`   | detailed ledger now exists                          |
| Purchasing -> Purchase Orders | `docs/specs/spreadsheet-native-ledgers/purchase-orders-capability-ledger.csv` | detailed ledger now exists                          |
| Operations -> Fulfillment     | pack-level ledger in this folder                                              | mapped, still needs module-specific ledger          |
| Accounting -> Invoices        | pack-level ledger in this folder                                              | mapped, still needs module-specific ledger          |
| Accounting -> Payments        | pack-level ledger in this folder                                              | mapped, still needs module-specific ledger          |
| Accounting -> Client Ledger   | pack-level ledger in this folder                                              | mapped, still needs module-specific ledger          |
| Sales -> Returns              | pack-level ledger in this folder                                              | mapped, still needs module-specific ledger          |
| Operations -> Samples         | pack-level ledger in this folder                                              | mapped, still needs module-specific ledger          |
| Cross-pack seams              | pack-level ledger in this folder                                              | mapped, must stay visible during every module build |

## Cross-Cutting Build Directives

### 1. Figma is directional only

The current pack is useful for layout, density, hierarchy, and workflow feel.

It is not allowed to silently delete or narrow current TERP behavior just because a mock omitted it.

### 2. No hidden loss of seeded entry, drafts, or trust-critical commits

Do not lose:

- `fromSalesSheet=true` entry
- `sessionStorage["salesSheetToQuote"]`
- `orders.createDraftEnhanced`
- `orders.updateDraftEnhanced`
- `orders.finalizeDraft`
- dirty-state gates before destructive conversion
- explicit commit actions for payments, shipping readiness, returns processing, and other trust-critical transitions

### 3. Outputs and document contracts are first-class

Do not demote these to optional polish:

- invoice PDF download and print
- payment receipt generation
- sales-sheet preview/share/export flows
- ledger export
- intake and purchase-order CSV/export behaviors
- order and accounting output adjacency where current code already exposes it

### 4. Sibling surfaces stay visible when they already exist

Do not collapse these into fake single-sheet completeness:

- Quotes
- Live Shopping
- Receipts and discrepancy flows
- legacy versus guided payments when both are still real

### 5. Spreadsheet-native UX signals from the recording are valid, but only as interpretation rules

Carry forward:

- more density
- broader search
- faster direct actionability
- less tutorialized chrome
- operator-native notes and bulk actions

Do not turn those signals into fake controls that contradict current behavior.

### 6. Terminology must reconcile to TERP policy, not artifact filenames

Visible language should preserve:

- `Sales Order`, not `Sale`
- `Intake`, not `Receiving`
- `Fulfillment` for the lifecycle, with `Ship` reserved for the ship step

Compatibility filenames may stay for artifact continuity, but visible product language must not drift.

## Module Build Directives

Important read rule for every module section below:

- named procedures and routes are confirmed current code anchors
- behavioral contracts are not fully verified at pack level
- module-specific ledger authors must still confirm contract details, state transitions, and edge handling before writing parity tests or implementation plans

### Sales Sheets

Routes and anchors:

- `/sales?tab=sales-sheets`
- `/sales-sheets`
- `SalesSheetCreatorPage.tsx`
- `SalesSheetPreview.tsx`
- `SalesSheetTemplates.tsx`
- `server/routers/salesSheets.ts`

Must preserve:

- inventory sourcing through `getInventory`
- client-sensitive pricing context
- draft save/load through `saveDraft` and `getDraftById`
- history and saved-view behavior through `getHistory`, `saveView`, `getViews`, and `setDefaultView`
- outward-facing output path through preview, share link, and image or PDF generation
- conversion bridges through `convertToOrder` and `convertToLiveSession`

Review direction that still matters:

- treat density as a real requirement
- make media and output readiness visible
- keep `Sales Sheet` versus `Sales Catalog` as an explicit product decision, not an accidental rename

Do not literalize:

- a renamed product term without explicit approval
- preview-only affordances as if they replace builder behavior

Detailed ledger now exists:

- `docs/specs/spreadsheet-native-ledgers/sales-sheets-capability-ledger.csv`
- `docs/specs/spreadsheet-native-ledgers/sales-sheets-discrepancy-log.md`

### Intake

Routes and anchors:

- `/inventory?tab=receiving`
- `DirectIntakeWorkSurface.tsx`
- `server/routers/inventory.ts`
- `server/routers/poReceiving.ts`

Must preserve:

- direct-intake row drafting and editing for pending rows
- notes and media attachments
- single-row and bulk submission
- validation and cleanup behavior around failed media or row errors
- explicit branch distinction between Direct Intake and PO Receiving

Review direction that still matters:

- reduce patronizing or tutorialized framing
- make bulk actions, filters, and shared notes feel native
- give the main working surface more room

Do not literalize:

- a simplified intake page that hides validation or branch differences

Detailed ledger now exists:

- `docs/specs/spreadsheet-native-ledgers/direct-intake-capability-ledger.csv`
- `docs/specs/spreadsheet-native-ledgers/direct-intake-discrepancy-log.md`

### Purchase Orders

Routes and anchors:

- `/purchase-orders`
- `client/src/components/uiux-slice/PurchaseOrdersSlicePage.tsx`
- `PurchaseOrdersWorkSurface.tsx`
- `server/routers/purchaseOrders.ts`
- `server/routers/poReceiving.ts`

Must preserve:

- PO drafting, line editing, and submit
- bulk quantity and COGS workflows
- internal notes and export
- pending receiving queue
- `createProductIntakeDraftFromPO` handoff

Review direction that still matters:

- none from the recording strong enough to override current behavior

Do not literalize:

- visual presence in the deck as if it were reviewed approval

Detailed ledger now exists:

- `docs/specs/spreadsheet-native-ledgers/purchase-orders-capability-ledger.csv`
- `docs/specs/spreadsheet-native-ledgers/purchase-orders-discrepancy-log.md`

### Fulfillment

Routes and anchors:

- `/inventory?tab=shipping`
- `/pick-pack`
- `PickPackWorkSurface.tsx`
- `server/routers/pickPack.ts`

Must preserve:

- pick-list browse, search, filter, and order-detail inspection
- bag counts and existing bag identifiers
- item-to-bag assignment state
- pack, unpack, `markAllPacked`, and `markOrderReady`
- export behavior and keyboard-support cues

Review direction that still matters:

- bagging must be first-class
- manual and automatic bagging both need room
- split-bag scenarios are real
- lower-value support panels should not crowd the main action surface
- manifest language should not dominate the UI

Do not literalize:

- a pure shipping or manifest model that erases bag logic

Next mapping step:

- create the Fulfillment ledger with explicit bagging, readiness, and output rows before build work

### Invoices

Routes and anchors:

- `/accounting?tab=invoices`
- `InvoicesWorkSurface.tsx`

Must preserve:

- invoice browse, filter, and row selection
- payment handoff
- send or remind behavior
- mark-paid and void actions
- PDF download and print output

Review direction that still matters:

- none from the recording is strong enough to rewrite this surface

Do not literalize:

- the current slide as if it reflects a reviewed final invoice workflow

Next mapping step:

- create the Invoices ledger and tie it to the output-ownership seam

### Payments

Routes and anchors:

- `/accounting?tab=payments`
- `/accounting/payments`
- `Payments.tsx`
- `InvoiceToPaymentFlow.tsx`
- `PaymentInspector.tsx`
- `RecordPaymentDialog.tsx`
- `server/routers/accounting.ts`
- `server/routers/payments.ts`

Must preserve:

- payments registry search and filtering
- buyer-level payment logic through the newer accounting surface
- invoice allocation and preview behavior
- receipt generation
- legacy `recordPayment` and `void` behavior while it still exists
- supplier-payment adjacency where the accounting router already models it

Review direction that still matters:

- design payments as buyer debt first and invoice allocation second
- keep AR context visible
- support global search and fast edits

Do not literalize:

- invoice-only payment entry
- the assumption that guided flow already replaces every legacy path

Next mapping step:

- create the Payments ledger with explicit guided-path and legacy-path rows

### Client Ledger

Routes and anchors:

- `/client-ledger`
- `/clients/:clientId/ledger`
- `ClientLedgerWorkSurface.tsx`
- `server/routers/clientLedger.ts`

Must preserve:

- running balance review
- date and type filtering
- linked transaction context
- adjustments
- export

Review direction that still matters:

- keep it simple and reusable
- improve clarity without overbuilding

Do not literalize:

- a generalized multi-ledger framework from this single approval signal

Next mapping step:

- create the Client Ledger ledger and keep it tightly scoped to current behavior

### Returns

Routes and anchors:

- `/sales?tab=returns`
- `/returns`
- `ReturnsPage.tsx`
- `server/routers/returns.ts`
- `server/routers/refunds.ts`
- `server/routers/orders.ts`

Must preserve:

- returns queue, stats, and creation
- approve and reject
- receive and process
- refund creation
- order-linked staged return actions including restock and vendor-return flows

Review direction that still matters:

- none from the recording is strong enough to simplify this lifecycle

Do not literalize:

- the current broad Returns artboard as if it covers the real deeper lifecycle already

Next mapping step:

- create the Returns ledger with separate rows for dedicated returns workflow, refunds, and order-linked staged returns

### Samples

Routes and anchors:

- `/inventory?tab=samples`
- `/samples`
- `SampleManagement.tsx`
- `ExpiringSamplesWidget.tsx`
- `server/routers/samples.ts`

Must preserve:

- request and manage sample flows
- location updates and history
- expiring-sample visibility
- return lifecycle
- vendor-return lifecycle
- monthly allocation and analytics behavior

Review direction that still matters:

- none from the recording is strong enough to narrow this module

Do not literalize:

- the current artboard as if it fully captures monthly allocation, expiration, analytics, or vendor-return depth

Next mapping step:

- create the Samples ledger before build work, because the current design pack under-models this module materially

### Shared And Cross-Pack Contracts

Must preserve:

- shared selection model, dirty state, save-state messaging, and keyboard discoverability
- terminology reconciliation
- Quotes as a sibling surface plus quote-mode seeded order entry
- Live Shopping as a sibling surface plus the Sales Sheet bridge
- outputs, exports, receipts, PDFs, and print contracts across modules
- role and route parity even when the exact permission strings still need tightening

Current anchors:

- `SpreadsheetPilotGrid.tsx`
- `PowersheetGrid.tsx`
- `SheetModeToggle.tsx`
- `SalesWorkspacePage.tsx`
- `OrderCreatorPage.tsx`
- `SalesSheetPreview.tsx`
- `OWNERSHIP-SEAMS-MEMO.md`
- `TERMINOLOGY_BIBLE.md`

## Areas The Artboards Still Do Not Cover Faithfully Enough

- the Quotes surface as a first-class sibling route
- the Live Shopping module as a first-class sibling route
- Returns depth, especially refunds and order-linked staged returns
- Samples depth, especially monthly allocation, expiration, and analytics
- output, print, receipt, and export contracts across modules
- the coexistence of guided and legacy payment flows
- permission and role precision at module level

## Exception Declaration

These behaviors may remain sidecars, sibling pages, or explicit exceptions instead of becoming one dense spreadsheet surface:

- Live Shopping
- Quotes registry
- API-only crypto and installment payment behavior
- receipt and discrepancy verification flows
- output or print surfaces that are adjacent to, but not the same as, the primary sheet

## Required Next Execution Order

1. Use this packet as the gate-zero implementation truth for the pack.
2. Keep Orders and Inventory on their existing detailed ledgers.
3. Expand the remaining modules into detailed ledgers in this order:
   - Shared and cross-pack contracts
   - Fulfillment
   - Invoices, Payments, and Client Ledger
   - Returns and Samples
4. For remaining modules that do not yet have a detailed ledger, explode the pack-level rows into module-specific capability rows, discrepancy logs, and parity-proof plans.
5. For Orders, Inventory, Sales Sheets, Direct Intake, and Purchase Orders, use the pointer rows and follow the existing detailed ledgers instead of rebuilding pack-level summaries.
6. Do not start implementation on a module until that module has its own detailed ledger or a verified reason for using the existing one.

## Definition Of Success For The Next Tranche

The next deep thorough step is not "make the mock prettier."

It is:

- every module has a detailed capability ledger
- every `P0` and `P1` capability is mapped to sheet-native, sidecar, exception, defer, or reject-with-evidence
- every output and adjacency contract is still visible
- every unresolved `P1` discrepancy is either resolved or explicitly blocking the module build
