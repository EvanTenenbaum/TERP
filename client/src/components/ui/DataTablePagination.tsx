import React, { useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface DataTablePaginationProps {
  page: number;
  pageSize: number;
  total: number;
  pageSizes?: number[];
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
}

export const DataTablePagination = React.memo(function DataTablePagination({
  page,
  pageSize,
  total,
  pageSizes = [10, 25, 50, 100],
  onPageChange,
  onPageSizeChange,
}: DataTablePaginationProps) {
  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(total / pageSize)),
    [pageSize, total]
  );
  const clampedPage = Math.min(page, totalPages);
  const startItem = Math.min((clampedPage - 1) * pageSize + 1, total);
  const endItem = Math.min(clampedPage * pageSize, total);

  return (
    <div className="flex flex-col gap-3 items-start justify-between border rounded-md p-3 md:flex-row md:items-center">
      <div className="text-sm text-muted-foreground">
        Showing {total === 0 ? 0 : startItem} - {endItem} of {total}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Select
          value={String(pageSize)}
          onValueChange={value => onPageSizeChange?.(Number(value))}
        >
          <SelectTrigger aria-label="Rows per page">
            <SelectValue placeholder={`${pageSize} / page`} />
          </SelectTrigger>
          <SelectContent>
            {pageSizes.map(size => (
              <SelectItem key={size} value={String(size)}>
                {size} / page
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange?.(Math.max(1, clampedPage - 1))}
            aria-label="Previous page"
            disabled={clampedPage === 1}
          >
            Previous
          </Button>
          <div className="text-sm text-muted-foreground whitespace-nowrap">
            Page {clampedPage} of {totalPages}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              onPageChange?.(Math.min(totalPages, clampedPage + 1))
            }
            aria-label="Next page"
            disabled={clampedPage === totalPages}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
});
