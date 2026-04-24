import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  INVENTORY_ADJUSTMENT_REASONS,
  INVENTORY_ADJUSTMENT_REASON_LABELS,
  type InventoryAdjustmentReason,
} from "@shared/inventoryAdjustmentReasons";

export type AdjustQuantityDialogValues = {
  adjustment: number;
  adjustmentReason: InventoryAdjustmentReason;
  notes?: string;
};

type AdjustQuantityDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: AdjustQuantityDialogValues) => void;
  isPending?: boolean;
  currentQuantity?: number | string | null;
  currentQuantityLabel?: string;
  itemLabel?: string | null;
  title?: string;
  description?: string;
  submitLabel?: string;
  step?: string;
};

function formatCurrentQuantity(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === "") return null;
  const numericValue =
    typeof value === "number" ? value : Number.parseFloat(value);
  if (!Number.isFinite(numericValue)) return String(value);
  return numericValue.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

export function AdjustQuantityDialog({
  open,
  onOpenChange,
  onSubmit,
  isPending = false,
  currentQuantity,
  currentQuantityLabel = "Current on-hand",
  itemLabel,
  title = "Adjust Quantity",
  description = "Enter a positive or negative value to adjust on-hand quantity.",
  submitLabel = "Save",
  step = "1",
}: AdjustQuantityDialogProps) {
  const [adjustment, setAdjustment] = useState("");
  const [adjustmentReason, setAdjustmentReason] = useState<
    InventoryAdjustmentReason | ""
  >("");
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<{
    adjustment?: string;
    adjustmentReason?: string;
  }>({});

  useEffect(() => {
    if (!open) {
      setAdjustment("");
      setAdjustmentReason("");
      setNotes("");
      setErrors({});
    }
  }, [open]);

  const formattedCurrentQuantity = useMemo(
    () => formatCurrentQuantity(currentQuantity),
    [currentQuantity]
  );

  const validate = () => {
    const nextErrors: { adjustment?: string; adjustmentReason?: string } = {};
    const parsedAdjustment = Number.parseFloat(adjustment);

    if (!adjustment.trim()) {
      nextErrors.adjustment = "Adjustment amount is required.";
    } else if (!Number.isFinite(parsedAdjustment)) {
      nextErrors.adjustment = "Enter a valid number.";
    } else if (parsedAdjustment === 0) {
      nextErrors.adjustment = "Adjustment cannot be zero.";
    }

    if (!adjustmentReason) {
      nextErrors.adjustmentReason = "Select a reason.";
    }

    setErrors(nextErrors);
    return {
      isValid: Object.keys(nextErrors).length === 0,
      parsedAdjustment,
    };
  };

  const handleSubmit = () => {
    const { isValid, parsedAdjustment } = validate();
    if (!isValid || !adjustmentReason) return;

    onSubmit({
      adjustment: parsedAdjustment,
      adjustmentReason,
      notes: notes.trim() ? notes.trim() : undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {itemLabel ? (
            <p className="text-sm text-muted-foreground">{itemLabel}</p>
          ) : null}
          <div className="space-y-2">
            <Label htmlFor="qty-adjustment">Adjustment Amount</Label>
            <Input
              id="qty-adjustment"
              data-testid="qty-adjustment"
              name="quantity"
              type="number"
              step={step}
              placeholder="e.g., -5 (quantity)"
              value={adjustment}
              onChange={event => {
                setAdjustment(event.target.value);
                if (errors.adjustment) {
                  setErrors(currentErrors => ({
                    ...currentErrors,
                    adjustment: undefined,
                  }));
                }
              }}
            />
            {formattedCurrentQuantity !== null ? (
              <p className="text-xs text-muted-foreground">
                {currentQuantityLabel}: {formattedCurrentQuantity}
              </p>
            ) : null}
            {errors.adjustment ? (
              <p className="text-xs text-destructive">{errors.adjustment}</p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="qty-adjustment-reason">Reason</Label>
            <Select
              value={adjustmentReason}
              onValueChange={value => {
                setAdjustmentReason(value as InventoryAdjustmentReason);
                if (errors.adjustmentReason) {
                  setErrors(currentErrors => ({
                    ...currentErrors,
                    adjustmentReason: undefined,
                  }));
                }
              }}
            >
              <SelectTrigger
                id="qty-adjustment-reason"
                data-testid="qty-adjustment-reason"
              >
                <SelectValue placeholder="Select reason" />
              </SelectTrigger>
              <SelectContent>
                {INVENTORY_ADJUSTMENT_REASONS.map(reason => (
                  <SelectItem key={reason} value={reason}>
                    {INVENTORY_ADJUSTMENT_REASON_LABELS[reason]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.adjustmentReason ? (
              <p className="text-xs text-destructive">{errors.adjustmentReason}</p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="qty-adjustment-notes">
              Notes / Reason Details (Optional)
            </Label>
            <Textarea
              id="qty-adjustment-notes"
              data-testid="qty-adjustment-notes"
              name="reason"
              placeholder="Add reason details or extra context for this adjustment."
              value={notes}
              onChange={event => setNotes(event.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            data-testid="submit-adjustment"
            onClick={handleSubmit}
            disabled={isPending}
          >
            {isPending ? "Saving..." : submitLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
