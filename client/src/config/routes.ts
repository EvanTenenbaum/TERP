/**
 * Route Registry (TER-1297)
 *
 * Central pattern → title map used by `AppBreadcrumb` to generate breadcrumb
 * labels from the current URL without each feature having to register custom
 * breadcrumb props. Dynamic detail routes (e.g. `/clients/:id`) additionally
 * declare an `entityType` so the breadcrumb component can asynchronously
 * resolve a human-friendly name (client name, order number, etc.) via tRPC.
 *
 * Design notes:
 * - Patterns use Wouter's `:param` syntax to match existing routes in
 *   `client/src/App.tsx` 1-for-1.
 * - Entries are consulted in insertion order. Keep specific patterns (e.g.
 *   `/sales/new`) above their generic siblings (e.g. `/sales`) — although the
 *   walker in `buildBreadcrumbTrail` only calls `matchRoute` on
 *   path-prefix-by-prefix, so ordering rarely matters.
 * - Titles are intentionally short (1–3 words) because they render inside a
 *   compact header breadcrumb bar.
 *
 * Related:
 * - `AppBreadcrumb.tsx` consumes this registry behind the
 *   `ux.v2.breadcrumb-registry` feature flag.
 * - `navigation.ts` remains the source of truth for sidebar + command palette
 *   entries; this file exists specifically for breadcrumb titling.
 */

import { navigationItems } from "./navigation";

/** Entity types supported by the breadcrumb resolver. */
export type RouteEntityType =
  | "client"
  | "order"
  | "invoice"
  | "bill"
  | "product"
  | "supplier";

/** A single entry in the route registry. */
export interface RouteRegistryEntry {
  /** Wouter-style path pattern, e.g. "/clients/:id". */
  pattern: string;
  /** Display title for this exact path. */
  title: string;
  /**
   * Optional entity type. When set, `AppBreadcrumb` will try to resolve the
   * breadcrumb label to a human-friendly name (e.g. client name) using the
   * id extracted from the matching `idParam` (default `"id"`).
   */
  entityType?: RouteEntityType;
  /** Param name that holds the entity id. Defaults to `"id"`. */
  idParam?: string;
}

/**
 * The registry. Keep entries grouped by feature for readability.
 */
export const routeRegistry: readonly RouteRegistryEntry[] = [
  // ── Dashboard / home ─────────────────────────────────────────────────────
  { pattern: "/", title: "Dashboard" },
  { pattern: "/dashboard", title: "Dashboard" },

  // ── Sales ────────────────────────────────────────────────────────────────
  { pattern: "/sales", title: "Sales" },
  { pattern: "/sales/new", title: "New Order" },
  { pattern: "/sales-sheets", title: "Sales Sheets" },
  { pattern: "/sales-sheet", title: "Sales Sheet" },
  { pattern: "/sales-portal", title: "Sales Portal" },
  { pattern: "/sell", title: "Sell" },
  { pattern: "/sell/orders", title: "Orders" },

  // ── Orders ───────────────────────────────────────────────────────────────
  { pattern: "/orders", title: "Orders" },
  { pattern: "/orders/new", title: "New Order" },
  { pattern: "/orders/create", title: "New Order" },
  { pattern: "/orders/:id", title: "Order", entityType: "order" },
  { pattern: "/quotes", title: "Quotes" },

  // ── Clients / relationships ──────────────────────────────────────────────
  { pattern: "/relationships", title: "Relationships" },
  { pattern: "/clients", title: "Clients" },
  { pattern: "/clients/:id", title: "Client", entityType: "client" },
  {
    pattern: "/clients/:clientId/ledger",
    title: "Ledger",
    entityType: "client",
    idParam: "clientId",
  },
  {
    pattern: "/clients/:clientId/vip-portal-config",
    title: "VIP Portal",
    entityType: "client",
    idParam: "clientId",
  },
  { pattern: "/client-ledger", title: "Client Ledger" },
  { pattern: "/client-needs", title: "Client Needs" },
  { pattern: "/suppliers", title: "Suppliers" },
  { pattern: "/vendors", title: "Suppliers" },
  {
    pattern: "/vendors/:id",
    title: "Supplier",
    entityType: "supplier",
  },

  // ── Inventory / products / purchasing ────────────────────────────────────
  { pattern: "/inventory", title: "Inventory" },
  { pattern: "/inventory/:id", title: "Item" },
  { pattern: "/inventory-browse", title: "Inventory" },
  { pattern: "/operations", title: "Operations" },
  { pattern: "/products", title: "Products" },
  { pattern: "/products/:id", title: "Product", entityType: "product" },
  { pattern: "/strains", title: "Strains" },
  { pattern: "/strains/new", title: "New Strain" },
  { pattern: "/strains/:id", title: "Strain" },
  { pattern: "/admin/strains", title: "Strain Admin" },
  { pattern: "/product-intake", title: "Product Intake" },
  { pattern: "/purchase-orders", title: "Purchase Orders" },
  { pattern: "/purchase-orders/classic", title: "Classic" },
  { pattern: "/procurement", title: "Procurement" },
  { pattern: "/pick-pack", title: "Pick & Pack" },
  { pattern: "/warehouse/pick-pack", title: "Pick & Pack" },
  { pattern: "/photography", title: "Photography" },
  { pattern: "/receiving", title: "Receiving" },
  { pattern: "/intake", title: "Intake" },
  { pattern: "/direct-intake", title: "Direct Intake" },
  { pattern: "/intake-receipts", title: "Intake Receipts" },
  { pattern: "/returns", title: "Returns" },
  { pattern: "/samples", title: "Samples" },
  { pattern: "/locations", title: "Locations" },
  { pattern: "/matchmaking", title: "Matchmaking" },
  { pattern: "/live-shopping", title: "Live Shopping" },
  { pattern: "/demand-supply", title: "Demand & Supply" },
  { pattern: "/vendor-supply", title: "Vendor Supply" },
  { pattern: "/needs", title: "Needs" },
  { pattern: "/interest-list", title: "Interest List" },

  // ── Accounting / finance ─────────────────────────────────────────────────
  { pattern: "/accounting", title: "Accounting" },
  { pattern: "/accounting/dashboard", title: "Dashboard" },
  { pattern: "/accounting/invoices", title: "Invoices" },
  {
    pattern: "/accounting/invoices/:id",
    title: "Invoice",
    entityType: "invoice",
  },
  { pattern: "/accounting/bills", title: "Bills" },
  {
    pattern: "/accounting/bills/:id",
    title: "Bill",
    entityType: "bill",
  },
  { pattern: "/accounting/payments", title: "Payments" },
  { pattern: "/accounting/general-ledger", title: "General Ledger" },
  { pattern: "/accounting/chart-of-accounts", title: "Chart of Accounts" },
  { pattern: "/accounting/expenses", title: "Expenses" },
  { pattern: "/accounting/bank-accounts", title: "Bank Accounts" },
  { pattern: "/accounting/bank-transactions", title: "Bank Transactions" },
  { pattern: "/accounting/fiscal-periods", title: "Fiscal Periods" },
  { pattern: "/accounting/cash-locations", title: "Cash Locations" },
  { pattern: "/invoices", title: "Invoices" },
  { pattern: "/invoices/:id", title: "Invoice", entityType: "invoice" },
  { pattern: "/bills", title: "Bills" },
  { pattern: "/bills/:id", title: "Bill", entityType: "bill" },
  { pattern: "/payments", title: "Payments" },
  { pattern: "/ar-ap", title: "AR / AP" },
  { pattern: "/accounts-receivable", title: "Accounts Receivable" },
  { pattern: "/credits", title: "Credits" },
  { pattern: "/credits/manage", title: "Manage Credits" },
  { pattern: "/credit-settings", title: "Credit Settings" },
  { pattern: "/analytics", title: "Analytics" },
  { pattern: "/reports", title: "Reports" },
  { pattern: "/reports/shrinkage", title: "Shrinkage" },
  { pattern: "/leaderboard", title: "Leaderboard" },
  { pattern: "/pricing/rules", title: "Pricing Rules" },
  { pattern: "/pricing/profiles", title: "Pricing Profiles" },
  { pattern: "/pricing-rules", title: "Pricing Rules" },

  // ── Admin / settings ─────────────────────────────────────────────────────
  { pattern: "/settings", title: "Settings" },
  { pattern: "/settings/cogs", title: "COGS" },
  { pattern: "/settings/notifications", title: "Notifications" },
  { pattern: "/settings/display", title: "Display" },
  { pattern: "/settings/feature-flags", title: "Feature Flags" },
  { pattern: "/system-settings", title: "System Settings" },
  { pattern: "/feature-flags", title: "Feature Flags" },
  { pattern: "/users", title: "Users" },
  { pattern: "/admin", title: "Admin" },
  { pattern: "/admin/users", title: "Users" },
  { pattern: "/admin/roles/new", title: "New Role" },
  { pattern: "/admin/metrics", title: "System Metrics" },
  { pattern: "/account", title: "Account" },

  // ── Workflow / calendar / tasks ──────────────────────────────────────────
  { pattern: "/calendar", title: "Calendar" },
  { pattern: "/calendar/invitations", title: "Invitations" },
  { pattern: "/scheduling", title: "Scheduling" },
  { pattern: "/time-clock", title: "Time Clock" },
  { pattern: "/todo", title: "Todo" },
  { pattern: "/todos", title: "Todo Lists" },
  { pattern: "/todos/:listId", title: "List" },
  { pattern: "/todo-lists", title: "Todo Lists" },
  { pattern: "/notifications", title: "Notifications" },
  { pattern: "/inbox", title: "Inbox" },
  { pattern: "/alerts", title: "Alerts" },
  { pattern: "/workflow-queue", title: "Workflow Queue" },
  { pattern: "/search", title: "Search" },
  { pattern: "/help", title: "Help" },
  { pattern: "/spreadsheet-view", title: "Spreadsheet View" },
];

/** Result of a successful registry match. */
export interface RouteMatch {
  entry: RouteRegistryEntry;
  /** Extracted path params, keyed by param name (without the leading colon). */
  params: Record<string, string>;
}

interface CompiledRoute {
  entry: RouteRegistryEntry;
  regexp: RegExp;
  paramNames: string[];
}

/**
 * Escape a literal path segment for use inside a RegExp. Kept as a standalone
 * helper so it can be unit-tested if needed.
 */
function escapeRegExpLiteral(segment: string): string {
  return segment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function compileRoute(entry: RouteRegistryEntry): CompiledRoute {
  const paramNames: string[] = [];
  const segments = entry.pattern.split("/").map(seg => {
    if (seg.startsWith(":")) {
      paramNames.push(seg.slice(1));
      return "([^/]+)";
    }
    return escapeRegExpLiteral(seg);
  });
  return {
    entry,
    regexp: new RegExp(`^${segments.join("/")}$`),
    paramNames,
  };
}

// Compile all registered routes once at module load so per-render matching is
// cheap (just array iteration + regex exec).
const compiledRoutes: readonly CompiledRoute[] = routeRegistry.map(compileRoute);

/**
 * Normalise a pathname before matching. Strips any trailing slash except for
 * the root `/`, and strips query/hash fragments.
 */
function normalisePathname(pathname: string): string {
  const withoutQuery = pathname.split(/[?#]/, 1)[0] ?? "";
  if (withoutQuery.length > 1 && withoutQuery.endsWith("/")) {
    return withoutQuery.slice(0, -1);
  }
  return withoutQuery || "/";
}

/**
 * Look up a pathname in the registry. Returns the first matching entry (with
 * extracted params) or `null` if no pattern matches.
 */
export function matchRoute(pathname: string): RouteMatch | null {
  const normalised = normalisePathname(pathname);
  for (const compiled of compiledRoutes) {
    const match = compiled.regexp.exec(normalised);
    if (!match) continue;
    const params: Record<string, string> = {};
    compiled.paramNames.forEach((name, i) => {
      // match[0] is the full match; params start at index 1.
      const value = match[i + 1];
      if (value !== undefined) {
        params[name] = value;
      }
    });
    return { entry: compiled.entry, params };
  }
  return null;
}

/** A single breadcrumb crumb derived from the path + registry. */
export interface BreadcrumbTrailEntry {
  /** Concrete href for this crumb (cumulative path prefix). */
  path: string;
  /** Resolved title to render for this crumb. */
  title: string;
  /** Entity type (carried through from the registry) for async resolution. */
  entityType?: RouteEntityType;
  /** Raw id extracted from path params, when the matched entry has one. */
  entityId?: string;
  /** True for the deepest crumb in the trail. */
  isLast: boolean;
}

/**
 * TER-1363: Known workspace `?tab=…` values that should contribute an extra
 * breadcrumb crumb (e.g. `/sales?tab=create-order` → "Sales > New Order").
 *
 * Keyed by the pathname, then by the tab value. Kept as a static map rather
 * than a dynamic lookup so the breadcrumb stays predictable across pages and
 * query-param nav remains a first-class breadcrumb citizen.
 */
const WORKSPACE_TAB_CRUMB_TITLES: Readonly<
  Record<string, Readonly<Record<string, string>>>
> = {
  "/sales": {
    "create-order": "New Order",
  },
};

function humaniseSegment(segment: string): string {
  if (/^\d+$/.test(segment)) return `#${segment}`;
  return segment
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, char => char.toUpperCase());
}

function extractTabFromSearch(search: string | undefined): string | null {
  if (!search) return null;
  const trimmed = search.startsWith("?") ? search.slice(1) : search;
  if (!trimmed) return null;
  try {
    const params = new URLSearchParams(trimmed);
    const tab = params.get("tab");
    return tab && tab.length > 0 ? tab : null;
  } catch {
    return null;
  }
}

/**
 * Walk a pathname one segment at a time and return a breadcrumb trail whose
 * titles come from the registry where possible, falling back to navigation
 * items and then to a humanised version of the raw segment.
 *
 * When `search` is provided, a recognised `?tab=…` value for the current
 * pathname contributes an extra trailing crumb — this is how breadcrumbs like
 * `/sales?tab=create-order` → "Sales > New Order" (TER-1363) stay correct
 * even though the active sub-view lives in a query parameter rather than the
 * path.
 *
 * Returns `[]` for the root path to signal "do not render a breadcrumb".
 */
export function buildBreadcrumbTrail(
  pathname: string,
  search?: string
): BreadcrumbTrailEntry[] {
  const normalised = normalisePathname(pathname);
  if (normalised === "/" || normalised === "") return [];

  const segments = normalised.split("/").filter(Boolean);
  const trail: BreadcrumbTrailEntry[] = [];

  let accumulated = "";
  segments.forEach((segment, index) => {
    accumulated += `/${segment}`;
    const isLast = index === segments.length - 1;
    const match = matchRoute(accumulated);

    if (match) {
      const entityIdParam = match.entry.idParam ?? "id";
      const entityId =
        match.entry.entityType && match.params[entityIdParam]
          ? match.params[entityIdParam]
          : undefined;
      trail.push({
        path: accumulated,
        title: match.entry.title,
        entityType: match.entry.entityType,
        entityId,
        isLast,
      });
      return;
    }

    // Fallbacks: navigation items (exact path), then humanised segment.
    const navItem = navigationItems.find(item => item.path === accumulated);
    const title = navItem?.name ?? humaniseSegment(segment);
    trail.push({ path: accumulated, title, isLast });
  });

  // TER-1363: Append a workspace-tab crumb when the current pathname opts in
  // via WORKSPACE_TAB_CRUMB_TITLES. We preserve the existing crumbs as
  // non-last and hand the `isLast` marker to the tab crumb so the render
  // layer shows "Sales > New Order" rather than "Sales" alone.
  const tabTitles = WORKSPACE_TAB_CRUMB_TITLES[normalised];
  const tabValue = tabTitles ? extractTabFromSearch(search) : null;
  const tabTitle = tabValue && tabTitles ? tabTitles[tabValue] : undefined;
  if (tabTitle && trail.length > 0) {
    for (const crumb of trail) {
      crumb.isLast = false;
    }
    const tabSearch = `?tab=${encodeURIComponent(tabValue as string)}`;
    trail.push({
      path: `${normalised}${tabSearch}`,
      title: tabTitle,
      isLast: true,
    });
  }

  return trail;
}
