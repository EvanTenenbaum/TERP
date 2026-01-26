/**
 * BalanceSheetReport Component
 * Displays a balance sheet showing assets, liabilities, and equity
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
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  AlertCircle,
  Building2,
  TrendingUp,
  TrendingDown,
  Wallet,
  CalendarIcon,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { format } from "date-fns";

interface BalanceSheetReportProps {
  defaultDate?: Date;
  onDateChange?: (date: Date) => void;
  showDateSelector?: boolean;
}

interface AccountItem {
  accountName: string;
  balance: number;
}

interface BalanceSheetSection {
  items: AccountItem[];
  total: number;
}

interface BalanceSheetData {
  asOfDate: string;
  assets: BalanceSheetSection;
  liabilities: BalanceSheetSection;
  equity: BalanceSheetSection;
  isBalanced: boolean;
}

export function BalanceSheetReport({
  defaultDate,
  onDateChange,
  showDateSelector = true,
}: BalanceSheetReportProps) {
  const [asOfDate, setAsOfDate] = React.useState<Date>(
    defaultDate ?? new Date()
  );

  const {
    data: balanceSheet,
    isLoading,
    error,
  } = trpc.accounting.reports.generateBalanceSheet.useQuery({
    asOfDate,
  });

  const handleDateChange = (newDate: Date | undefined) => {
    if (newDate) {
      setAsOfDate(newDate);
      onDateChange?.(newDate);
    }
  };

  const formatCurrency = (value: number | undefined) => {
    if (value === undefined || value === null) return "$0.00";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(value);
  };

  const data = balanceSheet as BalanceSheetData | undefined;
  const totalLiabilitiesAndEquity =
    (data?.liabilities?.total ?? 0) + (data?.equity?.total ?? 0);

  const renderSection = (section: BalanceSheetSection | undefined) => {
    if (!section || !section.items || section.items.length === 0) {
      return (
        <TableRow>
          <TableCell colSpan={2} className="text-center text-muted-foreground">
            No items
          </TableCell>
        </TableRow>
      );
    }

    return section.items.map(item => (
      <TableRow key={item.accountName}>
        <TableCell className="pl-6">{item.accountName}</TableCell>
        <TableCell className="text-right font-mono">
          {formatCurrency(item.balance)}
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
              <Building2 className="h-5 w-5" />
              Balance Sheet
            </CardTitle>
            <CardDescription>
              {data?.asOfDate
                ? `As of ${format(new Date(data.asOfDate), "MMMM d, yyyy")}`
                : "Assets, Liabilities, and Equity"}
            </CardDescription>
          </div>
          {showDateSelector && (
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-48">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(asOfDate, "MMM d, yyyy")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="single"
                  selected={asOfDate}
                  onSelect={handleDateChange}
                  disabled={date => date > new Date()}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
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
              Failed to load balance sheet: {error.message}
            </AlertDescription>
          </Alert>
        ) : !data ? (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>No data available.</AlertDescription>
          </Alert>
        ) : (
          <>
            {/* Balance Check */}
            {!data.isBalanced && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Warning: Balance sheet is out of balance.
                </AlertDescription>
              </Alert>
            )}

            {/* Assets Section */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="h-4 w-4 text-green-600" />
                <h3 className="font-semibold">Assets</h3>
              </div>
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableBody>
                    <TableRow className="bg-muted/50">
                      <TableCell className="font-medium">
                        <Wallet className="h-3 w-3 inline mr-2" />
                        Assets
                      </TableCell>
                      <TableCell />
                    </TableRow>
                    {renderSection(data.assets)}
                    <TableRow className="bg-green-50 dark:bg-green-950/20 font-bold">
                      <TableCell>Total Assets</TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(data.assets?.total)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </div>

            <Separator />

            {/* Liabilities Section */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <TrendingDown className="h-4 w-4 text-red-600" />
                <h3 className="font-semibold">Liabilities</h3>
              </div>
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableBody>
                    {renderSection(data.liabilities)}
                    <TableRow className="bg-red-50 dark:bg-red-950/20 font-bold">
                      <TableCell>Total Liabilities</TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(data.liabilities?.total)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </div>

            <Separator />

            {/* Equity Section */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Building2 className="h-4 w-4 text-blue-600" />
                <h3 className="font-semibold">Equity</h3>
              </div>
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableBody>
                    {renderSection(data.equity)}
                    <TableRow className="bg-blue-50 dark:bg-blue-950/20 font-bold">
                      <TableCell>Total Equity</TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(data.equity?.total)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Summary */}
            <div className="p-4 bg-muted rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-lg font-bold">
                  Total Liabilities & Equity
                </span>
                <span className="text-xl font-bold font-mono">
                  {formatCurrency(totalLiabilitiesAndEquity)}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant={data.isBalanced ? "outline" : "destructive"}>
                  {data.isBalanced ? "Balanced ✓" : "Out of Balance ✗"}
                </Badge>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default BalanceSheetReport;
