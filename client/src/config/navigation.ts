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
  Bell, // TER-569: Notifications Hub navigation
  Download, // TERP-0005: Intake
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

export type NavigationGroupKey =
  | "sales"
  | "buy"
  | "operations"
  | "relationships"
  | "finance"
  | "admin";

export interface NavigationItem {
  name: string;
  path: string;
  icon: LucideIcon;
  group: NavigationGroupKey;
  ariaLabel?: string;
  featureFlag?: string;
  /**
   * TER-597: When false, item is hidden from the sidebar but still appears
   * in the Command Palette search. Absorbed items that became workspace tabs
   * should set this to false instead of being removed entirely.
   * Defaults to true when omitted.
   */
  sidebarVisible?: boolean;
}

export interface QuickLinkItem {
  name: string;
  path: string;
  icon: LucideIcon;
  ariaLabel?: string;
}

export interface NavigationAccessModel {
  groups: NavigationGroup[];
  commandNavigationItems: NavigationItem[];
  quickLinks: QuickLinkItem[];
  quickLinkCandidates: QuickLinkItem[];
}

export const navigationGroups: Array<{
  key: NavigationGroupKey;
  label: string;
}> = [
  { key: "sales", label: "Sell" },
  { key: "buy", label: "Buy" },
  { key: "operations", label: "Operations" },
  { key: "relationships", label: "Relationships" },
  { key: "finance", label: "Finance" },
  { key: "admin", label: "Admin" },
];

export const navigationItems: NavigationItem[] = [
  // ─── Sell group (2 sidebar items) ──────────────────────────────────────────
  {
    name: SALES_WORKSPACE.title,
    path: "/sales",
    icon: ShoppingCart,
    group: "sales",
    ariaLabel: SALES_WORKSPACE.description,
    sidebarVisible: true,
  },
  {
    name: DEMAND_SUPPLY_WORKSPACE.title,
    path: "/demand-supply",
    icon: GitMerge,
    group: "sales",
    ariaLabel: DEMAND_SUPPLY_WORKSPACE.description,
    sidebarVisible: true,
  },

  // Absorbed into Operations workspace — hidden from sidebar, visible in Command Palette
  {
    name: "Shipping",
    path: "/inventory?tab=shipping",
    icon: PackageOpen,
    group: "operations",
    ariaLabel: "Order fulfillment, packing, and shipping workflow",
    sidebarVisible: false,
  },
  {
    name: "Sales Catalogues",
    path: "/sales?tab=sales-sheets",
    icon: Layers,
    group: "sales",
    ariaLabel: "Create and share sales catalogues with clients",
    sidebarVisible: false,
  },
  {
    name: "Live Shopping",
    path: "/sales?tab=live-shopping",
    icon: Video,
    group: "sales",
    ariaLabel: "Live shopping sessions with clients",
    sidebarVisible: false,
    // NOTE: Feature flag intentionally omitted to ensure BUG-073 fix remains active
  },
  // NAV-006: Leaderboard absorbed — hidden from sidebar
  {
    name: "Leaderboard",
    path: "/leaderboard",
    icon: Trophy,
    group: "sales",
    ariaLabel: "Sales performance leaderboard",
    sidebarVisible: false,
  },

  // ─── Buy group (1 sidebar item) ────────────────────────────────────────────
  {
    name: "Purchase Orders",
    path: "/purchase-orders",
    icon: Truck,
    ariaLabel: "Purchase order queue",
    group: "buy",
    sidebarVisible: true,
  },

  // ─── Operations group (1 sidebar item) ────────────────────────────────────
  {
    name: "Inventory",
    path: "/inventory",
    icon: PackageCheck,
    group: "operations",
    ariaLabel: INVENTORY_WORKSPACE.description,
    sidebarVisible: true,
  },
  {
    name: "Intake",
    path: "/direct-intake",
    icon: Download,
    group: "operations",
    ariaLabel: "Legacy intake alias that now routes into the receiving queue",
    sidebarVisible: false,
  },

  // Absorbed into Inventory workspace tabs — hidden from sidebar, visible in Command Palette
  // NAV-003: Photography absorbed as Inventory tab
  {
    name: "Photography",
    path: "/inventory?tab=photography",
    icon: Camera,
    group: "operations",
    ariaLabel: "Product photography queue and workflow management",
    sidebarVisible: false,
  },
  {
    name: "Samples",
    path: "/inventory?tab=samples",
    icon: Beaker,
    group: "operations",
    sidebarVisible: false,
  },
  // TERP-0005: Receiving absorbed into Operations workspace
  {
    name: "Receiving",
    path: "/inventory?tab=receiving",
    icon: Download,
    group: "operations",
    ariaLabel: "Review purchase orders waiting to be received",
    sidebarVisible: false,
  },

  // ─── Relationships group (1 sidebar item) ─────────────────────────────────
  {
    name: RELATIONSHIPS_WORKSPACE.title,
    path: "/relationships",
    icon: Users,
    group: "relationships",
    ariaLabel: RELATIONSHIPS_WORKSPACE.description,
    sidebarVisible: true,
  },

  // ─── Finance group (3 sidebar items) ───────────────────────────────────────
  {
    name: "Accounting",
    path: "/accounting",
    icon: CreditCard,
    group: "finance",
    ariaLabel: "Accounts receivable and payable management",
    sidebarVisible: true,
  },
  {
    name: CREDITS_WORKSPACE.title,
    path: "/credits",
    icon: Coins,
    group: "finance",
    ariaLabel: CREDITS_WORKSPACE.description,
    sidebarVisible: true,
  },
  {
    name: "Analytics",
    path: "/analytics",
    icon: BarChart3,
    group: "finance",
    sidebarVisible: true,
  },

  // Absorbed into Finance workspaces — hidden from sidebar, visible in Command Palette
  // TERP-0005: Invoices absorbed into Accounting workspace
  {
    name: "Invoices",
    path: "/accounting/invoices",
    icon: FileText,
    group: "finance",
    ariaLabel: "Manage invoices and billing",
    sidebarVisible: false,
  },
  // TER-99: Client Ledger absorbed into Accounting workspace (Ledger tab)
  {
    name: "Client Ledger",
    path: "/client-ledger",
    icon: BookOpen,
    group: "finance",
    ariaLabel: "View client transaction history and balance",
    sidebarVisible: false,
  },
  // NAV-012: Pricing Rules absorbed into Settings workspace
  // QA-003 FIX: Changed path from /pricing-rules to /pricing/rules to match App.tsx route
  {
    name: "Pricing Rules",
    path: "/pricing/rules",
    icon: Tag,
    group: "finance",
    ariaLabel: "Configure pricing rules and strategies",
    sidebarVisible: false,
  },
  {
    name: "COGS Settings",
    path: "/settings/cogs",
    icon: Coins,
    group: "finance",
    ariaLabel: "Configure cost of goods sold settings",
    sidebarVisible: false,
  },

  // ─── Admin group (3 sidebar items) ─────────────────────────────────────────
  // TER-595: Calendar absorbs Scheduling and Time Clock as tabs
  {
    name: "Calendar",
    path: "/calendar",
    icon: Calendar,
    group: "admin",
    sidebarVisible: true,
  },
  // UX-010: Settings absorbs Users, Locations, Pricing Rules, Feature Flags, COGS
  {
    name: "Settings",
    path: "/settings",
    icon: Settings,
    group: "admin",
    sidebarVisible: true,
  },
  // TER-569: Notifications Hub absorbs Todo Lists as tabs
  {
    name: "Notifications",
    path: "/notifications",
    icon: Bell,
    group: "admin",
    ariaLabel: "Review notifications, inbox items, alerts, and task lists",
    sidebarVisible: true,
  },

  // Absorbed into Admin workspace tabs — hidden from sidebar, visible in Command Palette
  // QA-W2-008: Users absorbed into Settings workspace
  {
    name: "Users",
    path: "/settings?tab=users",
    icon: UserCog,
    group: "admin",
    sidebarVisible: false,
  },
  // TERP-0005: Locations absorbed into Settings workspace
  {
    name: "Locations",
    path: "/settings?tab=locations",
    icon: MapPin,
    group: "admin",
    ariaLabel: "Manage warehouse and storage locations",
    sidebarVisible: false,
  },
  // Sprint 4 Track D: Scheduling absorbed into Calendar workspace
  {
    name: "Scheduling",
    path: "/scheduling",
    icon: CalendarClock,
    group: "admin",
    sidebarVisible: false,
  },
  // MEET-048: Time Clock absorbed into Calendar workspace
  {
    name: "Time Clock",
    path: "/time-clock",
    icon: Clock,
    group: "admin",
    ariaLabel: "Clock in/out and manage timesheets",
    sidebarVisible: false,
  },
  // FEAT-017: Feature Flags absorbed into Settings workspace
  {
    name: "Feature Flags",
    path: "/settings?tab=feature-flags",
    icon: Flag,
    group: "admin",
    ariaLabel: "Manage feature flags and rollouts",
    sidebarVisible: false,
  },
  // NAV-013: Workflow Queue absorbed — hidden from sidebar
  {
    name: "Workflow Queue",
    path: "/workflow-queue",
    icon: Workflow,
    group: "admin",
    ariaLabel: "Manage workflow statuses and queues",
    sidebarVisible: false,
  },
  // NAV-005: Todo Lists absorbed into Notifications workspace
  {
    name: "Todo Lists",
    path: "/todos",
    icon: CheckSquare,
    group: "admin",
    ariaLabel: "Personal task management and todo lists",
    sidebarVisible: false,
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
    name: "New Sales Order",
    path: "/sales?tab=create-order",
    icon: Plus,
    ariaLabel: "Create a new sales order",
  },
  {
    name: "Record Receiving",
    path: "/inventory?tab=receiving",
    icon: Download,
    ariaLabel: "Record product receiving",
  },
  {
    name: "Clients",
    path: "/relationships?tab=clients",
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
  "/sales?tab=create-order",
  "/inventory?tab=receiving",
  "/relationships?tab=clients",
];

export function buildQuickLinks(options?: {
  pinnedPaths?: string[];
  maxLinks?: number;
  candidates?: readonly QuickLinkItem[];
}): QuickLinkItem[] {
  const pinnedPaths = options?.pinnedPaths ?? [];
  const maxLinks = options?.maxLinks ?? 4;
  const candidates = options?.candidates ?? quickLinkCandidates;
  const candidateMap = new Map(
    candidates.map(link => [link.path, link] as const)
  );

  const preferredPaths =
    pinnedPaths.length > 0 ? pinnedPaths : [...defaultQuickLinkPaths];
  const fallbackPaths = [
    ...defaultQuickLinkPaths,
    ...candidates.map(link => link.path),
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

    // TER-597: Filter out items with sidebarVisible: false for the sidebar.
    // Items with sidebarVisible: false are still included in commandNavigationItems
    // (via buildNavigationAccessModel) for Command Palette continuity.
    const sidebarItems = itemsInGroup.filter(
      item => item.sidebarVisible !== false
    );

    const items = sidebarItems.filter(item => {
      if (!item.featureFlag) {
        return true;
      }

      if (flagsLoading) {
        return false;
      }

      return flags[item.featureFlag] ?? false;
    });

    const loadingFeatureItems = flagsLoading
      ? sidebarItems.filter(item => Boolean(item.featureFlag))
      : [];

    return {
      key: group.key,
      label: group.label,
      items,
      loadingFeatureItems,
    };
  });
}

const QUICKLINK_ALWAYS_ALLOWED_PATHS = [
  "/",
  "/sales?tab=create-order",
  "/clients",
];

export function buildNavigationAccessModel(options?: {
  flags?: Record<string, boolean>;
  flagsLoading?: boolean;
  pinnedPaths?: string[];
  maxQuickLinks?: number;
}): NavigationAccessModel {
  const groups = buildNavigationGroups({
    flags: options?.flags,
    flagsLoading: options?.flagsLoading,
  });

  // TER-597: commandNavigationItems includes absorbed navigation items
  // (including sidebarVisible: false ones) so the Command Palette can
  // navigate to the current canonical surfaces without surfacing legacy aliases.
  const allAccessibleItems = navigationItems.filter(item => {
    if (!item.featureFlag) return true;
    if (options?.flagsLoading) return false;
    return (options?.flags ?? {})[item.featureFlag] ?? false;
  });

  const commandNavigationItems = allAccessibleItems.filter(
    item => item.path !== "/direct-intake"
  );

  const accessiblePaths = new Set(
    commandNavigationItems
      .map(item => item.path)
      .concat(QUICKLINK_ALWAYS_ALLOWED_PATHS)
  );
  const filteredQuickLinkCandidates = quickLinkCandidates.filter(link =>
    accessiblePaths.has(link.path)
  );

  return {
    groups,
    commandNavigationItems,
    quickLinks: buildQuickLinks({
      pinnedPaths: options?.pinnedPaths,
      maxLinks: options?.maxQuickLinks ?? 4,
      candidates: filteredQuickLinkCandidates,
    }),
    quickLinkCandidates: filteredQuickLinkCandidates,
  };
}
