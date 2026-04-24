import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  getFulfillmentDisplayLabel,
  mapToFulfillmentDisplayStatus,
  type FulfillmentDisplayStatus,
} from "@/lib/fulfillmentDisplay";

/**
 * ARCH-003: All fulfillment statuses from the order state machine
 */
export type FulfillmentStatus =
  | "DRAFT"
  | "CONFIRMED"
  | "READY_FOR_PACKING"
  | "PACKED"
  | "SHIPPED"
  | "DELIVERED"
  | "RETURNED"
  | "RESTOCKED"
  | "RETURNED_TO_VENDOR"
  | "CANCELLED";

interface OrderStatusBadgeProps {
  status: FulfillmentStatus | string;
  className?: string;
}

/**
 * TER-670: Status badge colors use -100 backgrounds with -800 text to achieve
 * WCAG 2.2 AA contrast (≥4.5:1 for normal text). Using -700 text on -100
 * backgrounds fails contrast for yellow, amber, blue, and cyan variants.
 */
const STATUS_CONFIG: Record<
  FulfillmentDisplayStatus,
  { label: string; className: string }
> = {
  DRAFT: {
    label: "Draft",
    className: "bg-gray-100 text-gray-800 border-gray-400",
  },
  CONFIRMED: {
    label: "Confirmed",
    className: "bg-[var(--info-bg)] text-[var(--info)] border-blue-400",
  },
  PENDING: {
    label: "Pending",
    className: "bg-[var(--warning-bg)] text-[var(--warning)] border-yellow-500",
  },
  READY: {
    label: "Ready",
    className: "bg-muted text-primary border-purple-400",
  },
  SHIPPED: {
    label: "Shipped",
    className: "bg-indigo-100 text-indigo-900 border-indigo-400",
  },
  DELIVERED: {
    label: "Delivered",
    className: "bg-[var(--success-bg)] text-[var(--success)] border-green-400",
  },
  RETURNED: {
    label: "Returned",
    className: "bg-[var(--warning-bg)] text-[var(--warning)] border-orange-400",
  },
  RESTOCKED: {
    label: "Restocked",
    className: "bg-emerald-100 text-emerald-900 border-emerald-400",
  },
  RETURNED_TO_VENDOR: {
    label: "Returned to Supplier",
    className: "bg-amber-100 text-amber-900 border-amber-500",
  },
  CANCELLED: {
    label: "Cancelled",
    className: "bg-destructive/10 text-destructive border-red-400",
  },
};

export function OrderStatusBadge({ status, className }: OrderStatusBadgeProps) {
  const displayStatus =
    mapToFulfillmentDisplayStatus(status) ??
    mapToFulfillmentDisplayStatus(status === "PENDING" ? "READY_FOR_PACKING" : status);
  const config = (displayStatus && STATUS_CONFIG[displayStatus]) || {
    label: getFulfillmentDisplayLabel(status),
    className: "bg-gray-100 text-gray-800 border-gray-300",
  };

  return (
    <Badge className={cn(config.className, className)} variant="outline">
      {config.label}
    </Badge>
  );
}
