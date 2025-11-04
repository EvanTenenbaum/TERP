import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";

interface TodoListFormProps {
  list?: {
    id: number;
    name: string;
    description?: string | null;
    isShared: boolean;
  };
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function TodoListForm({
  list,
  isOpen,
  onClose,
  onSuccess,
}: TodoListFormProps) {
  const [name, setName] = useState(list?.name || "");
  const [description, setDescription] = useState(list?.description || "");
  const [isShared, setIsShared] = useState(list?.isShared || false);

  const utils = trpc.useContext();

  const createList = trpc.todoLists.create.useMutation({
    onSuccess: () => {
      utils.todoLists.getMyLists.invalidate();
      onSuccess?.();
      handleClose();
    },
  });

  const updateList = trpc.todoLists.update.useMutation({
    onSuccess: () => {
      utils.todoLists.getMyLists.invalidate();
      if (list) {
        utils.todoLists.getById.invalidate({ listId: list.id });
      }
      onSuccess?.();
      handleClose();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) return;

    if (list) {
      updateList.mutate({
        listId: list.id,
        name,
        description: description || undefined,
        isShared,
      });
    } else {
      createList.mutate({
        name,
        description: description || undefined,
        isShared,
      });
    }
  };

  const handleClose = () => {
    setName("");
    setDescription("");
    setIsShared(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{list ? "Edit List" : "Create New List"}</DialogTitle>
          <DialogDescription>
            {list
              ? "Update your todo list details"
              : "Create a new todo list to organize your tasks"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">List Name</Label>
              <Input
                id="name"
                placeholder="e.g., Project Tasks, Shopping List"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                placeholder="What is this list for?"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="shared">Shared List</Label>
                <p className="text-sm text-muted-foreground">
                  Allow others to view and collaborate
                </p>
              </div>
              <Switch
                id="shared"
                checked={isShared}
                onCheckedChange={setIsShared}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!name.trim() || createList.isPending || updateList.isPending}
            >
              {list ? "Save Changes" : "Create List"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
