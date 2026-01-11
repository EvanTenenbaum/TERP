/**
 * Inline Notification Panel (FEAT-024)
 * Shows notifications inline without page navigation
 * Can be embedded in any page/component
 */

import React, { useCallback, useState } from "react";
import { trpc } from "@/lib/trpc";
import {
  Bell,
  CheckCheck,
  Inbox,
  X,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  CheckCircle,
  AlertTriangle,
  Info,
  Trash2,
  Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export interface InlineNotificationPanelProps {
  /** Maximum number of notifications to display */
  limit?: number;
  /** Show expanded view by default */
  defaultExpanded?: boolean;
  /** Whether to show the collapse/expand button */
  collapsible?: boolean;
  /** Filter by notification type */
  filterType?: "all" | "unread" | "read";
  /** Custom className */
  className?: string;
  /** Callback when notification is clicked */
  onNotificationClick?: (notification: Notification) => void;
  /** Title for the panel */
  title?: string;
  /** Show as a compact inline widget */
  compact?: boolean;
}

interface Notification {
  id: number;
  type: string;
  title: string;
  message: string | null;
  link: string | null;
  read: boolean;
  createdAt: Date | string;
}

const getNotificationIcon = (type: string) => {
  switch (type) {
    case "success":
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    case "error":
      return <AlertCircle className="h-4 w-4 text-destructive" />;
    case "warning":
      return <AlertTriangle className="h-4 w-4 text-amber-500" />;
    default:
      return <Info className="h-4 w-4 text-primary" />;
  }
};

export const InlineNotificationPanel = React.memo(function InlineNotificationPanel({
  limit = 10,
  defaultExpanded = true,
  collapsible = true,
  filterType = "all",
  className,
  onNotificationClick,
  title = "Notifications",
  compact = false,
}: InlineNotificationPanelProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [currentFilter, setCurrentFilter] = useState(filterType);
  const utils = trpc.useContext();

  // Fetch notifications
  const { data: listData, isLoading } = trpc.notifications.list.useQuery(
    { limit, offset: 0 },
    { refetchInterval: 30000 }
  );

  const { data: unreadData } = trpc.notifications.getUnreadCount.useQuery(
    undefined,
    { refetchInterval: 30000 }
  );

  // Mutations
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
      toast.success("All notifications marked as read");
    },
  });

  const deleteNotification = trpc.notifications.delete.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.notifications.list.invalidate(),
        utils.notifications.getUnreadCount.invalidate(),
      ]);
      toast.success("Notification deleted");
    },
  });

  const allNotifications = listData?.items ?? [];
  const unreadCount = unreadData?.unread ?? 0;

  // Apply filter
  const notifications = allNotifications.filter((n) => {
    if (currentFilter === "unread") return !n.read;
    if (currentFilter === "read") return n.read;
    return true;
  });

  const handleNotificationClick = useCallback(
    (notification: Notification) => {
      if (!notification.read) {
        markRead.mutate({ notificationId: notification.id });
      }
      onNotificationClick?.(notification);
    },
    [markRead, onNotificationClick]
  );

  const handleMarkAllRead = useCallback(() => {
    markAllRead.mutate();
  }, [markAllRead]);

  const handleDelete = useCallback(
    (e: React.MouseEvent, notificationId: number) => {
      e.stopPropagation();
      deleteNotification.mutate({ notificationId });
    },
    [deleteNotification]
  );

  const renderNotificationItem = (notification: Notification) => (
    <div
      key={notification.id}
      onClick={() => handleNotificationClick(notification)}
      className={cn(
        "flex items-start gap-3 p-3 border-b last:border-b-0 cursor-pointer transition-colors",
        "hover:bg-muted/50",
        !notification.read && "bg-primary/5"
      )}
    >
      <div className="flex-shrink-0 mt-0.5">
        {getNotificationIcon(notification.type)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p
            className={cn(
              "text-sm truncate",
              !notification.read && "font-medium"
            )}
          >
            {notification.title}
          </p>
          {!notification.read && (
            <div className="h-2 w-2 rounded-full bg-primary flex-shrink-0" />
          )}
        </div>
        {notification.message && (
          <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
            {notification.message}
          </p>
        )}
        <div className="flex items-center justify-between mt-2">
          <span className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(notification.createdAt), {
              addSuffix: true,
            })}
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 hover:text-destructive"
            onClick={(e) => handleDelete(e, notification.id)}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  );

  // Compact inline view
  if (compact) {
    return (
      <div className={cn("inline-flex items-center gap-2", className)}>
        <Bell className="h-4 w-4 text-muted-foreground" />
        {unreadCount > 0 ? (
          <Badge variant="destructive" className="text-xs">
            {unreadCount} new
          </Badge>
        ) : (
          <span className="text-sm text-muted-foreground">No new notifications</span>
        )}
      </div>
    );
  }

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            <CardTitle className="text-lg">{title}</CardTitle>
            {unreadCount > 0 && (
              <Badge variant="destructive">{unreadCount}</Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            {collapsible && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded(!isExpanded)}
                className="h-8 w-8 p-0"
              >
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            )}
          </div>
        </div>
        {isExpanded && (
          <CardDescription className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-2">
              <Filter className="h-3 w-3" />
              <Select
                value={currentFilter}
                onValueChange={(v) => setCurrentFilter(v as typeof currentFilter)}
              >
                <SelectTrigger className="h-7 w-24 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="unread">Unread</SelectItem>
                  <SelectItem value="read">Read</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleMarkAllRead}
                disabled={markAllRead.isPending}
                className="h-7 text-xs"
              >
                <CheckCheck className="h-3 w-3 mr-1" />
                Mark all read
              </Button>
            )}
          </CardDescription>
        )}
      </CardHeader>

      {isExpanded && (
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Loading notifications...
            </div>
          ) : notifications.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <Inbox className="h-10 w-10 mx-auto mb-3 opacity-50" />
              <p className="text-sm">
                {currentFilter === "unread"
                  ? "No unread notifications"
                  : currentFilter === "read"
                    ? "No read notifications"
                    : "No notifications yet"}
              </p>
            </div>
          ) : (
            <ScrollArea className="max-h-[400px]">
              <div className="divide-y">
                {notifications.map(renderNotificationItem)}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      )}
    </Card>
  );
});

/**
 * Inline Toast Notification Component
 * Shows a single notification as a toast-like inline element
 */
export interface InlineToastProps {
  notification: {
    id: number;
    type: string;
    title: string;
    message?: string | null;
  };
  onDismiss?: () => void;
  onAction?: () => void;
  actionLabel?: string;
  className?: string;
  autoHide?: boolean;
  autoHideDelay?: number;
}

export const InlineToast = React.memo(function InlineToast({
  notification,
  onDismiss,
  onAction,
  actionLabel = "View",
  className,
  autoHide = false,
  autoHideDelay = 5000,
}: InlineToastProps) {
  const [isVisible, setIsVisible] = useState(true);

  React.useEffect(() => {
    if (autoHide) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        onDismiss?.();
      }, autoHideDelay);
      return () => clearTimeout(timer);
    }
  }, [autoHide, autoHideDelay, onDismiss]);

  if (!isVisible) return null;

  return (
    <div
      className={cn(
        "flex items-start gap-3 p-4 rounded-lg border shadow-sm",
        notification.type === "success" && "bg-green-50 border-green-200 dark:bg-green-950/20",
        notification.type === "error" && "bg-red-50 border-red-200 dark:bg-red-950/20",
        notification.type === "warning" && "bg-amber-50 border-amber-200 dark:bg-amber-950/20",
        notification.type === "info" && "bg-blue-50 border-blue-200 dark:bg-blue-950/20",
        className
      )}
    >
      <div className="flex-shrink-0">{getNotificationIcon(notification.type)}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{notification.title}</p>
        {notification.message && (
          <p className="text-xs text-muted-foreground mt-1">{notification.message}</p>
        )}
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        {onAction && (
          <Button variant="ghost" size="sm" onClick={onAction} className="h-7 text-xs">
            {actionLabel}
          </Button>
        )}
        {onDismiss && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setIsVisible(false);
              onDismiss();
            }}
            className="h-7 w-7 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
});

export default InlineNotificationPanel;
