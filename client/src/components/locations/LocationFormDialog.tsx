/**
 * LocationFormDialog - Create/Edit location dialog
 * Part of QA-063: Location & Warehouse Management UI
 */

import React, { useCallback, useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Loader2 } from "lucide-react";

export interface LocationFormData {
  id?: number;
  site: string;
  zone: string;
  rack: string;
  shelf: string;
  bin: string;
  isActive: boolean;
}

interface LocationFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: LocationFormData) => Promise<void>;
  initialData?: LocationFormData | null;
  isLoading?: boolean;
}

const defaultFormData: LocationFormData = {
  site: "",
  zone: "",
  rack: "",
  shelf: "",
  bin: "",
  isActive: true,
};

export const LocationFormDialog = React.memo(function LocationFormDialog({
  open,
  onOpenChange,
  onSubmit,
  initialData,
  isLoading = false,
}: LocationFormDialogProps): React.ReactElement {
  const [formData, setFormData] = useState<LocationFormData>(defaultFormData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const isEditing = Boolean(initialData?.id);

  useEffect(() => {
    if (open) {
      if (initialData) {
        setFormData({
          id: initialData.id,
          site: initialData.site || "",
          zone: initialData.zone || "",
          rack: initialData.rack || "",
          shelf: initialData.shelf || "",
          bin: initialData.bin || "",
          isActive: initialData.isActive ?? true,
        });
      } else {
        setFormData(defaultFormData);
      }
      setErrors({});
    }
  }, [open, initialData]);

  const handleChange = useCallback(
    (field: keyof LocationFormData) =>
      (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData((prev) => ({ ...prev, [field]: e.target.value }));
        if (errors[field]) {
          setErrors((prev) => {
            const next = { ...prev };
            delete next[field];
            return next;
          });
        }
      },
    [errors]
  );

  const handleSwitchChange = useCallback((checked: boolean) => {
    setFormData((prev) => ({ ...prev, isActive: checked }));
  }, []);

  const validate = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.site.trim()) {
      newErrors.site = "Site is required";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData.site]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!validate()) return;
      await onSubmit(formData);
    },
    [formData, onSubmit, validate]
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {isEditing ? "Edit Location" : "Create Location"}
            </DialogTitle>
            <DialogDescription>
              {isEditing
                ? "Update the location details below."
                : "Add a new warehouse location. Site is required."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="site">
                Site <span className="text-destructive">*</span>
              </Label>
              <Input
                id="site"
                placeholder="e.g., Main Warehouse"
                value={formData.site}
                onChange={handleChange("site")}
                aria-invalid={Boolean(errors.site)}
              />
              {errors.site && (
                <p className="text-sm text-destructive">{errors.site}</p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="zone">Zone</Label>
                <Input
                  id="zone"
                  placeholder="e.g., A"
                  value={formData.zone}
                  onChange={handleChange("zone")}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="rack">Rack</Label>
                <Input
                  id="rack"
                  placeholder="e.g., R1"
                  value={formData.rack}
                  onChange={handleChange("rack")}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="shelf">Shelf</Label>
                <Input
                  id="shelf"
                  placeholder="e.g., S1"
                  value={formData.shelf}
                  onChange={handleChange("shelf")}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="bin">Bin</Label>
                <Input
                  id="bin"
                  placeholder="e.g., B1"
                  value={formData.bin}
                  onChange={handleChange("bin")}
                />
              </div>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="space-y-0.5">
                <Label htmlFor="isActive">Active</Label>
                <p className="text-sm text-muted-foreground">
                  Inactive locations won't appear in selection lists
                </p>
              </div>
              <Switch
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={handleSwitchChange}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? "Save Changes" : "Create Location"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
});
