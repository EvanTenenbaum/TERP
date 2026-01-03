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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export interface VendorShipFormValues {
  trackingNumber: string;
}

export interface VendorShipDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: VendorShipFormValues) => Promise<void> | void;
  isSubmitting?: boolean;
  sampleId: number | null;
}

const formSchema = z.object({
  trackingNumber: z.string().min(1, { message: "Tracking number is required" }),
});

export const VendorShipDialog = React.memo(function VendorShipDialog({
  open,
  onOpenChange,
  onSubmit,
  isSubmitting = false,
  sampleId: _sampleId,
}: VendorShipDialogProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<VendorShipFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      trackingNumber: "",
    },
  });

  const handleFormSubmit = handleSubmit(async values => {
    try {
      await onSubmit(values);
      reset();
      onOpenChange(false);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to submit tracking number"
      );
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Ship to Vendor</DialogTitle>
          <DialogDescription>
            Enter the tracking number for this vendor return shipment.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleFormSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="trackingNumber">Tracking Number</Label>
            <Input
              id="trackingNumber"
              placeholder="Enter tracking number"
              disabled={isSubmitting}
              {...register("trackingNumber")}
            />
            {errors.trackingNumber && (
              <p className="text-sm text-destructive">
                {errors.trackingNumber.message}
              </p>
            )}
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
              {isSubmitting ? "Shipping..." : "Mark as Shipped"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
});
