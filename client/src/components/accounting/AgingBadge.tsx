import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type AgingBucket = "current" | "30" | "60" | "90" | "90+";

interface AgingBadgeProps {
  bucket: AgingBucket | string;
  amount?: number;
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
  currency: _currency = "$",
  className,
}: AgingBadgeProps) {
  const getAgingConfig = () => {
    const lowerBucket = bucket.toLowerCase();

    switch (lowerBucket) {
      case "current":
        return {
          label: "Current",
          className: "bg-green-100 text-green-700 border-green-200",
        };
      case "30":
        return {
          label: "30 Days",
          className: "bg-yellow-100 text-yellow-700 border-yellow-200",
        };
      case "60":
        return {
          label: "60 Days",
          className: "bg-orange-100 text-orange-700 border-orange-200",
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
    </Badge>
  );
}
