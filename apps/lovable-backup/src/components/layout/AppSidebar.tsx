import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Users,
  Truck,
  DollarSign,
  BarChart3,
  Bell,
  Settings as SettingsIcon,
  Shield,
  FileText,
  Eye,
  FileSpreadsheet,
  ChevronDown,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  SidebarHeader,
  useSidebar,
} from "@/components/ui/sidebar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

const menuItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  {
    title: "Sales",
    icon: ShoppingCart,
    items: [
      { title: "New Order", url: "/sales/orders/new" },
      { title: "Orders", url: "/sales/orders" },
      { title: "Pipeline", url: "/sales/pipeline" },
      { title: "Sales Sheets", url: "/sales/sheets" },
    ],
  },
  { title: "Quotes", icon: FileText, url: "/quotes" },
  { title: "Clients", icon: Users, url: "/clients" },
  {
    title: "Inventory",
    icon: Package,
    items: [
      { title: "Items", url: "/inventory" },
      { title: "Adjustments", url: "/inventory/adjustments" },
      { title: "Cycle Count", url: "/inventory/cycle-count" },
      { title: "Discrepancies", url: "/inventory/discrepancies" },
      { title: "Returns", url: "/inventory/returns" },
    ],
  },
  {
    title: "Vendors",
    icon: Truck,
    items: [
      { title: "Vendor List", url: "/vendors" },
      { title: "Purchase Orders", url: "/vendors/pos" },
      { title: "New PO", url: "/vendors/po/new" },
    ],
  },
  {
    title: "Finance",
    icon: DollarSign,
    items: [
      { title: "Overview", url: "/finance" },
      { title: "AR", url: "/finance/ar" },
      { title: "AP", url: "/finance/ap" },
      { title: "Payments", url: "/finance/payments" },
      { title: "AR Aging", url: "/finance/aging" },
      { title: "AP Aging", url: "/finance/ap-aging" },
    ],
  },
  { title: "Analytics", icon: BarChart3, url: "/analytics" },
  { title: "Alerts", icon: Bell, url: "/alerts" },
  {
    title: "Admin",
    icon: Shield,
    items: [
      { title: "Users", url: "/admin/users" },
      { title: "Roles", url: "/admin/roles" },
      { title: "Pricing", url: "/admin/pricing" },
      { title: "Imports", url: "/admin/imports" },
      { title: "Cron Jobs", url: "/admin/cron" },
    ],
  },
  {
    title: "System",
    icon: SettingsIcon,
    items: [
      { title: "Settings", url: "/system" },
      { title: "Audit Log", url: "/system/audit" },
      { title: "Notifications", url: "/system/notifications" },
      { title: "Branding", url: "/system/branding" },
      { title: "Archiving", url: "/system/archiving" },
      { title: "Data Hygiene", url: "/system/hygiene" },
    ],
  },
  { title: "Reports", url: "/reports", icon: FileSpreadsheet },
  { title: "Visual Mode", url: "/visual", icon: Eye },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const collapsed = state === "collapsed";

  const isActiveRoute = (url: string) => {
    return location.pathname === url || location.pathname.startsWith(url + "/");
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-brand">
            <span className="text-sm font-bold text-white">T</span>
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="text-sm font-semibold">TERP</span>
              <span className="text-xs text-muted-foreground">ERP System</span>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => {
                if (item.items) {
                  const hasActiveChild = item.items.some(subItem => isActiveRoute(subItem.url));

                  return (
                    <Collapsible key={item.title} defaultOpen={hasActiveChild} className="group/collapsible">
                      <SidebarMenuItem>
                        <CollapsibleTrigger asChild>
                          <SidebarMenuButton tooltip={item.title}>
                            {item.icon && <item.icon className="h-4 w-4" />}
                            <span>{item.title}</span>
                            <ChevronDown className="ml-auto h-4 w-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-180" />
                          </SidebarMenuButton>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <SidebarMenuSub>
                            {item.items.map((subItem) => (
                              <SidebarMenuSubItem key={subItem.title}>
                                <SidebarMenuSubButton
                                  asChild
                                  isActive={isActiveRoute(subItem.url)}
                                >
                                  <NavLink to={subItem.url}>
                                    <span>{subItem.title}</span>
                                  </NavLink>
                                </SidebarMenuSubButton>
                              </SidebarMenuSubItem>
                            ))}
                          </SidebarMenuSub>
                        </CollapsibleContent>
                      </SidebarMenuItem>
                    </Collapsible>
                  );
                }

                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      tooltip={item.title}
                      isActive={isActiveRoute(item.url!)}
                    >
                      <NavLink
                        to={item.url!}
                        className={({ isActive }) =>
                          cn(
                            "flex items-center gap-3 rounded-md px-3 py-2 transition-fast",
                            isActive
                              ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                              : "hover:bg-sidebar-accent/50"
                          )
                        }
                      >
                        {item.icon && <item.icon className="h-4 w-4 shrink-0" />}
                        {!collapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
