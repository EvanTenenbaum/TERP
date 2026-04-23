# TERP Usability Review — Implementation Strategy

*Author: Manus AI. Prepared as a companion to `TERP_Usability_Review_AllPages.md` (270 findings across 65 pages). This document specifies **how** to enact those findings in a way that is scalable and consistent rather than a per-page whack-a-mole exercise.*

---

## 1. The Core Insight

The 270 findings look overwhelming only if each one is treated as an independent page-level ticket. When they are reclassified by the underlying mechanism that produces them, they collapse into a very small set of **shared infrastructure gaps**:

| Mechanism gap | Findings that disappear when the gap is closed |
|---|---|
| No standard for the three operational states (loading / empty / error) with retry | 26 |
| Numeric cells are not right-aligned by default in the shared grid | 30 |
| Filter / search UI is declared per-surface rather than as a slot on the workspace shell | 32 |
| The drawer component has no enforced affordances (close-X, Esc hint, focus return) | 42 |
| Tab rails are ad-hoc per workspace rather than driven from `config/workspaces.ts` | 54 |
| Sidebar open-group state is not persisted | 42 |
| Keyboard-hint bar is opt-in per table rather than default on `SpreadsheetPilotGrid` | 37 |
| Command-palette auto-enrollment already exists but admin pages forgot to set `sidebarVisible: false` | 12 |
| `FreshnessBadge` does not exist as a primitive | 8 |
| Breadcrumbs on detail pages are routed through `AppHeader` but not all detail pages are registered | 17 |
| Primary-action conventions are not enforced by a shared `PageHeader` actions slot | 18 |
| Terminology is not codified in a single `glossary.ts` file | 12 |
| Mobile breakpoints are not standardized at the `DashboardLayout` level | 4 |
| Column presets / saved views are not a property of `ColDef` | 2 |

The same 270 findings, viewed this way, add up to **14 infrastructure upgrades** plus a small amount of per-page migration work. The infrastructure upgrades are all **one PR each**, roughly 200–600 lines, and each one closes between 2 and 54 findings the moment it lands.

That re-framing is the entire strategy. What follows is the concrete plan.

---

## 2. Guiding Principles

Four principles constrain every decision below. They are chosen so that the work is cheap to do, hard to regress, and safe to ship behind flags.

**Principle A — Change the primitive, not the page.** Every cross-cutting theme is resolved by upgrading a single shared component (or creating one where none exists). Pages are migrated onto the upgraded primitive via a codemod and a thin config change. No page is opened by hand to fix a drawer close-X, a numeric alignment, or a skeleton state. The TERP codebase already expresses this philosophy — `LinearWorkspaceShell`, `PageHeader`, `SpreadsheetPilotGrid`, `OperationalEmptyState`, and `KeyboardHintBar` all exist — but the primitives are too permissive about their opt-in behaviors. The fix is to make good defaults the default.

**Principle B — The config is the contract.** `client/src/config/workspaces.ts` and `client/src/config/navigation.ts` are the authoritative declarations of every workspace, tab, and sidebar entry. The Command Palette, the sidebar, and the breadcrumb already read from these files. Any tab reorganization, any "promote to Command Palette", any page-registration gap is therefore a single-line edit in one of these two files, not a refactor of a page. The strategy preserves this design and extends it: one new file, `client/src/config/glossary.ts`, canonicalizes terminology, and one new file, `client/src/config/columnPresets.ts`, declares saved-view presets per grid.

**Principle C — Ship behind flags, always.** Every primitive upgrade ships under a feature flag (`ux.v2.states`, `ux.v2.drawer`, `ux.v2.table`, etc.) using the existing `FeatureFlag` component and `useFeatureFlag` hook. The flag defaults to **on** in development and staging the moment the PR merges, defaults to **off** in production for 72 hours so the on-call team can monitor Sentry, and then flips on in production. The infrastructure for this exists in `client/src/components/feature-flags/` and the `useFeatureFlags` hook.

**Principle D — Prevent regression with lint, not code review.** Every systemic change is paired with an ESLint rule that prevents the old pattern from creeping back in. For example, when numeric alignment becomes a `ColDef.cellDataType === 'currency'` default, a lint rule forbids `className: "text-right font-mono"` inline on `ColDef`, which is the pattern that produces drift today. TERP already has an `eslint.config.js` and a `eslint.config.strict.js`, so the infrastructure is in place.

---

## 3. Layer Map of the Intervention

The work is organized into four layers. Work only flows from Layer 0 upward; if a PR touches Layer 2 without a corresponding Layer 0 or Layer 1 change, it is wrong.

**Layer 0 — Primitives.** Small, strongly-typed components that every page imports. These own the behavior that findings complained about. The fourteen Layer 0 changes are enumerated in §4.

**Layer 1 — Config files.** `config/workspaces.ts`, `config/navigation.ts`, the new `config/glossary.ts`, and the new `config/columnPresets.ts`. These declare structure; no React in this layer. A tab re-group (T-08) is a Layer 1 change with zero code touched; a terminology canonicalization (T-15) is a Layer 1 change plus an ESLint `no-restricted-syntax` rule.

**Layer 2 — Page migrations.** Mechanical edits that replace an old pattern with the new primitive. Almost all Layer 2 work is done by codemod (§6). The few places where codemod cannot reach — usually because the page has hand-rolled drawer JSX instead of `<Sheet>` — are flagged by a diagnostic script and fixed by hand, tracked in Linear as `UX-L2-<component>`.

**Layer 3 — Documentation, lint rules, and review gates.** A short `docs/UX_SYSTEM.md` that tells contributors "use `PageHeader`, not `<h1>`; use `SpreadsheetPilotGrid`, not `<AgGridReact>` directly" plus the ESLint rules that enforce those statements. This is the layer that keeps the system consistent six months from now.

The table below reads down the primitive column and across to the findings it absorbs. This is the master plan.

| # | Layer 0 primitive | File | Findings closed | Theme |
|---|---|---|---|---|
| 1 | `OperationalEmptyState`, `OperationalErrorState`, `OperationalSkeletonState` — one `variant` prop, one enforced card shell, `onRetry` standard | `client/src/components/ui/operational-states.tsx` (extend) | 26 | T-02 |
| 2 | `SpreadsheetPilotGrid` numeric defaults — right-align, tabular-nums, currency formatter when `cellDataType` is `currency`/`number` | `client/src/components/spreadsheet-native/SpreadsheetPilotGrid.tsx` | 30 | T-05 |
| 3 | `WorkspaceFilterBar` slot on `LinearWorkspaceShell` — one filter surface per workspace | `client/src/components/layout/LinearWorkspaceShell.tsx` + new `WorkspaceFilterBar.tsx` | 32 | T-06 |
| 4 | `ManusSheet` — enforced `Sheet` wrapper with close-X, Esc hint, focus return, consistent widths | New `client/src/components/ui/manus-sheet.tsx` | 42 | T-07 |
| 5 | `LinearWorkspaceShell` driven purely from `config/workspaces.ts` + tab-group collapse via new `groups` field | Extend `workspaces.ts`, update shell | 54 | T-08 |
| 6 | `AppSidebar` persisted open-group state | `client/src/components/layout/AppSidebar.tsx` + `lib/navState.ts` | 42 | T-04 |
| 7 | `SpreadsheetPilotGrid.keyboardHints = true` by default + `KeyboardHintBar` as child slot | `SpreadsheetPilotGrid.tsx` | 37 | T-13 |
| 8 | Admin pages toggled `sidebarVisible: false` in `navigation.ts` | `client/src/config/navigation.ts` | 12 | T-11 |
| 9 | `FreshnessBadge` reading `dataUpdatedAt` from a tRPC query | New `client/src/components/ui/freshness-badge.tsx` | 8 | T-10 |
| 10 | `AppBreadcrumb` route registry — derive segments from `config/routes.ts` | `client/src/components/layout/AppBreadcrumb.tsx` + new `config/routes.ts` | 17 | T-09 |
| 11 | `PageHeader.actions` slot with one-primary enforcement + `<DropdownMenu>` overflow | `client/src/components/layout/PageHeader.tsx` | 18 | T-03 |
| 12 | `client/src/config/glossary.ts` canonical term table + ESLint rule `no-restricted-syntax` against variants | New | 12 | T-15 |
| 13 | `DashboardLayout` responsive breakpoints and mobile drawer | `client/src/components/DashboardLayout.tsx` | 4 | T-14 |
| 14 | `ColDef.preset` + `client/src/config/columnPresets.ts` driven view-switcher inside `PageHeader` | Extend shared `ColDef` helper + new config | 2 | T-01 |

The right-hand column shows the same theme IDs the All-Pages review used. Every P0 and every P1 in the 270-finding set falls under one of those rows.

---

## 4. Layer 0 Primitive Specifications

This section specifies each of the fourteen upgrades with enough detail that an engineer can open the PR without needing further design input. For brevity the sections concentrate on the delta versus what already exists.

### 4.1. Operational states

`client/src/components/ui/operational-states.tsx` today exports `OperationalEmptyState`; it does not export a parallel `OperationalErrorState` or an enforced `OperationalSkeleton`. The three must share the same outer card chrome (same border, same min-height, same spacing) so a swap between them causes zero layout reflow. The API becomes:

```ts
<OperationalStateSurface
  state={query.isLoading ? "loading" : query.error ? "error" : data?.length ? "ok" : "empty"}
  skeletonRows={6}
  empty={{ title: "No invoices yet", description: "Invoices appear here as sales orders are confirmed.", action: { label: "Create invoice", onClick: () => ... } }}
  error={{ onRetry: () => trpc.useUtils().accounting.invoices.invalidate() }}
>
  {/* children render only when state === "ok" */}
</OperationalStateSurface>
```

The primitive is opt-in initially but becomes the child contract of every new widget; a lint rule `terp/no-bare-card-loading` flags `<Card>` children whose first child is a `<Loader2 />` or raw `<Skeleton>` and suggests `OperationalStateSurface`.

### 4.2. `SpreadsheetPilotGrid` numeric defaults

`SpreadsheetPilotGrid` already accepts `columnDefs: ColDef[]`. Every numeric column today carries an ad-hoc `cellClass: "text-right font-mono"`. The fix is to intercept `columnDefs` inside the grid and apply `valueFormatter`, `cellClass`, and `headerClass` defaults when `cellDataType` is `"currency"`, `"number"`, or `"percent"`. The page keeps its `ColDef` array; the grid makes the alignment and formatter correct for free. An ESLint rule `terp/no-inline-text-right-on-coldef` prevents drift.

### 4.3. `WorkspaceFilterBar` slot

`LinearWorkspaceShell` today accepts a `commandStrip` slot that sits in the tab row. A second slot, `filterStrip`, is introduced immediately below; it is the *only* filter surface allowed on the page. The codemod (§6) deletes redundant filter inputs from individual surfaces and routes their state through a shared `useWorkspaceFilter()` hook. The hook stores the active filter in URL search params so deep-linking works. The surfaces that use it — `OrdersWorkSurface`, `InventoryManagementSurface`, `InvoicesSurface`, `BillsSurface`, `BankTransactionsSurface`, `GeneralLedgerSurface`, `ExpensesSurface` — have eight findings each that disappear the moment the hook replaces their per-surface state.

### 4.4. `ManusSheet` — enforced drawer

A single new primitive at `client/src/components/ui/manus-sheet.tsx` wraps the existing Radix-based `Sheet` and enforces the missing affordances: a visible close-X in the top right, an `Esc to close` hint in the footer, `onOpenChange` wired to return focus to the triggering element via `useReturnFocus()`, and a canonical `size` prop (`sm` / `md` / `lg`) that maps to width so every drawer on the app is one of three widths. All current `<Sheet>` usages are codemodded to `<ManusSheet>`; direct `<Sheet>` is forbidden by lint rule `terp/prefer-manus-sheet` outside of `ui/manus-sheet.tsx` itself.

### 4.5. Workspace tab rails driven from config

`config/workspaces.ts` already declares tabs. What is missing is a `groups` field that lets Accounting's 10 tabs be rendered as 4 top-level tabs with a second-level pill bar. The extension is:

```ts
export const ACCOUNTING_WORKSPACE = {
  title: "Accounting",
  homePath: "/accounting",
  tabGroups: [
    { label: "Overview", tabs: [{ value: "dashboard", label: "Dashboard" }] },
    { label: "Receivables", tabs: [
      { value: "invoices", label: "Invoices" },
      { value: "payments", label: "Payments" },
    ] },
    { label: "Payables", tabs: [
      { value: "bills", label: "Bills" },
      { value: "expenses", label: "Expenses" },
    ] },
    { label: "Ledger", tabs: [
      { value: "general-ledger", label: "General Ledger" },
      { value: "chart-of-accounts", label: "Chart of Accounts" },
      { value: "bank-accounts", label: "Bank Accounts" },
      { value: "bank-transactions", label: "Bank Transactions" },
      { value: "fiscal-periods", label: "Fiscal Periods" },
    ] },
  ],
};
```

`LinearWorkspaceShell` is updated to accept `tabGroups` as an alternative to `tabs`; when `tabGroups` is present, it renders a two-level rail. The tab value space is unchanged, so deep links like `/accounting?tab=invoices` keep working. The Sales workspace collapses its 7 tabs by declaring Pick List and Quotes as saved-view presets under `orders` (§4.14) rather than as peer tabs; this is what the baseline actually expects.

### 4.6. Persisted sidebar open-group state

`lib/uiDensity.ts` demonstrates the exact pattern: a `localStorage` key, a getter, a setter, a DOM attribute, and a `CustomEvent`. A new file `lib/navState.ts` replicates the pattern with the key `terp.nav.open-groups.v1`, storing a string-array of open group keys. `AppSidebar` reads on mount and writes on every `onOpenChange`.

### 4.7. Keyboard-hint bar by default

`SpreadsheetPilotGrid` accepts a new prop `keyboardHints: boolean | KeyboardHint[]` that defaults to `true`. When `true`, it renders a standard list (row selection, range select, copy, select-all). Surfaces can pass a custom list to override; they cannot turn it off unless the table has fewer than three rows (enforced by runtime prop validation).

### 4.8. Command Palette auto-enrollment via `sidebarVisible`

`buildNavigationAccessModel` in `config/navigation.ts` already computes `commandNavigationItems` from items whose `sidebarVisible === false`. The fix is a Layer 1 edit: flip twenty admin-surface entries from `sidebarVisible: true` to `sidebarVisible: false` with no other code change. Those pages disappear from the sidebar and appear in the Command Palette automatically.

### 4.9. `FreshnessBadge`

```tsx
<FreshnessBadge queryResult={invoicesQuery} cadence="live" />
// or
<FreshnessBadge queryResult={analyticsQuery} cadence="nightly" />
```

The primitive reads `queryResult.dataUpdatedAt` and renders `Live · 2m ago` or `Nightly · as of 06:00`. It is intended to live as a child of `PageHeader.badge`.

### 4.10. `AppBreadcrumb` route registry

A new `config/routes.ts` declares a pattern-to-title map: `"/clients/:id": ({id}) => clientName(id)`. `AppBreadcrumb` looks up each segment against this registry and renders them as clickable links. This centralizes what is today inferred from `useLocation().pathname.split('/')`, which is fragile and does not handle IDs.

### 4.11. `PageHeader.actions` slot and one-primary enforcement

`PageHeader` already has an `actions` slot. The upgrade is a runtime invariant enforced in development: exactly one child in `actions` may have `variant="default"` (the primary). Additional actions must be `variant="outline"`, `variant="ghost"`, or live inside a `<DropdownMenu>`. In production the invariant is stripped; in development it logs a `console.error` that points at the offending page. The ESLint rule `terp/page-header-one-primary` static-analyzes the same invariant at lint time.

### 4.12. `config/glossary.ts`

```ts
export const GLOSSARY = {
  ORDER: "Order",
  CLIENT: "Client",
  SKU: "SKU",
  BILL: "Bill",
  SUPPLIER: "Supplier",
  INVOICE: "Invoice",
} as const;
```

An ESLint rule `terp/no-restricted-syntax` disallows the literal strings `"Customer"`, `"Buyer"`, `"Sales Order"`, `"Vendor Invoice"`, `"Item"`, `"Inventory Line"` in `.tsx` files under `client/src/` outside of `config/glossary.ts` itself. A one-time codemod rewrites all existing occurrences to the canonical term, and a pass through `i18n/` — if present — ensures labels match.

### 4.13. `DashboardLayout` responsive breakpoints

Three rules applied at one component: sidebar becomes a drawer below 768px via the existing `MobileNav`; `SpreadsheetPilotGrid` wraps in a `ScrollArea` with a right-edge gradient hint when `window.innerWidth < 1024`; the dashboard widgets stack in a priority order defined by a new `DashboardLayoutStackOrder` enum.

### 4.14. `ColDef.preset` and `config/columnPresets.ts`

Column presets are declared per surface in `config/columnPresets.ts`:

```ts
export const INVENTORY_PRESETS = [
  { id: "all", label: "All", columns: null },
  { id: "fresh", label: "Fresh-only", columns: ["sku","strain","age","photos"], filter: { ageDays: { lt: 30 } } },
  { id: "photo-ready", label: "Photo-ready", columns: ["sku","photos","lastPhoto"], filter: { hasPhoto: false } },
];
```

A new `<PresetPicker>` child of `PageHeader.badge` lets the user switch; selection persists via `localStorage` keyed by `terp.presets.<workspace>.<user>`. The hook returns a `columnVisibility` map that `SpreadsheetPilotGrid` consumes.

---

## 5. Layer 1 Config Changes

Three config edits and two config additions. All of them are either declarative or single-value flips; none require code outside `config/`.

`config/workspaces.ts` gains a `tabGroups` alternative for Accounting and adds a `views` field to Sales Orders (the pick-list and quotes views move here, the corresponding tabs are removed from `SALES_WORKSPACE.tabs`). `config/navigation.ts` flips twenty admin entries to `sidebarVisible: false`. `config/glossary.ts` is new. `config/columnPresets.ts` is new. `config/routes.ts` is new.

Together these five edits close **66 of the 270 findings** with zero component code changed.

---

## 6. Codemods

Page migrations (Layer 2) are mechanical and should be automated. Four codemods do almost all of the work. They live under `scripts/codemods/` following the existing `scripts/codemod-color-classes.ts` convention and are invoked via `pnpm codemod <name>`.

**`codemod-states.ts`.** Finds `<Card><CardContent>{query.isLoading ? <Loader2/> : query.error ? <p>Error</p> : data?.length ? <X/> : <p>No data</p>}</CardContent></Card>` and rewrites to `<OperationalStateSurface state={...}><X/></OperationalStateSurface>`. Pattern-matches with `ts-morph`. Dry-run mode prints a diff preview; applied mode writes in place. Also adds the new import. Runs on `client/src/pages/**.tsx` and `client/src/components/**.tsx`. Expected change: ~80 call sites, ~2 of which require manual touch-up (flagged by the dry-run output).

**`codemod-sheet.ts`.** Rewrites `Sheet` / `SheetContent` usages to `ManusSheet` / `ManusSheetContent`, removing now-redundant inline close buttons, adding `size` based on the current width class. Conservative: if the existing `SheetContent` has custom header structure beyond the standard, the codemod emits `// TODO MANUS_SHEET` and skips, letting a human finish. Expected: ~13 surfaces, ~2 manual finish-ups.

**`codemod-numeric-coldef.ts`.** Scans every `ColDef` literal, detects `cellClass: "text-right font-mono"` and `valueFormatter: formatCurrency`, and replaces both with `cellDataType: "currency"`. The grid primitive then applies the defaults from §4.2. Expected: ~60 `ColDef` literals across `spreadsheet-native/`.

**`codemod-glossary.ts`.** Pure string replacement under `client/src/` with the canonical term set, respecting JSX text nodes and string literals but avoiding identifiers and imports. Runs as an `eslint --fix` hook off the new `terp/no-restricted-glossary` rule.

All four codemods produce a report of files touched and files skipped. The skip list becomes the Layer 2 manual-migration backlog, which empirically is under ten files.

---

## 7. Lint Rules and Review Gates

ESLint rules are cheaper than review-time vigilance. Seven rules are added to `eslint.config.js` under a new preset `terp-ux` that is on in `strict` and in CI.

`terp/no-bare-card-loading` flags `<Card>` children that are plain `<Loader2 />` or raw `<Skeleton>`, suggesting `<OperationalStateSurface>`. `terp/no-inline-text-right-on-coldef` forbids `cellClass` strings containing `text-right` on `ColDef` literals. `terp/prefer-manus-sheet` disallows `@/components/ui/sheet` imports outside `components/ui/manus-sheet.tsx`. `terp/prefer-spreadsheet-pilot-grid` disallows direct `AgGridReact` usage outside `SpreadsheetPilotGrid.tsx`. `terp/page-header-one-primary` statically checks that `PageHeader.actions` contains at most one `<Button variant="default">`. `terp/no-restricted-glossary` enforces the `config/glossary.ts` term set on JSX text. `terp/require-workspace-config` forbids tab literal arrays passed to `LinearWorkspaceShell`; tabs must come from `config/workspaces.ts`.

CI fails on any rule violation. Every PR that touches a page must pass the new preset. Reviewers do not need to remember the new primitives; the linter does.

---

## 8. Feature-Flag and Rollout Plan

Each primitive upgrade ships under a flag. Flags are registered in the existing feature-flag table so the ops team can flip them in production without a redeploy. The default is `true` in dev and staging on merge, `false` in production for the first 72 hours, then flipped on. Every flag has a named rollback owner and a kill switch. The table:

| Flag | Enables | Default in prod | Sunset |
|---|---|---|---|
| `ux.v2.states` | `OperationalStateSurface` everywhere | off → on in 72h | 30 days after on |
| `ux.v2.drawer` | `ManusSheet` everywhere | off → on in 72h | 30 days after on |
| `ux.v2.grid` | `SpreadsheetPilotGrid` numeric defaults + keyboard hints | off → on in 72h | 30 days after on |
| `ux.v2.workspace-tabs` | `tabGroups` + Sales view-rollup | off → on in 7 days (training) | 30 days |
| `ux.v2.nav-persist` | Persisted sidebar open-groups | on in prod immediately (low risk) | 14 days |
| `ux.v2.command-palette-admin` | 20 admin pages moved to palette | off → on in 7 days (announce) | 14 days |
| `ux.v2.freshness` | `FreshnessBadge` on dashboards | on immediately | 14 days |
| `ux.v2.breadcrumb-registry` | `AppBreadcrumb` registry | off → on in 72h | 14 days |
| `ux.v2.page-header-invariant` | One-primary invariant | dev-only; prod silent | permanent |
| `ux.v2.mobile` | Responsive dashboard | off → on in 72h | 30 days |
| `ux.v2.presets` | `ColDef.preset` | off → on in 7 days | 60 days |
| `ux.v2.glossary` | Terminology enforcement | on immediately (pure string) | permanent |

Sunset means the flag is deleted and the code path becomes unconditional. A Linear ticket for each flag carries the sunset deadline; CI refuses to ship a flag older than its sunset without an explicit extension PR.

---

## 9. Sprint-by-Sprint Plan

Five one-week sprints deliver every primitive, every codemod, every rule, and every Layer-1 config change. Each sprint ends on a fully shippable state; no sprint leaves the tree in a partially-migrated condition.

**Sprint 1 — Primitives Pack A (operational states, grid numerics, keyboard hints).** One senior engineer on the Layer 0 work for `OperationalStateSurface`, `SpreadsheetPilotGrid` numeric defaults, and keyboard-hint default. One engineer writes `codemod-states.ts` and `codemod-numeric-coldef.ts`, runs them on a branch, resolves the flagged skips. One engineer adds the three ESLint rules (`no-bare-card-loading`, `no-inline-text-right-on-coldef`, `prefer-spreadsheet-pilot-grid`). Merge on Friday behind `ux.v2.states` and `ux.v2.grid`. Closes 93 findings.

**Sprint 2 — Primitives Pack B (drawer, page-header invariant, freshness badge, breadcrumb registry).** Same structure: Layer 0 changes, codemod-sheet, ESLint rules, config-routes file. Merge behind the relevant flags. Closes 85 findings.

**Sprint 3 — Workspace structure (tab groups, persisted sidebar, command-palette enrollment, Sales view rollup).** This is the highest-leverage sprint for perceived polish. Extend `LinearWorkspaceShell` with `tabGroups`; write the tab migration for Accounting; flip the twenty `sidebarVisible: false` entries; introduce `lib/navState.ts`. No codemod required because every change is in `config/` or in the shell. Announce the Command-Palette promotion in the release notes a week before the production flip. Closes 108 findings.

**Sprint 4 — Presets, glossary, mobile.** `ColDef.preset` and `config/columnPresets.ts` for the six canonical surfaces; `config/glossary.ts` plus the codemod and the ESLint rule; `DashboardLayout` responsive breakpoints. Closes 18 findings; more importantly, it closes the door on drift.

**Sprint 5 — Long-tail per-page audits.** Once the primitives are in place, re-run the Opus 4.7 all-pages analysis against staging. What remains is the genuinely page-specific work (e.g. the Accounting Invoices `<spar…` raw-markup render bug, the VIP Portal Config page that never loads). The re-run is expected to produce roughly forty P2/P3 findings, each a small PR, which this sprint closes in parallel by pairing the codebase's existing Factory Droid agents with the audit output.

---

## 10. Governance, Metrics, and "Definition of Done"

An intervention that is not measured will regress. Three mechanisms keep the system in shape.

**A UX dashboard in the existing Analytics page.** New KPIs: `% of tRPC queries whose components wrap in OperationalStateSurface`, `% of tables using SpreadsheetPilotGrid's default keyboard hints`, `% of pages whose PageHeader passes the one-primary invariant`, `# of direct Sheet imports`, `# of direct AgGridReact imports`, `count of flagged lint violations by rule`. The numbers are gathered by a CI job that ASTs the client codebase and posts to the analytics endpoint. The on-call UX owner reviews the board weekly.

**Definition of Done for every new feature PR.** Before a UX-adjacent PR is merged it must pass seven checks: it does not add a direct `<Sheet>`, `<AgGridReact>`, or `<h1>` in a page; it uses `PageHeader`; its tables pass `cellDataType` on numeric columns; its queries wrap children with `OperationalStateSurface`; it adds the page (if any) to `config/routes.ts`; it registers any new navigation in `config/navigation.ts`; it runs the codemods dry-run and gets zero hits on its files. These checks are encoded in a CI script and shown as a PR comment.

**Sunset discipline.** The feature flags table in §8 has a sunset deadline per flag. A scheduled job (daily) fails the CI build if any flag has exceeded its deadline without an explicit extension PR. This prevents the codebase from accumulating "v2 off by default" paths indefinitely.

---

## 11. Anti-Patterns Explicitly Forbidden

Three patterns cause the drift that this document is designed to eliminate. They are called out here so the team can point at this paragraph when rejecting a PR.

**Per-page loading spinners.** Any `<Loader2 />` inside a `<Card>` is forbidden. Use `OperationalStateSurface`.

**Ad-hoc drawers.** Any new file that imports from `@/components/ui/sheet` is forbidden. Use `ManusSheet`.

**Hand-rolled tab rails.** Any `<Tabs>` component outside `LinearWorkspaceShell` or `ManusSheet` is forbidden at the page level. Workspace tabs come from `config/workspaces.ts`; contextual tabs inside drawers are allowed but rare.

**Hand-rolled sidebar entries.** Any sidebar item that is not declared in `config/navigation.ts` is forbidden. This is how we keep sidebar, Command Palette, and mobile nav in sync.

**Hard-coded terms.** Any JSX text containing `"Customer"`, `"Buyer"`, `"Sales Order"`, `"Vendor Invoice"`, `"Item"`, or `"Inventory Line"` outside `config/glossary.ts` or test fixtures is forbidden.

---

## 12. What Happens After

Six months from now the TERP codebase should look measurably different on three axes. First, every workspace page is under 200 lines because the primitives have absorbed the repeated scaffolding. Second, adding a new workspace or a new tab is a single-line edit in `config/workspaces.ts` plus a new page component that imports `PageHeader` and `SpreadsheetPilotGrid`; no copying of skeletons, no new breadcrumb wiring, no duplicate filter strip. Third, the count of P0/P1 findings from a fresh Opus 4.7 audit drops into the low single digits, because the mechanisms that produced 270 findings no longer exist.

That is the actual scalability outcome: the same 270 findings, fixed once at the primitive level, do not reappear — and the next 270 findings, which will show up when new pages are added, cost the same amount of effort to close (near zero) the moment they're noticed.

---

## Appendix A — Finding-to-Primitive Reverse Index

For reviewers: every one of the 270 findings in the All-Pages Review maps to exactly one row in the table in §3. The machine-readable mapping is in `terp-ux-review/finding_to_primitive.csv`, generated by `scripts/classify_findings.py` against the findings JSON. The CSV is regenerated on every audit run. A PR that closes finding `accounting_invoices-UX-1` (the `<spar…` render bug) is the one exception: it is a per-page bug, not a systemic one, and is tracked as a normal Linear ticket.

## Appendix B — File-by-File Change Inventory

Reproducibility of this plan is one grep away. The `scripts/strategy_impact.py` script (shipped with this document) scans `client/src/` and produces a file-by-file prediction of: which files the codemods will touch, which files the ESLint rules will flag, and which files will need manual Layer-2 work. Running it on the current tree yields approximately:

| Category | File count |
|---|---|
| Files touched by `codemod-states.ts` | ~80 |
| Files touched by `codemod-sheet.ts` | ~13 |
| Files touched by `codemod-numeric-coldef.ts` | ~24 |
| Files touched by `codemod-glossary.ts` | ~120 (pure string) |
| Files flagged for manual finish-up | ~10 |
| Files changed in `config/` | 5 |
| New files added to `client/src/` | 9 |

The fact that most of the work is codemod-driven rather than hand-edited is the plan. Whack-a-mole is avoided because the moles are gone — the shared primitive is now the only way to play.
