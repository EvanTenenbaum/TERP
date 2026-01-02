/**
 * Sales By Client Widget
 * SPRINT-A Task 10: Added EmptyState component integration
 * ACT-003: Made actionable with clickable rows navigating to client profiles
 */

import { useState, memo } from "react";
import { useLocation } from "wouter";
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
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ArrowRight } from "lucide-react";
import { trpc } from "@/lib/trpc";

type TimePeriod = "LIFETIME" | "YEAR" | "QUARTER" | "MONTH";

export const SalesByClientWidget = memo(function SalesByClientWidget() {
  const [, setLocation] = useLocation();
  const [timePeriod, setTimePeriod] = useState<TimePeriod>("LIFETIME");

  const { data: response, isLoading } =
    trpc.dashboard.getSalesByClient.useQuery(
      { timePeriod },
      { refetchInterval: 60000 }
    );

  const data = response?.data || [];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">Sales</CardTitle>
          <div className="flex items-center gap-2">
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
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation("/clients")}
              className="text-xs"
            >
              View All <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </div>
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
                  <TableRow
                    key={client.customerId}
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => setLocation(`/clients/${client.customerId}`)}
                  >
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
          <EmptyState
            variant="clients"
            size="sm"
            title="No sales data"
            description="Sales by client will appear once orders are recorded"
          />
        )}
      </CardContent>
    </Card>
  );
});
