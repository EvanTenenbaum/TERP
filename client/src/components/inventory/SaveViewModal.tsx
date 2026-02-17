import React, { useState } from "react";
import { trpc } from "@/lib/trpc";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import type { InventoryFilters } from "@/hooks/useInventoryFilters";

interface SaveViewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filters: InventoryFilters;
  onSuccess: () => void;
}

export function SaveViewModal({
  open,
  onOpenChange,
  filters,
  onSuccess,
}: SaveViewModalProps) {
  const [name, setName] = useState("");
  const [isShared, setIsShared] = useState(false);

  const saveView = trpc.inventory.views.save.useMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("View name is required");
      return;
    }

    try {
      await saveView.mutateAsync({
        name: name.trim(),
        filters: filters as unknown as Record<string, unknown>,
        isShared,
      });

      toast.success("View saved successfully");

      // Reset form
      setName("");
      setIsShared(false);

      onSuccess();
      onOpenChange(false);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to save view";
      toast.error(message);
      console.error(error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Save Current View</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">View Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g., Low Stock Electronics"
              required
              maxLength={100}
            />
            <p className="text-xs text-muted-foreground">
              Give this filter combination a memorable name
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="isShared"
              checked={isShared}
              onCheckedChange={checked => setIsShared(checked as boolean)}
            />
            <Label
              htmlFor="isShared"
              className="text-sm font-normal cursor-pointer"
            >
              Share with team (visible to all users)
            </Label>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saveView.isPending}>
              {saveView.isPending ? "Saving..." : "Save View"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
