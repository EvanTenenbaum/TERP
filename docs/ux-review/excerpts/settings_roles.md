# Baseline excerpt for `Settings.roles`

**Route:** `/settings?tab=roles` — Depth: **lightweight**

## From FUNCTIONAL_BASELINE.md

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

## Runtime supplement (if any)

- **Shell chrome is persistent across every protected page**: left sidebar (collapsible) with top "Sales Quick Actions" tiles, then expandable groups `Sell`, `Buy`, `Operations`, `Relationships`, `Finance`, `Admin`. Top bar has a global search (`Ctrl+K`), notification bell with a `9+` badge, account button (shows `QA Super Admin`), and a "U" / "Menu" affordance.
- **Breadcrumbs** appear directly under the top bar (e.g. `Home ▸ Sales`, `Home ▸ Inventory`).
- **Every workspace uses the same two-row "workspace header"**: bold title, one-line subtitle describing the purpose, then a **blue "Primary / Current view / Handoff" band** with tab chips.
- **Spreadsheet-native surfaces** consistently show a "Spreadsheet View / Standard View" toggle at the top of the content area, a column header strip, and a footer reading "Click select row · Shift+Click extend range · Ctrl+Click add to selection · Ctrl+C copy cells · Ctrl+A select all".
- **A staging banner `TERP [STAGING]`** is rendered as the product wordmark in the sidebar header. Production would presumably drop the `[STAGING]`.
- **An annotation overlay toolbar** (v3.0.2) is embedded on every page — this is a dev/QA capture tool (labels: Pause animations, Layout mode, Hide markers, Copy feedback, Send Annotations, Clear all, Settings, Output Detail, React Components, Marker Color, Block page interactions, Manage MCP & Webhooks). It is not part of the core TERP UI but is always present on this build.
- **Loading states** are generally terse — a plain `Loading...` string (e.g. `/clients/:id/vip-portal-config`) or no skeleton at all; most list surfaces render content or an explicit empty state directly.
- **A global "Update Available 🚀"** banner appeared once at the top of `/notifications` reading "A new version is available. Click to reload." with a `Reload` button — this is an app-shell update notifier that fires when a new bundle is deployed.

- **Pinned** — New Order · New Intake · Inventory · Customers
- **Navigation** — Go to Dashboard (`D`) · Sales · Demand & Supply · Shipping · Sales Catalogues · Live Shopping · Leaderboard · Purchase Orders · Inventory · Photography · Samples · Product Intake · Relationships · Accounting · Client Credit · Analytics · Invoices · Client Ledger · Pricing Rules · COGS Settings · Calendar · Settings · Notifications · Users · Roles · Locations · Scheduling · Time Clock · Calendar Invitations · Feature Flags · Workflow Queue · Todo Lists · System Metrics
- **Actions** — New Sales Order (`N`) · Record Receiving (`R`) · Expected deliveries today · Sales Catalogue · Help & Documentation (`?`) · Close

**Overview content sections:**
- **Identity · Core Handles:** Code name: Sunset Dispensary · Relationship code: REG0026 · Email handle: contact.sunset@gmail.com · Phone / messaging handle: 821.267.0905 x7878 · Address: 185 Maple Drive, Fresno, CA 96570.
- **Roles** chips: `Customer · Supplier`.
- **Referrer:** "No referrer assigned".
- **Tags:** e.g. `retail`.
- **Signals:**
  - `Overdue transactions` — "2 legacy transactions are marked overdue."
  - `Supplier details missing` — "This supplier does not yet have a populated supplier profile."
- **VIP Portal:** `Disabled · Last Login Never`.
- **Lifetime Value `$997,137.39`** — "Total invoiced across completed sales orders".
- **Profit `$0.00`** — "Revenue minus COGS on completed orders".
- **Average Margin `0.0%`** — "Weighted average across completed orders".
- **Open Quotes `0`**.
- **VIP Client Portal** card: `Disabled · Portal Access · Enable to give client portal access · Enable`; nested **Live Catalog & Interest Intake** sub-tabs: `Configuration · Interest Lists · Current Draft · Price Alerts`; Live Catalog Settings form with `Enable Live Catalog` toggle ("Allow this client to browse and mark interest in inventory") and `Save Configuration` button and "Configure what inventory and attributes are visible to this client in their VIP portal."
- **Supplier Profile** — "No supplier details on file yet — click Edit Profile to add contact info, license, and payment terms." with Contact Info (Name, Email, Phone) and Business Info (License Number, Tax ID, Payment Terms, Preferred Payment) all `Not set`.
- **Recent Purchase Orders** — "No purchase orders found — Purchase orders from this supplier will appear here".
