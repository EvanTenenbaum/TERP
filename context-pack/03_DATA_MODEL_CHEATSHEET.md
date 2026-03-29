# 03_DATA_MODEL_CHEATSHEET (Core Entities, Relationships, Invariants)

For a complete table-by-table index (including extensions like Scheduling, Live Shopping, Gamification, Storage), use `entities.csv`.

## Where The Data Model Lives

- Primary schema file: `drizzle/schema.ts` (MySQL tables + enums)
- Extension schema files (examples):
  - `drizzle/schema-live-shopping.ts`
  - `drizzle/schema-scheduling.ts`
  - `drizzle/schema-gamification.ts`
  - `drizzle/schema-storage.ts`
  - `drizzle/schema-rbac.ts`

Evidence: these files are referenced throughout `entities.csv` (see `evidence_paths` column).

## Core Entities (ERP “Backbone”)

### Users / Auth

- `users`
  - What it is: the user record used for authentication/authorization.
  - Evidence: `drizzle/schema.ts` (`export const users = mysqlTable("users", ...)`).
- Session cookie: `COOKIE_NAME = "terp_session"`
  - Evidence: `shared/const.ts`, `server/_core/simpleAuth.ts`.

### Parties (Clients, Vendors/Suppliers)

- `clients`
  - What it is: customer/client records. Also appears to represent suppliers via flags/profile tables.
  - Evidence: `entities.csv` row `clients`, `server/routers/clients.ts`.
- `vendors` (legacy) and `supplierProfiles` (mapping)
  - Canonical model decision: clients-as-suppliers (`supplierClientId`) is official; `vendorId` is transitional compatibility.
  - Current implementation remains mixed across modules.
  - Evidence: `drizzle/schema.ts:232` (`supplierClientId`), `drizzle/schema.ts:238` (`vendorId` deprecated comment), `docs/golden-flows/specs/GF-002-PROCURE-TO-PAY.md:620`, `server/inventoryIntakeService.ts` (legacy vendor usage).

### Product + Inventory

- `products` / `brands`
  - What it is: catalogue structure behind inventory.
  - Evidence: `server/inventoryIntakeService.ts` imports and creates `brands` + `products`.
- `lots`
  - What it is: intake groups batches into lots, with a generated `lots.code`.
  - Evidence: `server/inventoryIntakeService.ts` (lot code generation + insert).
- `batches`
  - What it is: the primary inventory record with quantities and status.
  - Key quantity fields: `onHandQty`, `reservedQty`, `quarantineQty`, `holdQty`, `sampleQty`, etc.
  - Evidence: `drizzle/schema.ts` (`batches` table), availability math in `server/inventoryUtils.ts`.
- `batchLocations`
  - What it is: physical location breakdown for batch quantities.
  - Evidence: `server/inventoryIntakeService.ts` (inserts into `batchLocations`).
- `inventoryMovements`
  - What it is: an audit-like stream of quantity changes (used for sample fulfillment and other movements).
  - Evidence: `server/samplesDb.ts` (inserts `inventoryMovements` during fulfillment).

### Sales (Orders, Quotes)

- `orders`
  - What it is: sales or quote records; has a draft vs finalized lifecycle.
  - Evidence: `server/routers/orders.ts` (imports `orders` from `drizzle/schema`).
- `orderLineItems` / `orderLineItemAllocations`
  - What it is: structured line items for enhanced order workflow; allocations reserve inventory.
  - Evidence: `server/routers/orders.ts` (imports these tables).

### Returns

- `returns`
  - What it is: return records linked to an order (`orderId`) with `items`, `returnReason`, and audit-ish fields like `processedBy/processedAt`.
  - Important quirk: the returns workflow “status” is not a DB column; it is inferred from markers embedded in `returns.notes` (e.g., `[APPROVED ...]`).
  - Evidence:
    - Table exists: `drizzle/schema.ts` (`returns` table; see `entities.csv` row `returns` for exact columns).
    - Status parsing/state machine: `server/routers/returns.ts` (`extractReturnStatus`, `RETURN_STATUS_TRANSITIONS`).

### Accounting (Invoices, Payments, Ledger)

- `invoices` / `invoiceLineItems`
  - What it is: invoice rows + their line items.
  - Important split:
    - The **Invoices UI** (`/accounting/invoices`) reads via the `accounting` router (`accounting.invoices.list`, etc.).
      - Evidence: `routes.csv` row `/accounting/invoices`; backend `server/routers/accounting.ts` (`invoices` router).
    - **Invoice generation from orders** exists in the legacy `invoices` router (and also in an order status workflow).
      - Evidence: `server/routers/invoices.ts` (`generateFromOrder`); `server/services/orderAccountingService.ts` (`createInvoiceFromOrder`); `server/ordersDb.ts` (`updateOrderStatus` creates invoice when shipping in that workflow).
- `payments`
  - What it is: payment records (used by `/accounting/payments` and invoice payment history).
  - Canonical target decision: `payments.recordPayment` should be source-of-truth for operational payment recording.
  - Current split still exists:
    - UI currently calls `accounting.payments.create` (row insert only).
    - `accounting.invoices.recordPayment` handles invoice allocation + GL posting.
    - `payments.recordPayment` provides full end-to-end behavior.
  - Evidence: `client/src/components/work-surface/golden-flows/InvoiceToPaymentFlow.tsx:767`, `server/routers/accounting.ts:915`, `server/routers/accounting.ts:1175`, `server/routers/payments.ts:233`.
- `ledgerEntries`
  - What it is: double-entry accounting entries posted for invoices and payments.
  - Evidence: `server/services/orderAccountingService.ts` (posts AR/Revenue + COGS/Inventory), `server/routers/payments.ts` (posts Cash/AR).

### Consignment / Vendor Payables

- `vendorPayables`
  - What it is: tracks amounts owed to vendors for consigned inventory.
  - Evidence: `server/services/payablesService.ts`.

## Key Relationships & Cardinalities (Core)

These relationships are derived from how routers/services join and reference tables.

- A **client** can have many **orders** and many **invoices**.
  - Evidence: `server/routers/orders.ts` (order has `clientId`), `server/routers/invoices.ts` (invoice uses `customerId`).
- An **order** can have many **orderLineItems**.
  - Evidence: `server/routers/orders.ts` selects from `orderLineItems` where `orderId = ...`.
- An **invoice** can have many **invoiceLineItems**.
  - Evidence: `server/services/orderAccountingService.ts` inserts `invoiceLineItems` for the created invoice.
- A **batch** belongs to a **product** and a **lot**; batches have many **batchLocations**.
  - Evidence: `server/inventoryIntakeService.ts` inserts a batch with `productId` and `lotId`, then inserts `batchLocations`.

If you need strict PK/FK lists and constraints, use the `primary_keys` and `foreign_keys` columns in `entities.csv`.

## Critical Invariants (Must Always Be True)

### Inventory availability math

- Available quantity is computed as `onHand - reserved - quarantine - hold` and is never negative.
  - Evidence: `server/inventoryUtils.ts`.

### Orders cannot “confirm/finalize” without inventory

- `ordersDb.confirmDraftOrder` locks batches (`FOR UPDATE`) and rejects confirmation if available quantity is insufficient.
  - Evidence: `server/ordersDb.ts` (`confirmDraftOrder`), especially the “lock all batch rows” step and availability checks.
- `orders.finalizeDraft` also locks order + line items + batches and checks availability before incrementing `reservedQty`.
  - Evidence: `server/routers/orders.ts` (`finalizeDraft`).

### Payments cannot exceed the invoice balance

- Accounting allocation path rejects over-allocation beyond `amountDue + 0.01` tolerance.
  - Evidence: `server/arApDb.ts` (`recordInvoicePayment`, ST-061 check) and `server/routers/accounting.ts` (`invoices.recordPayment`).
- Legacy `payments.recordPayment` also rejects overpayments (and additionally blocks PAID/VOID invoices).
  - Evidence: `server/routers/payments.ts` (`recordPayment`).

### Invoice generation creates GL entries atomically

- Invoice creation + line items + ledger entries are inside a DB transaction.
  - Evidence: `server/services/orderAccountingService.ts` (`createInvoiceFromOrder` transaction).

### Public/demo user safety

- The server provisions a public demo user if there is no valid session.
  - Evidence: `server/_core/context.ts`.
- Most mutations reject the public/demo user unless they are Super Admin.
  - Evidence: `server/_core/trpc.ts` (reject demo user mutations).

## Enumerations / Statuses (Examples)

Use `entities.csv` for the full set. High-signal ones:

- Batch status (`batchStatus`): `AWAITING_INTAKE`, `LIVE`, `PHOTOGRAPHY_COMPLETE`, `ON_HOLD`, `QUARANTINED`, `SOLD_OUT`, `CLOSED`.
  - Evidence: `drizzle/schema.ts` (`batchStatusEnum`).
- Payment terms on batches/orders: `COD`, `NET_7`, `NET_15`, `NET_30`, `CONSIGNMENT`, `PARTIAL`.
  - Evidence: `server/ordersDb.ts` (`confirmDraftOrder` input), `server/inventoryIntakeService.ts` (`paymentTerms`).
- Invoice status includes `SENT`, `PARTIAL`, `PAID`, `VOID` (and validations around transitions).
  - Evidence: `server/routers/invoices.ts` (`updateStatus` validation), `server/routers/payments.ts` (sets invoice status to PARTIAL/PAID).

## Computed Fields (Where They’re Computed)

- **Batch available quantity**: computed in code, not stored.
  - Evidence: `server/inventoryUtils.ts`.
- **Invoice number** from order number: `INV-${orderNumber...}`
  - Evidence: `server/services/orderAccountingService.ts`.
- **Invoice due date** from payment terms days mapping (in invoice generation endpoint).
  - Evidence: `server/routers/invoices.ts` (paymentTermsDays mapping).
- **Client total owed** is derived via a sync step after invoice creation/payment.
  - Evidence: `server/routers/invoices.ts` calls `syncClientBalance`, `server/routers/payments.ts` calls `syncClientBalance`.
