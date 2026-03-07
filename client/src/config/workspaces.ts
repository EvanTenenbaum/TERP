export interface WorkspaceTabConfig<T extends string = string> {
  value: T;
  label: string;
}

export interface WorkspaceConfig<T extends string = string> {
  title: string;
  homePath: string;
  description: string;
  tabs: readonly WorkspaceTabConfig<T>[];
}

export const SALES_WORKSPACE = {
  title: "Sales",
  homePath: "/sales",
  description:
    "Manage orders, quotes, returns, sales sheets, and live shopping in a unified sales workspace.",
  tabs: [
    { value: "orders", label: "Orders" },
    { value: "quotes", label: "Quotes" },
    { value: "returns", label: "Returns" },
    { value: "sales-sheets", label: "Sales Sheets" },
    { value: "live-shopping", label: "Live Shopping" },
  ],
} as const satisfies WorkspaceConfig<
  "orders" | "quotes" | "returns" | "sales-sheets" | "live-shopping"
>;

export const DEMAND_SUPPLY_WORKSPACE = {
  title: "Demand & Supply",
  homePath: "/demand-supply",
  description:
    "Manage needs, interests, matchmaking, and supplier availability in one workspace.",
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
  description: "Manage buyers and suppliers from one consolidated workspace.",
  tabs: [
    { value: "clients", label: "Clients" },
    { value: "suppliers", label: "Suppliers" },
  ],
} as const satisfies WorkspaceConfig<"clients" | "suppliers">;

export const INVENTORY_WORKSPACE = {
  title: "Inventory",
  homePath: "/inventory",
  description:
    "Manage operational inventory, pick & pack, intake, photography, and samples in one place.",
  tabs: [
    { value: "inventory", label: "Operations" },
    { value: "pick-pack", label: "Pick & Pack" },
    { value: "intake", label: "Intake" },
    { value: "photography", label: "Photography" },
    { value: "samples", label: "Samples" },
  ],
} as const satisfies WorkspaceConfig<
  "inventory" | "pick-pack" | "intake" | "photography" | "samples"
>;

export const CREDITS_WORKSPACE = {
  title: "Credits",
  homePath: "/credits",
  description:
    "Handle credit operations and credit configuration in one place.",
  tabs: [
    { value: "credits", label: "Credits" },
    { value: "settings", label: "Settings" },
  ],
} as const satisfies WorkspaceConfig<"credits" | "settings">;

export const ACCOUNTING_WORKSPACE = {
  title: "Accounting",
  homePath: "/accounting",
  description:
    "Manage financials including receivables, payables, and the general ledger in one workspace.",
  tabs: [
    { value: "dashboard", label: "Dashboard" },
    { value: "receivables", label: "Receivables" },
    { value: "payables", label: "Payables" },
    { value: "ledger", label: "Ledger" },
  ],
} as const satisfies WorkspaceConfig<
  "dashboard" | "receivables" | "payables" | "ledger"
>;

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
