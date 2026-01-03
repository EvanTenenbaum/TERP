import React, { useCallback } from "react";
import { Bell, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";

const VipNotificationsBell = React.memo(function VipNotificationsBell() {
  const [, setLocation] = useLocation();
  const { data, isLoading, refetch } = trpc.vipPortal.notifications.list.useQuery({
    limit: 5,
  });
  const markRead = trpc.vipPortal.notifications.markRead.useMutation({
    onSuccess: () => {
      void refetch();
    },
  });
  const markAll = trpc.vipPortal.notifications.markAllRead.useMutation({
    onSuccess: () => {
      void refetch();
    },
  });

  const unreadCount = data?.unreadCount ?? 0;

  const handleMarkRead = useCallback(
    (id: number) => {
      markRead.mutate({ id });
    },
    [markRead]
  );

  const handleViewAll = useCallback(() => {
    setLocation("/notifications");
  }, [setLocation]);

  const handleMarkAll = useCallback(() => {
    markAll.mutate();
  }, [markAll]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge className="absolute -right-1 -top-1 h-4 min-w-[1.25rem] justify-center px-1 text-[10px]">
              {unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notifications</span>
          <Button variant="ghost" size="sm" onClick={handleMarkAll} disabled={markAll.isPending}>
            <CheckCircle2 className="mr-1 h-4 w-4" />
            Mark all read
          </Button>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {isLoading && (
          <DropdownMenuItem disabled>Loading notifications...</DropdownMenuItem>
        )}
        {!isLoading && data?.items.length === 0 && (
          <DropdownMenuItem disabled>No notifications yet.</DropdownMenuItem>
        )}
        {data?.items.map((notification) => (
          <DropdownMenuItem
            key={notification.id}
            className="flex flex-col items-start gap-1"
            onClick={() => handleMarkRead(notification.id)}
          >
            <div className="flex w-full items-center justify-between">
              <span className="text-sm font-medium">{notification.title}</span>
              {!notification.read && (
                <Badge variant="secondary" className="text-[10px]">
                  New
                </Badge>
              )}
            </div>
            {notification.message && (
              <span className="text-xs text-muted-foreground">{notification.message}</span>
            )}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleViewAll}>View all notifications</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
});

export default VipNotificationsBell;
