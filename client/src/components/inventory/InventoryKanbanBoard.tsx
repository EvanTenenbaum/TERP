/**
 * InventoryKanbanBoard
 *
 * Kanban-style board for inventory management.
 * Organizes batches by status: Awaiting Intake → Live → On Hold → Quarantined → Sold Out → Closed
 */

import { useMemo } from "react";
import { InventoryKanbanColumn } from "./InventoryKanbanColumn";
import { BATCH_STATUSES } from "../../../../server/constants/batchStatuses";
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

interface InventoryKanbanBoardProps {
  batches: InventoryKanbanBatch[];
  onBatchClick?: (batchId: number) => void;
}

export function InventoryKanbanBoard({
  batches,
  onBatchClick,
}: InventoryKanbanBoardProps) {
  // Group batches by status
  const batchesByStatus = useMemo(() => {
    const grouped = new Map<BatchStatus, InventoryKanbanBatch[]>();

    // Initialize all statuses with empty arrays
    BATCH_STATUSES.forEach(status => {
      grouped.set(status, []);
    });

    // Group batches by their status
    batches.forEach(batch => {
      const status = batch.status as BatchStatus;
      if (grouped.has(status)) {
        grouped.get(status)!.push(batch);
      }
    });

    return grouped;
  }, [batches]);

  return (
    <div className="h-full max-w-full overflow-x-auto -webkit-overflow-scrolling-touch">
      <div className="flex flex-col md:flex-row gap-4 p-4 md:p-6 h-full md:min-w-max">
        {BATCH_STATUSES.map(status => (
          <InventoryKanbanColumn
            key={status}
            status={status}
            batches={batchesByStatus.get(status) ?? []}
            onBatchClick={onBatchClick}
          />
        ))}
      </div>
    </div>
  );
}
