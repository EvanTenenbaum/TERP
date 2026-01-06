import React from "react";
import {
  Search,
  Settings,
  User,
  Menu,
  Sun,
  Moon,
} from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLocation } from "wouter";
import { useState } from "react";
import { AppBreadcrumb } from "./AppBreadcrumb";
import { NotificationBell } from "../notifications/NotificationBell";
import versionInfo from "../../../version.json";

interface AppHeaderProps {
  onMenuClick?: () => void;
}

export function AppHeader({ onMenuClick }: AppHeaderProps) {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const { theme, toggleTheme, switchable } = useTheme();

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
    <header className="border-b border-border bg-background">
      {/* Main header row */}
      <div className="flex items-center justify-between h-16 px-4 md:px-6">
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
          className="flex items-center flex-1 max-w-2xl"
        >
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search quotes, customers, products..."
              className="pl-10 w-full"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyDown}
            />
          </div>
        </form>

        {/* Action buttons */}
        <div className="flex items-center gap-1 md:gap-2 ml-2">
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
          <Button
            variant="ghost"
            size="icon"
            className="hidden sm:flex"
            onClick={() => setLocation("/settings")}
            title="Settings"
          >
            <Settings className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation("/settings")}
            title="User Profile"
          >
            <User className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Breadcrumb row with version - CHAOS-027 */}
      <div className="flex items-center justify-between px-4 md:px-6 py-2">
        <AppBreadcrumb />
        <span
          className="text-xs text-muted-foreground hidden sm:inline-block"
          title={`Build: ${versionInfo.commit} (${versionInfo.date})`}
        >
          v{versionInfo.version}
        </span>
      </div>
    </header>
  );
}
