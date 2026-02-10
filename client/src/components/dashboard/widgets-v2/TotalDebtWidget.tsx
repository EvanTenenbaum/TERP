import { memo } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
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
        <CardTitle className="text-lg font-semibold">Debt Position</CardTitle>
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
                <TableCell className="font-medium">Clients Owe You</TableCell>
                <TableCell className="text-right font-mono text-green-600">
                  {formatCurrency(data.totalDebtOwedToMe)}
                </TableCell>
              </TableRow>
              <TableRow
                className="cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => setLocation("/accounting/bills")}
              >
                <TableCell className="font-medium">You Owe Vendors</TableCell>
                <TableCell className="text-right font-mono text-red-600">
                  {formatCurrency(data.totalDebtIOwedToVendors)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        ) : (
          <EmptyState
            variant="analytics"
            size="sm"
            title="No debt data"
            description="Debt data will appear once transactions are recorded"
          />
        )}
      </CardContent>
    </Card>
  );
});
