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
  title: "Operations",
  homePath: "/operations",
  description:
    "Manage inventory, receiving, shipping, photography, and samples in one operational workspace.",
  tabs: [
    { value: "inventory", label: "Inventory" },
    { value: "receiving", label: "Receiving" },
    { value: "shipping", label: "Shipping" },
    { value: "photography", label: "Photography" },
    { value: "samples", label: "Samples" },
  ],
} as const satisfies WorkspaceConfig<
  "inventory" | "receiving" | "shipping" | "photography" | "samples"
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
    "Manage invoices, bills, payments, banking, and the ledger in one workspace.",
  tabs: [
    { value: "dashboard", label: "Dashboard" },
    { value: "invoices", label: "Invoices" },
    { value: "bills", label: "Bills" },
    { value: "payments", label: "Payments" },
    { value: "general-ledger", label: "General Ledger" },
    { value: "chart-of-accounts", label: "Chart of Accounts" },
    { value: "expenses", label: "Expenses" },
    { value: "bank-accounts", label: "Bank Accounts" },
    { value: "bank-transactions", label: "Bank Transactions" },
    { value: "fiscal-periods", label: "Fiscal Periods" },
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
