import { useState, memo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";

type TimePeriod = "LIFETIME" | "YEAR" | "QUARTER" | "MONTH";

export const SalesByClientWidget = memo(function SalesByClientWidget() {
  const [timePeriod, setTimePeriod] = useState<TimePeriod>("LIFETIME");

  const { data: response, isLoading } = trpc.dashboard.getSalesByClient.useQuery(
    { timePeriod },
    { refetchInterval: 60000 }
  );

  const data = response?.data || [];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">Sales</CardTitle>
          <Select
            value={timePeriod}
            onValueChange={v => setTimePeriod(v as TimePeriod)}
          >
            <SelectTrigger className="w-[140px] h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="LIFETIME">All Time</SelectItem>
              <SelectItem value="YEAR">This Year</SelectItem>
              <SelectItem value="QUARTER">This Quarter</SelectItem>
              <SelectItem value="MONTH">This Month</SelectItem>
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
        ) : data.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>Client</TableHead>
                <TableHead className="text-right">Total Sales</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map(
                (
                  client: {
                    customerId: number;
                    customerName: string;
                    totalSales: number;
                  },
                  index: number
                ) => (
                  <TableRow key={client.customerId}>
                    <TableCell className="text-muted-foreground">
                      {index + 1}
                    </TableCell>
                    <TableCell className="font-medium">
                      {client.customerName}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      $
                      {client.totalSales.toLocaleString("en-US", {
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0,
                      })}
                    </TableCell>
                  </TableRow>
                )
              )}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center py-8 space-y-2">
            <p className="text-muted-foreground">No sales data available</p>
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
