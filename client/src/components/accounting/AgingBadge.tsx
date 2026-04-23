import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type AgingBucket = "current" | "30" | "60" | "90" | "90+";

interface AgingBadgeProps {
  bucket: AgingBucket | string;
  amount?: number;
  count?: number;
  currency?: string;
  className?: string;
}

/**
 * AgingBadge - Colored badge for displaying AR/AP aging buckets
 *
 * Features:
 * - Color-coded based on aging severity
 * - Shows aging bucket label (Current, 30 days, 60 days, etc.)
 * - Optional amount display
 * - Consistent with TERP design system
 */
export function AgingBadge({
  bucket,
  amount,
  count,
  currency: _currency = "$",
  className,
}: AgingBadgeProps) {
  const getAgingConfig = () => {
    const lowerBucket = bucket.toLowerCase();

    switch (lowerBucket) {
      case "current":
        return {
          label: "Current",
          className: "bg-[var(--success-bg)] text-[var(--success)] border-green-200",
        };
      case "30":
        return {
          label: "30 Days",
          className: "bg-[var(--warning-bg)] text-[var(--warning)] border-yellow-200",
        };
      case "60":
        return {
          label: "60 Days",
          className: "bg-[var(--warning-bg)] text-[var(--warning)] border-orange-200",
        };
      case "90":
        return {
          label: "90 Days",
          className: "bg-red-100 text-red-700 border-red-200",
        };
      case "90+":
        return {
          label: "90+ Days",
          className: "bg-red-200 text-red-800 border-red-300 font-semibold",
        };
      default:
        return {
          label: bucket,
          className: "bg-gray-100 text-gray-700 border-gray-200",
        };
    }
  };

  const config = getAgingConfig();

  const formatAmount = (num: number): string => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(num);
  };

  return (
    <Badge variant="outline" className={cn(config.className, className)}>
      {config.label}
      {amount !== undefined && amount > 0 && (
        <span className="ml-1 font-semibold">{formatAmount(amount)}</span>
      )}
      {count !== undefined && (
        <span className="ml-1 rounded-full border border-current/20 px-1.5 py-0.5 text-[10px] leading-none">
          {count}
        </span>
      )}
    </Badge>
  );
}
