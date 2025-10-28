import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";

export function TransactionSnapshotWidget() {
  const { data, isLoading } = trpc.dashboard.getTransactionSnapshot.useQuery(
    undefined,
    { refetchInterval: 60000 }
  );

  const formatCurrency = (value: number) => {
    return `$${value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Transaction Snapshot</CardTitle>
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
              <TableRow>
                <TableCell className="font-medium">Sales</TableCell>
                <TableCell className="text-right font-mono">{formatCurrency(data.today.sales)}</TableCell>
                <TableCell className="text-right font-mono">{formatCurrency(data.thisWeek.sales)}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Cash Collected</TableCell>
                <TableCell className="text-right font-mono">{formatCurrency(data.today.cashCollected)}</TableCell>
                <TableCell className="text-right font-mono">{formatCurrency(data.thisWeek.cashCollected)}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Units Sold</TableCell>
                <TableCell className="text-right font-mono">{data.today.unitsSold}</TableCell>
                <TableCell className="text-right font-mono">{data.thisWeek.unitsSold}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            No transaction data available
          </div>
        )}
      </CardContent>
    </Card>
  );
}

