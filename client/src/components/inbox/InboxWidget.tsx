import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { Inbox, ArrowRight, CheckCheck } from "lucide-react";
import { useLocation } from "wouter";
import { formatDistanceToNow } from "date-fns";

export function InboxWidget() {
  const [, setLocation] = useLocation();

  // Fetch inbox items - PERF-003: Handle paginated response
  const { data: itemsData, refetch } = trpc.inbox.getMyItems.useQuery({
    includeArchived: false,
    limit: 5, // Only fetch 5 items for widget
  });
  
  // Extract items from paginated response
  const items = itemsData?.items ?? [];

  // Mark as seen mutation
  const markAsSeen = trpc.inbox.markAsSeen.useMutation({
    onSuccess: () => {
      refetch();
    },
  });
  
  // Display items (already limited by query)
  const displayItems = items;

  const unreadCount = displayItems.filter((item) => !item.seenAt).length;

  const handleItemClick = (item: (typeof items)[0]) => {
    // Mark as seen
    if (!item.seenAt) {
      markAsSeen.mutate({ itemId: item.id });
    }

    // Navigate to the entity based on sourceType and referenceType
    if (item.sourceType === "task_assignment" || item.sourceType === "task_update") {
      setLocation(`/todos/${item.referenceId || ""}`);
    } else if (item.sourceType === "mention") {
      // Navigate based on reference type
      const referenceType = item.referenceType;
      const referenceId = item.referenceId;

      if (referenceType === "client" && referenceId) {
        setLocation(`/clients/${referenceId}`);
      } else if (referenceType === "inventory_batch" && referenceId) {
        setLocation(`/inventory`);
      } else if (referenceType === "dashboard" && referenceId) {
        setLocation(`/dashboard`);
      }
    }
  };

  const getItemIcon = (type: string) => {
    switch (type) {
      case "task_assigned":
        return "📋";
      case "task_completed":
        return "✅";
      case "comment_mention":
        return "💬";
      case "comment_reply":
        return "↩️";
      default:
        return "📬";
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <div className="flex items-center gap-2">
          <Inbox className="h-5 w-5 text-muted-foreground" />
          <CardTitle className="text-lg font-semibold">Inbox</CardTitle>
          {unreadCount > 0 && (
            <Badge variant="destructive" className="h-5 px-1.5">
              {unreadCount}
            </Badge>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setLocation("/inbox")}
          className="h-8"
        >
          View All
          <ArrowRight className="ml-1 h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        {displayItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <CheckCheck className="h-12 w-12 text-muted-foreground/50 mb-3" />
            <p className="text-sm text-muted-foreground font-medium">
              All caught up!
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              No new notifications
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {displayItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleItemClick(item)}
                className={`w-full text-left p-3 rounded-lg border transition-colors hover:bg-accent ${
                  !item.seenAt ? "bg-primary/5 border-primary/20" : "bg-card"
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className="text-xl flex-shrink-0 mt-0.5">
                    {getItemIcon(item.sourceType)}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium line-clamp-2">
                      {item.title}
                    </p>
                    {item.description && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                        {item.description}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(item.createdAt), {
                        addSuffix: true,
                      })}
                    </p>
                  </div>
                  {!item.seenAt && (
                    <div className="h-2 w-2 rounded-full bg-primary flex-shrink-0 mt-2" />
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
