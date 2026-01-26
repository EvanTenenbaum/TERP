/**
 * ClientBalanceCard - ARCH-002 Client Balance Management UI
 *
 * Shows computed vs stored balance with discrepancy detection
 * and sync functionality.
 */

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import {
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  DollarSign,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ClientBalanceCardProps {
  clientId: number;
  clientName?: string;
  compact?: boolean;
  showSyncButton?: boolean;
  className?: string;
}

/**
 * Format currency for display
 */
function formatCurrency(amount: number | string | null | undefined): string {
  const num = typeof amount === "string" ? parseFloat(amount) : (amount ?? 0);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(num);
}

export function ClientBalanceCard({
  clientId,
  clientName,
  compact = false,
  showSyncButton = true,
  className,
}: ClientBalanceCardProps) {
  const [isSyncing, setIsSyncing] = useState(false);

  // Fetch computed balance from ledger
  const {
    data: balanceData,
    isLoading,
    refetch,
  } = trpc.accounting.clientBalances.getClientBalance.useQuery(
    { clientId },
    { staleTime: 30000 } // Cache for 30 seconds
  );

  // Sync mutation
  const syncMutation =
    trpc.accounting.clientBalances.syncClientBalance.useMutation({
      onSuccess: (data: { clientId: number; newBalance: number }) => {
        toast.success(`Balance synced to ${formatCurrency(data.newBalance)}`);
        refetch();
      },
      onError: error => {
        toast.error(`Failed to sync balance: ${error.message}`);
      },
      onSettled: () => {
        setIsSyncing(false);
      },
    });

  const handleSync = () => {
    setIsSyncing(true);
    syncMutation.mutate({ clientId });
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader className={compact ? "pb-2" : undefined}>
          <CardTitle className={compact ? "text-sm" : undefined}>
            {clientName ? `${clientName} Balance` : "Client Balance"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-32" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const storedBalance = balanceData?.storedBalance ?? 0;
  const computedBalance = balanceData?.computedBalance ?? 0;
  const discrepancy = balanceData?.discrepancy ?? 0;
  const hasDiscrepancy = Math.abs(discrepancy) > 0.01; // Allow for small rounding differences

  return (
    <Card className={cn(hasDiscrepancy && "border-amber-300", className)}>
      <CardHeader
        className={cn(
          compact ? "pb-2" : undefined,
          "flex flex-row items-center justify-between"
        )}
      >
        <CardTitle
          className={cn(
            compact ? "text-sm" : "text-base",
            "flex items-center gap-2"
          )}
        >
          <DollarSign className="h-4 w-4 text-muted-foreground" />
          {clientName ? `${clientName} Balance` : "Client Balance"}
        </CardTitle>
        {hasDiscrepancy ? (
          <Badge
            variant="outline"
            className="bg-amber-100 text-amber-700 border-amber-200"
          >
            <AlertTriangle className="h-3 w-3 mr-1" />
            Discrepancy
          </Badge>
        ) : (
          <Badge
            variant="outline"
            className="bg-green-100 text-green-700 border-green-200"
          >
            <CheckCircle className="h-3 w-3 mr-1" />
            Synced
          </Badge>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <div
          className={cn(
            "grid gap-4",
            compact ? "grid-cols-2" : "grid-cols-1 sm:grid-cols-2"
          )}
        >
          <div>
            <p className="text-xs text-muted-foreground mb-1">Stored Balance</p>
            <p className={cn("font-semibold", compact ? "text-lg" : "text-xl")}>
              {formatCurrency(storedBalance)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">
              Computed Balance
            </p>
            <p className={cn("font-semibold", compact ? "text-lg" : "text-xl")}>
              {formatCurrency(computedBalance)}
            </p>
          </div>
        </div>

        {hasDiscrepancy && (
          <Alert className="bg-amber-50 border-amber-200">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-800">
              <strong>Balance discrepancy detected:</strong>{" "}
              {formatCurrency(Math.abs(discrepancy))}{" "}
              {discrepancy > 0 ? "overstated" : "understated"}
            </AlertDescription>
          </Alert>
        )}

        {showSyncButton && (
          <Button
            variant={hasDiscrepancy ? "default" : "outline"}
            size={compact ? "sm" : "default"}
            onClick={handleSync}
            disabled={isSyncing}
            className="w-full"
          >
            <RefreshCw
              className={cn("h-4 w-4 mr-2", isSyncing && "animate-spin")}
            />
            {isSyncing
              ? "Syncing..."
              : hasDiscrepancy
                ? "Sync Balance"
                : "Refresh Balance"}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * ClientBalanceDiscrepancyAlert - Shows when there are balance discrepancies
 * For use in dashboard or alert sections
 */
interface ClientBalanceDiscrepancyAlertProps {
  className?: string;
  onViewAll?: () => void;
}

export function ClientBalanceDiscrepancyAlert({
  className,
  onViewAll,
}: ClientBalanceDiscrepancyAlertProps) {
  const { data: discrepancies, isLoading } =
    trpc.accounting.clientBalances.findDiscrepancies.useQuery(undefined, {
      staleTime: 60000, // Cache for 1 minute
    });

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="pt-6">
          <Skeleton className="h-4 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!discrepancies || discrepancies.length === 0) {
    return null; // Don't show anything if no discrepancies
  }

  const totalDiscrepancy = discrepancies.reduce(
    (sum, d) => sum + Math.abs(d.discrepancy),
    0
  );

  return (
    <Alert className={cn("bg-amber-50 border-amber-200", className)}>
      <AlertTriangle className="h-4 w-4 text-amber-600" />
      <AlertDescription className="flex items-center justify-between">
        <div>
          <strong className="text-amber-800">
            {discrepancies.length} client{discrepancies.length !== 1 ? "s" : ""}{" "}
            with balance discrepancies
          </strong>
          <p className="text-sm text-amber-700">
            Total discrepancy: {formatCurrency(totalDiscrepancy)}
          </p>
        </div>
        {onViewAll && (
          <Button variant="outline" size="sm" onClick={onViewAll}>
            View All
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
}
