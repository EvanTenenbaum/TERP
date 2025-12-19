import { useState } from "react";
import { MessageSquare, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MentionInput } from "./MentionInput";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { CommentList } from "./CommentList";
import { cn } from "@/lib/utils";

interface CommentWidgetProps {
  commentableType: string;
  commentableId: number;
  className?: string;
}

export function CommentWidget({
  commentableType,
  commentableId,
  className,
}: CommentWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [newComment, setNewComment] = useState("");

  const utils = trpc.useContext();

  // Fetch comments - PERF-003: Handle paginated response
  const { data: commentsData, isLoading } = trpc.comments.getEntityComments.useQuery(
    { commentableType, commentableId },
    { enabled: isOpen }
  );
  
  // Extract items from paginated response
  const comments = commentsData?.items ?? [];

  // Fetch unresolved count
  const { data: unresolvedData } = trpc.comments.getUnresolvedCount.useQuery(
    { commentableType, commentableId }
  );

  const unresolvedCount = unresolvedData?.count || 0;

  // Create comment mutation
  const createComment = trpc.comments.create.useMutation({
    onSuccess: () => {
      setNewComment("");
      utils.comments.getEntityComments.invalidate({ commentableType, commentableId });
      utils.comments.getUnresolvedCount.invalidate({ commentableType, commentableId });
    },
  });

  const handleSubmit = () => {
    if (!newComment.trim()) return;

    createComment.mutate({
      commentableType,
      commentableId,
      content: newComment,
    });
  };

  return (
    <div className={cn("relative", className)}>
      {/* Toggle Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="gap-2"
      >
        <MessageSquare className="h-4 w-4" />
        <span>Comments</span>
        {comments.length > 0 && (
          <Badge variant="secondary" className="ml-1">
            {comments.length}
          </Badge>
        )}
        {unresolvedCount > 0 && (
          <Badge variant="destructive" className="ml-1">
            {unresolvedCount}
          </Badge>
        )}
      </Button>

      {/* Comments Panel */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-96 max-h-[600px] bg-card border rounded-lg shadow-lg z-50 flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              <h3 className="font-semibold">Comments</h3>
              {comments.length > 0 && (
                <Badge variant="secondary">{comments.length}</Badge>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Comments List */}
          <div className="flex-1 overflow-y-auto p-4">
            {isLoading ? (
              <div className="text-center text-muted-foreground py-8">
                Loading comments...
              </div>
            ) : comments.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                No comments yet. Be the first to comment!
              </div>
            ) : (
              <CommentList
                comments={comments}
                commentableType={commentableType}
                commentableId={commentableId}
              />
            )}
          </div>

          {/* New Comment Input */}
          <div className="p-4 border-t">
            <MentionInput
              placeholder="Write a comment... Type @ to mention someone"
              value={newComment}
              onChange={setNewComment}
              className="min-h-[80px] mb-2"
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
            />
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">
                Ctrl+Enter to send
              </span>
              <Button
                size="sm"
                onClick={handleSubmit}
                disabled={!newComment.trim() || createComment.isPending}
              >
                <Send className="h-4 w-4 mr-2" />
                Send
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
