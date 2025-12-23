import React, { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Edit2,
  History,
  Info,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";
import { CreditExplanation } from "@/components/credit/CreditExplanation";
import { CreditOverrideDialog } from "@/components/credit/CreditOverrideDialog";

interface CreditStatusCardProps {
  clientId: number;
  clientName?: string;
  defaultExpanded?: boolean;
  showOverrideButton?: boolean;
  showRecalculateButton?: boolean;
  showHistoryButton?: boolean;
  compact?: boolean;
}

export const CreditStatusCard = React.memo(function CreditStatusCard({
  clientId,
  clientName,
  defaultExpanded = false,
  showOverrideButton = true,
  showRecalculateButton = true,
  showHistoryButton = false,
  compact = false,
}: CreditStatusCardProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [overrideDialogOpen, setOverrideDialogOpen] = useState(false);

  // Fetch credit data from client_credit_limits
  const {
    data: creditData,
    isLoading,
    refetch,
  } = trpc.credit.getByClientId.useQuery({ clientId });

  // Fetch client data for current exposure
  const { data: client } = trpc.clients.getById.useQuery({ clientId });

  // Calculate mutation
  const calculateMutation = trpc.credit.calculate.useMutation({
    onSuccess: () => {
      refetch();
    },
  });

  const handleRecalculate = async () => {
    await calculateMutation.mutateAsync({ clientId });
  };

  // Loading state
  if (isLoading) {
    return (
      <Card className={compact ? "p-3" : ""}>
        <CardContent className={compact ? "p-0" : "pt-6"}>
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-muted rounded w-1/3" />
            <div className="h-8 bg-muted rounded w-1/2" />
            <div className="h-2 bg-muted rounded w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // No credit data - show calculate button
  if (!creditData) {
    return (
      <Card className={compact ? "p-3" : ""}>
        <CardHeader className={compact ? "p-0 pb-3" : ""}>
          <CardTitle className="text-base">Credit Status</CardTitle>
        </CardHeader>
        <CardContent className={compact ? "p-0" : ""}>
          <div className="flex items-center gap-3 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
            <Info className="h-5 w-5 text-blue-600 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                No Credit Limit Set
              </p>
              <p className="text-xs text-blue-700 dark:text-blue-300 mt-0.5">
                Calculate a credit limit based on this client's financial
                history
              </p>
            </div>
            <Button
              size="sm"
              onClick={handleRecalculate}
              disabled={calculateMutation.isPending}
            >
              {calculateMutation.isPending ? "Calculating..." : "Calculate"}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Parse values
  const creditLimit = Number(creditData.creditLimit || 0);
  const currentExposure = Number(
    client?.totalOwed || creditData.currentExposure || 0
  );
  const availableCredit = creditLimit - currentExposure;
  const utilizationPercent =
    creditLimit > 0 ? (currentExposure / creditLimit) * 100 : 0;
  const isManualOverride = client?.creditLimitSource === "MANUAL";

  // Determine status color
  const getStatusColor = (utilization: number): string => {
    if (utilization >= 90) return "text-red-600";
    if (utilization >= 75) return "text-yellow-600";
    return "text-green-600";
  };

  const getProgressColor = (utilization: number): string => {
    if (utilization >= 90) return "bg-red-600";
    if (utilization >= 75) return "bg-yellow-600";
    return "bg-green-600";
  };

  const getStatusIcon = (utilization: number) => {
    if (utilization >= 90)
      return <AlertTriangle className="h-4 w-4 text-red-600" />;
    if (utilization >= 75)
      return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
    return <CheckCircle className="h-4 w-4 text-green-600" />;
  };

  return (
    <>
      <Card className={compact ? "p-3" : ""}>
        <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
          <CardHeader
            className={`${compact ? "p-0 pb-3" : "pb-3"} flex flex-row items-center justify-between`}
          >
            <div className="flex items-center gap-2">
              <CardTitle className="text-base">Credit Status</CardTitle>
              {isManualOverride && (
                <Badge variant="outline" className="text-xs">
                  Manual Override
                </Badge>
              )}
            </div>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </CollapsibleTrigger>
          </CardHeader>

          <CardContent className={compact ? "p-0" : ""}>
            {/* Always visible: Summary */}
            <div className="space-y-3">
              {/* Available Credit - Primary Display */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">
                    Available Credit
                  </p>
                  <p
                    className={`text-2xl font-bold ${getStatusColor(utilizationPercent)}`}
                  >
                    $
                    {availableCredit.toLocaleString(undefined, {
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0,
                    })}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusIcon(utilizationPercent)}
                  <span
                    className={`text-lg font-semibold ${getStatusColor(utilizationPercent)}`}
                  >
                    {utilizationPercent.toFixed(0)}%
                  </span>
                </div>
              </div>

              {/* Utilization Bar */}
              <div className="space-y-1">
                <div className="relative h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className={`absolute left-0 top-0 h-full transition-all ${getProgressColor(utilizationPercent)}`}
                    style={{ width: `${Math.min(utilizationPercent, 100)}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>${currentExposure.toLocaleString()} used</span>
                  <span>${creditLimit.toLocaleString()} limit</span>
                </div>
              </div>

              {/* Action Buttons (collapsed view) */}
              {!isExpanded && showOverrideButton && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => setOverrideDialogOpen(true)}
                >
                  <Edit2 className="h-3 w-3 mr-2" />
                  Override Limit
                </Button>
              )}
            </div>

            {/* Expanded Content */}
            <CollapsibleContent className="space-y-4 pt-4">
              {/* Credit Explanation - "Show Your Work" */}
              <CreditExplanation creditData={creditData} />

              {/* Last Updated Info */}
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  Last calculated:{" "}
                  {creditData.updatedAt
                    ? new Date(creditData.updatedAt).toLocaleDateString()
                    : "Never"}
                </span>
                {creditData.mode === "LEARNING" && (
                  <Badge
                    variant="outline"
                    className="text-xs border-yellow-600 text-yellow-600"
                  >
                    Learning Mode
                  </Badge>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                {showRecalculateButton && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRecalculate}
                    disabled={calculateMutation.isPending}
                    className="flex-1"
                  >
                    <RefreshCw
                      className={`h-3 w-3 mr-2 ${calculateMutation.isPending ? "animate-spin" : ""}`}
                    />
                    {calculateMutation.isPending
                      ? "Calculating..."
                      : "Recalculate"}
                  </Button>
                )}
                {showOverrideButton && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setOverrideDialogOpen(true)}
                    className="flex-1"
                  >
                    <Edit2 className="h-3 w-3 mr-2" />
                    Override
                  </Button>
                )}
                {showHistoryButton && (
                  <Button variant="ghost" size="sm">
                    <History className="h-3 w-3 mr-2" />
                    History
                  </Button>
                )}
              </div>

              {/* Learning Mode Warning */}
              {creditData.mode === "LEARNING" && (
                <div className="flex gap-2 p-3 bg-yellow-50 dark:bg-yellow-950 rounded-lg border border-yellow-200 dark:border-yellow-800">
                  <AlertTriangle className="h-4 w-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <p className="font-medium text-yellow-900 dark:text-yellow-100">
                      Learning Mode Active
                    </p>
                    <p className="text-yellow-800 dark:text-yellow-200 mt-0.5">
                      Limited transaction history. Credit limit is conservative
                      until more data is available. Data readiness:{" "}
                      {Number(creditData.dataReadiness || 0).toFixed(0)}%
                    </p>
                  </div>
                </div>
              )}
            </CollapsibleContent>
          </CardContent>
        </Collapsible>
      </Card>

      {/* Override Dialog */}
      <CreditOverrideDialog
        open={overrideDialogOpen}
        onOpenChange={setOverrideDialogOpen}
        clientId={clientId}
        clientName={clientName}
        currentLimit={creditLimit}
        onSuccess={() => {
          refetch();
        }}
      />
    </>
  );
});
