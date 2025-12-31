/**
 * Unified Navigation Configuration
 * BUG-017: Single source of truth for sidebar navigation items
 *
 * Navigation organized by workflow:
 * - Core: Dashboard, Tasks, Calendar
 * - Sales: Client engagement and order creation tools
 * - Fulfillment: Order processing and inventory
 * - Finance: Accounting and settings
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
  PackageCheck,
  RefreshCw,
  Warehouse,
  Trophy,
  Video,
  Truck,
  Kanban,
  Camera,
  PackageSearch,
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
  group?: "core" | "sales" | "fulfillment" | "finance" | "settings";
}

/**
 * Main navigation items for the application sidebar.
 * Order matters - items appear in this order in the sidebar.
 * 
 * SALES FLOW:
 * 1. Clients - Who you're selling to
 * 2. Live Shopping - Real-time sales sessions
 * 3. Sales Sheets - Product catalogs to share
 * 4. Matchmaking - Match inventory to client needs
 * 5. Quotes - Price proposals
 * 6. Orders - Confirmed sales
 */
export const navigationItems: NavigationItem[] = [
  // ═══════════════════════════════════════════════════════════════
  // CORE - Daily workspace
  // ═══════════════════════════════════════════════════════════════
  { name: "Dashboard", path: "/", icon: LayoutDashboard, group: "core" },
  { name: "Tasks", path: "/todos", icon: ListTodo, group: "core" },
  { name: "Calendar", path: "/calendar", icon: Calendar, group: "core" },

  // ═══════════════════════════════════════════════════════════════
  // SALES - All tools for selling (grouped together)
  // ═══════════════════════════════════════════════════════════════
  { name: "Sales Portal", path: "/sales-portal", icon: Kanban, group: "sales" },
  { name: "Clients", path: "/clients", icon: Users, group: "sales" },
  { name: "Live Shopping", path: "/live-shopping", icon: Video, group: "sales" },
  { name: "Sales Sheets", path: "/sales-sheets", icon: Layers, group: "sales" },
  { name: "Matchmaking", path: "/matchmaking", icon: Target, group: "sales" },
  { name: "Quotes", path: "/quotes", icon: FileText, group: "sales" },
  { name: "Orders", path: "/orders", icon: ShoppingCart, group: "sales" },

  // ═══════════════════════════════════════════════════════════════
  // FULFILLMENT - Order processing and inventory
  // ═══════════════════════════════════════════════════════════════
  { name: "Fulfillment", path: "/workflow-queue", icon: PackageCheck, group: "fulfillment" },
  { name: "Pick & Pack", path: "/pick-pack", icon: PackageSearch, group: "fulfillment" },
  { name: "Photography", path: "/photography", icon: Camera, group: "fulfillment" },
  { name: "Inventory", path: "/inventory", icon: Package, group: "fulfillment" },
  { name: "Procurement", path: "/purchase-orders", icon: Truck, group: "fulfillment" },
  { name: "Returns", path: "/returns", icon: RefreshCw, group: "fulfillment" },
  { name: "Locations", path: "/locations", icon: Warehouse, group: "fulfillment" },

  // ═══════════════════════════════════════════════════════════════
  // FINANCE - Money and accounting
  // ═══════════════════════════════════════════════════════════════
  { name: "Accounting", path: "/accounting", icon: DollarSign, group: "finance" },
  { name: "Pricing Rules", path: "/pricing/rules", icon: Tag, group: "finance" },
  { name: "Pricing Profiles", path: "/pricing/profiles", icon: TrendingUp, group: "finance" },
  { name: "Credit Settings", path: "/credit-settings", icon: TrendingUp, group: "finance" },

  // ═══════════════════════════════════════════════════════════════
  // SETTINGS - Analytics and configuration
  // ═══════════════════════════════════════════════════════════════
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
