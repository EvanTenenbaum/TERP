import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createAdjustment } from "@/lib/inventoryOperations";
import { useToast } from "@/hooks/use-toast";

interface AdjustmentModalProps {
  open: boolean;
  onClose: () => void;
  inventoryId: string;
  inventoryName: string;
  currentQty: number;
}

export function AdjustmentModal({
  open,
  onClose,
  inventoryId,
  inventoryName,
  currentQty,
}: AdjustmentModalProps) {
  const [adjustmentType, setAdjustmentType] = useState<"add" | "subtract" | "set">("add");
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState("");
  const [reference, setReference] = useState("");
  const { toast } = useToast();

  const handleSubmit = () => {
    const qty = parseFloat(quantity);
    if (isNaN(qty) || qty <= 0) {
      toast({
        title: "Invalid Quantity",
        description: "Please enter a valid quantity",
        variant: "destructive",
      });
      return;
    }

    if (!reason.trim()) {
      toast({
        title: "Reason Required",
        description: "Please provide a reason for the adjustment",
        variant: "destructive",
      });
      return;
    }

    createAdjustment(inventoryId, adjustmentType, qty, reason, reference || undefined);

    toast({
      title: "Adjustment Created",
      description: `${inventoryName} inventory adjusted`,
    });

    onClose();
    setQuantity("");
    setReason("");
    setReference("");
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adjust Inventory: {inventoryName}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Current Quantity</Label>
            <Input value={currentQty} disabled />
          </div>

          <div>
            <Label>Adjustment Type</Label>
            <Select value={adjustmentType} onValueChange={(v: any) => setAdjustmentType(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="add">Add</SelectItem>
                <SelectItem value="subtract">Subtract</SelectItem>
                <SelectItem value="set">Set To</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Quantity</Label>
            <Input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="Enter quantity"
            />
          </div>

          <div>
            <Label>Reason *</Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Reason for adjustment"
            />
          </div>

          <div>
            <Label>Reference (Optional)</Label>
            <Input
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="Reference number"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>Create Adjustment</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
