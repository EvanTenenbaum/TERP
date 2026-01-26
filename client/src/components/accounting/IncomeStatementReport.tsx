/**
 * IncomeStatementReport Component
 * Displays a profit & loss statement showing revenue and expenses
 * Part of TERP-0012 Phase 3: Financial Reports
 */

import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  AlertCircle,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Minus,
  BarChart3,
  CalendarIcon,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { format, startOfYear } from "date-fns";

interface IncomeStatementReportProps {
  defaultStartDate?: Date;
  defaultEndDate?: Date;
  onDateChange?: (startDate: Date, endDate: Date) => void;
  showDateSelector?: boolean;
}

interface AccountItem {
  name: string;
  amount: number;
}

interface SectionData {
  items: AccountItem[];
  total: number;
}

interface IncomeStatementData {
  period: {
    startDate: string;
    endDate: string;
  };
  revenue: SectionData;
  costOfGoodsSold: SectionData;
  grossProfit: number;
  operatingExpenses: SectionData;
  netIncome: number;
  grossMarginPercent: number;
  netMarginPercent: number;
}

export function IncomeStatementReport({
  defaultStartDate,
  defaultEndDate,
  onDateChange,
  showDateSelector = true,
}: IncomeStatementReportProps) {
  const [startDate, setStartDate] = React.useState<Date>(
    defaultStartDate ?? startOfYear(new Date())
  );
  const [endDate, setEndDate] = React.useState<Date>(
    defaultEndDate ?? new Date()
  );

  const {
    data: incomeStatement,
    isLoading,
    error,
  } = trpc.accounting.reports.generateIncomeStatement.useQuery({
    startDate,
    endDate,
  });

  const handleStartDateChange = (date: Date | undefined) => {
    if (date) {
      setStartDate(date);
      onDateChange?.(date, endDate);
    }
  };

  const handleEndDateChange = (date: Date | undefined) => {
    if (date) {
      setEndDate(date);
      onDateChange?.(startDate, date);
    }
  };

  const formatCurrency = (value: number | undefined) => {
    if (value === undefined || value === null) return "$0.00";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(value);
  };

  const formatPercent = (value: number | undefined) => {
    if (value === undefined || value === null) return "0.0%";
    return `${value.toFixed(1)}%`;
  };

  const data = incomeStatement as IncomeStatementData | undefined;

  const isPositive = (value: number | undefined) => {
    if (value === undefined) return true;
    return value >= 0;
  };

  const renderAccountSection = (
    items: AccountItem[] | undefined,
    indent = false
  ) => {
    if (!items || items.length === 0) return null;

    return items.map(item => (
      <TableRow key={item.name}>
        <TableCell className={indent ? "pl-8" : "pl-4"}>{item.name}</TableCell>
        <TableCell className="text-right font-mono">
          {formatCurrency(item.amount)}
        </TableCell>
      </TableRow>
    ));
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Income Statement
            </CardTitle>
            <CardDescription>
              {data?.period
                ? `${format(new Date(data.period.startDate), "MMM d, yyyy")} - ${format(
                    new Date(data.period.endDate),
                    "MMM d, yyyy"
                  )}`
                : "Revenue, Expenses, and Net Income"}
            </CardDescription>
          </div>
          {showDateSelector && (
            <div className="flex gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(startDate, "MMM d")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={handleStartDateChange}
                    disabled={date => date > endDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <span className="self-center">-</span>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(endDate, "MMM d")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={handleEndDateChange}
                    disabled={date => date < startDate || date > new Date()}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-3/4" />
          </div>
        ) : error ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Failed to load income statement: {error.message}
            </AlertDescription>
          </Alert>
        ) : !data ? (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              No data available for this period.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableBody>
                {/* Revenue Section */}
                <TableRow className="bg-muted/50">
                  <TableCell colSpan={2} className="font-semibold">
                    <TrendingUp className="h-3 w-3 inline mr-2 text-green-600" />
                    Revenue
                  </TableCell>
                </TableRow>
                {renderAccountSection(data.revenue?.items, true)}
                <TableRow className="bg-green-50 dark:bg-green-950/20 font-semibold">
                  <TableCell className="pl-4">Total Revenue</TableCell>
                  <TableCell className="text-right font-mono">
                    {formatCurrency(data.revenue?.total)}
                  </TableCell>
                </TableRow>

                {/* COGS Section */}
                <TableRow className="bg-muted/50">
                  <TableCell colSpan={2} className="font-semibold">
                    <Minus className="h-3 w-3 inline mr-2 text-orange-600" />
                    Cost of Goods Sold
                  </TableCell>
                </TableRow>
                {renderAccountSection(data.costOfGoodsSold?.items, true)}
                <TableRow className="bg-orange-50 dark:bg-orange-950/20 font-semibold">
                  <TableCell className="pl-4">Total COGS</TableCell>
                  <TableCell className="text-right font-mono">
                    ({formatCurrency(data.costOfGoodsSold?.total)})
                  </TableCell>
                </TableRow>

                {/* Gross Profit */}
                <TableRow className="bg-blue-50 dark:bg-blue-950/20 font-bold border-y-2">
                  <TableCell>
                    <DollarSign className="h-3 w-3 inline mr-2" />
                    Gross Profit
                    <Badge variant="outline" className="ml-2 text-xs">
                      {formatPercent(data.grossMarginPercent)} margin
                    </Badge>
                  </TableCell>
                  <TableCell
                    className={`text-right font-mono ${
                      isPositive(data.grossProfit)
                        ? "text-green-700"
                        : "text-red-700"
                    }`}
                  >
                    {formatCurrency(data.grossProfit)}
                  </TableCell>
                </TableRow>

                {/* Operating Expenses */}
                <TableRow className="bg-muted/50">
                  <TableCell colSpan={2} className="font-semibold">
                    <TrendingDown className="h-3 w-3 inline mr-2 text-red-600" />
                    Operating Expenses
                  </TableCell>
                </TableRow>
                {renderAccountSection(data.operatingExpenses?.items, true)}
                <TableRow className="bg-red-50 dark:bg-red-950/20 font-semibold">
                  <TableCell className="pl-4">
                    Total Operating Expenses
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    ({formatCurrency(data.operatingExpenses?.total)})
                  </TableCell>
                </TableRow>

                {/* Net Income */}
                <TableRow
                  className={`font-bold text-lg ${
                    isPositive(data.netIncome)
                      ? "bg-green-100 dark:bg-green-950/30"
                      : "bg-red-100 dark:bg-red-950/30"
                  }`}
                >
                  <TableCell>
                    Net Income
                    <Badge
                      variant={
                        isPositive(data.netIncome) ? "default" : "destructive"
                      }
                      className="ml-2"
                    >
                      {formatPercent(data.netMarginPercent)} margin
                    </Badge>
                  </TableCell>
                  <TableCell
                    className={`text-right font-mono text-lg ${
                      isPositive(data.netIncome)
                        ? "text-green-700"
                        : "text-red-700"
                    }`}
                  >
                    {formatCurrency(data.netIncome)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default IncomeStatementReport;
