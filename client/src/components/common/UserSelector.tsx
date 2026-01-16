import React from "react";
import { Check, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface User {
  id: number;
  name: string | null;
  email: string | null;
}

interface UserSelectorProps {
  users: User[];
  selectedUserIds: number[];
  onSelectionChange: (userIds: number[]) => void;
  placeholder?: string;
  disabled?: boolean;
}

/**
 * UserSelector Component
 * 
 * A multi-select component for choosing users with a searchable dropdown.
 * Displays selected users as badges that can be removed.
 */
export function UserSelector({
  users,
  selectedUserIds,
  onSelectionChange,
  placeholder = "Select users...",
  disabled = false,
}: UserSelectorProps) {
  const [open, setOpen] = React.useState(false);
  const [deleteUserConfirm, setDeleteUserConfirm] = React.useState<number | null>(null);

  const selectedUsers = users.filter(user => selectedUserIds.includes(user.id));

  const toggleUser = (userId: number) => {
    if (selectedUserIds.includes(userId)) {
      onSelectionChange(selectedUserIds.filter(id => id !== userId));
    } else {
      onSelectionChange([...selectedUserIds, userId]);
    }
  };

  const removeUser = (userId: number) => {
    onSelectionChange(selectedUserIds.filter(id => id !== userId));
  };

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
            disabled={disabled}
          >
            {selectedUserIds.length === 0 ? (
              <span className="text-muted-foreground">{placeholder}</span>
            ) : (
              <span>
                {selectedUserIds.length} user{selectedUserIds.length !== 1 ? "s" : ""} selected
              </span>
            )}
            <Check className={cn("ml-2 h-4 w-4 shrink-0 opacity-50")} />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0" align="start">
          <Command>
            <CommandInput placeholder="Search users..." />
            <CommandEmpty>No users found.</CommandEmpty>
            <CommandGroup className="max-h-64 overflow-auto">
              {users.map(user => (
                <CommandItem
                  key={user.id}
                  value={`${user.name} ${user.email}`}
                  onSelect={() => toggleUser(user.id)}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      selectedUserIds.includes(user.id) ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <div className="flex flex-col">
                    <span className="font-medium">{user.name || "Unknown"}</span>
                    {user.email && (
                      <span className="text-xs text-muted-foreground">{user.email}</span>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Selected Users Badges */}
      {selectedUsers.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedUsers.map(user => (
            <Badge key={user.id} variant="secondary" className="gap-1">
              {user.name || user.email || "Unknown"}
              <button
                type="button"
                onClick={() => setDeleteUserConfirm(user.id)}
                className="ml-1 rounded-full hover:bg-muted"
                disabled={disabled}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
      <ConfirmDialog
        open={deleteUserConfirm !== null}
        onOpenChange={(open) => !open && setDeleteUserConfirm(null)}
        title="Remove User"
        description="Are you sure you want to remove this user from the selection?"
        confirmLabel="Remove"
        variant="destructive"
        onConfirm={() => {
          if (deleteUserConfirm) {
            removeUser(deleteUserConfirm);
          }
          setDeleteUserConfirm(null);
        }}
      />
    </div>
  );
}
