import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { flushSync } from "react-dom";
import { Link, useLocation, useSearch } from "wouter";
import {
  ChevronDown,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  LogOut,
  UserCircle2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  buildNavigationAccessModel,
  defaultQuickLinkPaths,
  navigationItems,
  type NavigationGroupKey,
} from "@/config/navigation";
import { normalizeOperationsTab } from "@/lib/workspaceRoutes";
import { useFeatureFlags } from "@/hooks/useFeatureFlag";
import { useNavigationState } from "@/hooks/useNavigationState";
import { trpc } from "@/lib/trpc";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

export interface SidebarProps {
  open?: boolean;
  onClose?: () => void;
}

function normalizeNavRoute(path: string) {
  const [rawPath, queryString = ""] = path.split("?");
  const params = new URLSearchParams(queryString);

  let pathname = rawPath;
  if (pathname === "/orders") {
    pathname = "/sales";
  }
  if (pathname === "/pick-pack") {
    pathname = "/operations";
    params.set("tab", "shipping");
  }
  if (
    pathname === "/receiving" ||
    pathname === "/intake" ||
    pathname === "/direct-intake" ||
    pathname === "/product-intake"
  ) {
    pathname = "/operations";
    params.set("tab", "receiving");
  }
  if (pathname === "/inventory") {
    pathname = "/operations";
  }
  if (pathname === "/sales" && params.get("tab") === "pick-pack") {
    pathname = "/operations";
    params.set("tab", "shipping");
  }
  if (pathname === "/purchase-orders" && params.get("tab") === "receiving") {
    pathname = "/operations";
  }
  if (pathname === "/operations") {
    const normalizedTab = normalizeOperationsTab(params.get("tab"));
    if (normalizedTab) {
      params.set("tab", normalizedTab);
    }
  }

  return {
    pathname,
    tab: params.get("tab"),
  };
}

function matchesNavRoute(currentPath: string, targetPath: string) {
  const current = normalizeNavRoute(currentPath);
  const target = normalizeNavRoute(targetPath);
  const samePath =
    current.pathname === target.pathname ||
    (target.pathname !== "/" &&
      current.pathname.startsWith(`${target.pathname}/`));

  if (!samePath) {
    return false;
  }

  if (target.tab) {
    return current.tab === target.tab;
  }

  return true;
}

function getDefaultOpenGroups(currentPath: string) {
  const activeGroup =
    navigationItems.find(item => matchesNavRoute(currentPath, item.path))
      ?.group ?? "sales";

  return {
    sales: activeGroup === "sales",
    buy: activeGroup === "buy",
    operations: activeGroup === "operations",
    relationships: activeGroup === "relationships",
    finance: activeGroup === "finance",
    admin: activeGroup === "admin",
  } satisfies Record<NavigationGroupKey, boolean>;
}

export const Sidebar = React.memo(function Sidebar({
  open = false,
  onClose,
}: SidebarProps) {
  const [location, setLocation] = useLocation();
  const search = useSearch();
  const { flags, isLoading: featureFlagsLoading } = useFeatureFlags();
  const { data: currentUser } = trpc.auth.me.useQuery(undefined, {
    staleTime: 60_000,
  });
  const [openGroups, setOpenGroups] = useState<
    Record<NavigationGroupKey, boolean>
  >(() => getDefaultOpenGroups(`${location}${search || ""}`));
  const [collapsed, setCollapsed] = useState(false);

  // BUG-103: Auto-close the mobile drawer whenever the active route changes so
  // the workspace is immediately visible after any navigation (including
  // programmatic navigation that bypasses the Link onClick handlers).
  useEffect(() => {
    if (open) {
      onClose?.();
    }
    // Only re-run when the *location* changes — not when open/onClose change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location]);

  const navigationScopeKey = useMemo(() => {
    if (currentUser?.id !== undefined && currentUser?.id !== null) {
      return `user:${String(currentUser.id)}`;
    }
    if (currentUser?.email) {
      return `email:${currentUser.email}`;
    }
    return "anonymous";
  }, [currentUser?.email, currentUser?.id]);

  const { pinnedPaths } = useNavigationState({
    scopeKey: navigationScopeKey,
    maxPinnedPaths: 4,
    defaultPinnedPaths: [...defaultQuickLinkPaths],
  });

  const navigationAccessModel = useMemo(
    () =>
      buildNavigationAccessModel({
        flags,
        flagsLoading: featureFlagsLoading,
        pinnedPaths,
        maxQuickLinks: 4,
      }),
    [featureFlagsLoading, flags, pinnedPaths]
  );
  const groupedNavigation = navigationAccessModel.groups;

  const toggleGroup = useCallback((key: NavigationGroupKey) => {
    flushSync(() => {
      setOpenGroups(prev => ({ ...prev, [key]: !prev[key] }));
    });
  }, []);

  const isActivePath = useCallback(
    (path: string) => {
      return matchesNavRoute(`${location}${search || ""}`, path);
    },
    [location, search]
  );

  const handleLogout = useCallback(() => {
    onClose?.();
    setLocation("/login");
  }, [onClose, setLocation]);

  const navRef = useRef<HTMLElement>(null);
  const activeGroupKey = useMemo(
    () =>
      groupedNavigation.find(group =>
        group.items.some(item => isActivePath(item.path))
      )?.key ?? "sales",
    [groupedNavigation, isActivePath]
  );

  // Scroll the active nav item into view whenever the location changes
  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    const activeLink = nav.querySelector<HTMLElement>('[aria-current="page"]');
    if (activeLink) {
      activeLink.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [location, search]);

  useEffect(() => {
    setOpenGroups(prev =>
      prev[activeGroupKey] ? prev : { ...prev, [activeGroupKey]: true }
    );
  }, [activeGroupKey]);

  return (
    <>
      {open && (
        <button
          type="button"
          className="fixed inset-x-0 bottom-0 top-14 bg-black/50 z-40 md:hidden"
          onClick={onClose}
          aria-label="Close navigation"
        />
      )}
      <aside
        className={cn(
          "flex flex-col bg-[oklch(0.22_0.05_155)] border-r border-white/5 transition-all duration-200 ease-in-out z-50",
          "md:relative md:translate-x-0",
          // Keep the mobile header interactive so the same top-left affordance can close the drawer.
          "fixed left-0 top-14 bottom-0 max-w-[calc(100vw-3rem)]",
          collapsed ? "w-16" : "w-[17.25rem]",
          open ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        {/* TER-599: Simplified header — just collapse/expand button */}
        {/* BUG-102: close button must be visible and reachable on all phone widths */}
        <div className="flex items-center justify-between h-12 px-3 border-b border-white/10">
          <button
            onClick={onClose}
            className="md:hidden p-2 hover:bg-white/10 rounded-md max-md:size-11 flex-shrink-0 text-white/70"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
          <button
            onClick={() => setCollapsed(prev => !prev)}
            className="hidden md:flex p-2 hover:bg-white/10 rounded-md text-white/50 hover:text-white/80 ml-auto"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? (
              <ChevronsRight className="h-5 w-5" />
            ) : (
              <ChevronsLeft className="h-5 w-5" />
            )}
          </button>
        </div>

        <nav ref={navRef} className="flex-1 overflow-y-auto p-3 space-y-2.5">
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
                  hasActiveItem && "border-white/10 bg-white/5"
                )}
              >
                {!collapsed && (
                  <button
                    type="button"
                    className={cn(
                      "flex w-full items-center justify-between px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wide transition-colors max-md:min-h-11",
                      hasActiveItem
                        ? "text-white/40 hover:text-white/60"
                        : "text-white/40 hover:text-white/60"
                    )}
                    onClick={() => toggleGroup(group.key)}
                    aria-expanded={isOpen}
                    data-testid="nav-group-label"
                  >
                    <span className="flex items-center gap-1.5">
                      {hasActiveItem && (
                        <span
                          className="inline-block h-1.5 w-1.5 rounded-full bg-[oklch(0.78_0.18_130)] flex-shrink-0"
                          aria-hidden
                        />
                      )}
                      {group.label}
                    </span>
                    {isOpen ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </button>
                )}
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
                                // TER-603: Reduced active state visual weight
                                "flex items-center gap-3 rounded-md text-sm transition-colors max-md:min-h-11",
                                collapsed
                                  ? "px-2 py-2 justify-center"
                                  : "px-3 py-2",
                                isActive
                                  ? cn(
                                      "border-l-[3px] border-[oklch(0.78_0.18_130)] bg-white/10 text-white font-semibold"
                                    )
                                  : "border-l-[3px] border-transparent font-normal text-white/65 hover:bg-white/8 hover:text-white/90"
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

        {/* TER-599: Simplified footer — user info + logout only */}
        <div className="border-t border-white/10 p-3">
          {!collapsed && (
            <div className="flex items-center gap-2 mb-2">
              <Avatar className="h-7 w-7">
                <AvatarFallback className="text-xs bg-white/10 text-white/70">
                  <UserCircle2 className="h-4 w-4" />
                </AvatarFallback>
              </Avatar>
              <p className="text-xs text-white/70 truncate">
                {currentUser?.name || currentUser?.email || "TERP Operator"}
              </p>
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "text-white/50 hover:text-white/80 hover:bg-white/10",
              collapsed ? "w-10 p-0" : "w-full justify-start"
            )}
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
