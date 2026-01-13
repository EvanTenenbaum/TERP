/**
 * AgingBadge Component
 * Sprint 4 Track A: 4.A.3 MEET-024 - Aging Inventory Visual
 * Color-coded badge for displaying inventory age
 * - Red: >14 days (AGING/CRITICAL)
 * - Yellow: 7-14 days (MODERATE)
 * - Green: <7 days (FRESH)
 */

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Clock, AlertTriangle, AlertCircle, Leaf } from "lucide-react";

export type AgeBracket = "FRESH" | "MODERATE" | "AGING" | "CRITICAL";

interface AgingBadgeProps {
  ageDays: number;
  ageBracket?: AgeBracket;
  className?: string;
  showIcon?: boolean;
  showDays?: boolean;
  variant?: "badge" | "inline" | "compact";
}

const bracketConfig: Record<
  AgeBracket,
  {
    label: string;
    className: string;
    bgClassName: string;
    icon: typeof Clock;
  }
> = {
  FRESH: {
    label: "Fresh",
    className: "bg-green-100 text-green-700 border-green-200",
    bgClassName: "bg-green-50",
    icon: Leaf,
  },
  MODERATE: {
    label: "Moderate",
    className: "bg-yellow-100 text-yellow-700 border-yellow-200",
    bgClassName: "bg-yellow-50",
    icon: Clock,
  },
  AGING: {
    label: "Aging",
    className: "bg-orange-100 text-orange-700 border-orange-200",
    bgClassName: "bg-orange-50",
    icon: AlertTriangle,
  },
  CRITICAL: {
    label: "Critical",
    className: "bg-red-100 text-red-700 border-red-200",
    bgClassName: "bg-red-50",
    icon: AlertCircle,
  },
};

/**
 * Calculate age bracket from days
 */
export function getAgeBracket(ageDays: number): AgeBracket {
  if (ageDays <= 7) return "FRESH";
  if (ageDays <= 14) return "MODERATE";
  if (ageDays <= 30) return "AGING";
  return "CRITICAL";
}

/**
 * Get row highlight class based on aging (for table rows)
 */
export function getAgingRowClass(ageDays: number): string {
  if (ageDays > 14) return "bg-red-50/50"; // Red highlight for >2 weeks
  if (ageDays > 7) return "bg-yellow-50/50"; // Yellow highlight for 1-2 weeks
  return ""; // No highlight for fresh
}

export function AgingBadge({
  ageDays,
  ageBracket,
  className,
  showIcon = true,
  showDays = true,
  variant = "badge",
}: AgingBadgeProps) {
  const bracket = ageBracket || getAgeBracket(ageDays);
  const config = bracketConfig[bracket];
  const Icon = config.icon;

  if (variant === "compact") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 text-sm",
          ageDays > 14
            ? "text-red-600 font-semibold"
            : ageDays > 7
              ? "text-yellow-600"
              : "text-muted-foreground"
        )}
      >
        {showIcon && <Icon className="h-3 w-3" />}
        {ageDays}d
      </span>
    );
  }

  if (variant === "inline") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium",
          config.className,
          className
        )}
      >
        {showIcon && <Icon className="h-3 w-3" />}
        {showDays ? `${ageDays} days` : config.label}
      </span>
    );
  }

  return (
    <Badge variant="outline" className={cn(config.className, className)}>
      {showIcon && <Icon className="h-3 w-3 mr-1" />}
      {showDays ? (
        <span>
          {ageDays}d - {config.label}
        </span>
      ) : (
        config.label
      )}
    </Badge>
  );
}
