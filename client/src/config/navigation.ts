import {
  LayoutDashboard,
  ShoppingCart,
  FileText,
  Package,
  PackageCheck,
  Beaker,
  Truck,
  Users,
  UserCog,
  Settings,
  Calendar,
  CalendarClock,
  CreditCard,
  Coins,
  BarChart3,
  Table,
  Video,
  Flag,
  Layers,
  Heart,
  PackageOpen,
  CheckSquare,
  Building2,
  Camera,
  Trophy,       // NAV-006: Leaderboard
  Target,       // NAV-007: Client Needs
  GitMerge,     // NAV-008: Matchmaking
  ClipboardList, // NAV-009: Quotes
  RotateCcw,    // NAV-010: Returns
  Store,        // NAV-011: Vendor Supply
  Tag,          // NAV-012: Pricing Rules
  Workflow,     // NAV-013: Workflow Queue
  type LucideIcon,
} from "lucide-react";

export type NavigationGroupKey = "sales" | "inventory" | "finance" | "admin";

export interface NavigationItem {
  name: string;
  path: string;
  icon: LucideIcon;
  group: NavigationGroupKey;
  ariaLabel?: string;
  featureFlag?: string;
}

export const navigationGroups: Array<{
  key: NavigationGroupKey;
  label: string;
}> = [
  { key: "sales", label: "Sales" },
  { key: "inventory", label: "Inventory" },
  { key: "finance", label: "Finance" },
  { key: "admin", label: "Admin" },
];

export const navigationItems: NavigationItem[] = [
  { name: "Dashboard", path: "/", icon: LayoutDashboard, group: "sales" },
  { name: "Clients", path: "/clients", icon: Users, group: "sales" },
  { name: "Orders", path: "/orders", icon: ShoppingCart, group: "sales" },
  // NAV-001: Added Interest List for tracking client product interests
  {
    name: "Interest List",
    path: "/interest-list",
    icon: Heart,
    group: "sales",
    ariaLabel: "Track client product interests and convert to orders",
  },
  // NAV-002: Added Pick & Pack for order fulfillment workflow
  {
    name: "Pick & Pack",
    path: "/pick-pack",
    icon: PackageOpen,
    group: "sales",
    ariaLabel: "Order fulfillment and packing workflow",
  },
  {
    name: "Sales Sheets",
    path: "/sales-sheets",
    icon: Layers,
    group: "sales",
    ariaLabel: "Create and share sales sheets with clients",
  },
  {
    name: "Live Shopping",
    path: "/live-shopping",
    icon: Video,
    group: "sales",
    ariaLabel: "Live shopping sessions with clients",
    // NOTE: Feature flag intentionally omitted to ensure BUG-073 fix remains active
    // Add featureFlag: "live-shopping" when ready for controlled rollout
  },
  {
    name: "Invoices",
    path: "/accounting/invoices",
    icon: FileText,
    group: "sales",
  },
  // NAV-006: Leaderboard for sales performance tracking
  {
    name: "Leaderboard",
    path: "/leaderboard",
    icon: Trophy,
    group: "sales",
    ariaLabel: "Sales performance leaderboard",
  },
  // NAV-007: Client Needs for tracking customer requirements
  {
    name: "Client Needs",
    path: "/client-needs",
    icon: Target,
    group: "sales",
    ariaLabel: "Track client product needs and requirements",
  },
  // NAV-008: Matchmaking for product-client matching
  {
    name: "Matchmaking",
    path: "/matchmaking",
    icon: GitMerge,
    group: "sales",
    ariaLabel: "Match products with client needs",
  },
  // NAV-009: Quotes for quote management
  {
    name: "Quotes",
    path: "/quotes",
    icon: ClipboardList,
    group: "sales",
    ariaLabel: "Manage sales quotes",
  },
  // NAV-010: Returns for order returns processing
  {
    name: "Returns",
    path: "/returns",
    icon: RotateCcw,
    group: "sales",
    ariaLabel: "Process order returns",
  },

  { name: "Products", path: "/products", icon: Package, group: "inventory" },
  {
    // MEET-053: User-friendly terminology - "Inventory" instead of "Batches"
    name: "Inventory",
    path: "/inventory",
    icon: PackageCheck,
    group: "inventory",
    ariaLabel: "View and manage inventory items",
  },
  // NAV-003: Added Photography Queue for product photography workflow
  {
    name: "Photography",
    path: "/photography",
    icon: Camera,
    group: "inventory",
    ariaLabel: "Product photography queue and workflow management",
  },
  { name: "Samples", path: "/samples", icon: Beaker, group: "inventory" },
  {
    name: "Purchase Orders",
    path: "/purchase-orders",
    icon: Truck,
    ariaLabel: "Purchase order queue",
    group: "inventory",
  },
  // NAV-004: Added Vendors for vendor management and inventory visibility
  {
    name: "Vendors",
    path: "/vendors",
    icon: Building2,
    group: "inventory",
    ariaLabel: "Vendor management with products and inventory",
  },
  // NAV-011: Vendor Supply for tracking vendor inventory
  {
    name: "Vendor Supply",
    path: "/vendor-supply",
    icon: Store,
    group: "inventory",
    ariaLabel: "Track vendor supply and availability",
  },
  {
    name: "Spreadsheet View",
    path: "/spreadsheet-view",
    icon: Table,
    group: "inventory",
    ariaLabel: "Spreadsheet view for inventory and clients",
    featureFlag: "spreadsheet-view",
  },

  { name: "AR/AP", path: "/accounting", icon: CreditCard, group: "finance" },
  {
    // QA-W2-008: Use Coins icon to avoid duplicate with AR/AP
    // FEAT-016: Renamed from "Credits" to "Credit Settings" for clarity
    name: "Credit Settings",
    path: "/credit-settings",
    icon: Coins,
    group: "finance",
  },
  { name: "Reports", path: "/analytics", icon: BarChart3, group: "finance" },
  // NAV-012: Pricing Rules for managing pricing strategies
  {
    name: "Pricing Rules",
    path: "/pricing-rules",
    icon: Tag,
    group: "finance",
    ariaLabel: "Configure pricing rules and strategies",
  },

  // QA-W2-008: Use UserCog icon to avoid duplicate with Clients
  { name: "Users", path: "/users", icon: UserCog, group: "admin" },
  // UX-010: Renamed "Settings" to "System Settings" to distinguish from personal account settings
  {
    name: "System Settings",
    path: "/settings",
    icon: Settings,
    group: "admin",
  },
  { name: "Calendar", path: "/calendar", icon: Calendar, group: "admin" },
  // NAV-005: Added Todo Lists for task management
  {
    name: "Todo Lists",
    path: "/todos",
    icon: CheckSquare,
    group: "admin",
    ariaLabel: "Personal task management and todo lists",
  },
  // Sprint 4 Track D: Scheduling System - Room booking, shifts, deliveries
  {
    name: "Scheduling",
    path: "/scheduling",
    icon: CalendarClock,
    group: "admin",
  },
  // FEAT-017: Direct access to Feature Flags for improved discoverability
  {
    name: "Feature Flags",
    path: "/settings/feature-flags",
    icon: Flag,
    group: "admin",
    ariaLabel: "Manage feature flags and rollouts",
  },
  // NAV-013: Workflow Queue for managing workflow states
  {
    name: "Workflow Queue",
    path: "/workflow-queue",
    icon: Workflow,
    group: "admin",
    ariaLabel: "Manage workflow statuses and queues",
  },
];

export type NavigationGroup = {
  key: NavigationGroupKey;
  label: string;
  items: NavigationItem[];
  loadingFeatureItems: NavigationItem[];
};

export function getNavigationItems(
  group?: NavigationGroupKey
): NavigationItem[] {
  if (!group) return navigationItems;
  return navigationItems.filter(item => item.group === group);
}

export function buildNavigationGroups(options?: {
  flags?: Record<string, boolean>;
  flagsLoading?: boolean;
}): NavigationGroup[] {
  const { flags = {}, flagsLoading = false } = options ?? {};

  return navigationGroups.map(group => {
    const itemsInGroup = navigationItems.filter(
      item => item.group === group.key
    );

    const items = itemsInGroup.filter(item => {
      if (!item.featureFlag) {
        return true;
      }

      if (flagsLoading) {
        return false;
      }

      return flags[item.featureFlag] ?? false;
    });

    const loadingFeatureItems = flagsLoading
      ? itemsInGroup.filter(item => Boolean(item.featureFlag))
      : [];

    return {
      key: group.key,
      label: group.label,
      items,
      loadingFeatureItems,
    };
  });
}
