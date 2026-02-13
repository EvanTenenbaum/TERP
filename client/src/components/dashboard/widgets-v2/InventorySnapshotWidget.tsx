/**
 * Inventory Snapshot Widget
 * SPRINT-A Task 10: Added EmptyState component integration
 */

import { useState, memo } from "react";
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
import { ChevronRight, ChevronDown, ExternalLink } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";

export const InventorySnapshotWidget = memo(function InventorySnapshotWidget() {
  const [, setLocation] = useLocation();
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set()
  );
  const { data, isLoading, error } =
    trpc.dashboard.getInventorySnapshot.useQuery(undefined, {
      refetchInterval: 60000,
    });

  const toggleCategory = (categoryName: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryName)) {
      newExpanded.delete(categoryName);
    } else {
      newExpanded.add(categoryName);
    }
    setExpandedCategories(newExpanded);
  };

  const formatCurrency = (value: number) => {
    return `$${value.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">
          Inventory Snapshot
        </CardTitle>
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
                      onClick={e => {
                        // If clicking the chevron area, toggle. Otherwise, navigate
                        if ((e.target as HTMLElement).closest(".toggle-icon")) {
                          toggleCategory(category.name);
                        } else {
                          setLocation(
                            `/inventory?category=${encodeURIComponent(category.name)}`
                          );
                        }
                      }}
                    >
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <span className="toggle-icon">
                            {expandedCategories.has(category.name) ? (
                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            )}
                          </span>
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
