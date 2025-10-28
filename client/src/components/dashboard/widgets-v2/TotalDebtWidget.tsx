import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";

export function TotalDebtWidget() {
  const { data, isLoading } = trpc.dashboard.getTotalDebt.useQuery(), { refetchInterval: 60000 });

  const formatCurrency = (value: number) => {
    return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Total Debt</CardTitle>
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
              <TableRow>
                <TableCell className="font-medium">Total Debt Owed to Me</TableCell>
                <TableCell className="text-right font-mono text-green-600">
                  {formatCurrency(data.totalDebtOwedToMe)}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Total Debt I Owe Vendors</TableCell>
                <TableCell className="text-right font-mono text-red-600">
                  {formatCurrency(data.totalDebtIOwevVendors)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            No debt data available
          </div>
        )}
      </CardContent>
    </Card>
  );
}

