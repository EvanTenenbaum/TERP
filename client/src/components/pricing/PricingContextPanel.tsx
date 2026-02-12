/**
 * PricingContextPanel Component (ENH-004)
 * Displays client pricing profile, rules, credit info, and adjustment capabilities
 * Shows available credit prominently with warnings
 */

import React, { useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DollarSign,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Tag,
  Percent,
  Clock,
  Package,
  CreditCard,
  Info,
} from "lucide-react";

interface PricingContextPanelProps {
  clientId: number;
  orderTotal?: number;
  onCreditWarning?: (exceedsCredit: boolean, shortfall: number) => void;
}

export function PricingContextPanel({
  clientId,
  orderTotal = 0,
  onCreditWarning,
}: PricingContextPanelProps) {
  const [isExpanded, setIsExpanded] = React.useState(false);

  // Fetch pricing context
  const { data: context, isLoading } = trpc.pricing.getClientContext.useQuery(
    { clientId },
    { enabled: clientId > 0 }
  );

  // Calculate credit status
  const creditStatus = useMemo(() => {
    if (!context) return null;

    const { client } = context;
    const availableAfterOrder = client.availableCredit - orderTotal;
    const exceedsCredit = client.creditLimit > 0 && orderTotal > client.availableCredit;
    const utilizationPercent =
      client.creditLimit > 0
        ? ((client.totalOwed + orderTotal) / client.creditLimit) * 100
        : 0;

    return {
      creditLimit: client.creditLimit,
      totalOwed: client.totalOwed,
      availableCredit: client.availableCredit,
      availableAfterOrder,
      exceedsCredit,
      shortfall: exceedsCredit ? orderTotal - client.availableCredit : 0,
      utilizationPercent,
      isHighUtilization: utilizationPercent >= 75,
      isCriticalUtilization: utilizationPercent >= 90,
    };
  }, [context, orderTotal]);

  // Notify parent of credit warnings
  React.useEffect(() => {
    if (creditStatus && onCreditWarning) {
      onCreditWarning(creditStatus.exceedsCredit, creditStatus.shortfall);
    }
  }, [creditStatus, onCreditWarning]);

  const fmt = (value: number) =>
    `$${value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

  const getUtilizationColor = (percent: number) => {
    if (percent >= 90) return "text-red-600";
    if (percent >= 75) return "text-yellow-600";
    return "text-green-600";
  };

  const getProgressColor = (percent: number) => {
    if (percent >= 90) return "bg-red-600";
    if (percent >= 75) return "bg-yellow-600";
    return "bg-green-600";
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Pricing Context
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-8 w-1/2" />
          <Skeleton className="h-2 w-full" />
          <Skeleton className="h-4 w-1/3" />
        </CardContent>
      </Card>
    );
  }

  if (!context) {
    return (
      <Card>
        <CardContent className="py-6">
          <p className="text-sm text-muted-foreground text-center">
            Select a client to view pricing context
          </p>
        </CardContent>
      </Card>
    );
  }

  const { client, userMaxDiscount, variableMarkupRules } = context;

  return (
    <Card>
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Pricing Context
            </CardTitle>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </CollapsibleTrigger>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Credit Status - Always Visible */}
          {creditStatus && (
            <div className="space-y-3">
              {/* Available Credit */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    Available Credit
                  </span>
                </div>
                <span
                  className={`text-xl font-bold ${getUtilizationColor(creditStatus.utilizationPercent)}`}
                >
                  {fmt(creditStatus.availableCredit)}
                </span>
              </div>

              {/* Utilization Bar */}
              <div className="space-y-1">
                <div className="relative h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className={`absolute left-0 top-0 h-full transition-all ${getProgressColor(creditStatus.utilizationPercent)}`}
                    style={{
                      width: `${Math.min(creditStatus.utilizationPercent, 100)}%`,
                    }}
                  />
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{fmt(creditStatus.totalOwed)} owed</span>
                  <span>{fmt(creditStatus.creditLimit)} limit</span>
                </div>
              </div>

              {/* Credit Warning */}
              {creditStatus.exceedsCredit && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Credit Limit Exceeded</AlertTitle>
                  <AlertDescription>
                    This order exceeds available credit by{" "}
                    <strong>{fmt(creditStatus.shortfall)}</strong>. Credit
                    override required to proceed.
                  </AlertDescription>
                </Alert>
              )}

              {creditStatus.isHighUtilization &&
                !creditStatus.exceedsCredit && (
                  <Alert>
                    <AlertTriangle className="h-4 w-4 text-yellow-600" />
                    <AlertDescription>
                      Credit utilization at{" "}
                      <strong>
                        {creditStatus.utilizationPercent.toFixed(0)}%
                      </strong>
                      . Available after this order:{" "}
                      <strong>{fmt(creditStatus.availableAfterOrder)}</strong>
                    </AlertDescription>
                  </Alert>
                )}
            </div>
          )}

          {/* Pricing Profile Summary */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Tag className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                Pricing Profile
              </span>
            </div>
            <Badge variant="secondary">
              {client.pricingProfileName || "Default"}
            </Badge>
          </div>

          {/* User Discount Authority */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Percent className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                Your Max Discount
              </span>
            </div>
            <Badge variant="outline">{userMaxDiscount}%</Badge>
          </div>

          {/* Expanded Content */}
          <CollapsibleContent className="space-y-4 pt-2">
            <Separator />

            {/* Pricing Rules */}
            {client.pricingRules.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Active Pricing Rules</p>
                <div className="space-y-1">
                  {client.pricingRules.map(rule => (
                    <div
                      key={rule.ruleId}
                      className="flex items-center justify-between text-sm p-2 bg-muted/50 rounded"
                    >
                      <span>{rule.ruleName}</span>
                      <Badge
                        variant={
                          rule.adjustmentType.includes("MARKDOWN")
                            ? "destructive"
                            : "default"
                        }
                      >
                        {rule.adjustmentType.includes("PERCENT")
                          ? `${rule.adjustmentValue}%`
                          : `$${rule.adjustmentValue}`}
                        {rule.adjustmentType.includes("MARKDOWN")
                          ? " off"
                          : " markup"}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Variable Markup Rules */}
            {variableMarkupRules.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Variable Markup Rules</p>
                <div className="space-y-1">
                  {variableMarkupRules.map(rule => (
                    <div
                      key={rule.id}
                      className="flex items-center justify-between text-sm p-2 bg-muted/50 rounded"
                    >
                      <div className="flex items-center gap-2">
                        {rule.ruleType === "AGE" ? (
                          <Clock className="h-3 w-3" />
                        ) : (
                          <Package className="h-3 w-3" />
                        )}
                        <span>
                          {rule.ruleType === "AGE"
                            ? `${rule.thresholdMin}${rule.thresholdMax ? `-${rule.thresholdMax}` : "+"} days`
                            : `${rule.thresholdMin}${rule.thresholdMax ? `-${rule.thresholdMax}` : "+"} units`}
                          {rule.category && ` (${rule.category})`}
                        </span>
                      </div>
                      <Badge variant="outline">
                        {rule.adjustmentMode === "PERCENT"
                          ? `${rule.adjustmentValue}%`
                          : `$${rule.adjustmentValue}`}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* COGS Adjustment */}
            {client.cogsAdjustmentType !== "NONE" && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">COGS Adjustment</span>
                <Badge variant="secondary">
                  {client.cogsAdjustmentType === "PERCENTAGE"
                    ? `${client.cogsAdjustmentValue}%`
                    : `$${client.cogsAdjustmentValue}`}
                </Badge>
              </div>
            )}

            {/* Credit Source */}
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Credit Limit Source</span>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge
                      variant={
                        client.creditLimitSource === "MANUAL"
                          ? "outline"
                          : "secondary"
                      }
                      className="flex items-center gap-1"
                    >
                      {client.creditLimitSource}
                      <Info className="h-3 w-3" />
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    {client.creditLimitSource === "MANUAL"
                      ? "Credit limit was manually set by an admin"
                      : "Credit limit was calculated based on client history"}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            {/* Oldest Debt Warning */}
            {client.oldestDebtDays > 30 && (
              <Alert>
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                <AlertDescription>
                  Oldest outstanding debt: <strong>{client.oldestDebtDays}</strong>{" "}
                  days old
                </AlertDescription>
              </Alert>
            )}
          </CollapsibleContent>
        </CardContent>
      </Collapsible>
    </Card>
  );
}
