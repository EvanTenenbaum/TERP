import React from "react";
import {
  Inbox,
  Search,
  Settings,
  User,
  Menu,
  CheckCheck,
  Sun,
  Moon,
} from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { AppBreadcrumb } from "./AppBreadcrumb";

interface AppHeaderProps {
  onMenuClick?: () => void;
}

export function AppHeader({ onMenuClick }: AppHeaderProps) {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const { theme, toggleTheme, switchable } = useTheme();

  // Fetch inbox stats for unread count
  const { data: inboxStats } = trpc.inbox.getStats.useQuery();

  // Fetch recent inbox items for dropdown preview - handle paginated response
  const { data: recentItemsData } = trpc.inbox.getUnread.useQuery();
  const recentItems = Array.isArray(recentItemsData) ? recentItemsData : (recentItemsData?.items ?? []);

  const utils = trpc.useContext();

  // Bulk mark as seen mutation
  const bulkMarkAsSeen = trpc.inbox.bulkMarkAsSeen.useMutation({
    onSuccess: () => {
      utils.inbox.getMyItems.invalidate();
      utils.inbox.getUnread.invalidate();
      utils.inbox.getStats.invalidate();
    },
  });

  const handleMarkAllAsSeen = () => {
    const unreadIds = recentItems.map((item: any) => item.id);
    if (unreadIds.length > 0) {
      bulkMarkAsSeen.mutate({ itemIds: unreadIds });
    }
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
          {/* Inbox Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="hidden sm:flex relative"
                title="Inbox"
              >
                <Inbox className="h-5 w-5" />
                {inboxStats && inboxStats.unread > 0 && (
                  <Badge
                    variant="destructive"
                    className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
                  >
                    {inboxStats.unread > 9 ? "9+" : inboxStats.unread}
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <DropdownMenuLabel className="flex items-center justify-between">
                <span>Inbox</span>
                {inboxStats && inboxStats.unread > 0 && (
                  <Badge variant="destructive" className="ml-2">
                    {inboxStats.unread}
                  </Badge>
                )}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />

              {recentItems.length === 0 ? (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  <Inbox className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No unread items</p>
                </div>
              ) : (
                <>
                  <div className="max-h-[300px] overflow-y-auto">
                    {recentItems.slice(0, 5).map(item => (
                      <DropdownMenuItem
                        key={item.id}
                        className="flex flex-col items-start gap-1 cursor-pointer"
                        onClick={() => {
                          // Navigate based on source type
                          if (
                            item.sourceType === "task_assignment" ||
                            item.sourceType === "task_update"
                          ) {
                            setLocation(`/todos/${item.sourceId}`);
                          }
                        }}
                      >
                        <div className="flex items-center gap-2 w-full">
                          <div
                            className={`w-2 h-2 rounded-full ${
                              item.sourceType === "mention"
                                ? "bg-blue-500"
                                : item.sourceType === "task_assignment"
                                  ? "bg-purple-500"
                                  : "bg-green-500"
                            }`}
                          />
                          <span className="font-medium text-sm flex-1 truncate">
                            {item.sourceType === "mention"
                              ? "Mentioned you"
                              : item.sourceType === "task_assignment"
                                ? "Task assigned"
                                : "Task updated"}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(item.createdAt), {
                              addSuffix: true,
                            })}
                          </span>
                        </div>
                        {item.description && (
                          <p className="text-xs text-muted-foreground line-clamp-2 pl-4">
                            {item.description}
                          </p>
                        )}
                      </DropdownMenuItem>
                    ))}
                  </div>
                  <DropdownMenuSeparator />
                  <div className="flex gap-2 p-2">
                    {recentItems.length > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={e => {
                          e.preventDefault();
                          handleMarkAllAsSeen();
                        }}
                        disabled={bulkMarkAsSeen.isPending}
                      >
                        <CheckCheck className="h-4 w-4 mr-2" />
                        Mark all read
                      </Button>
                    )}
                    <Button
                      variant="default"
                      size="sm"
                      className="flex-1"
                      onClick={() => setLocation("/inbox")}
                    >
                      View all
                    </Button>
                  </div>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

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

      {/* Breadcrumb row */}
      <div className="px-4 md:px-6 py-2">
        <AppBreadcrumb />
      </div>
    </header>
  );
}
