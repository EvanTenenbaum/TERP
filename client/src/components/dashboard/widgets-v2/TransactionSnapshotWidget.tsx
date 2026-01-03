/**
 * Transaction Snapshot Widget
 * SPRINT-A Task 10: Added EmptyState component integration
 * ACT-001: Made actionable with clickable rows navigating to orders/analytics
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { memo } from "react";
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
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";

export const TransactionSnapshotWidget = memo(
  function TransactionSnapshotWidget() {
    const [, setLocation] = useLocation();
    const { data, isLoading } = trpc.dashboard.getTransactionSnapshot.useQuery(
      undefined,
      { refetchInterval: 60000 }
    );

    const formatCurrency = (value: number) => {
      return `$${value.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
    };

    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg font-semibold">
            Transaction Snapshot
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation("/orders")}
            className="text-xs"
          >
            View Orders <ArrowRight className="h-3 w-3 ml-1" />
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          ) : data ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Metric</TableHead>
                  <TableHead className="text-right">Today</TableHead>
                  <TableHead className="text-right">This Week</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => setLocation("/orders")}
                >
                  <TableCell className="font-medium">Sales</TableCell>
                  <TableCell className="text-right font-mono">
                    {formatCurrency(data.today.sales)}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {formatCurrency(data.thisWeek.sales)}
                  </TableCell>
                </TableRow>
                <TableRow
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => setLocation("/accounting/payments")}
                >
                  <TableCell className="font-medium">Cash Collected</TableCell>
                  <TableCell className="text-right font-mono">
                    {formatCurrency(data.today.cashCollected)}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {formatCurrency(data.thisWeek.cashCollected)}
                  </TableCell>
                </TableRow>
                <TableRow
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => setLocation("/inventory")}
                >
                  <TableCell className="font-medium">Units Sold</TableCell>
                  <TableCell className="text-right font-mono">
                    {data.today.unitsSold}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {data.thisWeek.unitsSold}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          ) : (
            <EmptyState
              variant="orders"
              size="sm"
              title="No transaction data"
              description="Transaction snapshot will appear once orders are recorded"
            />
          )}
        </CardContent>
      </Card>
    );
  }
);
