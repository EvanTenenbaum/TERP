import { useState, memo } from "react";
import { MoreVertical, CheckCircle2, Edit2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { trpc } from "@/lib/trpc";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { MentionRenderer } from "./MentionRenderer";

interface CommentItemProps {
  comment: {
    id: number;
    content: string;
    userId: number;
    userName: string | null;
    userEmail: string | null;
    isResolved: boolean;
    resolvedAt: Date | null;
    resolvedBy: number | null;
    createdAt: Date;
    updatedAt: Date;
  };
  commentableType: string;
  commentableId: number;
}

export const CommentItem = memo(function CommentItem({
  comment,
  commentableType,
  commentableId,
}: CommentItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const utils = trpc.useContext();
  const { data: currentUser } = trpc.auth.me.useQuery();

  const isOwnComment = currentUser?.id === comment.userId;

  // Update comment mutation
  const updateComment = trpc.comments.update.useMutation({
    onSuccess: () => {
      setIsEditing(false);
      utils.comments.getEntityComments.invalidate({ commentableType, commentableId });
    },
  });

  // Delete comment mutation
  const deleteComment = trpc.comments.delete.useMutation({
    onSuccess: () => {
      utils.comments.getEntityComments.invalidate({ commentableType, commentableId });
      utils.comments.getUnresolvedCount.invalidate({ commentableType, commentableId });
    },
  });

  // Resolve/unresolve comment mutation
  const resolveComment = trpc.comments.resolve.useMutation({
    onSuccess: () => {
      utils.comments.getEntityComments.invalidate({ commentableType, commentableId });
      utils.comments.getUnresolvedCount.invalidate({ commentableType, commentableId });
    },
  });

  const unresolveComment = trpc.comments.unresolve.useMutation({
    onSuccess: () => {
      utils.comments.getEntityComments.invalidate({ commentableType, commentableId });
      utils.comments.getUnresolvedCount.invalidate({ commentableType, commentableId });
    },
  });

  const handleSaveEdit = () => {
    if (!editContent.trim()) return;

    updateComment.mutate({
      commentId: comment.id,
      content: editContent,
    });
  };

  const handleDelete = () => {
    deleteComment.mutate({ commentId: comment.id });
  };

  const handleToggleResolve = () => {
    if (comment.isResolved) {
      unresolveComment.mutate({ commentId: comment.id });
    } else {
      resolveComment.mutate({ commentId: comment.id });
    }
  };

  return (
    <div
      className={cn(
        "rounded-lg border p-3",
        comment.isResolved && "bg-muted/50 opacity-75"
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="text-sm font-medium">
              {comment.userName?.[0]?.toUpperCase() || "?"}
            </span>
          </div>
          <div>
            <p className="text-sm font-medium">{comment.userName || "Unknown"}</p>
            <p className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {comment.isResolved && (
            <Badge variant="secondary" className="text-xs">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Resolved
            </Badge>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleToggleResolve}>
                {comment.isResolved ? "Mark as Unresolved" : "Mark as Resolved"}
              </DropdownMenuItem>
              {isOwnComment && (
                <>
                  <DropdownMenuItem onClick={() => setIsEditing(true)}>
                    <Edit2 className="h-4 w-4 mr-2" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setShowDeleteConfirm(true)}
                    className="text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Content */}
      {isEditing ? (
        <div className="space-y-2">
          <Textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            className="min-h-[80px]"
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSaveEdit}>
              Save
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setIsEditing(false);
                setEditContent(comment.content);
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <MentionRenderer content={comment.content} />
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        title="Delete Comment"
        description="Are you sure you want to delete this comment? This action cannot be undone."
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDelete}
        isLoading={deleteComment.isPending}
      />
    </div>
  );
});
