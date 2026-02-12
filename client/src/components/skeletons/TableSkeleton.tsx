import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export interface TableSkeletonProps {
  rows?: number;
  columns?: number;
  showHeader?: boolean;
  className?: string;
}

export const TableSkeleton = React.memo(function TableSkeleton({
  rows = 8,
  columns = 5,
  showHeader = true,
  className,
}: TableSkeletonProps) {
  return (
    <div
      className={cn("w-full space-y-2", className)}
      data-testid="table-skeleton-wrapper"
    >
      {showHeader && (
        <div
          className="grid gap-3"
          style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
        >
          {Array.from({ length: columns }).map((_, index) => (
            <Skeleton
              // eslint-disable-next-line react/no-array-index-key
              key={`table-header-${index}`}
              className="h-4 col-span-3 rounded"
              data-testid="skeleton-header-cell"
            />
          ))}
        </div>
      )}

      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div
            // eslint-disable-next-line react/no-array-index-key
            key={`table-row-${rowIndex}`}
            className="grid gap-3"
            style={{
              gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
            }}
            data-testid="skeleton-row"
          >
            {Array.from({ length: columns }).map((_, columnIndex) => (
              <Skeleton
                // eslint-disable-next-line react/no-array-index-key
                key={`table-cell-${rowIndex}-${columnIndex}`}
                className="h-4 col-span-3 rounded"
                data-testid="skeleton-cell"
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
});
