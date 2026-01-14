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
    className: "bg-red-100 text-red-700 border-red-200",
    icon: AlertCircle,
  },
  LOW: {
    label: "Low Stock",
    className: "bg-orange-100 text-orange-700 border-orange-200",
    icon: AlertTriangle,
  },
  OPTIMAL: {
    label: "Optimal",
    className: "bg-green-100 text-green-700 border-green-200",
    icon: CheckCircle,
  },
  OUT_OF_STOCK: {
    label: "Out of Stock",
    className: "bg-gray-100 text-gray-700 border-gray-200",
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
