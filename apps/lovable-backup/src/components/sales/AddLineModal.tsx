import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { mockInventory, mockBatches, mockSalesConstraints, mockUOMs } from "@/lib/mockData";
import { getPrice } from "@/lib/pricing";
import { validateConstraints } from "@/lib/constraints";
import { AlertTriangle, CheckCircle2 } from "lucide-react";

interface AddLineModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (line: any) => void;
  clientId: string;
}

export function AddLineModal({ open, onOpenChange, onAdd, clientId }: AddLineModalProps) {
  const [selectedItemId, setSelectedItemId] = useState("");
  const [qty, setQty] = useState("");
  const [selectedUOM, setSelectedUOM] = useState("");
  const [promoCode, setPromoCode] = useState("");
  
  const selectedItem = mockInventory.find(i => i.id === selectedItemId);
  const constraint = mockSalesConstraints.find(c => c.inventory_id === selectedItemId);
  const uoms = mockUOMs.filter(u => u.inventory_id === selectedItemId);
  const batches = mockBatches.filter(b => b.inventory_id === selectedItemId && b.status === "Available");
  
  // COA verification
  const hasCOA = batches.some(b => b.coa_verified);
  const coaGate = !hasCOA;
  
  // Constraint validation
  const constraintResult = constraint && qty
    ? validateConstraints(constraint, parseFloat(qty))
    : { valid: true, message: "" };
  
  // Price calculation
  const priceResult = selectedItem && qty
    ? getPrice(
        clientId,
        selectedItemId,
        new Date(),
        selectedUOM || undefined,
        promoCode || undefined
      )
    : null;

  const canAdd = selectedItemId && qty && constraintResult.valid && !coaGate && parseFloat(qty) > 0;

  const handleAdd = () => {
    if (!canAdd || !priceResult) return;

    onAdd({
      id: `line-${Date.now()}`,
      inventory_id: selectedItemId,
      inventory_name: selectedItem?.strain_name || "",
      qty: parseFloat(qty),
      uom: selectedUOM || undefined,
      unit_price: priceResult.unit_price,
      promo_code: promoCode || undefined,
      price_source: priceResult.price_source,
      line_total: priceResult.unit_price * parseFloat(qty),
    });

    // Reset
    setSelectedItemId("");
    setQty("");
    setSelectedUOM("");
    setPromoCode("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add Line Item</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Item</Label>
            <Select value={selectedItemId} onValueChange={setSelectedItemId}>
              <SelectTrigger>
                <SelectValue placeholder="Select item..." />
              </SelectTrigger>
              <SelectContent>
                {mockInventory.filter(i => !i.archived && i.qty_available > 0).map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.strain_name} - {item.type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedItem && (
            <>
              {coaGate && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    No verified COA available for this item. Cannot add to order.
                  </AlertDescription>
                </Alert>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Quantity</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={qty}
                    onChange={(e) => setQty(e.target.value)}
                    placeholder={constraint ? `Min: ${constraint.moq}` : "0"}
                  />
                  {!constraintResult.valid && (
                    <p className="text-xs text-destructive">{constraintResult.message}</p>
                  )}
                </div>

                {uoms.length > 0 && (
                  <div className="space-y-2">
                    <Label>Unit of Measure</Label>
                    <Select value={selectedUOM} onValueChange={setSelectedUOM}>
                      <SelectTrigger>
                        <SelectValue placeholder="Base unit" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Base Unit</SelectItem>
                        {uoms.map((uom) => (
                          <SelectItem key={uom.id} value={uom.id}>
                            {uom.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>Promo Code (Optional)</Label>
                <Input
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                  placeholder="PROMO20"
                />
              </div>

              {priceResult && (
                <div className="rounded-lg border bg-muted/50 p-4 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Unit Price:</span>
                    <span className="font-semibold">${priceResult.unit_price.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Line Total:</span>
                    <span className="font-semibold text-lg">
                      ${(priceResult.unit_price * parseFloat(qty || "0")).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 pt-2 border-t">
                    <Badge variant="outline" className="text-xs">
                      {priceResult.price_source}
                    </Badge>
                    {hasCOA && (
                      <Badge variant="outline" className="text-xs bg-success/10 text-success">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        COA Verified
                      </Badge>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleAdd} disabled={!canAdd}>
            Add Line
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
