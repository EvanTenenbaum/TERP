import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/**
 * ARCH-003: All fulfillment statuses from the order state machine
 */
export type FulfillmentStatus =
  | "DRAFT"
  | "CONFIRMED"
  | "PENDING"
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

const STATUS_CONFIG: Record<
  FulfillmentStatus,
  { label: string; className: string }
> = {
  DRAFT: {
    label: "Draft",
    className: "bg-gray-100 text-gray-800 border-gray-300",
  },
  CONFIRMED: {
    label: "Confirmed",
    className: "bg-blue-100 text-blue-800 border-blue-300",
  },
  PENDING: {
    label: "Pending",
    className: "bg-yellow-100 text-yellow-800 border-yellow-300",
  },
  PACKED: {
    label: "Packed",
    className: "bg-purple-100 text-purple-800 border-purple-300",
  },
  SHIPPED: {
    label: "Shipped",
    className: "bg-indigo-100 text-indigo-800 border-indigo-300",
  },
  DELIVERED: {
    label: "Delivered",
    className: "bg-green-100 text-green-800 border-green-300",
  },
  RETURNED: {
    label: "Returned",
    className: "bg-orange-100 text-orange-800 border-orange-300",
  },
  RESTOCKED: {
    label: "Restocked",
    className: "bg-emerald-100 text-emerald-800 border-emerald-300",
  },
  RETURNED_TO_VENDOR: {
    label: "Returned to Vendor",
    className: "bg-amber-100 text-amber-800 border-amber-300",
  },
  CANCELLED: {
    label: "Cancelled",
    className: "bg-red-100 text-red-800 border-red-300",
  },
};

export function OrderStatusBadge({ status, className }: OrderStatusBadgeProps) {
  const config = STATUS_CONFIG[status as FulfillmentStatus] || {
    label: status,
    className: "bg-gray-100 text-gray-800 border-gray-300",
  };

  return (
    <Badge className={cn(config.className, className)} variant="outline">
      {config.label}
    </Badge>
  );
}
