import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Zap } from "lucide-react";

interface QuickAddTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function QuickAddTaskModal({ isOpen, onClose }: QuickAddTaskModalProps) {
  const [title, setTitle] = useState("");
  const [listId, setListId] = useState<string>("");

  const utils = trpc.useContext();

  // Fetch user's lists - handle paginated response
  const { data: listsData } = trpc.todoLists.getMyLists.useQuery();
  const lists = Array.isArray(listsData) ? listsData : (listsData?.items ?? []);

  // Create task mutation
  const createTask = trpc.todoTasks.create.useMutation({
    onSuccess: () => {
      toast.success("Task created!");
      utils.todoTasks.invalidate();
      utils.todoLists.invalidate();
      handleClose();
    },
    onError: (error) => {
      toast.error(`Failed to create task: ${error.message}`);
    },
  });

  const handleClose = () => {
    setTitle("");
    setListId("");
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || !listId) {
      toast.error("Please enter a task title and select a list");
      return;
    }

    createTask.mutate({
      listId: Number(listId),
      title: title.trim(),
      status: "todo",
    });
  };

  // Auto-select first list if only one exists
  useEffect(() => {
    if (lists.length === 1 && !listId) {
      setListId(String(lists[0].id));
    }
  }, [lists, listId]);

  // Focus title input when modal opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        const input = document.querySelector(
          '[data-quick-add-title]'
        ) as HTMLInputElement | null;
        input?.focus();
      }, 100);
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            <DialogTitle>Quick Add Task</DialogTitle>
          </div>
          <DialogDescription>
            Press <kbd className="px-2 py-1 bg-muted rounded text-xs">Ctrl</kbd>{" "}
            + <kbd className="px-2 py-1 bg-muted rounded text-xs">Shift</kbd> +{" "}
            <kbd className="px-2 py-1 bg-muted rounded text-xs">T</kbd> anytime
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="quick-task-title">Task Title</Label>
            <Input
              id="quick-task-title"
              data-quick-add-title
              placeholder="What needs to be done?"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoComplete="off"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="quick-task-list">List</Label>
            <Select value={listId} onValueChange={setListId}>
              <SelectTrigger id="quick-task-list">
                <SelectValue placeholder="Select a list" />
              </SelectTrigger>
              <SelectContent>
                {lists.length === 0 ? (
                  <div className="px-2 py-3 text-sm text-muted-foreground text-center">
                    No lists yet. Create one first!
                  </div>
                ) : (
                  lists.map((list) => (
                    <SelectItem key={list.id} value={String(list.id)}>
                      {list.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!title.trim() || !listId || createTask.isPending}
            >
              {createTask.isPending ? "Adding..." : "Add Task"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
