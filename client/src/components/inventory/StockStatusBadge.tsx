/**
 * StockStatusBadge Component
 * Sprint 4 Track A: 4.A.2 ENH-001 - Stock Status Display
 * Color-coded badge for displaying stock status levels
 */

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { AlertTriangle, AlertCircle, CheckCircle, XCircle } from "lucide-react";

export type StockStatus = "CRITICAL" | "LOW" | "OPTIMAL" | "OUT_OF_STOCK";

interface StockStatusBadgeProps {
  status: StockStatus;
  className?: string;
  showIcon?: boolean;
}

/**
 * TER-670: Updated to WCAG 2.2 AA-compliant color combinations.
 * -700 text on -100 backgrounds fails 4.5:1 for orange and red; using -900.
 */
const statusConfig: Record<
  StockStatus,
  {
    label: string;
    className: string;
    icon: typeof AlertCircle;
  }
> = {
  CRITICAL: {
    label: "Critical",
    className: "bg-red-100 text-red-900 border-red-400",
    icon: AlertCircle,
  },
  LOW: {
    label: "Low Stock",
    className: "bg-[var(--warning-bg)] text-orange-900 border-orange-400",
    icon: AlertTriangle,
  },
  OPTIMAL: {
    label: "Optimal",
    className: "bg-[var(--success-bg)] text-green-900 border-green-400",
    icon: CheckCircle,
  },
  OUT_OF_STOCK: {
    label: "Out of Stock",
    className: "bg-gray-100 text-gray-800 border-gray-400",
    icon: XCircle,
  },
};

export function StockStatusBadge({
  status,
  className,
  showIcon = true,
}: StockStatusBadgeProps) {
  const config = statusConfig[status] || statusConfig.OPTIMAL;
  const Icon = config.icon;

  return (
    <Badge variant="outline" className={cn(config.className, className)}>
      {showIcon && <Icon className="h-3 w-3 mr-1" />}
      {config.label}
    </Badge>
  );
}

/**
 * TER-1251: Human-readable labels for stock status enum values.
 * Use this in grid column formatters, inspector fields, and CSV exports
 * instead of rendering the raw enum string.
 */
export const STOCK_STATUS_LABELS: Record<StockStatus, string> = {
  CRITICAL: statusConfig.CRITICAL.label,
  LOW: statusConfig.LOW.label,
  OPTIMAL: statusConfig.OPTIMAL.label,
  OUT_OF_STOCK: statusConfig.OUT_OF_STOCK.label,
};

/**
 * Resolve a human-readable label for a raw stock status enum value.
 * Falls back to a title-cased form of the raw value when the enum is
 * unrecognized, to avoid ever surfacing SCREAMING_SNAKE_CASE to users.
 */
export function getStockStatusLabel(
  status: string | null | undefined
): string {
  if (!status) return "";
  const known = STOCK_STATUS_LABELS[status as StockStatus];
  if (known) return known;
  return status
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, c => c.toUpperCase());
}
