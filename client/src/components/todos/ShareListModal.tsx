import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { X, UserPlus } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

interface ShareListModalProps {
  listId: number;
  isOpen: boolean;
  onClose: () => void;
}

export function ShareListModal({
  listId,
  isOpen,
  onClose,
}: ShareListModalProps) {
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [role, setRole] = useState<"viewer" | "editor" | "owner">("editor");
  const [removeMemberId, setRemoveMemberId] = useState<number | null>(null);

  const utils = trpc.useContext();

  // Fetch list members
  const { data: members = [] } = trpc.todoLists.getMembers.useQuery(
    { listId },
    { enabled: isOpen }
  );

  // Fetch available users - using empty array for now since endpoint doesn't exist yet
  const users: any[] = [];

  // Add member mutation
  const addMember = trpc.todoLists.addMember.useMutation({
    onSuccess: () => {
      utils.todoLists.getMembers.invalidate({ listId });
      setSelectedUserId("");
      setRole("editor");
    },
  });

  // Remove member mutation
  const removeMember = trpc.todoLists.removeMember.useMutation({
    onSuccess: () => {
      utils.todoLists.getMembers.invalidate({ listId });
    },
  });

  // Update member role mutation
  const updateMemberRole = trpc.todoLists.updateMemberRole.useMutation({
    onSuccess: () => {
      utils.todoLists.getMembers.invalidate({ listId });
    },
  });

  const handleAddMember = () => {
    if (!selectedUserId) return;

    addMember.mutate({
      listId,
      userId: Number(selectedUserId),
      role,
    });
  };

  const handleRemoveMember = (userId: number) => {
    setRemoveMemberId(userId);
  };

  const confirmRemoveMember = () => {
    if (removeMemberId) {
      removeMember.mutate({ listId, userId: removeMemberId });
      setRemoveMemberId(null);
    }
  };

  const availableUsers = users.filter(
    (user: any) => !members.some((member) => member.userId === user.id)
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Share List</DialogTitle>
          <DialogDescription>
            Manage who has access to this todo list
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Add Member */}
          <div className="space-y-3">
            <Label>Add Member</Label>
            <div className="flex gap-2">
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Select a user" />
                </SelectTrigger>
                <SelectContent>
                  {availableUsers.map((user: any) => (
                    <SelectItem key={user.id} value={String(user.id)}>
                      {user.username} ({user.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={role} onValueChange={(v: any) => setRole(v)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="viewer">Viewer</SelectItem>
                  <SelectItem value="editor">Editor</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>

              <Button
                onClick={handleAddMember}
                disabled={!selectedUserId || addMember.isPending}
              >
                <UserPlus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Current Members */}
          <div className="space-y-3">
            <Label>Current Members ({members.length})</Label>
            <div className="border rounded-lg divide-y max-h-64 overflow-y-auto">
              {members.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  No members yet
                </div>
              ) : (
                members.map((member) => (
                  <div
                    key={member.userId}
                    className="flex items-center justify-between p-3"
                  >
                    <div className="flex-1">
                      <p className="font-medium">{member.userName}</p>
                      <p className="text-sm text-muted-foreground">
                        {member.userEmail}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <Select
                        value={member.role}
                        onValueChange={(newRole: any) =>
                          updateMemberRole.mutate({
                            listId,
                            userId: member.userId,
                            role: newRole,
                          })
                        }
                      >
                        <SelectTrigger className="w-28">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="viewer">Viewer</SelectItem>
                          <SelectItem value="editor">Editor</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>

                      {member.role !== "owner" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveMember(member.userId)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}

                      {member.role === "owner" && (
                        <Badge variant="secondary">Owner</Badge>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>

      <ConfirmDialog
        open={!!removeMemberId}
        onOpenChange={(open) => !open && setRemoveMemberId(null)}
        title="Remove Member"
        description="Are you sure you want to remove this member from the list?"
        confirmLabel="Remove"
        variant="destructive"
        onConfirm={confirmRemoveMember}
        isLoading={removeMember.isPending}
      />
    </Dialog>
  );
}
