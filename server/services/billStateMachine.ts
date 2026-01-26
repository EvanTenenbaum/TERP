/**
 * ARCH-004: Bill Status State Machine
 * Defines valid bill status transitions for accounts payable workflow
 */

export type BillStatus =
  | "DRAFT"
  | "PENDING"
  | "PARTIAL"
  | "PAID"
  | "OVERDUE"
  | "VOID";

/**
 * Valid bill status transitions
 *
 * Workflow:
 * - DRAFT: Initial state, can be submitted for approval
 * - PENDING: Awaiting payment
 * - PARTIAL: Partially paid
 * - PAID: Fully paid (terminal for payment)
 * - OVERDUE: Past due date (can still be paid)
 * - VOID: Cancelled/voided (terminal)
 */
export const BILL_STATUS_TRANSITIONS: Record<BillStatus, BillStatus[]> = {
  DRAFT: ["PENDING", "VOID"], // Submit for payment or cancel
  PENDING: ["PARTIAL", "PAID", "OVERDUE", "VOID"], // Make payment or mark overdue
  PARTIAL: ["PAID", "OVERDUE", "VOID"], // Complete payment or mark overdue
  OVERDUE: ["PARTIAL", "PAID", "VOID"], // Can still receive payments
  PAID: [], // Terminal state (can't unpay)
  VOID: [], // Terminal state (can't unvoid)
};

/**
 * Check if a bill status transition is valid
 */
export function canTransition(from: string, to: string): boolean {
  const validNext = BILL_STATUS_TRANSITIONS[from as BillStatus];
  if (!validNext) return false;
  return validNext.includes(to as BillStatus);
}

/**
 * Get valid next statuses from current status
 */
export function getNextStatuses(current: string): BillStatus[] {
  return BILL_STATUS_TRANSITIONS[current as BillStatus] ?? [];
}

/**
 * Check if a status is a terminal state
 */
export function isTerminalStatus(status: string): boolean {
  const next = BILL_STATUS_TRANSITIONS[status as BillStatus];
  return next !== undefined && next.length === 0;
}

/**
 * ARCH-004: Validate and enforce status transition
 * Throws descriptive error if transition is invalid
 *
 * @param currentStatus - Current bill status
 * @param newStatus - Desired new status
 * @param billId - Bill ID for error messages
 * @throws Error if transition is invalid
 */
export function validateTransition(
  currentStatus: string | null,
  newStatus: string,
  billId?: number
): void {
  const from = currentStatus || "DRAFT";

  if (!canTransition(from, newStatus)) {
    const validNext = getNextStatuses(from);
    const validOptions =
      validNext.length > 0 ? validNext.join(", ") : "none (terminal state)";
    const billRef = billId ? ` for bill #${billId}` : "";

    throw new Error(
      `Invalid bill status transition${billRef}: ${from} → ${newStatus}. ` +
        `Valid transitions from ${from}: ${validOptions}`
    );
  }
}

/**
 * Human-readable bill status labels
 */
export const STATUS_LABELS: Record<BillStatus, string> = {
  DRAFT: "Draft",
  PENDING: "Pending",
  PARTIAL: "Partial Payment",
  PAID: "Paid",
  OVERDUE: "Overdue",
  VOID: "Void",
};
