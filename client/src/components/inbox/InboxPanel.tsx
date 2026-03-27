import { useState } from "react";
import { Inbox, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";
import { InboxItem } from "./InboxItem";

// LINT-005: Define type for tab values
type InboxTabValue = "all" | "unread" | "archived";

const TABS: { value: InboxTabValue; label: string }[] = [
  { value: "all", label: "All" },
  { value: "unread", label: "Unread" },
  { value: "archived", label: "Archived" },
];

export function InboxPanel() {
  const [selectedTab, setSelectedTab] = useState<InboxTabValue>("all");

  const utils = trpc.useContext();

  // Fetch inbox items - PERF-003: Handle paginated response
  const { data: allItemsData, isLoading } = trpc.inbox.getMyItems.useQuery({
    includeArchived: selectedTab === "archived",
  });

  // Extract items from paginated response
  const allItems = allItemsData?.items ?? [];

  // Handle paginated response from inbox.getUnread
  const { data: unreadItemsData } = trpc.inbox.getUnread.useQuery();
  const unreadItems = Array.isArray(unreadItemsData)
    ? unreadItemsData
    : (unreadItemsData?.items ?? []);

  const { data: stats } = trpc.inbox.getStats.useQuery();

  // Bulk mark as seen / read
  const bulkMarkAsSeen = trpc.inbox.bulkMarkAsSeen.useMutation({
    onSuccess: () => {
      utils.inbox.getMyItems.invalidate();
      utils.inbox.getUnread.invalidate();
      utils.inbox.getStats.invalidate();
    },
  });

  // BUG-099: always expose the button, disabled when nothing to mark
  const handleMarkAllRead = () => {
    const unreadIds = unreadItems.map(item => item.id);
    if (unreadIds.length > 0) {
      bulkMarkAsSeen.mutate({ itemIds: unreadIds });
    }
  };

  const displayItems =
    selectedTab === "unread"
      ? unreadItems
      : selectedTab === "archived"
        ? allItems.filter(item => item.isArchived)
        : allItems.filter(item => !item.isArchived);

  const tabBadge = (tab: InboxTabValue) => {
    if (!stats) return null;
    if (tab === "all" && stats.total > 0)
      return (
        <Badge variant="secondary" className="ml-1.5">
          {stats.total}
        </Badge>
      );
    if (tab === "unread" && stats.unread > 0)
      return (
        <Badge variant="destructive" className="ml-1.5">
          {stats.unread}
        </Badge>
      );
    if (tab === "archived" && stats.archived > 0)
      return (
        <Badge variant="secondary" className="ml-1.5">
          {stats.archived}
        </Badge>
      );
    return null;
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Inbox className="h-5 w-5" />
            <h2 className="text-lg font-semibold">Inbox</h2>
            {stats && stats.unread > 0 && (
              <Badge variant="destructive">{stats.unread}</Badge>
            )}
          </div>

          {/* BUG-099: Mark All Read button — always visible, disabled when nothing to mark */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleMarkAllRead}
            disabled={bulkMarkAsSeen.isPending || unreadItems.length === 0}
          >
            <CheckCheck className="h-4 w-4 mr-2" />
            Mark All Read
          </Button>
        </div>

        {/*
         * BUG-098: Replace Radix Tabs with explicit button-based filter strip.
         * When InboxPanel is rendered inside a TabsContent of an outer Radix
         * Tabs component (NotificationsHub), the nested Radix Tabs Root can
         * conflict with the outer context, causing TabsTrigger click events to
         * be silently swallowed.  Plain buttons with explicit onClick handlers
         * are not subject to this nesting issue.
         */}
        <div
          role="tablist"
          aria-label="Filter notifications"
          className="inline-flex h-9 w-full items-center justify-center rounded-lg bg-muted p-[3px] text-muted-foreground"
        >
          {TABS.map(tab => (
            <button
              key={tab.value}
              role="tab"
              type="button"
              aria-selected={selectedTab === tab.value}
              onClick={() => setSelectedTab(tab.value)}
              className={cn(
                "inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center gap-1 rounded-md border px-2 py-1 text-sm font-medium whitespace-nowrap transition-colors",
                selectedTab === tab.value
                  ? "border-input bg-background text-foreground shadow-sm"
                  : "border-transparent hover:bg-background/60 hover:text-foreground"
              )}
            >
              {tab.label}
              {tabBadge(tab.value)}
            </button>
          ))}
        </div>
      </div>

      {/* Items List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="text-center text-muted-foreground py-8">
            Loading inbox...
          </div>
        ) : displayItems.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            <Inbox className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No items in your inbox</p>
          </div>
        ) : (
          <div className="divide-y">
            {displayItems.map(item => (
              <InboxItem key={item.id} item={item} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
