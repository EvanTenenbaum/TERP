/**
 * Inventory Snapshot Widget
 * SPRINT-A Task 10: Added EmptyState component integration
 * S2: Added price-bracket grouping view (validation-gated on COGS data)
 */

import { useState, memo, useMemo } from "react";
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
import { EmptyState, DatabaseErrorState } from "@/components/ui/empty-state";
import { ChevronRight, ChevronDown, ExternalLink } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";

/** Price bracket definition */
interface PriceBracket {
  label: string;
  min: number;
  max: number;
  units: number;
  value: number;
}

type ViewMode = "category" | "price";

const PRICE_BRACKETS: Omit<PriceBracket, "units" | "value">[] = [
  { label: "$0–50", min: 0, max: 50 },
  { label: "$50–100", min: 50, max: 100 },
  { label: "$100–200", min: 100, max: 200 },
  { label: "$200–500", min: 200, max: 500 },
  { label: "$500+", min: 500, max: Infinity },
];

function computePriceBrackets(
  categories: Array<{ name: string; units: number; value: number }>
): PriceBracket[] {
  const brackets: PriceBracket[] = PRICE_BRACKETS.map(b => ({
    ...b,
    units: 0,
    value: 0,
  }));

  for (const cat of categories) {
    if (cat.units <= 0) continue;

    // Derive average COGS per unit for this category
    const avgCogs = cat.value / cat.units;

    // Place the category into the matching bracket
    const bracket = brackets.find(b => avgCogs >= b.min && avgCogs < b.max);
    if (bracket) {
      bracket.units += cat.units;
      bracket.value += cat.value;
    }
  }

  return brackets;
}

export const InventorySnapshotWidget = memo(function InventorySnapshotWidget() {
  const [, setLocation] = useLocation();
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set()
  );
  const [viewMode, setViewMode] = useState<ViewMode>("category");

  const { data, isLoading, error, refetch } =
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

  /** Validation gate: COGS data is present if any category has a positive value */
  const hasCogData = Boolean(data && data.totalValue > 0);

  const priceBrackets = useMemo(() => {
    if (!data || !hasCogData) return [];
    return computePriceBrackets(data.categories);
  }, [data, hasCogData]);

  const activeBrackets = priceBrackets.filter(b => b.units > 0);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-lg font-semibold">
              What&apos;s In Stock
            </CardTitle>
            {data && data.categories.length > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                {data.totalUnits.toLocaleString()} units across{" "}
                {data.categories.length} categor
                {data.categories.length === 1 ? "y" : "ies"} — worth{" "}
                {formatCurrency(data.totalValue)}
              </p>
            )}
          </div>
          <button
            className="text-xs text-muted-foreground hover:text-foreground transition-colors shrink-0 mt-0.5"
            onClick={() => setLocation("/inventory")}
          >
            View All →
          </button>
        </div>

        {/* View toggle — only shown when COGS data is available */}
        {hasCogData &&
          !isLoading &&
          !error &&
          data &&
          data.categories.length > 0 && (
            <div className="flex gap-1 mt-2">
              <button
                onClick={() => setViewMode("category")}
                className={`px-3 py-1 text-xs rounded-md font-medium transition-colors ${
                  viewMode === "category"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                By Category
              </button>
              <button
                onClick={() => setViewMode("price")}
                className={`px-3 py-1 text-xs rounded-md font-medium transition-colors ${
                  viewMode === "price"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                By Price
              </button>
            </div>
          )}
      </CardHeader>
      <CardContent>
        {error ? (
          <DatabaseErrorState
            entity="inventory snapshot"
            errorMessage={error.message}
            onRetry={() => void refetch()}
          />
        ) : isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        ) : data && data.categories.length > 0 ? (
          viewMode === "category" ? (
            <div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">
                      Units Available
                    </TableHead>
                    <TableHead className="text-right">
                      Inventory Value
                    </TableHead>
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
                          if (
                            (e.target as HTMLElement).closest(".toggle-icon")
                          ) {
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
          ) : activeBrackets.length > 0 ? (
            <div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Price Bracket (Avg COGS/unit)</TableHead>
                    <TableHead className="text-right">Units</TableHead>
                    <TableHead className="text-right">Total Value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeBrackets.map(bracket => (
                    <TableRow key={bracket.label} className="hover:bg-muted/50">
                      <TableCell className="font-medium">
                        {bracket.label}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {Math.round(bracket.units).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(bracket.value)}
                      </TableCell>
                    </TableRow>
                  ))}
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
              variant="generic"
              size="sm"
              title="No COGS data available"
              description="Price bracket grouping requires batches with COGS values"
            />
          )
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
