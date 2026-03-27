import { useEffect, useState } from "react";
import {
  INVENTORY_ADJUSTMENT_REASONS,
  INVENTORY_ADJUSTMENT_REASON_LABELS,
  type InventoryAdjustmentReason,
} from "@shared/inventoryAdjustmentReasons";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export interface AdjustmentContextDrawerProps {
  isOpen: boolean;
  batchId: number;
  sku: string;
  productName: string;
  previousValue: number;
  currentValue: number;
  isPending?: boolean;
  onApply: (context: {
    reason: InventoryAdjustmentReason;
    notes: string;
  }) => void;
  onCancel: () => void;
}

export function AdjustmentContextDrawer({
  isOpen,
  batchId,
  sku,
  productName,
  previousValue,
  currentValue,
  isPending,
  onApply,
  onCancel,
}: AdjustmentContextDrawerProps) {
  const [selectedReason, setSelectedReason] =
    useState<InventoryAdjustmentReason | null>(null);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    setSelectedReason(null);
    setNotes("");
  }, [batchId, previousValue, currentValue]);

  if (!isOpen) return null;

  const delta = currentValue - previousValue;
  const deltaLabel = delta >= 0 ? `+${delta}` : `\u2212${Math.abs(delta)}`;

  const handleApply = () => {
    if (!selectedReason) return;
    onApply({ reason: selectedReason, notes });
  };

  return (
    <div className="fixed inset-y-0 right-0 z-50 flex w-80 flex-col border-l border-border bg-background shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold">Adjust Quantity</h2>
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-4 py-4">
        {/* Change summary */}
        <div className="rounded-md border border-border bg-muted/40 px-3 py-3">
          <div className="flex items-baseline justify-between gap-2">
            <div>
              <p className="text-xs font-mono text-muted-foreground">{sku}</p>
              <p className="text-sm font-medium">{productName}</p>
            </div>
            <span
              className={cn(
                "text-lg font-semibold tabular-nums",
                delta < 0 ? "text-destructive" : "text-green-600"
              )}
            >
              {deltaLabel}
            </span>
          </div>
          <div className="mt-2 text-xs text-muted-foreground">
            {previousValue} → {currentValue}
          </div>
        </div>

        {/* Reason quick-tags */}
        <div>
          <p className="mb-2 text-xs font-medium text-muted-foreground">
            Reason <span className="text-destructive">*</span>
          </p>
          <div className="flex flex-wrap gap-1.5">
            {INVENTORY_ADJUSTMENT_REASONS.map(reason => (
              <button
                key={reason}
                type="button"
                onClick={() => setSelectedReason(reason)}
                className={cn(
                  "rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors",
                  selectedReason === reason
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background text-foreground hover:bg-muted"
                )}
              >
                {INVENTORY_ADJUSTMENT_REASON_LABELS[reason]}
              </button>
            ))}
          </div>
        </div>

        {/* Notes textarea */}
        <div>
          <p className="mb-1.5 text-xs font-medium text-muted-foreground">
            Notes (optional)
          </p>
          <Textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Add any additional context…"
            className="min-h-20 resize-none text-sm"
          />
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-border px-4 py-3">
        <div className="mb-2 flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={onCancel}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            className="flex-1"
            onClick={handleApply}
            disabled={!selectedReason || isPending}
          >
            Apply {deltaLabel}
          </Button>
        </div>
        <p className="text-center text-[10px] text-muted-foreground">
          Reason tag is required · Edit is saved on Apply
        </p>
      </div>
    </div>
  );
}
