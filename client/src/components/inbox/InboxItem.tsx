import { useState, memo } from "react";
import {
  MessageSquare,
  CheckCircle2,
  ListTodo,
  Archive,
  Trash2,
  MoreVertical,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

interface InboxItemProps {
  item: {
    id: number;
    sourceType: "mention" | "task_assignment" | "task_update";
    sourceId: number;
    referenceType: string;
    referenceId: number;
    title: string;
    description: string | null;
    status: "unread" | "seen" | "completed";
    seenAt: Date | null;
    completedAt: Date | null;
    isArchived: boolean;
    createdAt: Date;
  };
}

const SOURCE_ICONS = {
  mention: MessageSquare,
  task_assignment: ListTodo,
  task_update: CheckCircle2,
};

const STATUS_COLORS = {
  unread: "bg-blue-500",
  seen: "bg-yellow-500",
  completed: "bg-green-500",
};

export const InboxItem = memo(function InboxItem({ item }: InboxItemProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const utils = trpc.useContext();

  const Icon = SOURCE_ICONS[item.sourceType];

  // Mark as seen mutation
  const markAsSeen = trpc.inbox.markAsSeen.useMutation({
    onSuccess: () => {
      utils.inbox.getMyItems.invalidate();
      utils.inbox.getUnread.invalidate();
      utils.inbox.getStats.invalidate();
    },
  });

  // Mark as completed mutation
  const markAsCompleted = trpc.inbox.markAsCompleted.useMutation({
    onSuccess: () => {
      utils.inbox.getMyItems.invalidate();
      utils.inbox.getStats.invalidate();
    },
  });

  // Archive mutation
  const archiveItem = trpc.inbox.archive.useMutation({
    onSuccess: () => {
      utils.inbox.getMyItems.invalidate();
      utils.inbox.getStats.invalidate();
    },
  });

  // Delete mutation
  const deleteItem = trpc.inbox.delete.useMutation({
    onSuccess: () => {
      utils.inbox.getMyItems.invalidate();
      utils.inbox.getStats.invalidate();
    },
  });

  const handleClick = () => {
    if (item.status === "unread") {
      markAsSeen.mutate({ itemId: item.id });
    }
    // TODO: Navigate to the referenced entity
  };

  const handleMarkCompleted = () => {
    markAsCompleted.mutate({ itemId: item.id });
  };

  const handleArchive = () => {
    archiveItem.mutate({ itemId: item.id });
  };

  const handleDelete = () => {
    setShowDeleteConfirm(true);
  };

  const confirmDelete = () => {
    deleteItem.mutate({ itemId: item.id });
    setShowDeleteConfirm(false);
  };

  return (
    <div
      className={cn(
        "p-4 hover:bg-muted/50 cursor-pointer transition-colors relative",
        item.status === "unread" && "bg-blue-50/50 dark:bg-blue-950/20"
      )}
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex items-start gap-3">
        {/* Status Indicator */}
        <div className="flex-shrink-0 mt-1">
          <div
            className={cn(
              "h-2 w-2 rounded-full",
              item.status === "unread" && STATUS_COLORS.unread,
              item.status === "seen" && STATUS_COLORS.seen,
              item.status === "completed" && STATUS_COLORS.completed
            )}
          />
        </div>

        {/* Icon */}
        <div className="flex-shrink-0">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Icon className="h-5 w-5 text-primary" />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-sm mb-1">{item.title}</h4>
          {item.description && (
            <p className="text-sm text-muted-foreground line-clamp-2">
              {item.description}
            </p>
          )}
          <div className="flex items-center gap-2 mt-2">
            <Badge variant="outline" className="text-xs">
              {item.sourceType.replace("_", " ")}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
            </span>
          </div>
        </div>

        {/* Actions */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "h-8 w-8 flex-shrink-0 transition-opacity",
                isHovered ? "opacity-100" : "opacity-0"
              )}
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {item.status !== "completed" && (
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  handleMarkCompleted();
                }}
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Mark as Completed
              </DropdownMenuItem>
            )}
            {!item.isArchived && (
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  handleArchive();
                }}
              >
                <Archive className="h-4 w-4 mr-2" />
                Archive
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                handleDelete();
              }}
              className="text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <ConfirmDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        title="Delete Item"
        description="Are you sure you want to delete this item? This action cannot be undone."
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={confirmDelete}
        isLoading={deleteItem.isPending}
      />
    </div>
  );
});
