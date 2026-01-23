import { useState, memo } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { trpc } from "@/lib/trpc";

export const CashCollectedLeaderboard = memo(function CashCollectedLeaderboard() {
  const [, setLocation] = useLocation();
  const [months, setMonths] = useState(24);

  const { data: response, isLoading, error } = trpc.dashboard.getCashCollected.useQuery(
    { months },
    { refetchInterval: 60000 } // Refetch every 60 seconds
  );

  const data = response?.data || [];

  const formatCurrency = (value: number) => {
    return `$${value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">Cash Collected</CardTitle>
          <Select value={months.toString()} onValueChange={(v) => setMonths(Number(v))}>
            <SelectTrigger className="w-[140px] h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="24">24 Months</SelectItem>
              <SelectItem value="12">12 Months</SelectItem>
              <SelectItem value="6">6 Months</SelectItem>
              <SelectItem value="3">3 Months</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        ) : error ? (
          <EmptyState
            variant="generic"
            size="sm"
            title="Unable to load cash collection data"
            description="Please try refreshing the page"
          />
        ) : data.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>Client</TableHead>
                <TableHead className="text-right">Cash Collected</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((client: any, index: number) => (
                <TableRow
                  key={client.customerId}
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => setLocation(`/clients/${client.customerId}`)}
                >
                  <TableCell className="text-muted-foreground font-medium">{index + 1}</TableCell>
                  <TableCell className="font-medium">{client.customerName}</TableCell>
                  <TableCell className="text-right font-mono text-green-600">
                    {formatCurrency(client.cashCollected)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <EmptyState
            variant="analytics"
            size="sm"
            title="No cash collection data"
            description="Cash collection data will appear once payments are recorded"
          />
        )}
      </CardContent>
    </Card>
  );
});

