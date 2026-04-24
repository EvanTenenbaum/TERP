# TERP Functional Baseline

> **Purpose.** This document is an as-is specification of every user-facing
> feature in TERP: every route, every page, every action, every business rule
> that today's shipping product exposes. It is handed to a UI/UX redesign
> effort so that no existing functionality is silently dropped during a
> revamp. It is **not** an aspirational spec and it is **not** a technical
> implementation guide — it is the truthful surface area of the current
> application.
>
> TERP is a specialized ERP for THCA wholesale cannabis operations. The
> stack is React 19 + Vite + Tailwind 4 + shadcn/ui on the frontend, tRPC v11
> + Express + MySQL (Drizzle ORM) on the backend, BullMQ queue, JWT session
> cookies, Pino logging, and DigitalOcean App Platform hosting.
>
> Generated: 2026-04-22 · Source of truth: `main` branch at commit `db6af0a7`.

---

## Table of Contents

1. [Route Map](#1-route-map)
2. [Navigation Structure](#2-navigation-structure)
3. [Page-by-Page Functional Inventory](#3-page-by-page-functional-inventory)
4. [Global UI Features](#4-global-ui-features)
5. [User Roles & Permissions](#5-user-roles--permissions)
6. [Key Business Flows](#6-key-business-flows)
7. [tRPC API Surface](#7-trpc-api-surface)
8. [Data Model Summary](#8-data-model-summary)

---

## 1. Route Map

Routing is implemented with **Wouter** in `client/src/App.tsx`. All routes
are declared inside a single `<Switch>`. Public routes render without the
`AppShell`/`ProtectedRoute`; everything else is wrapped in `ProtectedRoute →
AppShell → Switch`.

### Public Routes (no auth, no shell)

| URL Pattern | Component | Purpose |
| --- | --- | --- |
| `/admin-setup` | `AdminSetupPage` | One-time utility to promote all users to admin with a setup key. |
| `/login` | `Login` | Operator login form (username + password, POSTs to `/api/auth/login`). |
| `/vip-portal/login` | `VIPLogin` | External client portal login. |
| `/vip-portal` | `VIPDashboard` | Public entry that routes VIP clients to dashboard. |
| `/vip-portal/dashboard` | `VIPDashboard` | VIP portal dashboard (client-facing). |
| `/vip-portal/auth/impersonate` | `ImpersonatePage` | One-time-token exchange for admin-initiated VIP impersonation. |
| `/vip-portal/session-ended` | `SessionEndedPage` | Friendly page shown when an impersonation session ends. |
| `/shared/sales-sheet/:token` | `SharedSalesSheetPage` | Public read-only catalogue shared by token (vendor/COGS stripped server-side). |
| `/intake/verify/:token` | `FarmerVerification` | Public farmer/supplier verification page (no auth). |
| `/slice-v1-lab` | redirects to `/slice-v1-lab/purchase-orders` | UI slice lab entry. |
| `/slice-v1-lab/purchase-orders` | `PurchaseOrdersSlicePage` (lab layout) | Slice v1 UI lab version of the PO surface. |
| `/slice-v1-lab/product-intake` | `ProductIntakeSlicePage` (lab layout) | Slice v1 UI lab version of intake. |
| `/slice-v1-lab/inventory` | `InventoryBrowseSlicePage` (lab layout) | Slice v1 UI lab version of inventory browse. |

### Protected Routes (require session)

All routes below require auth. A missing session redirects to
`/login?returnUrl=<path>` (returnUrl validated to prevent open redirects).

#### Home / Dashboard

| URL | Component | Notes |
| --- | --- | --- |
| `/` | `DashboardHomePage` → `OwnerCommandCenterDashboard` | Unified home dashboard. |
| `/dashboard` | `DashboardHomePage` | Alias for `/`. |

#### Sales workspace

| URL | Component |
| --- | --- |
| `/sales` | `SalesWorkspacePage` (Linear workspace with tabs: `orders`, `pick-list`, `quotes`, `returns`, `sales-sheets`, `live-shopping`, `create-order`). |
| `/sales?tab=orders`, `…?tab=quotes`, `…?tab=returns`, `…?tab=sales-sheets`, `…?tab=live-shopping`, `…?tab=create-order`, `…?tab=pick-list` | Sub-tabs inside Sales. |
| `/sales?tab=pick-pack` | Redirects to `/inventory?tab=shipping`. |
| Legacy redirects → `/sales`: `/sales-sheets`, `/sales-sheet`, `/sales-portal` → `live-shopping`, `/orders`, `/sell/orders`, `/sell`, `/orders/create` → `create-order`, `/orders/new` → `create-order`, `/quotes`, `/returns`, `/live-shopping`. |

#### Relationships

| URL | Component |
| --- | --- |
| `/relationships` | `RelationshipsWorkspacePage` (tabs: `clients`, `suppliers`). |
| `/clients` | Redirects to `/relationships?tab=clients` (or resolves to the last used sub-tab). |
| `/clients/:id` | `ClientProfilePage`. |
| `/clients/:clientId/ledger` | `ClientLedgerPage` (renders embedded `InvoicesSurface`). |
| `/client-ledger` | `ClientLedgerPage`. |
| `/clients/:clientId/vip-portal-config` | `VIPPortalConfigPage`. |
| `/vendors` | Redirects to `/relationships?tab=suppliers`. |
| `/vendors/:id` | `VendorRedirect` (redirects legacy vendor URLs to unified client profile). |
| `/suppliers` | Redirects to `/relationships?tab=suppliers`. |

#### Demand & Supply

| URL | Component |
| --- | --- |
| `/demand-supply` | `DemandSupplyWorkspacePage` (tabs: `matchmaking`, `needs`, `interest-list`, `vendor-supply`). |
| `/needs`, `/client-needs`, `/interest-list`, `/vendor-supply`, `/matchmaking` | Redirect to `/demand-supply?tab=…`. |

#### Inventory / Operations

| URL | Component |
| --- | --- |
| `/inventory` | `InventoryWorkspacePage` (tabs: `inventory`, `intake`, `receiving`, `shipping`, `photography`, `samples`). |
| `/inventory/:id` | Redirects to `/inventory?batchId=<id>` on the `inventory` tab. |
| `/operations` | Redirects to `/inventory` (preserving `tab`). |
| `/product-intake`, `/inventory-browse`, `/intake-receipts`, `/receiving`, `/intake`, `/direct-intake`, `/slice-v1/product-intake`, `/slice-v1/inventory`, `/spreadsheet-view`, `/samples`, `/pick-pack`, `/photography` | Redirect to the appropriate `/inventory?tab=…` sub-tab. |
| `/warehouse/pick-pack` | `WarehousePickPackPage` (mobile/tablet warehouse fulfillment surface). |
| `/reports/shrinkage` | `ShrinkageReportPage`. |

#### Buying / Procurement

| URL | Component |
| --- | --- |
| `/purchase-orders` | `ProcurementWorkspacePage` (tab: `purchase-orders`). |
| `/procurement`, `/purchase-orders/classic` | Redirect to `/purchase-orders`. |

#### Products

| URL | Component |
| --- | --- |
| `/products` | `ProductsPage` (strain & product catalog admin). |
| `/strains`, `/strains/new`, `/strains/:id`, `/admin/strains` | Redirect to `/products`. |

#### Accounting / Finance

| URL | Component |
| --- | --- |
| `/accounting` | `AccountingWorkspacePage` (tabs: `dashboard`, `invoices`, `bills`, `payments`, `general-ledger`, `chart-of-accounts`, `expenses`, `bank-accounts`, `bank-transactions`, `fiscal-periods`). |
| `/accounting/{dashboard,invoices,bills,payments,general-ledger,chart-of-accounts,expenses,bank-accounts,bank-transactions,fiscal-periods}` | Redirect to `/accounting?tab=…`. |
| `/accounting/cash-locations` | `CashLocations` (multi-location cash register + shift audit). |
| `/invoices`, `/ar-ap`, `/accounts-receivable`, `/payments` | Redirect into `/accounting`. |

#### Credits

| URL | Component |
| --- | --- |
| `/credits` | `CreditsWorkspacePage` (tabs: `dashboard`, `adjustments`, `capacity`). |
| `/credit-settings` → `/credits?tab=capacity`; `/credits/manage` → `/credits?tab=adjustments`. |

#### Pricing

| URL | Component |
| --- | --- |
| `/pricing/rules` | `PricingRulesPage`. |
| `/pricing/profiles` | `PricingProfilesPage`. |
| `/pricing-rules` | Redirects to `/pricing/rules`. |
| `/settings/cogs` | `CogsSettingsPage` (tabs: Global, Client Adjustments). |

#### Analytics

| URL | Component |
| --- | --- |
| `/analytics` | `AnalyticsPage`. |
| `/reports` → `/analytics`. |
| `/leaderboard` | `LeaderboardPage`. |

#### Calendar / Scheduling

| URL | Component |
| --- | --- |
| `/calendar` | `CalendarPage` (tabs: `calendar`, `invitations`, `requests`, `timeoff`). Lazy-loaded. |
| `/calendar/invitations` → `/calendar?tab=invitations`. |
| `/scheduling` | `SchedulingPage` (lazy). Rooms, shifts, deliveries. |
| `/time-clock` | `TimeClockPage` (lazy). Clock-in/out, breaks, weekly timesheet. |

#### Notifications / Todos

| URL | Component |
| --- | --- |
| `/notifications` | `NotificationsPage` → `NotificationsHub` (tabs: `system`, `alerts`, `todos`). |
| `/inbox` → `/notifications`. |
| `/todo`, `/todos`, `/todo-lists` → `/notifications?tab=todos`. |
| `/todos/:listId` | `TodoListDetailPage`. |
| `/alerts` → `/notifications?tab=alerts`. |

#### Settings / Admin

| URL | Component |
| --- | --- |
| `/settings` | `Settings` (sectioned: Access Control, Master Data, Organization, Developer). |
| `/users`, `/admin/users` → `/settings?tab=users`. |
| `/admin/roles/new` → `/settings?tab=roles`. |
| `/locations` → `/settings?tab=locations`. |
| `/settings/feature-flags`, `/feature-flags` → `/settings?tab=feature-flags`. |
| `/settings/notifications`, `/settings/display` | Redirect to `/account`. |
| `/admin/metrics` | `SystemMetricsPage` (lazy). |
| `/admin` → `/settings`. |
| `/account` | `AccountPage` (personal profile + password + preferences). |
| `/system-settings` → `/settings`. |

#### Misc

| URL | Component |
| --- | --- |
| `/search` | `SearchResultsPage`. |
| `/workflow-queue` | `WorkflowQueuePage` (kanban board for batch status). |
| `/help` | `Help` (in-app help catalog). |
| `/dev/showcase` (DEV only) | `ComponentShowcase`. |
| `/404` | `NotFound`. |
| Fallback | `NotFound` (TER-902 friendly 404). |

### Route helpers

* `RedirectWithSearch(from, to)` — preserves `?query` on redirect.
* `RedirectWithTab(from, to, tab)` — preserves query + sets `tab=`.
* `RedirectOperationsToInventory`, `RedirectToProcurementSpreadsheet`, `RedirectToOperationsTab`, `RedirectInventoryDetailToWorkspace`, `RedirectToRelationshipsWorkspace` — enforce the newer canonical surfaces for legacy URLs and emit `trackLegacyRouteRedirect` telemetry.
* Every route is wrapped with `PageErrorBoundary` (keyed on `location`, so the boundary resets on navigation). Lazy-loaded routes also wrap in `<Suspense fallback=<PageLoading/>>`.

---

## 2. Navigation Structure

Implemented by `client/src/components/layout/Sidebar.tsx`, driven by
`client/src/config/navigation.ts`. The `AppShell` → `Layout` wraps every
protected page with a top `AppHeader` and a left `Sidebar`.

### Sidebar groups (`navigationGroups`)

```
Sell
Buy
Operations
Relationships
Finance
Admin
```

Each group has an `items` array (`navigationItems`), and each item may carry
`sidebarVisible: false` (hidden from sidebar but still available in the
Command Palette) and/or a `featureFlag` gate. Groups auto-expand if they
contain the active route; active items get a left accent border.

### Sales Quick Actions (always pinned at top when expanded)

* **New Order** → `/sales?tab=create-order` (Plus)
* **Active Orders** → `/sales?tab=orders` (FileText)
* **Sales Catalogue** → `/sales?tab=sales-sheets` (Layers)
* **Recent Customers** → `/relationships?tab=clients` (Users)
* **Today's Shipments** → `/inventory?tab=shipping` (Truck)

### Visible sidebar items

Sell: **Sales** (`/sales`), **Demand & Supply** (`/demand-supply`),
**Leaderboard** (`/leaderboard`, feature-flagged `leaderboard`).

Buy: **Purchase Orders** (`/purchase-orders`).

Operations: **Inventory** (`/inventory`).

Relationships: **Relationships** (`/relationships`).

Finance: **Accounting** (`/accounting`), **Client Credit** (`/credits`),
**Analytics** (`/analytics`).

Admin: **Calendar** (`/calendar`), **Settings** (`/settings`),
**Notifications** (`/notifications`).

### Absorbed / Command-Palette-only items (`sidebarVisible: false`)

Shipping, Sales Catalogues, Live Shopping, Photography, Samples, Product
Intake, Direct Intake, Invoices, Client Ledger, Pricing Rules, COGS
Settings, Users, Roles, Locations, Scheduling, Time Clock, Calendar
Invitations, Feature Flags, Workflow Queue, Todo Lists, System Metrics.
These continue to exist and be reachable — they simply live as tabs inside
the workspace pages they were absorbed into.

### Quick-link candidates (`defaultQuickLinkPaths`)

`/`, `/sales?tab=create-order`, `/inventory?tab=receiving`,
`/relationships?tab=clients`. Users can pin up to 4 via
`useNavigationState`.

### Sidebar UX behaviors

* **Collapse** (desktop): persists a 16-px-wide icon-only rail with tooltips.
* **Mobile drawer**: opens on hamburger click; closes automatically on route change and via overlay click.
* **Active state**: left-accent border, filled track, "page" aria-current.
* **Pending feature-flag items**: show as skeleton rows while flag data loads.
* **Footer**: user avatar, display name/email, "Logout" button that calls `useAuth.logout()`.

### App header (`AppHeader.tsx`)

Top bar on every protected page:

* Mobile menu button.
* Breadcrumb trail (hidden on `/`).
* Global search form: submit → `/search?q=…`; inline `⌘K`/`Ctrl+K` button opens Command Palette.
* Notification bell (`NotificationBell`, unread count badge).
* Settings gear (mobile).
* Account dropdown: My Account · Notifications · Command Palette · System Settings · toggle theme (light/dark) · toggle compact/comfortable UI density · build version/commit · Sign Out.

### Breadcrumb

`AppBreadcrumb` derives crumbs from the current path, mapped to friendly
labels (Sales, Clients, Accounting, etc.).

---

## 3. Page-by-Page Functional Inventory

> Every page below is reachable from the Route Map. Tabs/sub-tabs inside a
> page are documented as sub-sections. `trpc.xxx.yyy` calls listed are those
> directly imported by the page file (or a component it owns directly);
> child components may call more procedures indirectly.

### Page: `DashboardHomePage` (Owner Command Center)

* **Route:** `/`, `/dashboard`
* **Access:** All authenticated users.
* **Purpose:** Single-screen daily pulse for the owner — today's KPIs, appointments, cash decisions, debt, vendor payables, inventory health.
* **Layout:** Five vertical rows, each wrapped in `ComponentErrorBoundary`:
  1. Header: OWNER COMMAND CENTER badge, today's date, "Live · Updated HH:MM" freshness badge.
  2. **Operational KPIs** (`OperationalKpisWidget`) — orders today, cash, inventory headline KPIs (TER-1055).
  3. Daily pulse row: `OwnerQuickCardsWidget` · `OwnerAppointmentsWidget` · `OwnerCashDecisionPanel`.
  4. Money row: `OwnerDebtPositionWidget` (AR summary) · `OwnerVendorsNeedPaymentWidget`.
  5. Inventory row: `InventorySnapshotWidget` · `AgingInventoryWidget`.
  6. `OwnerSkuStatusBrowserWidget` (collapsed by default).
* **User actions:** Drill-through links from each widget (click a KPI → filtered workspace, click an invoice → AR tab, etc.). No inline mutations.
* **States:** Every widget individually handles loading/empty/error with its own boundary (so a single failure does not poison the page).

---

### Page: `SalesWorkspacePage`

* **Route:** `/sales` (canonical home for sales).
* **Access:** All authenticated users.
* **Purpose:** "Sell" workspace — the primary queue for orders, quotes, returns, catalogues, live shopping, and the new-order drawer.
* **Shell:** `LinearWorkspaceShell` (title "Sales", section "Sell", compact density, meta strip, command strip showing a `SheetModeToggle` when applicable).
* **Tabs:**

  #### Sub-tab: Orders (`tab=orders`) — default
  * Renders `OrdersWorkSurface` (classic) **or** lazy `OrdersSheetPilotSurface` (spreadsheet-native pilot when feature-flagged).
  * Mode toggle in command strip (`SheetModeToggle`) — classic ⇄ sheet-native.
  * "New Order" button in classic opens a right-side `Sheet` drawer embedding `SalesOrderSurface`.
  * Deep-link flags `ordersView=document`, `draftId`, `quoteId`, `needId`, `fromSalesSheet` force the sheet-native document view (or fall back to classic `/sales?tab=create-order` if pilot disabled).

  #### Sub-tab: Pick List (`tab=pick-list`)
  * Embeds `ShippingPickListPage` — filterable pick list with CSV export.

  #### Sub-tab: Quotes (`tab=quotes`)
  * `QuotesWorkSurface` (classic) or `QuotesPilotSurface` (sheet-native pilot) with mode toggle.

  #### Sub-tab: Returns (`tab=returns`)
  * `ReturnsPage` (embedded) or `ReturnsPilotSurface` (sheet-native pilot) with mode toggle.

  #### Sub-tab: Sales Catalogues (`tab=sales-sheets`)
  * `SalesCatalogueSurface` (sheet-native). Build/share sales sheets.
  * Any document-intent deep-link on this tab is redirected to the sheet-native orders document path.

  #### Sub-tab: Live Shopping (`tab=live-shopping`)
  * `LiveShoppingPage` — operator-side session manager (start/pause/end, room code, clients joined).

  #### Sub-tab: Create Order / New Quote (`tab=create-order`)
  * `SalesOrderSurface` (sheet-native). When `mode=quote` in the URL the tab label becomes "New Quote".

* **Key business rules:**
  * Legacy `tab=pick-pack` is hard-redirected to `/inventory?tab=shipping`.
  * `shouldForceSheetNativeOrdersSurface` gates the pilot: if pilot disabled + sheet-native intent present, redirect back to classic with the same params.
  * Right-side drawer preserves orders-queue context when creating a new order.
* **Telemetry:** `useWorkspaceHomeTelemetry("sales", activeTab)`.
* **tRPC touched via children:** `orders.*`, `quotes.*`, `salesSheets.*`, `returns.*`, `liveShopping.*`, `pickPack.*` (see §7).

---

### Page: `InventoryWorkspacePage`

* **Route:** `/inventory` (canonical Operations home).
* **Access:** All authenticated users.
* **Tabs** (from `INVENTORY_WORKSPACE`):

  #### Inventory (`tab=inventory`) — default
  * `InventoryManagementSurface` — sheet-native inventory browser with lot/batch rows, locations, adjust quantity, shrinkage, images. Deep-link param `batchId` focuses a row.

  #### Direct Intake (`tab=intake`)
  * Pilot-gated: `IntakePilotSurface` (sheet-native) with `onOpenClassic` escape hatch to `DirectIntakeWorkSurface`.
  * Creates inventory without a PO.

  #### Product Intake / Receiving (`tab=receiving`)
  * If `draftId` is present → lazy `ProductIntakeSlicePage` (receiving draft editor).
  * Otherwise → `PurchaseOrderSurface` pre-filtered to `CONFIRMED`/`RECEIVING`, with `autoLaunchReceivingOnRowClick`.

  #### Shipping / Fulfillment (`tab=shipping`)
  * Pilot-gated: `FulfillmentPilotSurface` (sheet-native) or `PickPackWorkSurface` (classic). Mode toggle in command strip.

  #### Photography (`tab=photography`)
  * Embedded `PhotographyPage` — queue of batches needing photos, upload dialog, status chips.

  #### Samples (`tab=samples`)
  * Pilot-gated: `SamplesPilotSurface` (sheet-native) or `SampleManagement` (classic) embedded.

* **Command strip:** `SheetModeToggle` appears for `intake` and `shipping` tabs.
* **Telemetry:** `useWorkspaceHomeTelemetry("inventory", activeTab)`.

---

### Page: `ProcurementWorkspacePage`

* **Route:** `/purchase-orders` (canonical Buying workspace).
* **Access:** All authenticated users.
* **Tab:** `purchase-orders` (single visible tab; legacy `receiving`/`product-intake`/`inventory-browse` redirect into Operations).
* **Surface:** `PurchaseOrderSurface` (sheet-native). Displays PO queue.
* **Command strip:** "Expected Today" quick filter — toggles `expectedToday=1` query param and pre-activates `initialShowExpectedToday` filter on the surface.
* **User actions (via PurchaseOrderSurface):** create PO, edit PO, confirm PO, split PO, receive PO (launches receiving), cancel/archive PO, add notes, attach docs, switch status.
* **Business rules:** Receiving auto-routes to `/inventory?tab=receiving&draftId=…`; `expectedToday` filter counts POs with an expected delivery date ≤ end-of-day today.

---

### Page: `AccountingWorkspacePage`

* **Route:** `/accounting`.
* **Access:** All authenticated users; some sub-features gate on permissions (e.g., creating bills, recording payments, GL journal entries).
* **Shell:** `LinearWorkspaceShell` with 10 tabs.
* **Tabs:**
  * **Dashboard** (`AccountingDashboard` embedded) — overdue AR/AP alerts, `PayVendorModal`, `ReconciliationSummary`, `DataCardSection` KPIs, GL reversal viewer, links to invoices/bills/payments/expenses.
  * **Invoices** (`InvoicesSurface` lazy sheet-native) — list, filter, edit, send, mark paid, record payment, void, client-ledger drill-down, GL reversal.
  * **Bills** (`BillsSurface` lazy) — list, create, bill detail sheet with `BillStatusActions` state machine (Draft → Pending → Paid / Voided), status timeline.
  * **Payments** (`PaymentsSurface` lazy) — list payments, filter by type/date/amount/number.
  * **General Ledger** (`GeneralLedgerSurface` lazy) — browse ledger entries, create journal entries (`JournalEntryForm`), date range, period selector.
  * **Chart of Accounts** (`ChartOfAccountsSurface` lazy) — CRUD accounts, hierarchy, activate/deactivate.
  * **Expenses** (`ExpensesSurface` lazy) — list/create expenses, assign categories, mark reimbursable/reimbursed.
  * **Bank Accounts** (`BankAccountsSurface` lazy) — CRUD bank accounts, total cash balance.
  * **Bank Transactions** (`BankTransactionsSurface` lazy) — list transactions, filter, reconcile flag.
  * **Fiscal Periods** (`FiscalPeriodsSurface` lazy) — open/close periods with date pickers.
* **Auxiliary route:** `/accounting/cash-locations` → `CashLocations` (multi-location cash register, shift audits, transfers, ledger history).

---

### Page: `RelationshipsWorkspacePage`

* **Route:** `/relationships`.
* **Tabs:**
  * **Clients** (`ClientsWorkSurface`) — customer directory, search/filter, quick-create, click → `ClientProfilePage`.
  * **Suppliers** (`VendorsWorkSurface`) — supplier directory (backed by clients with `isSeller=true`; the legacy `vendors` table is deprecated).

---

### Page: `ClientProfilePage`

* **Route:** `/clients/:id`.
* **Access:** All authenticated users; some actions gated by permissions & `useCreditVisibility`.
* **Purpose:** Unified 360° profile for any client (customer, supplier, or dual-role).
* **Shell:** `LinearWorkspaceShell` with five sections:
  * **Overview** — metric cards, `RelationshipRoleBadge`, quick stats, freeform notes (`FreeformNoteWidget`), comments (`CommentWidget`).
  * **Sales & Pricing** — `PricingConfigTab` (profile & rule overrides), `ClientNeedsTab`, VIP portal settings (`VIPPortalSettings`, `LiveCatalogConfig`).
  * **Money** — credit status (`CreditStatusCard`), `ConsignmentRangePanel`, ledger timeline, invoices/orders/payments rows, `PaymentFollowUpPanel` (open SMS/email templates from `buildPaymentFollowUpSubject`/`Notes`).
  * **Supply & Inventory** — `SupplierProfileSection` (for suppliers), batch/lot history, active supply entries.
  * **Activity** — `CommunicationTimeline` and `AddCommunicationModal` for logging calls/SMS/email/meeting/note.
* **Per-section actions:** Edit client (dialog), change relationship roles, add/edit communication, open calendar for meetings (`ClientCalendarTab`), book appointment, view ledger, drill to order/payment/PO, configure VIP portal.
* **Business rules:**
  * Credit visibility gates whether credit fields show in overview/money sections.
  * Links in Money ledger route to the right surface: orders → sales workspace, payments → `/accounting/payments?id=`, POs → `/purchase-orders?poId=`.
* **tRPC:** `clients.getById`, `clientCommunications.*`, `clientLedger.*`, `credits.*`, `relationshipProfile.*`, `client360.*`, `comments.*`, `freeformNotes.*`, `vipPortalAdmin.config.*`.

---

### Page: `ClientLedgerPage`

* **Routes:** `/clients/:clientId/ledger`, `/client-ledger`.
* **Purpose:** Renders the unified `InvoicesSurface` (which includes an embedded ledger view) — the dedicated legacy ledger pages were retired (TER-976).

---

### Page: `CalendarPage` (lazy)

* **Route:** `/calendar`.
* **Tabs:** `calendar`, `invitations`, `requests`, `timeoff` (set via `?tab=`; default `calendar`).
* **Views:** Month / Week / Day / Agenda (`MonthView`, `WeekView`, `DayView`, `AgendaView`).
* **Panels:**
  * `CalendarFilters` — filter by calendar, owner, category.
  * `PendingInvitationsWidget` — pending invitations for current user.
  * `AppointmentRequestsList` + `AppointmentRequestModal` — approve/reject client appointment requests.
  * `TimeOffRequestsList` — manage team time-off.
  * `EventFormDialog` — create/edit event (recurrence, participants, reminders).
* **Badge counts:** pending appointment requests and pending team time-off counts surface on tab labels.
* **tRPC:** `calendar.*`, `calendarRecurrence.*`, `calendarParticipants.*`, `calendarReminders.*`, `calendarInvitations.*`, `calendarFinancials.*`, `appointmentRequests.*`, `timeOffRequests.*`, `calendarsManagement.*`, `calendarViews.*`.

---

### Page: `SchedulingPage` (lazy)

* **Route:** `/scheduling`.
* **Tabs:** `calendar`, `shifts`, `deliveries`.
* **Views:** Week / Month / Day.
* **Panels:** `RoomSidebar`, `RoomBookingModal`, `RoomManagementModal`, `TodaysAppointments`, `LiveQueue`, `ShiftScheduleView`, `DeliveryScheduleWidget`.
* **Actions:** Create/move room bookings; manage rooms (Admin); shift calendar; delivery schedule widget.
* **tRPC:** `scheduling.*`.

---

### Page: `TimeClockPage` (lazy)

* **Route:** `/time-clock`.
* **Purpose:** Clock-in/out, break management, weekly timesheet view, timesheet reports grouped by day/week/employee.
* **Actions:** Clock In, Clock Out, Start Break, End Break; navigate week; change report group-by (day/week/employee); refresh.
* **States:** Shows current clock status with live badge; alerts when clock-status or actions fail.
* **tRPC:** `hourTracking.*`.

---

### Page: `NotificationsPage` → `NotificationsHub`

* **Route:** `/notifications`.
* **Tabs:**
  * **system** (`InlineNotificationPanel`) — system/in-app notifications, "mark all read", link follow-through via `normalizeNotificationLink`.
  * **alerts** (`AlertsPanel`) — low-stock, needs-matching, and workflow alerts.
  * **todos** — grid of `TodoListCard`s. Actions: **New List** (`TodoListForm`), **New Todo** (`QuickAddTaskModal`), delete list (`ConfirmDialog`), click card → `/todos/:id`.
* **Empty / loading / error:** `EmptyState`/`LoadingState`/`ErrorState` per tab.
* **tRPC:** `notifications.*`, `alerts.*`, `todoLists.*`.

---

### Page: `TodoListDetailPage`

* **Route:** `/todos/:listId`.
* **Purpose:** View & manage one todo list.
* **Features:** Task cards with complete/uncomplete, edit (`TaskForm`), delete (`ConfirmDialog`); edit list (`TodoListForm`); delete list; stats badges (completed, overdue, in-progress).
* **tRPC:** `todoLists.getById`, `todoTasks.getListTasks`, `todoTasks.getListStats`, `todoTasks.complete`, `todoTasks.uncomplete`, `todoTasks.delete`, `todoLists.delete`.

---

### Page: `TodoListsPage` (legacy; reachable via `/todo-lists` redirect to Notifications hub)

* Same card grid + create/quick-add + delete as the Notifications Todos tab.

---

### Page: `SearchResultsPage`

* **Route:** `/search?q=…`.
* **Purpose:** Unified global search results.
* **Sections (from `search.global`):** Quotes, Orders, Customers, Products & Batches. Empty-state operational guidance when none match.
* **Actions:** Typing updates the query param (bug-042 guards against stale UI during nav); clicking a row navigates to its surface.
* **tRPC:** `search.global`.

---

### Page: `AnalyticsPage`

* **Route:** `/analytics`.
* **Controls:** Period selector (`day`/`week`/`month`/`quarter`/`year`/`all`); export dropdown (`summary`/`revenue`/`clients`/`inventory` as CSV or JSON).
* **Content:** `MetricCard` KPI tiles, `TopClientsTable`, `RevenueTrendsTable`. Fetches granularity-aware trends (day for short periods, month otherwise).
* **tRPC:** `analytics.getExtendedSummary`, `analytics.getRevenueTrends`, `analytics.getTopClients`, `analytics.exportData`, `organizationSettings.getDisplaySettings`.

---

### Page: `LeaderboardPage`

* **Route:** `/leaderboard`.
* **Purpose:** Internal sales performance leaderboard.
* **Filters:** Client type (ALL/CUSTOMER/SUPPLIER/DUAL), metric category (MASTER/FINANCIAL/ENGAGEMENT/RELIABILITY/GROWTH), text search, sort by `master_score` or `ytd_revenue` (asc/desc), pagination.
* **Actions:** `ExportButton`, `WeightCustomizer` (change master-score weights), refresh, click row → `/clients/:id`.
* **tRPC:** `leaderboard.*`, `gamification.*`.

---

### Page: `DemandSupplyWorkspacePage`

* **Route:** `/demand-supply`.
* **Tabs:**
  * **matchmaking** — `MatchmakingServicePage` (unified hub: client needs, supplier supply, and suggested matches; filtering by strain/category/grade/price; match badges; convert match to order).
  * **needs** — `NeedsManagementPage` (list all client needs; filter by status/priority/strain/grade/category; CRUD needs).
  * **interest-list** — `InterestListPage` (clients' interest entries, convert to order or dismiss, CSV export).
  * **vendor-supply** — `VendorSupplyPage` (supplier supply list, CRUD entries, assign to needs).
* **Command strip:** Quick buttons to jump to matchmaking or supplier-supply.
* **tRPC:** `clientNeeds.*`, `vendorSupply.*`, `matching.*` (enhanced), `clients.*`.

---

### Page: `OrderCreatorPage`

* **Route:** Rendered inside Sales Workspace via `SalesOrderSurface` in classic mode; legacy standalone route redirects into the sales workspace (`/orders/create` → `/sales?tab=create-order`).
* **Purpose:** Full-featured sales-order/quote creation with COGS visibility, margin management, credit enforcement, and draft/finalize workflow.
* **Major sections:**
  * `ClientCombobox` + `QuickCreateClient` for client selection.
  * `ClientCommitContextCard` — active commit context (linked need, sales-sheet portable cut).
  * `CreditLimitBanner` + `CreditStatusCard` + `CreditLimitWidget` — visualize credit available; hard/soft/warning enforcement.
  * `CreditWarningDialog` / `CreditOverrideRequest` — override flow when over-limit.
  * `InventoryBrowser` — add batches as line items; quick-add quantity.
  * `LineItemTable` / `OrdersDocumentLineItemsGrid` — editable line items: batch, product name, qty, unit COGS (fixed or range with LOW/MID/HIGH/MANUAL basis), below-vendor-range flag + reason, isCogsOverridden + override reason, margin %/$ (manual / customer-profile / default), retail price, applied pricing rules, is-sample flag, line total.
  * `OrderAdjustmentPanel` + `OrderTotalsPanel` + `FloatingOrderPreview` — discounts/fees/show-on-document toggle, live totals, preview doc.
  * `PricingConfigTab` + `PricingContextPanel` — show/apply pricing rules & profile defaults.
  * `ReferredBySelector` + `ReferralCreditsPanel` — referral crediting.
  * `ProfileQuickPanel` — inline quick panel for the selected client (overview / money / sales-pricing sections).
  * `KeyboardHintBar` + `WorkSurfaceStatusBar` — save indicator, keyboard hints.
* **Order type:** SALE or QUOTE (`mode=quote` URL flag drives labels/copy).
* **States:** Draft save (debounced), autosave, finalize, convert quote→order, send, cancel, clone.
* **Validation:** Zod schema `orderValidationSchema`; credit-check enforcement modes `WARNING` / `SOFT_BLOCK` / `HARD_BLOCK`.
* **Keyboard:** Custom hotkeys via `useWorkSurfaceKeyboard` (add line, save, confirm, navigate).
* **tRPC:** `orders.*` (draft/confirm/void/get), `orderEnhancements.*`, `pricing.*`, `credit.*`, `credits.*`, `clients.*`, `inventory.*`, `referrals.*`, `cogs.*`.

---

### Page: `ShippingPickListPage`

* **Route:** Embedded in `/sales?tab=pick-list`.
* **Purpose:** Operator's warehouse pick list for confirmed orders.
* **Controls:** Status filter (`all`, `pending`, `partial`, `fulfilled`), date-from, date-to. CSV export of rows.
* **Rows:** Order number, client, date, line items with batch + qty, location, picker, status badge.
* **tRPC:** `orders.getPickList`.

---

### Page: `WarehousePickPackPage`

* **Route:** `/warehouse/pick-pack`.
* **Purpose:** Mobile/tablet-optimized warehouse UI for fulfilling confirmed orders (touch-first, ≥44 px tap targets).
* **Features:**
  * List of orders with statuses `PENDING`/`PARTIAL`/`READY`/`SHIPPED`.
  * Select an order → see line items with batch & location.
  * **Scan** (barcode input) or **Tap** to pick an item.
  * **Pack complete** workflow → marks line items packed, attaches bag identifier.
  * Search/filter orders; refresh.
* **tRPC:** `pickPack.getPickList`, `pickPack.pick`, `pickPack.pack`, `pickPack.packComplete`.

---

### Page: `ReturnsPage`

* **Route:** Embedded in `/sales?tab=returns`.
* **Purpose:** Create and manage RMAs for sold items.
* **Features:**
  * Return reason enum (`DEFECTIVE`/`WRONG_ITEM`/`NOT_AS_DESCRIBED`/`CUSTOMER_CHANGED_MIND`/`OTHER`).
  * Select source order + line items, specify qty returned.
  * Create return dialog with notes.
  * `ReturnGLStatus` — displays GL reversal status for the return.
  * State machine: Draft → Received → Inspected → Restocked/Disposed → Closed.
* **tRPC:** `returns.*`, `refunds.*`.

---

### Page: `ShrinkageReportPage`

* **Route:** `/reports/shrinkage`.
* **Content:** Back button to `/inventory`, title "Shrinkage Report", `ShrinkageReport` component (variant "full"): by-batch shrinkage, reason breakdown, export.

---

### Page: `PricingRulesPage`

* **Route:** `/pricing/rules`.
* **Purpose:** CRUD pricing rules.
* **Features:** Searchable table; create dialog; edit dialog; delete confirm alert; active/inactive toggles; rule scope (global / by category / by client / by profile); markup or markdown config.
* **tRPC:** `pricing.*`, `pricingDefaults.*`.

---

### Page: `PricingProfilesPage`

* **Route:** `/pricing/profiles`.
* **Purpose:** CRUD pricing profiles (named rule bundles assignable to clients).
* **Features:** Form with name, description, checkbox list of rules + priority ordering. Table of profiles with edit/delete.

---

### Page: `CogsSettingsPage`

* **Route:** `/settings/cogs`.
* **Tabs:** `Global Settings` (`CogsGlobalSettings`) and `Client Adjustments` (`CogsClientSettings`).
* **Purpose:** Configure COGS calculation mode (fixed/range LOW/MID/HIGH), global defaults, per-client overrides.

---

### Page: `SharedSalesSheetPage`

* **Route:** `/shared/sales-sheet/:token` (public).
* **Purpose:** Client-facing read-only catalogue accessed by token.
* **Data displayed (strictly client-safe):** product name, category/subcategory/brand/strain, quantity, price, image. Internal fields (vendor, batchSku, cogs*, basePrice, priceMarkup, appliedRules) are stripped server-side and **must not** appear here.
* **tRPC:** `salesSheets.getByToken`.

---

### Page: `LiveShoppingPage` (staff side)

* **Route:** Embedded under `/sales?tab=live-shopping`.
* **Purpose:** Operator console for live shopping sessions (FEATURE-016).
* **Features:** Create session dialog (title, room code generated/typed, notes, expected clients); session list with status badges; start/pause/end session; `StaffSessionConsole` (live client list, item additions, chat). Deep-link via `?sessionId=…`.

---

### Page: `InterestListPage`

* **Route:** Embedded in `/demand-supply?tab=interest-list`.
* **Purpose:** Track client interest in specific products/batches not yet bought.
* **Features:** Filterable/sortable table of interests; multi-select → CSV export; per-row menu: create order from interest, remove, view client; stats (top products, trending categories).
* **tRPC:** `clientNeeds.*`, `orders.*`.

---

### Page: `VendorSupplyPage`

* **Route:** Embedded in `/demand-supply?tab=vendor-supply`.
* **Purpose:** CRUD supplier supply announcements (inventory offered by suppliers).
* **Form fields:** vendor, strain, product name, category/subcategory, grade, quantity available, unit price, available-until, notes.
* **tRPC:** `vendorSupply.*`, `vendors.*` / `clients.*`.

---

### Page: `NeedsManagementPage`

* **Route:** Embedded in `/demand-supply?tab=needs`.
* **Purpose:** Central list of all active client needs with enhanced matching metadata.
* **Fields per need:** status (`ACTIVE`/`FULFILLED`/`EXPIRED`/`CANCELLED`), priority (`URGENT`/`HIGH`/`MEDIUM`/`LOW`), strain, category/subcategory, grade, qty min/max, client, notes.
* **Actions:** Filter/search, create/edit need, cancel/fulfill, attach to match.
* **tRPC:** `clientNeeds.*`, `matching.*`.

---

### Page: `MatchmakingServicePage`

* **Route:** Embedded in `/demand-supply?tab=matchmaking`.
* **Purpose:** Unified hub showing client needs, supplier supply, and suggested matches with score badges; convert a match into a draft order.
* **Actions:** Create need, create supply, compute/update matches, open order from match, override match, dismiss.
* **tRPC:** `matching.*` (enhanced), `clientNeeds.*`, `vendorSupply.*`, `orders.*`.

---

### Page: `AccountingDashboard`

* **Route:** Embedded in `/accounting?tab=dashboard`.
* **Content:** KPI data-cards, overdue AR/AP lists (auto-alerts when >25 overdue), `PayVendorModal`, `ReconciliationSummary`, `GLReversalViewer`, permission-gated actions (record payment, reverse GL, pay vendor).
* **tRPC:** `accounting.*`, `payments.*`, `invoices.*`, `bills.*`, `vendorPayables.*`.

---

### Page: `Bills` (accounting)

* **Route:** Embedded in `/accounting?tab=bills`.
* **Features:** Filterable/sortable table; detail sheet with `BillStatusActions` state machine and `BillStatusTimeline`; create bill dialog; aging badges; deep-link via `?billId=`.

---

### Page: `Payments` (accounting)

* **Route:** Embedded in `/accounting?tab=payments`.
* **Features:** Filterable table (`paymentDate`/`amount`/`paymentType`/`paymentNumber`); deep-link via `?paymentId=`, `?invoiceId=`, `?orderId=`; status badges; detail drawer.

---

### Page: `BankAccounts`

* **Route:** Embedded in `/accounting?tab=bank-accounts`.
* **Features:** Table of accounts (name, number, type, bank, current balance, active), total cash balance card, create account dialog.

---

### Page: `BankTransactions`

* **Route:** Embedded in `/accounting?tab=bank-transactions`.
* **Features:** Filter/sort table of transactions (date, type, description, reference, amount, reconciled flag), create transaction, mark reconciled.

---

### Page: `ChartOfAccounts`

* **Route:** Embedded in `/accounting?tab=chart-of-accounts`.
* **Features:** Hierarchical accounts table; create, edit, delete (when allowed), activate/deactivate; account type badges.

---

### Page: `Expenses`

* **Route:** Embedded in `/accounting?tab=expenses`.
* **Features:** Filter/sort table; create expense (category, amount, date, reimbursable flag); category CRUD; category-breakdown cards; mark reimbursed.

---

### Page: `FiscalPeriods`

* **Route:** Embedded in `/accounting?tab=fiscal-periods`.
* **Features:** List periods with status; open/close a period; create period (date range with calendar popover); warning when journal entries exist.

---

### Page: `GeneralLedger`

* **Route:** Embedded in `/accounting?tab=general-ledger`.
* **Features:** Filter/sort ledger entries; date range picker with calendar; create journal entry (`JournalEntryForm`); detail dialog with line-items.

---

### Page: `CashLocations`

* **Route:** `/accounting/cash-locations`.
* **Purpose:** Multi-location cash register management (MEET-002/003/004).
* **Tabs / content:** Locations list; per-location ledger; shift audit; cash transfers; alerts for negative balance or missing audits.
* **Actions:** Create/edit location, deposit/withdraw, transfer between locations, open/close shift, download audit log, toggle active.
* **tRPC:** `cashAudit.*`.

---

### Page: `ProductsPage`

* **Route:** `/products`.
* **Purpose:** Strain & product catalogue admin (TER-642).
* **Features:** Search (`useTableUrlState`-driven URL state), create strain dialog (name, category indica/sativa/hybrid, description), edit strain, refresh; tabular list with category color badges.
* **tRPC:** `strains.*`, `products.*`, `productCatalogue.*`.

---

### Page: `PhotographyPage`

* **Route:** Embedded in `/inventory?tab=photography`.
* **Features:** Filterable queue of batches (`PENDING`/`IN_PROGRESS`/`COMPLETED`); select batches; `PhotographyModule` upload dialog (`UploadArea`, multi-file upload, progress); status chips; mark complete.
* **tRPC:** `photography.*`.

---

### Page: `SampleManagement`

* **Route:** Embedded in `/inventory?tab=samples`.
* **Features:**
  * `SampleForm` — request a sample (client, product, qty, expected return).
  * `SampleList` with operator-lane filter: `ALL`/`OUT`/`RETURN`; status filters (`REQUESTED`/`OUT`/`RETURNED`/`CONSUMED`/`LOST`).
  * `SampleReturnDialog`, `VendorShipDialog`, `LocationUpdateDialog`.
  * `ExpiringSamplesWidget` — samples past expected return.
* **tRPC:** `samples.*`.

---

### Page: `VIPPortalConfigPage`

* **Route:** `/clients/:clientId/vip-portal-config`.
* **Purpose:** Configure VIP portal behavior for one client.
* **Features:** Toggle per-module enablement (dashboard, live catalog, live shopping, AR, AP, transaction history, VIP tier, credit center, marketplace needs/supply) and granular feature settings within each (e.g., `ar.showSummaryTotals`, `dashboard.showGreeting`, etc.).
* **Layout:** Accordion-style expandable modules with switches; preview button to open the client's portal.
* **tRPC:** `vipPortalAdmin.config.get`, `vipPortalAdmin.config.update`.

---

### Page: `VIPLogin`

* **Route:** `/vip-portal/login`.
* **Purpose:** Login for external VIP clients.
* **tRPC:** `vipPortal.auth.login` (stores `vip_session_token`/`vip_client_id`/`vip_client_name` in localStorage; redirects to `/vip-portal/dashboard`).
* **UX:** Inline error + toast. Forgot password → toast directing to contact support.

---

### Page: `VIPDashboard`

* **Route:** `/vip-portal`, `/vip-portal/dashboard`.
* **Purpose:** Client-facing hub; rendered modules depend on the per-client config:
  * **Dashboard** — current balance, YTD spend, greeting, quick links.
  * **Live Catalog** (`LiveCatalog`) — see offered inventory filtered to the client.
  * **Live Shopping** (`LiveShoppingPage` sub-route) — join active sessions.
  * **Marketplace Needs** (`MarketplaceNeeds`) — submit/view needs.
  * **Marketplace Supply** (`MarketplaceSupply`) — offered supply.
  * **Accounts Receivable** (`AccountsReceivable`) — invoices owed to TERP.
  * **Accounts Payable** (`AccountsPayable`) — bills TERP owes this client.
  * **Transaction History** (`TransactionHistory`).
  * **Leaderboard** (`Leaderboard`) — optional gamification.
  * **Appointments** (`AppointmentBooking`).
  * **Documents** (`DocumentDownloads`) — invoice/bill PDFs.
  * `VipNotificationsBell` in header.
  * `ImpersonationBanner` displayed when the admin is impersonating.
  * `VipTierBadge`.
* **Navigation:** Left tabs + hamburger drawer on mobile (`Sheet`). Logout button clears local/session storage.

---

### Page: `AppointmentBooking` (VIP)

* **Route:** Embedded in VIPDashboard.
* **Purpose:** Client requests an appointment.
* **Flow:** Choose calendar → choose appointment type → pick date in next 14 days → pick slot → add notes → submit.
* **Confirmation:** Shows requestId/date/time.
* **tRPC:** `vipPortal.appointments.listCalendars`, `getSlots`, `create` request.

---

### Page: `DocumentDownloads` (VIP)

* **Route:** Embedded in VIPDashboard.
* **Features:** Choose invoice → download PDF; choose bill → download PDF.
* **tRPC:** `vipPortal.ar.getInvoices`, `vipPortal.ap.getBills`, `vipPortal.documents.downloadInvoicePdf`, `vipPortal.documents.downloadBillPdf`.

---

### Page: `LiveShoppingPage` (VIP)

* **Route:** Embedded in VIPDashboard.
* **Flow:** Client auto-queries for an active session; enters a room code to join; `LiveShoppingSession` renders the three-status shopping workflow (browsing / requesting / confirmed).
* **tRPC:** `vipPortalLiveShopping.getActiveSession`, `joinByRoomCode`.

---

### Page: `ImpersonatePage` (VIP)

* **Route:** `/vip-portal/auth/impersonate?token=…`.
* **Purpose:** Exchange a one-time admin-issued token for a VIP session.
* **States:** `loading` → `success` (redirects to `/vip-portal` after 1.5 s) / `error` / `expired` / `invalid`.
* **UX:** On success shows amber "Impersonation mode active — all actions are logged" banner.
* **tRPC:** `vipPortalAdmin.audit.exchangeToken`.

---

### Page: `SessionEndedPage` (VIP)

* **Route:** `/vip-portal/session-ended`.
* **Purpose:** Friendly "session ended" message with a "Close Tab" button.

---

### Page: `VIPPortalConfigPage` (admin)

* Described above; staff-side configuration of a client's VIP portal.

---

### Page: `Settings` (System)

* **Route:** `/settings`.
* **Access:** All users can see some sections; Admin/DevTools gating per section (see §5).
* **Groups & sections** (from `SETTINGS_GROUPS` / `SETTINGS_SECTIONS`):
  * **Access Control**: Users (`UserManagement`), User Roles (`UserRoleManagement`), Roles (`RoleManagement`), Permissions (`PermissionAssignment`).
  * **Master Data**: Product Metadata (`ProductsWorkSurface`), Locations, Categories, Grades, Tags (`TagManagementSettings`).
  * **Organization**: Organization settings (`GeneralOrgSettings`, `UserPreferencesSettings`, `UnitTypesManager`, `FinanceStatusManager`), Calendars (`CalendarSettings`).
  * **Developer**: Feature Flags (`EmbeddedFeatureFlagsPage`, requires admin), VIP Access (`VIPImpersonationManager`), Database (dev-tools only).
* **Deep links:** `?tab=` sets the active section. Unsaved-changes guard for destructive edits (`useBeforeUnloadWarning`).

---

### Page: `FeatureFlagsPage` (settings/feature-flags)

* Full table of flags; toggle system-wide enablement; add role overrides and user overrides; audit history dialog; create-flag dialog.
* **tRPC:** `featureFlags.*`.

---

### Page: `NotificationPreferencesPage` (account)

* Embedded in `AccountPage` and reachable via legacy `/settings/notifications`.
* **Controls:** Toggle `inAppEnabled`, `emailEnabled`, `appointmentReminders`, `orderUpdates`, `systemAlerts`. Reset-to-default button.
* **tRPC:** `notifications.preferences.get`/`update`.

---

### Page: `AccountPage` (My Account)

* **Route:** `/account`.
* **Sections:** Profile (name/email editable), Security (change password), Personal preferences (Theme, Regional, Language, Notifications teaser), full `NotificationPreferencesPage` embedded.
* Contrast link at top points to `/settings` for org-level settings.

---

### Page: `WorkflowQueuePage`

* **Route:** `/workflow-queue`.
* **Views:** `board` (kanban), `settings`, `history`, `analytics` (driven by `?view=`).
* **Board:** `WorkflowBoard` drag-and-drop; add batch dialog (select status, batches by search, priority).
* **Settings:** `WorkflowSettings` — create/rename/reorder workflow statuses, set colors, set "completed" flag.
* **History:** `WorkflowHistory` — batch status change log.
* **Analytics:** `WorkflowAnalytics` — throughput & bottleneck metrics.
* **tRPC:** `workflowQueue.*`.

---

### Page: `AdminSetupPage`

* **Route:** `/admin-setup` (public, one-time utility).
* **Purpose:** Promote all users to admin by entering the env-protected setup key. Will be removed post-bootstrap.
* **tRPC:** `adminSetup.promoteAllToAdmin`.

---

### Page: `SystemMetricsPage`

* **Route:** `/admin/metrics` (lazy).
* **Purpose:** Runtime health (uptime, memory, event loop lag) and resource-usage cards.
* **tRPC:** `monitoring.*`.

---

### Page: `FarmerVerification`

* **Route:** `/intake/verify/:token` (public).
* **Purpose:** Farmer/supplier verifies the intake receipt sent to them by email/link.
* **Actions:** View receipt items and quantities; confirm all / flag discrepancy per item; add notes; sign & confirm.
* **tRPC:** `intakeReceipts.*` (verifyByToken, recordDiscrepancy, acknowledge).

---

### Page: `Help`

* **Route:** `/help`.
* **Purpose:** In-app help catalog with searchable sections: Dashboard, Inventory, Sales & Orders, Clients, Analytics, Accounting. Each section has description + topics list + long-form training copy. No external links, no tRPC.

---

### Page: `NotFound`

* **Route:** `/404` and fallback. Friendly user-facing 404 (TER-902).

---

### Page: `Login`

* **Route:** `/login`.
* **Form:** username + password; `credentials: include` `POST /api/auth/login`; returnUrl from the original protected route.
* **Dev bypass:** `VITE_SKIP_LOGIN_LOCAL=true` in dev auto-redirects to `/`.

---

### Slice-V1 Lab pages (`/slice-v1-lab/*`)

These pages are explorations of the "UI slice v1" workbench layout — kept
for ongoing UX experimentation. Each renders inside `SliceV1WorkbenchLayout`.

#### `PurchaseOrdersSlicePage`

Queue + drawer UI for purchase orders with:
* Filters (search, status, supplier).
* `GridColumnsPopover` — toggle visible columns (persisted as grid preference).
* Create PO (`ClipboardPlus` CTA) with categories/subcategories from `buildPurchaseOrderCategoryOptions`.
* Drawer detail view with line items + receiving launch.
* History dialog; deep-links (`purchaseOrdersDeepLink`).

#### `ProductIntakeSlicePage`

Detailed intake draft editor:
* Source PO summary, line items, per-item quantity received, shortages, samples, location selector, adjust-quantity dialog.
* Persists to `productIntakeDrafts` (localStorage) + server.
* History, gallery, waypoints (timeline), discrepancies.
* Reset/rollback via `RotateCcw`.

#### `InventoryBrowseSlicePage`

Slice-lab inventory browser with columns for SKU, product, status, on-hand, cost, supplier, images. Deep-link, drawer detail, grid preferences.

---

## 4. Global UI Features

### 4.1 Command Palette (`CommandPalette.tsx`)

* **Trigger:** `Ctrl+K` / `⌘K` (or clicking the shortcut pill in the header search box).
* **Always-visible groups** (empty query state):
  * **Pinned**: New Order, New Intake, Inventory, Customers.
  * **Recently Opened**: top 5 of `recentPages` (minus current page).
  * **Navigation**: every item from `buildNavigationAccessModel().commandNavigationItems` (includes absorbed sidebar items — e.g. Shipping, Samples, Photography, Todo Lists, Workflow Queue, System Metrics). First entry is always "Go to Dashboard".
  * **Actions**:
    * New Sales Order (`N`)
    * Record Receiving (`R`)
    * Expected deliveries today
    * Sales Catalogue
    * Help & Documentation (`?`)
* **Active search state** (≥1 character, 30 ms debounce): calls `trpc.search.global` and renders Quotes, Orders, Relationships, Products & Batches result groups. `Searching…` loading row; "No results found" empty.
* Selection dispatches `handleNavigate(url)` which records the page in `useRecentPages` and closes the dialog.

### 4.2 Notifications Bell (`NotificationBell`)

* Visible in `AppHeader` for every protected route.
* Shows unread notification count badge; click opens the inline panel with notifications (latest first); mark-all-read; click a notification links to `normalizeNotificationLink(notification.link)`.
* Also surfaces system alerts when configured.
* Data: `notifications.*`, `alerts.*`, `inbox.*`.

### 4.3 Global keyboard shortcuts (`App.tsx` / `useKeyboardShortcuts`)

* `Ctrl+K` / `⌘K` — Open command palette.
* `Ctrl+N` — New Sale (navigate to `/sales?tab=create-order`).
* `Ctrl+Shift+T` — Quick add task (opens `QuickAddTaskModal`). Works even while typing in an input.
* `?` — Show keyboard shortcuts modal.
* `N` (not in input) — New Order.
* `I` (not in input) — Inventory.
* `C` (not in input) — Customers (`/relationships?tab=customers`).
* `Esc` — Close command palette, quick-add task, and keyboard shortcuts modal.

`KeyboardShortcutsModal` groups shortcuts into Navigation / Actions / Quick
Navigation / Command Palette categories.

### 4.4 Quick-Add Task Modal (`QuickAddTaskModal`)

* Invocation: `Ctrl+Shift+T` globally, "New Todo" button inside Notifications/Todos tab, or `/todos` page.
* Inputs: title, list (select existing or create inline), optional priority/due date/assignee.
* On create: invalidates `todoLists.getMyLists` and `todoTasks.getListTasks`; optionally navigates to `/todos/:createdListId` if a new list was created.
* Close on Esc.

### 4.5 Theme, Density, Toasts

* `ThemeProvider` (default `light`, switchable). Toggle in account menu.
* `useUiDensity` — compact / comfortable spacing toggle (account menu).
* `<Toaster />` (sonner) renders global toasts (success, error, info).
* `StagingAgentation` — staging-only overlay UI.
* `VersionChecker` — hot-reload banner when a new build is available.

### 4.6 Error Boundaries

* Top-level `<ErrorBoundary>` around everything.
* `PageErrorBoundary` wraps every route (resets on location change).
* `ComponentErrorBoundary` wraps each dashboard widget individually.

---

## 5. User Roles & Permissions

TERP uses **JWT session cookies** (see `server/routers/auth.ts`) plus an
RBAC layer (`server/routers/rbac-*`). A user has a base `role` enum +
permissions granted via Roles.

### 5.1 Base auth roles (`users.role` enum)

* `user`
* `admin`

The `admin` role is an RBAC bypass (wildcard `*` permission) used by
`usePermissions` on the client and `adminProcedure` on the server.

### 5.2 RBAC model

* `roles` table (seeded with system roles + custom roles). System roles cannot be edited/deleted.
* `permissions` table (module-scoped names like `rbac:roles:read`, `accounting:invoice:create`, `orders:confirm`, etc.).
* `rolePermissions` join.
* `userRoles` join — a user can have multiple roles.
* `server/services/permissionService.ts` caches per-user permission sets; cache invalidates on role/permission mutations.

### 5.3 Server-side guards

* `publicProcedure` — anyone.
* `protectedProcedure` — requires session; `ctx.user` populated.
* `strictlyProtectedProcedure` — requires session and rejects the public demo user.
* `adminProcedure` — requires admin role.
* `.use(requirePermission("permission:name"))` — per-procedure permission gate.
* `getAuthenticatedUserId(ctx)` — the only permitted way to attribute an actor on any mutation (agent protocol enforces this).

### 5.4 Client-side guards

* `ProtectedRoute` — wraps every protected route; shows loading spinner while `useAuth` resolves; redirects to `/login?returnUrl=…` if unauthenticated; renders "Access Denied" if `requiredPermission` is set and missing.
* `usePermissions()` — hook returning the user's permission set + helper predicates. Used to gate UI controls (e.g., "Reverse GL", "Record Payment", "Revoke Sessions", "Override Credit Limit").
* `useCreditVisibility()` — gate credit-related fields.
* `useFeatureFlags()` — gates feature-flagged sidebar items and UI (leaderboard, pilot surfaces, etc.).

### 5.5 Role-gated UI highlights

* **Admin-only**: Admin Setup, Feature Flags page, Database settings, User/Role/Permission management UIs, VIP Impersonation Manager, Admin metrics, admin data-augment and migration utilities.
* **Permission-gated**: GL reversal, invoice create/void, bill state transitions, payment record, credit overrides, bad-debt write-off, vendor payment, cash shift close, workflow-status CRUD, calendar admin, time-off approval, leaderboard weight config, pricing rule/profile CRUD.
* **VIP portal**: separate auth (`vipPortalAuth`) keyed to clients; an admin can impersonate via one-time token (`/vip-portal/auth/impersonate`) which is audited in `vipPortalAdmin.audit`.

---

## 6. Key Business Flows

### A. Order Creation Flow

**Entry points**

* Sidebar "Sales Quick Actions" → **New Order** (`/sales?tab=create-order`).
* Orders tab → "New Order" CTA → right-side drawer.
* Global hotkeys `Ctrl+N` or single-key `N`.
* Command Palette action "New Sales Order" (`N` shortcut).
* From a client profile → "Create Order" link.
* From matchmaking/needs/interest list → "Convert to Order".
* From a shared sales sheet (catalogue) → operator action.

**Steps (inside `OrderCreatorPage` / `SalesOrderSurface`):**

1. Choose client (`ClientCombobox`, quick-create if new).
2. Review `ClientCommitContextCard` (linked need, sales-sheet cut, client profile quick panel).
3. Choose order type: `SALE` or `QUOTE`.
4. Add line items via `InventoryBrowser` or paste rows. Each line:
   * Pick batch; system fills product display name, base price, COGS mode (FIXED / RANGE), unit COGS (or LOW/MID/HIGH basis), retail price, applied rules, markup.
   * Edit qty, unit price, margin % / $; flag overrides (below vendor range, COGS override, margin override).
5. Optional `OrderAdjustmentPanel` (discount/fee flat or %), `ReferralCreditsPanel`, `ReferredBySelector`.
6. Run credit check (`credit.checkLimit`): returns `allowed`/`warning`/`requiresOverride` with enforcement mode `WARNING`/`SOFT_BLOCK`/`HARD_BLOCK`. Over-limit → `CreditWarningDialog` and override request flow.
7. **Save Draft** (debounced autosave while editing) → `orders.saveDraft`.
8. **Finalize** (Send / Confirm / Create Invoice dropdown) → `orders.confirm` → status `CONFIRMED`; quote → `orders.convertQuoteToOrder`.
9. On confirm: deducts/reserves inventory, triggers accounting hooks (invoice creation), sets `orderStatusHistory`, fires `notifications` / `inbox` / `workflowQueue` hooks.
10. Order detail drawer/surface supports: edit pre-confirm, void/cancel (audit), duplicate, generate receipt, attach documents, open ledger, open pick list.

**States:** `DRAFT` → `CONFIRMED` → `PARTIAL` → `SHIPPED`/`FULFILLED` → `CLOSED`; `VOID`/`CANCELLED` terminal. Quotes: `QUOTE_DRAFT` → `QUOTE_SENT` → `ACCEPTED`/`REJECTED` → promoted to Sale.

---

### B. Inventory Intake Flow

Two paths converge at the Inventory workspace:

**Direct Intake (no PO)**
1. `/inventory?tab=intake` → `IntakePilotSurface` or `DirectIntakeWorkSurface`.
2. Enter source (supplier client), lot, batches, quantities, cost, locations, images.
3. Save → inventory rows created with `intakeSessions`/`intakeSessionBatches`.

**PO-based Receiving**
1. PO exists (see flow C).
2. `/purchase-orders` → PO with status `CONFIRMED` / `RECEIVING` → click row or use Operations tab.
3. `/inventory?tab=receiving` lists POs ready to receive; click row launches receiving draft (`draftId` query param).
4. Inside receiving draft: per-line received qty, shortages, discrepancies, samples toggle, location routing, notes.
5. Submit → creates intake receipt rows; updates PO item quantities; creates inventory batches; optionally emails farmer with verification link (`/intake/verify/:token`).

**Outputs:** New/updated batches in `batches`, `batchLocations`, `inventoryMovements`; intake receipt with optional farmer verification; dashboard "Inventory Snapshot" and shrinkage report updated.

---

### C. Purchase Order Flow

1. `/purchase-orders` → create PO (supplier, expected delivery, items with qty/price/category/subcategory).
2. Save draft; edit; add deposits/fees; attach docs.
3. **Confirm** → status `CONFIRMED` (locks most fields; generates PO number).
4. **Record payment to supplier** (bill created / AP flow — see E.3).
5. Supplier delivers → **Receive** (flow B).
6. Post-receiving: PO status becomes `RECEIVING` while partial, `RECEIVED` when complete, optionally closed.
7. Supplier returns (vendor returns) flow when items need to be returned.
8. Expected-today filter and supplier reminder emails via `vendorReminders`.

---

### D. Client / Relationship Flow

1. Create client: Relationships tab → Clients → "New Client" → set `isBuyer` / `isSeller`, contact fields, tags, roles.
2. Open `ClientProfilePage`: Overview / Sales & Pricing / Money / Supply & Inventory / Activity.
3. Log communications via `AddCommunicationModal` (type: call/sms/email/meeting/note, subject, body).
4. Configure per-client pricing (`PricingConfigTab`) and credit capacity (`CreditStatusCard` + capacity UI).
5. Configure VIP portal access via `/clients/:id/vip-portal-config`.
6. Book client-appointments (`ClientCalendarTab` + `AppointmentBooking`).
7. Review money panel: ledger timeline, invoices, payments, bad debt, credit adjustments, payment follow-up templates (auto-generate SMS/email subject + notes from `buildPaymentFollowUpSubject` / `buildPaymentFollowUpNotes`).
8. Supplier-specific: `SupplierProfileSection` with harvest reminders.

---

### E. Accounting Flows

**E.1 Invoice lifecycle**
1. Order confirmed → invoice created (manual or auto via `accountingHooks`).
2. `/accounting?tab=invoices` — open `InvoicesSurface`; edit, send, mark sent.
3. Record payment (`payments.recordPayment` or via Invoice detail).
4. Partial/fully paid → status transitions; GL entries posted.
5. Dispute → `invoiceDisputes.*` (debt dispute).
6. Write-off bad debt → `badDebt.*` (permission-gated).
7. GL reversal via `GLReversalViewer` (admin-permissioned); produces reversing entries.

**E.2 Payment recording**
1. `/accounting?tab=payments` → "Record Payment" or launched from invoice row.
2. Select invoice(s), payment method, bank account, amount, date, reference.
3. Supports installment payments (`installmentPayments.*`), crypto (`cryptoPayments.*`), service billing, transaction fees, custom payment terms (consignment/cash/COD via `paymentTerms.*`).
4. On success: `invoicePayments` row, `bankTransactions` row if tied to a bank account, ledger entries, invoice aging updated.

**E.3 Bill management**
1. `/accounting?tab=bills` → "Create Bill" (vendor, items, amount, due date).
2. Bill state machine: `DRAFT` → `PENDING` → `APPROVED` → `PAID`, plus `VOIDED`.
3. "Pay Vendor" button (`PayVendorModal`) — records payment, updates bank balance, GL.
4. Vendor payable queue (`vendorPayables.*`) alerts when SKU hits zero.

**E.4 Cash locations / shifts**
* Multi-location cash register (`/accounting/cash-locations`). Per-location ledger, shifts, transfers. Shift audits for variance detection.

**E.5 Fiscal periods & GL**
* `/accounting?tab=fiscal-periods` open/close periods.
* `/accounting?tab=general-ledger` browse + journal-entry creation.
* `/accounting?tab=chart-of-accounts` CRUD accounts.

---

### F. VIP Portal Flow (client-facing)

1. **Client-driven login:** Client navigates to `/vip-portal/login` → enters email + password → `vipPortal.auth.login` stores session locally → redirected to `/vip-portal/dashboard`.
2. **Admin impersonation:** Admin opens Settings → VIP Access (`VIPImpersonationManager`) → "Login as Client" → backend creates session + one-time token → new tab opens `/vip-portal/auth/impersonate?token=…` → `ImpersonatePage` exchanges the token via `vipPortalAdmin.audit.exchangeToken` → session stored in sessionStorage (tab-specific) → redirected to `/vip-portal` with impersonation banner ("Impersonation mode active — all actions are logged").
3. **Dashboard modules** are rendered conditionally per `vipPortalConfigurations` flags for that client.
4. **Actions available to a VIP client** (subject to config flags):
   * View balances, YTD spend, transaction history.
   * Browse Live Catalog (pre-filtered inventory).
   * Join Live Shopping sessions via room code; participate in the three-status workflow.
   * Submit Marketplace Needs; offer Marketplace Supply.
   * Book appointments.
   * Download invoice/bill PDFs.
   * View referral credits & leaderboard (when enabled).
5. **End session:** Logout clears tokens; if impersonation ends without tab auto-close, `/vip-portal/session-ended` is shown.

---

## 7. tRPC API Surface

The single `appRouter` is declared in `server/routers.ts`. All procedures
live under `server/routers/*.ts`. Every procedure is Zod-validated; errors
throw `TRPCError`. Mutations attribute the actor via
`getAuthenticatedUserId(ctx)`.

Router names registered on `appRouter`:

```
system, auth, inventory, settings, strains, cogs, scratchPad,
dashboard, accounting, freeformNotes, clients, clientLedger, credit,
credits, badDebt, inventoryMovements, pricing, salesSheets, orders,
quotes, invoices, payments, auditLogs, configuration, accountingHooks,
samples, dashboardEnhanced, salesSheetEnhancements,
advancedTagFeatures, tags, productIntake, intakeReceipts,
orderEnhancements, clientNeeds, vendorSupply, vendors, purchaseOrders,
locations, returns, refunds, warehouseTransfers, poReceiving, matching,
userManagement, dataCardMetrics, admin, adminImport, analytics,
adminMigrations, adminQuickFix, adminSchemaPush, adminSchema,
adminDataAugment, vipPortal, vipPortalAdmin, vipTiers, pricingDefaults,
dashboardPreferences, todoLists, todoTasks, comments, users, inbox,
notifications, todoActivity, calendar, calendarParticipants,
calendarReminders, calendarViews, calendarRecurrence, calendarMeetings,
calendarFinancials, calendarInvitations, calendarsManagement,
appointmentRequests, timeOffRequests, rbacUsers, rbacRoles,
rbacPermissions, workflowQueue, deployments, monitoring, search,
leaderboard, liveShopping, vipPortalLiveShopping, unifiedSalesPortal,
pickPack, referrals, audit, receipts, alerts, photography,
vendorReminders, featureFlags, adminSetup, spreadsheet, catalog,
organizationSettings, cashAudit, vendorPayables, scheduling, client360,
relationshipProfile, clientWants, officeSupply, storage,
productCategories, hourTracking, gamification, invoiceDisputes,
transactionFees, paymentTerms, productCategoriesExtended, productGrades,
serviceBilling, cryptoPayments, installmentPayments, health,
productCatalogue
(+ debug in dev only)
```

Below is the high-value catalogue per router, grouped by domain. `[Q]` =
query, `[M]` = mutation. Descriptions summarize behavior based on the
router source; not every sub-procedure (many routers expose 20+) is
enumerated.

### Authentication & Users

* **auth** — `me [Q]` current user; `logout [M]` revokes session + bulk-invalidates tokens; `updateProfile [M]` name/email; `changePassword [M]` bcrypt + token invalidation; `getTestToken [M]` (dev/test only) issues a session token for E2E; `revokeUserSessions [M]` admin-only revoke all tokens for a target user.
* **users** — basic user CRUD helpers.
* **userManagement** — admin user management (list/create/disable/reset).
* **rbacRoles** — list/getById/create/update/delete roles; assignPermission/removePermission/bulkAssignPermissions/replacePermissions; all permission-gated.
* **rbacUsers** — manage a user's roles.
* **rbacPermissions** — list/get permissions.
* **adminSetup** — `promoteAllToAdmin [M]` (setup key gated).

### Dashboard & Analytics

* **dashboard** — cards, overdue AR/AP, KPI calculators, owner-specific widgets.
* **dashboardEnhanced** — additional KPI summaries.
* **dashboardPreferences** — per-user layout preferences.
* **dataCardMetrics** — reusable KPI data for cards.
* **analytics** — `getExtendedSummary [Q]`, `getRevenueTrends [Q]`, `getTopClients [Q]`, `exportData [M]` (CSV/JSON).
* **leaderboard** — list clients with ranks, weight configs, rank history.
* **gamification** — master score, metric categories, rank changes.
* **monitoring** — runtime metrics (uptime, memory, lag).
* **health** — liveness/readiness probe.
* **deployments** — deployment ledger.

### Clients / Relationships

* **clients** — CRUD, search, tagging, role flags, quick-create. (`db.query.vendors` is banned; use clients with `isSeller=true`.)
* **client360** — 360° aggregation for the profile page.
* **relationshipProfile** — section data for Money/Sales/Supply tabs.
* **clientWants** — needs/wants tracking (MEET-021).
* **vendors** — legacy compatibility; vendors table is **deprecated**.
* **vendorReminders** — harvest/supplier reminders.
* **vendorPayables** — payables due when SKU hits zero (MEET-005).
* **referrals** — referral credit system.

### Credit

* **credit** / **credits** — credit capacity, exposure, credit adjustments, summary, apply to invoice.
* **badDebt** — write-off and restoration.
* **creditOverrideRequests** (exposed under `credit`) — request/approve overrides.

### Inventory / Product

* **inventory** — batches, lots, locations, adjust quantity, shrinkage, search, filters.
* **inventoryMovements** — movement ledger.
* **products / productCatalogue / productCategories / productCategoriesExtended / productGrades / strains / brands / tags / advancedTagFeatures** — catalogue management.
* **productIntake / intakeReceipts** — intake draft lifecycle and farmer verification (FEAT-008).
* **poReceiving** — PO-linked receiving.
* **purchaseOrders** — CRUD, confirm, cancel, state machine, expected-today.
* **locations / storage** — warehouse locations.
* **photography** — photography queue & uploads.
* **samples** — sample requests, allocations, location updates, returns.
* **warehouseTransfers** — inter-location transfers.
* **pickPack** — warehouse pick/pack list & actions.
* **cogs / cogsRules** — global & client-level COGS configuration.
* **pricing / pricingDefaults** — rules, profiles, range pricing channels.
* **catalog** — published catalogue (INV-4).

### Sales

* **orders** — draft/save/confirm/void, line-item allocations, adjustments, status history, pick list, audit log (plus enhancements).
* **orderEnhancements** — order-side helpers.
* **quotes** — quote lifecycle + conversion to order.
* **returns / refunds / vendorReturns** — return and refund flows with state machine and GL reversal status.
* **salesSheets / salesSheetEnhancements** — catalogue CRUD, templates, drafts, token-shared view (`getByToken`).
* **liveShopping / vipPortalLiveShopping / unifiedSalesPortal** — staff and client live shopping.
* **serviceBilling** — billable services (MEET-009).

### Accounting

* **accounting** — umbrella router aggregating invoice/bill/payment KPIs; also hosts bankAccounts, chartOfAccounts, expenses, bankTransactions sub-namespaces.
* **accountingHooks** — side-effect hooks that post ledger entries on order confirm/payment/etc.
* **invoices** — CRUD, status, dispute, send, void.
* **invoiceDisputes** — MEET-017.
* **bills** (under `accounting`/bill router) — CRUD, state machine, approvals.
* **payments / invoicePayments** — record payment, split, reconcile.
* **paymentTerms** — consignment/cash/COD (MEET-035).
* **installmentPayments** — MEET-036.
* **cryptoPayments** — MEET-019.
* **transactionFees** — MEET-018.
* **cashAudit** — cash location & shift audits.
* **fiscalPeriods** (under `accounting`) — open/close.

### Calendar / Scheduling

* **calendar** — events CRUD; month/week/day/agenda queries; permissions.
* **calendarParticipants / calendarReminders / calendarRecurrence / calendarViews / calendarFinancials / calendarInvitations / calendarMeetings / calendarsManagement** — supporting surfaces.
* **appointmentRequests** — client-requested appointments (approve/reject).
* **timeOffRequests** — team time-off management.
* **scheduling** — rooms, shifts, delivery schedule (Sprint 4 Track D).
* **hourTracking** — time clock, breaks, timesheets (MEET-048).

### Notifications / Collaboration

* **notifications** — inbox, preferences (in-app, email, appointment reminders, order updates, system alerts), mark read.
* **alerts** — configurable alerts (low-stock, needs, workflow).
* **inbox** — unified inbox item list.
* **comments** — entity-scoped comments with mentions.
* **freeformNotes** — dashboard + profile notes, activity log.
* **todoLists / todoTasks / todoActivity** — personal task management.
* **workflowQueue** — kanban statuses, batch status history, add batches to a status.

### VIP Portal

* **vipPortal** — client auth (`auth.login`), dashboard KPIs, AR/AP readers, transaction history, live catalog, documents (`downloadInvoicePdf`/`downloadBillPdf`), marketplace (needs/supply), appointments (`listCalendars`, `getSlots`, `create`).
* **vipPortalAdmin** — per-client config (`config.get`/`update`), impersonation (`audit.exchangeToken`, start/end session), live-catalog admin.
* **vipTiers** — tier configuration (FEAT-019).
* **vipAlerts** — (see `vipAlerts.ts`).

### Admin / Ops Tools

* **admin** — admin ops helpers.
* **adminImport / adminMigrations / adminQuickFix / adminSchemaPush / adminSchema / adminDataAugment** — destructive/maintenance tools gated to admin.
* **auditLogs / audit** — audit trail readers (WS-005).
* **featureFlags** — flags, role/user overrides, audit history.
* **organizationSettings** — org-wide settings (general, display, unit types, finance statuses) — FEAT-010–015.
* **settings** — general settings surface.
* **configuration** — deployment config.
* **officeSupply** — office supply needs (MEET-055).
* **receipts** — generate receipts (WS-006).
* **search** — `global [Q]` unified search (quotes, orders, customers, products, batches).
* **spreadsheet** — spreadsheet-native pilot support.

---

## 8. Data Model Summary

Drizzle schema lives at `drizzle/schema.ts`. Highlights of the entity graph
(see the schema file for full columns). All tables include `createdAt`,
`updatedAt`, and most include `deletedAt` (soft delete is mandatory — hard
deletes are forbidden outside of explicit admin tools).

### Identity & auth
* `users` (role: `user|admin`) · `userPreferences` · `userDashboardPreferences`.
* RBAC: `roles`, `permissions`, `rolePermissions`, `userRoles`.

### Party model (core)
* `clients` — every buyer, supplier, or dual-role entity. Flags `isBuyer` / `isSeller`. Suppliers extend via `supplierProfiles`.
* `clientCommunications`, `clientActivity`, `clientNotes`, `clientTransactions`, `clientTags`.
* `supplierProfiles` — supplier-specific data.
* `vendors` — **deprecated**; use `clients.isSeller = true`.

### Product catalogue
* `brands`, `strains`, `products`, `productSynonyms`, `productMedia`, `productImages`, `tags`, `tagHierarchy`, `tagGroups`, `tagGroupMembers`, `productTags`, `categories`, `subcategories`, `grades`.

### Inventory
* `lots` — upstream batch containers.
* `batches` — sellable inventory units (SKU, quantity, strain, category, status).
* `batchLocations` — warehouse placement.
* `inventoryMovements` — audit trail (in/out/transfer/adjust/shrink).
* `inventoryAlerts`, `inventoryViews`.
* `locations` — warehouses / rooms.
* `cogsHistory`, `cogsRules` — cost tracking & rules.
* `intakeSessions`, `intakeSessionBatches`, `intakeReceipts`, `intakeReceiptItems`, `intakeDiscrepancies` — intake/receiving.
* `warehouseTransfers`.
* `workflowStatuses`, `batchStatusHistory`.

### Purchasing
* `purchaseOrders`, `purchaseOrderItems`, `vendorReturns`, `vendorReturnItems`, `vendorPayables`, `payableNotifications`, `vendorHarvestReminders`, `vendorNotes`.

### Sales
* `orders`, `orderLineItems`, `orderLineItemAllocations`, `orderStatusHistory`, `orderAuditLog`, `orderBags`, `orderItemBags`, `orderPriceAdjustments`.
* `returns`, `sampleInventoryLog` (sale-time samples).
* `recurringOrders`.
* `salesSheetTemplates`, `salesSheetHistory`, `salesSheetDrafts`, `salesSheetVersions`.
* `sales` (legacy sales records).

### Pricing / Credit
* `pricingRules`, `pricingProfiles`, `variableMarkupRules`, `priceHistory`, `pricingDefaults`, `rangePricingChannelSettings`.
* `clientCreditLimits`, `creditSignalHistory`, `creditSystemSettings`, `creditAuditLog`, `creditVisibilitySettings`, `creditOverrideRequests`, `credits`, `creditApplications`, `clientLedgerAdjustments`.
* `referralCredits`, `referralCreditSettings`.

### Accounting
* `accounts` (chart of accounts).
* `ledgerEntries` — double-entry postings.
* `fiscalPeriods`.
* `invoices`, `invoiceLineItems`, `invoicePayments`, `transactions`, `transactionLinks`.
* `bills`, `billLineItems`.
* `payments`, `paymentHistory`, `paymentMethods`.
* `bankAccounts`, `bankTransactions`.
* `expenseCategories`, `expenses`.
* `receipts`.
* `cashLocations`, `cashLocationTransactions`, `shiftAudits`.

### Collaboration / Productivity
* `freeformNotes`, `noteComments`, `noteActivity`.
* `comments`, `commentMentions`.
* `todoLists`, `todoListMembers`, `todoTasks`, `todoTaskActivity`.
* `notifications`, `notificationPreferences`, `inboxItems`.
* `scratchPadNotes`.

### Calendar / Scheduling / HR
* `calendars`, `calendarUserAccess`, `appointmentTypes`, `calendarAvailability`, `calendarBlockedDates`.
* `calendarEvents`, `calendarRecurrenceRules`, `calendarRecurrenceInstances`, `calendarEventParticipants`, `calendarReminders`, `calendarEventHistory`, `calendarEventAttachments`, `calendarViews`, `calendarEventPermissions`, `clientMeetingHistory`, `calendarEventInvitations`, `calendarInvitationSettings`, `calendarInvitationHistory`.
* `appointmentRequests`, `timeOffRequests`.

### Demand/Supply matching
* `clientNeeds`, `vendorSupply`, `matchRecords`.
* `sampleRequests`, `sampleAllocations`, `sampleLocationHistory`.

### VIP Portal
* `vipPortalConfigurations` — per-client module & feature flags.
* `vipPortalAuth` — VIP session/credential records.

### Dashboard / Leaderboard
* `dashboardWidgetLayouts`, `dashboardWidgetConfigs`, `dashboardKpiConfigs`.
* `leaderboardWeightConfigs`, `leaderboardDefaultWeights`, `leaderboardMetricCache`, `leaderboardRankHistory`.

### Admin / Infra
* `alertConfigurations`, `deployments`, `auditLogs`, `demoMediaBlobs`, `idempotencyKeys`, `sequences` (number generators), `organizationSettings`, `unitTypes`, `customFinanceStatuses`.

### Key relationships (simplified)

```
users 1─┬─* userRoles ─* roles ─* rolePermissions ─* permissions
        └─* todoLists ─* todoTasks
clients 1─┬─* orders ─* orderLineItems
          ├─* clientNeeds ─* matchRecords *─ vendorSupply
          ├─* clientTransactions  ├─* clientLedgerAdjustments
          ├─* clientCommunications ├─* invoices ─* invoiceLineItems
          ├─* supplierProfiles     ├─* bills ─* billLineItems
          └─* vipPortalConfigurations  └─* credits / creditApplications
purchaseOrders 1─* purchaseOrderItems ─*─ batches ─* batchLocations
orders → invoices via accountingHooks; invoices ─* invoicePayments ─* payments
ledgerEntries posted by order confirm / invoice / payment / bill / GL reversal
calendars 1─* calendarEvents 1─* calendarEventParticipants (users|clients)
todoLists 1─* todoTasks 1─* todoTaskActivity
```

---

## Appendix A — Feature Flags (Observed)

Only flags explicitly referenced in the navigation / UI code are listed
here; many more flags exist in `featureFlags.ts` for pilot surfaces.

* `leaderboard` — gates the sidebar Leaderboard link.
* Spreadsheet-native pilot flags — gate per-tab sheet-native surfaces (Orders, Quotes, Returns, Intake, Fulfillment, Samples). Consumed through `useSpreadsheetPilotAvailability` / `buildSurfaceAvailability`.
* Dev-only `/dev/showcase` route is conditionally rendered when `import.meta.env.DEV`.

## Appendix B — Notable deprecated / redirected surfaces

* Everything under `/slice-v1/*` permanent-redirects to the canonical Operations or Purchase Orders workspace.
* `/operations` is an alias for `/inventory`.
* `/spreadsheet-view` redirects into `/inventory?tab=receiving` (PurchaseOrderSurface).
* `/vendors/*` redirects to the unified Client profile.
* `/client-ledger` renders the unified `InvoicesSurface` (the legacy ledger pages are retired).
* `/admin-setup` is temporary and slated for removal after first-boot.
