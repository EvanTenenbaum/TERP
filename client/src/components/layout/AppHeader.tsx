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
  Command,
} from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLocation } from "wouter";
import { useState } from "react";
import { AppBreadcrumb } from "./AppBreadcrumb";
import { NotificationBell } from "../notifications/NotificationBell";
import { trpc } from "@/lib/trpc";
import versionInfo from "../../../version.json";

interface AppHeaderProps {
  onMenuClick?: () => void;
}

export function AppHeader({ onMenuClick }: AppHeaderProps) {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const { theme, toggleTheme, switchable } = useTheme();

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
    <header className="border-b border-border/80 bg-background/95 backdrop-blur-sm">
      {/* Main header row */}
      <div className="flex items-center justify-between h-14 px-3 md:px-4">
        {/* Mobile menu button */}
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden mr-2"
          onClick={onMenuClick}
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </Button>

        {/* Spacer for layout balance */}
        <div className="hidden md:block w-4" />

        {/* Search bar */}
        <form
          onSubmit={handleSearch}
          className="flex items-center flex-1 max-w-3xl"
        >
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search across TERP..."
              className="pl-10 w-full h-9 bg-background"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyDown}
            />
          </div>
        </form>

        {/* Action buttons */}
        <div className="flex items-center gap-1 md:gap-2 ml-2">
          <Button
            variant="ghost"
            className="hidden lg:flex h-8 rounded-full border border-border/70 bg-background px-2.5 text-[11px] font-medium text-muted-foreground"
            title="Open command palette"
            onClick={() => window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }))}
          >
            <Command className="h-3.5 w-3.5 mr-1.5" />
            K
          </Button>

          <NotificationBell className="hidden sm:flex relative" />

          {/* Theme Toggle */}
          {switchable && toggleTheme && (
            <Button
              variant="ghost"
              size="icon"
              className="hidden sm:flex"
              onClick={toggleTheme}
              title={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
            >
              {theme === "light" ? (
                <Moon className="h-5 w-5" />
              ) : (
                <Sun className="h-5 w-5" />
              )}
            </Button>
          )}
          {/* UX-010: Updated tooltip to match renamed navigation item */}
          <Button
            variant="ghost"
            size="icon"
            className="hidden sm:flex"
            onClick={() => setLocation("/settings")}
            title="System Settings"
          >
            <Settings className="h-5 w-5" />
          </Button>

          {/* User Menu Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2 px-2">
                <User className="h-5 w-5" />
                <span className="hidden md:inline max-w-[120px] truncate">
                  {user?.name || user?.email || "Account"}
                </span>
                <ChevronDown className="h-4 w-4 hidden md:inline" />
              </Button>
            </DropdownMenuTrigger>
            {/* UX-010: Clarified menu items - "My Account" for personal settings, "System Settings" for admin */}
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => setLocation("/account")}>
                <User className="h-4 w-4 mr-2" />
                My Account
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setLocation("/settings/notifications")}
              >
                <Bell className="h-4 w-4 mr-2" />
                Notifications
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setLocation("/settings")}
                className="sm:hidden"
              >
                <Settings className="h-4 w-4 mr-2" />
                System Settings
              </DropdownMenuItem>
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

      {/* Breadcrumb row with version - CHAOS-027 */}
      <div className="flex items-center justify-between px-3 md:px-4 py-1.5 border-t border-border/40">
        <AppBreadcrumb />
        <span
          className="text-[11px] text-muted-foreground hidden sm:inline-block"
          title={`Build: ${versionInfo.commit} (${versionInfo.date})`}
        >
          v{versionInfo.version}
        </span>
      </div>
    </header>
  );
}
