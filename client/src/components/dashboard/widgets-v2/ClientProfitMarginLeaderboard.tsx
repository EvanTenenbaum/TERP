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

// LINT-005: Define interface for client profit margin data
interface ClientProfitMarginData {
  customerId: number;
  customerName: string;
  profitMargin: number;
}

export const ClientProfitMarginLeaderboard = memo(
  function ClientProfitMarginLeaderboard() {
    const {
      data: response,
      isLoading,
      error,
      refetch,
    } = trpc.dashboard.getClientProfitMargin.useQuery(
      {},
      { refetchInterval: 60000 }
    );

    const data = response?.data || [];

    const formatPercent = (value: number) => {
      return `${value.toFixed(0)}%`;
    };

    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">
            Client Profit Margin
          </CardTitle>
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
              entity="client profit margin data"
              errorMessage={error.message}
              onRetry={() => void refetch()}
            />
          ) : data.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead className="text-right">Profit Margin</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((client: ClientProfitMarginData, index: number) => (
                  <TableRow key={client.customerId}>
                    <TableCell className="text-muted-foreground font-medium">
                      {index + 1}
                    </TableCell>
                    <TableCell className="font-medium">
                      {client.customerName}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      <span
                        className={
                          client.profitMargin >= 50
                            ? "text-[var(--success)]"
                            : client.profitMargin >= 30
                              ? "text-[var(--warning)]"
                              : "text-destructive"
                        }
                      >
                        {formatPercent(client.profitMargin)}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <EmptyState
              variant="analytics"
              size="sm"
              title="No profit margin data yet"
              description="Per-client profit margins appear once sales are recorded."
            />
          )}
        </CardContent>
      </Card>
    );
  }
);
