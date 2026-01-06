import React, { useState, useEffect } from "react";
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
import { UserSelector } from "@/components/common/UserSelector";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

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
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);

  const utils = trpc.useContext();

  // Fetch available users for sharing - handle paginated response
  const { data: usersData } = trpc.users.list.useQuery();
  const availableUsers: any[] = usersData ? (Array.isArray(usersData) ? usersData : ((usersData as any)?.items ?? [])) : [];

  // Fetch current list members if editing - handle paginated response
  const { data: membersData } = trpc.todoLists.getMembers.useQuery(
    { listId: list?.id || 0 },
    { enabled: !!list?.id }
  );
  const currentMembers = Array.isArray(membersData) ? membersData : (membersData?.items ?? []);

  // Update selected users when editing and members are loaded
  useEffect(() => {
    if (list && currentMembers.length > 0) {
      const memberUserIds = currentMembers.map((m: any) => m.userId);
      setSelectedUserIds(memberUserIds);
    }
  }, [list, currentMembers]);

  const createList = trpc.todoLists.create.useMutation({
    onSuccess: async (newList) => {
      // If shared and users selected, add them as members
      if (isShared && selectedUserIds.length > 0) {
        try {
          // Add each selected user as a member
          for (const userId of selectedUserIds) {
            await addMember.mutateAsync({
              listId: newList.id,
              userId,
              role: "editor",
            });
          }
          toast.success(`List created and shared with ${selectedUserIds.length} user(s)`);
        } catch (error) {
          toast.error("List created but failed to add some members");
        }
      } else {
        toast.success("List created successfully");
      }

      utils.todoLists.getMyLists.invalidate();
      onSuccess?.();
      handleClose();
    },
    onError: () => {
      toast.error("Failed to create list");
    },
  });

  const updateList = trpc.todoLists.update.useMutation({
    onSuccess: async () => {
      // Update list members if shared
      if (list && isShared) {
        try {
          const currentMemberIds = currentMembers.map(m => m.userId);
          
          // Add new members
          const usersToAdd = selectedUserIds.filter(id => !currentMemberIds.includes(id));
          for (const userId of usersToAdd) {
            await addMember.mutateAsync({
              listId: list.id,
              userId,
              role: "editor",
            });
          }

          // Remove members no longer selected
          const usersToRemove = currentMemberIds.filter(id => !selectedUserIds.includes(id));
          for (const userId of usersToRemove) {
            await removeMember.mutateAsync({
              listId: list.id,
              userId,
            });
          }

          toast.success("List updated successfully");
        } catch (error) {
          toast.error("List updated but failed to update some members");
        }
      } else {
        toast.success("List updated successfully");
      }

      utils.todoLists.getMyLists.invalidate();
      if (list) {
        utils.todoLists.getById.invalidate({ listId: list.id });
        utils.todoLists.getMembers.invalidate({ listId: list.id });
      }
      onSuccess?.();
      handleClose();
    },
    onError: () => {
      toast.error("Failed to update list");
    },
  });

  const addMember = trpc.todoLists.addMember.useMutation();
  const removeMember = trpc.todoLists.removeMember.useMutation();

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
    setSelectedUserIds([]);
    onClose();
  };

  // Reset form when opening
  useEffect(() => {
    if (isOpen) {
      setName(list?.name || "");
      setDescription(list?.description || "");
      setIsShared(list?.isShared || false);
      if (!list) {
        setSelectedUserIds([]);
      }
    }
  }, [isOpen, list]);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="w-full sm:max-w-md">
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

            {/* User Selection - only shown when isShared is true */}
            {isShared && (
              <div className="space-y-2">
                <Label>Share With</Label>
                <UserSelector
                  users={availableUsers}
                  selectedUserIds={selectedUserIds}
                  onSelectionChange={setSelectedUserIds}
                  placeholder="Select users to share with..."
                  disabled={createList.isPending || updateList.isPending}
                />
                <p className="text-xs text-muted-foreground">
                  Selected users will be able to view and edit this list
                </p>
              </div>
            )}
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
