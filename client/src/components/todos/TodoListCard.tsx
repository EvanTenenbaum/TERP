import { useState, memo } from "react";
import { MoreVertical, Users, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface TodoListCardProps {
  list: {
    id: number;
    name: string;
    description?: string | null;
    isShared: boolean;
    taskCount?: number;
    completedCount?: number;
  };
  onClick?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onShare?: () => void;
}

export const TodoListCard = memo(function TodoListCard({
  list,
  onClick,
  onEdit,
  onDelete,
  onShare,
}: TodoListCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  const completionPercent =
    list.taskCount && list.taskCount > 0
      ? Math.round(((list.completedCount || 0) / list.taskCount) * 100)
      : 0;

  return (
    <div
      className={cn(
        "group relative rounded-lg border bg-card p-4 transition-all hover:shadow-md cursor-pointer",
        isHovered && "border-primary/50"
      )}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <h3 className="font-semibold text-lg">{list.name}</h3>
          {list.description && (
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
              {list.description}
            </p>
          )}
        </div>

        {/* Actions Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {onEdit && (
              <DropdownMenuItem onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}>
                Edit List
              </DropdownMenuItem>
            )}
            {onShare && (
              <DropdownMenuItem onClick={(e) => {
                e.stopPropagation();
                onShare();
              }}>
                Share Settings
              </DropdownMenuItem>
            )}
            {onDelete && (
              <DropdownMenuItem
                className="text-destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
              >
                Delete List
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-4 mt-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {list.taskCount !== undefined && (
            <>
              <CheckCircle2 className="h-4 w-4" />
              <span>
                {list.completedCount || 0} / {list.taskCount}
              </span>
            </>
          )}
        </div>

        {list.isShared && (
          <Badge variant="secondary" className="text-xs">
            <Users className="h-3 w-3 mr-1" />
            Shared
          </Badge>
        )}
      </div>

      {/* Progress Bar */}
      {list.taskCount !== undefined && list.taskCount > 0 && (
        <div className="mt-3">
          <div className="h-2 bg-secondary rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${completionPercent}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {completionPercent}% complete
          </p>
        </div>
      )}
    </div>
  );
});