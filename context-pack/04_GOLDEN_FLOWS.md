# 04_GOLDEN_FLOWS (Walkthrough Scripts + What To Verify)

These flows are grounded in the current route/component layout and backend logic.

If a UI step cannot be confirmed from the repo (for example: an API exists but the UI button isn’t found), it is marked **UNSPECIFIED** and the missing evidence is stated.

Legend:

- **RISK**: likelihood of downstream damage if wrong
- **BUSINESS CRITICALITY**: how essential the flow is for day-to-day operations

---

## GF-001: Direct Intake (Create Inventory Batch)

- RISK: High
- BUSINESS CRITICALITY: High

**Preconditions**

- User can run inventory mutations (public/demo user is blocked from most mutations).
  - Evidence: `server/_core/context.ts` (public user provisioning), `server/_core/trpc.ts` (mutation rejection unless Super Admin).
- Permission `inventory:create` is required.
  - Evidence: `server/routers/inventory.ts` (`intake` uses `requirePermission("inventory:create")`).

**User steps (UI)**

1. Go to `/direct-intake`.
   - Evidence: route exists in `client/src/App.tsx`.
2. Add a row and fill: vendor, brand, category/item, qty, COGS, site/location.
   - Evidence: E2E flow `tests-e2e/golden-flows/gf-001-direct-intake.spec.ts` (AG Grid interactions).
3. Click “Submit All”.
   - Evidence: same E2E spec.

**Expected outcomes (system + data)**

- UI indicates successful submission (toast + row shows “Submitted”).
  - Evidence: `tests-e2e/golden-flows/gf-001-direct-intake.spec.ts`.
- Backend writes a new batch (and supporting entities) inside a DB transaction.
  - Evidence: `server/routers/inventory.ts` (`inventory.intake` calls `processIntake`), `server/inventoryIntakeService.ts` (`processIntake` transaction).
- Batch defaults: `batchStatus = "AWAITING_INTAKE"`, quantities set (`onHandQty` from intake quantity, other buckets 0).
  - Evidence: `server/inventoryIntakeService.ts` (batch insert values).

**Verification proof (what to check in-app)**

- Search in `/inventory` for the brand/product you just created.
  - Evidence: `client/src/components/work-surface/InventoryWorkSurface.tsx` uses `trpc.inventory.list`.
- Confirm the new batch exists and `batchStatus` is `AWAITING_INTAKE`.
  - Evidence: `server/inventoryIntakeService.ts` sets `batchStatus`.

**Edge cases (at least 3)**

- COGS validation failures (bad range or missing value) should block intake.
  - Evidence: `server/inventoryIntakeService.ts` calls `inventoryUtils.validateCOGS` before transaction.
- Duplicate vendor/brand/product should re-use existing records (find-or-create behavior).
  - Evidence: `server/inventoryIntakeService.ts` uses `findOrCreate` for vendors/brands/products.
- Consignment intake: payable creation is attempted but may be skipped if “supplier client” can’t be found.
  - Evidence: `server/inventoryIntakeService.ts` (ownershipType "CONSIGNED" → tries to find `clients.name == vendorName`, logs warn if missing).

**Failure modes to watch for**

- Intake appears to succeed in UI but batch doesn’t show up in inventory list (could be query filters or transaction rollback).
  - Evidence: transaction wraps all inserts in `server/inventoryIntakeService.ts`.
- Permission/auth mismatch: UI loads but submit fails with UNAUTHORIZED.
  - Evidence: `server/_core/trpc.ts`.

---

## GF-002: Procure-to-Pay (Purchase Order Lifecycle)

- RISK: Medium
- BUSINESS CRITICALITY: Medium

**Preconditions**

- Purchase Orders screen accessible: `/purchase-orders`.
  - Evidence: route exists in `client/src/App.tsx`; UI is `client/src/components/work-surface/PurchaseOrdersWorkSurface.tsx`.

**User steps (UI)**

1. Go to `/purchase-orders`.
2. Create a PO (supplier + items + quantities + unit cost).
   - Evidence: `PurchaseOrdersWorkSurface.tsx` uses `trpc.purchaseOrders.create`.
3. Update PO status (DRAFT → SENT/CONFIRMED/RECEIVING/RECEIVED).
   - Evidence: `PurchaseOrdersWorkSurface.tsx` uses `trpc.purchaseOrders.updateStatus`.

**Expected outcomes (system + data)**

- A new `purchaseOrders` record exists with `purchaseOrderStatus` and PO number.
  - Evidence: `server/routers/purchaseOrders.ts` (`create` inserts into `purchaseOrders`).
- `purchaseOrderItems` rows exist for item lines.
  - Evidence: `server/routers/purchaseOrders.ts` (inserts into `purchaseOrderItems`).

**UNSPECIFIED / gap to validate live**

- “Receive goods into inventory” is mentioned in E2E spec descriptions, but Purchase Orders Work Surface code only shows status updates; there is no observed client usage of the `poReceiving` router.
  - Evidence (UI): no `trpc.poReceiving.*` usage found in `client/src`.
  - Evidence (API exists): `server/routers.ts` includes `poReceiving`.

**Verification proof**

- In `/purchase-orders`, newly created PO appears in list and inspector shows items.
  - Evidence: `PurchaseOrdersWorkSurface.tsx` uses `trpc.purchaseOrders.getAll`.

**Edge cases**

- Supplier validation: if using `supplierClientId`, it must be a seller client (`isSeller=true`).
  - Evidence: `server/routers/purchaseOrders.ts` (PARTY-001 validation).
- Legacy vendor mapping failures: schema still requires `vendorId`, and the router attempts to resolve it.
  - Evidence: `server/routers/purchaseOrders.ts` (“required by schema for now”).
- Concurrent edits: PO Work Surface tracks version for optimistic locking.
  - Evidence: `PurchaseOrdersWorkSurface.tsx` uses `useConcurrentEditDetection`.

**Failure modes**

- PO creation fails because supplier has no legacy vendor mapping.
  - Evidence: `server/routers/purchaseOrders.ts` throws if `resolvedVendorId` is missing.

---

## GF-003: Create & Finalize Order (Reserve Inventory) via Order Creator

- RISK: High
- BUSINESS CRITICALITY: High

Canonical decision: this is the long-term primary order-creation flow (`createDraftEnhanced` + `finalizeDraft`).
Evidence: `server/routers/orders.ts:703`, `server/routers/orders.ts:1074`.

**Preconditions**

- Inventory exists and has available quantity.
  - Evidence: `server/inventoryUtils.ts` (`calculateAvailableQty`).

**User steps (UI)**

1. Go to `/orders/create`.
   - Evidence: route exists in `client/src/App.tsx`; page is `client/src/pages/OrderCreatorPage.tsx`.
2. Select a client.
   - Evidence: `OrderCreatorPage.tsx` loads inventory via `trpc.salesSheets.getInventory` when client selected.
3. Add inventory items to the order (line items) and optionally apply an order-level adjustment.
   - Evidence: `OrderCreatorPage.tsx` builds `lineItems` for mutation.
4. Click preview/finalize, confirm.
   - Evidence: `OrderCreatorPage.tsx` (`handlePreviewAndFinalize` → `createDraftEnhanced` then `finalizeDraft`).

**Expected outcomes (system + data)**

- Draft is created (`orders.createDraftEnhanced`).
  - Evidence: `client/src/pages/OrderCreatorPage.tsx`.
- Finalization reserves inventory by incrementing `batches.reservedQty` (and decrements `sampleQty` for sample line items).
  - Evidence: `server/routers/orders.ts` (`finalizeDraft` updates `reservedQty` / `sampleQty`).

**Verification proof**

- In `/inventory`, the selected batches show increased `reservedQty` (and reduced available quantity).
  - Evidence: availability formula `server/inventoryUtils.ts`.

**Edge cases**

- Credit checks can warn/block depending on enforcement mode, but credit-check failures do not hard-stop finalization.
  - Evidence: `client/src/pages/OrderCreatorPage.tsx` (credit check error is logged and the order proceeds).
- Concurrency: finalize uses order `version` and `FOR UPDATE` locks.
  - Evidence: `server/routers/orders.ts` (`finalizeDraft` version check and locks).
- Insufficient inventory triggers BAD_REQUEST.
  - Evidence: `server/routers/orders.ts` (`finalizeDraft` availability check).

**Failure modes**

- Order appears finalized, but inventory is not reserved (would indicate finalizeDraft not called or transaction failed).
  - Evidence: two-step finalization in `OrderCreatorPage.tsx`.
- Client selection triggers helper endpoint failures (`credit.getVisibilitySettings`, `referrals.getSettings/getPendingCredits`) that degrade canonical flow usability.
  - Evidence: `server/routers/credit.ts:189`, `server/routers/referrals.ts:25`, `server/routers/referrals.ts:120`.

---

## GF-004: Legacy Draft Confirmation via Orders Work Surface (Non-Canonical Primary Flow)

- RISK: High
- BUSINESS CRITICALITY: High

This remains an active path in code/UI, but canonical policy is to use GF-003 for primary order creation and reserve semantics.
Evidence: `server/routers/orders.ts:614`, `client/src/components/work-surface/OrdersWorkSurface.tsx:598`.

**Preconditions**

- Draft order exists.
  - Evidence: Orders Work Surface fetches draft orders via `trpc.orders.getAll({ isDraft: true })` in `client/src/components/work-surface/OrdersWorkSurface.tsx`.

**User steps (UI)**

1. Go to `/orders`.
2. Open a draft order in the inspector.
3. Click “Confirm Order”.
   - Evidence: `OrdersWorkSurface.tsx` triggers `trpc.orders.confirmDraftOrder`.

**Expected outcomes (system + data)**

- Order is updated to `isDraft=false`, sets payment terms, due date, sale status, fulfillment status.
  - Evidence: `server/ordersDb.ts` (`confirmDraftOrder`).
- Inventory is decremented:
  - Non-sample: `batches.onHandQty` decreases.
  - Sample line item: `batches.sampleQty` decreases and logs to `sampleInventoryLog`.
  - Evidence: `server/ordersDb.ts` (`confirmDraftOrder` inventory updates).
- If a batch is consigned, payable tracking updates and may mark payable due when on-hand hits zero.
  - Evidence: `server/ordersDb.ts` calls `payablesService.updatePayableOnSale` and `checkInventoryZeroThreshold`.

**Verification proof**

- Order moves from Draft to Confirmed list.
  - Evidence: `OrdersWorkSurface.tsx` has “draft/confirmed” tabs.
- Batch `onHandQty` decreases.

**Edge cases**

- Order with no line items should fail.
  - Evidence: `server/ordersDb.ts` (“Cannot confirm order with no line items”).
- Race conditions: confirmation locks all batch rows with `FOR UPDATE`.
  - Evidence: `server/ordersDb.ts` lock logic.
- Partial cash payment affects `saleStatus` (PAID vs PARTIAL vs PENDING).
  - Evidence: `server/ordersDb.ts` saleStatus calculation.

**Failure modes**

- Inventory goes negative due to unexpected float math: this code uses DB arithmetic (`CAST(... AS DECIMAL) - qty`).
  - Evidence: `server/ordersDb.ts` inventory update statements.

---

## GF-005: Pick & Pack (Pack Orders Into Bags)

- RISK: Medium
- BUSINESS CRITICALITY: High

**Preconditions**

- An order exists in the pick list queue.
  - Evidence: `server/routers/pickPack.ts` queries `orders` where `orderType="SALE"` and `isDraft=false`.

**User steps (UI)**

1. Go to `/pick-pack`.
2. Select an order from the queue.
   - Evidence: E2E specs `tests-e2e/golden-flows/gf-005-pick-pack*.spec.ts`.
3. Use pack actions to create bags and assign items.
   - Evidence: API supports bag management in `server/routers/pickPack.ts` (orderBags/orderItemBags).

**Expected outcomes (system + data)**

- Order’s pick/pack status updates (PENDING → PICKING → PACKED → READY).
  - Evidence: `server/routers/pickPack.ts` validates `pickPackStatusSchema`.
- Bag records are created.
  - Evidence: `server/routers/pickPack.ts` reads/writes `orderBags` and `orderItemBags`.

**Important note (data correctness hotspot)**

- Pick/Pack logic updates fulfillment/pickPack status and bag assignments, but does **not** appear to decrement inventory quantities.
  - Evidence: inventory decrement is in `server/ordersDb.ts` (order confirmation), Pick/Pack router focuses on bags/status.

**Edge cases**

- No orders in queue: E2E tests explicitly skip data-dependent assertions.
  - Evidence: `tests-e2e/golden-flows/gf-005-pick-pack-complete.spec.ts`.
- Access control: pick/pack router uses `adminProcedure`.
  - Evidence: `server/routers/pickPack.ts`.
- Partial packing: some items assigned to bags, others not.

**Failure modes**

- Users without admin role cannot use pick/pack endpoints.
  - Evidence: `server/_core/trpc.ts` (`adminProcedure`).

---

## GF-006: Invoice Lifecycle (List / PDF / Create)

- RISK: High
- BUSINESS CRITICALITY: High

This flow is split into what is clearly wired in UI vs what exists as backend capability.

**User steps (UI: confirmed in code)**

1. Go to `/accounting/invoices`.
   - Evidence: route exists in `client/src/App.tsx`; Work Surface is `client/src/components/work-surface/InvoicesWorkSurface.tsx`.
2. Select an invoice in the list to open inspector.
3. Download invoice PDF.
   - Evidence: `InvoicesWorkSurface.tsx` uses `trpc.invoices.downloadPdf`.

**Invoice creation (canonical operating policy)**

- Canonical operating decision: invoice creation should be order/fulfillment-driven; `/accounting/invoices` is primarily a management surface.
- Backend supports both direct accounting creation and order-derived generation.
  - Evidence: `server/routers/accounting.ts` (`invoices.create`), `server/routers/invoices.ts` (`generateFromOrder`), `server/ordersDb.ts` (`updateOrderStatus` shipping path creates invoice).
- UI wiring for explicit `generateFromOrder` button flow is still implementation-dependent by screen/state.

**Expected outcomes (system + data)**

- Creating an invoice posts balanced ledger entries.
  - Evidence: `server/routers/accounting.ts` (`postInvoiceGLEntries` called from `invoices.create`) and `server/services/orderAccountingService.ts` (order-derived invoice postings).

**Verification proof**

- General ledger shows balanced entries for the invoice reference.
  - Evidence: `server/routers/accounting.ts` (`ledger.list` supports `referenceType` and `referenceId`).

**Edge cases**

- Status transitions: paid invoices can only be voided; voided invoices cannot be updated.
  - Evidence: status validation in `server/routers/invoices.ts` and accounting invoice update endpoints.
- PDF generation timeouts.
  - Evidence: timeout wrapper around PDF generation in `server/routers/invoices.ts`.
- Missing/inconsistent linkage between orders and invoices.
  - Evidence: `server/routers/invoices.ts` updates `orders.invoiceId`, but not all invoice creation paths will.

**Failure modes**

- “Download PDF” appears to work but no file downloads (client-side popup blocker, route mismatch, or PDF generation failed server-side).
  - Evidence: UI calls `trpc.invoices.downloadPdf` in `client/src/components/work-surface/InvoicesWorkSurface.tsx`; server implementation in `server/routers/invoices.ts` (`downloadPdf` with timeout wrapper).
- Invoice creation is expected operationally, but the UI trigger is unclear/absent.
  - Evidence: invoice creation exists in backend (`server/routers/accounting.ts` `invoices.create`, `server/routers/invoices.ts` `generateFromOrder`) but there is no observed client usage of `generateFromOrder`.
- GL posting fails (for example: missing standard accounts or locked fiscal period).
  - Evidence: `server/accountingHooks.ts` (`MissingStandardAccountError`, `createJournalEntry` checks fiscal period lock).

---

## GF-007: Record Payment Against Invoice (InvoiceToPaymentFlow)

- RISK: High
- BUSINESS CRITICALITY: High

**Preconditions**

- An invoice exists with `amountDue > 0` and status is not `PAID`/`VOID`.
  - Evidence: `client/src/components/work-surface/InvoicesWorkSurface.tsx` (hides “Record Payment” for `PAID`/`VOID`).
- Permission `accounting:create` is required for the mutation the UI calls.
  - Evidence: `server/routers/accounting.ts` (`accounting.payments.create` uses `requirePermission("accounting:create")`).

**User steps (UI)**

1. Go to `/accounting/invoices` and select an unpaid invoice.
   - Evidence: `routes.csv` row `/accounting/invoices`; UI is `client/src/components/work-surface/InvoicesWorkSurface.tsx`.
2. Click “Record Payment” to open the guided flow.
   - Evidence: `client/src/components/work-surface/InvoicesWorkSurface.tsx` renders `<InvoiceToPaymentFlow ... open={showPaymentDialog} />`.
3. Enter amount, method, date, and optional reference/notes; submit.
   - Evidence: `client/src/components/work-surface/golden-flows/InvoiceToPaymentFlow.tsx` (`handleRecord`).

**What the UI actually calls (important correctness hotspot)**

- The guided flow submits `trpc.accounting.payments.create` (payment row insert) and type-casts the payload to bypass type checking.
  - Evidence: `client/src/components/work-surface/golden-flows/InvoiceToPaymentFlow.tsx` (`trpc.accounting.payments.create.useMutation`, `mutate({...} as unknown as ...)`).
- The payload shape does not match the server input schema (missing `paymentNumber` and `paymentType`, uses `reference` instead of `referenceNumber`, includes `sendReceipt`).
  - Evidence (server schema): `server/routers/accounting.ts` (`payments.create` input zod object).
  - Evidence (client payload): `client/src/components/work-surface/golden-flows/InvoiceToPaymentFlow.tsx` (`recordPaymentMutation.mutate({ invoiceId, amount, paymentMethod, paymentDate, reference, notes, sendReceipt })`).
- The flow’s “Bank Transfer” option uses value `BANK_TRANSFER`, which is not in the server’s payment method enum.
  - Evidence: `client/src/components/work-surface/golden-flows/InvoiceToPaymentFlow.tsx` (`PAYMENT_METHODS` includes `BANK_TRANSFER`), server enum in `server/routers/accounting.ts` (`paymentMethod` z.enum([...]) does not include `BANK_TRANSFER`).

**Expected outcomes (system + data)**

For “payment recorded” to be correct operationally, all of these must be true:

1. A payment record exists (for audit/history).
2. The invoice balance updates (`amountPaid` increases, `amountDue` decreases) and status becomes `PARTIAL` or `PAID`.
3. GL entries are posted (Cash debit, AR credit).
4. Client balance (`clients.totalOwed`) is consistent with invoice balances.

However, the repo currently splits these responsibilities across endpoints:

- `accounting.payments.create`: creates a `payments` row only.
  - Evidence: `server/routers/accounting.ts` (`payments.create`), `server/arApDb.ts` (`createPayment`).
- `accounting.invoices.recordPayment`: updates invoice + posts GL, but does not create a payment row and does not call `syncClientBalance`.
  - Evidence: `server/routers/accounting.ts` (`invoices.recordPayment` calls `arApDb.recordInvoicePayment` + `postPaymentGLEntries`).
- `payments.recordPayment` (legacy): all-in-one (payment row + invoice update + GL + balance sync).
  - Evidence: `server/routers/payments.ts` (`recordPayment`).

Canonical decision: operational source-of-truth should be `payments.recordPayment` (full payment+invoice+GL behavior).
Current known defect: UI still calls `accounting.payments.create`.

- Evidence (canonical target): `server/routers/payments.ts:233` (`recordPayment`).
- Evidence (current UI mismatch): `client/src/components/work-surface/golden-flows/InvoiceToPaymentFlow.tsx:767`.

**Verification proof (what to check in-app)**

- Invoice row updates: `amountDue` decreases and status becomes PARTIAL/PAID.
  - Evidence: allocation logic in `server/arApDb.ts` (`recordInvoicePayment`), called by `server/routers/accounting.ts` (`invoices.recordPayment`).
- A new row appears in `/accounting/payments` (and it has a `paymentNumber`, `paymentType`, `paymentMethod`, and links to `invoiceId`).
  - Evidence: payment insert is `server/arApDb.ts` (`createPayment`), list is `server/routers/accounting.ts` (`payments.list`).
- `/accounting/general-ledger` shows PAYMENT entries for this transaction (Cash/AR).
  - Evidence: `server/accountingHooks.ts` (`postPaymentGLEntries`).
- Client balance view remains consistent (client total owed equals sum of open invoice `amountDue`).
  - Evidence: canonical balance in `server/services/clientBalanceService.ts` (`computeClientBalance` + `syncClientBalance`).

**Edge cases**

- Overpayment: UI blocks `amount > amountDue`; backend allocation path also blocks over-allocation with $0.01 tolerance.
  - Evidence: `client/src/components/work-surface/golden-flows/InvoiceToPaymentFlow.tsx` (UI check), `server/arApDb.ts` (`recordInvoicePayment`).
- Payment method mismatch (`BANK_TRANSFER`): server schema will reject it.
  - Evidence: `client/src/components/work-surface/golden-flows/InvoiceToPaymentFlow.tsx` payment methods; `server/routers/accounting.ts` paymentMethod enum.
- Posting into a locked/closed fiscal period fails.
  - Evidence: `server/accountingHooks.ts` (`createJournalEntry` checks `isFiscalPeriodLocked`).

**Failure modes to watch for**

- Payment “records” (row inserted) but invoice balance doesn’t change (no allocation call).
  - Evidence: split endpoint design in `server/routers/accounting.ts`.
- Invoice balance changes (allocation succeeds) but payment history screen shows nothing (no `payments` row).
  - Evidence: `accounting.invoices.recordPayment` does not insert into `payments`.
- UI errors due to zod schema mismatch (missing required fields like `paymentNumber` / `paymentType`).
  - Evidence: payload mismatch between `client/src/components/work-surface/golden-flows/InvoiceToPaymentFlow.tsx` and `server/routers/accounting.ts`.
- UI invalidates the legacy payments list (`utils.payments.list.invalidate()`), not the accounting payments list, so screens may not refresh as expected.
  - Evidence: `client/src/components/work-surface/InvoicesWorkSurface.tsx` (`onPaymentRecorded` callback).

---

## GF-008: Client Ledger Review

- RISK: Medium
- BUSINESS CRITICALITY: Medium

**Preconditions**

- A client exists.
- User has permission to read client ledger data.
  - Evidence: `server/routers/clientLedger.ts` (`getLedger` uses `requirePermission("clients:read")`).

**User steps (UI)**

1. Go to `/clients` and open a client.
2. Navigate to the ledger view (`/clients/:clientId/ledger` or `/client-ledger`).
   - Evidence: routes exist in `client/src/App.tsx`.
3. Filter and export.
   - Evidence: E2E spec `tests-e2e/golden-flows/gf-006-client-ledger-review.spec.ts` checks for filter/export controls.

**Expected outcomes**

- Ledger view shows invoice/payment activity and aging/balance views.
  - Evidence: ledger routers exist (`server/routers/clientLedger.ts`, `server/routers/accounting.ts` ledger endpoints).

**Verification proof**

- The ledger table shows transactions and a summary (total debits/credits/current balance).
  - Evidence: `client/src/components/work-surface/ClientLedgerWorkSurface.tsx` uses `trpc.clientLedger.getLedger` and renders summary fields.
- The “current balance” direction is consistent with the invoice list for the client (sanity check).
  - Evidence: canonical balance derivation intent documented in `server/services/clientBalanceService.ts` (ARCH-002).

**Edge cases**

- Client has no invoices/payments.
- Export formatting/timezone differences.
- Ledger list uses pagination and filters.

**Failure modes**

- Ledger and invoice list disagree because some flows manually update `clients.totalOwed` or skip `syncClientBalance`.
  - Evidence: `server/services/clientBalanceService.ts` (canonical calculation), `server/routers/returns.ts` (manual `clients.totalOwed` update), `server/routers/accounting.ts` (`invoices.recordPayment` does not call `syncClientBalance`).
- Payment history is incomplete if payments are “allocated” without creating a `payments` row, or if the UI only creates a payment row without allocating.
  - Evidence: split endpoints in `server/routers/accounting.ts` (`payments.create` vs `invoices.recordPayment`).

---

## GF-009: Returns Management (/returns) (Create Return + Optional Restock/Credit)

- RISK: High
- BUSINESS CRITICALITY: Medium

**Preconditions**

- User can access returns endpoints:
  - Listing requires `orders:read`.
  - Creating a return requires `orders:update`.
  - Evidence: `server/routers/returns.ts` (`getAll/list` use `requirePermission("orders:read")`, `create` uses `requirePermission("orders:update")`).
- Order exists (you know the Order ID).
  - Evidence: `client/src/pages/ReturnsPage.tsx` loads order details via `trpc.orders.getOrderWithLineItems` when an Order ID is entered.

**User steps (UI)**

1. Go to `/returns`.
   - Evidence: `routes.csv` row `/returns`; page is `client/src/pages/ReturnsPage.tsx`.
2. Click “Process Return”.
   - Evidence: `ReturnsPage.tsx` (button labeled “Process Return”).
3. Enter an Order ID and wait for order details to load.
   - Evidence: `ReturnsPage.tsx` (`orders.getOrderWithLineItems` query).
4. Click one or more order line items to add them to the return list; optionally add per-item notes.
   - Evidence: `ReturnsPage.tsx` (`addOrderItemToReturn`, return items list UI).
5. Choose a return reason, add notes, choose whether to “Restock inventory automatically”, and submit.
   - Evidence: `ReturnsPage.tsx` (`trpc.returns.create` mutation).

**Expected outcomes (system + data)**

- A `returns` row is inserted linked to the `orderId`.
  - Evidence: `server/routers/returns.ts` (`create` inserts into `returns`).
- If `restockInventory=true`, each returned item increments `batches.onHandQty` and an `inventoryMovements` row is inserted with `inventoryMovementType="RETURN"`.
  - Evidence: `server/routers/returns.ts` (`create` restock loop; inserts `inventoryMovements`).
- If an invoice exists for this order and the return has positive value, a credit memo is created, invoice GL entries are reversed, and `clients.totalOwed` is decremented.
  - Evidence: `server/routers/returns.ts` (`create` “ACC-003” blocks), `server/accountingHooks.ts` (`reverseGLEntries`).

**UNSPECIFIED / gaps to validate live**

- The UI does not call `returns.approve`, `returns.receive`, or `returns.process`; it only calls `returns.create` from this page. How the full approval/receiving workflow is meant to be performed is unclear from client code.
  - Evidence: `client/src/pages/ReturnsPage.tsx` only uses `returns.getAll`, `returns.getStats`, and `returns.create`.

**Verification proof (what to check in-app)**

- The Returns list shows the new return row; stats update.
  - Evidence: `client/src/pages/ReturnsPage.tsx` uses `trpc.returns.getAll` and `trpc.returns.getStats`.
- If restocking was enabled, verify the batch `onHandQty` increased in `/inventory`.
  - Evidence: `server/routers/returns.ts` updates `batches.onHandQty`; inventory UI uses `client/src/components/work-surface/InventoryWorkSurface.tsx`.
- If an invoice exists for the order: verify a credit exists in `/credits`, and verify ledger has reversal entries for the invoice.
  - Evidence: credit creation via `creditsDb.createCredit` in `server/routers/returns.ts`; reversals written by `server/accountingHooks.ts` (`reverseGLEntries` inserts `ledgerEntries.referenceType="REVERSAL"` with `referenceId=invoiceId`).

**Edge cases (at least 3)**

- Order items cannot be parsed (bad JSON in `orders.items`): return value can become 0 and credit creation may be skipped.
  - Evidence: `server/routers/returns.ts` (`create` tries `JSON.parse(order.items)` and logs a warning on failure).
- No invoice found for the order: return is still created and inventory may be restocked, but no credit/GL reversal occurs.
  - Evidence: `server/routers/returns.ts` selects invoice by `invoices.referenceType="ORDER"` + `referenceId=orderId` and gates credit logic on `orderInvoice`.
- GL reversal visibility mismatch: the returns UI GL viewer uses `referenceType="RETURN"` with `returnId`, but reversal entries are written with `referenceType="REVERSAL"` and `referenceId=invoiceId`.
  - Evidence: `client/src/components/accounting/GLReversalStatus.tsx` (`ReturnGLStatus` uses `referenceType="RETURN"`), `server/accountingHooks.ts` (`reverseGLEntries` inserts `referenceType: "REVERSAL"`).
- Manual balance update risk: `returns.create` decrements `clients.totalOwed` directly instead of calling `syncClientBalance`.
  - Evidence: `server/routers/returns.ts` raw SQL update; canonical service `server/services/clientBalanceService.ts`.

**Failure modes**

- Credit memo created twice (there are multiple credit-issuing paths: `returns.create` and `returns.process`).
  - Evidence: `server/routers/returns.ts` contains credit creation in both `create` and `process`.
- Create fails if any referenced `batchId` does not exist (transaction rolls back).
  - Evidence: `server/routers/returns.ts` (`create` throws `Batch X not found` inside the transaction).

---

## GF-010: Sample Request (Create + Manage)

- RISK: Medium
- BUSINESS CRITICALITY: Medium

**Preconditions**

- User can access `/samples` and is not a public/demo user (samples router uses strictly protected procedures).
  - Evidence: `client/src/pages/SampleManagement.tsx`, `server/routers/samples.ts` (uses `strictlyProtectedProcedure`).
- Monthly sample allocation allows the requested quantity.
  - Evidence: `server/samplesDb.ts` (`createSampleRequest` calls `checkMonthlyAllocation`).

**User steps (UI)**

1. Go to `/samples`.
   - Evidence: `routes.csv` row `/samples`; UI entrypoint `client/src/pages/SampleManagement.tsx`.
2. Create a sample request (client + products + quantities + notes).
   - Evidence: `client/src/pages/SampleManagement.tsx` uses `trpc.samples.createRequest`; backend `server/routers/samples.ts` (`createRequest`) calls `samplesDb.createSampleRequest`.

Canonical decision: sample management is user-facing for internal authorized users (not public and not backend-only).
Current implementation note: fulfillment endpoint exists and is permissioned; UI fulfillment wiring still needs explicit verification.

- Evidence: `client/src/App.tsx:350`, `client/src/config/navigation.ts:174`, `server/routers/samples.ts:166`.

**Expected outcomes (system + data)**

- A row is created in `sampleRequests` with status `PENDING`.
  - Evidence: `server/samplesDb.ts` (`createSampleRequest` sets `sampleRequestStatus: "PENDING"`).
- If fulfillment occurs (via API): status changes to `FULFILLED`, `batches.sampleQty` decrements, and `inventoryMovements` rows of type `SAMPLE` are inserted.
  - Evidence: `server/samplesDb.ts` (`fulfillSampleRequest` transaction updates `batches.sampleQty`, inserts `inventoryMovements`, and updates request status).

**Verification proof**

- The Samples list shows the new request and its status.
  - Evidence: `client/src/pages/SampleManagement.tsx` uses `trpc.samples.getAll`.

**Edge cases (at least 3)**

- Monthly allocation exceeded: request creation fails.
  - Evidence: `server/samplesDb.ts` (`createSampleRequest` throws “Monthly sample allocation exceeded”).
- Insufficient sample inventory for a product during fulfillment.
  - Evidence: `server/samplesDb.ts` (`fulfillSampleRequest` throws “Insufficient sample inventory ...”).
- Concurrency: fulfillment uses `FOR UPDATE` locking to avoid race conditions.
  - Evidence: `server/samplesDb.ts` (`fulfillSampleRequest` uses `.for("update")` on batches).

**Failure modes**

- Fulfillment is not possible from the UI (no button/wiring), so sample requests remain PENDING unless fulfilled via another tool.
  - Evidence: no client usage of `trpc.samples.fulfillRequest` found in `client/src`.

---

## GF-011: Inventory Management (List + Status Changes)

- RISK: High
- BUSINESS CRITICALITY: High

**Preconditions**

- Inventory exists.
- User has `inventory:read` and `inventory:update` permissions.
  - Evidence: `server/routers/inventory.ts` (`list` uses `requirePermission("inventory:read")`, `updateStatus` uses `requirePermission("inventory:update")`).

**User steps (UI)**

1. Go to `/inventory`.
   - Evidence: `routes.csv` row `/inventory`; UI `client/src/components/work-surface/InventoryWorkSurface.tsx`.
2. Select a batch row and open the inspector (Enter or click row).
   - Evidence: `client/src/components/work-surface/InventoryWorkSurface.tsx` (keyboard handlers + `InspectorPanel`).
3. In the inspector “Update Status” section, click a status button (e.g., QUARANTINED, ON_HOLD, LIVE).
   - Evidence: `client/src/components/work-surface/InventoryWorkSurface.tsx` (`BatchInspectorContent` renders “Update Status” buttons and calls `trpc.inventory.updateStatus`).

**Expected outcomes (system + data)**

- Status transition is validated and persisted.
  - Evidence: `server/routers/inventory.ts` (`updateStatus` validates via `inventoryUtils.isValidStatusTransition`).
- Quarantine transitions move quantities between buckets and record `inventoryMovements`.
  - Evidence: `server/routers/inventory.ts` (`updateStatus` QUARANTINED ↔ LIVE logic; inserts `inventoryMovements` types like `QUARANTINE` and `RELEASE_FROM_QUARANTINE`).

**Verification proof**

- The batch status badge changes in `/inventory` and remains after refresh.
  - Evidence: `client/src/components/work-surface/InventoryWorkSurface.tsx` refetches after mutation success.
- When quarantining, `quarantineQty` increases and `onHandQty` decreases accordingly.
  - Evidence: `server/routers/inventory.ts` quarantine move logic.

**Edge cases (at least 3)**

- Invalid status transitions are rejected.
  - Evidence: `server/routers/inventory.ts` (`isValidStatusTransition` check).
- Quarantine adjustments can auto-set status to QUARANTINED if quarantine increases and status is not already QUARANTINED.
  - Evidence: `server/routers/inventory.ts` (`inventory.adjustQuarantine` auto-status logic).
- Concurrency: inventory updates use row locks / versioning patterns in some workflows (validate conflicts in UI).
  - Evidence: `client/src/components/work-surface/InventoryWorkSurface.tsx` uses `useConcurrentEditDetection` and tracks `batch.version`.

**Failure modes**

- Quantity buckets drift (available becomes negative) if some mutations update buckets inconsistently.
  - Evidence: helper exists `server/inventoryUtils.ts` (`validateQuantityConsistency`), but enforcement depends on caller usage.

---

## GF-012: Order Return Actions (Mark Returned → Restock/Vendor Return) via `/orders`

- RISK: High
- BUSINESS CRITICALITY: Medium

**Preconditions**

- A shipped/delivered order exists.
- User has permission to update orders.
  - Evidence: `server/routers/orders.ts` return-related mutations use `protectedProcedure` + permission middleware patterns.

**User steps (UI)**

1. Go to `/orders`, select a SHIPPED/DELIVERED order.
2. Click “Mark as Returned”.
3. For RETURNED orders, choose either “Restock Inventory” or “Return to Vendor”.
   - Evidence: return action buttons in `client/src/components/work-surface/OrdersWorkSurface.tsx`.

**Expected outcomes (system + data)**

- `orders.fulfillmentStatus` transitions to `RETURNED` and status history is written.
  - Evidence: `server/routers/orders.ts` (`markAsReturned` + `orderStatusHistory`).
- Restock / vendor return processing occurs in `server/services/returnProcessing.ts`.
  - Evidence: `server/routers/orders.ts` (`processRestock`, `processVendorReturn`).

**UNSPECIFIED (needs live validation)**

- Exact inventory quantity adjustments performed by restock/vendor return.
  - Evidence: depends on `server/services/returnProcessing.ts` behavior and how orders/items map to batches in your real data.

**Edge cases (at least 3)**

- Order is not in a returnable status (should be rejected).
  - Evidence: return status workflow logic in `server/routers/orders.ts` (validate live in walkthrough).
- Restock is attempted but referenced batches are missing or quantities don’t reconcile.
  - Evidence: return processing is delegated to `server/services/returnProcessing.ts`.
- Return-to-vendor requires supplier context; supplier model is split (`vendors` vs supplier clients).
  - Evidence: supplier split described in `context-pack/05_BUSINESS_RULES.md`; implementation touches `server/services/returnProcessing.ts`.

**Failure modes**

- Return actions succeed (status updated) but inventory and accounting do not reconcile because return processing is incomplete or not idempotent.
  - Evidence: return processing is a separate service (`server/services/returnProcessing.ts`) and must be validated live.
