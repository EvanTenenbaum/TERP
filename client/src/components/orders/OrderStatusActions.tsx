/**
 * OrderStatusActions - ARCH-003 Order Status State Machine UI
 *
 * Shows valid next status transitions for an order based on
 * the state machine defined in server/services/orderStateMachine.ts
 */

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  ChevronDown,
  FileText,
  CheckCircle,
  Package,
  Truck,
  PackageCheck,
  RotateCcw,
  Warehouse,
  XCircle,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { FulfillmentStatus } from "./OrderStatusBadge";

/**
 * ARCH-003: Valid order status transitions
 * Must match server/services/orderStateMachine.ts
 */
const ORDER_STATUS_TRANSITIONS: Record<FulfillmentStatus, FulfillmentStatus[]> =
  {
    DRAFT: ["CONFIRMED", "PENDING", "CANCELLED"],
    CONFIRMED: ["PENDING", "PACKED", "SHIPPED", "CANCELLED"],
    PENDING: ["PACKED", "SHIPPED", "CANCELLED"],
    PACKED: ["SHIPPED", "PENDING", "CANCELLED"],
    SHIPPED: ["DELIVERED", "RETURNED"],
    DELIVERED: ["RETURNED"],
    RETURNED: ["RESTOCKED", "RETURNED_TO_VENDOR"],
    RESTOCKED: [], // Terminal state
    RETURNED_TO_VENDOR: [], // Terminal state
    CANCELLED: [], // Terminal state
  };

const STATUS_LABELS: Record<FulfillmentStatus, string> = {
  DRAFT: "Draft",
  CONFIRMED: "Confirmed",
  PENDING: "Pending",
  PACKED: "Packed",
  SHIPPED: "Shipped",
  DELIVERED: "Delivered",
  RETURNED: "Returned",
  RESTOCKED: "Restocked",
  RETURNED_TO_VENDOR: "Returned to Vendor",
  CANCELLED: "Cancelled",
};

const STATUS_ICONS: Record<FulfillmentStatus, React.ReactNode> = {
  DRAFT: <FileText className="h-4 w-4" />,
  CONFIRMED: <CheckCircle className="h-4 w-4" />,
  PENDING: <Package className="h-4 w-4" />,
  PACKED: <Package className="h-4 w-4" />,
  SHIPPED: <Truck className="h-4 w-4" />,
  DELIVERED: <PackageCheck className="h-4 w-4" />,
  RETURNED: <RotateCcw className="h-4 w-4" />,
  RESTOCKED: <Warehouse className="h-4 w-4" />,
  RETURNED_TO_VENDOR: <Truck className="h-4 w-4" />,
  CANCELLED: <XCircle className="h-4 w-4" />,
};

interface OrderStatusActionsProps {
  currentStatus: FulfillmentStatus;
  orderNumber: string;
  onStatusChange: (newStatus: FulfillmentStatus) => void;
  isUpdating?: boolean;
  disabled?: boolean;
  /** Custom handlers for specific transitions (e.g., ship modal, return modal) */
  customHandlers?: Partial<Record<FulfillmentStatus, () => void>>;
}

export function OrderStatusActions({
  currentStatus,
  orderNumber,
  onStatusChange,
  isUpdating = false,
  disabled = false,
  customHandlers = {},
}: OrderStatusActionsProps) {
  const [confirmStatus, setConfirmStatus] = useState<FulfillmentStatus | null>(
    null
  );

  const validNextStatuses = ORDER_STATUS_TRANSITIONS[currentStatus] || [];
  const isTerminal = validNextStatuses.length === 0;

  const handleStatusSelect = (status: FulfillmentStatus) => {
    // Check if there's a custom handler for this transition
    const customHandler = customHandlers[status];
    if (customHandler) {
      customHandler();
      return;
    }

    // Show confirmation for destructive or significant actions
    if (
      status === "CANCELLED" ||
      status === "DELIVERED" ||
      status === "RESTOCKED" ||
      status === "RETURNED_TO_VENDOR"
    ) {
      setConfirmStatus(status);
    } else {
      onStatusChange(status);
    }
  };

  const handleConfirm = () => {
    if (confirmStatus) {
      onStatusChange(confirmStatus);
      setConfirmStatus(null);
    }
  };

  const getConfirmationMessage = (status: FulfillmentStatus) => {
    switch (status) {
      case "CANCELLED":
        return {
          title: "Cancel this order?",
          description: (
            <>
              <p>
                You are about to cancel order <strong>{orderNumber}</strong>.
              </p>
              <p className="text-red-600 mt-2 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                This action cannot be undone. Any reserved inventory will be
                released.
              </p>
            </>
          ),
          buttonText: "Cancel Order",
          buttonClass: "bg-red-600 hover:bg-red-700",
        };
      case "DELIVERED":
        return {
          title: "Mark as delivered?",
          description: (
            <>
              <p>
                You are about to mark order <strong>{orderNumber}</strong> as
                delivered.
              </p>
              <p className="text-amber-600 mt-2 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                This confirms the customer has received the order.
              </p>
            </>
          ),
          buttonText: "Mark Delivered",
          buttonClass: "bg-green-600 hover:bg-green-700",
        };
      case "RESTOCKED":
        return {
          title: "Restock returned items?",
          description: (
            <>
              <p>
                You are about to restock items from order{" "}
                <strong>{orderNumber}</strong>.
              </p>
              <p className="text-blue-600 mt-2 flex items-center gap-2">
                <Warehouse className="h-4 w-4" />
                The returned items will be added back to inventory.
              </p>
            </>
          ),
          buttonText: "Restock Items",
          buttonClass: "bg-emerald-600 hover:bg-emerald-700",
        };
      case "RETURNED_TO_VENDOR":
        return {
          title: "Return to vendor?",
          description: (
            <>
              <p>
                You are about to mark items from order{" "}
                <strong>{orderNumber}</strong> as returned to vendor.
              </p>
              <p className="text-amber-600 mt-2 flex items-center gap-2">
                <Truck className="h-4 w-4" />
                This indicates the items have been sent back to the supplier.
              </p>
            </>
          ),
          buttonText: "Return to Vendor",
          buttonClass: "bg-amber-600 hover:bg-amber-700",
        };
      default:
        return {
          title: `Change status to ${STATUS_LABELS[status]}?`,
          description: `Are you sure you want to change the status of order ${orderNumber} to ${STATUS_LABELS[status]}?`,
          buttonText: `Change to ${STATUS_LABELS[status]}`,
          buttonClass: "",
        };
    }
  };

  if (isTerminal) {
    const terminalMessage =
      currentStatus === "CANCELLED"
        ? "Cancelled (No further actions)"
        : currentStatus === "RESTOCKED"
          ? "Restocked (Complete)"
          : currentStatus === "RETURNED_TO_VENDOR"
            ? "Returned to Vendor (Complete)"
            : `${STATUS_LABELS[currentStatus]} (Complete)`;

    return (
      <Badge variant="outline" className="text-xs text-muted-foreground">
        {terminalMessage}
      </Badge>
    );
  }

  const confirmMessage = confirmStatus
    ? getConfirmationMessage(confirmStatus)
    : null;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            disabled={disabled || isUpdating}
            className="gap-2"
          >
            Change Status
            <ChevronDown className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          {validNextStatuses.map((status, index) => {
            const isDestructive = status === "CANCELLED";
            const isPositive = status === "DELIVERED" || status === "CONFIRMED";

            // Add separator before CANCELLED if it's not the only option
            const showSeparator = isDestructive && index > 0;

            return (
              <React.Fragment key={status}>
                {showSeparator && <DropdownMenuSeparator />}
                <DropdownMenuItem
                  onClick={() => handleStatusSelect(status)}
                  className={cn(
                    "gap-2 cursor-pointer",
                    isDestructive && "text-red-600",
                    isPositive && "text-green-600"
                  )}
                >
                  {STATUS_ICONS[status]}
                  <span>{STATUS_LABELS[status]}</span>
                </DropdownMenuItem>
              </React.Fragment>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Confirmation Dialog */}
      <AlertDialog
        open={!!confirmStatus}
        onOpenChange={() => setConfirmStatus(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmMessage?.title}</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div>{confirmMessage?.description}</div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirm}
              className={cn(confirmMessage?.buttonClass)}
            >
              {confirmMessage?.buttonText}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

/**
 * Get human-readable description of valid transitions
 */
export function getValidTransitionsDescription(
  currentStatus: FulfillmentStatus
): string {
  const valid = ORDER_STATUS_TRANSITIONS[currentStatus];
  if (valid.length === 0) {
    return `${STATUS_LABELS[currentStatus]} is a terminal state - no further transitions allowed`;
  }
  return `From ${STATUS_LABELS[currentStatus]}, you can transition to: ${valid.map(s => STATUS_LABELS[s]).join(", ")}`;
}
