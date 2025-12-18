import { useState } from "react";
import { useParams } from "wouter";
import { useLocation } from "wouter";
import { Plus, MoreVertical, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { trpc } from "@/lib/trpc";
import { TaskCard } from "@/components/todos/TaskCard";
import { TaskForm } from "@/components/todos/TaskForm";
import { TodoListForm } from "@/components/todos/TodoListForm";

export function TodoListDetailPage() {
  const { listId } = useParams<{ listId: string }>();
  const [, setLocation] = useLocation();
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
  const [isEditListOpen, setIsEditListOpen] = useState(false);
  const [showDeleteListConfirm, setShowDeleteListConfirm] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<number | null>(null);
  const [editingTask, setEditingTask] = useState<{
    id: number;
    title: string;
    description?: string | null;
    status: "todo" | "in_progress" | "done";
    priority?: "low" | "medium" | "high" | "urgent" | null;
    dueDate?: Date | null;
    assignedTo?: number | null;
  } | null>(null);

  const utils = trpc.useContext();

  const { data: list, isLoading: listLoading } =
    trpc.todoLists.getById.useQuery(
      { listId: Number(listId) },
      { enabled: !!listId }
    );

  const { data: tasks = [], isLoading: tasksLoading } =
    trpc.todoTasks.getListTasks.useQuery(
      { listId: Number(listId) },
      { enabled: !!listId }
    );

  const { data: stats } = trpc.todoTasks.getListStats.useQuery(
    { listId: Number(listId) },
    { enabled: !!listId }
  );

  const toggleComplete = trpc.todoTasks.complete.useMutation({
    onSuccess: () => {
      utils.todoTasks.getListTasks.invalidate({ listId: Number(listId) });
      utils.todoTasks.getListStats.invalidate({ listId: Number(listId) });
    },
  });

  const uncomplete = trpc.todoTasks.uncomplete.useMutation({
    onSuccess: () => {
      utils.todoTasks.getListTasks.invalidate({ listId: Number(listId) });
      utils.todoTasks.getListStats.invalidate({ listId: Number(listId) });
    },
  });

  const deleteTask = trpc.todoTasks.delete.useMutation({
    onSuccess: () => {
      utils.todoTasks.getListTasks.invalidate({ listId: Number(listId) });
      utils.todoTasks.getListStats.invalidate({ listId: Number(listId) });
    },
  });

  const deleteList = trpc.todoLists.delete.useMutation({
    onSuccess: () => {
      setLocation("/todos");
    },
  });

  const handleToggleComplete = (task: { id: number; status: string }) => {
    if (task.status === "done") {
      uncomplete.mutate({ taskId: task.id });
    } else {
      toggleComplete.mutate({ taskId: task.id });
    }
  };

  const handleDeleteTask = () => {
    if (taskToDelete !== null) {
      deleteTask.mutate({ taskId: taskToDelete });
      setTaskToDelete(null);
    }
  };

  const handleDeleteList = () => {
    deleteList.mutate({ listId: Number(listId) });
  };

  if (listLoading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="text-center text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!list) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">List not found</h2>
          <Button onClick={() => setLocation("/todos")}>Back to Lists</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      {/* Header */}
      <div className="mb-8">
        <Button
          variant="ghost"
          onClick={() => setLocation("/todos")}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Lists
        </Button>

        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h1 className="text-3xl font-bold">{list.name}</h1>
            {list.description && (
              <p className="text-muted-foreground mt-2">{list.description}</p>
            )}

            {/* Stats */}
            {stats && (
              <div className="flex items-center gap-4 mt-4">
                <Badge variant="secondary">
                  {stats.completed} / {stats.total} completed
                </Badge>
                {stats.overdue > 0 && (
                  <Badge variant="destructive">{stats.overdue} overdue</Badge>
                )}
                {stats.inProgress > 0 && (
                  <Badge variant="outline">
                    {stats.inProgress} in progress
                  </Badge>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button onClick={() => setIsCreateTaskOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              New Task
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setIsEditListOpen(true)}>
                  Edit List
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setShowDeleteListConfirm(true)}
                  className="text-destructive"
                >
                  Delete List
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Tasks */}
      {tasksLoading ? (
        <div className="text-center text-muted-foreground py-12">
          Loading tasks...
        </div>
      ) : tasks.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed rounded-lg">
          <h3 className="text-lg font-semibold mb-2">No tasks yet</h3>
          <p className="text-muted-foreground mb-4">
            Add your first task to get started
          </p>
          <Button onClick={() => setIsCreateTaskOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add First Task
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {tasks.map(task => (
            <TaskCard
              key={task.id}
              task={task}
              onClick={() => setEditingTask(task)}
              onToggleComplete={() => handleToggleComplete({ id: task.id, status: task.status })}
              onEdit={() => setEditingTask(task)}
              onDelete={() => setTaskToDelete(task.id)}
            />
          ))}
        </div>
      )}

      {/* Forms */}
      <TaskForm
        listId={Number(listId)}
        isOpen={isCreateTaskOpen}
        onClose={() => setIsCreateTaskOpen(false)}
      />

      <TaskForm
        listId={Number(listId)}
        task={editingTask || undefined}
        isOpen={!!editingTask}
        onClose={() => setEditingTask(null)}
      />

      <TodoListForm
        list={list}
        isOpen={isEditListOpen}
        onClose={() => setIsEditListOpen(false)}
      />

      {/* Delete Task Confirmation */}
      <ConfirmDialog
        open={taskToDelete !== null}
        onOpenChange={(open) => !open && setTaskToDelete(null)}
        title="Delete Task"
        description="Are you sure you want to delete this task? This action cannot be undone."
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDeleteTask}
        isLoading={deleteTask.isPending}
      />

      {/* Delete List Confirmation */}
      <ConfirmDialog
        open={showDeleteListConfirm}
        onOpenChange={setShowDeleteListConfirm}
        title="Delete List"
        description="Are you sure you want to delete this list? All tasks will be deleted. This action cannot be undone."
        confirmLabel="Delete List"
        variant="destructive"
        onConfirm={handleDeleteList}
        isLoading={deleteList.isPending}
      />
    </div>
  );
}
