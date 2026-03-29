# 02_SYSTEM_MAP (Modules, Screens, and What Data They Touch)

## Source-Of-Truth Files For “What Screens Exist”

- Frontend routes: `client/src/App.tsx` (wouter `<Route ...>` list)
  - Example evidence: `routes.csv` rows `/` and `/inventory` (each route row includes `evidence_paths` pointing back to `client/src/App.tsx`).
- Sidebar/navigation grouping: `client/src/config/navigation.ts` (`navigationGroups` + `navigationItems`)
- Backend API namespaces (tRPC): `server/routers.ts` (`appRouter = router({ ... })`)

The rest of this map is a practical view for walkthroughs: module → screens/routes → key actions → core entities.

## Module Map

### Sales

**Purpose:** manage customers/clients and sell inventory through orders/quotes and related tools.

**Key screens/routes**

- `/` Dashboard
  - Evidence: `routes.csv` row `/`; component `client/src/pages/DashboardV3.tsx`.
- `/inbox` Inbox
  - Evidence: `routes.csv` row `/inbox`; component `client/src/pages/InboxPage.tsx`.
- `/clients` Client list (Work Surface)
  - Evidence: `routes.csv` row `/clients`; component `client/src/components/work-surface/ClientsWorkSurface.tsx`.
- `/clients/:id` Client profile
  - Evidence: `routes.csv` row `/clients/:id`; component `client/src/pages/ClientProfilePage.tsx`.
- `/orders` Orders list (Work Surface)
  - Evidence: `routes.csv` row `/orders`; component `client/src/components/work-surface/OrdersWorkSurface.tsx`.
- `/orders/create` Order Creator (create/finalize)
  - Evidence: `routes.csv` row `/orders/create`; component `client/src/pages/OrderCreatorPage.tsx`.
- `/quotes` Quotes (Work Surface)
  - Evidence: `routes.csv` row `/quotes`; component `client/src/components/work-surface/QuotesWorkSurface.tsx`.
- `/sales-sheets` Sales sheet creator
  - Evidence: `routes.csv` row `/sales-sheets`; component `client/src/pages/SalesSheetCreatorPage.tsx`.
- `/needs` Client Needs
  - Evidence: `routes.csv` row `/needs`; component `client/src/pages/NeedsManagementPage.tsx`.
- `/matchmaking` Matchmaking
  - Evidence: `routes.csv` row `/matchmaking`; component `client/src/pages/MatchmakingServicePage.tsx`.
- `/returns` Returns
  - Evidence: `routes.csv` row `/returns`; component `client/src/pages/ReturnsPage.tsx`.

**Key actions (and what to validate live)**

- Create/finalize orders and confirm inventory impact.
  - Evidence: `client/src/pages/OrderCreatorPage.tsx` (finalize flow), `server/routers/orders.ts` (`finalizeDraft`), `server/ordersDb.ts` (`confirmDraftOrder`).
- View and filter client data.
  - Evidence: `server/routers/clients.ts` (client endpoints).

**Core entities touched (screen-to-data)**

- Clients screens: `clients`, `clientNotes`, `supplierProfiles` (depending on vendor/supplier features)
  - Evidence: `entities.csv` entries for `clients`, `supplierProfiles`.
- Orders screens: `orders`, `orderLineItems`, `orderLineItemAllocations`, plus inventory `batches` quantity fields.
  - Evidence: `server/routers/orders.ts` imports `orders`, `orderLineItems`, `batches` from `drizzle/schema`.

### Inventory

**Purpose:** get product into the system, keep quantities correct, and support fulfillment.

**Key screens/routes**

- `/direct-intake` Direct Intake (Work Surface)
  - Evidence: `routes.csv` row `/direct-intake`; component `client/src/components/work-surface/DirectIntakeWorkSurface.tsx`.
- `/inventory` Inventory list/details (Work Surface)
  - Evidence: `routes.csv` row `/inventory`; component `client/src/components/work-surface/InventoryWorkSurface.tsx`.
- `/products` Products management
  - Evidence: `routes.csv` row `/products`; component `client/src/pages/ProductsPage.tsx`.
- `/purchase-orders` Purchase Orders (Work Surface)
  - Evidence: `routes.csv` row `/purchase-orders`; component `client/src/components/work-surface/PurchaseOrdersWorkSurface.tsx`.
  - Note: receiving goods into inventory is API-only (no dedicated frontend route calls `poReceiving.*` as of this repo snapshot).
    - Evidence: `server/routers/poReceiving.ts` exists; no `trpc.poReceiving.*` usage under `client/src`.
- `/pick-pack` Pick & Pack (Work Surface)
  - Evidence: `routes.csv` row `/pick-pack`; component `client/src/components/work-surface/PickPackWorkSurface.tsx`.
- `/vendors` Vendors
  - Evidence: `routes.csv` row `/vendors`; component `client/src/pages/VendorsPage.tsx`.
- `/vendor-supply` Vendor Supply
  - Evidence: `routes.csv` row `/vendor-supply`; component `client/src/pages/VendorSupplyPage.tsx`.
- `/photography` Photography queue
  - Evidence: `routes.csv` row `/photography`; component `client/src/pages/PhotographyPage.tsx`.
- `/samples` Samples
  - Evidence: `routes.csv` row `/samples`; component `client/src/pages/SampleManagement.tsx`.

**Key actions (and what to validate live)**

- Direct intake creates a **batch** and related records in a single transaction.
  - Evidence: `server/routers/inventory.ts` (`inventory.intake`), `server/inventoryIntakeService.ts` (`processIntake`).
- Inventory status transitions are validated; quarantine behavior moves quantities between buckets.
  - Evidence: `server/routers/inventory.ts` (`updateStatus`), `server/inventoryUtils.ts` (availability math).
- Pick & Pack creates bag records and updates `orders.pickPackStatus`.
  - Note: `orders.fulfillmentStatus` is not updated by pick/pack router (possible workflow gap).
  - Evidence: `server/routers/pickPack.ts` (mutations update `pickPackStatus` and write `orderBags` / `orderItemBags`).

**Core entities touched (screen-to-data)**

- Intake: `vendors`, `brands`, `products`, `lots`, `batches`, `batchLocations`, `auditLogs`, and sometimes `vendorPayables`.
  - Evidence: `server/inventoryIntakeService.ts` imports these tables from `drizzle/schema`.
- Inventory: `batches` + quantity fields (`onHandQty`, `reservedQty`, `quarantineQty`, `holdQty`, etc).
  - Evidence: `server/inventoryUtils.ts`.
- Samples: `sampleRequests`, `sampleAllocations`, plus inventory movement records.
  - Evidence: `server/samplesDb.ts` (uses `sampleRequests`, `batches`, `inventoryMovements`).

### Finance

**Purpose:** AR/AP and double-entry accounting records for invoices and payments.

**Key screens/routes**

- `/accounting` Accounting dashboard
  - Evidence: `routes.csv` row `/accounting`; component `client/src/pages/accounting/AccountingDashboard.tsx`.
- `/accounting/invoices` Invoices (Work Surface)
  - Evidence: `routes.csv` row `/accounting/invoices`; component `client/src/components/work-surface/InvoicesWorkSurface.tsx`.
- `/accounting/payments` Payments
  - Evidence: `routes.csv` row `/accounting/payments`; component `client/src/pages/accounting/Payments.tsx`.
- `/accounting/general-ledger` General ledger
  - Evidence: `routes.csv` row `/accounting/general-ledger`; component `client/src/pages/accounting/GeneralLedger.tsx`.
- `/clients/:clientId/ledger` Client ledger (Work Surface)
  - Evidence: `routes.csv` row `/clients/:clientId/ledger`; component `client/src/components/work-surface/ClientLedgerWorkSurface.tsx`.

**Key actions (and what to validate live)**

- Invoice listing/aging for the `/accounting/invoices` UI is powered by the `accounting` router.
  - Evidence: `routes.csv` row `/accounting/invoices` (queries include `accounting.invoices.list`, `accounting.invoices.getARAging`); backend `server/routers/accounting.ts` (`invoices` router).
- Canonical operational decision: invoice creation should be order/fulfillment-driven, and `/accounting/invoices` is management surface.
  - Evidence (backend capability): `server/routers/invoices.ts` (`generateFromOrder`), `server/services/orderAccountingService.ts` (`createInvoiceFromOrder`), `server/ordersDb.ts` (`updateOrderStatus` shipping path creates invoice).
- Payment recording remains split in code; canonical target is `payments.recordPayment`.
  - Current mismatch: UI path still calls `accounting.payments.create` (row insert path).
  - Evidence (UI): `client/src/components/work-surface/golden-flows/InvoiceToPaymentFlow.tsx`.
  - Evidence (backend): `server/routers/payments.ts` (`recordPayment`), `server/routers/accounting.ts` (`payments.create`, `invoices.recordPayment`).

**Core entities touched (screen-to-data)**

- `invoices`, `invoiceLineItems`, `payments`, `ledgerEntries`, `clients.totalOwed` (derived via sync).
  - Evidence: `server/services/orderAccountingService.ts` and `server/routers/payments.ts`.

### Admin

**Purpose:** system configuration, users/permissions, and operational tooling.

**Key screens/routes**

- `/users` Users
  - Evidence: `routes.csv` row `/users`; component `client/src/pages/UsersPage.tsx`.
- `/settings` System Settings
  - Evidence: `routes.csv` row `/settings`; component `client/src/pages/Settings.tsx`.
- `/settings/feature-flags` Feature Flags
  - Evidence: `routes.csv` row `/settings/feature-flags`; component `client/src/pages/settings/FeatureFlagsPage.tsx`.
- `/workflow-queue` Workflow queue
  - Evidence: `routes.csv` row `/workflow-queue`; component `client/src/pages/WorkflowQueuePage.tsx`.
- `/calendar`, `/scheduling`, `/time-clock`
  - Evidence: `routes.csv` rows `/calendar`, `/scheduling`, `/time-clock`.
- `/account` My Account (personal settings)
  - Evidence: `routes.csv` row `/account`; component `client/src/pages/AccountPage.tsx`.

**Core entities touched**

- Users/auth: `users` table and session cookie `terp_session`.
  - Evidence: `drizzle/schema.ts` (`users` table), `shared/const.ts` (`COOKIE_NAME`).
- RBAC: `drizzle/schema-rbac.ts` + RBAC routers in `server/routers.ts` (rbacUsers/roles/permissions).

### Public routes (no AppShell)

- `/login` Login
  - Evidence: `routes.csv` row `/login`; component `client/src/pages/Login.tsx`.
- `/admin-setup` Admin setup
  - Evidence: `routes.csv` row `/admin-setup`.
- `/shared/sales-sheet/:token` Shared sales sheet
  - Evidence: `routes.csv` row `/shared/sales-sheet/:token`.
- `/intake/verify/:token` Public farmer verification
  - Evidence: `routes.csv` row `/intake/verify/:token`.
- VIP portal routes (`/vip-portal/*`)
  - Evidence: `routes.csv` rows `/vip-portal/login`, `/vip-portal/dashboard`, `/vip-portal/auth/impersonate`, `/vip-portal/session-ended`.

## Screen-to-Data Mapping (High-Signal Examples)

This is a “starter map” for walkthrough use. For full detail by route, use `routes.csv`.

- **Direct Intake** (`/direct-intake`)
  - UI: `client/src/components/work-surface/DirectIntakeWorkSurface.tsx`
  - Mutations: `inventory.intake`
  - Writes: `vendors`, `brands`, `products`, `lots`, `batches`, `batchLocations`, `auditLogs` (+ optional `vendorPayables`)
  - Evidence: `routes.csv` row `/direct-intake`; backend `server/routers/inventory.ts` (`inventory.intake`); implementation `server/inventoryIntakeService.ts`.

- **Order Creator** (`/orders/create`)
  - UI: `client/src/pages/OrderCreatorPage.tsx`
  - Mutations: `orders.createDraftEnhanced` then `orders.finalizeDraft`
  - Writes: `orders`, `orderLineItems`, updates `batches.reservedQty` (and/or `batches.sampleQty`)
  - Evidence: `client/src/pages/OrderCreatorPage.tsx`, `server/routers/orders.ts`.

- **Orders Work Surface confirm** (`/orders`)
  - UI: `client/src/components/work-surface/OrdersWorkSurface.tsx`
  - Mutation used: `orders.confirmDraftOrder`
  - Writes: `orders` (isDraft=false, payment terms, statuses), decrements `batches.onHandQty` (or `sampleQty`), updates payables for consigned batches
  - Evidence: `client/src/components/work-surface/OrdersWorkSurface.tsx`, `server/ordersDb.ts`, `server/services/payablesService.ts`.
  - Canonical note: this remains active for list/manage, but is not the long-term primary order-creation flow.

- **Invoice generation**
  - Canonical operational decision: order/fulfillment driven (not primarily manual accounting-first entry).
  - Evidence (backend capability): `server/routers/invoices.ts` (`generateFromOrder`), `server/services/orderAccountingService.ts` (`createInvoiceFromOrder`), `server/ordersDb.ts` (`updateOrderStatus` shipping path).

- **Payment recording**
  - Canonical target: `payments.recordPayment` as full operational backend source-of-truth.
  - Current mismatch: UI still uses `accounting.payments.create`; allocation/GL path is separate (`accounting.invoices.recordPayment`).
  - Evidence: `server/routers/payments.ts` (`recordPayment`), `server/routers/accounting.ts` (`payments.create`, `invoices.recordPayment`), `client/src/components/work-surface/golden-flows/InvoiceToPaymentFlow.tsx`.
