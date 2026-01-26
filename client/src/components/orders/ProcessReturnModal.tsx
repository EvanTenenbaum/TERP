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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { PackageX } from "lucide-react";

interface ProcessReturnModalProps {
  orderId: number;
  orderItems: Array<{ batchId: number; displayName: string; quantity: number }>;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function ProcessReturnModal({
  orderId,
  orderItems,
  open,
  onClose,
  onSuccess,
}: ProcessReturnModalProps) {
  const [selectedItems, setSelectedItems] = useState<Record<number, number>>(
    {}
  );
  const [reason, setReason] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const processReturn = trpc.orders.processReturn.useMutation();

  const handleItemToggle = (batchId: number, maxQty: number) => {
    if (selectedItems[batchId]) {
      const newItems = { ...selectedItems };
      delete newItems[batchId];
      setSelectedItems(newItems);
    } else {
      setSelectedItems({ ...selectedItems, [batchId]: maxQty });
    }
  };

  const handleQuantityChange = (batchId: number, quantity: number) => {
    setSelectedItems({ ...selectedItems, [batchId]: quantity });
  };

  const handleSubmit = async () => {
    if (Object.keys(selectedItems).length === 0) {
      toast.error("Please select at least one item to return");
      return;
    }
    if (!reason) {
      toast.error("Please select a return reason");
      return;
    }

    setIsSubmitting(true);
    try {
      const items = Object.entries(selectedItems).map(
        ([batchId, quantity]) => ({
          batchId: parseInt(batchId),
          quantity,
        })
      );

      await processReturn.mutateAsync({
        orderId,
        items,
        reason: reason as
          | "DEFECTIVE"
          | "WRONG_ITEM"
          | "NOT_AS_DESCRIBED"
          | "CUSTOMER_CHANGED_MIND"
          | "OTHER",
        notes: notes || undefined,
      });

      toast.success("Return processed successfully");
      setSelectedItems({});
      setReason("");
      setNotes("");
      onSuccess();
      onClose();
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to process return";
      toast.error(message);
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="w-full sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PackageX className="h-5 w-5" />
            Process Return
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Items Selection */}
          <div>
            <Label>Select Items to Return</Label>
            <div className="mt-2 space-y-2 border rounded-lg p-3 max-h-60 overflow-y-auto">
              {orderItems.map(item => (
                <div
                  key={item.batchId}
                  className="flex items-center gap-3 p-2 hover:bg-muted/50 rounded"
                >
                  <Checkbox
                    checked={!!selectedItems[item.batchId]}
                    onCheckedChange={() =>
                      handleItemToggle(item.batchId, item.quantity)
                    }
                  />
                  <div className="flex-1">
                    <div className="font-medium">{item.displayName}</div>
                    <div className="text-sm text-muted-foreground">
                      Max quantity: {item.quantity}
                    </div>
                  </div>
                  {selectedItems[item.batchId] !== undefined && (
                    <input
                      type="number"
                      min="1"
                      max={item.quantity}
                      value={selectedItems[item.batchId]}
                      onChange={e =>
                        handleQuantityChange(
                          item.batchId,
                          parseInt(e.target.value) || 1
                        )
                      }
                      className="w-20 px-2 py-1 border rounded text-center"
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Return Reason */}
          <div>
            <Label htmlFor="reason">Return Reason *</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger id="reason" className="mt-1">
                <SelectValue placeholder="Select a reason..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="DEFECTIVE">Defective</SelectItem>
                <SelectItem value="WRONG_ITEM">Wrong Item</SelectItem>
                <SelectItem value="NOT_AS_DESCRIBED">
                  Not as Described
                </SelectItem>
                <SelectItem value="CUSTOMER_CHANGED_MIND">
                  Customer Changed Mind
                </SelectItem>
                <SelectItem value="OTHER">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div>
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Add any additional notes about this return..."
              rows={3}
              className="mt-1"
            />
          </div>

          {/* Summary */}
          {Object.keys(selectedItems).length > 0 && (
            <div className="bg-muted/50 rounded-lg p-3">
              <div className="font-medium mb-1">Return Summary</div>
              <div className="text-sm text-muted-foreground">
                {Object.keys(selectedItems).length} item(s) selected
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Processing..." : "Process Return"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
