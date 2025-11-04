import { CommentItem } from "./CommentItem";

interface Comment {
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
}

interface CommentListProps {
  comments: Comment[];
  commentableType: string;
  commentableId: number;
}

export function CommentList({
  comments,
  commentableType,
  commentableId,
}: CommentListProps) {
  // Sort comments: unresolved first, then by date
  const sortedComments = [...comments].sort((a, b) => {
    if (a.isResolved !== b.isResolved) {
      return a.isResolved ? 1 : -1;
    }
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  return (
    <div className="space-y-4">
      {sortedComments.map((comment) => (
        <CommentItem
          key={comment.id}
          comment={comment}
          commentableType={commentableType}
          commentableId={commentableId}
        />
      ))}
    </div>
  );
}
