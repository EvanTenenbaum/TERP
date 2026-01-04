// @ts-nocheck - TEMPORARY: Type mismatch errors, needs Wave 1 fix
import React, { useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";

export const NotificationsPage = React.memo(function NotificationsPage(): JSX.Element {
  const utils = trpc.useContext();
  const { data: listData, isLoading } = trpc.notifications.list.useQuery({
    limit: 50,
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

  const deleteMutation = trpc.notifications.delete.useMutation({
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

  const handleMarkRead = useCallback(
    (notificationId: number) => {
      markRead.mutate({ notificationId });
    },
    [markRead]
  );

  const handleDelete = useCallback(
    (notificationId: number) => {
      deleteMutation.mutate({ notificationId });
    },
    [deleteMutation]
  );

  const items = listData?.items ?? [];
  const unreadCount = listData?.unread ?? 0;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Notifications</CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">Unread: {unreadCount}</Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={() => markAllRead.mutate()}
              disabled={markAllRead.isPending || items.length === 0}
            >
              Mark all read
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading && <p className="text-sm text-muted-foreground">Loading notifications...</p>}
          {!isLoading && items.length === 0 && (
            <p className="text-sm text-muted-foreground">No notifications yet.</p>
          )}
          {items.map(item => (
            <div
              key={item.id}
              className="flex items-start justify-between gap-3 rounded-lg border border-border p-3"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Badge
                    variant={
                      item.type === "error"
                        ? "destructive"
                        : item.type === "warning"
                          ? "secondary"
                          : "default"
                    }
                  >
                    {item.type}
                  </Badge>
                  {item.read === false && <Badge variant="outline">Unread</Badge>}
                </div>
                <p className="font-medium">{item.title}</p>
                {item.message && (
                  <p className="text-sm text-muted-foreground">{item.message}</p>
                )}
                {item.createdAt && (
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                  </p>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleMarkRead(item.id)}
                  disabled={markRead.isPending}
                >
                  Mark Read
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(item.id)}
                  disabled={deleteMutation.isPending}
                >
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
});
