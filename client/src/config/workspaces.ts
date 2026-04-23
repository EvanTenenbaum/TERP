export interface WorkspaceTabConfig<T extends string = string> {
  value: T;
  label: string;
}

/**
 * Optional grouped view of a workspace's tabs. When present and the
 * `ux.v2.workspace-tabs` feature flag is enabled, `LinearWorkspaceShell`
 * renders a two-level rail (top row = group labels, secondary row = the
 * selected group's tabs). The flat `tabs` array remains the source of truth
 * for valid tab values so deep links (e.g. `?tab=invoices`) keep working
 * regardless of flag state.
 *
 * Invariants:
 * - Every tab value referenced in `tabGroups[].tabs[].value` MUST also exist
 *   in the workspace's flat `tabs` array.
 * - Tab values are unique across all groups (no tab appears in two groups).
 *
 * Introduced by TER-1305 (UX v2 tab grouping). See
 * `docs/ux-review/02-Implementation_Strategy.md` §4.5.
 */
export interface WorkspaceTabGroupConfig<T extends string = string> {
  label: string;
  tabs: readonly WorkspaceTabConfig<T>[];
}

export interface WorkspaceConfig<T extends string = string> {
  title: string;
  homePath: string;
  description: string;
  tabs: readonly WorkspaceTabConfig<T>[];
  /**
   * Optional grouped presentation of the workspace's tabs. See
   * {@link WorkspaceTabGroupConfig} for the invariants this field must
   * uphold relative to the flat `tabs` array.
   */
  tabGroups?: readonly WorkspaceTabGroupConfig<T>[];
}

export const SALES_WORKSPACE = {
  title: "Sales",
  homePath: "/sales",
  description:
    "Manage orders, quotes, returns, sales catalogues, and live shopping in one workspace.",
  tabs: [
    { value: "orders", label: "Orders" },
    { value: "pick-list", label: "Pick List" },
    { value: "quotes", label: "Quotes" },
    { value: "returns", label: "Returns" },
    { value: "sales-sheets", label: "Sales Catalogues" },
    { value: "live-shopping", label: "Live Shopping" },
  ],
} as const satisfies WorkspaceConfig<
  | "orders"
  | "pick-list"
  | "quotes"
  | "returns"
  | "sales-sheets"
  | "live-shopping"
>;

export const DEMAND_SUPPLY_WORKSPACE = {
  title: "Demand & Supply",
  homePath: "/demand-supply",
  description:
    "Manage needs, interests, matchmaking, and supplier availability from one workspace.",
  tabs: [
    { value: "matchmaking", label: "Matchmaking" },
    { value: "needs", label: "Client Needs" },
    { value: "interest-list", label: "Interest List" },
    { value: "vendor-supply", label: "Supplier Supply" },
  ],
} as const satisfies WorkspaceConfig<
  "matchmaking" | "needs" | "interest-list" | "vendor-supply"
>;

export const RELATIONSHIPS_WORKSPACE = {
  title: "Relationships",
  homePath: "/relationships",
  description:
    "Manage buyers and suppliers from one focused workspace without the full setup wizard.",
  tabs: [
    { value: "clients", label: "Clients" },
    { value: "suppliers", label: "Suppliers" },
  ],
} as const satisfies WorkspaceConfig<"clients" | "suppliers">;

export const INVENTORY_WORKSPACE = {
  title: "Inventory",
  homePath: "/inventory",
  description:
    "Manage inventory, intake, shipping, photography, and samples from one primary operations workspace.",
  tabs: [
    { value: "inventory", label: "Inventory" },
    { value: "intake", label: "Direct Intake" },
    { value: "receiving", label: "Product Intake" },
    { value: "shipping", label: "Shipping" },
    { value: "photography", label: "Photography" },
    { value: "samples", label: "Samples" },
  ],
} as const satisfies WorkspaceConfig<
  "inventory" | "intake" | "receiving" | "shipping" | "photography" | "samples"
>;

export const CREDITS_WORKSPACE = {
  title: "Client Credit",
  homePath: "/credits",
  description:
    "Separate issued credit adjustments from client credit capacity settings in one finance workspace.",
  tabs: [
    { value: "dashboard", label: "Dashboard" },
    { value: "adjustments", label: "Issued Adjustments" },
    { value: "capacity", label: "Capacity Settings" },
  ],
} as const satisfies WorkspaceConfig<"dashboard" | "adjustments" | "capacity">;

export const ACCOUNTING_WORKSPACE = {
  title: "Accounting",
  homePath: "/accounting",
  description:
    "Manage invoices, bills, payments, banking, and the ledger in one finance workspace.",
  // Flat tab list is the source of truth for valid tab values. Deep links
  // like `/accounting?tab=invoices` route by value and are unaffected by the
  // `tabGroups` grouping introduced for TER-1305. Order here is aligned with
  // the group order below for consistency when the flat rail is rendered
  // (feature flag off / fallback path).
  tabs: [
    { value: "dashboard", label: "Dashboard" },
    { value: "invoices", label: "Invoices" },
    { value: "payments", label: "Payments" },
    { value: "bills", label: "Bills" },
    { value: "expenses", label: "Expenses" },
    { value: "general-ledger", label: "General Ledger" },
    { value: "chart-of-accounts", label: "Chart of Accounts" },
    { value: "bank-accounts", label: "Bank Accounts" },
    { value: "bank-transactions", label: "Bank Transactions" },
    { value: "fiscal-periods", label: "Fiscal Periods" },
  ],
  // Two-level rail grouping (TER-1305 / UX v2). Rendered by
  // `LinearWorkspaceShell` only when the `ux.v2.workspace-tabs` flag is on.
  // Tab values here MUST exist in the flat `tabs` array above.
  tabGroups: [
    {
      label: "Overview",
      tabs: [{ value: "dashboard", label: "Dashboard" }],
    },
    {
      label: "Receivables",
      tabs: [
        { value: "invoices", label: "Invoices" },
        { value: "payments", label: "Payments" },
      ],
    },
    {
      label: "Payables",
      tabs: [
        { value: "bills", label: "Bills" },
        { value: "expenses", label: "Expenses" },
      ],
    },
    {
      label: "Ledger",
      tabs: [
        { value: "general-ledger", label: "General Ledger" },
        { value: "chart-of-accounts", label: "Chart of Accounts" },
        { value: "bank-accounts", label: "Bank Accounts" },
        { value: "bank-transactions", label: "Bank Transactions" },
        { value: "fiscal-periods", label: "Fiscal Periods" },
      ],
    },
  ],
} as const satisfies WorkspaceConfig<
  | "dashboard"
  | "invoices"
  | "bills"
  | "payments"
  | "general-ledger"
  | "chart-of-accounts"
  | "expenses"
  | "bank-accounts"
  | "bank-transactions"
  | "fiscal-periods"
>;

export const BUYING_WORKSPACE = {
  title: "Buying",
  homePath: "/procurement",
  description:
    "Create and manage purchase orders, track supplier intake, and walk POs from draft to received.",
  tabs: [{ value: "purchase-orders", label: "Purchase Orders" }],
} as const satisfies WorkspaceConfig<"purchase-orders">;

export const CALENDAR_WORKSPACE = {
  title: "Calendar",
  homePath: "/calendar",
  description:
    "View your calendar, manage scheduling, and track time in one workspace.",
  tabs: [
    { value: "calendar", label: "Calendar" },
    { value: "scheduling", label: "Scheduling" },
    { value: "time-clock", label: "Time Clock" },
  ],
} as const satisfies WorkspaceConfig<"calendar" | "scheduling" | "time-clock">;

export const SETTINGS_WORKSPACE = {
  title: "Settings",
  homePath: "/settings",
  description:
    "Configure your organization, users, locations, pricing, and feature flags.",
  tabs: [
    { value: "general", label: "General" },
    { value: "users", label: "Users" },
    { value: "locations", label: "Locations" },
    { value: "pricing-rules", label: "Pricing Rules" },
    { value: "feature-flags", label: "Feature Flags" },
    { value: "cogs", label: "COGS" },
  ],
} as const satisfies WorkspaceConfig<
  "general" | "users" | "locations" | "pricing-rules" | "feature-flags" | "cogs"
>;

export const NOTIFICATIONS_WORKSPACE = {
  title: "Notifications",
  homePath: "/notifications",
  description: "View notifications and manage your todo lists.",
  tabs: [
    { value: "notifications", label: "Notifications" },
    { value: "todos", label: "Todo Lists" },
  ],
} as const satisfies WorkspaceConfig<"notifications" | "todos">;
