/**
 * Sprint 5 Track A - Task 5.A.3: MEET-042 - Credit Usage Display
 *
 * Component to display VIP credit usage on their profile:
 * - Current credit limit
 * - Used credit amount
 * - Available credit
 * - Credit utilization percentage
 */

import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  CreditCard,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Info,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";

interface CreditUsageDisplayProps {
  clientId: number;
  variant?: "compact" | "detailed" | "full";
}

export function CreditUsageDisplay({
  clientId,
  variant = "detailed",
}: CreditUsageDisplayProps) {
  const { data: creditUsage, isLoading } =
    trpc.vipPortal.liveCatalog.credit.getUsage.useQuery(undefined, {
      enabled: clientId > 0,
    });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-6">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
        </CardContent>
      </Card>
    );
  }

  if (!creditUsage) {
    return null;
  }

  // Determine utilization status
  const getUtilizationStatus = (percentage: number) => {
    if (percentage >= 100)
      return { status: "over", color: "text-red-600", bg: "bg-red-50" };
    if (percentage >= 80)
      return { status: "warning", color: "text-amber-600", bg: "bg-amber-50" };
    if (percentage >= 50)
      return { status: "moderate", color: "text-blue-600", bg: "bg-blue-50" };
    return { status: "good", color: "text-green-600", bg: "bg-green-50" };
  };

  const utilizationStatus = getUtilizationStatus(creditUsage.utilizationPercentage);

  // Compact variant
  if (variant === "compact") {
    return (
      <div className="flex items-center gap-4 p-4 rounded-lg border bg-card">
        <CreditCard
          className={cn("h-8 w-8", utilizationStatus.color)}
        />
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium">Credit Available</span>
            <span className="text-lg font-bold">
              ${creditUsage.availableCredit.toLocaleString()}
            </span>
          </div>
          <Progress
            value={Math.min(100, creditUsage.utilizationPercentage)}
            className="h-2"
          />
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>{creditUsage.utilizationPercentage}% used</span>
            <span>Limit: ${creditUsage.creditLimit.toLocaleString()}</span>
          </div>
        </div>
      </div>
    );
  }

  // Detailed variant (default)
  if (variant === "detailed") {
    return (
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-lg">Credit Center</CardTitle>
            </div>
            {creditUsage.overCreditLimit && (
              <Badge variant="destructive" className="gap-1">
                <AlertTriangle className="h-3 w-3" />
                Over Limit
              </Badge>
            )}
          </div>
          <CardDescription>
            Your credit status and availability
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Credit Utilization Meter */}
          <div className={cn("p-4 rounded-lg", utilizationStatus.bg)}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Credit Utilization</span>
              <span className={cn("text-2xl font-bold", utilizationStatus.color)}>
                {creditUsage.utilizationPercentage}%
              </span>
            </div>
            <Progress
              value={Math.min(100, creditUsage.utilizationPercentage)}
              className="h-3"
            />
            <div className="flex justify-between text-sm mt-2">
              <span>
                Used: ${creditUsage.usedCredit.toLocaleString()}
              </span>
              <span>
                Limit: ${creditUsage.creditLimit.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Credit Stats Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 rounded-lg bg-green-50 border border-green-200">
              <div className="flex items-center gap-2 text-green-700 mb-1">
                <CheckCircle className="h-4 w-4" />
                <span className="text-sm font-medium">Available</span>
              </div>
              <span className="text-xl font-bold text-green-700">
                ${creditUsage.availableCredit.toLocaleString()}
              </span>
            </div>

            <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
              <div className="flex items-center gap-2 text-blue-700 mb-1">
                <CreditCard className="h-4 w-4" />
                <span className="text-sm font-medium">Outstanding</span>
              </div>
              <span className="text-xl font-bold text-blue-700">
                ${creditUsage.usedCredit.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Tier Bonus */}
          {creditUsage.tierMultiplier > 1 && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-purple-50 border border-purple-200">
              <TrendingUp className="h-4 w-4 text-purple-600" />
              <span className="text-sm text-purple-700">
                <strong>{creditUsage.tierName}</strong> tier gives you a{" "}
                <strong>
                  {Math.round((creditUsage.tierMultiplier - 1) * 100)}%
                </strong>{" "}
                credit limit boost!
              </span>
            </div>
          )}

          {/* Pending Orders */}
          {creditUsage.pendingOrders > 0 && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200">
              <Info className="h-4 w-4 text-amber-600" />
              <span className="text-sm text-amber-700">
                You have <strong>{creditUsage.pendingOrders}</strong> pending
                order(s) totaling{" "}
                <strong>${creditUsage.pendingOrdersValue.toLocaleString()}</strong>
              </span>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // Full variant (includes history chart placeholder)
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-muted-foreground" />
            <CardTitle>Credit Center</CardTitle>
          </div>
          {creditUsage.overCreditLimit && (
            <Badge variant="destructive" className="gap-1">
              <AlertTriangle className="h-3 w-3" />
              Over Limit
            </Badge>
          )}
        </div>
        <CardDescription>
          Complete overview of your credit status
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Main Credit Display */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-lg bg-card border">
            <div className="text-sm text-muted-foreground mb-1">Credit Limit</div>
            <div className="text-2xl font-bold">
              ${creditUsage.creditLimit.toLocaleString()}
            </div>
            {creditUsage.tierMultiplier > 1 && (
              <div className="text-xs text-purple-600 mt-1 flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                Base: ${creditUsage.baseCreditLimit.toLocaleString()} (+
                {Math.round((creditUsage.tierMultiplier - 1) * 100)}% tier bonus)
              </div>
            )}
          </div>

          <div className="p-4 rounded-lg bg-card border">
            <div className="text-sm text-muted-foreground mb-1">Used Credit</div>
            <div className="text-2xl font-bold text-blue-600">
              ${creditUsage.usedCredit.toLocaleString()}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              From unpaid invoices
            </div>
          </div>

          <div className={cn("p-4 rounded-lg border", creditUsage.overCreditLimit ? "bg-red-50 border-red-200" : "bg-green-50 border-green-200")}>
            <div className="text-sm text-muted-foreground mb-1">Available</div>
            <div className={cn("text-2xl font-bold", creditUsage.overCreditLimit ? "text-red-600" : "text-green-600")}>
              ${creditUsage.availableCredit.toLocaleString()}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Ready to use
            </div>
          </div>
        </div>

        {/* Utilization Bar */}
        <div className={cn("p-4 rounded-lg", utilizationStatus.bg)}>
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium">Credit Utilization</span>
            <span className={cn("text-xl font-bold", utilizationStatus.color)}>
              {creditUsage.utilizationPercentage}%
            </span>
          </div>
          <Progress
            value={Math.min(100, creditUsage.utilizationPercentage)}
            className="h-4"
          />
          <div className="grid grid-cols-4 gap-2 mt-3">
            <UtilizationMark label="0%" />
            <UtilizationMark label="25%" />
            <UtilizationMark label="50%" />
            <UtilizationMark label="75%" />
          </div>
        </div>

        {/* Status Messages */}
        {creditUsage.overCreditLimit && (
          <div className="flex items-start gap-3 p-4 rounded-lg bg-red-50 border border-red-200">
            <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-medium text-red-800">Over Credit Limit</h4>
              <p className="text-sm text-red-700">
                You've exceeded your credit limit by $
                {(creditUsage.usedCredit - creditUsage.creditLimit).toLocaleString()}.
                Please make a payment to restore your credit availability.
              </p>
            </div>
          </div>
        )}

        {creditUsage.utilizationPercentage >= 80 &&
          !creditUsage.overCreditLimit && (
            <div className="flex items-start gap-3 p-4 rounded-lg bg-amber-50 border border-amber-200">
              <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium text-amber-800">
                  Approaching Credit Limit
                </h4>
                <p className="text-sm text-amber-700">
                  You're using {creditUsage.utilizationPercentage}% of your
                  credit limit. Consider making a payment to maintain
                  availability for new orders.
                </p>
              </div>
            </div>
          )}

        {/* Additional Info */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="p-3 rounded-lg bg-muted/50">
            <span className="text-muted-foreground">Credit Limit Source</span>
            <div className="font-medium capitalize">
              {creditUsage.creditLimitSource.toLowerCase()}
            </div>
          </div>
          <div className="p-3 rounded-lg bg-muted/50">
            <span className="text-muted-foreground">Last Updated</span>
            <div className="font-medium">
              {creditUsage.creditLimitUpdatedAt
                ? new Date(creditUsage.creditLimitUpdatedAt).toLocaleDateString()
                : "N/A"}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Helper component for utilization marks
function UtilizationMark({ label }: { label: string }) {
  return (
    <div className="text-center">
      <div className="h-2 w-px bg-gray-300 mx-auto" />
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}

export default CreditUsageDisplay;
