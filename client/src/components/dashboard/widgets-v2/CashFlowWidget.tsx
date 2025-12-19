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
import { trpc } from "@/lib/trpc";
import { EmptyState } from "@/components/ui/EmptyState";
import { DollarSign } from "lucide-react";
import { TableSkeleton } from "@/components/ui/skeletons";

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
          <TableSkeleton rowCount={2} columnCount={2} showHeader={false} />
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
            icon={DollarSign}
            title="No cash flow data"
            description="Income and expenses will appear here"
            className="py-8"
          />
        )}
      </CardContent>
    </Card>
  );
});
