/**
 * Inventory Snapshot Widget
 * SPRINT-A Task 10: Added EmptyState component integration
 */

import { memo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ExternalLink } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";

export const InventorySnapshotWidget = memo(function InventorySnapshotWidget() {
  const [, setLocation] = useLocation();
  const { data, isLoading, error } =
    trpc.dashboard.getInventorySnapshot.useQuery(undefined, {
      refetchInterval: 60000,
    });

  const formatCurrency = (value: number) => {
    return `$${value.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">
          Inventory Snapshot
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Current units and value by category. Click a row to open inventory.
        </p>
      </CardHeader>
      <CardContent>
        {error ? (
          <EmptyState
            variant="generic"
            size="sm"
            title="Failed to load inventory data"
            description={
              error.message ||
              "An error occurred while fetching inventory snapshot"
            }
          />
        ) : isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        ) : data && data.categories.length > 0 ? (
          <div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Units Available</TableHead>
                  <TableHead className="text-right">Inventory Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.categories.map(
                  (
                    category: { name: string; units: number; value: number },
                    index: number
                  ) => (
                    <TableRow
                      key={category.name}
                      className="cursor-pointer hover:bg-muted/50 group"
                      onClick={() => {
                        setLocation(
                          `/inventory?category=${encodeURIComponent(category.name)}`
                        );
                      }}
                    >
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <span>
                            {index + 1}. {category.name}
                          </span>
                          <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {category.units}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(category.value)}
                      </TableCell>
                    </TableRow>
                  )
                )}
                <TableRow className="font-bold bg-muted/30">
                  <TableCell>Total</TableCell>
                  <TableCell className="text-right font-mono">
                    {data.totalUnits}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {formatCurrency(data.totalValue)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        ) : (
          <EmptyState
            variant="inventory"
            size="sm"
            title="No inventory data"
            description="Inventory snapshot will appear once products are added"
          />
        )}
      </CardContent>
    </Card>
  );
});
