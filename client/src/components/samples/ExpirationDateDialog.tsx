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
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export interface ExpirationDateFormValues {
  expirationDate: string;
}

export interface ExpirationDateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: ExpirationDateFormValues) => Promise<void> | void;
  isSubmitting?: boolean;
  sampleId: number | null;
  currentExpirationDate?: string | null;
}

const formSchema = z.object({
  expirationDate: z.string().min(1, "Expiration date is required"),
});

export const ExpirationDateDialog = React.memo(function ExpirationDateDialog({
  open,
  onOpenChange,
  onSubmit,
  isSubmitting = false,
  sampleId: _sampleId,
  currentExpirationDate,
}: ExpirationDateDialogProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ExpirationDateFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      expirationDate: currentExpirationDate ?? "",
    },
  });

  const handleFormSubmit = handleSubmit(async values => {
    try {
      await onSubmit(values);
      reset();
      onOpenChange(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to set expiration date"
      );
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Set Expiration Date</DialogTitle>
          <DialogDescription>
            Set or update the expiration date for this sample.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleFormSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="expirationDate">Expiration Date</Label>
            <Input
              id="expirationDate"
              type="date"
              disabled={isSubmitting}
              {...register("expirationDate")}
            />
            {errors.expirationDate && (
              <p className="text-sm text-destructive">
                {errors.expirationDate.message}
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
              {isSubmitting ? "Saving..." : "Set Expiration Date"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
});
