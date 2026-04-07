# 01_PRODUCT_BRIEF (What TERP Is / Isn’t)

## What TERP Is (Observed From Repo)

TERP is a web-based operations system that combines:

- **Sales workflows** (Clients, Orders, Quotes, Sales Sheets, Needs/Matchmaking)
  - Evidence: `client/src/config/navigation.ts` (group `sales`), `client/src/App.tsx` (`/clients`), `client/src/App.tsx` (`/orders`), `client/src/App.tsx` (`/quotes`), `client/src/App.tsx` (`/sales-sheets`), `client/src/App.tsx` (`/needs`), `client/src/App.tsx` (`/matchmaking`).
- **Inventory workflows** (Products, Inventory, Direct Intake, Purchase Orders, Pick & Pack, Vendors, Vendor Supply, Photography, Samples)
  - Evidence: `client/src/config/navigation.ts` (group `inventory`) and `routes.csv` rows: `/inventory`, `/products`, `/direct-intake`, `/purchase-orders`, `/pick-pack`, `/vendors`, `/vendor-supply`, `/photography`, `/samples`.
- **Finance/accounting workflows** (AR/AP dashboard, Invoices, Payments, General Ledger, Chart of Accounts, Bills)
  - Evidence: `client/src/config/navigation.ts` (group `finance`), `client/src/App.tsx` (`/accounting`), `client/src/App.tsx` (`/accounting/invoices`), `client/src/App.tsx` (`/accounting/bills`), `client/src/App.tsx` (`/accounting/payments`), `client/src/App.tsx` (`/accounting/general-ledger`).
- **Admin/ops tools** (Users, System Settings, Feature Flags, Workflow Queue, Calendar, Scheduling, Time Clock, Todo Lists)
  - Evidence: `client/src/config/navigation.ts` (group `admin`), `client/src/App.tsx` (`/users`), `client/src/App.tsx` (`/settings/feature-flags`), `client/src/App.tsx` (`/time-clock`), `client/src/App.tsx` (`/workflow-queue`).
- **VIP Portal (customer-facing subset)** (VIP login + dashboard)
  - Evidence: `routes.csv` rows `/vip-portal/login` and `/vip-portal/dashboard`; VIP auth middleware `server/_core/trpc.ts` (`vipPortalProcedure` reads `x-vip-session-token`).

**Architecture basics (as implemented):**

- **Frontend:** React + wouter routes, with most screens behind `ProtectedRoute` and `AppShell`.
  - Evidence: `client/src/App.tsx` (protected routes wrapper), `client/src/components/auth/ProtectedRoute.tsx`.
- **Backend:** Node/Express + tRPC routers mounted under `appRouter`.
  - Evidence: `server/_core/index.ts` (Express + tRPC wiring), `server/routers.ts` (`export const appRouter = router({ ... })`).
- **Database:** MySQL schema defined with Drizzle.
  - Evidence: `drizzle/schema.ts` (MySQL tables and enums), plus schema extension files referenced by `entities.csv` (for example `drizzle/schema-live-shopping.ts`, `drizzle/schema-scheduling.ts`).

## What TERP Is Not (Or At Least Not Present As A First-Class Module)

The repo does **not** show first-class UI routes or backend router namespaces for:

- **Payroll** / **HR** / **benefits** / **employee performance reviews**
- **Manufacturing / MRP** (BOMs, work orders)
- **Multi-currency accounting**

Evidence (route/module surface area scan):

- Frontend routes are centralized in `client/src/App.tsx` and do not include modules like `/payroll`, `/hr`, `/manufacturing`.
- Backend tRPC routers are centralized in `server/routers.ts` and do not include namespaces like `payroll`, `hr`, or `manufacturing`.
- Many currency displays use `Intl.NumberFormat("en-US", { currency: "USD" })`.
  - Evidence: `client/src/components/work-surface/OrdersWorkSurface.tsx` (`formatCurrency`), `server/routers/payments.ts` (`formatCurrency`).

If a “missing” module exists outside these files (for example behind a feature flag or in a separate app), that intent is **UNSPECIFIED** from this repo alone.

## Primary User Personas (Inferred From UI/Permissions)

These personas are grounded in navigation grouping + the permissions enforced by backend procedures.

1. **Sales user (sales rep / sales manager)**
   - JTBD: maintain clients, build quotes and orders, convert needs into sales, share sales sheets.
   - Evidence: `client/src/config/navigation.ts` (Sales group), `server/routers.ts` (`clients`, `orders`, `quotes`, `salesSheets`, `clientNeeds`, `matching`).

2. **Inventory manager**
   - JTBD: intake new inventory, adjust inventory status/locations, manage vendors and POs.
   - Evidence: `client/src/config/navigation.ts` (Inventory group), `server/routers/inventory.ts` (`inventory.intake`, `inventory.updateStatus`), `server/routers/purchaseOrders.ts`.

3. **Warehouse/fulfillment staff**
   - JTBD: pick, pack, and mark orders ready/shipped.
   - Evidence: `/pick-pack` route in `client/src/App.tsx`, Pick/Pack API in `server/routers/pickPack.ts` (adminProcedure).

4. **Accountant / finance user**
   - JTBD: create invoices, record payments, review AR/AP and ledger entries.
   - Evidence: finance routes in `routes.csv` (for example `/accounting`, `/accounting/invoices`); Invoices UI `client/src/components/work-surface/InvoicesWorkSurface.tsx`; accounting API `server/routers/accounting.ts` (invoices, payments, ledger).

5. **Admin / system operator**
   - JTBD: manage users, system settings, feature flags, scheduling/time-clock.
   - Evidence: `/users`, `/settings`, `/settings/feature-flags`, `/scheduling`, `/time-clock` in `client/src/App.tsx`; adminProcedure in `server/_core/trpc.ts`.

6. **VIP customer (external user of the VIP portal)**
   - JTBD: log into the VIP portal, view the VIP dashboard/catalog, receive notifications (price alerts, debt aging).
   - Evidence: VIP routes in `routes.csv` (`/vip-portal/*`); VIP portal session auth in `server/_core/trpc.ts` (`vipPortalProcedure`); price alerts + debt aging crons in `server/cron/priceAlertsCron.ts` and `server/cron/debtAgingCron.ts`.

## Success Metrics (What The Product Appears To Care About)

This repo contains **two different sources** for “metrics”:

1. **Dashboard widgets focused on operational visibility** (sales, cash flow, inventory snapshot, debt, etc.)
   - Evidence: `client/src/pages/DashboardV3.tsx` (widget list includes `SalesByClientWidget`, `CashFlowWidget`, `InventorySnapshotWidget`, `TotalDebtWidget`, etc.).

2. **Docs that describe KPI cards but also warn about mock/placeholder data**
   - Evidence: `docs/PROJECT_CONTEXT.md` (KPI card list near the “Dashboard & Homepage” section; “Dashboard KPIs use mock data” in the “Known Issues & Limitations” section).

Because the dashboard can be configured and data sources may be mocked in some contexts, the _true_ “success metrics” are partially **UNSPECIFIED** and must be validated in the live app.

## Glossary (UI/Code Terms You’ll See)

- **Batch**: an inventory unit tracked with quantities and statuses.
  - Evidence: `drizzle/schema.ts` (`batches` table; `batchStatusEnum`), `server/inventoryUtils.ts`.
- **Lot**: a grouping concept used during intake; batches reference lots.
  - Evidence: `drizzle/schema.ts` (`lots` table), `server/inventoryIntakeService.ts` (creates a lot, then a batch).
- **SKU**: a generated identifier for a batch (often used as the display name in orders).
  - Evidence: `server/inventoryIntakeService.ts` (SKU generation before inserting `batches`).
- **COGS**: cost-of-goods-sold; stored per batch and used for margin/GL posting.
  - Evidence: `drizzle/schema.ts` (`batches.cogsMode`, `unitCogs*` fields), `server/services/orderAccountingService.ts` (COGS ledger entries).
- **On-hand / Reserved / Quarantine / Hold**: quantity buckets for inventory.
  - Evidence: `server/inventoryUtils.ts` (available quantity formula).
- **Direct Intake**: an intake UI that submits new batches via `inventory.intake`.
  - Evidence: `routes.csv` row `/direct-intake`; backend `server/routers/inventory.ts` (`inventory.intake`).
- **Pick & Pack**: fulfillment UI for packing orders into bags/containers.
  - Evidence: `client/src/App.tsx`, `server/routers/pickPack.ts`.
- **Invoice / Payment / Ledger Entry**: accounting objects. Invoices and payments post double-entry records.
  - Evidence: `server/services/orderAccountingService.ts` (invoice GL entries), `server/routers/payments.ts` (payment GL entries).
- **Public/demo user**: an auto-provisioned user used when no session exists; read-only for most actions.
  - Evidence: `server/_core/context.ts` (public user provisioning), `server/_core/trpc.ts` (mutation rejection unless Super Admin).
