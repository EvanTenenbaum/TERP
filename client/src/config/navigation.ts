import {
  LayoutDashboard,
  ShoppingCart,
  FileText,
  Package,
  PackageCheck,
  Beaker,
  Truck,
  Users,
  Settings,
  Calendar,
  CreditCard,
  BarChart3,
  Table,
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
  {
    name: "Invoices",
    path: "/accounting/invoices",
    icon: FileText,
    group: "sales",
  },

  { name: "Products", path: "/products", icon: Package, group: "inventory" },
  {
    name: "Batches",
    path: "/inventory",
    icon: PackageCheck,
    group: "inventory",
  },
  { name: "Samples", path: "/samples", icon: Beaker, group: "inventory" },
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

  { name: "AR/AP", path: "/accounting", icon: CreditCard, group: "finance" },
  {
    name: "Credits",
    path: "/credit-settings",
    icon: CreditCard,
    group: "finance",
  },
  { name: "Reports", path: "/analytics", icon: BarChart3, group: "finance" },

  { name: "Users", path: "/users", icon: Users, group: "admin" },
  { name: "Settings", path: "/settings", icon: Settings, group: "admin" },
  { name: "Calendar", path: "/calendar", icon: Calendar, group: "admin" },
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
