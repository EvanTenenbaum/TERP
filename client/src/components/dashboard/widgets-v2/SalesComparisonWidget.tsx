/**
 * Sales Comparison Widget
 * ACT-001: Made actionable with clickable rows navigating to analytics
 */

import { memo } from "react";
import { useLocation } from "wouter";
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
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { trpc } from "@/lib/trpc";

export const SalesComparisonWidget = memo(function SalesComparisonWidget() {
  const [, setLocation] = useLocation();
  const { data, isLoading } = trpc.dashboard.getSalesComparison.useQuery(
    undefined,
    { refetchInterval: 60000 }
  );

  const formatCurrency = (value: number) => {
    return `$${value.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  const calculateVariance = (current: number, prior: number) => {
    if (prior === 0) return { amount: current, percent: 0 };
    const amount = current - prior;
    const percent = (amount / prior) * 100;
    return { amount, percent };
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg font-semibold">
          Sales - Time Period Comparison
        </CardTitle>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setLocation("/analytics")}
          className="text-xs"
        >
          View Analytics <ArrowRight className="h-3 w-3 ml-1" />
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
                <TableHead>Period</TableHead>
                <TableHead className="text-right">Last Period</TableHead>
                <TableHead className="text-right">Prior Period</TableHead>
                <TableHead className="text-right">Variance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {/* Weekly */}
              <TableRow
                className="cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => setLocation("/analytics")}
              >
                <TableCell className="font-medium">Weekly</TableCell>
                <TableCell className="text-right font-mono">
                  {formatCurrency(data.weekly.last7Days)}
                </TableCell>
                <TableCell className="text-right font-mono">
                  {formatCurrency(data.weekly.prior7Days)}
                </TableCell>
                <TableCell className="text-right font-mono">
                  {(() => {
                    const variance = calculateVariance(
                      data.weekly.last7Days,
                      data.weekly.prior7Days
                    );
                    const color =
                      variance.amount >= 0 ? "text-green-600" : "text-red-600";
                    return (
                      <span className={color}>
                        {variance.amount >= 0 ? "+" : ""}
                        {variance.percent.toFixed(0)}%
                      </span>
                    );
                  })()}
                </TableCell>
              </TableRow>

              {/* Monthly */}
              <TableRow
                className="cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => setLocation("/analytics")}
              >
                <TableCell className="font-medium">Monthly</TableCell>
                <TableCell className="text-right font-mono">
                  {formatCurrency(data.monthly.last30Days)}
                </TableCell>
                <TableCell className="text-right font-mono">
                  {formatCurrency(data.monthly.prior30Days)}
                </TableCell>
                <TableCell className="text-right font-mono">
                  {(() => {
                    const variance = calculateVariance(
                      data.monthly.last30Days,
                      data.monthly.prior30Days
                    );
                    const color =
                      variance.amount >= 0 ? "text-green-600" : "text-red-600";
                    return (
                      <span className={color}>
                        {variance.amount >= 0 ? "+" : ""}
                        {variance.percent.toFixed(0)}%
                      </span>
                    );
                  })()}
                </TableCell>
              </TableRow>

              {/* 6 Month */}
              <TableRow
                className="cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => setLocation("/analytics")}
              >
                <TableCell className="font-medium">6 Month</TableCell>
                <TableCell className="text-right font-mono">
                  {formatCurrency(data.sixMonth.last6Months)}
                </TableCell>
                <TableCell className="text-right font-mono">
                  {formatCurrency(data.sixMonth.prior6Months)}
                </TableCell>
                <TableCell className="text-right font-mono">
                  {(() => {
                    const variance = calculateVariance(
                      data.sixMonth.last6Months,
                      data.sixMonth.prior6Months
                    );
                    const color =
                      variance.amount >= 0 ? "text-green-600" : "text-red-600";
                    const bgColor =
                      variance.amount < 0 ? "bg-red-50 dark:bg-red-950/20" : "";
                    return (
                      <span className={`${color} ${bgColor} px-2 py-1 rounded`}>
                        {variance.amount >= 0 ? "+" : ""}
                        {variance.percent.toFixed(0)}%
                      </span>
                    );
                  })()}
                </TableCell>
              </TableRow>

              {/* Yearly */}
              <TableRow
                className="cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => setLocation("/analytics")}
              >
                <TableCell className="font-medium">Yearly</TableCell>
                <TableCell className="text-right font-mono">
                  {formatCurrency(data.yearly.last365)}
                </TableCell>
                <TableCell className="text-right font-mono">
                  {formatCurrency(data.yearly.prior365)}
                </TableCell>
                <TableCell className="text-right font-mono">
                  {(() => {
                    const variance = calculateVariance(
                      data.yearly.last365,
                      data.yearly.prior365
                    );
                    const color =
                      variance.amount >= 0 ? "text-green-600" : "text-red-600";
                    const bgColor =
                      variance.amount < 0 ? "bg-red-50 dark:bg-red-950/20" : "";
                    return (
                      <span className={`${color} ${bgColor} px-2 py-1 rounded`}>
                        {variance.amount >= 0 ? "+" : ""}
                        {variance.percent.toFixed(0)}%
                      </span>
                    );
                  })()}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        ) : (
          <div className="text-center py-8 space-y-2">
            <p className="text-muted-foreground">
              No sales comparison data available
            </p>
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
