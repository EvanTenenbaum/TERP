import { useState } from "react";
import { Inbox, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { InboxItem } from "./InboxItem";

// LINT-005: Define type for tab values
type InboxTabValue = "all" | "unread" | "archived";

export function InboxPanel() {
  const [selectedTab, setSelectedTab] = useState<"all" | "unread" | "archived">(
    "all"
  );

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

  // Bulk mark as seen
  const bulkMarkAsSeen = trpc.inbox.bulkMarkAsSeen.useMutation({
    onSuccess: () => {
      utils.inbox.getMyItems.invalidate();
      utils.inbox.getUnread.invalidate();
      utils.inbox.getStats.invalidate();
    },
  });

  const handleMarkAllAsSeen = () => {
    // LINT-005: Let TypeScript infer type from API response
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

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Inbox className="h-5 w-5" />
            <h2 className="text-lg font-semibold">Inbox</h2>
            {stats && stats.unread > 0 && (
              <Badge variant="destructive">{stats.unread}</Badge>
            )}
          </div>

          {unreadItems.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleMarkAllAsSeen}
              disabled={bulkMarkAsSeen.isPending}
            >
              <CheckCheck className="h-4 w-4 mr-2" />
              Mark all as seen
            </Button>
          )}
        </div>

        {/* Tabs */}
        {/* LINT-005: Use proper type for tab value */}
        <Tabs
          value={selectedTab}
          onValueChange={v => setSelectedTab(v as InboxTabValue)}
        >
          <TabsList className="w-full">
            <TabsTrigger value="all" className="flex-1">
              All
              {stats && stats.total > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {stats.total}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="unread" className="flex-1">
              Unread
              {stats && stats.unread > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {stats.unread}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="archived" className="flex-1">
              Archived
              {stats && stats.archived > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {stats.archived}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>
        </Tabs>
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
