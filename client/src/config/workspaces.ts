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
    "Manage orders, quotes, and returns in a unified sales workspace.",
  tabs: [
    { value: "orders", label: "Orders" },
    { value: "quotes", label: "Quotes" },
    { value: "returns", label: "Returns" },
  ],
} as const satisfies WorkspaceConfig<"orders" | "quotes" | "returns">;

export const DEMAND_SUPPLY_WORKSPACE = {
  title: "Demand & Supply",
  homePath: "/demand-supply",
  description:
    "Manage needs, interests, matchmaking, and supplier availability in one workspace.",
  tabs: [
    { value: "matchmaking", label: "Matchmaking" },
    { value: "needs", label: "Client Needs" },
    { value: "interest-list", label: "Interest List" },
    { value: "vendor-supply", label: "Vendor Supply" },
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
    "Inventory keeps operations and browse surfaces together so users can act without losing context.",
  tabs: [
    { value: "inventory", label: "Operations" },
    { value: "browse", label: "Browse" },
    { value: "products", label: "Products" },
  ],
} as const satisfies WorkspaceConfig<"inventory" | "browse" | "products">;

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
