import { useState, memo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { MessageSquare, Send, Check, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { EmptyState } from "@/components/ui/EmptyState";

interface CommentsPanelProps {
  noteId: number;
}

export const CommentsPanel = memo(function CommentsPanel({ noteId }: CommentsPanelProps) {
  const [newComment, setNewComment] = useState("");
  const [replyTo, setReplyTo] = useState<number | null>(null);

  // Fetch comments
  const { data: comments, isLoading, refetch } = trpc.freeformNotes.comments.list.useQuery(
    { noteId },
    { refetchInterval: false } // Manual refresh only (performance optimization)
  );

  // Add comment mutation
  const addCommentMutation = trpc.freeformNotes.comments.add.useMutation({
    onSuccess: () => {
      setNewComment("");
      setReplyTo(null);
      refetch();
    },
  });

  // Resolve comment mutation
  const resolveCommentMutation = trpc.freeformNotes.comments.resolve.useMutation({
    onSuccess: () => {
      refetch();
    },
  });

  const handleAddComment = async () => {
    if (!newComment.trim()) return;

    try {
      await addCommentMutation.mutateAsync({
        noteId,
        content: newComment,
        parentCommentId: replyTo || undefined,
      });
    } catch (error) {
      console.error("Failed to add comment:", error);
    }
  };

  const handleResolve = async (commentId: number) => {
    try {
      await resolveCommentMutation.mutateAsync({ commentId });
    } catch (error) {
      console.error("Failed to resolve comment:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Group comments by parent
  const topLevelComments = comments?.filter((c) => !c.parentCommentId) || [];
  const getReplies = (parentId: number) =>
    comments?.filter((c) => c.parentCommentId === parentId) || [];

  return (
    <div className="space-y-4">
      {/* Comments List */}
      <div className="space-y-3">
        {topLevelComments.length === 0 ? (
          <EmptyState
            icon={MessageSquare}
            title="No comments"
            description="Be the first to add a comment"
            className="py-8"
          />
        ) : (
          topLevelComments.map((comment) => (
            <div key={comment.id}>
              {/* Top-level comment */}
              <Card className={`p-3 ${comment.isResolved ? 'opacity-50' : ''}`}>
                <div className="flex items-start gap-3">
                  <Avatar className="h-8 w-8 bg-primary text-primary-foreground flex items-center justify-center text-sm font-semibold">
                    {comment.userName?.charAt(0).toUpperCase() || 'U'}
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-sm">{comment.userName || 'Unknown User'}</span>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                      </span>
                      {comment.isResolved && (
                        <span className="inline-flex items-center gap-1 text-xs text-green-600">
                          <Check className="h-3 w-3" />
                          Resolved
                        </span>
                      )}
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{comment.content}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setReplyTo(comment.id)}
                        className="h-7 text-xs"
                      >
                        Reply
                      </Button>
                      {!comment.isResolved && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleResolve(comment.id)}
                          className="h-7 text-xs"
                        >
                          <Check className="h-3 w-3 mr-1" />
                          Resolve
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </Card>

              {/* Replies */}
              {getReplies(comment.id).map((reply) => (
                <Card key={reply.id} className="p-3 ml-8 mt-2">
                  <div className="flex items-start gap-3">
                    <Avatar className="h-6 w-6 bg-muted text-muted-foreground flex items-center justify-center text-xs font-semibold">
                      {reply.userName?.charAt(0).toUpperCase() || 'U'}
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-xs">{reply.userName || 'Unknown User'}</span>
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(reply.createdAt), { addSuffix: true })}
                        </span>
                      </div>
                      <p className="text-xs whitespace-pre-wrap">{reply.content}</p>
                    </div>
                  </div>
                </Card>
              ))}

              {/* Reply input (if replying to this comment) */}
              {replyTo === comment.id && (
                <div className="ml-8 mt-2">
                  <div className="flex gap-2">
                    <Textarea
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Write a reply..."
                      className="min-h-[60px] text-sm"
                      autoFocus
                    />
                    <div className="flex flex-col gap-1">
                      <Button
                        size="sm"
                        onClick={handleAddComment}
                        disabled={!newComment.trim() || addCommentMutation.isPending}
                      >
                        {addCommentMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Send className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setReplyTo(null);
                          setNewComment("");
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* New Comment Input (only if not replying) */}
      {!replyTo && (
        <div className="border-t pt-4">
          <div className="flex gap-2">
            <Textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Add a comment..."
              className="min-h-[80px]"
            />
            <Button
              onClick={handleAddComment}
              disabled={!newComment.trim() || addCommentMutation.isPending}
              className="self-end"
            >
              {addCommentMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
});