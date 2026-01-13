/**
 * Delivery Schedule Widget Component
 * Sprint 4 Track D: MEET-034 - Expected Delivery Date Tracking
 *
 * Displays upcoming and overdue deliveries
 */

import React, { useState } from "react";
import { trpc } from "@/lib/trpc";
import {
  Truck,
  AlertTriangle,
  Clock,
  CheckCircle,
  Package,
  RefreshCw,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import {
  format,
  isPast,
  isToday,
  isTomorrow,
  differenceInDays,
} from "date-fns";

type DeliveryStatus =
  | "pending"
  | "confirmed"
  | "in_transit"
  | "delivered"
  | "delayed"
  | "cancelled";

const statusConfig: Record<
  DeliveryStatus,
  {
    label: string;
    color: string;
    icon: React.ComponentType<{ className?: string }>;
  }
> = {
  pending: {
    label: "Pending",
    color: "bg-gray-100 text-gray-800",
    icon: Clock,
  },
  confirmed: {
    label: "Confirmed",
    color: "bg-blue-100 text-blue-800",
    icon: CheckCircle,
  },
  in_transit: {
    label: "In Transit",
    color: "bg-yellow-100 text-yellow-800",
    icon: Truck,
  },
  delivered: {
    label: "Delivered",
    color: "bg-green-100 text-green-800",
    icon: Package,
  },
  delayed: {
    label: "Delayed",
    color: "bg-red-100 text-red-800",
    icon: AlertTriangle,
  },
  cancelled: {
    label: "Cancelled",
    color: "bg-gray-100 text-gray-500",
    icon: Clock,
  },
};

interface DeliveryScheduleWidgetProps {
  compact?: boolean;
}

export function DeliveryScheduleWidget({
  compact = false,
}: DeliveryScheduleWidgetProps) {
  const [expanded, setExpanded] = useState(!compact);
  const [activeTab, setActiveTab] = useState<"upcoming" | "overdue">(
    "upcoming"
  );

  const utils = trpc.useUtils();

  // Get upcoming deliveries for next 7 days
  const today = format(new Date(), "yyyy-MM-dd");
  const nextWeek = format(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    "yyyy-MM-dd"
  );

  const { data: upcoming = [], isLoading: loadingUpcoming } =
    trpc.scheduling.listDeliverySchedules.useQuery({
      startDate: today,
      endDate: nextWeek,
    });

  const { data: overdue = [], isLoading: loadingOverdue } =
    trpc.scheduling.getOverdueDeliveries.useQuery();

  const updateStatus = trpc.scheduling.updateDeliveryStatus.useMutation({
    onSuccess: () => {
      utils.scheduling.listDeliverySchedules.invalidate();
      utils.scheduling.getOverdueDeliveries.invalidate();
    },
  });

  const handleMarkDelivered = (id: number) => {
    updateStatus.mutate({
      id,
      status: "delivered",
      actualDate: format(new Date(), "yyyy-MM-dd"),
    });
  };

  const handleMarkInTransit = (id: number) => {
    updateStatus.mutate({ id, status: "in_transit" });
  };

  const isLoading = loadingUpcoming || loadingOverdue;

  // Filter out delivered/cancelled from upcoming
  const activeUpcoming = upcoming.filter(
    d => !["delivered", "cancelled"].includes(d.status)
  );

  return (
    <div className="bg-white rounded-lg border shadow-sm">
      {/* Header */}
      <div
        className={`flex items-center justify-between p-4 border-b ${
          compact ? "cursor-pointer hover:bg-gray-50" : ""
        }`}
        onClick={compact ? () => setExpanded(!expanded) : undefined}
      >
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <Truck className="h-5 w-5 text-blue-600" />
          Deliveries
          {overdue.length > 0 && (
            <span className="bg-red-100 text-red-800 text-xs font-medium px-2 py-0.5 rounded-full flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              {overdue.length} overdue
            </span>
          )}
        </h3>
        <div className="flex items-center gap-2">
          <button
            onClick={e => {
              e.stopPropagation();
              utils.scheduling.listDeliverySchedules.invalidate();
              utils.scheduling.getOverdueDeliveries.invalidate();
            }}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            title="Refresh"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          {compact &&
            (expanded ? (
              <ChevronUp className="h-4 w-4 text-gray-400" />
            ) : (
              <ChevronDown className="h-4 w-4 text-gray-400" />
            ))}
        </div>
      </div>

      {/* Content */}
      {expanded && (
        <>
          {/* Tabs */}
          <div className="flex border-b">
            <button
              onClick={() => setActiveTab("upcoming")}
              className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === "upcoming"
                  ? "text-blue-600 border-b-2 border-blue-600"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Upcoming ({activeUpcoming.length})
            </button>
            <button
              onClick={() => setActiveTab("overdue")}
              className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === "overdue"
                  ? "text-red-600 border-b-2 border-red-600"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Overdue ({overdue.length})
            </button>
          </div>

          {/* Delivery List */}
          <div className="max-h-96 overflow-y-auto">
            {isLoading ? (
              <div className="p-4 space-y-3">
                {[1, 2, 3].map(i => (
                  <div
                    key={i}
                    className="h-16 bg-gray-200 rounded animate-pulse"
                  />
                ))}
              </div>
            ) : activeTab === "upcoming" ? (
              activeUpcoming.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <Truck className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No upcoming deliveries</p>
                </div>
              ) : (
                <div className="divide-y">
                  {activeUpcoming.map(delivery => (
                    <DeliveryItem
                      key={delivery.id}
                      delivery={delivery}
                      onMarkDelivered={handleMarkDelivered}
                      onMarkInTransit={handleMarkInTransit}
                    />
                  ))}
                </div>
              )
            ) : overdue.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <CheckCircle className="h-12 w-12 mx-auto mb-3 text-green-500 opacity-50" />
                <p>No overdue deliveries</p>
              </div>
            ) : (
              <div className="divide-y">
                {overdue.map(delivery => (
                  <DeliveryItem
                    key={delivery.id}
                    delivery={delivery}
                    onMarkDelivered={handleMarkDelivered}
                    onMarkInTransit={handleMarkInTransit}
                    isOverdue
                  />
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

interface DeliveryItemProps {
  delivery: {
    id: number;
    referenceType: string;
    referenceId: number;
    expectedDate: Date;
    confirmedDate: Date | null;
    expectedTimeStart: string | null;
    expectedTimeEnd: string | null;
    carrier: string | null;
    trackingNumber: string | null;
    deliveryAddress: string | null;
    status: string;
  };
  onMarkDelivered: (id: number) => void;
  onMarkInTransit: (id: number) => void;
  isOverdue?: boolean;
}

function DeliveryItem({
  delivery,
  onMarkDelivered,
  onMarkInTransit,
  isOverdue,
}: DeliveryItemProps) {
  const config =
    statusConfig[delivery.status as DeliveryStatus] || statusConfig.pending;
  const StatusIcon = config.icon;
  const expectedDate = new Date(delivery.expectedDate);
  const daysOverdue = isOverdue
    ? differenceInDays(new Date(), expectedDate)
    : 0;

  const getDateLabel = () => {
    if (isToday(expectedDate)) return "Today";
    if (isTomorrow(expectedDate)) return "Tomorrow";
    if (isPast(expectedDate))
      return `${daysOverdue} day${daysOverdue === 1 ? "" : "s"} overdue`;
    return format(expectedDate, "EEE, MMM d");
  };

  const referenceLabel =
    {
      order: "Order",
      purchase_order: "PO",
      sample: "Sample",
    }[delivery.referenceType] || delivery.referenceType;

  return (
    <div
      className={`p-3 hover:bg-gray-50 transition-colors ${
        isOverdue ? "bg-red-50" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          {/* Reference & Date */}
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-gray-900">
              {referenceLabel} #{delivery.referenceId}
            </span>
            <span
              className={`text-sm ${
                isOverdue ? "text-red-600 font-medium" : "text-gray-500"
              }`}
            >
              {getDateLabel()}
            </span>
          </div>

          {/* Details */}
          <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
            {(delivery.expectedTimeStart || delivery.expectedTimeEnd) && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {delivery.expectedTimeStart?.substring(0, 5)}
                {delivery.expectedTimeEnd &&
                  ` - ${delivery.expectedTimeEnd.substring(0, 5)}`}
              </span>
            )}
            {delivery.carrier && (
              <span className="flex items-center gap-1">
                <Truck className="h-3 w-3" />
                {delivery.carrier}
              </span>
            )}
            {delivery.trackingNumber && (
              <span className="text-blue-600">{delivery.trackingNumber}</span>
            )}
          </div>

          {/* Status Badge */}
          <div className="mt-2">
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${config.color}`}
            >
              <StatusIcon className="h-3 w-3" />
              {config.label}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-1">
          {delivery.status === "pending" && (
            <button
              onClick={() => onMarkInTransit(delivery.id)}
              className="px-3 py-1.5 text-xs font-medium text-yellow-700 bg-yellow-100 hover:bg-yellow-200 rounded-lg transition-colors"
            >
              In Transit
            </button>
          )}
          {["pending", "confirmed", "in_transit", "delayed"].includes(
            delivery.status
          ) && (
            <button
              onClick={() => onMarkDelivered(delivery.id)}
              className="px-3 py-1.5 text-xs font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
            >
              Delivered
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default DeliveryScheduleWidget;
