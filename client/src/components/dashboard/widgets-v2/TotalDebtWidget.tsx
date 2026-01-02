import { memo } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { trpc } from "@/lib/trpc";

/**
 * Total Debt Widget
 * ACT-003: Made actionable with clickable rows navigating to relevant pages
 */
export const TotalDebtWidget = memo(function TotalDebtWidget() {
  const [, setLocation] = useLocation();
  const { data, isLoading } = trpc.dashboard.getTotalDebt.useQuery(undefined, {
    refetchInterval: 60000,
  });

  const formatCurrency = (value: number) => {
    return `$${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg font-semibold">Total Debt</CardTitle>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setLocation("/clients?hasDebt=true")}
          className="text-xs"
        >
          View All <ArrowRight className="h-3 w-3 ml-1" />
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        ) : data ? (
          <Table>
            <TableBody>
              <TableRow
                className="cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => setLocation("/clients?hasDebt=true")}
              >
                <TableCell className="font-medium">
                  Total Debt Owed to Me
                </TableCell>
                <TableCell className="text-right font-mono text-green-600">
                  {formatCurrency(data.totalDebtOwedToMe)}
                </TableCell>
              </TableRow>
              <TableRow
                className="cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => setLocation("/accounting/bills")}
              >
                <TableCell className="font-medium">
                  Total Debt I Owe Vendors
                </TableCell>
                <TableCell className="text-right font-mono text-red-600">
                  {formatCurrency(data.totalDebtIOwevVendors)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        ) : (
          <div className="text-center py-8 space-y-2">
            <p className="text-muted-foreground">No debt data available</p>
            <p className="text-xs text-muted-foreground">
              To see data here, seed the database with:{" "}
              <code className="bg-muted px-2 py-0.5 rounded text-xs font-mono">
                pnpm seed
              </code>
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
});
