import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GripVertical, Package } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { memo } from "react";

interface WorkflowBatchItem {
  id: string | number;
  code?: string;
  strain?: string;
  quantity?: string | number;
  status?: string;
  updatedAt?: string | Date;
  [key: string]: unknown;
}

interface WorkflowBatchCardProps {
  batch: WorkflowBatchItem;
  isDragging?: boolean;
}

export const WorkflowBatchCard = memo(function WorkflowBatchCard({
  batch,
  isDragging = false,
}: WorkflowBatchCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({
    id: batch.id as string,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isSortableDragging ? 0.5 : 1,
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={`p-3 cursor-move hover:shadow-md transition-shadow ${
        isDragging ? "shadow-lg ring-2 ring-blue-500" : ""
      }`}
      {...attributes}
      {...listeners}
    >
      <div className="flex items-start gap-3">
        {/* Drag Handle */}
        <div className="text-gray-400 mt-1">
          <GripVertical className="h-5 w-5" />
        </div>

        {/* Batch Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Package className="h-4 w-4 text-gray-500 flex-shrink-0" />
            <span className="font-medium text-sm truncate">{batch.code}</span>
          </div>

          {/* Batch Details */}
          <div className="text-xs text-gray-600 space-y-1">
            {batch.strain && (
              <div className="truncate">
                <span className="font-medium">Strain:</span> {batch.strain}
              </div>
            )}
            {batch.quantity && (
              <div>
                <span className="font-medium">Qty:</span> {batch.quantity}
              </div>
            )}
            {batch.updatedAt && (
              <div className="text-gray-400">
                Updated{" "}
                {formatDistanceToNow(new Date(batch.updatedAt), {
                  addSuffix: true,
                })}
              </div>
            )}
          </div>

          {/* Status Badge (if applicable) */}
          {batch.status && batch.status !== "ACTIVE" && (
            <Badge variant="outline" className="mt-2 text-xs">
              {batch.status}
            </Badge>
          )}
        </div>
      </div>
    </Card>
  );
});
