/**
 * WSQA-002: Batch Selection Dialog for Flexible Lot Selection
 * Allows users to select specific batches/lots when fulfilling orders
 */
import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, Package, AlertCircle, Check } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

export interface BatchAllocation {
  batchId: number;
  quantity: number;
  unitCost: number;
}

interface BatchSelectionDialogProps {
  open: boolean;
  onClose: () => void;
  productId: number;
  productName: string;
  quantityNeeded: number;
  lineItemId?: number;
  onSelect: (allocations: BatchAllocation[]) => void;
}

export function BatchSelectionDialog({
  open,
  onClose,
  productId,
  productName,
  quantityNeeded,
  lineItemId,
  onSelect,
}: BatchSelectionDialogProps) {
  const [selectedBatches, setSelectedBatches] = useState<Map<number, number>>(new Map());

  // Fetch available batches for this product
  const { data: availableBatches, isLoading, error } = trpc.inventory.getAvailableForProduct.useQuery(
    { productId, minQuantity: 1 },
    { enabled: open && productId > 0 }
  );

  // Calculate totals
  const { totalSelected, totalCost, weightedAvgCost, isComplete, remaining } = useMemo(() => {
    let selected = 0;
    let cost = 0;

    selectedBatches.forEach((qty, batchId) => {
      selected += qty;
      const batch = availableBatches?.find(b => b.id === batchId);
      if (batch) {
        cost += qty * (batch.unitCogs ?? 0);
      }
    });

    return {
      totalSelected: selected,
      totalCost: cost,
      weightedAvgCost: selected > 0 ? cost / selected : 0,
      isComplete: Math.abs(selected - quantityNeeded) < 0.01,
      remaining: quantityNeeded - selected,
    };
  }, [selectedBatches, availableBatches, quantityNeeded]);

  const handleQuantityChange = (batchId: number, quantity: number, maxAvailable: number) => {
    const newMap = new Map(selectedBatches);
    if (quantity <= 0) {
      newMap.delete(batchId);
    } else {
      newMap.set(batchId, Math.min(quantity, maxAvailable));
    }
    setSelectedBatches(newMap);
  };

  const handleConfirm = () => {
    if (!availableBatches) return;

    const allocations: BatchAllocation[] = Array.from(selectedBatches.entries())
      .filter(([_, qty]) => qty > 0)
      .map(([batchId, quantity]) => {
        const batch = availableBatches.find(b => b.id === batchId);
        return {
          batchId,
          quantity,
          unitCost: batch?.unitCogs ?? 0,
        };
      });

    onSelect(allocations);
    onClose();
  };

  const handleSelectAll = (batchId: number, availableQty: number) => {
    const toSelect = Math.min(availableQty, Math.max(0, remaining));
    handleQuantityChange(batchId, toSelect, availableQty);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    try {
      return new Date(dateStr).toLocaleDateString();
    } catch {
      return dateStr;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Select Lots for {productName}
          </DialogTitle>
          <DialogDescription>
            Select {quantityNeeded} units from available batches. You can split across multiple lots.
          </DialogDescription>
        </DialogHeader>

        {/* Progress indicator */}
        <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium">
              Selected: {totalSelected} / {quantityNeeded}
            </span>
            {totalSelected > 0 && (
              <span className="text-sm text-muted-foreground">
                Avg Cost: {formatCurrency(weightedAvgCost)}
              </span>
            )}
          </div>
          <Badge variant={isComplete ? "default" : "secondary"}>
            {isComplete ? (
              <span className="flex items-center gap-1">
                <Check className="h-3 w-3" /> Ready
              </span>
            ) : (
              `Need ${remaining.toFixed(0)} more`
            )}
          </Badge>
        </div>

        {/* Batch table */}
        <div className="flex-1 overflow-auto border rounded-lg">
          {isLoading ? (
            <div className="flex items-center justify-center h-48">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-48 text-destructive">
              <AlertCircle className="h-5 w-5 mr-2" />
              Failed to load available batches
            </div>
          ) : availableBatches?.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-muted-foreground">
              No available inventory for this product
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Batch/SKU</TableHead>
                  <TableHead>Grade</TableHead>
                  <TableHead>Harvest Date</TableHead>
                  <TableHead className="text-right">Available</TableHead>
                  <TableHead className="text-right">Unit Cost</TableHead>
                  <TableHead className="w-32">Select Qty</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {availableBatches?.map(batch => {
                  const selectedQty = selectedBatches.get(batch.id) ?? 0;
                  return (
                    <TableRow key={batch.id} className={selectedQty > 0 ? "bg-primary/5" : ""}>
                      <TableCell>
                        <div className="font-medium">{batch.sku}</div>
                        <div className="text-xs text-muted-foreground">{batch.code}</div>
                      </TableCell>
                      <TableCell>
                        {batch.grade ? (
                          <Badge variant="outline">{batch.grade}</Badge>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell>{formatDate(batch.harvestDate)}</TableCell>
                      <TableCell className="text-right font-mono">
                        {batch.availableQty.toFixed(0)}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {batch.unitCogs !== null ? formatCurrency(batch.unitCogs) : "-"}
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min={0}
                          max={batch.availableQty}
                          value={selectedQty || ""}
                          onChange={(e) => handleQuantityChange(
                            batch.id,
                            parseInt(e.target.value) || 0,
                            batch.availableQty
                          )}
                          placeholder="0"
                          className="w-20 text-center"
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSelectAll(batch.id, batch.availableQty)}
                          disabled={remaining <= 0}
                        >
                          Fill
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>

        {/* Summary */}
        {totalSelected > 0 && (
          <div className="p-3 bg-muted/50 rounded-lg text-sm">
            <div className="flex justify-between">
              <span>Total Units:</span>
              <span className="font-medium">{totalSelected}</span>
            </div>
            <div className="flex justify-between">
              <span>Total Cost:</span>
              <span className="font-medium">{formatCurrency(totalCost)}</span>
            </div>
            <div className="flex justify-between">
              <span>Weighted Avg COGS:</span>
              <span className="font-medium">{formatCurrency(weightedAvgCost)}/unit</span>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={!isComplete}>
            {isComplete ? "Confirm Selection" : `Select ${remaining.toFixed(0)} more`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
