/**
 * SaveViewDialog Component
 * Dialog for saving current filter/sort configuration as a named view
 * SALES-SHEET-IMPROVEMENTS: New component for saved views functionality
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Save, Star, Globe } from "lucide-react";
import { toast } from "sonner";
import type {
  InventoryFilters,
  InventorySortConfig,
  ColumnVisibility,
} from "./types";

interface SaveViewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: number;
  clientName?: string;
  filters: InventoryFilters;
  sort: InventorySortConfig;
  columnVisibility: ColumnVisibility;
  onSaved?: (viewId: number) => void;
}

export function SaveViewDialog({
  open,
  onOpenChange,
  clientId,
  clientName,
  filters,
  sort,
  columnVisibility,
  onSaved,
}: SaveViewDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isDefault, setIsDefault] = useState(false);
  const [isUniversal, setIsUniversal] = useState(false);

  const utils = trpc.useUtils();

  const saveViewMutation = trpc.salesSheets.saveView.useMutation({
    onSuccess: (data) => {
      utils.salesSheets.getViews.invalidate({ clientId });
      toast.success("View saved successfully");
      onSaved?.(data.viewId);
      handleClose();
    },
    onError: (error) => {
      toast.error("Failed to save view: " + error.message);
    },
  });

  const handleClose = () => {
    setName("");
    setDescription("");
    setIsDefault(false);
    setIsUniversal(false);
    onOpenChange(false);
  };

  const handleSave = () => {
    if (!name.trim()) {
      toast.error("Please enter a view name");
      return;
    }

    saveViewMutation.mutate({
      name: name.trim(),
      description: description.trim() || undefined,
      clientId: isUniversal ? undefined : clientId,
      filters,
      sort,
      columnVisibility,
      isDefault: isUniversal ? false : isDefault,
    });
  };

  // Count active filters for preview
  const activeFilterCount = (() => {
    let count = 0;
    if (filters.search) count++;
    if (filters.categories.length > 0) count++;
    if (filters.grades.length > 0) count++;
    if (filters.strainFamilies.length > 0) count++;
    if (filters.vendors.length > 0) count++;
    if (filters.priceMin !== null || filters.priceMax !== null) count++;
    if (filters.inStockOnly) count++;
    return count;
  })();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Save className="h-5 w-5" />
            Save View
          </DialogTitle>
          <DialogDescription>
            Save your current filter and sort configuration for quick access
            later.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* View Name */}
          <div className="space-y-2">
            <Label htmlFor="view-name">View Name</Label>
            <Input
              id="view-name"
              placeholder="e.g., Premium Flower, Budget Options..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={255}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="view-description">
              Description{" "}
              <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Textarea
              id="view-description"
              placeholder="What is this view for?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={500}
              rows={2}
            />
          </div>

          {/* Universal Toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-muted-foreground" />
              <Label htmlFor="is-universal" className="cursor-pointer">
                Universal view (available for all clients)
              </Label>
            </div>
            <Switch
              id="is-universal"
              checked={isUniversal}
              onCheckedChange={setIsUniversal}
            />
          </div>

          {/* Set as Default */}
          {!isUniversal && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Star className="h-4 w-4 text-muted-foreground" />
                <Label htmlFor="is-default" className="cursor-pointer">
                  Set as default for {clientName || "this client"}
                </Label>
              </div>
              <Switch
                id="is-default"
                checked={isDefault}
                onCheckedChange={setIsDefault}
              />
            </div>
          )}

          {/* Preview of what's being saved */}
          <div className="rounded-lg border bg-muted/50 p-3 space-y-2">
            <Label className="text-xs text-muted-foreground">
              Configuration Preview
            </Label>
            <div className="flex flex-wrap gap-1">
              <Badge variant="outline">
                {activeFilterCount} filter{activeFilterCount !== 1 ? "s" : ""}
              </Badge>
              <Badge variant="outline">
                Sort: {sort.field} ({sort.direction})
              </Badge>
              {filters.categories.length > 0 && (
                <Badge variant="secondary">
                  {filters.categories.length} categor
                  {filters.categories.length !== 1 ? "ies" : "y"}
                </Badge>
              )}
              {filters.grades.length > 0 && (
                <Badge variant="secondary">
                  {filters.grades.length} grade{filters.grades.length !== 1 ? "s" : ""}
                </Badge>
              )}
              {filters.inStockOnly && (
                <Badge variant="secondary">In Stock Only</Badge>
              )}
              {(filters.priceMin !== null || filters.priceMax !== null) && (
                <Badge variant="secondary">
                  ${filters.priceMin ?? 0} - ${filters.priceMax ?? "max"}
                </Badge>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!name.trim() || saveViewMutation.isPending}
          >
            {saveViewMutation.isPending ? "Saving..." : "Save View"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
