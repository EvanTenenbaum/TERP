/**
 * MovementHistoryPanel Component
 * Sprint 4 Track A: 4.A.8 WS-009 - Movement History
 *
 * Features:
 * - Paginated movement history
 * - Filter by date range, batch, movement type
 * - Visual indicators for different movement types
 * - Expandable details
 */

import { memo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import {
  ArrowDown,
  ArrowUp,
  ArrowLeftRight,
  Package,
  AlertTriangle,
  History,
  RefreshCw,
  Filter,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { format } from "date-fns";

const MOVEMENT_TYPE_CONFIG: Record<string, {
  icon: typeof ArrowUp;
  label: string;
  color: string;
  direction: "in" | "out" | "neutral";
}> = {
  INTAKE: { icon: ArrowDown, label: "Intake", color: "bg-green-100 text-green-700", direction: "in" },
  SALE: { icon: ArrowUp, label: "Sale", color: "bg-blue-100 text-blue-700", direction: "out" },
  REFUND_RETURN: { icon: ArrowDown, label: "Refund/Return", color: "bg-purple-100 text-purple-700", direction: "in" },
  ADJUSTMENT: { icon: ArrowLeftRight, label: "Adjustment", color: "bg-yellow-100 text-yellow-700", direction: "neutral" },
  QUARANTINE: { icon: AlertTriangle, label: "Quarantine", color: "bg-red-100 text-red-700", direction: "out" },
  RELEASE_FROM_QUARANTINE: { icon: Package, label: "Release", color: "bg-green-100 text-green-700", direction: "in" },
  DISPOSAL: { icon: ArrowUp, label: "Disposal", color: "bg-red-100 text-red-700", direction: "out" },
  TRANSFER: { icon: ArrowLeftRight, label: "Transfer", color: "bg-orange-100 text-orange-700", direction: "neutral" },
  SAMPLE: { icon: ArrowUp, label: "Sample", color: "bg-pink-100 text-pink-700", direction: "out" },
};

interface MovementHistoryPanelProps {
  batchId?: number;
  variant?: "full" | "compact";
  maxHeight?: string;
}

export const MovementHistoryPanel = memo(function MovementHistoryPanel({
  batchId,
  variant = "full",
  maxHeight = "500px",
}: MovementHistoryPanelProps) {
  const [, setLocation] = useLocation();
  const [page, setPage] = useState(1);
  const [movementType, setMovementType] = useState<string>("all");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [showFilters, setShowFilters] = useState(false);

  const { data, isLoading, refetch } = trpc.inventoryMovements.getHistory.useQuery({
    page,
    pageSize: variant === "compact" ? 10 : 25,
    batchId,
    movementType: movementType !== "all" ? movementType : undefined,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
  });

  const formatQty = (qty: number) => {
    if (qty > 0) return `+${qty.toFixed(2)}`;
    return qty.toFixed(2);
  };

  const clearFilters = () => {
    setMovementType("all");
    setStartDate("");
    setEndDate("");
    setPage(1);
  };

  if (variant === "compact") {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <History className="h-4 w-4" />
            Recent Movements
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-8" />
              <Skeleton className="h-8" />
              <Skeleton className="h-8" />
            </div>
          ) : data?.items.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No movements recorded
            </p>
          ) : (
            <div className="space-y-2">
              {data?.items.slice(0, 5).map((mov) => {
                const config = MOVEMENT_TYPE_CONFIG[mov.movementType] || MOVEMENT_TYPE_CONFIG.ADJUSTMENT;
                const Icon = config.icon;

                return (
                  <div
                    key={mov.id}
                    className={`flex items-center justify-between p-2 rounded ${config.color}`}
                  >
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4" />
                      <div>
                        <p className="text-sm font-medium">{config.label}</p>
                        <p className="text-xs opacity-70">{mov.sku}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-mono font-bold ${
                        mov.quantityChange > 0 ? "text-green-700" : "text-red-700"
                      }`}>
                        {formatQty(mov.quantityChange)}
                      </p>
                      <p className="text-xs opacity-70">
                        {format(new Date(mov.createdAt!), "MMM d")}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Movement History
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-4 w-4 mr-1" />
              Filters
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-muted/50 rounded-lg">
            <div>
              <Label className="text-xs">Movement Type</Label>
              <Select value={movementType} onValueChange={setMovementType}>
                <SelectTrigger>
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {Object.entries(MOVEMENT_TYPE_CONFIG).map(([type, config]) => (
                    <SelectItem key={type} value={type}>
                      {config.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Start Date</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs">End Date</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div className="flex items-end">
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                Clear Filters
              </Button>
            </div>
          </div>
        )}

        {/* Table */}
        <div style={{ maxHeight, overflow: "auto" }}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Product</TableHead>
                <TableHead className="text-right">Change</TableHead>
                <TableHead className="text-right">Before</TableHead>
                <TableHead className="text-right">After</TableHead>
                <TableHead>Performed By</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={7}><Skeleton className="h-8" /></TableCell>
                  </TableRow>
                ))
              ) : data?.items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No movements found
                  </TableCell>
                </TableRow>
              ) : (
                data?.items.map((mov) => {
                  const config = MOVEMENT_TYPE_CONFIG[mov.movementType] || MOVEMENT_TYPE_CONFIG.ADJUSTMENT;
                  const Icon = config.icon;

                  return (
                    <TableRow key={mov.id}>
                      <TableCell>
                        <Badge className={config.color}>
                          <Icon className="h-3 w-3 mr-1" />
                          {config.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium truncate max-w-[200px]">
                            {mov.productName || "Unknown"}
                          </p>
                          <p className="text-xs text-muted-foreground font-mono">
                            {mov.sku}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={`font-mono font-bold ${
                          mov.quantityChange > 0 ? "text-green-600" : "text-red-600"
                        }`}>
                          {formatQty(mov.quantityChange)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {mov.quantityBefore.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {mov.quantityAfter.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-sm">
                        {mov.performedByName || "System"}
                      </TableCell>
                      <TableCell className="text-sm">
                        {format(new Date(mov.createdAt!), "MMM d, yyyy h:mm a")}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {data && data.pagination.totalPages > 1 && (
          <div className="flex items-center justify-between pt-4 border-t">
            <p className="text-sm text-muted-foreground">
              Showing {((page - 1) * data.pagination.pageSize) + 1} to{" "}
              {Math.min(page * data.pagination.pageSize, data.pagination.totalItems)} of{" "}
              {data.pagination.totalItems} movements
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              <span className="text-sm">
                Page {page} of {data.pagination.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => p + 1)}
                disabled={!data.pagination.hasMore}
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
});
