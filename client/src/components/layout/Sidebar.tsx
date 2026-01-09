import React, { useCallback, useMemo, useState } from "react";
import { flushSync } from "react-dom";
import { Link, useLocation } from "wouter";
import {
  ChevronDown,
  ChevronRight,
  LogOut,
  Menu,
  UserCircle2,
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
          "flex flex-col w-72 bg-card border-r border-border transition-transform duration-200 ease-in-out z-50",
          "md:relative md:translate-x-0",
          "fixed inset-y-0 left-0",
          open ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        <div className="flex items-center justify-between h-16 px-6 border-b border-border">
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
          <button
            onClick={onClose}
            className="md:hidden p-2 hover:bg-accent rounded-md"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-4 space-y-3">
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
                  hasActiveItem && "border-primary/30 bg-primary/5"
                )}
              >
                <button
                  type="button"
                  className="flex w-full items-center justify-between px-2 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground transition-colors"
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
                {/* QA-W2-007: Use auto max-height for proper scrolling with long menus */}
                <div
                  className={cn(
                    "overflow-hidden transition-all duration-200",
                    isOpen ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0"
                  )}
                >
                  <ul className="space-y-1 pb-2">
                    {isOpen &&
                      group.items.map(item => {
                        const isActive = isActivePath(item.path);
                        const Icon = item.icon;
                        return (
                          <li key={item.path}>
                            <Link href={item.path}>
                              <a
                                onClick={onClose}
                                aria-label={item.ariaLabel ?? item.name}
                                className={cn(
                                  "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                                  isActive
                                    ? "bg-primary text-primary-foreground shadow-sm"
                                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                                )}
                                aria-current={isActive ? "page" : undefined}
                              >
                                <Icon className="h-5 w-5" aria-hidden />
                                {item.name}
                              </a>
                            </Link>
                          </li>
                        );
                      })}
                    {featureFlagsLoading &&
                      isOpen &&
                      group.loadingFeatureItems.map(item => (
                        <li
                          key={`${item.path}-skeleton`}
                          className="flex items-center gap-3 px-3 py-2 rounded-md"
                        >
                          <Skeleton className="h-5 w-5 rounded-md" />
                          <Skeleton className="h-4 w-24" />
                        </li>
                      ))}
                  </ul>
                </div>
              </div>
            );
          })}
        </nav>

        <div className="border-t border-border p-4">
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
          <Button
            variant="outline"
            className="w-full mt-3"
            onClick={handleLogout}
            aria-label="Logout"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>
      </aside>
    </>
  );
});
