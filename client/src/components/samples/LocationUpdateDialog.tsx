import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import type { SampleLocation } from "./SampleList";

export interface LocationUpdateFormValues {
  location: SampleLocation;
  notes?: string;
}

export interface LocationUpdateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: LocationUpdateFormValues) => Promise<void> | void;
  isSubmitting?: boolean;
  sampleId: number | null;
  currentLocation?: SampleLocation | null;
}

const formSchema = z.object({
  location: z.enum([
    "WAREHOUSE",
    "WITH_CLIENT",
    "WITH_SALES_REP",
    "RETURNED",
    "LOST",
  ]),
  notes: z.string().optional(),
});

const locationOptions = [
  { value: "WAREHOUSE", label: "Warehouse" },
  { value: "WITH_CLIENT", label: "With Client" },
  { value: "WITH_SALES_REP", label: "With Sales Rep" },
  { value: "RETURNED", label: "Returned" },
  { value: "LOST", label: "Lost" },
] as const;

export const LocationUpdateDialog = React.memo(function LocationUpdateDialog({
  open,
  onOpenChange,
  onSubmit,
  isSubmitting = false,
  sampleId: _sampleId,
  currentLocation,
}: LocationUpdateDialogProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<LocationUpdateFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      location: currentLocation || "WAREHOUSE",
      notes: "",
    },
  });

  const handleFormSubmit = handleSubmit(async values => {
    try {
      await onSubmit(values);
      reset();
      onOpenChange(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update location"
      );
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Update Sample Location</DialogTitle>
          <DialogDescription>
            Update the physical location of this sample.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleFormSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="location">New Location</Label>
            <select
              id="location"
              className="w-full rounded border border-input bg-background px-3 py-2 text-sm"
              disabled={isSubmitting}
              {...register("location")}
            >
              {locationOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {errors.location && (
              <p className="text-sm text-destructive">
                {errors.location.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              placeholder="Add any notes about this location change"
              disabled={isSubmitting}
              {...register("notes")}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Updating..." : "Update Location"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
});
