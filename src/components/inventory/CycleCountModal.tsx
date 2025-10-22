import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { recordCycleCount } from "@/lib/inventoryOperations";
import { useToast } from "@/hooks/use-toast";

interface CycleCountModalProps {
  open: boolean;
  onClose: () => void;
  inventoryId: string;
  inventoryName: string;
  expectedQty: number;
}

export function CycleCountModal({
  open,
  onClose,
  inventoryId,
  inventoryName,
  expectedQty,
}: CycleCountModalProps) {
  const [countedQty, setCountedQty] = useState("");
  const [notes, setNotes] = useState("");
  const { toast } = useToast();

  const variance = countedQty ? parseFloat(countedQty) - expectedQty : 0;

  const handleSubmit = () => {
    const qty = parseFloat(countedQty);
    if (isNaN(qty) || qty < 0) {
      toast({
        title: "Invalid Count",
        description: "Please enter a valid counted quantity",
        variant: "destructive",
      });
      return;
    }

    const result = recordCycleCount(inventoryId, expectedQty, qty, notes || undefined);

    toast({
      title: "Cycle Count Recorded",
      description: variance !== 0 
        ? `Variance: ${variance > 0 ? '+' : ''}${variance}. Adjustment created.`
        : "Count matches expected quantity",
    });

    onClose();
    setCountedQty("");
    setNotes("");
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cycle Count: {inventoryName}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Expected Quantity</Label>
            <Input value={expectedQty} disabled />
          </div>

          <div>
            <Label>Counted Quantity *</Label>
            <Input
              type="number"
              value={countedQty}
              onChange={(e) => setCountedQty(e.target.value)}
              placeholder="Enter counted quantity"
            />
          </div>

          {countedQty && (
            <div>
              <Label>Variance</Label>
              <Input
                value={variance}
                disabled
                className={variance !== 0 ? "text-destructive font-bold" : ""}
              />
            </div>
          )}

          <div>
            <Label>Notes (Optional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any notes about the count"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>Record Count</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
