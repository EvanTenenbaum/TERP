import { useState, memo } from "react";
import {
  CheckCircle2,
  Circle,
  MoreVertical,
  Calendar,
  User,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { format, isPast, isToday, isTomorrow } from "date-fns";

interface TaskCardProps {
  task: {
    id: number;
    title: string;
    description?: string | null;
    status: "todo" | "in_progress" | "done";
    priority?: "low" | "medium" | "high" | "urgent" | null;
    dueDate?: Date | null;
    assignedTo?: number | null;
    assignedToName?: string | null;
    isCompleted: boolean;
  };
  onClick?: () => void;
  onToggleComplete?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

const PRIORITY_COLORS = {
  low: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  high: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
  urgent: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
};

const STATUS_LABELS = {
  todo: "To Do",
  in_progress: "In Progress",
  done: "Done",
};

export const TaskCard = memo(function TaskCard({
  task,
  onClick,
  onToggleComplete,
  onEdit,
  onDelete,
}: TaskCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  const isOverdue = task.dueDate && isPast(task.dueDate) && !task.isCompleted;
  const isDueToday = task.dueDate && isToday(task.dueDate);
  const isDueTomorrow = task.dueDate && isTomorrow(task.dueDate);

  const getDueDateLabel = () => {
    if (!task.dueDate) return null;
    if (isDueToday) return "Due today";
    if (isDueTomorrow) return "Due tomorrow";
    if (isOverdue) return "Overdue";
    return `Due ${format(task.dueDate, "MMM d")}`;
  };

  return (
    <div
      className={cn(
        "group relative rounded-lg border bg-card p-4 transition-all hover:shadow-sm",
        isHovered && "border-primary/50",
        task.isCompleted && "opacity-60"
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex items-start gap-3">
        {/* Checkbox */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleComplete?.();
          }}
          className="mt-0.5 flex-shrink-0"
        >
          {task.isCompleted ? (
            <CheckCircle2 className="h-5 w-5 text-primary" />
          ) : (
            <Circle className="h-5 w-5 text-muted-foreground hover:text-primary transition-colors" />
          )}
        </button>

        {/* Content */}
        <div className="flex-1 min-w-0 cursor-pointer" onClick={onClick}>
          <h4
            className={cn(
              "font-medium",
              task.isCompleted && "line-through text-muted-foreground"
            )}
          >
            {task.title}
          </h4>

          {task.description && (
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
              {task.description}
            </p>
          )}

          {/* Metadata */}
          <div className="flex flex-wrap items-center gap-2 mt-2">
            {/* Priority */}
            {task.priority && (
              <Badge
                variant="secondary"
                className={cn("text-xs", PRIORITY_COLORS[task.priority])}
              >
                {task.priority}
              </Badge>
            )}

            {/* Status */}
            {task.status !== "done" && (
              <Badge variant="outline" className="text-xs">
                {STATUS_LABELS[task.status]}
              </Badge>
            )}

            {/* Due Date */}
            {task.dueDate && (
              <div
                className={cn(
                  "flex items-center gap-1 text-xs",
                  isOverdue
                    ? "text-destructive"
                    : isDueToday
                      ? "text-orange-600 dark:text-orange-400"
                      : "text-muted-foreground"
                )}
              >
                {isOverdue && <AlertCircle className="h-3 w-3" />}
                <Calendar className="h-3 w-3" />
                <span>{getDueDateLabel()}</span>
              </div>
            )}

            {/* Assignee */}
            {task.assignedToName && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <User className="h-3 w-3" />
                <span>{task.assignedToName}</span>
              </div>
            )}
          </div>
        </div>

        {/* Actions Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {onEdit && (
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit();
                }}
              >
                Edit Task
              </DropdownMenuItem>
            )}
            {onToggleComplete && (
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleComplete();
                }}
              >
                {task.isCompleted ? "Mark Incomplete" : "Mark Complete"}
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
                Delete Task
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
});