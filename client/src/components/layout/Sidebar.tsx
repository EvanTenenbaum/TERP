import React, { useCallback, useMemo, useState } from "react";
import { flushSync } from "react-dom";
import { Link, useLocation } from "wouter";
import {
  ChevronDown,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Download,
  LayoutDashboard,
  LogOut,
  Menu,
  Plus,
  UserCircle2,
  Users,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { APP_TITLE } from "@/const";
import {
  buildNavigationGroups,
  type NavigationGroupKey,
} from "@/config/navigation";
import { useFeatureFlags } from "@/hooks/useFeatureFlag";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

export interface SidebarProps {
  open?: boolean;
  onClose?: () => void;
}

/** TER-197: Quick links always visible at top of sidebar */
const quickLinks = [
  { name: "Dashboard", path: "/", icon: LayoutDashboard },
  { name: "New Sale", path: "/orders/create", icon: Plus },
  { name: "New Intake", path: "/direct-intake", icon: Download },
  { name: "Clients", path: "/clients", icon: Users },
] as const;

export const Sidebar = React.memo(function Sidebar({
  open = false,
  onClose,
}: SidebarProps) {
  const [location, setLocation] = useLocation();
  const { flags, isLoading: featureFlagsLoading } = useFeatureFlags();
  const [openGroups, setOpenGroups] = useState<
    Record<NavigationGroupKey, boolean>
  >({
    sales: true,
    inventory: true,
    finance: true,
    admin: true,
  });
  // TER-198: Collapsible sidebar state — persists within session
  const [collapsed, setCollapsed] = useState(false);

  const groupedNavigation = useMemo(
    () =>
      buildNavigationGroups({
        flags,
        flagsLoading: featureFlagsLoading,
      }),
    [featureFlagsLoading, flags]
  );

  const toggleGroup = useCallback((key: NavigationGroupKey) => {
    flushSync(() => {
      setOpenGroups(prev => ({ ...prev, [key]: !prev[key] }));
    });
  }, []);

  const isActivePath = useCallback(
    (path: string) =>
      location === path || (path !== "/" && location.startsWith(`${path}/`)),
    [location]
  );

  const handleLogout = useCallback(() => {
    onClose?.();
    setLocation("/login");
  }, [onClose, setLocation]);

  return (
    <>
      {open && (
        <button
          type="button"
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={onClose}
          aria-label="Close navigation"
        />
      )}
      <aside
        className={cn(
          "flex flex-col bg-background/96 border-r border-border/80 transition-all duration-200 ease-in-out z-50 backdrop-blur-sm",
          "md:relative md:translate-x-0",
          "fixed inset-y-0 left-0",
          collapsed ? "w-16" : "w-[17.25rem]",
          open ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        <div className="flex items-center justify-between h-14 px-3 border-b border-border/80">
          {!collapsed && (
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 text-primary rounded-lg p-2">
                <Menu className="h-5 w-5" aria-hidden />
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">
                  {APP_TITLE}
                </p>
                <p className="font-semibold text-foreground">Navigation</p>
              </div>
            </div>
          )}
          {/* TER-198: Collapse/expand toggle (desktop only) */}
          <button
            onClick={() => setCollapsed(prev => !prev)}
            className="hidden md:flex p-2 hover:bg-accent rounded-md text-muted-foreground"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? (
              <ChevronsRight className="h-5 w-5" />
            ) : (
              <ChevronsLeft className="h-5 w-5" />
            )}
          </button>
          <button
            onClick={onClose}
            className="md:hidden p-2 hover:bg-accent rounded-md max-md:size-11"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* TER-197: Quick Links — always visible */}
        <div className={cn("border-b border-border/70", collapsed ? "px-2 py-2" : "px-3 py-2.5")}>
          {!collapsed && (
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
              Quick Actions
            </p>
          )}
          <div className={cn("flex gap-1", collapsed ? "flex-col items-center" : "flex-wrap")}>
            {quickLinks.map(link => {
              const Icon = link.icon;
              const isActive = isActivePath(link.path);
              return (
                <Link
                  key={link.path}
                  href={link.path}
                  onClick={onClose}
                  title={link.name}
                  className={cn(
                    "flex items-center gap-2 rounded-md text-sm font-medium transition-colors max-md:min-h-11",
                    collapsed ? "p-2 justify-center" : "px-3 py-1.5",
                    isActive
                      ? "bg-primary/90 text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <Icon className="h-4 w-4" aria-hidden />
                  {!collapsed && <span>{link.name}</span>}
                </Link>
              );
            })}
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto p-3 space-y-2.5">
          {groupedNavigation.map(group => {
            const hasActiveItem = group.items.some(item =>
              isActivePath(item.path)
            );
            const isOpen = openGroups[group.key];
            return (
              <div
                key={group.key}
                className={cn(
                  "rounded-lg border border-transparent transition-colors",
                  hasActiveItem && "border-border bg-muted/40"
                )}
              >
                {!collapsed && (
                  <button
                    type="button"
                    className="flex w-full items-center justify-between px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground transition-colors max-md:min-h-11"
                    onClick={() => toggleGroup(group.key)}
                    aria-expanded={isOpen}
                    data-testid="nav-group-label"
                  >
                    <span>{group.label}</span>
                    {isOpen ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </button>
                )}
                {/* QA-W2-007: Use auto max-height for proper scrolling with long menus */}
                <div
                  className={cn(
                    "overflow-hidden transition-all duration-200",
                    collapsed || isOpen
                      ? "max-h-[2000px] opacity-100"
                      : "max-h-0 opacity-0"
                  )}
                >
                  <ul className="space-y-1 pb-2">
                    {(collapsed || isOpen) &&
                      group.items.map(item => {
                        const isActive = isActivePath(item.path);
                        const Icon = item.icon;
                        return (
                          <li key={item.path}>
                            <Link
                              href={item.path}
                              onClick={onClose}
                              aria-label={item.ariaLabel ?? item.name}
                              title={collapsed ? item.name : undefined}
                              className={cn(
                                "flex items-center gap-3 rounded-md text-sm font-medium transition-colors max-md:min-h-11",
                                collapsed
                                  ? "px-2 py-2 justify-center"
                                  : "px-3 py-2",
                                isActive
                                  ? "bg-foreground text-background"
                                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
                              )}
                              aria-current={isActive ? "page" : undefined}
                            >
                              <Icon className="h-5 w-5" aria-hidden />
                              {!collapsed && item.name}
                            </Link>
                          </li>
                        );
                      })}
                    {featureFlagsLoading &&
                      (collapsed || isOpen) &&
                      group.loadingFeatureItems.map(item => (
                        <li
                          key={`${item.path}-skeleton`}
                          className="flex items-center gap-3 px-3 py-2 rounded-md"
                        >
                          <Skeleton className="h-5 w-5 rounded-md" />
                          {!collapsed && <Skeleton className="h-4 w-24" />}
                        </li>
                      ))}
                  </ul>
                </div>
              </div>
            );
          })}
        </nav>

        <div className="border-t border-border/80 p-3">
          {!collapsed && (
            <div className="flex items-center gap-3">
              <Avatar>
                <AvatarImage src="/avatar.png" alt="User avatar" />
                <AvatarFallback>
                  <UserCircle2 className="h-5 w-5" />
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">
                  Signed in
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  TERP Operator
                </p>
              </div>
            </div>
          )}
          <Button
            variant="outline"
            className={cn("mt-3", collapsed ? "w-10 p-0" : "w-full")}
            onClick={handleLogout}
            aria-label="Logout"
          >
            <LogOut className={cn("h-4 w-4", !collapsed && "mr-2")} />
            {!collapsed && "Logout"}
          </Button>
        </div>
      </aside>
    </>
  );
});
