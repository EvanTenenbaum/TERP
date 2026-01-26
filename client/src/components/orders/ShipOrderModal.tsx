import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { AlertCircle } from "lucide-react";

interface ShipOrderModalProps {
  orderId: number;
  currentStatus: "PENDING" | "PACKED" | "SHIPPED";
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function ShipOrderModal({
  orderId,
  currentStatus,
  open,
  onClose,
  onSuccess,
}: ShipOrderModalProps) {
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateStatus = trpc.orders.updateOrderStatus.useMutation();

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const newStatus = currentStatus === "PENDING" ? "PACKED" : "SHIPPED";
      await updateStatus.mutateAsync({
        orderId,
        newStatus,
        notes: notes || undefined,
      });
      toast.success(`Order marked as ${newStatus.toLowerCase()}`);
      setNotes(""); // Reset notes
      onSuccess();
      onClose();
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to update order status";
      toast.error(message);
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const actionLabel =
    currentStatus === "PENDING" ? "Mark as Packed" : "Mark as Shipped";
  const warningText =
    currentStatus === "PACKED"
      ? "This will decrement inventory quantities and cannot be undone."
      : "";

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{actionLabel}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {warningText && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 text-sm text-yellow-800 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span>{warningText}</span>
            </div>
          )}
          <div>
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Add any notes about this status change..."
              rows={3}
              className="mt-1"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Processing..." : actionLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
