# 06_NAVIGATION_AND_ROUTES (Where To Click, What Route Does What)

## Sources Of Truth

- Route definitions: `client/src/App.tsx`
- Sidebar structure and grouping: `client/src/config/navigation.ts`
- Code-derived route matrix: `routes.csv`
  - Columns: module, route, purpose, key_components, key_queries, key_mutations, evidence_paths

If you are in a live walkthrough and need to answer “what does this page touch?”, start with `routes.csv`.

## Sidebar Navigation (What Users Will See)

Navigation groups and items are defined in `client/src/config/navigation.ts`.

- Sales group includes: Dashboard, Inbox, Clients, Orders, Interest List, Sales Sheets, Live Shopping, Leaderboard, Client Needs, Matchmaking, Quotes, Returns.
  - Evidence: `client/src/config/navigation.ts` (`navigationItems` with `group: "sales"`).
- Inventory group includes: Pick & Pack, Products, Inventory, Photography, Samples, Purchase Orders, Vendors, Vendor Supply, Spreadsheet View, Direct Intake.
  - Evidence: same file.
- Finance group includes: Invoices, AR/AP, Credit Settings, Credits, Reports, Pricing Rules.
  - Evidence: same file.
- Admin group includes: Users, System Settings, Calendar, Todo Lists, Scheduling, Time Clock, Feature Flags, Workflow Queue, Locations.
  - Evidence: same file.

## Route Map (Grouped)

This is a human-readable subset. For full detail, see `routes.csv`.

### Public routes (no AppShell)

- `/admin-setup`: admin bootstrap/setup.
- `/login`: login page.
- `/shared/sales-sheet/:token`: public shared sales sheet.
- `/intake/verify/:token`: public verification page.
- `/vip-portal/*`: VIP portal entrypoints.

Evidence: `client/src/App.tsx` (public routes section at the top of `Router()`).

### Sales routes

- `/`: Dashboard (widgets).
- `/inbox`: Inbox.
- `/clients`: Clients Work Surface.
- `/clients/:id`: Client profile.
- `/clients/:clientId/ledger` and `/client-ledger`: Client ledger.
- `/orders`: Orders Work Surface.
- `/orders/create` and `/orders/new`: Order Creator.
- `/quotes`: Quotes Work Surface.
- `/sales-sheets`: Sales sheet creator.
- `/sales-portal`: Unified sales portal.
- `/needs`: Client needs.
- `/matchmaking`: Matchmaking service.
- `/interest-list`: Interest list.
- `/returns`: Returns.
- `/leaderboard`: Leaderboard.
- `/search`: Search results.
- `/help`: Help.

Evidence: routes in `client/src/App.tsx`; grouping in `client/src/config/navigation.ts`; detailed tRPC usage in `routes.csv`.

Canonical operations note:

- Long-term canonical order creation path is `/orders/create` (`createDraftEnhanced` + `finalizeDraft`).
- `/orders` should remain list/manage surface and not primary confirmation entry.
- Evidence: `server/routers/orders.ts:703`, `server/routers/orders.ts:1074`, `server/routers/orders.ts:614`, `client/src/components/work-surface/OrdersWorkSurface.tsx:598`.

### Inventory routes

- `/direct-intake`: Direct Intake Work Surface.
- `/inventory` and `/inventory/:id`: Inventory Work Surface.
- `/products`: Products.
- `/purchase-orders`: Purchase Orders Work Surface.
- `/pick-pack`: Pick & Pack Work Surface.
- `/vendors` and `/vendors/:id`: Vendors.
- `/vendor-supply`: Vendor supply.
- `/photography`: Photography.
- `/samples`: Samples.
- `/live-shopping`: Live shopping.
- `/spreadsheet-view`: Spreadsheet view.

Evidence: same as above.

### Finance routes

- `/accounting` and `/accounting/dashboard`: Accounting dashboard.
- `/accounting/invoices`: Invoices Work Surface.
- `/accounting/payments`: Payments.
- `/accounting/general-ledger`: General ledger.
- `/accounting/chart-of-accounts`: Chart of accounts.
- `/accounting/fiscal-periods`: Fiscal periods.
- `/accounting/bills`: Bills.
- `/accounting/bank-accounts`: Bank accounts.
- `/accounting/bank-transactions`: Bank transactions.
- `/accounting/expenses`: Expenses.
- `/accounting/cash-locations`: Cash locations.
- `/credit-settings`: Credit settings.
- `/credits`: Credits management.
- `/pricing/rules`: Pricing rules.
- `/pricing/profiles`: Pricing profiles.
- `/analytics`: Analytics.
- `/reports/shrinkage`: Shrinkage report.

Evidence: same as above.

### Admin routes

- `/users`: Users.
- `/settings`: System Settings.
- `/settings/cogs`: COGS settings.
- `/settings/notifications`: Notification preferences.
- `/settings/feature-flags`: Feature flags.
- `/account`: My Account (personal settings).
- `/calendar`: Calendar.
- `/scheduling`: Scheduling.
- `/time-clock`: Time clock.
- `/workflow-queue`: Workflow queue.
- `/locations`: Locations.
- `/todos`, `/todo`, `/todos/:listId`: Todo lists.
- `/notifications`: Notifications page.

Evidence: same as above.

## Hidden / Special Routes

### Dev-only

- `/dev/showcase`: only renders when `import.meta.env.DEV`.
  - Evidence: conditional route in `client/src/App.tsx`.

### Legacy redirects

App.tsx includes backward-compat redirects that preserve query params.

Examples:

- `/invoices` → `/accounting/invoices`
- `/ar-ap` → `/accounting`
- `/pricing-rules` → `/pricing/rules`
- (Missing compatibility route today) `/settings/display` should redirect to `/settings`, but currently falls through to 404.

Evidence: `client/src/App.tsx` (`RedirectWithSearch` + “Legacy route redirects” section).

### 404

- `/404` and fallback route to NotFound
  - Evidence: `client/src/App.tsx` (final fallback routes).
