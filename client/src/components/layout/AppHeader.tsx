import React from "react";
import {
  Search,
  Settings,
  User,
  Menu,
  Sun,
  Moon,
  Bell,
  LogOut,
  ChevronDown,
} from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLocation } from "wouter";
import { useState } from "react";
import { AppBreadcrumb } from "./AppBreadcrumb";
import { NotificationBell } from "../notifications/NotificationBell";
import { trpc } from "@/lib/trpc";
import { useUiDensity } from "@/hooks/useUiDensity";
import versionInfo from "../../../version.json";

interface AppHeaderProps {
  onMenuClick?: () => void;
}

export function AppHeader({ onMenuClick }: AppHeaderProps) {
  const [location, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const { theme, toggleTheme, switchable } = useTheme();
  const { isCompact, toggleDensity } = useUiDensity();
  const isApplePlatform =
    typeof navigator !== "undefined" &&
    /mac|iphone|ipad|ipod/i.test(navigator.platform || navigator.userAgent);
  const commandShortcut = isApplePlatform ? "⌘K" : "Ctrl K";

  // Get current user
  const { data: user } = trpc.auth.me.useQuery();
  const logout = trpc.auth.logout.useMutation({
    onSuccess: () => {
      setLocation("/login");
    },
  });

  const handleLogout = () => {
    logout.mutate();
  };

  const openCommandPalette = () => {
    if (typeof window === "undefined") {
      return;
    }

    window.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "k",
        metaKey: isApplePlatform,
        ctrlKey: !isApplePlatform,
        bubbles: true,
      })
    );
  };

  // Handle search submission
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      // Navigate to a search results page with the query
      setLocation(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  // Handle Enter key press
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSearch(e);
    }
  };

  return (
    <header className="border-b border-border/70 bg-background/90 shadow-[0_1px_0_rgba(0,0,0,0.03)] backdrop-blur-md">
      <div className="mx-auto flex min-h-[56px] w-full max-w-[1800px] items-center gap-2 px-3 py-2 md:px-4">
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10 shrink-0 md:hidden"
          onClick={onMenuClick}
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </Button>

        {location !== "/" ? (
          <div className="hidden xl:block max-w-[18rem] shrink-0 overflow-hidden">
            <AppBreadcrumb className="max-w-full overflow-hidden" />
          </div>
        ) : (
          <div className="hidden xl:block w-3 shrink-0" aria-hidden />
        )}

        <form
          onSubmit={handleSearch}
          className="flex min-w-0 flex-1 items-center xl:max-w-4xl"
        >
          <div className="relative flex w-full items-center rounded-2xl border border-border/70 bg-card/90 shadow-sm">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search, jump, or run a command..."
              className="h-10 w-full rounded-2xl border-0 bg-transparent pl-10 pr-[5.5rem] text-sm shadow-none focus-visible:ring-1 focus-visible:ring-ring"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            <button
              type="button"
              className="absolute right-1.5 inline-flex h-7 items-center rounded-full border border-border/80 bg-background px-2.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground transition-colors hover:border-border hover:text-foreground"
              onClick={openCommandPalette}
              title={`Open command palette (${commandShortcut})`}
              aria-label={`Open command palette (${commandShortcut})`}
            >
              {commandShortcut}
            </button>
          </div>
        </form>

        <div className="ml-auto flex shrink-0 items-center gap-1 rounded-full border border-border/70 bg-card/90 p-1 shadow-sm">
          <NotificationBell className="relative hidden sm:flex" />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="flex h-9 items-center gap-2 rounded-full border-0 bg-transparent px-2.5 shadow-none"
              >
                <User className="h-4 w-4 shrink-0" />
                <span className="hidden max-w-[132px] truncate text-sm font-medium md:inline">
                  {user?.name || user?.email || "Account"}
                </span>
                <ChevronDown className="hidden h-4 w-4 text-muted-foreground md:inline" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60">
              <DropdownMenuLabel>
                <div className="flex flex-col gap-0.5">
                  <span className="font-medium text-foreground">
                    {user?.name || "Account"}
                  </span>
                  <span className="text-xs font-normal text-muted-foreground">
                    {user?.email || "Signed in to TERP"}
                  </span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setLocation("/account")}>
                <User className="h-4 w-4 mr-2" />
                My Account
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setLocation("/notifications")}>
                <Bell className="h-4 w-4 mr-2" />
                Notifications
              </DropdownMenuItem>
              <DropdownMenuItem onClick={openCommandPalette}>
                <Search className="h-4 w-4 mr-2" />
                Command Palette
                <DropdownMenuShortcut>{commandShortcut}</DropdownMenuShortcut>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setLocation("/settings")}>
                <Settings className="h-4 w-4 mr-2" />
                System Settings
              </DropdownMenuItem>
              {switchable && toggleTheme ? (
                <DropdownMenuItem onClick={toggleTheme}>
                  {theme === "light" ? (
                    <Moon className="h-4 w-4 mr-2" />
                  ) : (
                    <Sun className="h-4 w-4 mr-2" />
                  )}
                  {theme === "light"
                    ? "Switch to dark mode"
                    : "Switch to light mode"}
                </DropdownMenuItem>
              ) : null}
              <DropdownMenuItem onClick={toggleDensity}>
                {isCompact
                  ? "Switch to comfortable spacing"
                  : "Switch to compact spacing"}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <div className="px-2 py-1.5 text-[11px] text-muted-foreground">
                v{versionInfo.version} · {versionInfo.commit}
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleLogout}
                className="text-destructive"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
