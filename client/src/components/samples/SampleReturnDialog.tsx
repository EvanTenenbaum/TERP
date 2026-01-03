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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export type ReturnType = "sample" | "vendor";

export interface SampleReturnFormValues {
  reason: string;
  condition: "GOOD" | "DAMAGED" | "OPENED" | "EXPIRED";
  returnDate?: string;
  trackingNumber?: string;
}

export interface SampleReturnDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: SampleReturnFormValues) => Promise<void> | void;
  type: ReturnType;
  isSubmitting?: boolean;
  sampleId: number | null;
}

const formSchema = z.object({
  reason: z.string().min(1, { message: "Reason is required" }),
  condition: z.enum(["GOOD", "DAMAGED", "OPENED", "EXPIRED"]),
  returnDate: z.string().optional(),
  trackingNumber: z.string().optional(),
});

const conditionOptions = [
  { value: "GOOD", label: "Good Condition" },
  { value: "DAMAGED", label: "Damaged" },
  { value: "OPENED", label: "Opened/Used" },
  { value: "EXPIRED", label: "Expired" },
] as const;

export const SampleReturnDialog = React.memo(function SampleReturnDialog({
  open,
  onOpenChange,
  onSubmit,
  type,
  isSubmitting = false,
  sampleId: _sampleId,
}: SampleReturnDialogProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<SampleReturnFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      reason: "",
      condition: "GOOD",
      returnDate: "",
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
          : "Failed to submit return request"
      );
    }
  });

  const title =
    type === "sample" ? "Request Sample Return" : "Request Vendor Return";
  const description =
    type === "sample"
      ? "Submit a request to return this sample. An admin will review and approve the return."
      : "Submit a request to return this sample to the vendor.";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleFormSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="reason">Reason for Return</Label>
            <Textarea
              id="reason"
              placeholder="Explain why this sample needs to be returned"
              disabled={isSubmitting}
              {...register("reason")}
            />
            {errors.reason && (
              <p className="text-sm text-destructive">
                {errors.reason.message}
              </p>
            )}
          </div>

          {type === "sample" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="condition">Sample Condition</Label>
                <select
                  id="condition"
                  className="w-full rounded border border-input bg-background px-3 py-2 text-sm"
                  disabled={isSubmitting}
                  {...register("condition")}
                >
                  {conditionOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                {errors.condition && (
                  <p className="text-sm text-destructive">
                    {errors.condition.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="returnDate">Expected Return Date</Label>
                <Input
                  id="returnDate"
                  type="date"
                  disabled={isSubmitting}
                  {...register("returnDate")}
                />
              </div>
            </>
          )}

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
              {isSubmitting ? "Submitting..." : "Submit Request"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
});
