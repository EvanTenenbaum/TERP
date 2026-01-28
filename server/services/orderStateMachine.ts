/**
 * WSQA-003: Order State Machine
 * Defines valid order status transitions for the fulfillment workflow
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

/**
 * Valid status transitions map
 * Each key is a current status, value is array of valid next statuses
 *
 * ARCH-003: Updated to match actual business rules:
 * - PENDING -> SHIPPED allowed for flexibility (skip PACKED step)
 * - CONFIRMED -> SHIPPED allowed for direct shipping
 */
export const ORDER_STATUS_TRANSITIONS: Record<
  FulfillmentStatus,
  FulfillmentStatus[]
> = {
  DRAFT: ["CONFIRMED", "PENDING", "CANCELLED"],
  CONFIRMED: ["PENDING", "PACKED", "SHIPPED", "CANCELLED"], // Can skip to PACKED or SHIPPED
  PENDING: ["PACKED", "SHIPPED", "CANCELLED"], // Can skip PACKED step
  PACKED: ["SHIPPED", "CANCELLED"], // Can go back to PENDING if unpacked
  SHIPPED: ["DELIVERED", "RETURNED"],
  DELIVERED: ["RETURNED"],
  RETURNED: ["RESTOCKED", "RETURNED_TO_VENDOR"],
  RESTOCKED: [], // Terminal state
  RETURNED_TO_VENDOR: [], // Terminal state
  CANCELLED: [], // Terminal state
};

/**
 * Check if a status transition is valid
 */
export function canTransition(from: string, to: string): boolean {
  const validNext = ORDER_STATUS_TRANSITIONS[from as FulfillmentStatus];
  if (!validNext) return false;
  return validNext.includes(to as FulfillmentStatus);
}

/**
 * Get a descriptive error message for an invalid transition.
 *
 * @param currentStatus - Current order status
 * @param newStatus - Desired new status
 * @param orderId - Order ID for error messages
 * @returns A descriptive error message string or null if the transition is valid.
 */
export function getTransitionError(
  currentStatus: string | null,
  newStatus: string,
  orderId?: number
): string | null {
  const from = currentStatus || "PENDING";

  if (!canTransition(from, newStatus)) {
    const validNext = getNextStatuses(from);
    const validOptions =
      validNext.length > 0 ? validNext.join(", ") : "none (terminal state)";
    const orderRef = orderId ? ` for order #${orderId}` : "";

    return (
      `Invalid status transition${orderRef}: ${from} → ${newStatus}. ` +
      `Valid transitions from ${from}: ${validOptions}`
    );
  }

  return null; // Return null if the transition is valid
}

/**
 * ARCH-003: Validate and enforce status transition
 * Throws descriptive error if transition is invalid
 *
 * @param currentStatus - Current order status
 * @param newStatus - Desired new status
 * @param orderId - Order ID for error messages
 * @throws Error if transition is invalid
 */
export function validateTransition(
  currentStatus: string | null,
  newStatus: string,
  orderId?: number
): void {
  const errorMessage = getTransitionError(currentStatus, newStatus, orderId);
  if (errorMessage) {
    throw new Error(errorMessage);
  }
}

/**
 * Get valid next statuses from current status
 */
export function getNextStatuses(current: string): FulfillmentStatus[] {
  return ORDER_STATUS_TRANSITIONS[current as FulfillmentStatus] ?? [];
}

/**
 * Check if a status is a terminal state (no further transitions allowed)
 */
export function isTerminalStatus(status: string): boolean {
  const next = ORDER_STATUS_TRANSITIONS[status as FulfillmentStatus];
  return next !== undefined && next.length === 0;
}

/**
 * Human-readable status labels
 */
export const STATUS_LABELS: Record<FulfillmentStatus, string> = {
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

/**
 * Status colors for UI display
 */
export const STATUS_COLORS: Record<FulfillmentStatus, string> = {
  DRAFT: "bg-gray-100 text-gray-800",
  CONFIRMED: "bg-blue-100 text-blue-800",
  PENDING: "bg-yellow-100 text-yellow-800",
  PACKED: "bg-purple-100 text-purple-800",
  SHIPPED: "bg-indigo-100 text-indigo-800",
  DELIVERED: "bg-green-100 text-green-800",
  RETURNED: "bg-orange-100 text-orange-800",
  RESTOCKED: "bg-emerald-100 text-emerald-800",
  RETURNED_TO_VENDOR: "bg-amber-100 text-amber-800",
  CANCELLED: "bg-red-100 text-red-800",
};
