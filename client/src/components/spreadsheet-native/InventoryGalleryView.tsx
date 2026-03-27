/**
 * InventoryGalleryView
 *
 * Responsive card grid for gallery mode in the inventory surface.
 * Displays InventoryPilotRow data in a scannable card layout with
 * quick-action buttons for inspecting or adjusting each batch.
 */

import { Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { InventoryPilotRow } from "@/lib/spreadsheet-native";

const STATUS_COLORS: Record<string, string> = {
  LIVE: "bg-green-100 text-green-800",
  AWAITING_INTAKE: "bg-slate-100 text-slate-800",
  ON_HOLD: "bg-yellow-100 text-yellow-800",
  QUARANTINED: "bg-amber-100 text-amber-800",
  SOLD_OUT: "bg-red-100 text-red-800",
  CLOSED: "bg-gray-100 text-gray-800",
};

const STOCK_COLORS: Record<string, string> = {
  OPTIMAL: "bg-green-100 text-green-800",
  LOW: "bg-yellow-100 text-yellow-800",
  CRITICAL: "bg-red-100 text-red-800",
  OUT_OF_STOCK: "bg-gray-100 text-gray-800",
};

const fmt = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

function fmtQty(v: number) {
  return v.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

interface InventoryGalleryViewProps {
  rows: InventoryPilotRow[];
  onOpenInspector: (batchId: number) => void;
  onAdjustQty: (batchId: number) => void;
}

export function InventoryGalleryView({
  rows,
  onOpenInspector,
  onAdjustQty,
}: InventoryGalleryViewProps) {
  if (rows.length === 0) {
    return (
      <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
        No inventory matches this view
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2 p-2">
      {rows.map(row => (
        <div
          key={row.identity.rowKey}
          className="rounded-lg border bg-card text-card-foreground shadow-sm flex flex-col overflow-hidden"
        >
          {/* Image placeholder */}
          <div className="h-24 bg-muted flex items-center justify-center">
            <Package className="h-8 w-8 text-muted-foreground" />
          </div>

          {/* Card body */}
          <div className="flex flex-col gap-1.5 p-3 flex-1">
            {/* SKU + product name */}
            <div>
              <p className="text-xs font-bold tracking-wide leading-none">
                {row.sku}
              </p>
              <p className="text-sm font-medium mt-0.5">{row.productName}</p>
              <p className="text-xs text-muted-foreground">
                {row.vendorName}
                {row.grade ? ` · ${row.grade}` : ""}
              </p>
            </div>

            {/* Status badge + available qty */}
            <div className="flex items-center gap-2 flex-wrap">
              <Badge
                className={cn(
                  "text-xs px-1.5 py-0",
                  STATUS_COLORS[row.status] ?? "bg-gray-100 text-gray-800"
                )}
              >
                {row.status}
              </Badge>
              <span
                className={cn(
                  "text-xs font-semibold",
                  row.availableQty < 100 ? "text-red-600" : "text-foreground"
                )}
              >
                {fmtQty(row.availableQty)} avail
              </span>
            </div>

            {/* On hand / reserved / COGS */}
            <p className="text-xs text-muted-foreground">
              {fmtQty(row.onHandQty)} on hand · {fmtQty(row.reservedQty)}{" "}
              reserved
              {row.unitCogs !== null && row.unitCogs !== undefined
                ? ` · ${fmt.format(row.unitCogs)} COGS`
                : ""}
            </p>

            {/* Stock status badge + age */}
            <div className="flex items-center gap-2 flex-wrap">
              {row.stockStatus && (
                <Badge
                  className={cn(
                    "text-xs px-1.5 py-0",
                    STOCK_COLORS[row.stockStatus] ?? "bg-gray-100 text-gray-800"
                  )}
                >
                  {row.stockStatus}
                </Badge>
              )}
              <span className="text-xs text-muted-foreground">
                {row.ageLabel}
              </span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-1.5 p-3 pt-0">
            <Button
              size="sm"
              variant="outline"
              className="flex-1 h-7 text-xs"
              onClick={() => onOpenInspector(row.batchId)}
            >
              Open
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="flex-1 h-7 text-xs"
              onClick={() => onAdjustQty(row.batchId)}
            >
              Adjust
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
