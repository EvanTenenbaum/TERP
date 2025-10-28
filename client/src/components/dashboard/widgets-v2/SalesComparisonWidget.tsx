import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";

export function SalesComparisonWidget() {
  const { data, isLoading } = trpc.dashboard.getSalesComparison.useQuery(), { refetchInterval: 60000 });

  const formatCurrency = (value: number) => {
    return `$${value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  const calculateVariance = (current: number, prior: number) => {
    if (prior === 0) return { amount: current, percent: 0 };
    const amount = current - prior;
    const percent = (amount / prior) * 100;
    return { amount, percent };
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Sales - Time Period Comparison</CardTitle>
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
              <TableRow>
                <TableCell className="font-medium">Weekly</TableCell>
                <TableCell className="text-right font-mono">{formatCurrency(data.weekly.last7Days)}</TableCell>
                <TableCell className="text-right font-mono">{formatCurrency(data.weekly.prior7Days)}</TableCell>
                <TableCell className="text-right font-mono">
                  {(() => {
                    const variance = calculateVariance(data.weekly.last7Days, data.weekly.prior7Days);
                    const color = variance.amount >= 0 ? "text-green-600" : "text-red-600";
                    return (
                      <span className={color}>
                        {variance.amount >= 0 ? "+" : ""}{variance.percent.toFixed(0)}%
                      </span>
                    );
                  })()}
                </TableCell>
              </TableRow>
              
              {/* Monthly */}
              <TableRow>
                <TableCell className="font-medium">Monthly</TableCell>
                <TableCell className="text-right font-mono">{formatCurrency(data.monthly.last30Days)}</TableCell>
                <TableCell className="text-right font-mono">{formatCurrency(data.monthly.prior30Days)}</TableCell>
                <TableCell className="text-right font-mono">
                  {(() => {
                    const variance = calculateVariance(data.monthly.last30Days, data.monthly.prior30Days);
                    const color = variance.amount >= 0 ? "text-green-600" : "text-red-600";
                    return (
                      <span className={color}>
                        {variance.amount >= 0 ? "+" : ""}{variance.percent.toFixed(0)}%
                      </span>
                    );
                  })()}
                </TableCell>
              </TableRow>
              
              {/* 6 Month */}
              <TableRow>
                <TableCell className="font-medium">6 Month</TableCell>
                <TableCell className="text-right font-mono">{formatCurrency(data.sixMonth.last6Months)}</TableCell>
                <TableCell className="text-right font-mono">{formatCurrency(data.sixMonth.prior6Months)}</TableCell>
                <TableCell className="text-right font-mono">
                  {(() => {
                    const variance = calculateVariance(data.sixMonth.last6Months, data.sixMonth.prior6Months);
                    const color = variance.amount >= 0 ? "text-green-600" : "text-red-600";
                    const bgColor = variance.amount < 0 ? "bg-red-50 dark:bg-red-950/20" : "";
                    return (
                      <span className={`${color} ${bgColor} px-2 py-1 rounded`}>
                        {variance.amount >= 0 ? "+" : ""}{variance.percent.toFixed(0)}%
                      </span>
                    );
                  })()}
                </TableCell>
              </TableRow>
              
              {/* Yearly */}
              <TableRow>
                <TableCell className="font-medium">Yearly</TableCell>
                <TableCell className="text-right font-mono">{formatCurrency(data.yearly.last365)}</TableCell>
                <TableCell className="text-right font-mono">{formatCurrency(data.yearly.prior365)}</TableCell>
                <TableCell className="text-right font-mono">
                  {(() => {
                    const variance = calculateVariance(data.yearly.last365, data.yearly.prior365);
                    const color = variance.amount >= 0 ? "text-green-600" : "text-red-600";
                    const bgColor = variance.amount < 0 ? "bg-red-50 dark:bg-red-950/20" : "";
                    return (
                      <span className={`${color} ${bgColor} px-2 py-1 rounded`}>
                        {variance.amount >= 0 ? "+" : ""}{variance.percent.toFixed(0)}%
                      </span>
                    );
                  })()}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            No sales comparison data available
          </div>
        )}
      </CardContent>
    </Card>
  );
}

