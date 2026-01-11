/**
 * CashFlow Widget
 * SPRINT-A Task 10: Added EmptyState component integration
 * ACT-003: Made actionable with clickable rows navigating to accounting
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
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ArrowRight } from "lucide-react";
import { trpc } from "@/lib/trpc";

type TimePeriod = "LIFETIME" | "YEAR" | "QUARTER" | "MONTH";

export const CashFlowWidget = memo(function CashFlowWidget() {
  const [, setLocation] = useLocation();
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
          <CardTitle className="text-lg font-semibold">Cash Flow</CardTitle>
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
              onClick={() => setLocation("/accounting")}
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
          </div>
        ) : data ? (
          <Table>
            <TableBody>
              <TableRow
                className="cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => setLocation("/accounting/invoices")}
              >
                <TableCell className="font-medium">Cash Collected</TableCell>
                <TableCell className="text-right font-mono text-green-600">
                  {formatCurrency(data.cashCollected)}
                </TableCell>
              </TableRow>
              <TableRow
                className="cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => setLocation("/accounting/bills")}
              >
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
