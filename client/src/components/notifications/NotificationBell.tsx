import React, { useCallback } from "react";
import { Bell, CheckCheck, Inbox } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLocation } from "wouter";
import { formatDistanceToNow } from "date-fns";

export interface NotificationBellProps {
  className?: string;
}

export const NotificationBell = React.memo(function NotificationBell({
  className,
}: NotificationBellProps) {
  const [, setLocation] = useLocation();
  const utils = trpc.useContext();

  const { data: unreadData } = trpc.notifications.getUnreadCount.useQuery();
  const { data: listData } = trpc.notifications.list.useQuery({
    limit: 5,
    offset: 0,
  });

  const markRead = trpc.notifications.markRead.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.notifications.list.invalidate(),
        utils.notifications.getUnreadCount.invalidate(),
      ]);
    },
  });

  const markAllRead = trpc.notifications.markAllRead.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.notifications.list.invalidate(),
        utils.notifications.getUnreadCount.invalidate(),
      ]);
    },
  });

  const notifications = listData?.items ?? [];
  const unreadCount = unreadData?.unread ?? 0;

  const handleViewAll = useCallback(() => {
    setLocation("/notifications");
  }, [setLocation]);

  const handleMarkAll = useCallback(() => {
    if (notifications.length === 0) {
      return;
    }
    markAllRead.mutate();
  }, [markAllRead, notifications.length]);

  const handleSelect = useCallback(
    (notificationId: number, link?: string | null) => {
      markRead.mutate({ notificationId });
      if (link) {
        setLocation(link);
      }
    },
    [markRead, setLocation]
  );

  const renderEmpty = () => (
    <div className="py-6 text-center text-sm text-muted-foreground">
      <Inbox className="h-8 w-8 mx-auto mb-2 opacity-50" />
      <p>No notifications yet</p>
    </div>
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={className ?? "relative"}
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notifications</span>
          {unreadCount > 0 && (
            <Badge variant="destructive" className="ml-2">
              {unreadCount}
            </Badge>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {notifications.length === 0 ? (
          renderEmpty()
        ) : (
          <>
            <div className="max-h-[320px] overflow-y-auto">
              {notifications.map(notification => (
                <DropdownMenuItem
                  key={notification.id}
                  className="flex flex-col items-start gap-1 cursor-pointer"
                  onClick={() =>
                    handleSelect(notification.id, notification.link ?? undefined)
                  }
                >
                  <div className="flex items-center gap-2 w-full">
                    <div
                      className={`w-2 h-2 rounded-full ${
                        notification.type === "success"
                          ? "bg-green-500"
                          : notification.type === "error"
                            ? "bg-destructive"
                            : notification.type === "warning"
                              ? "bg-amber-500"
                              : "bg-primary"
                      }`}
                    />
                    <span className="font-medium text-sm flex-1 truncate">
                      {notification.title}
                    </span>
                    {notification.createdAt && (
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(notification.createdAt), {
                          addSuffix: true,
                        })}
                      </span>
                    )}
                  </div>
                  {notification.message && (
                    <p className="text-xs text-muted-foreground line-clamp-2 pl-4">
                      {notification.message}
                    </p>
                  )}
                  {notification.read === false && (
                    <div className="h-1.5 w-1.5 rounded-full bg-primary ml-4" />
                  )}
                </DropdownMenuItem>
              ))}
            </div>
            <DropdownMenuSeparator />
            <div className="flex gap-2 p-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={handleMarkAll}
                disabled={markAllRead.isPending}
              >
                <CheckCheck className="h-4 w-4 mr-2" />
                Mark all read
              </Button>
              <Button
                variant="default"
                size="sm"
                className="flex-1"
                onClick={handleViewAll}
              >
                View All
              </Button>
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
});
