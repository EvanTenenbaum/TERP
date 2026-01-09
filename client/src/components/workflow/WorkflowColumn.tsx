/**
 * Workflow Column Component
 * 
 * Represents a single status column in the Kanban board.
 * Acts as a drop zone for batch cards.
 */

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { WorkflowBatchCard } from "./WorkflowBatchCard";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

interface WorkflowColumnProps {
  status: {
    id: number;
    name: string;
    slug: string;
    color: string;
    order: number;
  };
  batches: Array<any>;
  batchIds: number[];
}

export function WorkflowColumn({ status, batches, batchIds }: WorkflowColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: status.id,
  });

  return (
    // UX-003: Responsive column - full width on mobile, fixed width on desktop
    <div className="flex-shrink-0 w-full md:w-80">
      <Card className="h-full flex flex-col">
        {/* Column Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-gray-900">{status.name}</h3>
            <Badge
              variant="secondary"
              style={{
                backgroundColor: `${status.color}20`,
                color: status.color,
                borderColor: status.color,
              }}
            >
              {batches.length}
            </Badge>
          </div>
          <div
            className="h-1 rounded-full"
            style={{ backgroundColor: status.color }}
          />
        </div>

        {/* Droppable Area */}
        <div
          ref={setNodeRef}
          className={`flex-1 overflow-y-auto p-4 space-y-3 ${
            isOver ? "bg-blue-50" : ""
          }`}
        >
          <SortableContext items={batchIds} strategy={verticalListSortingStrategy}>
            {batches.length === 0 ? (
              <div className="text-center py-8 text-gray-400 text-sm">
                No batches in this status
              </div>
            ) : (
              batches.map((batch) => (
                <WorkflowBatchCard key={batch.id} batch={batch} />
              ))
            )}
          </SortableContext>
        </div>
      </Card>
    </div>
  );
}
