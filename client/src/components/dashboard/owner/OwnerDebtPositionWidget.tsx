import { memo } from "react";
import { useLocation } from "wouter";
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
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { ArrowRight, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";

export const OwnerDebtPositionWidget = memo(function OwnerDebtPositionWidget() {
  const [, setLocation] = useLocation();
  const { data, isLoading } = trpc.dashboard.getTotalDebt.useQuery(undefined, {
    refetchInterval: 60000,
  });

  const formatCurrency = (value: number) => {
    return `$${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const getDebtSummary = (owedToMe: number, iOwe: number): string => {
    const net = owedToMe - iOwe;
    if (owedToMe === 0 && iOwe === 0) {
      return "No outstanding balances on either side.";
    }
    if (net > 0) {
      return `Clients owe you ${formatCurrency(net)} more than you owe suppliers — you're net positive.`;
    }
    if (net < 0) {
      return `You owe suppliers ${formatCurrency(Math.abs(net))} more than clients owe you — collect faster.`;
    }
    return "Your incoming and outgoing balances are exactly even.";
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold">
              Money In vs. Out
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              What customers owe you vs. what you owe suppliers
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation("/clients?hasDebt=true")}
            className="text-xs"
          >
            View Clients <ArrowRight className="h-3 w-3 ml-1" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : data ? (
          <div className="space-y-4">
            {/* Plain-language summary */}
            {(() => {
              const net = data.totalDebtOwedToMe - data.totalDebtIOwedToVendors;
              const isPositive = net >= 0;
              return (
                <div
                  className={cn(
                    "rounded-lg p-3 text-sm font-medium flex items-start gap-2",
                    isPositive
                      ? "bg-[var(--success-bg)] text-[var(--success)] border border-green-200"
                      : "bg-destructive/10 text-destructive border border-red-200"
                  )}
                >
                  {net > 0 ? (
                    <TrendingUp className="h-4 w-4 shrink-0 mt-0.5" />
                  ) : net < 0 ? (
                    <TrendingDown className="h-4 w-4 shrink-0 mt-0.5" />
                  ) : (
                    <Minus className="h-4 w-4 shrink-0 mt-0.5" />
                  )}
                  <span>
                    {getDebtSummary(
                      data.totalDebtOwedToMe,
                      data.totalDebtIOwedToVendors
                    )}
                  </span>
                </div>
              );
            })()}

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Balance</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right w-24">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => setLocation("/clients?hasDebt=true")}
                >
                  <TableCell>
                    <p className="font-medium">Clients owe you</p>
                    <p className="text-xs text-muted-foreground">
                      Outstanding receivables
                    </p>
                  </TableCell>
                  <TableCell className="text-right font-mono text-[var(--success)] font-semibold">
                    {formatCurrency(data.totalDebtOwedToMe)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs h-7 text-[var(--success)]"
                      onClick={e => {
                        e.stopPropagation();
                        setLocation("/clients?hasDebt=true");
                      }}
                    >
                      Collect <ArrowRight className="h-3 w-3 ml-1" />
                    </Button>
                  </TableCell>
                </TableRow>
                <TableRow
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => setLocation("/accounting/bills")}
                >
                  <TableCell>
                    <p className="font-medium">You owe suppliers</p>
                    <p className="text-xs text-muted-foreground">
                      Outstanding payables
                    </p>
                  </TableCell>
                  <TableCell className="text-right font-mono text-destructive font-semibold">
                    {formatCurrency(data.totalDebtIOwedToVendors)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs h-7 text-destructive"
                      onClick={e => {
                        e.stopPropagation();
                        setLocation("/accounting/bills");
                      }}
                    >
                      Pay <ArrowRight className="h-3 w-3 ml-1" />
                    </Button>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>

            {/* Net position summary row */}
            <div className="flex items-center justify-between rounded-lg bg-muted/40 px-4 py-2 border">
              <p className="text-sm font-semibold">Net Position</p>
              <p
                className={cn(
                  "font-mono font-bold text-base",
                  data.totalDebtOwedToMe - data.totalDebtIOwedToVendors >= 0
                    ? "text-[var(--success)]"
                    : "text-destructive"
                )}
              >
                {formatCurrency(
                  data.totalDebtOwedToMe - data.totalDebtIOwedToVendors
                )}
              </p>
            </div>
          </div>
        ) : (
          <EmptyState
            variant="analytics"
            size="sm"
            title="No debt data"
            description="Debt data will appear once transactions are recorded"
          />
        )}
      </CardContent>
    </Card>
  );
});
