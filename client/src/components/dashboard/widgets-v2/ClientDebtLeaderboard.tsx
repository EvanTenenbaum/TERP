import { memo } from "react";
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
import { trpc } from "@/lib/trpc";

// LINT-005: Define interface for client debt data
interface ClientDebtData {
  customerId: number;
  customerName: string;
  currentDebt: number;
  oldestDebt: number;
}

export const ClientDebtLeaderboard = memo(function ClientDebtLeaderboard() {
  const {
    data: response,
    isLoading,
    error,
    refetch,
  } = trpc.dashboard.getClientDebt.useQuery({}, { refetchInterval: 60000 });

  const data = response?.data || [];

  const formatCurrency = (value: number) => {
    return `$${value.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  const formatAgingDays = (days: number) => {
    if (days === 0) return "-";
    return `${days}d`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Client Debt</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        ) : error ? (
          <DatabaseErrorState
            entity="client debt"
            errorMessage={error.message}
            onRetry={() => void refetch()}
          />
        ) : data.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>Client</TableHead>
                <TableHead className="text-right">Debt</TableHead>
                <TableHead className="text-right">Oldest Debt</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((client: ClientDebtData, index: number) => (
                <TableRow key={client.customerId}>
                  <TableCell className="text-muted-foreground font-medium">
                    {index + 1}
                  </TableCell>
                  <TableCell className="font-medium">
                    {client.customerName}
                  </TableCell>
                  <TableCell className="text-right font-mono text-destructive">
                    {formatCurrency(client.currentDebt)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-muted-foreground">
                    {formatAgingDays(client.oldestDebt)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <EmptyState
            variant="clients"
            size="sm"
            title="No client debt yet"
            description="Client debt will appear once invoices are outstanding."
          />
        )}
      </CardContent>
    </Card>
  );
});
