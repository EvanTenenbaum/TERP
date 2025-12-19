/**
 * CashFlow Widget
 * SPRINT-A Task 10: Added EmptyState component integration
 */

import { useState, memo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { trpc } from "@/lib/trpc";

type TimePeriod = "LIFETIME" | "YEAR" | "QUARTER" | "MONTH";

export const CashFlowWidget = memo(function CashFlowWidget() {
  const [timePeriod, setTimePeriod] = useState<TimePeriod>("LIFETIME");

  const { data, isLoading } = trpc.dashboard.getCashFlow.useQuery(
    { timePeriod },
    { refetchInterval: 60000 }
  );

  const formatCurrency = (value: number) => {
    return `$${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">CashFlow</CardTitle>
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
          </div>
        ) : data ? (
          <Table>
            <TableBody>
              <TableRow>
                <TableCell className="font-medium">Cash Collected</TableCell>
                <TableCell className="text-right font-mono text-green-600">
                  {formatCurrency(data.cashCollected)}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Cash Spent</TableCell>
                <TableCell className="text-right font-mono text-red-600">
                  {formatCurrency(data.cashSpent)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        ) : (
          <EmptyState
            variant="analytics"
            size="sm"
            title="No cash flow data"
            description="Cash flow data will appear once transactions are recorded"
          />
        )}
      </CardContent>
    </Card>
  );
});
