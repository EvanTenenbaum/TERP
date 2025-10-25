import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";

export function ClientProfitMarginLeaderboard() {
  const { data, isLoading } = trpc.dashboard.getClientProfitMargin.useQuery();

  const formatPercent = (value: number) => {
    return `${value.toFixed(0)}%`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Client Profit Margin</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        ) : data && data.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>Client</TableHead>
                <TableHead className="text-right">Profit Margin</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((client: any, index: number) => (
                <TableRow key={client.customerId}>
                  <TableCell className="text-muted-foreground font-medium">{index + 1}</TableCell>
                  <TableCell className="font-medium">{client.customerName}</TableCell>
                  <TableCell className="text-right font-mono">
                    <span className={client.profitMargin >= 50 ? "text-green-600" : client.profitMargin >= 30 ? "text-yellow-600" : "text-red-600"}>
                      {formatPercent(client.profitMargin)}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            No profit margin data available
          </div>
        )}
      </CardContent>
    </Card>
  );
}

