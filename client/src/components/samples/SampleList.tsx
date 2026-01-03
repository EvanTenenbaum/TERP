import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ArrowUpDown, Trash2 } from "lucide-react";
import { format } from "date-fns";

export type SampleStatus = "PENDING" | "FULFILLED" | "CANCELLED" | "RETURNED";

export interface SampleListItem {
  id: number;
  productSummary: string;
  clientName: string;
  status: SampleStatus;
  requestedDate: string;
  dueDate?: string | null;
  notes?: string | null;
}

export interface SampleListProps {
  samples: SampleListItem[];
  statusFilter: "ALL" | SampleStatus;
  searchQuery: string;
  isLoading?: boolean;
  onDelete?: (sampleId: number) => void;
  pageSize?: number;
}

type SortKey =
  | "id"
  | "productSummary"
  | "clientName"
  | "status"
  | "requestedDate"
  | "dueDate";

type SortDirection = "asc" | "desc";

const statusLabels: Record<SampleStatus, string> = {
  PENDING: "Pending",
  FULFILLED: "Approved",
  CANCELLED: "Cancelled",
  RETURNED: "Returned",
};

const statusVariant: Record<SampleStatus, "default" | "secondary" | "outline"> =
  {
    PENDING: "secondary",
    FULFILLED: "default",
    CANCELLED: "outline",
    RETURNED: "outline",
  };

function formatDate(dateValue: string | null | undefined): string {
  if (!dateValue) return "Not set";
  const parsed = new Date(dateValue);
  if (Number.isNaN(parsed.getTime())) return "Not set";
  return format(parsed, "MMM dd, yyyy");
}

export const SampleList = React.memo(function SampleList({
  samples,
  statusFilter,
  searchQuery,
  isLoading = false,
  onDelete,
  pageSize = 10,
}: SampleListProps) {
  const [sortKey, setSortKey] = useState<SortKey>("requestedDate");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);

  const handleSort = useCallback(
    (key: SortKey) => {
      setSortKey(key);
      setSortDirection(prev =>
        sortKey === key && prev === "desc" ? "asc" : "desc"
      );
    },
    [sortKey]
  );

  const filteredSamples = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase();
    return samples.filter(sample => {
      const matchesStatus =
        statusFilter === "ALL" ? true : sample.status === statusFilter;

      const matchesSearch =
        normalizedSearch.length === 0 ||
        sample.productSummary.toLowerCase().includes(normalizedSearch) ||
        sample.clientName.toLowerCase().includes(normalizedSearch) ||
        (sample.notes?.toLowerCase().includes(normalizedSearch) ?? false);

      return matchesStatus && matchesSearch;
    });
  }, [samples, statusFilter, searchQuery]);

  const sortedSamples = useMemo(() => {
    const sorted = [...filteredSamples].sort((a, b) => {
      const direction = sortDirection === "asc" ? 1 : -1;

      switch (sortKey) {
        case "id":
          return (a.id - b.id) * direction;
        case "productSummary":
          return a.productSummary.localeCompare(b.productSummary) * direction;
        case "clientName":
          return a.clientName.localeCompare(b.clientName) * direction;
        case "status":
          return a.status.localeCompare(b.status) * direction;
        case "requestedDate": {
          const aDate = new Date(a.requestedDate).getTime();
          const bDate = new Date(b.requestedDate).getTime();
          return (aDate - bDate) * direction;
        }
        case "dueDate": {
          const aDate = a.dueDate ? new Date(a.dueDate).getTime() : 0;
          const bDate = b.dueDate ? new Date(b.dueDate).getTime() : 0;
          return (aDate - bDate) * direction;
        }
        default:
          return 0;
      }
    });

    return sorted;
  }, [filteredSamples, sortDirection, sortKey]);

  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, searchQuery]);

  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(sortedSamples.length / pageSize));
  }, [pageSize, sortedSamples.length]);

  const paginatedSamples = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedSamples.slice(start, start + pageSize);
  }, [currentPage, pageSize, sortedSamples]);

  const handleDelete = useCallback(() => {
    if (onDelete && pendingDeleteId !== null) {
      onDelete(pendingDeleteId);
    }
    setPendingDeleteId(null);
  }, [onDelete, pendingDeleteId]);

  const handlePageChange = useCallback(
    (direction: "prev" | "next") => {
      setCurrentPage(prev => {
        if (direction === "prev") {
          return Math.max(1, prev - 1);
        }
        return Math.min(totalPages, prev + 1);
      });
    },
    [totalPages]
  );

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="h-12 bg-muted animate-pulse rounded mb-4" />
        <div className="h-40 bg-muted animate-pulse rounded" />
      </Card>
    );
  }

  if (!paginatedSamples.length) {
    return (
      <Card className="p-6">
        <div className="text-center text-muted-foreground">
          No samples match the current filters.
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <button
                  type="button"
                  onClick={() => handleSort("id")}
                  className="inline-flex items-center gap-1 text-left"
                  aria-label="ID"
                >
                  ID
                  <ArrowUpDown className="h-4 w-4" />
                </button>
              </TableHead>
              <TableHead>
                <button
                  type="button"
                  onClick={() => handleSort("productSummary")}
                  className="inline-flex items-center gap-1 text-left"
                  aria-label="Product"
                >
                  Product
                  <ArrowUpDown className="h-4 w-4" />
                </button>
              </TableHead>
              <TableHead>
                <button
                  type="button"
                  onClick={() => handleSort("clientName")}
                  className="inline-flex items-center gap-1 text-left"
                  aria-label="Client"
                >
                  Client
                  <ArrowUpDown className="h-4 w-4" />
                </button>
              </TableHead>
              <TableHead>
                <button
                  type="button"
                  onClick={() => handleSort("status")}
                  className="inline-flex items-center gap-1 text-left"
                  aria-label="Status"
                >
                  Status
                  <ArrowUpDown className="h-4 w-4" />
                </button>
              </TableHead>
              <TableHead>
                <button
                  type="button"
                  onClick={() => handleSort("requestedDate")}
                  className="inline-flex items-center gap-1 text-left"
                  aria-label="Requested Date"
                >
                  Requested Date
                  <ArrowUpDown className="h-4 w-4" />
                </button>
              </TableHead>
              <TableHead>
                <button
                  type="button"
                  onClick={() => handleSort("dueDate")}
                  className="inline-flex items-center gap-1 text-left"
                  aria-label="Due Date"
                >
                  Due Date
                  <ArrowUpDown className="h-4 w-4" />
                </button>
              </TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedSamples.map(sample => (
              <TableRow key={sample.id}>
                <TableCell>{sample.id}</TableCell>
                <TableCell className="max-w-[240px]">
                  <div className="font-medium text-foreground">
                    {sample.productSummary}
                  </div>
                  {sample.notes && (
                    <div className="text-xs text-muted-foreground">
                      {sample.notes}
                    </div>
                  )}
                </TableCell>
                <TableCell>{sample.clientName}</TableCell>
                <TableCell>
                  <Badge variant={statusVariant[sample.status]}>
                    {statusLabels[sample.status]}
                  </Badge>
                </TableCell>
                <TableCell>{formatDate(sample.requestedDate)}</TableCell>
                <TableCell>{formatDate(sample.dueDate ?? null)}</TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Delete sample ${sample.id}`}
                    onClick={() => setPendingDeleteId(sample.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between mt-4">
        <div className="text-sm text-muted-foreground">
          Page {currentPage} of {totalPages}
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange("prev")}
            disabled={currentPage === 1}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange("next")}
            disabled={currentPage >= totalPages}
          >
            Next
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={pendingDeleteId !== null}
        onOpenChange={open => !open && setPendingDeleteId(null)}
        title="Delete sample request"
        description="Are you sure you want to delete this sample request? This action cannot be undone."
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </Card>
  );
});
