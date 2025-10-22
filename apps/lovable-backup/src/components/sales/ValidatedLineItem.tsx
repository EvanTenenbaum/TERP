import { useEffect, useState } from "react";
import { TableCell, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Trash2, AlertCircle } from "lucide-react";
import { validateConstraints, applyConstraints } from "@/lib/constraints";
import { mockSalesConstraints } from "@/lib/mockData";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface ValidatedLineItemProps {
  line: {
    id: string;
    inventory_id: string;
    inventory_name: string;
    qty: number;
    unit_price: number;
    line_total: number;
  };
  onUpdate: (id: string, qty: number) => void;
  onRemove: (id: string) => void;
}

export function ValidatedLineItem({ line, onUpdate, onRemove }: ValidatedLineItemProps) {
  const [qty, setQty] = useState(line.qty.toString());
  const [validationError, setValidationError] = useState<string | null>(null);
  const [wasAdjusted, setWasAdjusted] = useState(false);

  useEffect(() => {
    const qtyNum = parseFloat(qty);
    if (isNaN(qtyNum) || qtyNum <= 0) {
      setValidationError("Quantity must be greater than 0");
      return;
    }

    const constraint = mockSalesConstraints.find((c) => c.inventory_id === line.inventory_id);
    if (constraint) {
      const validation = validateConstraints(constraint, qtyNum);
      if (!validation.valid) {
        setValidationError(validation.message);
        return;
      }

      const adjustment = applyConstraints(line.inventory_id, qtyNum);
      if (adjustment.was_rounded) {
        setWasAdjusted(true);
        setQty(adjustment.adjusted_qty.toString());
        onUpdate(line.id, adjustment.adjusted_qty);
      } else {
        setWasAdjusted(false);
        onUpdate(line.id, qtyNum);
      }
    } else {
      onUpdate(line.id, qtyNum);
    }

    setValidationError(null);
  }, [qty, line.inventory_id, line.id, onUpdate]);

  return (
    <TableRow className={validationError ? "bg-destructive/10" : ""}>
      <TableCell>{line.inventory_name}</TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            className={validationError ? "border-destructive" : ""}
          />
          {(validationError || wasAdjusted) && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <AlertCircle className={`h-4 w-4 ${validationError ? "text-destructive" : "text-warning"}`} />
                </TooltipTrigger>
                <TooltipContent>
                  <p>{validationError || "Quantity was automatically adjusted to meet constraints"}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </TableCell>
      <TableCell>${line.unit_price.toFixed(2)}</TableCell>
      <TableCell>${line.line_total.toFixed(2)}</TableCell>
      <TableCell>
        <Button variant="ghost" size="sm" onClick={() => onRemove(line.id)}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </TableCell>
    </TableRow>
  );
}
