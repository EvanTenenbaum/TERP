import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronRight, ChevronDown } from "lucide-react";
import { trpc } from "@/lib/trpc";

export function InventorySnapshotWidget() {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const { data, isLoading } = trpc.dashboard.getInventorySnapshot.useQuery();

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
    return `$${value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Inventory Snapshot</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
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
                {data.categories.map((category: any, index: number) => (
                  <TableRow 
                    key={category.name}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => toggleCategory(category.name)}
                  >
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {expandedCategories.has(category.name) ? (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        )}
                        <span>{index + 1}. {category.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-mono">{category.units}</TableCell>
                    <TableCell className="text-right font-mono">{formatCurrency(category.value)}</TableCell>
                  </TableRow>
                ))}
                <TableRow className="font-bold bg-muted/30">
                  <TableCell>Total</TableCell>
                  <TableCell className="text-right font-mono">{data.totalUnits}</TableCell>
                  <TableCell className="text-right font-mono">{formatCurrency(data.totalValue)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            No inventory data available
          </div>
        )}
      </CardContent>
    </Card>
  );
}

