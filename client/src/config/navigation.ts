/**
 * Unified Navigation Configuration
 * BUG-017: Single source of truth for sidebar navigation items
 *
 * Both AppSidebar and DashboardLayout use this configuration
 * to ensure consistent navigation across the application.
 */

import {
  LayoutDashboard,
  FileText,
  ShoppingCart,
  Package,
  Users,
  Settings,
  BarChart3,
  DollarSign,
  HelpCircle,
  TrendingUp,
  Tag,
  Layers,
  Target,
  ListTodo,
  Calendar,
  Workflow,
  RefreshCw,
  Warehouse,
  Trophy,
  Video,
  type LucideIcon,
} from "lucide-react";

export interface NavigationItem {
  /** Display name shown in the sidebar */
  name: string;
  /** Route path */
  path: string;
  /** Lucide icon component */
  icon: LucideIcon;
  /** Optional: Group this item belongs to */
  group?: "core" | "operations" | "finance" | "settings";
}

/**
 * Main navigation items for the application sidebar.
 * Order matters - items appear in this order in the sidebar.
 */
export const navigationItems: NavigationItem[] = [
  // Core
  { name: "Dashboard", path: "/", icon: LayoutDashboard, group: "core" },
  { name: "Todo Lists", path: "/todos", icon: ListTodo, group: "core" },
  { name: "Calendar", path: "/calendar", icon: Calendar, group: "core" },

  // Sales & Orders
  {
    name: "Live Shopping",
    path: "/live-shopping",
    icon: Video,
    group: "operations",
  },
  { name: "Orders", path: "/orders", icon: ShoppingCart, group: "operations" },
  { name: "Quotes", path: "/quotes", icon: FileText, group: "operations" },
  {
    name: "Sales Sheets",
    path: "/sales-sheets",
    icon: Layers,
    group: "operations",
  },
  {
    name: "Create Order",
    path: "/orders/create",
    icon: FileText,
    group: "operations",
  },

  // Inventory & Operations
  { name: "Inventory", path: "/inventory", icon: Package, group: "operations" },
  {
    name: "Workflow Queue",
    path: "/workflow-queue",
    icon: Workflow,
    group: "operations",
  },
  {
    name: "Matchmaking",
    path: "/matchmaking",
    icon: Target,
    group: "operations",
  },
  {
    name: "Purchase Orders",
    path: "/purchase-orders",
    icon: FileText,
    group: "operations",
  },
  { name: "Returns", path: "/returns", icon: RefreshCw, group: "operations" },
  {
    name: "Locations",
    path: "/locations",
    icon: Warehouse,
    group: "operations",
  },

  // Finance & Accounting
  {
    name: "Accounting",
    path: "/accounting",
    icon: DollarSign,
    group: "finance",
  },
  { name: "Clients", path: "/clients", icon: Users, group: "finance" },
  {
    name: "Pricing Rules",
    path: "/pricing/rules",
    icon: Tag,
    group: "finance",
  },
  {
    name: "Pricing Profiles",
    path: "/pricing/profiles",
    icon: TrendingUp,
    group: "finance",
  },
  {
    name: "Credit Settings",
    path: "/credit-settings",
    icon: TrendingUp,
    group: "finance",
  },
  {
    name: "COGS Settings",
    path: "/settings/cogs",
    icon: DollarSign,
    group: "finance",
  },

  // Analytics & Settings
  { name: "Analytics", path: "/analytics", icon: BarChart3, group: "settings" },
  { name: "Leaderboard", path: "/leaderboard", icon: Trophy, group: "settings" },
  { name: "Settings", path: "/settings", icon: Settings, group: "settings" },
  { name: "Help", path: "/help", icon: HelpCircle, group: "settings" },
];

/**
 * Get navigation items, optionally filtered by group
 */
export function getNavigationItems(
  group?: NavigationItem["group"]
): NavigationItem[] {
  if (!group) return navigationItems;
  return navigationItems.filter(item => item.group === group);
}
