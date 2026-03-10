import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// Invoice status types
export type InvoiceStatus =
  | "DRAFT"
  | "SENT"
  | "VIEWED"
  | "PARTIAL"
  | "PAID"
  | "OVERDUE"
  | "VOID";

// Bill status types
export type BillStatus =
  | "DRAFT"
  | "PENDING"
  | "APPROVED"
  | "PARTIAL"
  | "PAID"
  | "OVERDUE"
  | "VOID";

// Payment type
export type PaymentType = "RECEIVED" | "SENT";

// Payment method
export type PaymentMethod =
  | "CASH"
  | "CHECK"
  | "WIRE"
  | "ACH"
  | "CREDIT_CARD"
  | "DEBIT_CARD"
  | "OTHER";

interface StatusBadgeProps {
  status: InvoiceStatus | BillStatus | PaymentType | PaymentMethod | string;
  type?: "invoice" | "bill" | "payment" | "paymentMethod";
  className?: string;
}

/**
 * StatusBadge - Colored badge for displaying status indicators
 *
 * Features:
 * - Color-coded based on status type
 * - Supports invoice, bill, payment, and payment method statuses
 * - Consistent with TERP design system
 *
 * TER-670: All color combinations updated to meet WCAG 2.2 AA contrast (≥4.5:1).
 * Changed -700 text to -900 and -200 borders to -400 on -100 backgrounds.
 * "VOID" previously used text-gray-500 (fails 4.5:1); now uses text-gray-700
 * with line-through which is clearly distinguishable from active states.
 */
export function StatusBadge({
  status,
  type = "invoice",
  className,
}: StatusBadgeProps) {
  const getStatusConfig = () => {
    const upperStatus = status.toUpperCase();

    // Invoice statuses
    if (type === "invoice") {
      switch (upperStatus as InvoiceStatus) {
        case "DRAFT":
          return {
            label: "Draft",
            className: "bg-gray-100 text-gray-800 border-gray-400",
          };
        case "SENT":
          return {
            label: "Sent",
            className: "bg-blue-100 text-blue-900 border-blue-400",
          };
        case "VIEWED":
          return {
            label: "Viewed",
            className: "bg-cyan-100 text-cyan-900 border-cyan-400",
          };
        case "PARTIAL":
          return {
            label: "Partial",
            className: "bg-yellow-100 text-yellow-900 border-yellow-500",
          };
        case "PAID":
          return {
            label: "Paid",
            className: "bg-green-100 text-green-900 border-green-400",
          };
        case "OVERDUE":
          return {
            label: "Overdue",
            className: "bg-red-100 text-red-900 border-red-400",
          };
        case "VOID":
          return {
            label: "Void",
            className: "bg-gray-100 text-gray-700 border-gray-400 line-through",
          };
        default:
          return {
            label: status,
            className: "bg-gray-100 text-gray-800 border-gray-400",
          };
      }
    }

    // Bill statuses
    if (type === "bill") {
      switch (upperStatus as BillStatus) {
        case "DRAFT":
          return {
            label: "Draft",
            className: "bg-gray-100 text-gray-800 border-gray-400",
          };
        case "PENDING":
          return {
            label: "Pending",
            className: "bg-blue-100 text-blue-900 border-blue-400",
          };
        case "APPROVED":
          return {
            label: "Approved",
            className: "bg-emerald-100 text-emerald-900 border-emerald-400",
          };
        case "PARTIAL":
          return {
            label: "Partial",
            className: "bg-yellow-100 text-yellow-900 border-yellow-500",
          };
        case "PAID":
          return {
            label: "Paid",
            className: "bg-green-100 text-green-900 border-green-400",
          };
        case "OVERDUE":
          return {
            label: "Overdue",
            className: "bg-red-100 text-red-900 border-red-400",
          };
        case "VOID":
          return {
            label: "Void",
            className: "bg-gray-100 text-gray-700 border-gray-400 line-through",
          };
        default:
          return {
            label: status,
            className: "bg-gray-100 text-gray-800 border-gray-400",
          };
      }
    }

    // Payment type
    if (type === "payment") {
      switch (upperStatus as PaymentType) {
        case "RECEIVED":
          return {
            label: "Received",
            className: "bg-green-100 text-green-900 border-green-400",
          };
        case "SENT":
          return {
            label: "Sent",
            className: "bg-blue-100 text-blue-900 border-blue-400",
          };
        default:
          return {
            label: status,
            className: "bg-gray-100 text-gray-800 border-gray-400",
          };
      }
    }

    // Payment method
    if (type === "paymentMethod") {
      switch (upperStatus as PaymentMethod) {
        case "CASH":
          return {
            label: "Cash",
            className: "bg-green-100 text-green-900 border-green-400",
          };
        case "CHECK":
          return {
            label: "Check",
            className: "bg-blue-100 text-blue-900 border-blue-400",
          };
        case "WIRE":
          return {
            label: "Wire",
            className: "bg-purple-100 text-purple-900 border-purple-400",
          };
        case "ACH":
          return {
            label: "ACH",
            className: "bg-indigo-100 text-indigo-900 border-indigo-400",
          };
        case "CREDIT_CARD":
          return {
            label: "Credit Card",
            className: "bg-orange-100 text-orange-900 border-orange-400",
          };
        case "DEBIT_CARD":
          return {
            label: "Debit Card",
            className: "bg-pink-100 text-pink-900 border-pink-400",
          };
        case "OTHER":
          return {
            label: "Other",
            className: "bg-gray-100 text-gray-800 border-gray-400",
          };
        default:
          return {
            label: status,
            className: "bg-gray-100 text-gray-800 border-gray-400",
          };
      }
    }

    return {
      label: status,
      className: "bg-gray-100 text-gray-800 border-gray-400",
    };
  };

  const config = getStatusConfig();

  return (
    <Badge variant="outline" className={cn(config.className, className)}>
      {config.label}
    </Badge>
  );
}
