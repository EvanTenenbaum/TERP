import * as React from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Pencil, Trash2, Check, X } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

export interface NoteCardProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'id'> {
  noteId: number;
  content: string;
  isCompleted: boolean;
  createdAt: Date;
  onToggleComplete?: (id: number) => void;
  onUpdate?: (id: number, content: string) => void;
  onDelete?: (id: number) => void;
  editable?: boolean;
}

const NoteCard = React.forwardRef<HTMLDivElement, NoteCardProps>(
  (
    {
      className,
      noteId,
      content,
      isCompleted,
      createdAt,
      onToggleComplete,
      onUpdate,
      onDelete,
      editable = true,
      ...props
    },
    ref
  ) => {
    const [isEditing, setIsEditing] = React.useState(false);
    const [editedContent, setEditedContent] = React.useState(content);

    const handleSave = () => {
      if (editedContent.trim() && editedContent !== content) {
        onUpdate?.(noteId, editedContent);
      }
      setIsEditing(false);
    };

    const handleCancel = () => {
      setEditedContent(content);
      setIsEditing(false);
    };

    const formatDate = (date: Date) => {
      const now = new Date();
      const diff = now.getTime() - date.getTime();
      const minutes = Math.floor(diff / 60000);
      const hours = Math.floor(diff / 3600000);
      const days = Math.floor(diff / 86400000);

      if (minutes < 1) return "Just now";
      if (minutes < 60) return `${minutes}m ago`;
      if (hours < 24) return `${hours}h ago`;
      if (days < 7) return `${days}d ago`;
      
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
      });
    };

    return (
      <Card
        ref={ref}
        className={cn(
          "group transition-all duration-200",
          isCompleted && "opacity-60",
          className
        )}
        {...props}
      >
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            {/* Checkbox */}
            <Checkbox
              checked={isCompleted}
              onCheckedChange={() => onToggleComplete?.(noteId)}
              className="mt-1"
            />

            {/* Content */}
            <div className="flex-1 min-w-0">
              {isEditing ? (
                <Textarea
                  value={editedContent}
                  onChange={(e) => setEditedContent(e.target.value)}
                  className="min-h-[80px] resize-none"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Escape") handleCancel();
                    if (e.key === "Enter" && e.metaKey) handleSave();
                  }}
                />
              ) : (
                <p
                  className={cn(
                    "text-sm whitespace-pre-wrap break-words",
                    isCompleted && "line-through text-muted-foreground"
                  )}
                >
                  {content}
                </p>
              )}
              <p className="mt-2 text-xs text-muted-foreground">
                {formatDate(createdAt)}
              </p>
            </div>

            {/* Actions */}
            {editable && (
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {isEditing ? (
                  <>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleSave}
                      className="h-8 w-8 p-0"
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleCancel}
                      className="h-8 w-8 p-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setIsEditing(true)}
                      className="h-8 w-8 p-0"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onDelete?.(noteId)}
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }
);

NoteCard.displayName = "NoteCard";

export { NoteCard };

