import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Trash2, AlertTriangle } from "lucide-react";

interface DeleteDraftModalProps {
  orderId: number;
  orderNumber: string;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function DeleteDraftModal({
  orderId,
  orderNumber,
  open,
  onClose,
  onSuccess,
}: DeleteDraftModalProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const deleteMutation = trpc.orders.deleteDraftOrder.useMutation();

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteMutation.mutateAsync({
        orderId,
      });

      toast.success(`Draft order ${orderNumber} deleted successfully`);

      onSuccess();
      onClose();
    } catch (error: unknown) {
      const description =
        error instanceof Error ? error.message : "Please try again";
      toast.error("Failed to delete draft order", {
        description,
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-destructive" />
            Delete Draft Order
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to delete this draft order? This action cannot
            be undone.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Order Info */}
          <div className="rounded-lg border p-4 space-y-2 bg-muted/50">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Order Number:</span>
              <span className="font-medium">{orderNumber}</span>
            </div>
          </div>

          {/* Warning */}
          <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
            <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium">This action cannot be undone</p>
              <p className="text-xs mt-1">
                The draft order will be permanently deleted from the system.
              </p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isDeleting}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting ? "Deleting..." : "Delete Draft"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
