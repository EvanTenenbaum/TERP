import React from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AlertTriangle,
  CheckCircle,
  AlertCircle,
  MinusCircle,
} from "lucide-react";

interface CreditIndicatorProps {
  creditLimit: number | string | null | undefined;
  totalOwed: number | string | null | undefined;
  onClick?: () => void;
  showLabel?: boolean;
  size?: "sm" | "md" | "lg";
}

const formatCurrency = (value: number): string =>
  `$${value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

export const CreditIndicator = React.memo(function CreditIndicator({
  creditLimit,
  totalOwed,
  onClick,
  showLabel = true,
  size = "md",
}: CreditIndicatorProps) {
  const limit = Number(creditLimit || 0);
  const owed = Number(totalOwed || 0);

  // No credit limit set
  if (limit === 0) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={onClick}
            className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
            type="button"
          >
            <MinusCircle
              className={
                size === "sm"
                  ? "h-3 w-3"
                  : size === "lg"
                    ? "h-5 w-5"
                    : "h-4 w-4"
              }
            />
            {showLabel && <span className="text-xs">N/A</span>}
          </button>
        </TooltipTrigger>
        <TooltipContent>
          <p>No credit limit set</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  const utilizationPercent = (owed / limit) * 100;
  const availableCredit = limit - owed;

  // Determine status
  const getStatus = (utilization: number) => {
    if (utilization >= 100)
      return {
        color: "text-red-600",
        bgColor: "bg-red-600",
        label: "Over Limit",
        icon: AlertTriangle,
      };
    if (utilization >= 90)
      return {
        color: "text-red-600",
        bgColor: "bg-red-600",
        label: "Critical",
        icon: AlertTriangle,
      };
    if (utilization >= 75)
      return {
        color: "text-yellow-600",
        bgColor: "bg-yellow-600",
        label: "Warning",
        icon: AlertCircle,
      };
    return {
      color: "text-green-600",
      bgColor: "bg-green-600",
      label: "Good",
      icon: CheckCircle,
    };
  };

  const status = getStatus(utilizationPercent);
  const Icon = status.icon;

  const sizeClasses = {
    sm: "h-3 w-3",
    md: "h-4 w-4",
    lg: "h-5 w-5",
  };

  const textClasses = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base",
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={onClick}
          className={`flex items-center gap-1.5 ${status.color} hover:opacity-80 transition-opacity`}
          type="button"
        >
          <Icon className={sizeClasses[size]} />
          {showLabel && (
            <span className={`font-medium ${textClasses[size]}`}>
              {utilizationPercent.toFixed(0)}%
            </span>
          )}
        </button>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Icon className="h-4 w-4" />
            <span className="font-medium">{status.label}</span>
          </div>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Credit Limit:</span>
              <span className="font-medium">{formatCurrency(limit)}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Amount Owed:</span>
              <span className="font-medium">{formatCurrency(owed)}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Available:</span>
              <span
                className={`font-medium ${availableCredit < 0 ? "text-red-600" : "text-green-600"}`}
              >
                {formatCurrency(availableCredit)}
              </span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Utilization:</span>
              <span className={`font-medium ${status.color}`}>
                {utilizationPercent.toFixed(1)}%
              </span>
            </div>
          </div>
          {/* Mini progress bar */}
          <div className="relative h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className={`absolute left-0 top-0 h-full transition-all ${status.bgColor}`}
              style={{ width: `${Math.min(utilizationPercent, 100)}%` }}
            />
          </div>
        </div>
      </TooltipContent>
    </Tooltip>
  );
});

// Compact version for table cells
export const CreditIndicatorDot = React.memo(function CreditIndicatorDot({
  creditLimit,
  totalOwed,
}: Pick<CreditIndicatorProps, "creditLimit" | "totalOwed">) {
  const limit = Number(creditLimit || 0);
  const owed = Number(totalOwed || 0);

  if (limit === 0) {
    return (
      <span
        className="inline-block w-2 h-2 rounded-full bg-gray-300"
        title="No credit limit"
      />
    );
  }

  const utilizationPercent = (owed / limit) * 100;

  const getColor = (utilization: number) => {
    if (utilization >= 90) return "bg-red-600";
    if (utilization >= 75) return "bg-yellow-600";
    return "bg-green-600";
  };

  return (
    <span
      className={`inline-block w-2 h-2 rounded-full ${getColor(utilizationPercent)}`}
      title={`${utilizationPercent.toFixed(0)}% credit utilization`}
    />
  );
});
