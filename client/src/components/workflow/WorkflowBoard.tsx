/**
 * Workflow Board Component
 *
 * Kanban-style board with drag-and-drop functionality for managing batch workflow.
 * Uses @dnd-kit for accessible drag-and-drop interactions.
 */

import { useState } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from "@dnd-kit/core";
// SortableContext and verticalListSortingStrategy available for future per-column sorting
import { WorkflowColumn } from "./WorkflowColumn";
import { WorkflowBatchCard } from "./WorkflowBatchCard";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface WorkflowBoardProps {
  statuses: Array<{
    id: number;
    name: string;
    slug: string;
    color: string;
    order: number;
  }>;
  queues: Record<number, Array<Record<string, unknown>>>;
}

export function WorkflowBoard({ statuses, queues }: WorkflowBoardProps) {
  const [activeBatch, setActiveBatch] = useState<Record<
    string,
    unknown
  > | null>(null);
  const utils = trpc.useUtils();

  // Mutation for updating batch status
  const updateBatchStatus = trpc.workflowQueue.updateBatchStatus.useMutation({
    onSuccess: () => {
      toast.success("Batch status updated successfully");
      // Invalidate and refetch queues
      utils.workflowQueue.getQueues.invalidate();
    },
    onError: error => {
      toast.error(`Failed to update batch status: ${error.message}`);
    },
  });

  // Configure drag sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px movement required to start drag
      },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const batchId = active.id as number;

    // Find the batch being dragged
    for (const statusId in queues) {
      const batch = queues[statusId].find(
        (b: Record<string, unknown>) => b.id === batchId
      );
      if (batch) {
        setActiveBatch(batch);
        break;
      }
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    setActiveBatch(null);

    if (!over) return;

    const batchId = active.id as number;
    const newStatusId = over.id as number;
    // If dropped over a batch card, find its status ID
    let targetStatusId = newStatusId;
    if (!statuses.some(s => s.id === targetStatusId)) {
      for (const statusId in queues) {
        if (
          queues[statusId].some(
            (b: Record<string, unknown>) => b.id === targetStatusId
          )
        ) {
          targetStatusId = parseInt(statusId);
          break;
        }
      }
    }

    // Find current status
    let currentStatusId: number | null = null;
    for (const statusId in queues) {
      if (
        queues[statusId].some((b: Record<string, unknown>) => b.id === batchId)
      ) {
        currentStatusId = parseInt(statusId);
        break;
      }
    }

    // If status hasn't changed, do nothing
    if (currentStatusId === targetStatusId) return;

    // Update batch status
    updateBatchStatus.mutate({
      batchId,
      toStatusId: targetStatusId,
    });
  };

  const handleDragCancel = () => {
    setActiveBatch(null);
  };

  // Sort statuses by order
  const sortedStatuses = [...statuses].sort((a, b) => a.order - b.order);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      {/* UX-003: Responsive kanban board - stacks vertically on mobile, horizontal scroll on desktop */}
      <div className="h-full max-w-full overflow-x-auto md:overflow-visible -webkit-overflow-scrolling-touch">
        <div className="flex flex-col md:flex-row gap-4 p-4 md:p-6 h-full md:min-w-max">
          {sortedStatuses.map(status => {
            const batches = queues[status.id] || [];
            const batchIds = batches.map(
              (b: Record<string, unknown>) => b.id
            ) as number[];

            return (
              <WorkflowColumn
                key={status.id}
                status={status}
                batches={batches}
                batchIds={batchIds}
              />
            );
          })}
        </div>
      </div>

      {/* Drag Overlay */}
      <DragOverlay>
        {activeBatch ? (
          <div className="opacity-80">
            <WorkflowBatchCard
              batch={
                activeBatch as { id: string | number; [key: string]: unknown }
              }
              isDragging
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
