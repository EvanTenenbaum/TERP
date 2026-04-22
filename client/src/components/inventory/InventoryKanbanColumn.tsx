/**
 * InventoryKanbanColumn
 *
 * Represents a single status column in the Inventory Kanban board.
 * Displays batches grouped by their status.
 */

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { InventoryBatchCard } from "./InventoryBatchCard";
import { BATCH_STATUS_LABELS, BATCH_STATUS_COLORS } from "../../../../server/constants/batchStatuses";
import type { BatchStatus } from "../../../../server/constants/batchStatuses";

interface InventoryKanbanBatch {
  batchId: number;
  sku: string;
  productName: string;
  vendorName: string;
  brandName?: string;
  onHandQty: number;
  unitPrice: number | null;
  status: string;
}

interface InventoryKanbanColumnProps {
  status: BatchStatus;
  batches: InventoryKanbanBatch[];
  onBatchClick?: (batchId: number) => void;
}

export function InventoryKanbanColumn({
  status,
  batches,
  onBatchClick,
}: InventoryKanbanColumnProps) {
  const statusLabel = BATCH_STATUS_LABELS[status];
  const statusColors = BATCH_STATUS_COLORS[status];

  return (
    <div className="flex-shrink-0 w-full md:w-80">
      <Card className="h-full flex flex-col">
        {/* Column Header */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-sm">{statusLabel}</h3>
            <Badge
              variant="outline"
              className={`${statusColors.bg} ${statusColors.text}`}
            >
              {batches.length}
            </Badge>
          </div>
        </div>

        {/* Batches List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {batches.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              No batches
            </div>
          ) : (
            batches.map(batch => (
              <InventoryBatchCard
                key={batch.batchId}
                batch={batch}
                onClick={() => onBatchClick?.(batch.batchId)}
              />
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
