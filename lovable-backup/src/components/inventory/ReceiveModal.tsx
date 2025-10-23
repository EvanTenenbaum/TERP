import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { mockLocationBins } from "@/lib/mockData";
import { AlertTriangle, Upload } from "lucide-react";
import { createAuditEntry } from "@/lib/audit";
import { toast } from "sonner";

interface ReceiveModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onReceive: (data: any) => void;
  poLine: {
    id: string;
    inventory_id: string;
    inventory_name?: string;
    qty_ordered: number;
    qty_received: number;
  };
}

export function ReceiveModal({ open, onOpenChange, onReceive, poLine }: ReceiveModalProps) {
  const [qtyReceiving, setQtyReceiving] = useState("");
  const [qtyDamaged, setQtyDamaged] = useState("");
  const [binId, setBinId] = useState("");
  const [lotNumber, setLotNumber] = useState("");
  const [coaFile, setCoaFile] = useState<File | null>(null);
  const [notes, setNotes] = useState("");

  const remaining = poLine.qty_ordered - poLine.qty_received;
  const receiving = parseFloat(qtyReceiving || "0");
  const damaged = parseFloat(qtyDamaged || "0");
  const actualReceived = receiving - damaged;
  
  const hasShortage = actualReceived < remaining;
  const canReceive = receiving > 0 && binId && lotNumber && coaFile;

  const handleReceive = () => {
    if (!canReceive) return;

    const receiptData = {
      line_id: poLine.id,
      qty_received: receiving,
      qty_damaged: damaged > 0 ? damaged : undefined,
      bin_id: binId,
      lot_number: lotNumber,
      coa_file: coaFile,
      notes: notes || undefined,
      create_discrepancy: hasShortage || damaged > 0,
      received_at: new Date().toISOString()
    };

    onReceive(receiptData);

    createAuditEntry({
      action: "receive_inventory",
      entity_type: "po_line",
      entity_id: poLine.id,
      after: receiptData,
      ui_context: "ReceiveModal"
    });

    toast.success(`Received ${receiving} units${damaged > 0 ? ` (${damaged} damaged)` : ""}`);

    // Reset
    setQtyReceiving("");
    setQtyDamaged("");
    setBinId("");
    setLotNumber("");
    setCoaFile(null);
    setNotes("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>Receive: {poLine.inventory_name || poLine.inventory_id}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="rounded-lg bg-muted/50 p-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Ordered:</span>
              <span className="font-medium">{poLine.qty_ordered}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Previously Received:</span>
              <span className="font-medium">{poLine.qty_received}</span>
            </div>
            <div className="flex justify-between pt-2 border-t">
              <span className="text-muted-foreground">Remaining:</span>
              <span className="font-semibold">{remaining}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Quantity Receiving *</Label>
              <Input
                type="number"
                step="0.01"
                value={qtyReceiving}
                onChange={(e) => setQtyReceiving(e.target.value)}
                placeholder="0"
              />
            </div>

            <div className="space-y-2">
              <Label>Damaged Quantity</Label>
              <Input
                type="number"
                step="0.01"
                value={qtyDamaged}
                onChange={(e) => setQtyDamaged(e.target.value)}
                placeholder="0"
              />
            </div>
          </div>

          {(hasShortage || damaged > 0) && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                A discrepancy will be created for{" "}
                {damaged > 0 && `${damaged} damaged units`}
                {damaged > 0 && hasShortage && " and "}
                {hasShortage && `${remaining - actualReceived} short units`}.
              </AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Lot Number *</Label>
              <Input
                value={lotNumber}
                onChange={(e) => setLotNumber(e.target.value)}
                placeholder="LOT12345"
              />
            </div>

            <div className="space-y-2">
              <Label>Storage Bin *</Label>
              <Select value={binId} onValueChange={setBinId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select bin..." />
                </SelectTrigger>
                <SelectContent>
                  {mockLocationBins.map((bin) => (
                    <SelectItem key={bin.id} value={bin.id}>
                      {bin.name} {bin.description && `- ${bin.description}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>COA Upload *</Label>
            <div className="flex items-center gap-2">
              <Input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => setCoaFile(e.target.files?.[0] || null)}
                className="flex-1"
              />
              {coaFile && (
                <span className="text-sm text-success">
                  ✓ {coaFile.name}
                </span>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any additional notes..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleReceive} disabled={!canReceive}>
            <Upload className="h-4 w-4 mr-2" />
            Receive Items
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
