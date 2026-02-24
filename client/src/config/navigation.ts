import {
  LayoutDashboard,
  ShoppingCart,
  Plus,
  FileText,
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
  PackageOpen,
  CheckSquare,
  Camera,
  Trophy, // NAV-006: Leaderboard
  GitMerge, // Consolidated demand/supply workspace
  Tag, // NAV-012: Pricing Rules
  Workflow, // NAV-013: Workflow Queue
  Clock, // MEET-048: Time Clock
  Inbox, // TERP-0005: Inbox navigation
  Download, // TERP-0005: Receiving
  MapPin, // TERP-0005: Locations
  BookOpen, // TER-99: Client Ledger navigation
  type LucideIcon,
} from "lucide-react";
import {
  CREDITS_WORKSPACE,
  DEMAND_SUPPLY_WORKSPACE,
  INVENTORY_WORKSPACE,
  RELATIONSHIPS_WORKSPACE,
  SALES_WORKSPACE,
} from "@/config/workspaces";

export type NavigationGroupKey = "sales" | "inventory" | "finance" | "admin";

export interface NavigationItem {
  name: string;
  path: string;
  icon: LucideIcon;
  group: NavigationGroupKey;
  ariaLabel?: string;
  featureFlag?: string;
}

export interface QuickLinkItem {
  name: string;
  path: string;
  icon: LucideIcon;
  ariaLabel?: string;
}

export const navigationGroups: Array<{
  key: NavigationGroupKey;
  label: string;
}> = [
  { key: "sales", label: "Sell" },
  { key: "inventory", label: "Buy" },
  { key: "finance", label: "Finance" },
  { key: "admin", label: "Admin" },
];

export const navigationItems: NavigationItem[] = [
  // TERP-0005: Add Inbox to top-level Sales group
  {
    name: "Inbox",
    path: "/inbox",
    icon: Inbox,
    group: "sales",
    ariaLabel: "Notifications and messages inbox",
  },

  {
    name: SALES_WORKSPACE.title,
    path: "/sales",
    icon: ShoppingCart,
    group: "sales",
    ariaLabel: SALES_WORKSPACE.description,
  },
  {
    name: DEMAND_SUPPLY_WORKSPACE.title,
    path: "/demand-supply",
    icon: GitMerge,
    group: "sales",
    ariaLabel: DEMAND_SUPPLY_WORKSPACE.description,
  },
  {
    name: RELATIONSHIPS_WORKSPACE.title,
    path: "/relationships",
    icon: Users,
    group: "sales",
    ariaLabel: RELATIONSHIPS_WORKSPACE.description,
  },
  // NAV-002: Added Pick & Pack for order fulfillment workflow
  // TERP-0005: Moved from Sales to Inventory group
  {
    name: "Pick & Pack",
    path: "/pick-pack",
    icon: PackageOpen,
    group: "inventory",
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
  // TERP-0005: Moved Invoices from Sales to Finance group
  {
    name: "Invoices",
    path: "/accounting/invoices",
    icon: FileText,
    group: "finance",
    ariaLabel: "Manage invoices and billing",
  },
  // NAV-006: Leaderboard for sales performance tracking
  {
    name: "Leaderboard",
    path: "/leaderboard",
    icon: Trophy,
    group: "sales",
    ariaLabel: "Sales performance leaderboard",
  },
  {
    // MEET-053: User-friendly terminology - "Inventory" instead of "Batches"
    name: INVENTORY_WORKSPACE.title,
    path: "/inventory",
    icon: PackageCheck,
    group: "inventory",
    ariaLabel: INVENTORY_WORKSPACE.description,
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
  // TERP-0005: Rename Direct Intake to Receiving while preserving route alias
  {
    name: "Receiving",
    path: "/receiving",
    icon: Download,
    group: "inventory",
    ariaLabel: "Receive inventory into the system",
  },
  {
    name: "Purchase Orders",
    path: "/purchase-orders",
    icon: Truck,
    ariaLabel: "Purchase order queue",
    group: "inventory",
  },
  {
    name: "Spreadsheet View",
    path: "/spreadsheet-view",
    icon: Table,
    group: "inventory",
    ariaLabel: "Spreadsheet view for inventory and clients",
    featureFlag: "spreadsheet-view",
  },

  {
    name: "Accounting",
    path: "/accounting",
    icon: CreditCard,
    group: "finance",
    ariaLabel: "Accounts receivable and payable management",
  },
  {
    name: CREDITS_WORKSPACE.title,
    path: "/credits",
    icon: Coins,
    group: "finance",
    ariaLabel: CREDITS_WORKSPACE.description,
  },
  // TER-99: Client Ledger — direct access to client transaction history
  {
    name: "Client Ledger",
    path: "/client-ledger",
    icon: BookOpen,
    group: "finance",
    ariaLabel: "View client transaction history and balance",
  },
  { name: "Reports", path: "/analytics", icon: BarChart3, group: "finance" },
  // NAV-012: Pricing Rules for managing pricing strategies
  // QA-003 FIX: Changed path from /pricing-rules to /pricing/rules to match App.tsx route
  {
    name: "Pricing Rules",
    path: "/pricing/rules",
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
  // MEET-048: Time Clock for hour tracking
  {
    name: "Time Clock",
    path: "/time-clock",
    icon: Clock,
    group: "admin",
    ariaLabel: "Clock in/out and manage timesheets",
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
  // TERP-0005: Add Locations to Admin group
  {
    name: "Locations",
    path: "/locations",
    icon: MapPin,
    group: "admin",
    ariaLabel: "Manage warehouse and storage locations",
  },
];

export const quickLinkCandidates: readonly QuickLinkItem[] = [
  {
    name: "Dashboard",
    path: "/",
    icon: LayoutDashboard,
    ariaLabel: "Go to dashboard",
  },
  {
    name: "New Sale",
    path: "/orders/create",
    icon: Plus,
    ariaLabel: "Create a new sale",
  },
  {
    name: "Record Receipt",
    path: "/receiving",
    icon: Download,
    ariaLabel: "Record a receiving intake",
  },
  {
    name: "Clients",
    path: "/clients",
    icon: Users,
    ariaLabel: "Open client workspace",
  },
  {
    name: "Purchase Orders",
    path: "/purchase-orders",
    icon: Truck,
    ariaLabel: "Open purchase orders",
  },
  {
    name: "Invoices",
    path: "/accounting/invoices",
    icon: FileText,
    ariaLabel: "Open invoices",
  },
  {
    name: "Inventory",
    path: "/inventory",
    icon: PackageCheck,
    ariaLabel: "Open inventory workspace",
  },
  {
    name: SALES_WORKSPACE.title,
    path: "/sales",
    icon: ShoppingCart,
    ariaLabel: SALES_WORKSPACE.description,
  },
];

export const defaultQuickLinkPaths: readonly string[] = [
  "/",
  "/orders/create",
  "/receiving",
  "/clients",
];

export function buildQuickLinks(options?: {
  pinnedPaths?: string[];
  maxLinks?: number;
}): QuickLinkItem[] {
  const pinnedPaths = options?.pinnedPaths ?? [];
  const maxLinks = options?.maxLinks ?? 4;
  const candidateMap = new Map(
    quickLinkCandidates.map(link => [link.path, link] as const)
  );

  const preferredPaths =
    pinnedPaths.length > 0 ? pinnedPaths : [...defaultQuickLinkPaths];
  const fallbackPaths = [
    ...defaultQuickLinkPaths,
    ...quickLinkCandidates.map(link => link.path),
  ];

  const selectedPaths: string[] = [];
  const collect = (paths: string[]) => {
    for (const path of paths) {
      if (!candidateMap.has(path) || selectedPaths.includes(path)) {
        continue;
      }
      selectedPaths.push(path);
      if (selectedPaths.length >= maxLinks) {
        break;
      }
    }
  };

  collect(preferredPaths);
  if (selectedPaths.length < maxLinks) {
    collect(fallbackPaths);
  }

  return selectedPaths
    .slice(0, maxLinks)
    .map(path => candidateMap.get(path))
    .filter((link): link is QuickLinkItem => Boolean(link));
}

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
