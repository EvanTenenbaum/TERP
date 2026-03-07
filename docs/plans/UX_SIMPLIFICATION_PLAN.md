# TERP UI/UX Massive Simplification Plan

**Version:** 2.0 (Post-Adversarial QA Review)
**Date:** 2026-03-07
**Goal:** Massively declutter, streamline, and simplify TERP's UI/UX while preserving existing functionality
**Design North Star:** Linear meets power spreadsheet — fast, calm, keyboard-first, zero clutter
**Constraint:** Use what's already built. Minimize new infrastructure. Maximize removal and consolidation.

---

## Executive Summary

TERP currently suffers from **navigation bloat** (32 sidebar items), **route explosion** (70+ routes), **workspace tab overload** (Accounting alone has 10 tabs), **dashboard widget sprawl** (17 widgets), and **duplicated access paths** where the same content is reachable from 3+ different entry points. The result is cognitive overload for a system that should feel as fast and calm as Linear.

This plan focuses on **5 strategic pillars**:

1. **Navigation Collapse** — Cut sidebar from 32 items to 14
2. **Workspace Consolidation** — Merge related workspaces, reduce tab sprawl
3. **Dashboard Simplification** — From 17 widgets to 6 focused cards
4. **Chrome Reduction** — Lighter headers, less decorative weight, more content space
5. **Interaction Streamlining** — Fewer clicks to action, keyboard-first patterns

All changes preserve existing backend routes, tRPC procedures, and business logic. No database migrations. No new backend endpoints.

---

## Pillar 1: Navigation Collapse

### Problem Analysis

Current sidebar has **4 groups with 32 items**:

| Group | Items | Count |
|-------|-------|-------|
| **Sell** | Notifications, Sales, Demand & Supply, Relationships, Sales Sheets, Live Shopping, Leaderboard | 7 |
| **Buy** | Pick & Pack, Inventory, Photography, Samples, Intake, Purchase Orders, Spreadsheet View | 7 |
| **Finance** | Invoices, Accounting, Credits, Client Ledger, Reports, Pricing Rules, COGS Settings | 7 |
| **Admin** | Users, System Settings, Calendar, Todo Lists, Scheduling, Time Clock, Feature Flags, Workflow Queue, Locations | 9 |

**Issues:**
- 32 items is 3-4x what Linear shows in its sidebar
- Many items are sub-features of a parent (e.g., "Intake" is a tab within Purchase Orders, "Pick & Pack" is a tab within Sales)
- Duplicated access: Pick & Pack appears in sidebar AND as Sales workspace tab
- Duplicated access: Intake appears in sidebar AND as Purchase Orders tab
- Low-usage items (Photography, Spreadsheet View, Workflow Queue, Leaderboard) clutter primary nav
- COGS Settings, Pricing Rules, Feature Flags are admin/config items that belong in Settings

### Changes

#### 1.1 — Restructure to 3 Groups, 14 Primary Items

**New navigation structure:**

```
WORK (primary operational areas)
├── Dashboard          (/)
├── Sales              (/sales)           — Orders, Quotes, Returns, Pick & Pack, Create Order
├── Inventory          (/inventory)       — Batches, Photography, Samples
├── Procurement        (/purchase-orders) — POs, Intake, Spreadsheet View
├── Relationships      (/relationships)   — Clients, Suppliers
├── Demand & Supply    (/demand-supply)   — Matchmaking, Needs, Interest List, Supply

MONEY (financial areas)
├── Accounting         (/accounting)      — Dashboard, Invoices, Bills, Payments, Ledger
├── Credits            (/credits)         — Credits, Settings

MANAGE (admin & tools)
├── Calendar           (/calendar)
├── Notifications      (/notifications)
├── Settings           (/settings)        — System, Users, Locations, Feature Flags, COGS, Pricing Rules
```

**Total: 11 sidebar items** (down from 32)

#### 1.2 — Items Absorbed Into Parent Workspaces

| Removed Item | Absorbed Into | How |
|-------------|---------------|-----|
| Pick & Pack | Sales workspace tab (already exists) | Remove sidebar entry, keep as `/sales?tab=pick-pack` |
| Intake | Procurement workspace tab (already exists) | Remove sidebar entry, keep as `/purchase-orders?tab=receiving` |
| Photography | Inventory workspace tab | Add as tab in InventoryWorkspacePage |
| Samples | Inventory workspace tab | Add as tab in InventoryWorkspacePage |
| Sales Sheets | Sales workspace tab | Add as tab in SalesWorkspacePage |
| Spreadsheet View | Procurement workspace tab (already exists) | Remove sidebar entry, keep within Purchase Orders |
| Invoices (standalone) | Accounting workspace tab (already exists) | Remove duplicate sidebar entry |
| Client Ledger | Relationships workspace → Client profile section | Access via client profile, not top-level nav |
| Leaderboard | Dashboard widget or Reports section | Remove from sidebar |
| Live Shopping | Sales workspace tab | Add as tab in SalesWorkspacePage |
| Pricing Rules | Settings page section | Move to Settings |
| COGS Settings | Settings page section | Move to Settings (already at `/settings/cogs`) |
| Feature Flags | Settings page section | Move to Settings (already at `/settings/feature-flags`) |
| Users | Settings page section | Move to Settings |
| Locations | Settings page section | Move to Settings |
| Workflow Queue | Settings or hidden — power-user only | Access via Command Palette |
| Time Clock | Calendar workspace tab or Admin section | Combine with Calendar/Scheduling |
| Scheduling | Calendar workspace tab | Combine with Calendar |
| Todo Lists | Notifications hub | Merge with Notifications as a tab |
| Reports/Analytics | Dashboard or Accounting | Accessible from Dashboard action or Command Palette |

#### 1.3 — Implementation Steps

**File: `client/src/config/navigation.ts`**

```typescript
// NEW: Simplified navigation - 3 groups, 11 items
export const navigationGroups = [
  { key: "work", label: "Work" },
  { key: "money", label: "Money" },
  { key: "manage", label: "Manage" },
];

export const navigationItems: NavigationItem[] = [
  // WORK
  { name: "Sales", path: "/sales", icon: ShoppingCart, group: "work" },
  { name: "Inventory", path: "/inventory", icon: PackageCheck, group: "work" },
  { name: "Procurement", path: "/purchase-orders", icon: Truck, group: "work" },
  { name: "Relationships", path: "/relationships", icon: Users, group: "work" },
  { name: "Demand & Supply", path: "/demand-supply", icon: GitMerge, group: "work" },

  // MONEY
  { name: "Accounting", path: "/accounting", icon: CreditCard, group: "money" },
  { name: "Credits", path: "/credits", icon: Coins, group: "money" },

  // MANAGE
  { name: "Calendar", path: "/calendar", icon: Calendar, group: "manage" },
  { name: "Notifications", path: "/notifications", icon: Bell, group: "manage" },
  { name: "Settings", path: "/settings", icon: Settings, group: "manage" },
];
```

**File: `client/src/components/layout/Sidebar.tsx`**

- Remove Quick Actions section entirely (clutters the sidebar, use Command Palette instead)
- Remove the quick link editor UI
- Remove the "Customize" toggle for quick links
- Remove the "Navigation" subtitle from the header — just show "TERP"
- Remove the collapse/expand chevrons row when not collapsed
- Flatten group headers: no background highlight on active group, just a subtle label
- Remove the avatar/signed-in footer section — move to Settings page
- Add a prominent Cmd+K hint at the bottom instead

**Verification:**
```bash
pnpm check  # Zero TS errors
pnpm lint   # Zero lint errors
pnpm test   # All nav tests pass
```

---

## Pillar 2: Workspace Consolidation

### Problem Analysis

**Accounting workspace has 10 tabs:**
Dashboard, Invoices, Bills, Payments, General Ledger, Chart of Accounts, Expenses, Bank Accounts, Bank Transactions, Fiscal Periods

10 tabs is extreme. Linear never shows more than 5 items in a tab rail. Most users only need Invoices, Bills, and Payments regularly. The others are admin/setup.

**Sales workspace has 5 tabs + 2 hidden:** Orders, Quotes, Returns, + Create Order, Pick & Pack

**Demand & Supply has 4 tabs:** Matchmaking, Client Needs, Interest List, Supplier Supply — all different but related

### Changes

#### 2.1 — Accounting: Collapse 10 Tabs to 4

**New Accounting tab structure:**

| Tab | Contains | Notes |
|-----|----------|-------|
| **Overview** | Current Dashboard content | Rename from "Dashboard" — clearer |
| **Receivables** | Invoices + Payments Received | Merge invoices tab + filter payments to "received" |
| **Payables** | Bills + Payments Sent + Expenses | Merge bills, outgoing payments, expenses |
| **Ledger** | General Ledger + Chart of Accounts + Fiscal Periods + Bank Accounts + Bank Transactions | Admin-level accounting — progressive disclosure within the tab |

**Implementation:**

**File: `client/src/config/workspaces.ts`**
```typescript
export const ACCOUNTING_WORKSPACE = {
  title: "Accounting",
  homePath: "/accounting",
  description: "Manage money in and money out.",
  tabs: [
    { value: "overview", label: "Overview" },
    { value: "receivables", label: "Receivables" },
    { value: "payables", label: "Payables" },
    { value: "ledger", label: "Ledger & Admin" },
  ],
} as const;
```

**File: `client/src/pages/AccountingWorkspacePage.tsx`**
- Merge invoices + received payments into a "Receivables" panel
- Merge bills + sent payments + expenses into a "Payables" panel
- Merge GL, CoA, fiscal periods, bank accounts, bank transactions into "Ledger & Admin" panel with internal sub-sections (collapsible accordion, not more tabs)

**Redirect mapping:** All existing `/accounting/*` routes continue to redirect correctly via `RedirectWithTab` — just update the tab values.

#### 2.2 — Inventory: Absorb Photography & Samples as Tabs

**New Inventory tab structure:**

| Tab | Contains | Notes |
|-----|----------|-------|
| **Operations** | Current inventory table/gallery | Already exists |
| **Photography** | Photography queue page | Move from standalone page |
| **Samples** | Sample management page | Move from standalone page |

**File: `client/src/config/workspaces.ts`**
```typescript
export const INVENTORY_WORKSPACE = {
  title: "Inventory",
  homePath: "/inventory",
  description: "Manage inventory, photography, and samples.",
  tabs: [
    { value: "inventory", label: "Operations" },
    { value: "photography", label: "Photography" },
    { value: "samples", label: "Samples" },
  ],
} as const;
```

**File: `client/src/pages/InventoryWorkspacePage.tsx`**
- Add Photography and Samples as workspace panels
- Import existing `PhotographyPage` and `SampleManagement` components

#### 2.3 — Sales: Absorb Sales Sheets & Live Shopping

**New Sales tab structure:**

| Tab | Contains | Notes |
|-----|----------|-------|
| **Orders** | Orders list | Exists |
| **Quotes** | Quotes list | Exists |
| **Create Order** | Order creator | Exists |
| **Sales Sheets** | Sales sheet creator | Move from standalone |
| **Returns** | Returns management | Exists |
| **Pick & Pack** | Fulfillment | Exists |
| **Live Shopping** | Live sessions | Move from standalone |

**Note:** 7 tabs is at the upper bound. Consider using a "More" dropdown for Pick & Pack, Returns, and Live Shopping if the tab rail feels too long.

**Implementation approach:** Same pattern as existing workspace tabs — add `LinearWorkspacePanel` entries.

#### 2.4 — Settings: Consolidate All Admin/Config Pages

**New Settings page structure (internal sections, not workspace tabs):**

| Section | Contains | Notes |
|---------|----------|-------|
| **General** | System settings (current Settings page) | Exists |
| **Users** | User management | Move from standalone `/users` page |
| **Locations** | Warehouse/storage locations | Move from standalone `/locations` page |
| **Pricing** | Pricing rules + profiles | Move from standalone `/pricing/rules` and `/pricing/profiles` |
| **COGS** | COGS configuration | Already at `/settings/cogs` |
| **Feature Flags** | Feature toggles | Already at `/settings/feature-flags` |

**Implementation:** Convert Settings page to a workspace-style page with sections, or use a settings sidebar pattern (like Linear's settings page — a left nav within the settings area).

#### 2.5 — Calendar + Scheduling + Time Clock Merge

Merge Calendar, Scheduling, and Time Clock into a single **Calendar** workspace:

| Tab | Contains |
|-----|----------|
| **Calendar** | Current calendar view |
| **Scheduling** | Room booking, shifts, deliveries |
| **Time Clock** | Clock in/out, timesheets |

#### 2.6 — Notifications + Todo Lists Merge

Merge Notifications and Todo Lists into a single **Notifications** hub:

| Tab | Contains |
|-----|----------|
| **Inbox** | Notifications, alerts |
| **Tasks** | Todo lists, task management |

**Verification for all Pillar 2:**
```bash
pnpm check
pnpm lint
pnpm test
pnpm build
```

---

## Pillar 3: Dashboard Simplification

### Problem Analysis

**DashboardV3 has 17 possible widgets:**
sales-by-client, cash-flow, transaction-snapshot, inventory-snapshot, total-debt, sales-comparison, profitability, matchmaking-opportunities, inbox, workflow-queue, workflow-activity, available-cash, cash-collected-leaderboard, client-debt-leaderboard, client-profit-margin-leaderboard, top-strain-families, aging-inventory

Plus a CustomizationPanel that opens a side drawer for widget management. Plus two dashboard variants behind a feature flag.

**This is massive over-engineering for a dashboard.** The Owner Command Center is actually much closer to what the dashboard should be — focused, intentional, answer-oriented.

### Changes

#### 3.1 — Single Dashboard, 3 Rows, 6-8 Cards Maximum

Kill DashboardV3 widget system. Replace with a fixed, intentional dashboard inspired by the Owner Command Center:

**Row 1: Daily Pulse (3 cards)**
- **Today's Sales** — Order count + revenue today
- **Cash Position** — Available cash, what's coming in, what's going out
- **Appointments/Tasks** — What's scheduled today

**Row 2: Business Health (2-3 cards)**
- **Receivables vs Payables** — Who owes you vs who you owe, aging summary
- **Inventory Status** — Total value, items in stock, aging alerts
- **Optional: Top Movers** — Best selling products this week

**Row 3: Action Items (1 full-width card)**
- **Needs Attention** — Combined list: overdue invoices, low stock alerts, pending POs, workflow items. Clickable to navigate.

**Implementation:**

**File: `client/src/pages/DashboardHomePage.tsx`**
- Remove feature flag logic between DashboardV3 and OwnerCommandCenter
- Use a single, fixed dashboard component
- Reuse `OwnerQuickCardsWidget`, `OwnerCashDecisionPanel`, `OwnerDebtPositionWidget`, `OwnerAppointmentsWidget`, `InventorySnapshotWidget` from existing Owner Command Center
- Add a "Needs Attention" card that aggregates actionable items

**Delete:**
- `client/src/pages/DashboardV3.tsx` — replaced
- `client/src/components/dashboard/v3/DashboardLayoutManager.tsx` — no longer needed
- `client/src/components/dashboard/v3/CustomizationPanel.tsx` — no longer needed
- `client/src/contexts/DashboardPreferencesContext.tsx` — no longer needed
- Individual v2 widgets that aren't reused — mark for deletion after confirming no other page uses them

**Do NOT delete:**
- `OwnerCommandCenterDashboard.tsx` — cannibalze its components
- Any widget used by other pages

#### 3.2 — Remove Dashboard Customization

The customization panel (show/hide widgets, change layout, change widget size) adds significant complexity for marginal benefit. Linear doesn't let you customize its home screen — it's opinionated and focused.

Remove:
- The "Customize" button from the dashboard header
- The `CustomizationPanel` component
- The `DashboardPreferencesContext`
- Widget visibility/size preferences in localStorage

#### 3.3 — Dashboard Header Simplification

Current: "Dashboard" title + subtitle + "Customize" button
New: Just a greeting line: "Good morning — here's what needs your attention." (Like the Owner Command Center already does)

Remove the "Dashboard" heading. It's obvious you're on the dashboard.

**Verification:**
```bash
pnpm check
pnpm lint
pnpm test
pnpm build
```

---

## Pillar 4: Chrome Reduction

### Problem Analysis

The current UI has excessive "chrome" — decorative containers, borders, headers, eyebrows, and metadata strips that consume space without adding information value.

**LinearWorkspaceShell adds:**
- An eyebrow label ("Sell / Operations Workspace")
- A title ("Sales")
- A description ("Manage orders, quotes, and returns...")
- A metadata strip ("Primary flow: Quote -> Order -> Fulfillment")
- A tab rail
- Content area

That's 5 elements before you see any data. Linear shows: sidebar label + content. Maybe a tab rail. That's it.

**Sidebar chrome issues:**
- "TERP" + "Navigation" header label — redundant
- Quick Actions section — duplicates sidebar items
- Quick link editor — unnecessary complexity
- User avatar/info footer — rarely needed
- Collapse/expand toggle — nice but adds visual weight

### Changes

#### 4.1 — Simplify LinearWorkspaceShell

**Remove:**
- The `section` eyebrow ("Sell / Operations Workspace") — the sidebar already tells you where you are
- The `description` text — once you know what "Sales" means, you never read this again
- The `meta` metadata strip — "Primary flow: Quote -> Order -> Fulfillment" is documentation, not UI

**Keep:**
- The title (but make it smaller — `text-lg font-semibold` not `text-2xl`)
- The tab rail
- The content area

**File: `client/src/components/layout/LinearWorkspaceShell.tsx`**

Change the header from:
```
Sell / Operations Workspace
Sales
Manage orders, quotes, and returns...
Primary flow: Quote → Order → Fulfillment
[Orders] [Quotes] [Returns] [Create Order] [Pick & Pack]
```

To:
```
Sales
[Orders] [Quotes] [Returns] [Create Order] [Pick & Pack]
```

That's it. Title + tabs. Like Linear.

**Implementation:**
- Remove `section` prop usage from all workspace pages
- Remove `description` display from the shell (keep the prop for accessibility/tooltips)
- Remove `meta` display from the shell
- Reduce title font size
- Collapse header vertical spacing

#### 4.2 — Simplify Sidebar Header

**Current:** Logo icon + "TERP" + "Navigation" + collapse button + close button (mobile)

**New:** Just "TERP" text + collapse button. On mobile, add the close X.

Remove the decorative `bg-primary/10 text-primary rounded-lg p-2` icon wrapper around the Menu icon. Remove the "Navigation" subtitle.

#### 4.3 — Remove Quick Actions Section from Sidebar

The Quick Actions section (Dashboard, New Sales Order, Record Intake, Clients) with its "Customize" editor duplicates functionality:
- Dashboard is just clicking the TERP logo / top of sidebar
- New Sales Order is Cmd+N
- Record Intake is clicking Procurement in the sidebar
- Clients is clicking Relationships

Delete the entire Quick Actions section from the sidebar. Users have:
1. Sidebar navigation (the items themselves)
2. Command Palette (Cmd+K) for quick access
3. Keyboard shortcuts (Cmd+N for new order, etc.)

**Files to modify:**
- `client/src/components/layout/Sidebar.tsx` — remove Quick Actions rendering
- `client/src/config/navigation.ts` — keep `quickLinkCandidates` for Command Palette, but remove from sidebar
- `client/src/hooks/useNavigationState.ts` — can potentially simplify/remove pin logic

#### 4.4 — Simplify Sidebar Footer

**Current:** Avatar + "Signed in" + user name/email + Logout button

**New:** Just the user's initials in a small avatar. Click to open a minimal dropdown: Account, Logout. Like Linear's bottom-left user menu.

#### 4.5 — Reduce Active State Visual Weight

**Current:** Active nav items have `border-l-[oklch(0.53_0.13_44)]` terracotta border + `bg-muted/60` + active group gets `border-border bg-muted/40` background wrapper + a colored dot.

**New:** Active item gets a subtle `bg-muted` background only. Active group gets no special border/background — the highlighted item is enough. Remove the colored dot indicator. The terracotta accent color can stay on the active item's left border but make it thinner (2px → 1.5px) and subtler.

#### 4.6 — Content Area Spacing

Reduce overall content padding:
- Current workspace content padding: likely `p-6` or more
- New: `p-4` on desktop, `p-3` on mobile
- Reduce gap between dashboard cards from `gap-4` to `gap-3`
- Reduce vertical spacing (`space-y-6` → `space-y-4`)

This puts more data on screen, which is what power users want.

**Verification:**
```bash
pnpm check
pnpm lint
pnpm test
pnpm build
```

---

## Pillar 5: Interaction Streamlining

### Changes

#### 5.1 — Enhance Command Palette (Cmd+K) as Primary Navigation

Since we're removing Quick Actions from the sidebar, the Command Palette becomes the primary "go anywhere, do anything" mechanism (like Linear's Cmd+K).

**Ensure the Command Palette includes:**
- All navigation items (already likely does)
- Quick actions: "Create Order", "Record Intake", "New Client", "New Invoice"
- Recent pages visited (maintain a small MRU list)
- Search across entities (clients, orders, batches)

**File: `client/src/components/CommandPalette.tsx`**
- Verify all consolidated navigation items are searchable
- Add "Create..." section for quick creation actions
- Add "Recent" section showing last 5 visited pages

#### 5.2 — Keyboard Shortcuts Visibility

Add a small "?" icon at the bottom of the sidebar (or next to the user avatar) that opens the keyboard shortcuts modal. Linear shows keyboard hints inline with actions.

**Already exists:** `KeyboardShortcutsModal` and `?` shortcut. Just make sure the `?` trigger hint is visible somewhere in the UI (e.g., bottom of sidebar: `⌘K Search · ? Shortcuts`).

#### 5.3 — Reduce Modal Dialogs

Audit all modals in the app. Where possible, replace modals with:
- Inline editing (click to edit a cell in a table)
- Side drawers (for detail views — keep the context of the list visible)
- Navigate to a dedicated page (for complex creation flows)

**Key conversions:**
- Batch detail modal → side drawer (if not already)
- Invoice/Bill creation → inline within the workspace (if not already)
- Client creation → side drawer from Relationships workspace

This is a targeted change — only convert modals that are commonly used and would benefit from staying in-context.

#### 5.4 — Table/List Default View Optimization

For all major data tables (Orders, Inventory, Clients, Invoices):
- Default to showing the most useful columns only (5-7 columns)
- Hide less-used columns behind a column picker
- Increase default row density (compact mode as default)
- Ensure sticky column headers on scroll
- Add row-level actions on hover (not always visible)

This is a CSS/config change on existing tables, not a rebuild.

#### 5.5 — Remove "No Data Available" Empty States Noise

When a widget or section has no data, instead of showing a big empty state with illustration, show a single line of muted text: "No orders yet" or "No data". Less visual noise.

#### 5.6 — Streamline Page Headers Across All Pages

Many standalone pages (Photography, Samples, etc.) have their own headers with title + description + action buttons. Since they'll be absorbed into workspace tabs (Pillar 2), their standalone headers become redundant — the workspace title + tab already provides context.

**For each absorbed page:**
- Remove the page-level `<h1>` title when rendered inside a workspace
- Keep action buttons but move them to the tab content's top-right corner
- Use an `embedded` prop pattern (already used by `ReturnsPage embedded`) to suppress standalone headers

---

## Implementation Execution Order

### Phase 1: Navigation Collapse (Lowest Risk, Highest Impact)

**Priority:** P0
**Estimated Effort:** 4-6 hours
**Files Modified:** 2-3 files

1. Update `client/src/config/navigation.ts` with new 3-group, 11-item structure
2. Update `NavigationGroupKey` type from `"sales" | "inventory" | "finance" | "admin"` to `"work" | "money" | "manage"`
3. Update sidebar group labels
4. Remove Quick Actions section from `Sidebar.tsx`
5. Simplify sidebar header and footer in `Sidebar.tsx`
6. Update all tests referencing old navigation groups
7. Verify all legacy route redirects still work (they should — routes don't change, only sidebar entries)

**Verification:**
```bash
pnpm check && pnpm lint && pnpm test && pnpm build
```

### Phase 2: Chrome Reduction (Low Risk, High Visual Impact)

**Priority:** P0
**Estimated Effort:** 3-4 hours
**Files Modified:** 5-8 files

1. Simplify `LinearWorkspaceShell.tsx` — remove eyebrow, description, metadata
2. Update all workspace pages to remove `section`, `description`, `meta` props
3. Reduce content spacing across the app
4. Simplify sidebar active states
5. Add Cmd+K / ? hint at sidebar bottom

**Verification:**
```bash
pnpm check && pnpm lint && pnpm test && pnpm build
```

### Phase 3: Workspace Consolidation (Medium Risk, High Impact)

**Priority:** P1
**Estimated Effort:** 8-12 hours
**Files Modified:** 10-15 files

Execute in sub-phases:

**3a: Inventory + Photography + Samples** (2-3 hours)
1. Update `INVENTORY_WORKSPACE` config to add Photography and Samples tabs
2. Import existing page components as workspace panels
3. Add `embedded` prop to Photography and Samples pages to suppress headers
4. Update routes to redirect `/photography` and `/samples` to `/inventory?tab=*`

**3b: Sales + Sales Sheets + Live Shopping** (2-3 hours)
1. Update `SALES_WORKSPACE` config
2. Add workspace panels
3. Update redirects

**3c: Accounting 10→4 tabs** (3-4 hours)
1. Restructure `ACCOUNTING_WORKSPACE` config
2. Create composite panels that combine multiple existing views
3. Use accordion/collapsible sections within the "Ledger & Admin" tab
4. Update all `/accounting/*` redirect routes

**3d: Calendar + Scheduling + Time Clock** (1-2 hours)
1. Create Calendar workspace config
2. Add Scheduling and Time Clock as tabs

**3e: Settings consolidation** (2-3 hours)
1. Convert Settings to a workspace-style page with internal sections
2. Absorb Users, Locations, Pricing Rules, Feature Flags
3. Update routes

**Verification after each sub-phase:**
```bash
pnpm check && pnpm lint && pnpm test && pnpm build
```

### Phase 4: Dashboard Simplification (Medium Risk, High Impact)

**Priority:** P1
**Estimated Effort:** 4-6 hours
**Files Modified:** 5-10 files

1. Create new simplified dashboard using Owner Command Center components
2. Remove DashboardV3 widget system
3. Remove CustomizationPanel and DashboardPreferencesContext
4. Add "Needs Attention" aggregation card
5. Simplify dashboard header
6. Clean up unused widget components (only those confirmed not used elsewhere)

**Verification:**
```bash
pnpm check && pnpm lint && pnpm test && pnpm build
```

### Phase 5: Interaction Polish (Low Risk, Medium Impact)

**Priority:** P2
**Estimated Effort:** 4-6 hours
**Files Modified:** Various

1. Enhance Command Palette with recent pages and creation actions
2. Add keyboard shortcut hint to sidebar
3. Optimize table default column visibility
4. Simplify empty states
5. Strip standalone headers from absorbed pages

**Verification:**
```bash
pnpm check && pnpm lint && pnpm test && pnpm build
```

### Phase 6: Interactive Flow Simplification (Medium Risk, Very High Impact)

**Priority:** P1
**Estimated Effort:** 14-18 hours
**Files Modified:** 15-25 files

Execute in sub-phases (see Pillar 6 for details):

**6a: Order Creation — reduce from 6 modals to 0 modals in normal flow** (3-4 hours)
**6b: Inventory Intake — reduce from 10 required fields to 5** (2-3 hours)
**6c: Returns — convert 80vh modal to inline panel** (2-3 hours)
**6d: Client Profile — reduce from 6 tabs to 2** (2-3 hours)
**6e: Confirmation dialog audit — remove ~50% of "are you sure?" dialogs** (2-3 hours)
**6f: Form validation standardization** (2-3 hours)

**Verification after each sub-phase:**
```bash
pnpm check && pnpm lint && pnpm test && pnpm build
```

---

## Risk Assessment

| Change | Risk | Mitigation |
|--------|------|------------|
| Navigation collapse (32→11) | **LOW** — No routes change, just sidebar visibility | All removed items still accessible via Command Palette and direct URL |
| Accounting tab merge (10→4) | **MEDIUM** — Complex composition of existing views | Keep all existing components, just re-parent them. All `/accounting/*` redirects preserved |
| Dashboard replacement | **MEDIUM** — Removes customization preferences some users may have set | Owner Command Center is already built and tested. User preferences data persists in localStorage but becomes unused |
| Chrome reduction | **LOW** — Visual-only changes | Purely CSS/template changes, no logic affected |
| Workspace absorption | **LOW-MEDIUM** — Moving pages into workspace tabs | Use `embedded` prop pattern already proven with ReturnsPage |

---

## Pillar 6: Interactive Flow Simplification

### Problem Analysis

Comprehensive flow audit reveals these patterns across TERP's 10 major interactive flows:

| Flow | Steps | Form Fields/Line | Modals | Clicks to Complete | Complexity |
|------|-------|-------------------|--------|-------------------|------------|
| Order Creation | 5 | 8+ per line | 6 modals | 8-12 | HIGH |
| Inventory Intake | 6 | 10+ per line | 4 modals | 15-25 | HIGH |
| Purchase Order | 5 | 5-7 + per-line | 1 modal | 8-12 | MEDIUM |
| Client Management | 3 | 6-8 + tab content | 3-4 modals | 5-10 | MEDIUM |
| Invoice Management | 4 | 6-8 + per-line | 2 modals | 8-12 | MEDIUM-HIGH |
| Sales Sheet | 4 | Draft name + items | 3 modals | 8-15 | MEDIUM |
| Matchmaking | 3 | None (view-only) | 1 modal | 2-4 | MEDIUM |
| Returns | 3 | 6 + optional | 2 modals | 10-15 | MEDIUM |
| Pick & Pack | 4 | Per-item status | 1 modal | 5-10 | MEDIUM |
| Credits | 3 | 4-5 per modal | 3 modals | 4-8 | MEDIUM |

**Key problems across flows:**
- **Modal stacking**: Order Creation alone opens up to 6 different modals (BatchSelectionDialog, CreditWarningDialog, CogsAdjustmentModal, ConfirmDraftModal, DeleteDraftModal, CustomerDrawer)
- **Excessive required fields**: Inventory Intake requires 10+ fields per line item including mandatory image uploads
- **Flow interruptions**: Customer context drawer in Order Creation breaks the creation flow to show secondary information
- **Oversized modals**: Returns modal stretches to 80vh height requiring internal scrolling — at that point it should be a page, not a modal
- **Duplicated access patterns**: Same data accessible via modals, drawers, tabs, AND standalone pages

### Changes

#### 6.1 — Order Creation: Reduce from 6 Modals to 2

**Current state**: Creating a single order can trigger 6 different modal dialogs: batch selection, credit warning, COGS adjustment, confirm draft, delete draft, and customer drawer.

**Simplification:**

| Current Modal | Action | Rationale |
|--------------|--------|-----------|
| BatchSelectionDialog | **Convert to inline combobox** | Batch selection should be a searchable dropdown within the line item row, not a separate modal. User types product name, sees matching batches with qty/price, picks one. |
| CreditWarningDialog | **Convert to inline banner** | Show a persistent warning banner at the top of the order form when credit limit is approached/exceeded. Already have `CreditLimitBanner` — just keep it visible inline. |
| CogsAdjustmentModal | **Convert to inline popover** | Already has a Level 2 popover. Remove the Level 3 modal entirely. The popover should handle COGS adjustment with a simple input + save. |
| ConfirmDraftModal | **Remove** | Don't ask "are you sure?" to save a draft. Just save it. Add an undo toast instead. |
| DeleteDraftModal | **Convert to confirm popover** | Use a small confirmation popover on the delete button, not a full modal. |
| CustomerDrawer | **Keep as drawer** | This is the one context panel that adds value. But make it collapse by default — user explicitly opens it. |

**Result**: 6 modals → 1 drawer + 1 popover. Net modals: 0 true modals during normal flow.

**Files to modify:**
- `client/src/pages/OrderCreatorPage.tsx`
- `client/src/components/orders/` — various order components

#### 6.2 — Inventory Intake: Reduce Required Fields, Remove Image Mandate

**Current state**: 10+ required fields per line item, mandatory image upload creates massive friction for a flow that may process 20+ items per intake session.

**Simplification:**

| Field | Current | Proposed |
|-------|---------|----------|
| Product Name/Strain | Required | Required |
| Brand/Farmer | Required | Required |
| Category | Required | Required |
| Packaging | Required | **Optional** — default to most common |
| Quantity | Required | Required |
| Unit Cost | Required | Required |
| Grade | Optional | Optional (keep) |
| Location | Required | **Smart default** — auto-fill last used location, editable |
| Images | **Required** | **Optional with warning** — show yellow "no images" badge, don't block submission |
| SKU | Optional | Optional (keep) |

**Additional simplifications:**
- Auto-populate Location with the user's default warehouse (settable in preferences)
- Auto-populate Packaging with the most common packaging for that category
- Batch-apply: Allow setting Location and Packaging for ALL line items at once via a header control, then override per-line as needed
- Reduce from 10 required fields to 5 required fields per line

**Files to modify:**
- `client/src/components/uiux-slice/ProductIntakeSlicePage.tsx`
- Related intake validation logic

#### 6.3 — Returns: Convert Modal to Inline Workspace Panel

**Current state**: Returns creation lives in a modal that grows up to 80vh with internal scrolling.

**Simplification:** When user clicks "Process Return", don't open a modal. Instead, show the return creation form inline within the Returns tab content area, pushing the returns list down or replacing it temporarily. Include a "Cancel" button to dismiss and return to the list view.

This eliminates the largest modal in the system and gives the user full screen real estate for the return process.

**Files to modify:**
- `client/src/pages/ReturnsPage.tsx`

#### 6.4 — Client Profile: Reduce Tab Count

**Current state**: Client profile page has 6+ tabs (Overview, Communication, Credit, Pricing, Needs, Purchase Patterns).

**Simplification:**

| Current Tab | Action | Notes |
|-------------|--------|-------|
| Overview | **Keep** | Core info — name, email, phone, address, notes |
| Communication | **Merge into Overview** | Show recent 3-5 communications below the overview fields. Full history via "View all" link. |
| Credit Status | **Merge into Overview** | Show credit card widget in the overview sidebar. Not a separate tab. |
| Pricing Config | **Keep but simplify** | Move to a secondary tab "Pricing & Credit" |
| Client Needs | **Move to Demand & Supply workspace** | Client needs are a demand-supply concern, not a client profile concern. Access via Demand & Supply workspace filtered to this client. |
| Purchase Patterns | **Merge into Overview** | Show as a small widget in the overview, or accessible via analytics. |

**Result**: 6 tabs → 2 tabs (Overview, Pricing & Credit). Information density increases on Overview but in a structured layout.

**Files to modify:**
- `client/src/pages/ClientProfilePage.tsx`

#### 6.5 — Standardize the "Create" Pattern Across All Flows

Currently, different flows use different creation patterns:
- Orders: Tab-based inline creator
- POs: Modal form
- Returns: Large modal
- Credits: Small modal
- Invoices: Work surface inline

**Standardize to 2 patterns:**

1. **Simple creation (< 5 fields)**: Inline popover or small dialog (Credits, Returns)
2. **Complex creation (5+ fields)**: Dedicated workspace tab or panel (Orders, POs, Invoices, Intake)

Never use a scrolling modal for creation. If it scrolls, it should be a full panel/page.

#### 6.6 — Reduce Confirmation Dialogs

**Current**: Many flows show "Are you sure?" before saving or submitting. This adds clicks without adding value for recoverable actions.

**New policy:**
- **Recoverable actions** (create, save, update): No confirmation. Just do it. Show an undo toast.
- **Destructive actions** (delete, void, cancel order): Keep confirmation, but use a small inline popover, not a modal.
- **Irreversible financial actions** (process return with GL entries, void invoice): Keep modal confirmation with clear impact summary.

**Implementation:** Audit all confirmation dialogs across the codebase. Remove ~50% of them. Replace ~25% with undo toasts.

#### 6.7 — Streamline Form Validation

**Current**: Some forms validate on blur, some on submit, some inline. Error messages vary in placement and style.

**Standardize:**
- Validate on blur (not on change — too noisy, not on submit only — too late)
- Error messages appear directly below the field in red text
- Required field indicators: red asterisk on label (consistent everywhere)
- On submission with errors: scroll to first error field and focus it

This is a consistency pass, not a rebuild. Update existing forms to follow one pattern.

### Phase 6 Implementation Order

**6a: Order Creation modal reduction** (3-4 hours)
- Replace BatchSelectionDialog with inline combobox
- Replace CreditWarningDialog with inline banner (already exists)
- Remove ConfirmDraftModal (replace with auto-save + undo toast)
- Remove Level 3 CogsAdjustmentModal (keep Level 2 popover)

**6b: Intake field reduction** (2-3 hours)
- Make Packaging, Location auto-default
- Make Images optional with warning badge
- Add batch-apply header controls for Location and Packaging

**6c: Returns inline conversion** (2-3 hours)
- Convert returns modal to inline panel within Returns tab

**6d: Client profile consolidation** (2-3 hours)
- Merge Communication, Credit, Purchase Patterns into Overview
- Create "Pricing & Credit" combined tab

**6e: Confirmation dialog audit and reduction** (2-3 hours)
- Audit all confirmation dialogs app-wide
- Remove unnecessary ones, convert to undo toasts
- Keep only for destructive/irreversible actions

**6f: Form validation standardization** (2-3 hours)
- Audit form validation patterns
- Standardize to blur validation with inline errors
- Consistent required field indicators

**Verification after each sub-phase:**
```bash
pnpm check && pnpm lint && pnpm test && pnpm build
```

---

## What NOT to Change

- **Backend routes, tRPC procedures, database schema** — Zero backend changes
- **Core business logic** — Order creation, inventory management, accounting flows all untouched
- **Existing keyboard shortcuts** — All preserved
- **Mobile responsive behavior** — All preserved (may improve with reduced chrome)
- **Authentication flow** — Untouched
- **VIP Portal** — Untouched (separate app context)
- **Command Palette** — Enhanced, not replaced
- **Theme system** — Untouched
- **Table/grid implementations** — Untouched (AG Grid, TanStack Table)

---

## Success Criteria

| Metric | Current | Target |
|--------|---------|--------|
| Sidebar navigation items | 32 | 11 |
| Accounting workspace tabs | 10 | 4 |
| Dashboard widgets | 17 | 6-8 |
| Clicks to reach any feature | 1-3 (inconsistent) | Max 2 (sidebar → tab) |
| Header chrome lines before content | 4-5 (eyebrow, title, description, meta, tabs) | 2 (title, tabs) |
| Quick Actions / pinning UI complexity | Custom pin editor, 4 pinned links | Removed — use Cmd+K |
| Workspace pages with standalone nav entries that duplicate tab access | 8+ | 0 |
| Order creation modal count | 6 modals | 0 modals (1 drawer + 1 popover) |
| Inventory intake required fields per line | 10+ | 5 |
| Client profile tabs | 6 | 2 |
| Confirmation dialogs system-wide | ~20+ | ~8 (destructive/irreversible only) |
| Returns creation UI | 80vh scrolling modal | Inline panel |
| Average clicks to complete order | 8-12 | 5-8 |
| Average clicks to complete intake line | 15-25 | 8-12 |

---

## Files Inventory (Expected Changes)

### Must Modify
- `client/src/config/navigation.ts` — Navigation restructure
- `client/src/config/workspaces.ts` — Workspace tab configs
- `client/src/components/layout/Sidebar.tsx` — Sidebar simplification
- `client/src/components/layout/LinearWorkspaceShell.tsx` — Chrome reduction
- `client/src/pages/SalesWorkspacePage.tsx` — Add tabs
- `client/src/pages/InventoryWorkspacePage.tsx` — Add tabs
- `client/src/pages/AccountingWorkspacePage.tsx` — Restructure tabs
- `client/src/pages/DashboardHomePage.tsx` — Simplify
- `client/src/pages/Settings.tsx` — Absorb admin pages
- `client/src/App.tsx` — Update redirect routes

### May Modify
- `client/src/pages/PhotographyPage.tsx` — Add `embedded` prop
- `client/src/pages/SampleManagement.tsx` — Add `embedded` prop
- `client/src/pages/CalendarPage.tsx` — Convert to workspace
- `client/src/pages/SchedulingPage.tsx` — Embed in calendar workspace
- `client/src/pages/TimeClockPage.tsx` — Embed in calendar workspace
- `client/src/pages/NotificationsPage.tsx` — Add Tasks tab
- `client/src/pages/TodoListsPage.tsx` — Embed in notifications
- `client/src/components/CommandPalette.tsx` — Enhance
- `client/src/pages/UsersPage.tsx` — Add `embedded` prop for Settings absorption
- `client/src/pages/LocationsPage.tsx` — Add `embedded` prop
- `client/src/pages/PricingRulesPage.tsx` — Add `embedded` prop
- Various test files — Update navigation expectations

### May Delete (After Confirming No External References)
- `client/src/pages/DashboardV3.tsx`
- `client/src/components/dashboard/v3/DashboardLayoutManager.tsx`
- `client/src/components/dashboard/v3/CustomizationPanel.tsx`
- `client/src/contexts/DashboardPreferencesContext.tsx`

---

## Linear Design Principles Applied

| Linear Principle | TERP Application |
|-----------------|------------------|
| **List/table is the primary work surface** | Tables remain dominant. Dashboard cards point to tables. |
| **Top chrome is quiet and compact** | Workspace headers reduced to title + tabs only |
| **Actions are contextual, not loud** | Row-level actions on hover. Bulk actions on selection. |
| **Display options are first-class** | Column pickers, density controls on tables |
| **Multi-select + bulk actions are native** | Already implemented in most tables |
| **Detail context is side-oriented** | Prefer side drawers over modals |
| **Keyboard-first is visible and encouraged** | Cmd+K prominent, ? shortcuts visible, Cmd+N for create |
| **Personal preferences persist** | Table column preferences, sidebar state |
| **Navigation is flat, not deep** | 2 levels max: sidebar → tab |
| **Everything searchable via one box** | Command Palette as the universal gateway |

---

## Appendix: Current vs. Proposed Navigation Side-by-Side

### CURRENT (32 items, 4 groups)
```
SELL
  Notifications
  Sales
  Demand & Supply
  Relationships
  Sales Sheets
  Live Shopping
  Leaderboard

BUY
  Pick & Pack
  Inventory
  Photography
  Samples
  Intake
  Purchase Orders
  Spreadsheet View

FINANCE
  Invoices
  Accounting
  Credits
  Client Ledger
  Reports
  Pricing Rules
  COGS Settings

ADMIN
  Users
  System Settings
  Calendar
  Todo Lists
  Scheduling
  Time Clock
  Feature Flags
  Workflow Queue
  Locations
```

### PROPOSED (11 items, 3 groups)
```
WORK
  Sales               → [Orders] [Quotes] [Create] [Sales Sheets] [Returns] [Pick & Pack] [Live]
  Inventory           → [Operations] [Photography] [Samples]
  Procurement         → [Purchase Orders] [Intake] [Spreadsheet]
  Relationships       → [Clients] [Suppliers]
  Demand & Supply     → [Matchmaking] [Needs] [Interest] [Supply]

MONEY
  Accounting          → [Overview] [Receivables] [Payables] [Ledger & Admin]
  Credits             → [Credits] [Settings]

MANAGE
  Calendar            → [Calendar] [Scheduling] [Time Clock]
  Notifications       → [Inbox] [Tasks/Todos]
  Settings            → [General] [Users] [Locations] [Pricing] [COGS] [Feature Flags]
```

**Result: 65% reduction in sidebar items. Zero functionality lost. Everything still 2 clicks away.**

---

## Adversarial QA Review Findings & Remediations

The following issues were identified by an adversarial QA review that cross-referenced every claim in this plan against the actual source files in the codebase.

### CRITICAL Fixes Applied

#### QA-001: NavigationGroupKey Cascade
**Problem:** Changing `NavigationGroupKey` from `"sales"|"inventory"|"finance"|"admin"` to `"work"|"money"|"manage"` breaks hardcoded references in 5+ files the plan originally missed.

**Files requiring changes (added to Phase 1):**
- `client/src/config/navigation.ts` — type definition + items
- `client/src/components/layout/Sidebar.tsx` — `getDefaultOpenGroups()` at line 86-97
- `client/src/hooks/useNavigationState.ts` — `ALL_GROUPS` array at line 14-19
- `client/src/hooks/useNavigationState.test.ts` — references to old group names
- `client/src/components/layout/AppSidebar.test.tsx` — expects old group labels

**Phase 1 effort revised: 6-10 hours** (was 4-6)

#### QA-002: Accounting Redirect Mapping
**Problem:** Merging 10 accounting tabs to 4 breaks all 10 `RedirectWithTab` routes in App.tsx. Many-to-one mapping required.

**Explicit redirect mapping (add to App.tsx):**

| Old Route | Old Tab | New Tab | Notes |
|-----------|---------|---------|-------|
| `/accounting/dashboard` | `dashboard` | `overview` | Direct rename |
| `/accounting/invoices` | `invoices` | `receivables` | Invoices live in Receivables |
| `/accounting/bills` | `bills` | `payables` | Bills live in Payables |
| `/accounting/payments` | `payments` | `receivables` | Default to receivables; payments panel shows both |
| `/accounting/general-ledger` | `general-ledger` | `ledger` | Direct mapping |
| `/accounting/chart-of-accounts` | `chart-of-accounts` | `ledger` | Sub-section within Ledger |
| `/accounting/expenses` | `expenses` | `payables` | Expenses grouped with payables |
| `/accounting/bank-accounts` | `bank-accounts` | `ledger` | Sub-section within Ledger |
| `/accounting/bank-transactions` | `bank-transactions` | `ledger` | Sub-section within Ledger |
| `/accounting/fiscal-periods` | `fiscal-periods` | `ledger` | Sub-section within Ledger |

#### QA-003: InventoryWorkspacePage Shell Conversion
**Problem:** InventoryWorkspacePage does NOT use `LinearWorkspaceShell`. It renders a raw `<div>` with `<InventoryWorkSurface />` directly. Plan incorrectly assumed it had the same tab infrastructure as SalesWorkspacePage.

**Fix:** Phase 3a must FIRST convert InventoryWorkspacePage to use `LinearWorkspaceShell` before adding Photography and Samples tabs. **Phase 3a effort revised: 4-6 hours** (was 2-3).

#### QA-004: Item Count Correction
**Fix:** Current sidebar has **31 items** (not 32). Dashboard is accessed via sidebar logo click or `/` route, NOT as a sidebar nav item. Target: **10 sidebar items** (not 11). Dashboard access preserved via logo click and Command Palette.

### HIGH Fixes Applied

#### QA-005: Logout Path Preserved
**Fix:** Keep the current logout button visible in the sidebar footer. The avatar dropdown enhancement is a separate polish task — do NOT remove the logout button until the dropdown is fully implemented and tested in the same PR.

#### QA-006: Dashboard Preference Migration
**Fix:** When replacing the dashboard, add a one-time "We've simplified your dashboard" info banner that auto-dismisses after first view. Clean up orphaned localStorage keys from `DashboardPreferencesContext`. This is a 30-minute addition to Phase 4.

#### QA-007: Sales Tab Overflow — REVISED APPROACH
**Problem:** Absorbing Sales Sheets and Live Shopping into Sales creates 7 tabs, contradicting the simplification thesis.

**Revised decision:** Do NOT absorb Sales Sheets and Live Shopping into Sales workspace.
- **Sales Sheets** — Keep as standalone page, accessible via Command Palette. Remove from sidebar.
- **Live Shopping** — Keep as standalone page, accessible via Command Palette. Remove from sidebar.
- **Sales workspace stays at 5 tabs**: Orders, Quotes, Returns, Create Order, Pick & Pack

#### QA-008: Optional Images — Downstream Protection
**Fix:** Making images optional at intake is still correct (it reduces friction), BUT add these protections:
- Items without images automatically appear in the Photography queue with "PRIORITY" flag
- Sales Sheet generator shows a placeholder image with text "Photo pending" for imageless items
- VIP portal shows same placeholder
- Items cannot be marked "Available for Sale" until at least one image exists (this is a status gate, not an intake gate)

#### QA-009: Photography/Samples Route Redirects
**Fix:** Add explicit redirect routes to App.tsx:
```typescript
<Route path="/photography" component={RedirectWithTab("/photography", "/inventory", "photography")} />
<Route path="/samples" component={RedirectWithTab("/samples", "/inventory", "samples")} />
```

#### QA-010: Command Palette Continuity — CRITICAL FIX
**Problem:** `CommandPalette` derives its navigation items from `navigationAccessModel.commandNavigationItems`, which comes from the same `navigationItems` array as the sidebar. Removing items from the sidebar also removes them from the Command Palette.

**Fix:** Add a `sidebarVisible` flag to `NavigationItem`:
```typescript
export interface NavigationItem {
  name: string;
  path: string;
  icon: LucideIcon;
  group: NavigationGroupKey;
  ariaLabel?: string;
  featureFlag?: string;
  sidebarVisible?: boolean; // NEW: false = hidden from sidebar but searchable in Command Palette
}
```

Items removed from sidebar get `sidebarVisible: false` instead of being deleted from the array. The sidebar filters on `sidebarVisible !== false`, while the Command Palette shows all items.

**Items marked `sidebarVisible: false`:**
- Sales Sheets, Live Shopping, Leaderboard
- Photography, Samples, Spreadsheet View
- Client Ledger, Reports, Pricing Rules, COGS Settings
- Users, Todo Lists, Scheduling, Time Clock, Feature Flags, Workflow Queue, Locations

#### QA-011: Client Ledger Access
**Fix:** Keep Client Ledger accessible as a tab within the Accounting workspace (within "Receivables" tab, since it's primarily about money owed). Add `{ value: "client-ledger", label: "Client Ledger" }` to the Receivables panel as a sub-view, or make it a top-level filter on the Receivables view.

### MEDIUM Fixes Applied

#### QA-012: Effort Estimates Revised
All estimates increased by 50-75%:

| Phase | Original | Revised |
|-------|----------|---------|
| Phase 0 (NEW: Prerequisites) | N/A | 4-6 hours |
| Phase 1: Navigation Collapse | 4-6 hours | 6-10 hours |
| Phase 2: Chrome Reduction | 3-4 hours | 5-7 hours |
| Phase 3: Workspace Consolidation | 8-12 hours | 14-20 hours |
| Phase 4: Dashboard Simplification | 4-6 hours | 6-9 hours |
| Phase 5: Interaction Polish | 4-6 hours | 5-8 hours |
| Phase 6: Interactive Flow Simplification | 14-18 hours | 20-28 hours |
| **Total** | **37-52 hours** | **60-88 hours** |

#### QA-013: Confirmation Dialog Removal — Deferred
**Fix:** Move confirmation dialog reduction (Phase 6e/6f) to a separate Phase 7 that depends on building an undo/toast infrastructure first. Do NOT remove confirmation dialogs until undo is implemented.

#### QA-014: Mobile Tab Overflow
**Fix:** For workspaces with 4+ tabs, implement horizontal scroll on the tab rail on mobile (already partially supported by `scrollbar-hide` class on `linear-workspace-tabs-scroller`). Add left/right scroll indicators (fade gradients) to signal more tabs off-screen.

For Settings inner navigation on mobile, use a vertical list/accordion instead of tabs.

#### QA-015: Reports/Analytics Access
**Fix:** Keep Reports accessible from Accounting workspace as a secondary action or from the Dashboard's "Needs Attention" card. Also accessible via Command Palette (via `sidebarVisible: false` item).

#### QA-016: localStorage Migration
**Note:** `useNavigationState.ts` already self-heals via `normalizeState()` which filters out unknown group keys. No explicit migration needed. Document this for implementers.

---

## Phase 0: Prerequisites (NEW)

**Priority:** P0 — Must complete before any other phase
**Estimated Effort:** 4-6 hours

1. **Convert InventoryWorkspacePage to use LinearWorkspaceShell** — Currently renders a raw div without shell/tab infrastructure. Must be converted before Phase 3a can add Photography and Samples tabs.
2. **Add `sidebarVisible` flag to NavigationItem interface** — Required before Phase 1 can hide items from sidebar while keeping them in Command Palette.
3. **Update `buildNavigationGroups` and sidebar rendering** to filter on `sidebarVisible !== false` for sidebar, while Command Palette uses all items.

**Files modified:**
- `client/src/pages/InventoryWorkspacePage.tsx`
- `client/src/config/navigation.ts` (interface change)
- `client/src/components/layout/Sidebar.tsx` (filter logic)
- `client/src/components/CommandPalette.tsx` (verify it doesn't filter)

**Verification:**
```bash
pnpm check && pnpm lint && pnpm test && pnpm build
```

---

## Sanity Check: Oversimplification Guardrails

After the QA review, the following items were identified as at risk of being oversimplified to the detriment of usability:

### Kept as-is (NOT simplified)

| Item | Why it stays |
|------|-------------|
| **Customer Drawer in Order Creation** | Provides critical credit/pricing context during order entry. Kept as collapsible drawer. |
| **Accounting: 4 tabs, not 3** | Receivables and Payables need to remain separate — they serve different user personas (AR team vs AP team). |
| **Credit warning dialog** | Converting to inline banner is correct, but the banner must be prominent and persistent, not dismissible. Over-limit orders should still block submission with a clear message. |
| **Intake required fields: 5, not fewer** | Product, Brand, Category, Quantity, and Unit Cost are non-negotiable for data quality. Location auto-defaults but can be overridden. |
| **Logout button** | Must remain visible in sidebar. Never gate logout behind a dropdown-only interface. |
| **Confirmation for irreversible financial actions** | Returns with GL entries, voiding invoices, deleting POs — these KEEP their confirmation modals. |

### Adjusted from original plan

| Item | Original | Adjusted |
|------|----------|----------|
| Sales workspace tabs | 7 (added Sales Sheets + Live Shopping) | **5** (kept at current) — Sales Sheets and Live Shopping stay standalone, accessed via Command Palette |
| Dashboard | Fixed 6 cards, no customization | Fixed 6-8 cards, no customization, **BUT add a one-time migration banner** |
| Confirmation dialogs | Remove 50%, replace with undo toasts | **Deferred** to Phase 7 after undo infrastructure is built |
| Reports/Analytics | "Accessible from Dashboard or Command Palette" | **Keep in Command Palette + add link from Accounting workspace** |

---

## Visual Mockups

### Mockup 1: Proposed Sidebar (Desktop, Expanded)

```
┌─────────────────────────┐
│  TERP                [«]│  ← Logo + collapse toggle only
├─────────────────────────┤
│                         │
│  WORK                   │  ← Group label, muted, uppercase, small
│  ┃ Sales           ›    │  ← Active item: subtle left border + bg
│    Inventory            │
│    Procurement          │
│    Relationships        │
│    Demand & Supply      │
│                         │
│  MONEY                  │
│    Accounting           │
│    Credits              │
│                         │
│  MANAGE                 │
│    Calendar             │
│    Notifications        │
│    Settings             │
│                         │
│                         │
│                         │
│                         │
│                         │
│                         │
│                         │  ← Lots of breathing room
├─────────────────────────┤
│  ⌘K Search  · ? Help   │  ← Keyboard hints footer
├─────────────────────────┤
│  👤 ET        [Logout]  │  ← Compact user + logout
└─────────────────────────┘
```

**Key changes from current:**
- No Quick Actions section (was 4 pinned links + customize button)
- No "Navigation" subtitle
- No decorative icon wrapper
- 10 items instead of 31
- Keyboard hints replace the avatar block

### Mockup 2: Proposed Sidebar (Desktop, Collapsed)

```
┌────┐
│ T  │  ← TERP logo/initial
├────┤
│ 🛒 │  Sales
│ 📦 │  Inventory
│ 🚚 │  Procurement
│ 👥 │  Relationships
│ ⑂  │  Demand & Supply
│    │
│ 💳 │  Accounting
│ 🪙 │  Credits
│    │
│ 📅 │  Calendar
│ 🔔 │  Notifications
│ ⚙️ │  Settings
├────┤
│ 👤 │  User avatar (click for menu)
└────┘
```

### Mockup 3: Workspace Header — Current vs Proposed

**CURRENT (5 lines of chrome before content):**
```
┌──────────────────────────────────────────────────────┐
│  Sell / Operations Workspace                         │  ← Eyebrow
│  Sales                                               │  ← Title (large)
│  Manage orders, quotes, and returns in a unified...  │  ← Description
│  Primary flow: Quote -> Order -> Fulfillment         │  ← Metadata strip
│  [Orders] [Quotes] [Returns] [Create] [Pick & Pack]  │  ← Tab rail
├──────────────────────────────────────────────────────┤
│                                                      │
│  (content starts here)                               │
│                                                      │
└──────────────────────────────────────────────────────┘
```

**PROPOSED (2 lines of chrome before content):**
```
┌──────────────────────────────────────────────────────┐
│  Sales                                               │  ← Title (smaller, text-lg)
│  [Orders] [Quotes] [Returns] [Create] [Pick & Pack]  │  ← Tab rail
├──────────────────────────────────────────────────────┤
│                                                      │
│  (content starts here — more vertical space!)        │
│                                                      │
└──────────────────────────────────────────────────────┘
```

**Savings: ~80px of vertical space returned to content.**

### Mockup 4: Proposed Dashboard

```
┌──────────────────────────────────────────────────────────────────┐
│  Good morning — here's what needs your attention.    Live · 9:42a│
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐   │
│  │ TODAY'S SALES    │ │ CASH POSITION   │ │ TODAY'S SCHEDULE │   │
│  │                  │ │                 │ │                  │   │
│  │ 12 orders        │ │ $45,230 avail   │ │ 3 appointments   │   │
│  │ $28,450 revenue  │ │ +$8,200 coming  │ │ 2 deliveries     │   │
│  │ ↑ 15% vs avg     │ │ -$3,100 out     │ │ Next: 10:30a     │   │
│  └─────────────────┘ └─────────────────┘ └─────────────────┘   │
│                                                                  │
│  ┌──────────────────────────┐ ┌──────────────────────────────┐  │
│  │ RECEIVABLES vs PAYABLES  │ │ INVENTORY STATUS              │  │
│  │                          │ │                                │  │
│  │ Owed to you:   $125,400  │ │ 847 items in stock            │  │
│  │ You owe:        $43,200  │ │ 12 items aging > 30 days      │  │
│  │ Net position:  +$82,200  │ │ 3 low stock alerts            │  │
│  │                          │ │                                │  │
│  │ Overdue: 4 invoices      │ │ Total value: $234,500         │  │
│  └──────────────────────────┘ └──────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ ⚡ NEEDS ATTENTION                                        │   │
│  │                                                            │   │
│  │  🔴 4 overdue invoices totaling $12,300       [View →]    │   │
│  │  🟡 3 POs awaiting intake                     [View →]    │   │
│  │  🟡 12 items need photography                 [View →]    │   │
│  │  ⚪ 2 pending returns                         [View →]    │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

**Key changes from current:**
- No "Customize" button — fixed, opinionated layout
- No widget show/hide/resize controls
- 6 focused cards instead of 17 configurable widgets
- "Needs Attention" card aggregates all actionable items with direct navigation links
- Greeting line instead of "Dashboard" heading

### Mockup 5: Accounting Workspace — 4 Tabs with Accordion

```
┌──────────────────────────────────────────────────────────────────┐
│  Accounting                                                      │
│  [Overview] [Receivables] [Payables] [Ledger & Admin]           │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ◉ Ledger & Admin tab selected:                                 │
│                                                                  │
│  ▼ General Ledger                                               │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ (existing GeneralLedger component rendered here)          │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ► Chart of Accounts                    (click to expand)       │
│  ► Bank Accounts                        (click to expand)       │
│  ► Bank Transactions                    (click to expand)       │
│  ► Fiscal Periods                       (click to expand)       │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### Mockup 6: Order Creation — Simplified (No Modals in Normal Flow)

```
┌──────────────────────────────────────────────────────────────────┐
│  Sales                                                           │
│  [Orders] [Quotes] [Returns] [▪ Create Order] [Pick & Pack]     │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─ CREATE ORDER ───────────────────────────────────────────┐   │
│  │                                                            │   │
│  │  Client: [🔍 Search clients...          ▾]                │   │
│  │                                                            │   │
│  │  ⚠️ Credit: $8,200 of $10,000 used (82%)  ████████░░     │   │  ← Inline banner
│  │                                                            │   │
│  │  LINE ITEMS                                                │   │
│  │  ┌──────────────────────────────────────────────────────┐ │   │
│  │  │ Product          │ Qty │ Price  │ Margin │  Actions  │ │   │
│  │  ├──────────────────┼─────┼────────┼────────┼──────────┤ │   │
│  │  │ [🔍 OG Kush... ▾]│  5  │ $45.00 │  32%   │  🗑️      │ │   │  ← Inline combobox
│  │  │ [🔍 Blue Dream ▾]│ 10  │ $38.00 │  28%   │  🗑️      │ │   │     (no batch modal)
│  │  │ [+ Add item...]  │     │        │        │          │ │   │
│  │  └──────────────────────────────────────────────────────┘ │   │
│  │                                                            │   │
│  │  Subtotal: $415.00    COGS: $296.00    Margin: 28.7%      │   │
│  │                                                            │   │
│  │  [Save Draft]                    [Create Order →]          │   │
│  └────────────────────────────────────────────────────────────┘   │
│                                                                  │
│  [Customer Details ►]  ← Collapsible drawer, closed by default  │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

**Key changes:**
- Batch selection is an inline searchable combobox, not a separate modal
- Credit warning is a persistent inline banner, not a pop-up modal
- No "confirm draft save" dialog — auto-saves silently
- COGS is shown as margin % inline — click to expand popover for override
- Customer drawer is below, collapsed by default

### Mockup 7: Settings — Consolidated Admin Hub

```
┌──────────────────────────────────────────────────────────────────┐
│  Settings                                                        │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────┐  ┌────────────────────────────────────────────┐   │
│  │  SECTIONS │  │                                            │   │
│  │           │  │  ◉ General Settings                        │   │
│  │  General  │  │                                            │   │
│  │  Users    │  │  Company Name    [TERP Wholesale    ]      │   │
│  │  Locations│  │  Default Currency [USD ▾]                  │   │
│  │  Pricing  │  │  Tax Rate        [8.25%            ]      │   │
│  │  COGS     │  │  ...                                      │   │
│  │  Features │  │                                            │   │
│  │           │  │                                            │   │
│  └──────────┘  └────────────────────────────────────────────┘   │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

**Pattern:** Left sidebar sections within the settings page (like Linear's settings). Each section click swaps the right panel content. On mobile, the sections list becomes a dropdown.

---

## Rollback Strategy

All navigation changes should be gated behind a feature flag:

```typescript
// In navigation.ts
const USE_SIMPLIFIED_NAV = featureFlags['simplified-navigation'] ?? false;

export const navigationItems = USE_SIMPLIFIED_NAV
  ? simplifiedNavigationItems
  : legacyNavigationItems;
```

This allows instant rollback if users report workflow breakage. The flag can be toggled per-user or globally.

**Rollback capability per phase:**
- Phase 0-1: Feature flag on navigation config
- Phase 2: CSS-only changes, easily reverted via git
- Phase 3: Feature flag per workspace (use old vs new tab configs)
- Phase 4: Feature flag on dashboard component (already exists as `owner-command-center-dashboard`)
- Phase 5-6: Individual PRs, easily reverted

---

## Revised Implementation Summary

| Phase | Description | Effort | Risk | Dependencies |
|-------|------------|--------|------|--------------|
| **0** | Prerequisites (InventoryWS shell, sidebarVisible flag) | 4-6h | LOW | None |
| **1** | Navigation Collapse (31→10 sidebar items) | 6-10h | LOW | Phase 0 |
| **2** | Chrome Reduction (workspace headers, spacing) | 5-7h | LOW | None |
| **3** | Workspace Consolidation (tab merges) | 14-20h | MEDIUM | Phase 0, 1 |
| **4** | Dashboard Simplification (17→6-8 widgets) | 6-9h | MEDIUM | None |
| **5** | Interaction Polish (Command Palette, keyboard) | 5-8h | LOW | Phase 1 |
| **6** | Interactive Flow Simplification (modal reduction) | 20-28h | MEDIUM | None |
| **7** | Confirmation Dialog Reduction + Undo System | 8-12h | MEDIUM | Phase 6 |
| **Total** | | **68-100h** | | |

**Recommended execution order:** Phase 0 → Phase 1 → Phase 2 (parallel with 1) → Phase 4 → Phase 3 → Phase 5 → Phase 6 → Phase 7
