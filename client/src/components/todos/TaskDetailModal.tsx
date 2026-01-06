
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  CheckCircle2,
  Circle,
  Calendar,
  User,
  Edit2,
  Trash2,
  Clock,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { format } from "date-fns";
import { CommentWidget } from "@/components/comments/CommentWidget";
import { cn } from "@/lib/utils";

interface TaskDetailModalProps {
  taskId: number;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

export function TaskDetailModal({
  taskId,
  isOpen,
  onClose,
  onEdit,
  onDelete,
}: TaskDetailModalProps) {
  const { data: task, isLoading } = trpc.todoTasks.getById.useQuery(
    { taskId },
    { enabled: isOpen && !!taskId }
  );

  const { data: activity = [] } = trpc.todoActivity.getTaskActivity.useQuery(
    { taskId },
    { enabled: isOpen && !!taskId }
  );

  const utils = trpc.useContext();

  const toggleComplete = trpc.todoTasks.complete.useMutation({
    onSuccess: () => {
      utils.todoTasks.getById.invalidate({ taskId });
      utils.todoActivity.getTaskActivity.invalidate({ taskId });
    },
  });

  const uncomplete = trpc.todoTasks.uncomplete.useMutation({
    onSuccess: () => {
      utils.todoTasks.getById.invalidate({ taskId });
      utils.todoActivity.getTaskActivity.invalidate({ taskId });
    },
  });

  const handleToggleComplete = () => {
    if (task?.isCompleted) {
      uncomplete.mutate({ taskId });
    } else {
      toggleComplete.mutate({ taskId });
    }
  };

  if (isLoading || !task) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent>
          <div className="text-center py-8">Loading...</div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-full sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3 flex-1">
              <button onClick={handleToggleComplete} className="mt-1">
                {task.isCompleted ? (
                  <CheckCircle2 className="h-6 w-6 text-primary" />
                ) : (
                  <Circle className="h-6 w-6 text-muted-foreground hover:text-primary transition-colors" />
                )}
              </button>
              <div className="flex-1">
                <DialogTitle
                  className={cn(
                    "text-2xl",
                    task.isCompleted && "line-through text-muted-foreground"
                  )}
                >
                  {task.title}
                </DialogTitle>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {onEdit && (
                <Button variant="outline" size="sm" onClick={onEdit}>
                  <Edit2 className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              )}
              {onDelete && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onDelete}
                  className="text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Metadata */}
          <div className="flex flex-wrap gap-3">
            {task.priority && (
              <Badge variant="secondary">{task.priority}</Badge>
            )}
            {task.status && (
              <Badge variant="outline">{task.status.replace("_", " ")}</Badge>
            )}
            {task.dueDate && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                Due {format(new Date(task.dueDate), "PPP")}
              </div>
            )}
            {task.assignedTo && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <User className="h-4 w-4" />
                Assigned to user {task.assignedTo}
              </div>
            )}
          </div>

          {/* Description */}
          {task.description && (
            <div>
              <h3 className="font-semibold mb-2">Description</h3>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {task.description}
              </p>
            </div>
          )}

          <Separator />

          {/* Activity Timeline */}
          {activity.length > 0 && (
            <div>
              <h3 className="font-semibold mb-3">Activity</h3>
              <div className="space-y-3">
                {activity.map((item) => (
                  <div key={item.id} className="flex gap-3 text-sm">
                    <Clock className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div className="flex-1">
                      <p className="text-muted-foreground">
                        {item.action} {item.fieldChanged ? `- ${item.fieldChanged}` : ''}
                        {item.oldValue && item.newValue ? `: ${item.oldValue} → ${item.newValue}` : ''}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {format(new Date(item.createdAt), "PPp")}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <Separator />

          {/* Comments */}
          <div>
            <h3 className="font-semibold mb-3">Comments</h3>
            <CommentWidget commentableType="task" commentableId={taskId} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
